"""Эндпоинты авторизации. JWT кладётся в httpOnly-cookie (удобно для PWA)."""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import auth
import config
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_cookie(response: Response, user_id: int) -> None:
    token = auth.create_access_token(user_id)
    response.set_cookie(
        key=config.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite="lax",
        max_age=config.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/",
    )


@router.post("/register", response_model=schemas.UserOut)
def register(
    data: schemas.UserCreate, response: Response, db: Session = Depends(get_db)
):
    username = data.username.strip()
    exists = db.query(models.User).filter(models.User.username == username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")

    user = models.User(
        username=username, password_hash=auth.hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _set_cookie(response, user.id)
    return user


@router.post("/login", response_model=schemas.UserOut)
def login(
    data: schemas.UserCreate, response: Response, db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.username == data.username.strip())
        .first()
    )
    if user is None or not auth.verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    _set_cookie(response, user.id)
    return user


@router.post("/logout", response_model=schemas.MessageOut)
def logout(response: Response):
    response.delete_cookie(config.COOKIE_NAME, path="/")
    return schemas.MessageOut(ok=True, detail="Вы вышли")


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
