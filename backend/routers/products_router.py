"""Эндпоинты продуктов: поиск в OFF, штрих-код (с кэшем) и личный каталог «Продукты»."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import off
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/products", tags=["products"])


# ----------------------------- Поиск в OFF --------------------------------

@router.get("/search", response_model=list[schemas.OffProduct])
async def search_products(
    q: str,
    user: models.User = Depends(get_current_user),
):
    query = (q or "").strip()
    if len(query) < 2:
        return []
    try:
        return await off.search(query, limit=20)
    except Exception:
        raise HTTPException(status_code=502, detail="Open Food Facts недоступен")


@router.get("/barcode/{code}", response_model=schemas.OffProduct)
async def product_by_barcode(
    code: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = (code or "").strip()
    if not code.isdigit():
        raise HTTPException(status_code=400, detail="Некорректный штрих-код")

    cached = db.query(models.FoodCache).filter(models.FoodCache.barcode == code).first()
    if cached:
        return schemas.OffProduct(
            barcode=cached.barcode, name=cached.name, brand=cached.brand,
            calories=cached.calories, proteins=cached.proteins, fats=cached.fats,
            carbohydrates=cached.carbohydrates, serving_size_g=cached.serving_size_g,
            image_url=cached.image_url,
        )

    try:
        product = await off.by_barcode(code)
    except Exception:
        raise HTTPException(status_code=502, detail="Open Food Facts недоступен")
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не найден")

    db.add(models.FoodCache(
        barcode=code, name=product["name"], brand=product.get("brand"),
        calories=product["calories"], proteins=product["proteins"],
        fats=product["fats"], carbohydrates=product["carbohydrates"],
        serving_size_g=product.get("serving_size_g"), image_url=product.get("image_url"),
    ))
    db.commit()
    return product


# --------------------------- Личный каталог -------------------------------

@router.get("", response_model=list[schemas.ProductOut])
def list_products(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.UserProduct)
        .filter(models.UserProduct.user_id == user.id)
        .order_by(models.UserProduct.last_used_at.desc())
        .all()
    )


@router.post("", response_model=schemas.ProductOut)
def save_product(
    payload: schemas.ProductSave,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prod = None
    if payload.barcode:
        prod = (
            db.query(models.UserProduct)
            .filter(
                models.UserProduct.user_id == user.id,
                models.UserProduct.barcode == payload.barcode,
            )
            .first()
        )
    if prod is None:
        prod = models.UserProduct(user_id=user.id, barcode=payload.barcode or None)
        db.add(prod)

    prod.name = payload.name.strip()
    prod.brand = payload.brand
    prod.calories = payload.calories
    prod.proteins = payload.proteins
    prod.fats = payload.fats
    prod.carbohydrates = payload.carbohydrates
    prod.serving_size_g = payload.serving_size_g
    prod.image_url = payload.image_url
    prod.last_used_at = datetime.utcnow()
    db.commit()
    db.refresh(prod)
    return prod


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductSave,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prod = (
        db.query(models.UserProduct)
        .filter(models.UserProduct.id == product_id, models.UserProduct.user_id == user.id)
        .first()
    )
    if prod is None:
        raise HTTPException(status_code=404, detail="Продукт не найден")

    prod.name = payload.name.strip()
    prod.brand = payload.brand
    prod.calories = payload.calories
    prod.proteins = payload.proteins
    prod.fats = payload.fats
    prod.carbohydrates = payload.carbohydrates
    prod.serving_size_g = payload.serving_size_g
    if payload.barcode is not None:
        prod.barcode = payload.barcode or None
    db.commit()
    db.refresh(prod)
    return prod


@router.delete("/{product_id}", response_model=schemas.MessageOut)
def delete_product(
    product_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prod = (
        db.query(models.UserProduct)
        .filter(models.UserProduct.id == product_id, models.UserProduct.user_id == user.id)
        .first()
    )
    if prod is None:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    db.delete(prod)
    db.commit()
    return schemas.MessageOut(detail="Продукт удалён")
