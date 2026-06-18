"""Точка входа FastAPI. Запуск:  cd backend && uvicorn main:app --reload"""
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import config
import models  # noqa: F401  (нужно, чтобы таблицы зарегистрировались)
from database import Base, engine
from routers import auth_router, dishes_router

# Создаём таблицы при старте (для SQLite этого достаточно).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Домашнее меню", version="1.0.0")

# API-роутеры регистрируем ДО монтирования статики на "/".
app.include_router(auth_router.router)
app.include_router(dishes_router.router)

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
