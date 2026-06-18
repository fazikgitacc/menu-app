"""Генерация изображений блюд через Hugging Face Inference API."""
import asyncio

import httpx

import config


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


async def generate_image_bytes(prompt: str) -> bytes:
    """Делает запрос к HF и возвращает байты PNG/JPEG.

    Кидает RuntimeError с понятным текстом при любой ошибке.
    """
    if not config.HF_API_TOKEN:
        raise RuntimeError(
            "HF_API_TOKEN не задан. Укажите токен Hugging Face в .env."
        )

    headers = {
        "Authorization": f"Bearer {config.HF_API_TOKEN}",
        "Accept": "image/png",
    }
    payload = {"inputs": prompt, "options": {"wait_for_model": True}}

    last_error = "неизвестная ошибка"
    async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
        for attempt in range(4):
            try:
                resp = await client.post(config.HF_API_URL, headers=headers, json=payload)
            except httpx.RequestError as exc:
                last_error = f"сеть недоступна: {exc}"
                await asyncio.sleep(3)
                continue

            content_type = resp.headers.get("content-type", "")
            if resp.status_code == 200 and content_type.startswith("image"):
                return resp.content

            # 503 — модель ещё прогревается на стороне HF, ждём и пробуем снова.
            if resp.status_code == 503:
                last_error = "модель прогревается на стороне Hugging Face"
                await asyncio.sleep(8)
                continue

            try:
                last_error = resp.json().get("error", resp.text)
            except Exception:
                last_error = resp.text[:300]
            break

    raise RuntimeError(f"Не удалось сгенерировать изображение: {last_error}")
