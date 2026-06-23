"""Оценка КБЖУ по фото через бесплатную vision-модель Pollinations (OpenAI-совместимый эндпоинт).

Экспериментально: результат приблизительный, пользователь правит его перед сохранением.
Настройки через переменные окружения (все опциональны):
  POLLINATIONS_TEXT_BASE — эндпоинт (по умолчанию https://text.pollinations.ai/openai)
  VISION_MODEL           — основная vision-модель (по умолчанию "openai")
  VISION_MODEL_FALLBACK  — запасная модель (по умолчанию "openai-large")
  POLLINATIONS_KEY       — токен для повышенных лимитов (необязателен)
  POLLINATIONS_REFERRER  — referrer для атрибуции/лимитов (по умолчанию "domashnee-menu")
"""
import base64
import json
import os
import re

import httpx

TEXT_BASE = os.getenv("POLLINATIONS_TEXT_BASE", "https://text.pollinations.ai/openai")
VISION_MODEL = os.getenv("VISION_MODEL", "openai")
VISION_MODEL_FALLBACK = os.getenv("VISION_MODEL_FALLBACK", "openai-large")
POLLINATIONS_KEY = os.getenv("POLLINATIONS_KEY", "")
REFERRER = os.getenv("POLLINATIONS_REFERRER", "domashnee-menu")
TIMEOUT = 70.0

PROMPT = (
    "Ты — нутрициолог. На фотографии еда. Определи блюдо и оцени его КБЖУ для ВСЕЙ "
    "видимой порции. Даже если не уверен — предположи наиболее вероятное блюдо и дай "
    "числовую оценку, НЕ возвращай нули для явной еды. "
    "Ответь СТРОГО одним JSON-объектом, без markdown и пояснений, поля: "
    "name (строка, название блюда по-русски), calories, proteins, fats, carbohydrates "
    "(числа на всю порцию: ккал и граммы), confidence ('low'|'medium'|'high'). "
    "Верни name=\"\" и нули ТОЛЬКО если на фото точно нет никакой еды."
)


def _num(value) -> float:
    try:
        return max(0.0, round(float(value), 1))
    except (TypeError, ValueError):
        return 0.0


def _parse(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("пустой ответ модели")
    match = re.search(r"\{.*\}", text, re.S)
    obj = json.loads(match.group(0) if match else text)
    conf = str(obj.get("confidence") or "low").strip().lower()
    if conf not in ("low", "medium", "high"):
        conf = "low"
    return {
        "name": str(obj.get("name") or "").strip(),
        "calories": _num(obj.get("calories")),
        "proteins": _num(obj.get("proteins")),
        "fats": _num(obj.get("fats")),
        "carbohydrates": _num(obj.get("carbohydrates")),
        "confidence": conf,
    }


def _has_food(est: dict) -> bool:
    return bool(est.get("name")) or any(
        [est.get("calories"), est.get("proteins"), est.get("fats"), est.get("carbohydrates")]
    )


async def _call_model(client: httpx.AsyncClient, model: str, data_url: str) -> dict:
    payload = {
        "model": model,
        "referrer": REFERRER,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }],
        "max_tokens": 500,
    }
    headers = {"Content-Type": "application/json"}
    if POLLINATIONS_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_KEY}"

    resp = await client.post(TEXT_BASE, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()

    try:
        message = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        message = ""
    if isinstance(message, list):
        message = "".join(p.get("text", "") for p in message if isinstance(p, dict))
    return _parse(message or "")


async def estimate_food_from_image(image_bytes: bytes, mime: str = "image/jpeg") -> dict:
    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Основная модель.
        try:
            est = await _call_model(client, VISION_MODEL, data_url)
            if _has_food(est):
                return est
        except Exception:
            est = None

        # Запасная модель (сильнее в vision) — если первая ничего не дала.
        if VISION_MODEL_FALLBACK and VISION_MODEL_FALLBACK != VISION_MODEL:
            fb = await _call_model(client, VISION_MODEL_FALLBACK, data_url)
            return fb

        if est is None:
            raise RuntimeError("vision call failed")
        return est
