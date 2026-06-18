# Домашнее меню — PWA-приложение

Личное домашнее меню блюд с подсчётом КБЖУ, загрузкой и ИИ-генерацией изображений.
Тёмная премиум-тема, mobile-first, поддержка установки на «Домой» (PWA) в iOS/Android.

**Стек:** FastAPI · SQLAlchemy · SQLite · Vanilla JS SPA · Tailwind (CDN) · Hugging Face API.

---

## Структура проекта

```
menu-app/
├── backend/
│   ├── main.py                 # точка входа FastAPI, монтирование статики/фронтенда
│   ├── config.py               # переменные окружения и пути
│   ├── database.py             # движок и сессии SQLAlchemy
│   ├── models.py               # модели User, Dish
│   ├── schemas.py              # Pydantic-схемы
│   ├── auth.py                 # хэширование паролей (bcrypt) + JWT в httpOnly-cookie
│   ├── ai.py                   # клиент Hugging Face (text-to-image)
│   ├── storage.py              # сохранение/удаление картинок (с защитой путей)
│   ├── routers/
│   │   ├── auth_router.py      # /api/auth/register|login|logout|me
│   │   └── dishes_router.py    # /api/dishes ... CRUD, random, генерация
│   ├── requirements.txt
│   ├── .env.example
│   └── static/images/          # сюда сохраняются изображения (UUID-имена)
├── frontend/
│   ├── index.html              # оболочка SPA + PWA-мета
│   ├── app.js                  # вся логика интерфейса
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/                  # icon-180/192/512 + maskable
└── deploy/
    ├── nginx.conf.example
    └── menu-app.service
```

---

## API

| Метод  | Путь                               | Назначение                               |
|--------|------------------------------------|------------------------------------------|
| POST   | `/api/auth/register`               | Регистрация (ставит cookie)              |
| POST   | `/api/auth/login`                  | Вход                                     |
| POST   | `/api/auth/logout`                 | Выход                                    |
| GET    | `/api/auth/me`                     | Текущий пользователь                     |
| GET    | `/api/dishes?category=`            | Список блюд (фильтр по категории)         |
| GET    | `/api/dishes/random?category=`     | Случайное блюдо                          |
| POST   | `/api/dishes`                      | Добавить блюдо (`multipart/form-data`)   |
| DELETE | `/api/dishes/{id}`                 | Удалить блюдо + файл картинки            |
| POST   | `/api/dishes/{id}/generate-image`  | Сгенерировать картинку для блюда (ИИ)     |
| POST   | `/api/dishes/generate-preview`     | Предпросмотр генерации для нового блюда   |

Документация Swagger доступна на `/docs`.

---

## Локальный запуск

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# откройте .env и задайте как минимум:
#   SECRET_KEY  — длинная случайная строка (openssl rand -hex 32)
#   HF_API_TOKEN — токен с https://huggingface.co/settings/tokens

uvicorn main:app --reload
```

Откройте **http://localhost:8000** — фронтенд раздаётся самим FastAPI.
При первом входе нажмите «Регистрация», создайте логин/пароль.

> Генерация изображений работает только при заданном `HF_API_TOKEN`.
> Всё остальное (добавление блюд, загрузка фото из галереи, КБЖУ, случайный
> выбор) работает и без токена.

### Переменные окружения

| Переменная               | По умолчанию                                   | Описание                                   |
|--------------------------|------------------------------------------------|--------------------------------------------|
| `SECRET_KEY`             | dev-ключ (заменить!)                           | Подпись JWT                                |
| `HF_API_TOKEN`           | —                                              | Токен Hugging Face для генерации картинок   |
| `HF_MODEL`               | `stabilityai/stable-diffusion-xl-base-1.0`     | Модель text-to-image                       |
| `HF_API_URL`             | собирается из `HF_MODEL`                        | Полный URL инференса (если нужен другой)    |
| `COOKIE_SECURE`          | `false`                                        | В проде под HTTPS → `true`                  |
| `ACCESS_TOKEN_EXPIRE_DAYS` | `30`                                         | Срок жизни сессии                          |
| `DATABASE_URL`           | `sqlite:///backend/menu.db`                     | Строка подключения к БД                    |
| `MAX_IMAGE_MB`           | `10`                                           | Лимит размера загружаемого файла           |

---

## Деплой на VPS (Ubuntu + Nginx)

```bash
# 1. Код на сервер
sudo mkdir -p /var/www/menu-app
sudo rsync -a ./ /var/www/menu-app/        # из папки проекта

# 2. Зависимости
cd /var/www/menu-app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env && nano .env          # SECRET_KEY, HF_API_TOKEN, COOKIE_SECURE=true

# 3. Права на папку с картинками и БД
sudo chown -R www-data:www-data /var/www/menu-app/backend

# 4. systemd-сервис
sudo cp /var/www/menu-app/deploy/menu-app.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now menu-app

# 5. Nginx
sudo cp /var/www/menu-app/deploy/nginx.conf.example /etc/nginx/sites-available/menu-app
# отредактируйте server_name и root, затем:
sudo ln -s /etc/nginx/sites-available/menu-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. HTTPS (обязательно для PWA/cookie на iOS)
sudo certbot --nginx -d menu.example.com
# после этого в backend/.env: COOKIE_SECURE=true ; sudo systemctl restart menu-app
```

### Установка как приложение (PWA)
- **iOS Safari:** «Поделиться» → «На экран „Домой“».
- **Android Chrome:** меню → «Установить приложение».

PWA и cookie-сессии требуют **HTTPS** (исключение — `localhost` при разработке).

---

## Заметки по архитектуре

- **Авторизация** через JWT в `httpOnly`-cookie (`SameSite=Lax`) — это надёжнее
  для PWA на iOS, чем токен в localStorage.
- **Изображения** хранятся в `backend/static/images/` с UUID-именами; при удалении
  блюда и при перегенерации старый файл удаляется с диска.
- **Генерация на экране добавления** использует `generate-preview`: картинка
  создаётся заранее и «прикрепляется» к блюду при сохранении. Если блюдо не
  сохранили — файл превью останется неиспользованным (можно периодически чистить).
- **Tailwind через CDN** (Play CDN) подключён по ТЗ. Для продакшена при желании
  можно собрать статический CSS, но это не требуется для работы.
- Модель `stable-diffusion-xl-base-1.0` на бесплатном инференсе HF может быть
  недоступна/медленной. Если генерация отдаёт ошибку — поменяйте `HF_MODEL`
  или укажите `HF_API_URL` на доступный эндпоинт/провайдера в `.env`.
