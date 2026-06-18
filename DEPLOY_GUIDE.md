# Деплой «Домашнего меню» отдельным сайтом на :8000 (рядом с декоем) через Git

Декой-сайт на портах 80/443 остаётся нетронутым — он работает как маскировка.
«Меню» поднимается **отдельным nginx-сайтом на порту 8000 по HTTPS** и доступно
по адресу `https://menu.example.com:8000`. Деплой и обновления — через **Git**.

> **Допущения (поправьте под себя):**
> - VPS на **Ubuntu/Debian**, веб-сервер **Nginx**, доступ по **SSH** с **sudo**.
> - Декой уже слушает 80/443 — **его не трогаем**.
> - Домен (напр. `menu.example.com`) указывает на этот VPS — **нужен для валидного TLS**
>   (без домена PWA не установится; вариант с IP/самоподписанным — в конце).
> - Ставим в **`/var/www/menu-app`**, сервис запускаем под **вашим пользователем**
>   (`deploy_user`) — так `git pull` и запись БД/картинок работают без возни с правами.
> - Снаружи на 8000 слушает **nginx**, поэтому **uvicorn внутри переезжает на 8001**.
>
> **Плейсхолдеры — заменить везде:** `menu.example.com` (домен), `SERVER_IP` (IP VPS),
> `deploy_user` (ваш SSH-логин), `USER/menu-app` (ваш репозиторий).

---

## Как это устроено (схема портов)

```
Браузер ──▶ :80 / :443  ──▶  nginx (ДЕКОЙ)              ← как было, не трогаем
Браузер ──▶ :8000 (HTTPS)──▶  nginx (сайт «menu-8000»)
                                 ├─ /            → статика /var/www/menu-app/frontend
                                 ├─ /api/        → 127.0.0.1:8001 (uvicorn)
                                 └─ /static/     → 127.0.0.1:8001 (uvicorn)
```

Реальное приложение открывается только по `https://menu.example.com:8000`.
Кто не знает порт — видит декой на стандартном адресе.

---

## Карта действий

1. Разведка: свободен ли порт 8000, есть ли уже TLS-сертификат
2. Бэкап конфигов nginx (страховка)
3. Git: подготовка репозитория **локально** и push на GitHub/GitLab
4. Git: клонирование на VPS (public — просто; private — через deploy key)
5. Системные зависимости
6. Настройка приложения: venv, зависимости, `.env`, секреты, права
7. systemd-сервис на порту **8001**
8. TLS-сертификат (переиспользуем декоев или получаем, не трогая декой)
9. Nginx: **добавляем** сайт на 8000 (декой остаётся)
10. Firewall: открыть порт 8000
11. Проверка (в т.ч. установка PWA)
12. Обновление приложения через `git pull`
13. Откат / удаление сайта-меню
14. Обслуживание: бэкапы, перенос существующих данных, логи

---

## Шаг 1. Разведка

```bash
ssh deploy_user@SERVER_IP

# Порт 8000 должен быть свободен (его займёт наш nginx):
sudo ss -tlnp | grep ':8000' || echo "8000 свободен"
# Порт 8001 тоже (его займёт uvicorn):
sudo ss -tlnp | grep ':8001' || echo "8001 свободен"

# Что слушает 80/443 (это декой — не трогаем):
sudo ss -tlnp | grep -E ':80|:443'

# Уже есть TLS-сертификат для домена? (если декой на HTTPS — скорее всего да)
sudo ls -d /etc/letsencrypt/live/*/ 2>/dev/null || echo "сертификатов certbot нет"

python3 --version    # нужен 3.10+
```

Запомните: есть ли уже `/etc/letsencrypt/live/menu.example.com/` — от этого зависит шаг 8.

---

## Шаг 2. Бэкап конфигов nginx

Мы декой не меняем, но страховка перед правками конфигурации не повредит:

```bash
TS=$(date +%Y%m%d-%H%M%S)
sudo mkdir -p /root/backups
sudo tar czf /root/backups/nginx-$TS.tar.gz /etc/nginx
ls -lh /root/backups/
```

---

## Шаг 3. Git: подготовка репозитория (локально)

Делается **на вашем компьютере**, в папке с проектом `menu-app/` (там уже лежит `.gitignore`,
который исключает `.env`, `menu.db`, `.venv` и загруженные картинки — секреты и данные в репозиторий не попадут).

```bash
cd path/to/menu-app

git init
git add .
git status        # ПРОВЕРЬТЕ: .env, menu.db, .venv НЕ должны быть в списке
git commit -m "Initial commit: Домашнее меню (PWA)"
git branch -M main
```

Создайте **пустой** репозиторий на GitHub/GitLab (без README/лицензии, иначе будет конфликт),
затем подключите remote и запушьте:

```bash
# SSH (рекомендуется):
git remote add origin git@github.com:USER/menu-app.git
# или HTTPS:
# git remote add origin https://github.com/USER/menu-app.git

git push -u origin main
```

> **Репозиторий лучше сделать приватным** — это исходники вашего личного сайта.
> Для приватного на сервере понадобится deploy key (шаг 4, вариант Б).

---

## Шаг 4. Git: клонирование на VPS

### Вариант А — публичный репозиторий (проще всего)

```bash
ssh deploy_user@SERVER_IP
sudo mkdir -p /var/www/menu-app
sudo chown deploy_user:deploy_user /var/www/menu-app
git clone https://github.com/USER/menu-app.git /var/www/menu-app
```

### Вариант Б — приватный репозиторий через deploy key (read-only)

На VPS под `deploy_user` генерируем отдельный ключ только для этого репозитория:

```bash
ssh-keygen -t ed25519 -C "menu-deploy@vps" -f ~/.ssh/menu_deploy -N ""
cat ~/.ssh/menu_deploy.pub
```

Скопируйте вывод и добавьте его в репозиторий:
**GitHub:** репозиторий → Settings → Deploy keys → Add deploy key (галку «write» НЕ ставим).
**GitLab:** Settings → Repository → Deploy keys.

Скажем ssh использовать этот ключ для клонирования:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-menu
    HostName github.com
    User git
    IdentityFile ~/.ssh/menu_deploy
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config

# первый коннект — подтвердить отпечаток:
ssh -T git@github-menu     # ожидаем "Hi USER/menu-app! You've successfully authenticated"
```

Клонируем через этот алиас хоста:

```bash
sudo mkdir -p /var/www/menu-app
sudo chown deploy_user:deploy_user /var/www/menu-app
git clone git@github-menu:USER/menu-app.git /var/www/menu-app
```

> Для GitLab всё аналогично: `HostName gitlab.com`, алиас, например, `gitlab-menu`.

---

## Шаг 5. Системные зависимости

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
```

---

## Шаг 6. Настройка приложения

Всё под `deploy_user` (он владелец папки — `sudo` не нужен):

```bash
cd /var/www/menu-app/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

Файл секретов `.env`:

```bash
cp .env.example .env

# сгенерировать SECRET_KEY:
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

nano .env
chmod 600 .env        # закрыть секрет от посторонних
```

Заполните в `.env`:

| Переменная | Значение |
|---|---|
| `SECRET_KEY` | вставьте сгенерированную длинную случайную строку |
| `HF_API_TOKEN` | токен с huggingface.co/settings/tokens (для генерации картинок) |
| `COOKIE_SECURE` | **`true`** — мы работаем по HTTPS на :8000 |
| `ACCESS_TOKEN_EXPIRE_DAYS` | срок сессии, по умолчанию `30` |
| `MAX_IMAGE_MB` | лимит размера фото, по умолчанию `10` |

> Папка `backend/static/images` и файл `backend/menu.db` создаются автоматически и
> принадлежат `deploy_user` — права настраивать отдельно не нужно. `.env` оставьте `600`.

---

## Шаг 7. systemd-сервис на порту 8001

Снаружи 8000 займёт nginx, поэтому uvicorn слушает **8001** на localhost. Создаём юнит:

```bash
sudo nano /etc/systemd/system/menu-app.service
```

Вставьте (замените `deploy_user` на ваш логин в трёх местах):

```ini
[Unit]
Description=Menu App (FastAPI/Uvicorn)
After=network.target

[Service]
User=deploy_user
Group=deploy_user
WorkingDirectory=/var/www/menu-app/backend
Environment="PATH=/var/www/menu-app/backend/.venv/bin"
ExecStart=/var/www/menu-app/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Запуск и проверка:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now menu-app
sudo systemctl status menu-app --no-pager      # active (running)
curl -i http://127.0.0.1:8001/healthz          # HTTP/1.1 200 OK
```

Логи приложения, если что-то не так: `journalctl -u menu-app -f`

---

## Шаг 8. TLS-сертификат

Cookie входа помечены `Secure`, поэтому на 8000 обязателен HTTPS. Два случая:

**А) Сертификат для домена уже есть** (декой работает по HTTPS) — проверка из шага 1
показала `/etc/letsencrypt/live/menu.example.com/`. Тогда **ничего получать не нужно** —
просто переиспользуем эти же файлы в конфиге сайта (шаг 9).

**Б) Сертификата нет.** Получаем его, **не меняя** декой-конфиг (флаг `certonly` не
добавляет редиректов и не переписывает server-блоки декоя):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d menu.example.com
```

После этого файлы появятся в `/etc/letsencrypt/live/menu.example.com/`, а также
certbot создаст `options-ssl-nginx.conf` и `ssl-dhparams.pem`, на которые ссылается конфиг.

> Если эти два файла (`options-ssl-nginx.conf`, `ssl-dhparams.pem`) у вас отсутствуют
> (сертификат получен не через certbot) — просто закомментируйте две строки `include …`
> и `ssl_dhparam …` в конфиге сайта на шаге 9.

---

## Шаг 9. Nginx: добавляем сайт на 8000

Декой **не трогаем** — только добавляем новый конфиг. Готовый шаблон уже в проекте:

```bash
sudo cp /var/www/menu-app/deploy/nginx-menu-8000.conf.example \
        /etc/nginx/sites-available/menu-8000
sudo nano /etc/nginx/sites-available/menu-8000
```

В файле поменяйте на свой домен:
- `server_name menu.example.com;`
- пути к сертификату в трёх строках (`ssl_certificate`, `ssl_certificate_key`, и в `live/<домен>/`).

Включаем сайт и перезагружаем nginx:

```bash
sudo ln -s /etc/nginx/sites-available/menu-8000 /etc/nginx/sites-enabled/menu-8000
sudo nginx -t                      # обязательно: syntax ok / test successful
sudo systemctl reload nginx
```

> `nginx -t` падает на строках `include`/`ssl_dhparam`? Значит этих файлов нет —
> закомментируйте их (см. примечание в шаге 8) и повторите `nginx -t`.

---

## Шаг 10. Firewall: открыть порт 8000

Порт 8000 должен быть открыт в **двух** местах.

На самом сервере (если используется ufw):

```bash
sudo ufw status
sudo ufw allow 8000/tcp
```

И в **облачной панели провайдера** (Hetzner / DigitalOcean / AWS Security Group /
Timeweb и т.п.) — добавьте входящее правило **TCP 8000**. Без этого извне порт будет закрыт,
даже если ufw открыт.

---

## Шаг 11. Проверка

С сервера:

```bash
curl -kI https://127.0.0.1:8000/healthz        # 200 (локально, -k т.к. SNI)
```

Снаружи / в браузере:

```bash
curl -I https://menu.example.com:8000/
curl -I https://menu.example.com:8000/healthz
curl -I https://menu.example.com:8000/manifest.json
```

В браузере на телефоне:
1. Открыть `https://menu.example.com:8000` — страница входа, зарегистрироваться, войти.
2. Добавить блюдо, загрузить фото, попробовать генерацию картинки.
3. **iOS Safari:** «Поделиться» → «На экран Домой». **Android Chrome:** меню → «Установить приложение».
4. Запуск с домашнего экрана — открывается без адресной строки (standalone PWA).

Декой при этом по-прежнему открывается на `https://menu.example.com` (порт 443) как обычно.

---

## Шаг 12. Обновление через git pull

Выкладка новой версии — три команды (данные `menu.db` и `static/images` не трогаются,
они в `.gitignore`):

```bash
cd /var/www/menu-app
git pull
cd backend
.venv/bin/pip install -r requirements.txt    # только если менялись зависимости
sudo systemctl restart menu-app
```

> Т.к. репозиторий принадлежит `deploy_user`, `git pull` идёт без `sudo`.
> Если когда-нибудь увидите `error: ... Permission denied` на pull — значит часть
> файлов принадлежит root: `sudo chown -R deploy_user:deploy_user /var/www/menu-app`.

---

## Шаг 13. Откат / удаление сайта-меню

Декой остаётся жив всегда. Чтобы убрать только сайт «Меню»:

```bash
sudo rm /etc/nginx/sites-enabled/menu-8000
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl disable --now menu-app
sudo ufw delete allow 8000/tcp        # опционально — снова закрыть порт
```

Файлы в `/var/www/menu-app` и `sites-available/menu-8000` при этом остаются —
можно вернуть всё обратно, просто пересоздав симлинк и запустив сервис.

---

## Шаг 14. Обслуживание

### Перенос уже существующих данных (если запускали приложение раньше)

Данные не в Git — это файл БД и папка картинок. Переносятся копированием как есть
(SQLite не требует экспорта; копировать при остановленном сервисе):

```bash
# с машины-источника
scp backend/menu.db deploy_user@SERVER_IP:/tmp/menu.db
rsync -avz backend/static/images/ deploy_user@SERVER_IP:/tmp/images/

# на VPS
sudo systemctl stop menu-app
cp /tmp/menu.db /var/www/menu-app/backend/menu.db
cp -r /tmp/images/. /var/www/menu-app/backend/static/images/
sudo systemctl start menu-app
```

### Бэкап данных (БД + картинки)

```bash
TS=$(date +%Y%m%d)
tar czf /tmp/menu-data-$TS.tar.gz \
  -C /var/www/menu-app/backend menu.db static/images
```

Ежедневно через cron (`crontab -e` под deploy_user):

```bash
0 3 * * * tar czf /home/deploy_user/menu-data-$(date +\%Y\%m\%d).tar.gz -C /var/www/menu-app/backend menu.db static/images
```

### Полезные команды

```bash
sudo systemctl status menu-app          # состояние
journalctl -u menu-app -f               # логи приложения
sudo tail -f /var/log/nginx/error.log   # ошибки nginx
sudo systemctl restart menu-app         # перезапуск после правок .env
```

---

## Частые проблемы

| Симптом | Причина / решение |
|---|---|
| `https://...:8000` не открывается извне | Порт закрыт в облачной панели провайдера и/или ufw (шаг 10). Проверьте оба места. |
| 502 Bad Gateway на :8000 | uvicorn не запущен на 8001: `systemctl status menu-app`, логи `journalctl -u menu-app`. |
| `nginx -t` ругается на `ssl_dhparam`/`include` | Файлов certbot нет — закомментируйте эти строки в конфиге (шаг 8). |
| Вход «сбрасывает», не логинит | Открыли по `http://...:8000` вместо `https`. Cookie `Secure` уходит только по HTTPS. |
| Конфликт портов при `nginx -t` | На 8000 уже что-то слушает. Освободите порт или смените внешний порт сайта. |
| 413 при загрузке фото | В конфиге сайта должно быть `client_max_body_size 12M;` — оно там есть, проверьте, что включён нужный конфиг. |
| Генерация картинок не работает | Пустой/неверный `HF_API_TOKEN`, либо модель «прогревается» (первый запрос дольше). |
| `git pull`: Permission denied | Файлы принадлежат root: `sudo chown -R deploy_user:deploy_user /var/www/menu-app`. |

---

## Если домена нет (только IP)

Let's Encrypt не выдаёт сертификаты на голый IP, а PWA требует валидный HTTPS.
Варианты: (1) привязать домен/поддомен к VPS — рекомендуется; (2) поставить Cloudflare
перед сервером; (3) самоподписанный сертификат на 8000 — тогда вход будет работать, но
браузер покажет предупреждение, а установка PWA, скорее всего, будет недоступна.
