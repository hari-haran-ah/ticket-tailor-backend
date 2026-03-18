def get_single_ticket_email_html(buyer_name: str, event_name: str, ticket_name: str, quantity: int, barcode_row: str, amount_usd: float) -> str:
    return f"""
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

def get_multi_ticket_email_html(buyer_name: str, event_name: str, ticket_rows_html: str, amount_usd: float) -> str:
    return f"""
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
