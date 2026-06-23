"""Эндпоинты блюд: список/создание/удаление, случайный выбор, генерация ИИ."""
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy import func
from sqlalchemy.orm import Session

import ai
import config
import models
import schemas
import storage
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/dishes", tags=["dishes"])


def _get_owned_dish(dish_id: int, user: models.User, db: Session) -> models.Dish:
    dish = (
        db.query(models.Dish)
        .filter(models.Dish.id == dish_id, models.Dish.user_id == user.id)
        .first()
    )
    if dish is None:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")
    return dish


def _decorate(dish: models.Dish, user: models.User) -> models.Dish:
    """Помечает блюдо признаком владельца и именем автора (меню общее)."""
    dish.is_mine = (dish.user_id == user.id)
    dish.author = dish.owner.username if dish.owner else None
    return dish


@router.get("", response_model=list[schemas.DishOut])
def list_dishes(
    category: Optional[str] = None,
    q: Optional[str] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Меню общее для всех пользователей.
    query = db.query(models.Dish)
    if category and category != "Все":
        query = query.filter(models.Dish.category == category)
    dishes = query.order_by(models.Dish.id.desc()).all()

    # Поиск по названию фильтруем в Python — корректная регистронезависимость
    # для кириллицы (SQLite LIKE с не-ASCII не справляется).
    if q and q.strip():
        ql = q.strip().lower()
        dishes = [d for d in dishes if ql in (d.title or "").lower()]

    return [_decorate(d, user) for d in dishes]


@router.get("/random", response_model=schemas.DishOut)
def random_dish(
    category: Optional[str] = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Dish)
    if category and category != "Все":
        query = query.filter(models.Dish.category == category)

    dish = query.order_by(func.random()).first()
    if dish is None:
        raise HTTPException(
            status_code=404, detail="В этой категории пока нет блюд"
        )
    return _decorate(dish, user)


@router.post("", response_model=schemas.DishOut)
async def create_dish(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("Обед"),
    calories: float = Form(0),
    proteins: float = Form(0),
    fats: float = Form(0),
    carbohydrates: float = Form(0),
    recipe_text_or_link: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),  # путь от ранее сгенерированного превью
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if category not in config.CATEGORIES:
        category = "Обед"

    saved_path: Optional[str] = None
    if image is not None and image.filename:
        saved_path = await storage.save_upload(image)
    elif image_path:
        saved_path = storage.adopt_existing(image_path)

    dish = models.Dish(
        user_id=user.id,
        title=title.strip(),
        description=(description or None),
        category=category,
        calories=calories or 0,
        proteins=proteins or 0,
        fats=fats or 0,
        carbohydrates=carbohydrates or 0,
        recipe_text_or_link=(recipe_text_or_link or None),
        image_path=saved_path,
    )
    db.add(dish)
    db.commit()
    db.refresh(dish)
    return _decorate(dish, user)


@router.put("/{dish_id}", response_model=schemas.DishOut)
async def update_dish(
    dish_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("Обед"),
    calories: float = Form(0),
    proteins: float = Form(0),
    fats: float = Form(0),
    carbohydrates: float = Form(0),
    recipe_text_or_link: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    image_path: Optional[str] = Form(None),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dish = _get_owned_dish(dish_id, user, db)
    if category not in config.CATEGORIES:
        category = dish.category

    # Картинку меняем только если прислали новую (файл или сгенерированный путь),
    # иначе оставляем прежнюю.
    new_path: Optional[str] = None
    if image is not None and image.filename:
        new_path = await storage.save_upload(image)
    elif image_path:
        new_path = storage.adopt_existing(image_path)

    if new_path:
        old_path = dish.image_path
        dish.image_path = new_path
        storage.remove_image(old_path)

    dish.title = title.strip()
    dish.description = description or None
    dish.category = category
    dish.calories = calories or 0
    dish.proteins = proteins or 0
    dish.fats = fats or 0
    dish.carbohydrates = carbohydrates or 0
    dish.recipe_text_or_link = recipe_text_or_link or None

    db.commit()
    db.refresh(dish)
    return _decorate(dish, user)


@router.delete("/{dish_id}", response_model=schemas.MessageOut)
def delete_dish(
    dish_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dish = _get_owned_dish(dish_id, user, db)
    storage.remove_image(dish.image_path)
    db.delete(dish)
    db.commit()
    return schemas.MessageOut(ok=True, detail="Блюдо удалено")


@router.post("/{dish_id}/generate-image", response_model=schemas.DishOut)
async def generate_dish_image(
    dish_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dish = _get_owned_dish(dish_id, user, db)
    prompt = ai.build_prompt(dish.title, dish.description)
    try:
        img_bytes, ext = await ai.generate_image_bytes(prompt)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    old_path = dish.image_path
    dish.image_path = storage.save_bytes(img_bytes, ext)
    db.commit()
    db.refresh(dish)

    storage.remove_image(old_path)  # подчищаем прежнюю картинку
    return _decorate(dish, user)


@router.post("/generate-preview", response_model=schemas.GeneratedImageOut)
async def generate_preview(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    user: models.User = Depends(get_current_user),
):
    """Генерация картинки для ещё не сохранённого блюда (экран добавления)."""
    prompt = ai.build_prompt(title.strip(), description)
    try:
        img_bytes, ext = await ai.generate_image_bytes(prompt)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    path = storage.save_bytes(img_bytes, ext)
    return schemas.GeneratedImageOut(image_path=path)
