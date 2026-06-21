"""baseline: users + dishes (текущая схема меню)

На уже существующей боевой базе эту ревизию НЕ выполняют, а проставляют
командой `alembic stamp 0001` — таблицы users/dishes там уже есть.
На чистой установке ревизия создаёт их с нуля.

Revision ID: 0001
Revises:
Create Date: 2026-06-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "dishes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="Обед"),
        sa.Column("calories", sa.Float(), nullable=False, server_default="0"),
        sa.Column("proteins", sa.Float(), nullable=False, server_default="0"),
        sa.Column("fats", sa.Float(), nullable=False, server_default="0"),
        sa.Column("carbohydrates", sa.Float(), nullable=False, server_default="0"),
        sa.Column("recipe_text_or_link", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(length=255), nullable=True),
    )
    op.create_index("ix_dishes_id", "dishes", ["id"])
    op.create_index("ix_dishes_user_id", "dishes", ["user_id"])


def downgrade() -> None:
    op.drop_table("dishes")
    op.drop_table("users")
