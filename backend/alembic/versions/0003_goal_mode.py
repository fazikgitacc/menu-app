"""user_goals: добавить режим (gain/maintenance/deficit)

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("user_goals") as batch:
        batch.add_column(
            sa.Column("mode", sa.String(length=16), nullable=True, server_default="maintenance")
        )


def downgrade() -> None:
    with op.batch_alter_table("user_goals") as batch:
        batch.drop_column("mode")
