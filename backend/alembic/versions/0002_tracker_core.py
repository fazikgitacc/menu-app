"""tracker core: meal_entries, water_logs, user_goals

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "meal_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("meal_type", sa.String(length=16), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False, server_default="custom"),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False, server_default="1"),
        sa.Column("unit", sa.String(length=8), nullable=False, server_default="g"),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("proteins", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fats", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carbohydrates", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "dish_id", sa.Integer(),
            sa.ForeignKey("dishes.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column("image_path", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_meal_entries_id", "meal_entries", ["id"])
    op.create_index("ix_meal_entries_user_id", "meal_entries", ["user_id"])
    op.create_index("ix_meal_entries_date", "meal_entries", ["date"])

    op.create_table(
        "water_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount_ml", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_water_logs_id", "water_logs", ["id"])
    op.create_index("ix_water_logs_user_id", "water_logs", ["user_id"])
    op.create_index("ix_water_logs_date", "water_logs", ["date"])

    op.create_table(
        "user_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("target_proteins", sa.Float(), nullable=False, server_default="0"),
        sa.Column("target_fats", sa.Float(), nullable=False, server_default="0"),
        sa.Column("target_carbohydrates", sa.Float(), nullable=False, server_default="0"),
        sa.Column("target_water_ml", sa.Integer(), nullable=False, server_default="2000"),
        sa.Column("sex", sa.String(length=8), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("height_cm", sa.Float(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("activity", sa.Float(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_goals_id", "user_goals", ["id"])
    op.create_index("ix_user_goals_user_id", "user_goals", ["user_id"], unique=True)


def downgrade() -> None:
    op.drop_table("user_goals")
    op.drop_table("water_logs")
    op.drop_table("meal_entries")
