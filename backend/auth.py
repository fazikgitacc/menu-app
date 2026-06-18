"""Авторизация: хэширование паролей (Passlib/Bcrypt) и JWT в httpOnly-cookie."""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import config
import models
from database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # Bcrypt ограничен 72 байтами — обрезаем заранее, чтобы избежать ошибок.
    return pwd_context.hash(password[:72])


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password[:72], password_hash)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=config.ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.JWT_ALGORITHM)


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> models.User:
    token = request.cookies.get(config.COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Требуется авторизация"
        )
    try:
        payload = jwt.decode(
            token, config.SECRET_KEY, algorithms=[config.JWT_ALGORITHM]
        )
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительная сессия"
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден"
        )
    return user
