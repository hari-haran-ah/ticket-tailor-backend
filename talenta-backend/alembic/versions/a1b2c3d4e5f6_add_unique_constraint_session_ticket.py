"""add unique constraint session ticket to prevent duplicate webhook processing

Revision ID: a1b2c3d4e5f6
Revises: 6b49993713ef
Create Date: 2026-03-18 15:30:00.000000

Prevents duplicate Stripe webhook deliveries from creating multiple payment records
and sending multiple emails for the same order. This constraint ensures each
(stripe_session_id, ticket_type_id) combination is unique in the payments table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6b49993713ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Delete duplicate rows first (keep the earliest one per session+ticket_type combo)
    # so the constraint can be applied cleanly on existing data
    op.execute("""
        DELETE FROM payments
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM payments
            GROUP BY stripe_session_id, ticket_type_id
        )
    """)
    # Now add the unique constraint
    op.create_unique_constraint(
        'uq_payment_session_ticket',
        'payments',
        ['stripe_session_id', 'ticket_type_id']
    )


def downgrade() -> None:
    op.drop_constraint('uq_payment_session_ticket', 'payments', type_='unique')
