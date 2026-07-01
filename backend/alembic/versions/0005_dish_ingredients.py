"""dish ingredients, total weight and servings

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-27
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("dishes") as batch:
        batch.add_column(sa.Column("ingredients", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("total_weight_g", sa.Float(), nullable=True))
        batch.add_column(sa.Column("servings", sa.Float(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("dishes") as batch:
        batch.drop_column("servings")
        batch.drop_column("total_weight_g")
        batch.drop_column("ingredients")
