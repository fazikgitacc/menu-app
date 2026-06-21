"""Модели данных. Меню (Dish) + ядро трекера питания (MealEntry/WaterLog/UserGoal)."""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Text, ForeignKey, Date, DateTime,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    dishes = relationship(
        "Dish", back_populates="owner", cascade="all, delete-orphan"
    )
    meal_entries = relationship(
        "MealEntry", cascade="all, delete-orphan"
    )
    water_logs = relationship(
        "WaterLog", cascade="all, delete-orphan"
    )
    goal = relationship(
        "UserGoal", uselist=False, cascade="all, delete-orphan"
    )


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(32), nullable=False, default="Обед")

    calories = Column(Float, nullable=False, default=0)
    proteins = Column(Float, nullable=False, default=0)
    fats = Column(Float, nullable=False, default=0)
    carbohydrates = Column(Float, nullable=False, default=0)

    recipe_text_or_link = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)

    owner = relationship("User", back_populates="dishes")


class MealEntry(Base):
    """Запись дневника: что съедено. Хранит СНИМОК КБЖУ на момент добавления."""
    __tablename__ = "meal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    date = Column(Date, nullable=False, index=True)            # день приёма
    meal_type = Column(String(16), nullable=False)             # breakfast/lunch/dinner/snack
    source_type = Column(String(16), nullable=False, default="custom")  # dish/product/custom/photo
    name = Column(String(255), nullable=False)                 # снимок названия

    amount = Column(Float, nullable=False, default=1)          # количество
    unit = Column(String(8), nullable=False, default="g")      # "g" | "serving"

    # Снимок ИТОГОВЫХ КБЖУ за всё количество записи.
    calories = Column(Float, nullable=False, default=0)
    proteins = Column(Float, nullable=False, default=0)
    fats = Column(Float, nullable=False, default=0)
    carbohydrates = Column(Float, nullable=False, default=0)

    # Необязательная ссылка на источник (история не рушится при удалении блюда).
    dish_id = Column(
        Integer, ForeignKey("dishes.id", ondelete="SET NULL"), nullable=True
    )
    image_path = Column(String(255), nullable=True)            # фото (source_type=photo)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class WaterLog(Base):
    """Отметка о выпитой воде (по добавлениям, суммируем за день)."""
    __tablename__ = "water_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    amount_ml = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class UserGoal(Base):
    """Цель КБЖУ + воды и сохранённые параметры калькулятора (по одной на пользователя)."""
    __tablename__ = "user_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    target_calories = Column(Float, nullable=False, default=0)
    target_proteins = Column(Float, nullable=False, default=0)
    target_fats = Column(Float, nullable=False, default=0)
    target_carbohydrates = Column(Float, nullable=False, default=0)
    target_water_ml = Column(Integer, nullable=False, default=2000)

    # Параметры калькулятора (Миффлин — Сан Жеор), необязательные.
    sex = Column(String(8), nullable=True)        # "male" | "female"
    age = Column(Integer, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    activity = Column(Float, nullable=True)        # коэффициент активности

    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
