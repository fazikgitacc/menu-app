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

# --- Hugging Face (text-to-image) ---
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
# Можно полностью переопределить URL инференса (напр. router.huggingface.co/...).
HF_API_URL = os.getenv("HF_API_URL", "") or f"https://api-inference.huggingface.co/models/{HF_MODEL}"

# --- Загрузка файлов ---
MAX_IMAGE_MB = int(os.getenv("MAX_IMAGE_MB", "10"))
ALLOWED_IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

# Разрешённые категории блюд
CATEGORIES = ["Завтрак", "Обед", "Ужин", "Перекус", "Напитки"]
