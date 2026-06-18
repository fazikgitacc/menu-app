"""Утилиты хранения изображений на диске (с защитой от path traversal)."""
import os
import uuid

from fastapi import HTTPException, UploadFile

import config

URL_PREFIX = "/static/images/"


def _safe_disk_path(image_url: str | None) -> str | None:
    """URL вида /static/images/<file> -> абсолютный путь внутри IMAGES_DIR."""
    if not image_url or not image_url.startswith(URL_PREFIX):
        return None
    filename = os.path.basename(image_url)  # отрезает любые ../
    candidate = os.path.abspath(os.path.join(config.IMAGES_DIR, filename))
    images_root = os.path.abspath(config.IMAGES_DIR)
    if os.path.commonpath([candidate, images_root]) != images_root:
        return None
    return candidate


async def save_upload(image: UploadFile) -> str:
    """Сохраняет загруженный файл, возвращает публичный URL /static/images/..."""
    ext = os.path.splitext(image.filename or "")[1].lower()
    if ext not in config.ALLOWED_IMAGE_EXT:
        ext = ".png"

    data = await image.read()
    if len(data) > config.MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"Файл больше {config.MAX_IMAGE_MB} МБ",
        )

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(config.IMAGES_DIR, filename)
    with open(dest, "wb") as f:
        f.write(data)
    return f"{URL_PREFIX}{filename}"


def save_bytes(data: bytes, ext: str = ".png") -> str:
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(config.IMAGES_DIR, filename)
    with open(dest, "wb") as f:
        f.write(data)
    return f"{URL_PREFIX}{filename}"


def adopt_existing(image_url: str | None) -> str | None:
    """Проверяет, что переданный путь указывает на реально существующий файл."""
    disk = _safe_disk_path(image_url)
    if disk and os.path.isfile(disk):
        return f"{URL_PREFIX}{os.path.basename(disk)}"
    return None


def remove_image(image_url: str | None) -> None:
    """Удаляет файл картинки с диска (молча игнорирует отсутствие)."""
    disk = _safe_disk_path(image_url)
    if disk and os.path.isfile(disk):
        try:
            os.remove(disk)
        except OSError:
            pass
