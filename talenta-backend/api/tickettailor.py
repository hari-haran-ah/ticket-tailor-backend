from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Any, Optional, List
import httpx
import base64

from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from models.client import Client
from pydantic import BaseModel
from core.config import settings

router = APIRouter(prefix="/api/tt", tags=["TicketTailor"])


def _get_client_or_404(client_id: int, db: Session) -> Client:
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or inactive")
    return client


def _tt_headers(api_key: str) -> dict:
    encoded = base64.b64encode(f"{api_key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Accept": "application/json"}


async def _tt_get(api_key: str, path: str, params: dict = None) -> Any:
    """Make authenticated GET request to TicketTailor API."""
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


def _get_series_id(event_data: dict) -> Optional[str]:
    """Extract series ID from event data robustly."""
    series_obj = event_data.get("event_series")
    if isinstance(series_obj, dict):
        return series_obj.get("id")
    if isinstance(series_obj, str):
        return series_obj
    return event_data.get("event_series_id")


async def _tt_post(api_key: str, path: str, payload: dict) -> Any:
    """Make authenticated POST request to TicketTailor API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        # TicketTailor v1 often requires form-encoded data for POST/PUT instead of JSON
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


async def _tt_put(api_key: str, path: str, payload: dict) -> Any:
    """Make authenticated PUT request to TicketTailor API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.put(
            f"{settings.TT_BASE_URL}{path}",
            headers=_tt_headers(api_key),
            json=payload,
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"TicketTailor API error: {response.text}",
        )
    return response.json()


async def _tt_delete(api_key: str, path: str) -> bool:
    """Make authenticated DELETE request to TicketTailor API."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(
            f"{settings.TT_BASE_URL}{path}",
            headers=_tt_headers(api_key),
        )
    if response.status_code not in (200, 204):
        raise HTTPException(
            status_code=response.status_code,
            detail=f"TicketTailor API error: {response.text}",
        )
    return True


# ─── Schemas ──────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    start_date: str  # YYYY-MM-DD
    start_time: str  # HH:MM:SS
    end_date: str
    end_time: str
    venue_name: Optional[str] = ""
    postal_code: Optional[str] = ""
    country: Optional[str] = "US"
    online_event: bool = False
    private_event: bool = False
    groups: Optional[List['TicketGroupInCreate']] = []
    tickets: Optional[List['TicketTypeInCreate']] = []

class TicketTypeInCreate(BaseModel):
    name: str
    price: float
    quantity: int
    group_index: Optional[int] = None # Index in the groups list

class TicketGroupInCreate(BaseModel):
    name: str

# Re-update EventCreate to use the now-defined classes
EventCreate.update_forward_refs()

class TicketTypeCreate(BaseModel):
    name: str
    price: float
    quantity: int
    max_per_order: int = 10
    group_id: Optional[str] = None

class TicketGroupCreate(BaseModel):
    name: str

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None # published, draft, closed
    venue_name: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    online_event: Optional[bool] = None
    private_event: Optional[bool] = None


# ─── Events ──────────────────────────────────────────────────────────────────

@router.get("/{client_id}/events")
async def list_events(
    client_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """List all events for a client from TicketTailor."""
    client = _get_client_or_404(client_id, db)
    
    # Fetch all common statuses to show draft/published/closed together
    all_data = []
    # If a specific status is requested, use only that
    statuses = [status_filter] if status_filter else ["published", "draft", "closed"]
    
    seen_ids = set()
    all_data = []
    
    for s in statuses:
        params = {"limit": limit, "status": s}
        resp = await _tt_get(client.tt_api_key, "/events", params)
        for ev in resp.get("data", []):
            if ev.get("id") not in seen_ids:
                all_data.append(ev)
                seen_ids.add(ev.get("id"))
    
    # Sort by start date (newest first)
    all_data.sort(key=lambda x: x.get("start", {}).get("iso", ""), reverse=True)
    
    return {"client_id": client_id, "client_name": client.name, "data": {"data": all_data}}


@router.post("/{client_id}/events")
async def create_event(
    client_id: int,
    event: EventCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Create a new event (Event Series + Occurrence) in TicketTailor."""
    client = _get_client_or_404(client_id, db)
    
    # 1. Create Event Series
    series_payload = {
        "name": event.name,
        "description": event.description,
        "online_event": "true" if event.online_event else "false",
        "private": "true" if event.private_event else "false",
    }
    if not event.online_event:
        if event.venue_name: series_payload["venue"] = event.venue_name
        if event.postal_code: series_payload["postal_code"] = event.postal_code
        if event.country: series_payload["country"] = event.country

        
    series_data = await _tt_post(client.tt_api_key, "/event_series", series_payload)
    series_id = series_data.get("id")
    
    # 2. Create Event Occurrence
    occurrence_payload = {
        "start_date": event.start_date,
        "start_time": event.start_time,
        "end_date": event.end_date,
        "end_time": event.end_time
    }
    occurrence_data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/events", occurrence_payload)
    occurrence_id = occurrence_data.get("id")

    # 3. Create Ticket Groups
    group_id_map = {} # index -> tt_group_id
    if event.groups:
        for idx, group in enumerate(event.groups):
            try:
                g_data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_groups", {"name": group.name})
                group_id_map[idx] = g_data.get("id")
            except Exception as e:
                print(f"ERROR: Failed to create group {group.name}: {e}")

    # 4. Create Ticket Types
    if event.tickets:
        for ticket in event.tickets:
            try:
                payload = {
                    "name": ticket.name,
                    "price": int(ticket.price * 100),
                    "quantity": ticket.quantity,
                    "event_ids": [occurrence_id]
                }
                if ticket.group_index is not None and ticket.group_index in group_id_map:
                    # TicketTailor uses 'groupId' in the payload for some endpoints
                    payload["groupId"] = int(group_id_map[ticket.group_index].replace("tg_", ""))
                
                await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_types", payload)
            except Exception as e:
                print(f"ERROR: Failed to create ticket {ticket.name}: {e}")
    
    return {"client_id": client_id, "data": occurrence_data}


@router.patch("/{client_id}/events/{event_id}")
@router.put("/{client_id}/events/{event_id}")
@router.post("/{client_id}/events/{event_id}")
async def update_event(
    client_id: int,
    event_id: str,
    update: EventUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Update event details in TicketTailor."""
    client = _get_client_or_404(client_id, db)
    print(f"DEBUG: Updating event {event_id} for client {client_id}")
    
    # 1. Fetch current event to get event_series_id
    try:
        event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    except HTTPException as e:
        print(f"DEBUG: Failed to fetch event {event_id}: {e.detail}")
        raise e

    # Extract series ID - and handle if it's an object or a string
    series_obj = event_data.get("event_series")
    series_id = None
    if isinstance(series_obj, dict):
        series_id = series_obj.get("id")
    elif isinstance(series_obj, str):
        series_id = series_obj
    else:
        series_id = event_data.get("event_series_id")
    
    print(f"DEBUG: Found series_id: {series_id}")
    
    results = {}
    
    # 2. Update Series if fields provided
    series_payload = {}
    if update.name is not None: series_payload["name"] = update.name
    if update.description is not None: series_payload["description"] = update.description
    if update.online_event is not None: series_payload["online_event"] = "true" if update.online_event else "false"
    if update.private_event is not None: series_payload["private"] = "true" if update.private_event else "false"
    
    if not update.online_event:
        if update.venue_name is not None: series_payload["venue"] = update.venue_name
        if update.postal_code is not None: series_payload["postal_code"] = update.postal_code
        if update.country is not None: series_payload["country"] = update.country

    
    if series_payload and series_id:
        print(f"DEBUG: Updating series {series_id} with {series_payload}")
        # Use POST for updates in TicketTailor API v1
        results["series"] = await _tt_post(client.tt_api_key, f"/event_series/{series_id}", series_payload)
        
    # 3. Update Occurrence if status provided
    if update.status is not None:
        occurrence_payload = {"status": update.status}
        print(f"DEBUG: Updating occurrence {event_id} with {occurrence_payload} via series {series_id}")
        path = f"/event_series/{series_id}/events/{event_id}"
        results["occurrence"] = await _tt_post(client.tt_api_key, path, occurrence_payload)
        
    return {"client_id": client_id, "data": results or event_data}


@router.delete("/{client_id}/events/{event_id}")
async def delete_event(
    client_id: int,
    event_id: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Delete an event from TicketTailor."""
    client = _get_client_or_404(client_id, db)
    
    # 1. Fetch current event to get event_series_id
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_obj = event_data.get("event_series")
    series_id = None
    if isinstance(series_obj, dict):
        series_id = series_obj.get("id")
    elif isinstance(series_obj, str):
        series_id = series_obj
    else:
        series_id = event_data.get("event_series_id")
        
    if not series_id:
        raise HTTPException(status_code=400, detail="Could not find series ID for this event")
        
    # 2. Delete using the correct series-specific path
    await _tt_delete(client.tt_api_key, f"/event_series/{series_id}/events/{event_id}")
    return {"message": "Event deleted successfully"}


@router.get("/{client_id}/events/{event_id}")
async def get_event(
    client_id: int,
    event_id: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Get a single event detail from TicketTailor."""
    client = _get_client_or_404(client_id, db)
    data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    return {"client_id": client_id, "data": data}


@router.get("/{client_id}/orders")
async def list_orders(
    client_id: int,
    event_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """List orders, optionally filtered by event."""
    client = _get_client_or_404(client_id, db)
    params: dict = {"limit": limit}
    if event_id:
        params["event_id"] = event_id
    data = await _tt_get(client.tt_api_key, "/orders", params)
    return {"client_id": client_id, "data": data}


@router.get("/{client_id}/issued_tickets")
async def list_issued_tickets(
    client_id: int,
    event_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """List issued tickets for a client."""
    client = _get_client_or_404(client_id, db)
    params: dict = {"limit": limit}
    if event_id:
        params["event_id"] = event_id
    data = await _tt_get(client.tt_api_key, "/issued_tickets", params)
    return {"client_id": client_id, "data": data}


@router.post("/{client_id}/events/{event_id}/ticket_types")
async def create_ticket_type(
    client_id: int,
    event_id: str,
    tt: TicketTypeCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Create a new ticket type for an event."""
    client = _get_client_or_404(client_id, db)
    
    # Need Series ID to create ticket type
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = event_data.get("event_series_id")
    
    payload = {
        "name": tt.name,
        "price": int(tt.price * 100),
        "quantity": tt.quantity,
        "max_per_order": tt.max_per_order,
        "event_ids": [event_id] # Restrict to this occurrence
    }
    if tt.group_id:
        payload["groupId"] = int(tt.group_id.replace("tg_", ""))
        
    data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_types", payload)
    return {"client_id": client_id, "data": data}


@router.post("/{client_id}/events/{event_id}/ticket_groups")
async def create_ticket_group(
    client_id: int,
    event_id: str,
    tg: TicketGroupCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Create a new ticket group for an event's series."""
    client = _get_client_or_404(client_id, db)
    
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = event_data.get("event_series_id")
    
    payload = {"name": tg.name}
    data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_groups", payload)
    return {"client_id": client_id, "data": data}


@router.get("/{client_id}/events/{event_id}/ticket_groups")
async def list_ticket_groups(
    client_id: int,
    event_id: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    List all ticket groups for an event's series.
    TicketTailor v1 embeds groups in the event response.
    """
    client = _get_client_or_404(client_id, db)
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    groups = event_data.get("ticket_groups", [])
    return {"client_id": client_id, "data": {"data": groups}}


@router.patch("/{client_id}/events/{event_id}/ticket_types/{ticket_type_id}")
@router.post("/{client_id}/events/{event_id}/ticket_types/{ticket_type_id}")
async def update_ticket_type(
    client_id: int,
    event_id: str,
    ticket_type_id: str,
    tt: TicketTypeCreate, # Reusing schema for updates
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Update an existing ticket type."""
    client = _get_client_or_404(client_id, db)
    
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = _get_series_id(event_data)
    
    payload = {
        "name": tt.name,
        "price": int(tt.price * 100),
        "quantity": tt.quantity,
    }
    if tt.group_id:
        g_id = tt.group_id.replace("tg_", "")
        payload["groupId"] = int(g_id)
        
    data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_types/{ticket_type_id}", payload)
    return {"client_id": client_id, "data": data}


@router.delete("/{client_id}/events/{event_id}/ticket_types/{ticket_type_id}")
async def delete_ticket_type(
    client_id: int,
    event_id: str,
    ticket_type_id: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Delete an existing ticket type."""
    client = _get_client_or_404(client_id, db)
    
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = _get_series_id(event_data)
    
    await _tt_delete(client.tt_api_key, f"/event_series/{series_id}/ticket_types/{ticket_type_id}")
    return {"client_id": client_id, "success": True}


@router.patch("/{client_id}/events/{event_id}/ticket_groups/{group_id}")
@router.post("/{client_id}/events/{event_id}/ticket_groups/{group_id}")
async def update_ticket_group(
    client_id: int,
    event_id: str,
    group_id: str,
    tg: TicketGroupCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Update an existing ticket group name."""
    client = _get_client_or_404(client_id, db)
    
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = _get_series_id(event_data)
    
    payload = {"name": tg.name}
    data = await _tt_post(client.tt_api_key, f"/event_series/{series_id}/ticket_groups/{group_id}", payload)
    return {"client_id": client_id, "data": data}


@router.delete("/{client_id}/events/{event_id}/ticket_groups/{group_id}")
async def delete_ticket_group(
    client_id: int,
    event_id: str,
    group_id: str,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """Delete an existing ticket group."""
    client = _get_client_or_404(client_id, db)
    
    event_data = await _tt_get(client.tt_api_key, f"/events/{event_id}")
    series_id = _get_series_id(event_data)
    
    await _tt_delete(client.tt_api_key, f"/event_series/{series_id}/ticket_groups/{group_id}")
    return {"client_id": client_id, "success": True}


# ─── Analytics ───────────────────────────────────────────────────────────────

@router.get("/{client_id}/analytics")
async def client_analytics(
    client_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Aggregate analytics for a client:
    total events, total tickets sold, total revenue.
    """
    client = _get_client_or_404(client_id, db)

    # 1. Fetch all events (published, draft, closed)
    all_events = []
    seen_ids = set()
    for status in ["published", "draft", "closed"]:
        resp = await _tt_get(client.tt_api_key, "/events", {"limit": 100, "status": status})
        for ev in resp.get("data", []):
            if ev.get("id") not in seen_ids:
                all_events.append(ev)
                seen_ids.add(ev.get("id"))
    
    total_events = len(all_events)
    published_events = sum(1 for ev in all_events if ev.get("status") == "published")

    # 2. Fetch all issued tickets with pagination support
    all_tickets = []
    after = None
    while True:
        params = {"limit": 100}
        if after: params["starting_after"] = after
        t_resp = await _tt_get(client.tt_api_key, "/issued_tickets", params)
        t_data = t_resp.get("data", [])
        all_tickets.extend(t_data)
        if len(t_data) < 100: break
        after = t_data[-1]["id"]
    
    total_tickets_sold = len(all_tickets)

    # 3. Calculate revenue from issued tickets' listed_price
    # This captures manual tickets which don't have Order objects
    total_revenue = sum(t.get("listed_price", 0) for t in all_tickets) / 100.0

    # Build per-event breakdown for charts
    fee_percent = float(client.platform_fee)
    event_map = {
        ev["id"]: {
            "id": ev["id"],
            "name": ev["name"],
            "status": ev.get("status", "unknown"),
            "start_iso": ev.get("start", {}).get("iso") or ev.get("start", {}).get("date"),
            "tickets": 0,
            "revenue": 0.0,
            "earnings": 0.0,
            "avg_price": 0.0,
        }
        for ev in all_events
    }

    import datetime

    for tit in all_tickets:
        eid = tit.get("event_id")
        if eid in event_map:
            price = tit.get("listed_price", 0) / 100.0
            earnings = price * fee_percent / 100.0
            
            # Overall stats
            event_map[eid]["tickets"] += 1
            event_map[eid]["revenue"] += price
            event_map[eid]["earnings"] += earnings
            
            # Monthly breakdown (by ticket creation date)
            created_at = tit.get("created_at")
            if created_at:
                dt = datetime.datetime.utcfromtimestamp(created_at)
                month_key = dt.strftime("%b %Y") # e.g. "Feb 2026"
                
                if "monthly_breakdown" not in event_map[eid]:
                    event_map[eid]["monthly_breakdown"] = {}
                
                if month_key not in event_map[eid]["monthly_breakdown"]:
                    event_map[eid]["monthly_breakdown"][month_key] = {"tickets": 0, "revenue": 0.0, "earnings": 0.0}
                
                mb = event_map[eid]["monthly_breakdown"][month_key]
                mb["tickets"] += 1
                mb["revenue"] += price
                mb["earnings"] += earnings

    # Calculate avg_price per event and format numbers
    for ev_data in event_map.values():
        if ev_data["tickets"] > 0:
            ev_data["avg_price"] = round(ev_data["revenue"] / ev_data["tickets"], 2)
        ev_data["revenue"] = round(ev_data["revenue"], 2)
        ev_data["earnings"] = round(ev_data["earnings"], 2)
        
        # Format monthly breakdown numbers
        if "monthly_breakdown" in ev_data:
            for k, mb in ev_data["monthly_breakdown"].items():
                mb["revenue"] = round(mb["revenue"], 2)
                mb["earnings"] = round(mb["earnings"], 2)


    return {
        "client_id": client_id,
        "client_name": client.name,
        "platform_fee": float(client.platform_fee),
        "analytics": {
            "total_events": total_events,
            "published_events": published_events,
            "total_tickets_sold": total_tickets_sold,
            "total_revenue_gbp": round(total_revenue, 2),
            "platform_earnings_gbp": round(total_revenue * float(client.platform_fee) / 100, 2),
            "per_event": list(event_map.values())
        },
    }
