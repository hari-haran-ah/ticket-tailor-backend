import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
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
    return "http://localhost:5173" # fallback

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_order_email(payment: Payment, ticket_detail: dict = None):
    """
    Sends a professional HTML order confirmation email to the customer.
    Reads SMTP_EMAIL and SMTP_APP_PASSWORD from settings / .env
    """
    SMTP_SERVER = getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT   = getattr(settings, "SMTP_PORT", 587)
    SMTP_USER   = getattr(settings, "SMTP_EMAIL", "")
    SMTP_PASS   = getattr(settings, "SMTP_APP_PASSWORD", "")

    if not SMTP_USER or not SMTP_PASS:
        print(f"DEBUG: Skipping email — SMTP_EMAIL or SMTP_APP_PASSWORD not set.")
        return

    if not payment.customer_email:
        print("DEBUG: No customer email address — skipping email.")
        return

    event_name  = getattr(payment, 'event_name', 'Your Event')
    ticket_name = getattr(payment, 'ticket_type_name', 'Ticket')
    quantity    = getattr(payment, 'quantity', 1)
    amount_usd  = getattr(payment, 'total_amount_cents', 0) / 100
    buyer_name  = getattr(payment, 'customer_name', 'Customer') or 'Customer'

    # Optional: barcode / ticket ID from issued TT ticket
    barcode = ""
    if ticket_detail:
        barcode = ticket_detail.get("barcode") or ticket_detail.get("id", "")

    barcode_row = f"""
        <tr>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font-size:13px;">Ticket ID / Barcode</td>
          <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;font-family:monospace;">{barcode}</td>
        </tr>""" if barcode else ""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:30px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px 40px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:24px;">🎫 Booking Confirmed!</h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px 40px;">
                <p style="color:#333;font-size:16px;margin:0 0 8px;">Hi <strong>{buyer_name}</strong>,</p>
                <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Thank you for your purchase! Here are your order details:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px 14px;text-align:left;color:#666;font-size:13px;">Field</th>
                    <th style="padding:10px 14px;text-align:left;color:#666;font-size:13px;">Details</th>
                  </tr>
                  <tr>
                    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font-size:13px;">Event</td>
                    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;font-weight:bold;">{event_name}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font-size:13px;">Ticket</td>
                    <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;">{ticket_name} × {quantity}</td>
                  </tr>{barcode_row}
                  <tr>
                    <td style="padding:8px 14px;color:#666;font-size:13px;">Total Paid</td>
                    <td style="padding:8px 14px;color:#333;font-weight:bold;">${amount_usd:.2f}</td>
                  </tr>
                </table>
                <p style="color:#888;font-size:13px;margin-top:24px;line-height:1.5;">
                  Please show this email or your ticket barcode at the venue entrance.
                  If you have any questions, reply to this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                <p style="color:#aaa;font-size:12px;margin:0;">Powered by Talenta Events &bull; This is an automated confirmation</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["From"]    = f"Talenta Events <{SMTP_USER}>"
    msg["To"]      = payment.customer_email
    msg["Subject"] = f"🎫 Booking Confirmed — {event_name}"
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT)) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, payment.customer_email, msg.as_string())
        print(f"INFO: Confirmation email sent to {payment.customer_email}")
    except Exception as e:
        print(f"ERROR: Failed to send email to {payment.customer_email}: {e}")

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
            "send_email":     "true",      # Ask TT to also send their own email
            "reference":      f"{buyer_name}|{buyer_email}",
        }
        if first.customer_phone:
            payload_tt["phone"] = first.customer_phone

        for _ in range(payment.quantity):
            try:
                result = await _tt_post(client_api_key, "/issued_tickets", payload_tt)
                ticket_id = result.get("id", "")
                barcode   = result.get("barcode") or ticket_id
                print(f"INFO: TT issued ticket {ticket_id} → {buyer_email}")
                
                # Update the local payment record with the latest successfully issued TT ticket ID
                payment.tt_ticket_id = ticket_id
                success_counts[payment.id] += 1
                
                issued_ticket_objects.append({
                    "id":               ticket_id,
                    "barcode":          barcode,
                    "ticket_type_name": payment.ticket_type_name,
                })
            except Exception as e:
                all_tt_issued = False
                err_msg = str(e)
                print(f"WARN: TT ticket issuance failed for {payment.ticket_type_id}: {err_msg}")
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

    html_body = f"""
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:30px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
                 style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

            <tr>
              <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px 40px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:24px;">🎫 Booking Confirmed!</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 40px;">
                <p style="color:#333;font-size:16px;margin:0 0 6px;">Hi <strong>{buyer_name}</strong>,</p>
                <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Your tickets for <strong>{event_name}</strong> are confirmed!
                </p>

                <table width="100%" cellpadding="0" cellspacing="0"
                       style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px 14px;text-align:left;color:#666;font-size:12px;">#</th>
                    <th style="padding:10px 14px;text-align:left;color:#666;font-size:12px;">Ticket Type</th>
                    <th style="padding:10px 14px;text-align:left;color:#666;font-size:12px;">Barcode / ID</th>
                  </tr>
                  {ticket_rows_html}
                </table>

                <p style="color:#555;font-size:14px;margin:0 0 6px;">
                  💰 Total Paid: <strong>${amount_usd:.2f}</strong>
                </p>

                <p style="color:#888;font-size:13px;margin-top:20px;line-height:1.5;">
                  Please present your ticket barcode at the venue entrance for check-in.<br>
                  Reply to this email if you have any questions.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #eee;">
                <p style="color:#aaa;font-size:12px;margin:0;">
                  Powered by Talenta Events &bull; Automated confirmation
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body></html>
    """

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
        from datetime import datetime
        session_id = f"free_{uuid.uuid4().hex}"
        
        created_payments = []
        for p_data in payments_to_create:
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
                currency='usd',
                customer_email=payload.customer_email,
                customer_name=payload.customer_name,
                customer_phone=payload.customer_phone,
                status="complete",
                paid_at=datetime.utcnow()
            )
            db.add(payment)
            created_payments.append(payment)
        db.commit()
        
        # Issue TT tickets, reduce inventory as fallback, and send email (for free orders)
        # We pass raise_on_error=True so if TT fails (e.g. zero credits), the UI gets the error.
        try:
            await _issue_tt_tickets_and_notify(created_payments, client.tt_api_key, db, raise_on_error=True)
        except HTTPException as e:
            # Clean up the pending payments so they can try again if fixed
            for p in created_payments:
                db.delete(p)
            db.commit()
            raise e # re-raise the TT issuance error so the frontend catches it
        
        return {"session_id": session_id, "url": f"{base_url}/checkout/success?session_id={session_id}"}

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
            # Metadata is useful for the webhook to identify what the payment was for
            metadata={
                'client_id': str(client.id),
                'event_id': payload.event_id,
                'multiple_tickets': 'true',
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe Error: {str(e)}")

    # 4. Save Pending Payments in DB
    for p_data in payments_to_create:
        payment = Payment(
            stripe_session_id=session.id,
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
            currency='usd',
            customer_email=payload.customer_email,
            customer_name=payload.customer_name,
            customer_phone=payload.customer_phone,
            status="pending"
        )
        db.add(payment)
    db.commit()

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

        # Fetch payments for this session
        payments = db.query(Payment).filter(Payment.stripe_session_id == session["id"]).all()
        if payments:
            client = db.query(Client).filter(Client.id == payments[0].client_id).first()

            # ── IDEMPOTENCY CHECK ──────────────────────────────────────────────
            # Stripe retries webhooks multiple times. We check if this session
            # was already processed (status already 'complete') to avoid running
            # inventory reduction multiple times for the same payment.
            already_processed = all(p.status == "complete" for p in payments)
            if already_processed:
                print(f"INFO: Webhook for session {session['id']} already processed — skipping duplicate.")
                return JSONResponse(content={"status": "already_processed"})
            # ──────────────────────────────────────────────────────────────────

            # Mark payments as complete
            for payment in payments:
                payment.status = "complete"
                payment.stripe_payment_intent_id = session.get("payment_intent")

                # Additional customer info from checkout
                customer_details = session.get("customer_details", {})
                if customer_details and customer_details.get("name"):
                    payment.customer_name = customer_details["name"]

                payment.paid_at = datetime.utcnow()
            db.commit()

            # Issue TT tickets, reduce inventory as fallback, and send email
            if client and client.tt_api_key:
                print(f"INFO: Processing ticket issuance for session {session['id']}")
                await _issue_tt_tickets_and_notify(payments, client.tt_api_key, db)

    elif event_stripe["type"] in ("checkout.session.expired", "payment_intent.payment_failed"):
        session_or_intent = event_stripe["data"]["object"]
        payment_id = session_or_intent.get("id")

        payments = db.query(Payment).filter(
            (Payment.stripe_session_id == payment_id) |
            (Payment.stripe_payment_intent_id == payment_id)
        ).all()

        for payment in payments:
            payment.status = "failed"
        db.commit()

    return JSONResponse(content={"status": "success"})


@router.get("/session/{session_id}")
async def get_checkout_session_status(session_id: str, db: Session = Depends(get_db)):
    """
    Returns the status of a checkout session (complete/pending/failed).
    Used by the frontend to poll for order confirmation.
    """
    payments = db.query(Payment).filter(Payment.stripe_session_id == session_id).all()
    if not payments:
        raise HTTPException(status_code=404, detail="Session not found")

    # If any row is complete, consider the whole session processed
    status = "pending"
    if any(p.status == "complete" for p in payments):
        status = "complete"
    elif any(p.status == "failed" for p in payments):
        status = "failed"

    # Return some basic info for the success page
    first = payments[0]
    # Collect the first error found, if any
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
