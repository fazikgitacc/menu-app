"""Оценка КБЖУ по фото через бесплатную vision-модель Pollinations (OpenAI-совместимый эндпоинт).

Экспериментально: результат приблизительный, пользователь правит его перед сохранением.
Настройки через переменные окружения (все опциональны):
  POLLINATIONS_TEXT_BASE — эндпоинт (по умолчанию https://text.pollinations.ai/openai)
  VISION_MODEL           — модель (по умолчанию "openai", vision-совместимая)
  POLLINATIONS_KEY       — токен для повышенных лимитов (необязателен)
"""
import base64
import json
import os
import re

import httpx

TEXT_BASE = os.getenv("POLLINATIONS_TEXT_BASE", "https://text.pollinations.ai/openai")
VISION_MODEL = os.getenv("VISION_MODEL", "openai")
POLLINATIONS_KEY = os.getenv("POLLINATIONS_KEY", "")
TIMEOUT = 70.0

PROMPT = (
    "На фото — порция еды. Определи блюдо и оцени его КБЖУ для ВСЕЙ видимой порции. "
    "Ответь СТРОГО одним JSON-объектом, без markdown и пояснений, с полями: "
    "name (строка, название по-русски), calories, proteins, fats, carbohydrates "
    "(числа на всю порцию: ккал и граммы), confidence ('low'|'medium'|'high'). "
    'Если на фото не еда — верни '
    '{"name":"","calories":0,"proteins":0,"fats":0,"carbohydrates":0,"confidence":"low"}.'
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


async def estimate_food_from_image(image_bytes: bytes, mime: str = "image/jpeg") -> dict:
    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    payload = {
        "model": VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": PROMPT},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }],
        "max_tokens": 400,
        "private": True,
    }
    headers = {"Content-Type": "application/json"}
    if POLLINATIONS_KEY:
        headers["Authorization"] = f"Bearer {POLLINATIONS_KEY}"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(TEXT_BASE, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    try:
        message = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        message = ""
    if isinstance(message, list):
        message = "".join(
            part.get("text", "") for part in message if isinstance(part, dict)
        )
    return _parse(message or "")
