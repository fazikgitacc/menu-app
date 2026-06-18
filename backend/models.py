"""Модели данных. Поля заложены в т.ч. под будущий трекер питания."""
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
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
