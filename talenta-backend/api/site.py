from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Any
import httpx
import base64

from db.session import get_db
from models.client import Client
from models.payment import Payment
from sqlalchemy import func
from core.config import settings

router = APIRouter(prefix="/api/site", tags=["Site"])


# ─── Dependencies ─────────────────────────────────────────────────────────────

def clean_domain(url: str) -> str:
    """Standardizes a domain by removing protocols, port numbers, and trailing slashes."""
    if not url:
        return ""
    # Remove protocol
    url = url.replace("https://", "").replace("http://", "")
    # Remove port number if present (e.g., localhost:3000 -> localhost)
    url = url.split(":")[0]
    # Remove trailing slash
    url = url.rstrip("/")
    # Remove path from referers (e.g., site.com/path -> site.com)
    url = url.split("/")[0]
    return url.lower().strip()

async def get_current_client(request: Request, db: Session = Depends(get_db)) -> Client:
    """Robustly identify the client based on explicit ID, Origin, or Host headers."""
    
    # 1. Check for explicit Client ID header (highest priority)
    client_id_header = request.headers.get("x-client-id")
    if client_id_header and client_id_header.isdigit():
        client = db.query(Client).filter(Client.id == int(client_id_header), Client.is_active == True).first()
        if client:
            print(f"DEBUG [IDENTIFY]: Matched client by X-Client-ID header: {client.name} (ID: {client.id})")
            return client

    # 2. Extract potential host candidates from headers in order of priority
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    forwarded_host = request.headers.get("x-forwarded-host")
    standard_host = request.headers.get("host")

    # Log incoming headers for easier Vercel debugging
    print(f"DEBUG [HEADERS]: Origin='{origin}', Referer='{referer}', X-Fwd-Host='{forwarded_host}', Host='{standard_host}'")

    # Clean the candidates
    cleaned_origin = clean_domain(origin)
    cleaned_referer = clean_domain(referer)
    cleaned_fwd_host = clean_domain(forwarded_host)
    cleaned_std_host = clean_domain(standard_host)

    # 3. Create a prioritized list of host candidates to check against DB
    # We prefer Origin/Referer (frontend) over Forwarded-Host (which might be the backend domain)
    candidates = [c for c in [cleaned_origin, cleaned_referer, cleaned_fwd_host, cleaned_std_host] if c]
    print(f"DEBUG [CANDIDATES]: Ordered candidates to check: {candidates}")

    client = None
    tested_matches = []

    # 4. Strict DB Lookup Logic
    # We fetch ALL active clients and do a strict normalized comparison to avoid 'ilike %host%' collisions
    all_active_clients = db.query(Client).filter(Client.is_active == True).all()
    
    for candidate in candidates:
        for c in all_active_clients:
            db_domain = clean_domain(c.domain_name)
            if db_domain == candidate:
                client = c
                break
        if client:
            print(f"DEBUG [MATCH]: Found exact match for candidate '{candidate}' -> Client: {client.name}")
            break

    # 5. NO FALLBACK (Strict matching only)
    if not client:
        print(f"ERROR [IDENTIFY]: No client found matching candidates: {candidates}")
        raise HTTPException(
            status_code=404, 
            detail=f"This domain ({candidates[0] if candidates else 'unknown'}) is not registered with our platform. Please contact support or add it in the Admin Panel."
        )
    return client



# ─── Helpers (Mirrored from tickettailor.py for isolation) ───────────────────

def _tt_headers(api_key: str) -> dict:
    encoded = base64.b64encode(f"{api_key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Accept": "application/json"}

async def _tt_get(api_key: str, path: str, params: dict = None) -> Any:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{settings.TT_BASE_URL}{path}",
            headers=_tt_headers(api_key),
            params=params or {},
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"TicketTailor API error: {response.text}",
        )
    return response.json()

async def _tt_post(api_key: str, path: str, payload: dict, use_json: bool = False) -> Any:
    """Make authenticated POST request to TicketTailor API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        # TicketTailor v1 often requires form-encoded data for POST/PUT instead of JSON
        # But for complex nested data like /orders, JSON is better
        if use_json:
            response = await client.post(
                f"{settings.TT_BASE_URL}{path}",
                headers=_tt_headers(api_key),
                json=payload,
            )
        else:
            response = await client.post(
                f"{settings.TT_BASE_URL}{path}",
                headers=_tt_headers(api_key),
                data=payload,
            )
    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=response.status_code,
            detail=f"TicketTailor API error: {response.text}",
        )
    return response.json()

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/events")
async def list_site_events(
    limit: int = Query(50, le=100),
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Publicly list all events for the current domain, with accurate sold/capacity counts."""
    params = {"limit": limit}
    resp = await _tt_get(client.tt_api_key, "/events", params)
    data = resp.get("data", [])

    # Sort by start date (newest first)
    data.sort(key=lambda x: x.get("start", {}).get("iso", ""), reverse=True)

    # Pre-fetch all payment counts in one DB query for efficiency
    event_ids = [ev["id"] for ev in data]
    
    # CRITICAL Deduplication: We only count "manual" sales here (where tt_ticket_id is NULL).
    # Those with a tt_ticket_id are already included in Ticket Tailor's 'quantity_issued'.
    all_ev_payments = db.query(
        Payment.event_id,
        Payment.ticket_type_id,
        func.sum(Payment.quantity).label("total_sold")
    ).filter(
        Payment.event_id.in_(event_ids),
        Payment.status == "complete",
        Payment.tt_ticket_id == None
    ).group_by(Payment.event_id, Payment.ticket_type_id).all()

    # Build nested map: {event_id: {ticket_type_id: sold_count}}
    sold_map: dict = {}
    for p in all_ev_payments:
        sold_map.setdefault(p.event_id, {})[p.ticket_type_id] = int(p.total_sold)

    for ev in data:
        ev_id = ev["id"]
        tts = ev.get("ticket_types", [])
        total_sold_for_ev = 0

        for tt in tts:
            local_sold = sold_map.get(ev_id, {}).get(tt["id"], 0)
            
            # TT's quantity_issued = Dashboard sales + our API sales
            tt_quantity_issued = tt.get("quantity_issued", 0) or 0
            
            # Total sold = TT sales (dashboard/api) + Manual local sales (failed API)
            total_sold = local_sold + tt_quantity_issued

            # tt_remaining = tickets currently for sale in TT
            tt_remaining = tt.get("quantity")

            if tt_remaining is not None:
                # Capacity = remaining + TT_issued + Manual_local
                original_capacity = tt_remaining + tt_quantity_issued + local_sold
                tt["quantity"] = original_capacity       # total seats for display
                tt["quantity_available"] = tt_remaining  # seats still for sale
            else:
                tt["quantity_available"] = None  # unlimited

            tt["quantity_sold"] = total_sold
            total_sold_for_ev += total_sold

        ev["total_issued_tickets"] = total_sold_for_ev

    return {
        "client_name": client.name,
        "data": data
    }

@router.get("/events/{event_id}")
async def get_site_event(
    event_id: str,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    """Publicly get single event details with accurate sold/capacity counts."""
    data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    
    # Fetch manual sold counts (where TT ticket issuance failed)
    # Tickets with tt_ticket_id are already in TT's quantity_issued.
    payments = db.query(
        Payment.ticket_type_id, 
        func.sum(Payment.quantity).label("total_sold")
    ).filter(
        Payment.event_id == event_id,
        Payment.status == "complete",
        Payment.tt_ticket_id == None
    ).group_by(Payment.ticket_type_id).all()
    
    sold_map = {p.ticket_type_id: int(p.total_sold) for p in payments}
    
    ticket_types = data.get("ticket_types", [])
    total_sold_event = 0
    for tt in ticket_types:
        # Tickets sold via our Stripe platform (tracked locally, inventory reduced manually in TT)
        local_sold = sold_map.get(tt["id"], 0)

        # Tickets sold via Ticket Tailor's own system (dashboard, their checkout)
        tt_quantity_issued = tt.get("quantity_issued", 0) or 0

        # TT's quantity = REMAINING available pool (reduced by both TT-internal AND our manual calls)
        # So: original_capacity = remaining + TT_issued + our_local
        tt_remaining = tt.get("quantity")

        total_sold = tt_quantity_issued + local_sold

        print(f"DEBUG TICKET: id={tt['id']} remaining={tt_remaining} tt_issued={tt_quantity_issued} local_sold={local_sold} total_sold={total_sold}")

        if tt_remaining is not None:
            original_capacity = tt_remaining + tt_quantity_issued + local_sold
            tt["quantity"] = original_capacity        # total seats (for display)
            tt["quantity_available"] = tt_remaining   # seats still for sale
        else:
            tt["quantity_available"] = None   # unlimited

        tt["quantity_sold"] = total_sold
        total_sold_event += total_sold
        
    data["total_issued_tickets"] = total_sold_event
    
    return data
