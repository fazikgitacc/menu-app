"""Pydantic-схемы (v2) для валидации и сериализации."""
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=4, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class DishOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    calories: float
    proteins: float
    fats: float
    carbohydrates: float
    recipe_text_or_link: Optional[str] = None
    image_path: Optional[str] = None

    model_config = {"from_attributes": True}


class GeneratedImageOut(BaseModel):
    image_path: str


class MessageOut(BaseModel):
    ok: bool = True
    detail: Optional[str] = None
