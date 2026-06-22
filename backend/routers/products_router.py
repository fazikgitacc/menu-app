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

@router.get("/search", response_model=list[schemas.ProductSearchItem])
async def search_products(
    q: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (q or "").strip()
    if len(query) < 2:
        return []
    ql = query.lower()

    # 1) Личный каталог. Фильтруем в Python — корректная регистронезависимость
    #    для кириллицы (SQLite LIKE/lower() с не-ASCII не справляется).
    catalog = (
        db.query(models.UserProduct)
        .filter(models.UserProduct.user_id == user.id)
        .order_by(models.UserProduct.last_used_at.desc())
        .all()
    )
    local = [
        p for p in catalog
        if ql in (p.name or "").lower() or ql in (p.brand or "").lower()
    ][:20]

    items: list[schemas.ProductSearchItem] = [
        schemas.ProductSearchItem(
            source="catalog", id=p.id, barcode=p.barcode, name=p.name, brand=p.brand,
            calories=p.calories, proteins=p.proteins, fats=p.fats,
            carbohydrates=p.carbohydrates, serving_size_g=p.serving_size_g,
            image_url=p.image_url,
        )
        for p in local
    ]
    seen_barcodes = {p.barcode for p in local if p.barcode}
    seen_names = {(p.name or "").strip().lower() for p in local}

    # 2) OFF. Если недоступен — не валим поиск, отдаём хотя бы локальные.
    try:
        off_results = await off.search(query, limit=20)
    except Exception:
        off_results = []

    for r in off_results:
        bc = r.get("barcode")
        nm = (r.get("name") or "").strip().lower()
        if (bc and bc in seen_barcodes) or nm in seen_names:
            continue
        seen_names.add(nm)
        if bc:
            seen_barcodes.add(bc)
        items.append(schemas.ProductSearchItem(
            source="off", barcode=bc, name=r["name"], brand=r.get("brand"),
            calories=r["calories"], proteins=r["proteins"], fats=r["fats"],
            carbohydrates=r["carbohydrates"], serving_size_g=r.get("serving_size_g"),
            image_url=r.get("image_url"),
        ))
    return items


@router.get("/barcode/{code}", response_model=schemas.ProductSearchItem)
async def product_by_barcode(
    code: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = (code or "").strip()
    if not code.isdigit():
        raise HTTPException(status_code=400, detail="Некорректный штрих-код")

    # 1) Личный каталог — мгновенно и с правками пользователя.
    mine = (
        db.query(models.UserProduct)
        .filter(models.UserProduct.user_id == user.id, models.UserProduct.barcode == code)
        .first()
    )
    if mine:
        return schemas.ProductSearchItem(
            source="catalog", id=mine.id, barcode=mine.barcode, name=mine.name, brand=mine.brand,
            calories=mine.calories, proteins=mine.proteins, fats=mine.fats,
            carbohydrates=mine.carbohydrates, serving_size_g=mine.serving_size_g,
            image_url=mine.image_url,
        )

    # 2) Общий кэш OFF.
    cached = db.query(models.FoodCache).filter(models.FoodCache.barcode == code).first()
    if cached:
        return schemas.ProductSearchItem(
            source="off", barcode=cached.barcode, name=cached.name, brand=cached.brand,
            calories=cached.calories, proteins=cached.proteins, fats=cached.fats,
            carbohydrates=cached.carbohydrates, serving_size_g=cached.serving_size_g,
            image_url=cached.image_url,
        )

    # 3) Запрос в OFF + запись в кэш.
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
    return schemas.ProductSearchItem(
        source="off", barcode=product.get("barcode"), name=product["name"], brand=product.get("brand"),
        calories=product["calories"], proteins=product["proteins"], fats=product["fats"],
        carbohydrates=product["carbohydrates"], serving_size_g=product.get("serving_size_g"),
        image_url=product.get("image_url"),
    )


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
