"""Генерация изображений блюд через Pollinations.ai (бесплатный Flux).

Pollinations принимает промпт прямо в пути GET-запроса и возвращает байты
картинки. API-ключ для бесплатного режима не нужен. При желании поведение
настраивается переменными окружения (все опциональны):
  POLLINATIONS_MODEL  — модель (по умолчанию "flux")
  IMAGE_WIDTH / IMAGE_HEIGHT — размер картинки (по умолчанию 768)
  POLLINATIONS_KEY    — ключ для повышенных лимитов (необязателен)
  POLLINATIONS_BASE   — базовый URL эндпоинта (на случай переезда)
"""
import asyncio
import os
import random
from urllib.parse import quote

import httpx

POLLINATIONS_BASE = os.getenv(
    "POLLINATIONS_BASE", "https://image.pollinations.ai/prompt/"
)
POLLINATIONS_MODEL = os.getenv("POLLINATIONS_MODEL", "flux")
POLLINATIONS_KEY = os.getenv("POLLINATIONS_KEY", "")
IMAGE_WIDTH = int(os.getenv("IMAGE_WIDTH", "768"))
IMAGE_HEIGHT = int(os.getenv("IMAGE_HEIGHT", "768"))


def build_prompt(title: str, description: str | None) -> str:
    """Собирает аппетитный промпт для text-to-image модели."""
    prompt = f"professional food photography of {title}"
    if description:
        prompt += f", {description}"
    prompt += (
        ", beautifully plated, fine dining presentation, dark moody restaurant "
        "lighting, shallow depth of field, ultra detailed, appetizing, 50mm"
    )
    return prompt


def _ext_from_content_type(content_type: str) -> str:
    """Расширение файла по content-type ответа."""
    ct = (content_type or "").lower()
    if "png" in ct:
        return ".png"
    if "webp" in ct:
        return ".webp"
    return ".jpg"  # Pollinations по умолчанию отдаёт JPEG


async def generate_image_bytes(prompt: str) -> tuple[bytes, str]:
    """Запрашивает картинку у Pollinations и возвращает (байты, расширение).

    Кидает RuntimeError с понятным текстом при любой ошибке.
    """
    url = POLLINATIONS_BASE + quote(prompt, safe="")
    params = {
        "model": POLLINATIONS_MODEL,
        "width": IMAGE_WIDTH,
        "height": IMAGE_HEIGHT,
        "nologo": "true",
        # случайный seed — чтобы повторная генерация давала новую картинку
        "seed": random.randint(1, 2_000_000_000),
    }
    if POLLINATIONS_KEY:
        params["key"] = POLLINATIONS_KEY

    last_error = "неизвестная ошибка"
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(180.0), follow_redirects=True
    ) as client:
        for attempt in range(3):
            try:
                resp = await client.get(url, params=params)
            except httpx.RequestError as exc:
                last_error = f"сеть недоступна: {exc}"
                await asyncio.sleep(3)
                continue

            content_type = resp.headers.get("content-type", "")
            if resp.status_code == 200 and content_type.startswith("image"):
                return resp.content, _ext_from_content_type(content_type)

            # Временная перегрузка/лимит — ждём и пробуем снова.
            if resp.status_code in (429, 500, 502, 503, 504):
                last_error = f"сервис перегружен (HTTP {resp.status_code})"
                await asyncio.sleep(5)
                continue

            last_error = (resp.text or "").strip()[:300] or f"HTTP {resp.status_code}"
            break

    raise RuntimeError(f"Не удалось сгенерировать изображение: {last_error}")
