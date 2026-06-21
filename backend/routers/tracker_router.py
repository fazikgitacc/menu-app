"""Эндпоинты трекера питания: дневник (приёмы пищи), вода, цель КБЖУ."""
from datetime import date as date_cls
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/tracker", tags=["tracker"])

MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"]


def _validate_meal(meal_type: str) -> str:
    if meal_type not in MEAL_TYPES:
        raise HTTPException(status_code=400, detail="Неизвестный приём пищи")
    return meal_type


def _owned_entry(entry_id: int, user: models.User, db: Session) -> models.MealEntry:
    entry = (
        db.query(models.MealEntry)
        .filter(models.MealEntry.id == entry_id, models.MealEntry.user_id == user.id)
        .first()
    )
    if entry is None:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return entry


@router.get("/day", response_model=schemas.DiaryDayOut)
def get_day(
    date: date_cls,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(models.MealEntry)
        .filter(models.MealEntry.user_id == user.id, models.MealEntry.date == date)
        .order_by(models.MealEntry.id.asc())
        .all()
    )

    meals = {m: [] for m in MEAL_TYPES}
    tc = tp = tf = tcarb = 0.0
    for e in entries:
        meals.setdefault(e.meal_type, meals["snack"]).append(e)
        tc += e.calories or 0
        tp += e.proteins or 0
        tf += e.fats or 0
        tcarb += e.carbohydrates or 0

    totals = schemas.MacroTotals(
        calories=round(tc, 1), proteins=round(tp, 1),
        fats=round(tf, 1), carbohydrates=round(tcarb, 1),
    )

    water_ml = sum(
        w.amount_ml for w in db.query(models.WaterLog).filter(
            models.WaterLog.user_id == user.id, models.WaterLog.date == date
        ).all()
    )
    water_ml = max(0, water_ml)

    goal = db.query(models.UserGoal).filter(models.UserGoal.user_id == user.id).first()

    return schemas.DiaryDayOut(
        date=date, totals=totals, water_ml=water_ml, goal=goal, meals=meals,
    )


@router.get("/marked", response_model=schemas.MarkedDaysOut)
def marked_days(
    start: date_cls,
    end: date_cls,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Даты в диапазоне [start, end], где есть хотя бы одна запись о еде."""
    rows = (
        db.query(models.MealEntry.date)
        .filter(
            models.MealEntry.user_id == user.id,
            models.MealEntry.date >= start,
            models.MealEntry.date <= end,
        )
        .distinct()
        .all()
    )
    return schemas.MarkedDaysOut(dates=[r[0] for r in rows])


@router.post("/entries", response_model=schemas.MealEntryOut)
def add_entry(
    payload: schemas.MealEntryCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_meal(payload.meal_type)
    entry = models.MealEntry(
        user_id=user.id,
        date=payload.date,
        meal_type=payload.meal_type,
        source_type=payload.source_type or "custom",
        name=payload.name.strip(),
        amount=payload.amount or 1,
        unit=payload.unit or "g",
        calories=payload.calories or 0,
        proteins=payload.proteins or 0,
        fats=payload.fats or 0,
        carbohydrates=payload.carbohydrates or 0,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/entries/from-dish", response_model=schemas.MealEntryOut)
def add_entry_from_dish(
    payload: schemas.EntryFromDish,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_meal(payload.meal_type)
    dish = (
        db.query(models.Dish)
        .filter(models.Dish.id == payload.dish_id, models.Dish.user_id == user.id)
        .first()
    )
    if dish is None:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    servings = payload.servings if payload.servings and payload.servings > 0 else 1
    entry = models.MealEntry(
        user_id=user.id,
        date=payload.date,
        meal_type=payload.meal_type,
        source_type="dish",
        name=dish.title,
        amount=servings,
        unit="serving",
        calories=round((dish.calories or 0) * servings, 1),
        proteins=round((dish.proteins or 0) * servings, 1),
        fats=round((dish.fats or 0) * servings, 1),
        carbohydrates=round((dish.carbohydrates or 0) * servings, 1),
        dish_id=dish.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/entries/{entry_id}", response_model=schemas.MealEntryOut)
def update_entry(
    entry_id: int,
    payload: schemas.MealEntryUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = _owned_entry(entry_id, user, db)
    if payload.meal_type is not None:
        _validate_meal(payload.meal_type)
        entry.meal_type = payload.meal_type
    if payload.name is not None:
        entry.name = payload.name.strip()
    if payload.amount is not None:
        entry.amount = payload.amount
    if payload.unit is not None:
        entry.unit = payload.unit
    if payload.calories is not None:
        entry.calories = payload.calories
    if payload.proteins is not None:
        entry.proteins = payload.proteins
    if payload.fats is not None:
        entry.fats = payload.fats
    if payload.carbohydrates is not None:
        entry.carbohydrates = payload.carbohydrates
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", response_model=schemas.MessageOut)
def delete_entry(
    entry_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = _owned_entry(entry_id, user, db)
    db.delete(entry)
    db.commit()
    return schemas.MessageOut(detail="Запись удалена")


@router.post("/water", response_model=schemas.WaterOut)
def add_water(
    payload: schemas.WaterAdd,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.add(models.WaterLog(
        user_id=user.id, date=payload.date, amount_ml=payload.amount_ml,
    ))
    db.commit()
    total = sum(
        w.amount_ml for w in db.query(models.WaterLog).filter(
            models.WaterLog.user_id == user.id, models.WaterLog.date == payload.date
        ).all()
    )
    return schemas.WaterOut(water_ml=max(0, total))


@router.get("/goal", response_model=Optional[schemas.GoalOut])
def get_goal(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.UserGoal).filter(models.UserGoal.user_id == user.id).first()


@router.put("/goal", response_model=schemas.GoalOut)
def set_goal(
    payload: schemas.GoalIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.UserGoal).filter(models.UserGoal.user_id == user.id).first()
    if goal is None:
        goal = models.UserGoal(user_id=user.id)
        db.add(goal)

    goal.target_calories = payload.target_calories or 0
    goal.target_proteins = payload.target_proteins or 0
    goal.target_fats = payload.target_fats or 0
    goal.target_carbohydrates = payload.target_carbohydrates or 0
    goal.target_water_ml = payload.target_water_ml or 2000
    goal.sex = payload.sex
    goal.age = payload.age
    goal.height_cm = payload.height_cm
    goal.weight_kg = payload.weight_kg
    goal.activity = payload.activity
    goal.mode = payload.mode or "maintenance"

    db.commit()
    db.refresh(goal)
    return goal
