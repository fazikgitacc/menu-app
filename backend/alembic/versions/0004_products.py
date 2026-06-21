"""products: food_cache + user_products

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "food_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("barcode", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("proteins", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fats", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carbohydrates", sa.Float(), nullable=False, server_default="0"),
        sa.Column("serving_size_g", sa.Float(), nullable=True),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("fetched_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_food_cache_id", "food_cache", ["id"])
    op.create_index("ix_food_cache_barcode", "food_cache", ["barcode"], unique=True)

    op.create_table(
        "user_products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("barcode", sa.String(length=32), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("brand", sa.String(length=255), nullable=True),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("proteins", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fats", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carbohydrates", sa.Float(), nullable=False, server_default="0"),
        sa.Column("serving_size_g", sa.Float(), nullable=True),
        sa.Column("image_url", sa.String(length=512), nullable=True),
        sa.Column("last_used_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_products_id", "user_products", ["id"])
    op.create_index("ix_user_products_user_id", "user_products", ["user_id"])
    op.create_index("ix_user_products_barcode", "user_products", ["barcode"])


def downgrade() -> None:
    op.drop_table("user_products")
    op.drop_table("food_cache")
