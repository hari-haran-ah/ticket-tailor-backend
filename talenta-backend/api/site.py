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

async def get_current_client(request: Request, db: Session = Depends(get_db)) -> Client:
    """Identify the client based on proxy headers, origin, or host."""
    # 1. Prioritize X-Forwarded-Host (Production/Proxy)
    host = request.headers.get("x-forwarded-host")
    
    # 2. Fallback to Origin/Referer (Frontend SPAs)
    if not host:
        origin = request.headers.get("origin") or request.headers.get("referer", "")
        if origin:
            host = origin.replace("https://", "").replace("http://", "").split("/")[0].strip()
            
    # 3. Final Fallback to standard Host header
    if not host:
        host = request.headers.get("host", "").strip()

    # Clean the host (strip port for the clean_host version)
    clean_host = host.split(":")[0].strip()

    # 1. Try matching the FULL HOST (including port) first
    # This is crucial for local development differentiating between :5174, :5175, etc.
    client = db.query(Client).filter(
        Client.domain_name.ilike(f"%{host}%"),
        Client.is_active == True
    ).first()

    # 2. Try matching the CLEAN HOST (without port) if full match fails
    if not client:
        client = db.query(Client).filter(
            Client.domain_name.ilike(f"%{clean_host}%"),
            Client.is_active == True
        ).first()

    # 3. Development shortcuts for localhost
    if not client and "localhost" in clean_host:
        # If hitting backend port directly (:8000), or if no specific port match found
        client = db.query(Client).filter(Client.is_active == True).first()
        
    if not client:
        raise HTTPException(
            status_code=404, 
            detail=f"No active client found for host: {host}"
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
