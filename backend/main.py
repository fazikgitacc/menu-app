"""Точка входа FastAPI. Запуск:  cd backend && alembic upgrade head && uvicorn main:app --reload"""
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import config
from routers import auth_router, dishes_router, tracker_router, products_router

# Схема БД управляется Alembic (`alembic upgrade head`), а не create_all.
app = FastAPI(title="Домашнее меню", version="1.1.0")

# API-роутеры регистрируем ДО монтирования статики на "/".
app.include_router(auth_router.router)
app.include_router(dishes_router.router)
app.include_router(tracker_router.router)
app.include_router(products_router.router)

@app.get("/healthz", include_in_schema=False)
def healthz():
    return {"status": "ok"}


# Загруженные/сгенерированные изображения.
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")

# Раздаём фронтенд (SPA + PWA-файлы) самим FastAPI — приложение самодостаточно.
# В проде статику обычно отдаёт Nginx, но этот mount не мешает (см. README).
# Монтируем "/" ПОСЛЕДНИМ — это catch-all, он должен стоять после всех маршрутов.
if os.path.isdir(config.FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=config.FRONTEND_DIR, html=True), name="frontend")
