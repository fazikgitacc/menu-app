"""Конфигурация приложения: загрузка переменных окружения и базовые пути."""
import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# .env лежит рядом с backend/ — грузим его в первую очередь.
load_dotenv(os.path.join(BASE_DIR, ".env"))

# --- Пути файловой системы ---
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGES_DIR = os.path.join(STATIC_DIR, "images")
FRONTEND_DIR = os.getenv(
    "FRONTEND_DIR",
    os.path.abspath(os.path.join(BASE_DIR, "..", "frontend")),
)
os.makedirs(IMAGES_DIR, exist_ok=True)

# --- База данных ---
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'menu.db')}")

# --- Авторизация / cookie ---
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))
COOKIE_NAME = os.getenv("COOKIE_NAME", "access_token")
# В проде (HTTPS) выставить COOKIE_SECURE=true
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# --- Генерация картинок: Pollinations.ai (Flux), бесплатно, без ключа ---
POLLINATIONS_BASE = os.getenv("POLLINATIONS_BASE", "https://image.pollinations.ai/prompt")
IMAGE_MODEL = os.getenv("IMAGE_MODEL", "flux")
IMAGE_WIDTH = int(os.getenv("IMAGE_WIDTH", "768"))
IMAGE_HEIGHT = int(os.getenv("IMAGE_HEIGHT", "768"))
IMAGE_TIMEOUT = float(os.getenv("IMAGE_TIMEOUT", "150"))
# Необязательный ключ Pollinations (pk_/sk_) для повышенных лимитов; для базовой работы не нужен.
POLLINATIONS_TOKEN = os.getenv("POLLINATIONS_TOKEN", "")

# --- Загрузка файлов ---
MAX_IMAGE_MB = int(os.getenv("MAX_IMAGE_MB", "10"))
ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Разрешённые категории блюд
CATEGORIES = ["Завтрак", "Обед", "Ужин", "Перекус", "Напитки"]
