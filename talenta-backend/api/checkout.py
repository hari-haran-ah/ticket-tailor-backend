import sys
import stripe
import json

# Ensure stdout can handle UTF-8 on Windows (prevents UnicodeEncodeError from log lines)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from starlette.responses import JSONResponse

from core.config import settings
from db.session import get_db
from models.client import Client
from models.payment import Payment
from schemas.payment import CheckoutRequest, CheckoutResponse
from api.site import get_current_client, _tt_get, _tt_post

router = APIRouter(prefix="/api/site/checkout", tags=["Checkout"])

stripe.api_key = settings.STRIPE_SECRET_KEY

# Frontend URLs — this assumes the frontend domain that initiated the request
# We'll calculate it dynamically below to redirect back to the correct client app
def get_base_url(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if origin:
        # Origin might have trailing slash, strip it
        return origin.rstrip("/")
    return settings.FRONTEND_URL # fallback

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


async def _issue_tt_tickets_and_notify(payments: list, client_api_key: str, db: Session, raise_on_error: bool = False):
    """
    Full post-payment flow (mirrors the working Ticket-Tailor backend):
      1. Issue tickets via Ticket Tailor /issued_tickets API
         (TT will send their own branded email if `send_email=true`)
      2. If TT issuance fails (billing not set up), fall back to manual inventory reduction
      3. Send our own styled HTML confirmation email with ticket barcodes via SMTP
    """
    if not payments:
        return

    first = payments[0]
    event_id    = first.event_id
    buyer_name  = first.customer_name or "Customer"
    buyer_email = first.customer_email or ""

    # ── Step 1: Try to issue tickets via Ticket Tailor API ────────────────────
    issued_ticket_objects = []   # list of {id, barcode, ticket_type_name}
    all_tt_issued = True
    # Track how many tickets were successfully issued per payment
    success_counts = {p.id: 0 for p in payments}

    for payment in payments:
        payload_tt = {
            "event_id":       event_id,
            "ticket_type_id": payment.ticket_type_id,
            "full_name":      buyer_name,
            "name":           buyer_name,  # Added 'name' field as well to satisfy TT validation for some accounts
            "email":          buyer_email,
            "send_email":     "1",      # Ask TT to also send their own email
            # Make reference unique per ticket_type so TT does not reject duplicate refs
            "reference":      f"{buyer_name}|{buyer_email}|{payment.ticket_type_id}",
        }
        if first.customer_phone:
            payload_tt["phone"] = first.customer_phone

        for ticket_index in range(payment.quantity):
            try:
                result = await _tt_post(client_api_key, "/issued_tickets", payload_tt)
                ticket_id = result.get("id", "")
                barcode   = result.get("barcode") or ticket_id
                # Use ASCII arrow to avoid UnicodeEncodeError on Windows stdout
                print(f"INFO: TT issued ticket {ticket_id} ({ticket_index+1}/{payment.quantity}) -> {buyer_email}")

                # For the first successful ticket, store the ID in the payment record
                # Note: For quantity > 1, we only store the first ticket ID for reference
                if payment.tt_ticket_id is None:  # Only set if not already set
                    payment.tt_ticket_id = ticket_id
                    print(f"INFO: Set payment {payment.id} tt_ticket_id to first ticket: {ticket_id}")

                success_counts[payment.id] += 1

                issued_ticket_objects.append({
                    "id":               ticket_id,
                    "barcode":          barcode,
                    "ticket_type_name": payment.ticket_type_name,
                })
            except Exception as e:
                all_tt_issued = False
                err_msg = str(e)
                try:
                    print(f"WARN: TT ticket issuance failed for {payment.ticket_type_id} ticket {ticket_index+1}/{payment.quantity}: {err_msg}")
                except Exception:
                    pass
                # Save the error to the database so we can show it to the user
                payment.tt_error = err_msg

                # If we want to strictly abort (e.g., instant free checkout where we MUST have credits), we raise
                if raise_on_error:
                    raise HTTPException(status_code=400, detail=f"Ticket Tailor issuance failed: {err_msg}")


    # ── Step 2: Manual inventory reduction fallback ────────────────────────────
    # If ANY TT issuance failed (e.g. billing not configured), manually reduce the REMAINDER.
    if not all_tt_issued:
        try:
            event_data = await _tt_get(client_api_key, f"/events/{event_id}")
            series_id  = event_data.get("event_series_id")
            if not series_id:
                series_obj = event_data.get("event_series")
                series_id  = series_obj.get("id") if isinstance(series_obj, dict) else series_obj

            if series_id:
                ticket_types = event_data.get("ticket_types", [])

                # Aggregate only the FAILURES to reduce manually
                tt_qty_map: dict = {}
                for p in payments:
                    failed_qty = p.quantity - success_counts.get(p.id, 0)
                    if failed_qty > 0:
                        tt_qty_map[p.ticket_type_id] = tt_qty_map.get(p.ticket_type_id, 0) + failed_qty

                for tt_id, qty_to_reduce in tt_qty_map.items():
                    target = next((t for t in ticket_types if t["id"] == tt_id), None)
                    if not target:
                        continue
                    current_qty = target.get("quantity")
                    if current_qty is None:
                        continue  # unlimited
                    new_qty = max(0, current_qty - qty_to_reduce)
                    print(f"INFO: Partial failure, manual reduction for {tt_id}: {current_qty} -> {new_qty}")
                    await _tt_post(client_api_key,
                                   f"/event_series/{series_id}/ticket_types/{tt_id}",
                                   {"quantity": new_qty})
            else:
                print(f"ERROR: Could not find series_id for event {event_id} fallback")

        except Exception as e:
            print(f"ERROR: Manual inventory reduction failed: {e}")

    # ── Step 2.5: PERSIST tt_ticket_id ────────────────────────────────────────
    try:
        db.commit()
    except Exception as e:
        print(f"ERROR: Failed to commit tt_ticket_id: {e}")

    # ── Step 3: Send our own HTML confirmation email via SMTP ─────────────────
    # Build a multi-ticket summary in case multiple payment rows exist
    ticket_rows_html = ""
    for i, t in enumerate(issued_ticket_objects, 1):
        barcode   = t.get("barcode", "N/A")
        ttype     = t.get("ticket_type_name", "Ticket")
        ticket_rows_html += f"""
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;">{i}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;">{ttype}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;font-family:monospace;font-size:12px;">{barcode}</td>
        </tr>"""

    # If TT issuance failed and we have no barcodes, show a summary row per payment
    if not ticket_rows_html:
        for payment in payments:
            ticket_rows_html += f"""
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;">-</td>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;">{payment.ticket_type_name} × {payment.quantity}</td>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#555;font-size:12px;">Pending TT issuance</td>
        </tr>"""

    # Send our custom aggregated email regardless of whether it's 1 or more tickets
    total_amount_cents = sum(p.total_amount_cents for p in payments)
    amount_usd = total_amount_cents / 100
    event_name = first.event_name or "Your Event"

    await _send_confirmation_email(
        to_email   = buyer_email,
        buyer_name = buyer_name,
        event_name = event_name,
        ticket_rows_html = ticket_rows_html,
        amount_usd = amount_usd,
    )


async def _send_confirmation_email(to_email: str, buyer_name: str, event_name: str,
                                    ticket_rows_html: str, amount_usd: float):
    """Send a styled HTML confirmation email with ticket barcodes."""
    SMTP_SERVER = getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT   = getattr(settings, "SMTP_PORT", 587)
    SMTP_USER   = getattr(settings, "SMTP_EMAIL", "")
    SMTP_PASS   = getattr(settings, "SMTP_APP_PASSWORD", "")

    if not SMTP_USER or not SMTP_PASS:
        print("DEBUG: Skipping email — SMTP_EMAIL or SMTP_APP_PASSWORD not configured.")
        return
    if not to_email:
        print("DEBUG: No recipient email — skipping.")
        return

    from templates.email_templates import get_multi_ticket_email_html
    html_body = get_multi_ticket_email_html(
        buyer_name=buyer_name,
        event_name=event_name,
        ticket_rows_html=ticket_rows_html,
        amount_usd=amount_usd
    )

    msg = MIMEMultipart("alternative")
    msg["From"]    = f"Talenta Events <{SMTP_USER}>"
    msg["To"]      = to_email
    msg["Subject"] = f"🎫 Booking Confirmed — {event_name}"
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT)) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"INFO: Confirmation email sent to {to_email}")
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}: {e}")


@router.post("/session", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutRequest,
    request: Request,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db)
):
    if not client.stripe_account_id:
        raise HTTPException(
            status_code=400,
            detail="This organizer is not fully set up to receive payments (Missing Stripe Account)."
        )

    # 1. Fetch event details from TicketTailor to verify prices and existence
    try:
        event_data = await _tt_get(client.tt_api_key, f"/events/{payload.event_id}")
    except Exception as e:
        raise HTTPException(status_code=404, detail="Event not found or failed to fetch.")

    # 2. Process requested ticket types
    ticket_types = event_data.get("ticket_types", [])
    
    line_items = []
    payments_to_create = []
    total_amount = 0
    
    if not payload.items:
        raise HTTPException(status_code=400, detail="No tickets selected.")
        
    for item in payload.items:
        target_ticket = next((t for t in ticket_types if t["id"] == item.ticket_type_id), None)
        if not target_ticket:
            raise HTTPException(status_code=404, detail=f"Ticket type not found.")
            
        if item.quantity > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 tickets per type allowed per transaction.")
            
        status = target_ticket.get("status", "")
        if status not in ["on_sale", "locked"]:  # locked tickets might be unlocked via TT code, but on_sale is primary
            # Let's just strictly enforce on_sale if we must, but safe fallback:
            if status != "on_sale":
                raise HTTPException(status_code=400, detail=f"Ticket '{target_ticket.get('name')}' is currently not available.")

        capacity = target_ticket.get("quantity") or 0
        sold = target_ticket.get("quantity_sold", 0)
        
        available = target_ticket.get("quantity_available")
        if available is None:
            available = max(0, capacity - sold)
            
        if capacity > 0 and item.quantity > available:
            raise HTTPException(status_code=400, detail=f"Only {available} tickets left for '{target_ticket.get('name')}'.")
            
        unit_amount = target_ticket.get("price", 0)
            
        item_total = unit_amount * item.quantity
        total_amount += item_total
        
        if unit_amount > 0:
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"{event_data.get('name')} - {target_ticket.get('name')}",
                    },
                    'unit_amount': unit_amount,
                },
                'quantity': item.quantity,
            })
        
        payments_to_create.append({
            "ticket_type_id": item.ticket_type_id,
            "ticket_type_name": target_ticket.get("name", "Unknown Ticket"),
            "quantity": item.quantity,
            "unit_amount_cents": unit_amount,
            "total_amount_cents": item_total,
        })
    
    # Calculate platform fee (if any)
    # E.g. 5% platform_fee means we keep 5%, they get 95%.
    # If using application_fee_amount, it specifies how much stays on the platform
    platform_fee_amount = 0
    if client.platform_fee > 0:
        platform_fee_amount = int(total_amount * (client.platform_fee / 100))

    base_url = get_base_url(request)

    # 3. Create Stripe Checkout Session OR Instant Free Session
    if total_amount == 0:
        import uuid
        from datetime import datetime, timedelta

        # ── IDEMPOTENCY CHECK: Prevent duplicate free orders ───────────────────────
        # Check if this exact order was already created in the last 5 minutes
        # (same customer, same event, same tickets, same quantities)
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)

        # Build a signature of the order for duplicate detection
        ticket_signature = "|".join(sorted([
            f"{p['ticket_type_id']}:{p['quantity']}"
            for p in payments_to_create
        ]))

        recent_duplicate = db.query(Payment).filter(
            Payment.client_id == client.id,
            Payment.event_id == payload.event_id,
            Payment.customer_email == payload.customer_email,
            Payment.status == "complete",
            Payment.paid_at >= recent_cutoff
        ).first()

        if recent_duplicate:
            # Check if the ticket types and quantities match
            existing_payments = db.query(Payment).filter(
                Payment.stripe_session_id == recent_duplicate.stripe_session_id
            ).all()

            existing_signature = "|".join(sorted([
                f"{p.ticket_type_id}:{p.quantity}"
                for p in existing_payments
            ]))

            if existing_signature == ticket_signature:
                print(f"INFO: Duplicate free order detected for {payload.customer_email} - returning existing session {recent_duplicate.stripe_session_id}")
                # Return the existing session instead of creating a duplicate
                return {
                    "session_id": recent_duplicate.stripe_session_id,
                    "url": f"{base_url}/checkout/success?session_id={recent_duplicate.stripe_session_id}"
                }

        session_id = f"free_{uuid.uuid4().hex}"
        created_payments = []
        total_quantity = 0

        try:
            print(f"INFO: Creating {len(payments_to_create)} payment records for FREE session {session_id}")
            for i, p_data in enumerate(payments_to_create):
                # Calculate platform fee for this payment (free tickets = $0 fee)
                payment_fee_cents = 0

                payment = Payment(
                    stripe_session_id=session_id,
                    client_id=client.id,
                    client_name=client.name,
                    stripe_account_id=client.stripe_account_id,
                    event_id=payload.event_id,
                    event_name=event_data.get("name", "Unknown Event"),
                    ticket_type_id=p_data["ticket_type_id"],
                    ticket_type_name=p_data["ticket_type_name"],
                    quantity=p_data["quantity"],
                    unit_amount_cents=p_data["unit_amount_cents"],
                    total_amount_cents=p_data["total_amount_cents"],
                    platform_fee_cents=payment_fee_cents,
                    currency='usd',
                    customer_email=payload.customer_email,
                    customer_name=payload.customer_name,
                    customer_phone=payload.customer_phone,
                    status="complete",
                    paid_at=datetime.utcnow()
                )
                db.add(payment)
                created_payments.append(payment)
                total_quantity += payment.quantity
                print(f"INFO: Created FREE payment record {i+1}/{len(payments_to_create)}: {payment.ticket_type_name} x{payment.quantity}")

            # Commit all free payment records atomically
            db.commit()
            print(f"INFO: Successfully committed {len(created_payments)} FREE payment records with {total_quantity} total tickets for session {session_id}")

            # Issue TT tickets, reduce inventory as fallback, and send email (for free orders)
            # We pass raise_on_error=True so if TT fails (e.g. zero credits), the UI gets the error.
            try:
                await _issue_tt_tickets_and_notify(created_payments, client.tt_api_key, db, raise_on_error=True)
            except HTTPException as e:
                # Clean up the pending payments so they can try again if fixed
                print(f"ERROR: TT issuance failed for free session {session_id}, cleaning up {len(created_payments)} payment records")
                for p in created_payments:
                    db.delete(p)
                db.commit()
                raise e # re-raise the TT issuance error so the frontend catches it

        except Exception as e:
            print(f"ERROR: Failed to process free checkout for session {session_id}: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to process free checkout: {str(e)}")

        return {"session_id": session_id, "url": f"{base_url}/checkout/success?session_id={session_id}"}

    # Store payment data in Stripe metadata instead of creating pending records
    payment_metadata = {
        'client_id': str(client.id),
        'client_name': client.name,
        'stripe_account_id': client.stripe_account_id,
        'event_id': payload.event_id,
        'event_name': event_data.get("name", "Unknown Event"),
        'customer_email': payload.customer_email,
        'customer_name': payload.customer_name or "",
        'customer_phone': payload.customer_phone or "",
        'payments_data': json.dumps(payments_to_create),
        'multiple_tickets': 'true',
    }

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=payload.customer_email,
            line_items=line_items,
            mode='payment',
            success_url=f"{base_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base_url}/checkout/cancel?event_id={payload.event_id}",
            payment_intent_data={
                # Route funds to connected account
                'transfer_data': {
                    'destination': client.stripe_account_id,
                },
                # We optionally take a cut here
                **({'application_fee_amount': platform_fee_amount} if platform_fee_amount > 0 else {})
            },
            # Store all payment data in metadata so we can create records only when payment succeeds
            metadata=payment_metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe Error: {str(e)}")

    # No longer creating pending payment records here - they will be created only on successful payment

    return {"session_id": session.id, "url": session.url}

from datetime import datetime

@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event_stripe = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event_stripe["type"] == "checkout.session.completed":
        session = event_stripe["data"]["object"]
        session_id = session["id"]

        # Use a database transaction with row-level locking to prevent race conditions
        try:
            # Check if payments already exist (prevent duplicate processing)
            # Use SELECT FOR UPDATE to lock the query and prevent Race conditions
            existing_payments = db.query(Payment).filter(
                Payment.stripe_session_id == session_id
            ).with_for_update().all()

            if existing_payments:
                print(f"INFO: Webhook for session {session_id} already processed ({len(existing_payments)} payments exist) — skipping duplicate.")
                db.commit()  # Release the lock
                return JSONResponse(content={"status": "already_processed"})

            print(f"INFO: Processing new webhook for session {session_id}")

            # Extract payment data from session metadata
            metadata = session.get("metadata", {})
            client_id = metadata.get("client_id")
            payments_data_str = metadata.get("payments_data", "[]")

            if not client_id:
                print(f"ERROR: No client_id in session metadata for {session_id}")
                return JSONResponse(content={"status": "error", "message": "Missing client_id in metadata"})

            try:
                payments_data = json.loads(payments_data_str)
            except json.JSONDecodeError:
                print(f"ERROR: Invalid payments_data JSON in session metadata for {session_id}")
                return JSONResponse(content={"status": "error", "message": "Invalid payments_data in metadata"})

            client = db.query(Client).filter(Client.id == int(client_id)).first()
            if not client:
                print(f"ERROR: Client {client_id} not found for session {session_id}")
                return JSONResponse(content={"status": "error", "message": "Client not found"})

            # Create payment records now that payment is confirmed
            created_payments = []
            total_quantity = 0

            print(f"INFO: Creating {len(payments_data)} payment records for session {session_id}")
            for i, p_data in enumerate(payments_data):
                # Calculate platform fee for this payment based on client's platform_fee percentage
                payment_total_cents = p_data["total_amount_cents"]
                payment_fee_cents = int(payment_total_cents * (float(client.platform_fee) / 100))

                payment = Payment(
                    stripe_session_id=session_id,
                    client_id=client.id,
                    client_name=metadata.get("client_name", client.name),
                    stripe_account_id=metadata.get("stripe_account_id", client.stripe_account_id),
                    event_id=metadata.get("event_id"),
                    event_name=metadata.get("event_name", "Unknown Event"),
                    ticket_type_id=p_data["ticket_type_id"],
                    ticket_type_name=p_data["ticket_type_name"],
                    quantity=p_data["quantity"],
                    unit_amount_cents=p_data["unit_amount_cents"],
                    total_amount_cents=p_data["total_amount_cents"],
                    platform_fee_cents=payment_fee_cents,
                    currency='usd',
                    customer_email=metadata.get("customer_email"),
                    customer_name=metadata.get("customer_name"),
                    customer_phone=metadata.get("customer_phone"),
                    status="complete",
                    stripe_payment_intent_id=session.get("payment_intent"),
                    paid_at=datetime.utcnow()
                )

                # Additional customer info from checkout session
                customer_details = session.get("customer_details", {})
                if customer_details and customer_details.get("name"):
                    payment.customer_name = customer_details["name"]

                db.add(payment)
                created_payments.append(payment)
                total_quantity += payment.quantity
                print(f"INFO: Created payment record {i+1}/{len(payments_data)}: {payment.ticket_type_name} x{payment.quantity}")

            # Commit all payment records atomically
            db.commit()
            print(f"INFO: Successfully committed {len(created_payments)} payment records with {total_quantity} total tickets for session {session_id}")

            # Issue TT tickets, reduce inventory as fallback, and send email
            if client and client.tt_api_key:
                print(f"INFO: Processing ticket issuance for session {session_id}")
                await _issue_tt_tickets_and_notify(created_payments, client.tt_api_key, db)

        except Exception as e:
            # If this is a unique constraint violation, it means a duplicate webhook
            # delivery raced past our SELECT FOR UPDATE guard and tried to insert
            # the same payment again. This is safe to ignore — the first webhook
            # already processed the payment successfully.
            if isinstance(e, IntegrityError):
                print(f"INFO: Duplicate webhook race condition for session {session_id} — IntegrityError caught, safely ignoring.")
                db.rollback()
                return JSONResponse(content={"status": "already_processed"})
            print(f"ERROR: Failed to process webhook for session {session_id}: {e}")
            db.rollback()
            return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

    elif event_stripe["type"] in ("checkout.session.expired", "payment_intent.payment_failed"):
        session_or_intent = event_stripe["data"]["object"]
        session_id = session_or_intent.get("id")

        # For expired sessions, check if any payment records were created and mark them as failed
        payments = db.query(Payment).filter(Payment.stripe_session_id == session_id).all()

        if payments:
            for payment in payments:
                payment.status = "failed"
            db.commit()
            print(f"INFO: Marked {len(payments)} payment records as failed for session {session_id}")
        else:
            # No payment records exist (which is expected with new flow) - just log the expiration
            print(f"INFO: Session {session_id} expired - no payment records to update")

    return JSONResponse(content={"status": "success"})


@router.get("/session/{session_id}")
async def get_checkout_session_status(session_id: str, db: Session = Depends(get_db)):
    """
    Returns the status of a checkout session (complete/pending/failed).
    Used by the frontend to poll for order confirmation.
    """
    payments = db.query(Payment).filter(Payment.stripe_session_id == session_id).all()

    if payments:
        # Payment records exist, so payment was completed
        status = "complete" if any(p.status == "complete" for p in payments) else "failed"

        first = payments[0]
        tt_error = next((p.tt_error for p in payments if p.tt_error), None)

        return {
            "status": status,
            "session_id": session_id,
            "event_name": first.event_name,
            "customer_name": first.customer_name,
            "total_amount_cents": sum(p.total_amount_cents for p in payments),
            "ticket_count": sum(p.quantity for p in payments),
            "tt_error": tt_error
        }
    else:
        # No payment records exist yet - check Stripe session status
        try:
            stripe_session = stripe.checkout.Session.retrieve(session_id)
            stripe_status = stripe_session.get("payment_status", "unpaid")

            if stripe_status == "paid":
                # Payment completed but webhook might not have processed yet
                # Extract basic info from session metadata for display
                metadata = stripe_session.get("metadata", {})
                payments_data = json.loads(metadata.get("payments_data", "[]"))

                total_amount = sum(p.get("total_amount_cents", 0) for p in payments_data)
                ticket_count = sum(p.get("quantity", 0) for p in payments_data)

                return {
                    "status": "complete",
                    "session_id": session_id,
                    "event_name": metadata.get("event_name", "Event"),
                    "customer_name": metadata.get("customer_name", "Customer"),
                    "total_amount_cents": total_amount,
                    "ticket_count": ticket_count,
                    "tt_error": None
                }
            elif stripe_session.get("status") == "expired":
                return {
                    "status": "failed",
                    "session_id": session_id,
                    "event_name": "Event",
                    "customer_name": "Customer",
                    "total_amount_cents": 0,
                    "ticket_count": 0,
                    "tt_error": "Session expired"
                }
            else:
                # Session still pending
                return {
                    "status": "pending",
                    "session_id": session_id,
                    "event_name": "Event",
                    "customer_name": "Customer",
                    "total_amount_cents": 0,
                    "ticket_count": 0,
                    "tt_error": None
                }

        except stripe.error.InvalidRequestError:
            # Session not found in Stripe
            raise HTTPException(status_code=404, detail="Session not found")
        except Exception as e:
            print(f"ERROR: Failed to retrieve Stripe session {session_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to check session status")


@router.post("/cleanup/expired-sessions")
async def cleanup_expired_sessions(db: Session = Depends(get_db)):
    """
    Administrative endpoint to cleanup any orphaned payment records from
    expired Stripe sessions. This can be called periodically via cron job.
    """
    from datetime import datetime, timedelta

    # Find payments that are still "pending" and older than 24 hours
    # (Stripe checkout sessions expire after 24 hours)
    cutoff_time = datetime.utcnow() - timedelta(hours=24)
    old_pending_payments = db.query(Payment).filter(
        Payment.status == "pending",
        Payment.created_at < cutoff_time
    ).all()

    cleaned_count = 0
    failed_count = 0

    for payment in old_pending_payments:
        try:
            # Check actual Stripe session status
            stripe_session = stripe.checkout.Session.retrieve(payment.stripe_session_id)
            if stripe_session.get("status") == "expired":
                # Mark as failed since Stripe confirmed it's expired
                payment.status = "failed"
                cleaned_count += 1
            # If session is not expired, leave it as pending
        except stripe.error.InvalidRequestError:
            # Session doesn't exist in Stripe, mark as failed
            payment.status = "failed"
            cleaned_count += 1
        except Exception as e:
            print(f"ERROR: Failed to check Stripe session {payment.stripe_session_id}: {e}")
            failed_count += 1

    if cleaned_count > 0:
        db.commit()

    return {
        "cleaned_up": cleaned_count,
        "failed_to_check": failed_count,
        "total_checked": len(old_pending_payments)
    }   