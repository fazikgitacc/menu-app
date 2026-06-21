"""Pydantic-схемы (v2) для валидации и сериализации."""
from datetime import date as date_cls
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


# ----------------------------- Трекер питания -----------------------------

class MacroTotals(BaseModel):
    calories: float = 0
    proteins: float = 0
    fats: float = 0
    carbohydrates: float = 0


class MealEntryOut(BaseModel):
    id: int
    date: date_cls
    meal_type: str
    source_type: str
    name: str
    amount: float
    unit: str
    calories: float
    proteins: float
    fats: float
    carbohydrates: float
    dish_id: Optional[int] = None
    image_path: Optional[str] = None

    model_config = {"from_attributes": True}


class MealEntryCreate(BaseModel):
    date: date_cls
    meal_type: str
    name: str = Field(min_length=1, max_length=255)
    amount: float = 1
    unit: str = "g"
    calories: float = 0
    proteins: float = 0
    fats: float = 0
    carbohydrates: float = 0
    source_type: str = "custom"


class MealEntryUpdate(BaseModel):
    meal_type: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = None
    unit: Optional[str] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbohydrates: Optional[float] = None


class EntryFromDish(BaseModel):
    date: date_cls
    meal_type: str
    dish_id: int
    servings: float = 1


class WaterAdd(BaseModel):
    date: date_cls
    amount_ml: int


class WaterOut(BaseModel):
    water_ml: int


class GoalIn(BaseModel):
    target_calories: float = 0
    target_proteins: float = 0
    target_fats: float = 0
    target_carbohydrates: float = 0
    target_water_ml: int = 2000
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity: Optional[float] = None
    mode: Optional[str] = "maintenance"


class GoalOut(GoalIn):
    model_config = {"from_attributes": True}


class DiaryDayOut(BaseModel):
    date: date_cls
    totals: MacroTotals
    water_ml: int
    goal: Optional[GoalOut] = None
    meals: dict[str, list[MealEntryOut]]


class MarkedDaysOut(BaseModel):
    dates: list[date_cls]
