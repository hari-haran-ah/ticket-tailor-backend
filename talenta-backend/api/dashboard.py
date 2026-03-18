from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import httpx
import base64

from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from models.client import Client
from models.payment import Payment
from schemas.payment import PaymentOut
from core.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])



def _tt_headers(api_key: str) -> dict:
    encoded = base64.b64encode(f"{api_key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Accept": "application/json"}


@router.get("")
async def get_dashboard(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    """
    Platform-wide dashboard: aggregates data across all active clients.
    Returns: client count, total events, total tickets sold, total & per-client revenue.
    """
    clients: List[Client] = db.query(Client).filter(Client.is_active == True).all()

    total_clients = len(clients)
    total_events = 0
    total_tickets_sold = 0
    total_revenue = 0.0
    total_platform_earnings = 0.0
    clients_summary = []

    async with httpx.AsyncClient(timeout=15.0) as http:
        for client in clients:
            try:
                # 1. Fetch events (published, draft, closed) - still from TT for event count
                headers = _tt_headers(client.tt_api_key)
                all_events = []
                seen_event_ids = set()
                for status in ["published", "draft", "closed"]:
                    resp = await http.get(f"{settings.TT_BASE_URL}/events", headers=headers, params={"limit": 100, "status": status})
                    if resp.status_code == 200:
                        for ev in resp.json().get("data", []):
                            if ev.get("id") not in seen_event_ids:
                                all_events.append(ev)
                                seen_event_ids.add(ev.get("id"))

                c_events = len(all_events)

                # 2. Count tickets and revenue from TicketTailor API instead of Payment records
                c_tickets = 0
                c_revenue = 0.0
                for ev in all_events:
                    for tt in ev.get("ticket_types", []):
                        qty = tt.get("quantity_issued", 0) or 0
                        price = tt.get("price", 0) / 100.0
                        c_tickets += qty
                        c_revenue += qty * price

                # Calculate earnings from actual payments (stored platform_fee_cents)
                client_payments = db.query(Payment).filter(
                    Payment.client_id == client.id,
                    Payment.status == "complete"
                ).all()
                total_platform_earnings_cents = sum(p.platform_fee_cents for p in client_payments)
                c_earnings = (total_platform_earnings_cents / 100.0) * 0.79

                print(f"INFO: Client {client.name} - Events: {c_events}, Tickets: {c_tickets}, Revenue: £{c_revenue:.2f}")

                total_events += c_events
                total_tickets_sold += c_tickets
                total_revenue += c_revenue
                total_platform_earnings += c_earnings

                clients_summary.append({
                    "id": client.id,
                    "name": client.name,
                    "domain_name": client.domain_name,
                    "platform_fee": float(client.platform_fee),
                    "events": c_events,
                    "tickets_sold": c_tickets,
                    "revenue_gbp": round(c_revenue, 2),
                    "platform_earnings_gbp": round(c_earnings, 2),
                })
            except Exception as e:
                print(f"ERROR: Failed to process client {client.name}: {e}")
                clients_summary.append({
                    "id": client.id,
                    "name": client.name,
                    "domain_name": client.domain_name,
                    "platform_fee": float(client.platform_fee),
                    "events": 0,
                    "tickets_sold": 0,
                    "revenue_gbp": 0.0,
                    "platform_earnings_gbp": 0.0,
                    "error": "Failed to fetch data",
                })

    return {
        "summary": {
            "total_clients": total_clients,
            "total_events": total_events,
            "total_tickets_sold": total_tickets_sold,
            "total_revenue_gbp": round(total_revenue, 2),
            "total_platform_earnings_gbp": round(total_platform_earnings, 2),
        },
        "clients": clients_summary,
    }


@router.get("/payments", response_model=List[PaymentOut])
async def get_all_payments(db: Session = Depends(get_db), _: Admin = Depends(get_current_admin)):
    """
    Get all platform payments, ordered by newest first.
    """
    return db.query(Payment).order_by(Payment.created_at.desc()).all()
