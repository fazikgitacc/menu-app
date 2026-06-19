/* ===========================================================================
   Домашнее меню — Vanilla JS SPA
   Тёмная премиум-тема. Один экран + модальные окна.
   =========================================================================== */
'use strict';

const CATEGORIES = ['Завтрак', 'Обед', 'Ужин', 'Перекус', 'Напитки'];
const TABS = ['Все', ...CATEGORIES];

const state = {
  user: null,
  dishes: [],
  category: 'Все',
};

/* ----------------------------- API-обёртки ------------------------------ */
async function api(path, { method = 'GET', json, headers = {} } = {}) {
  const opts = { method, headers: { ...headers }, credentials: 'same-origin' };
  if (json !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(json);
  }
  const res = await fetch(path, opts);
  return handle(res);
}

async function apiForm(path, formData, method = 'POST') {
  const res = await fetch(path, { method, body: formData, credentials: 'same-origin' });
  return handle(res);
}

async function handle(res) {
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => null);
  }
  if (!res.ok) {
    const msg = (data && data.detail) || `Ошибка ${res.status}`;
    const err = new Error(Array.isArray(msg) ? 'Проверьте введённые данные' : msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ------------------------------ Утилиты --------------------------------- */
function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  // Шаблон с одним корнем — возвращаем его как есть.
  if (t.content.children.length === 1) return t.content.firstElementChild;
  // Несколько корневых узлов — оборачиваем, чтобы ничего не потерялось.
  const wrap = document.createElement('div');
  wrap.appendChild(t.content);
  return wrap;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function isLink(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
}

function num(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  const v = Math.round(num(n) * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function toast(message, type = 'info') {
  const colors = {
    info: 'bg-cardhi border-line',
    error: 'bg-[#2a1518] border-[#5b2630] text-red-200',
    success: 'bg-[#142420] border-[#2c4a3f] text-emerald-200',
  };
  const node = h(
    `<div class="fadein pointer-events-auto w-full rounded-xl border ${colors[type] || colors.info} px-4 py-3 text-sm shadow-soft">${esc(message)}</div>`
  );
  const root = document.getElementById('toast-root');
  root.appendChild(node);
  setTimeout(() => {
    node.style.transition = 'opacity .3s';
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 300);
  }, 3200);
}

/* ------------------------- Иконки (inline SVG) -------------------------- */
const ICON = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="w-full h-full"><path d="M12 5v14M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="w-5 h-5"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="w-5 h-5"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 14l.7 2 .... " /></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="w-5 h-5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5L5 20"/></svg>',
};
// Чистый «искрящийся» значок генерации (без артефактов).
ICON.spark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M12 3l1.7 4.6L18.5 9l-4.8 1.4L12 15l-1.7-4.6L5.5 9l4.8-1.4L12 3z"/><path d="M19 13l.7 1.9 1.9.7-1.9.7L19 19l-.7-1.8-1.9-.7 1.9-.7.7-1.8z"/></svg>';
ICON.edit = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';

/* ------------------------- Глобальный лоадер ---------------------------- */
function showLoader(text) {
  let el = document.getElementById('global-loader');
  if (!el) {
    el = h(`
      <div id="global-loader" class="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-ink/80 backdrop-blur-sm">
        <div class="w-12 h-12 rounded-full border-2 border-line border-t-accent spin"></div>
        <p id="global-loader-text" class="mt-4 text-sm text-muted px-6 text-center"></p>
      </div>`);
    document.body.appendChild(el);
  }
  el.querySelector('#global-loader-text').textContent = text || 'Загрузка…';
  el.classList.remove('hidden');
}
function hideLoader() {
  const el = document.getElementById('global-loader');
  if (el) el.classList.add('hidden');
}

/* ------------------------------- Модалки -------------------------------- */
function openModal(contentNode) {
  closeModal();
  const overlay = h(`
    <div id="modal" class="fixed inset-0 z-[110] overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div class="min-h-full flex items-start sm:items-center justify-center p-0 sm:p-6"></div>
    </div>`);
  overlay.querySelector('div').appendChild(contentNode);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-root').appendChild(overlay);
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const m = document.getElementById('modal');
  if (m) m.remove();
  document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function modalShell(innerHTML) {
  return h(`
    <div class="fadein relative w-full sm:max-w-4xl bg-graphite sm:rounded-2xl border border-line shadow-soft min-h-screen sm:min-h-0">
      <button data-close style="top: calc(env(safe-area-inset-top) + 0.75rem)" class="absolute right-4 z-10 w-9 h-9 grid place-items-center rounded-full bg-ink/70 border border-line text-muted hover:text-white">${ICON.close}</button>
      ${innerHTML}
    </div>`);
}

/* ============================ ЭКРАН АВТОРИЗАЦИИ =========================== */
function renderAuth() {
  const root = document.getElementById('root');
  root.innerHTML = '';
  const view = h(`
    <div class="min-h-screen flex items-center justify-center px-5 safe-t safe-b">
      <div class="fadein w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 w-12 h-px bg-accent/60"></div>
          <h1 class="text-2xl font-semibold tracking-tight">Домашнее меню</h1>
          <p class="text-muted text-sm mt-2">Ваша персональная книга блюд</p>
        </div>
        <div class="bg-card border border-line rounded-2xl p-6 shadow-soft">
          <div class="flex gap-1 p-1 bg-ink rounded-xl mb-5 text-sm">
            <button data-mode="login" class="auth-tab flex-1 py-2 rounded-lg transition">Вход</button>
            <button data-mode="register" class="auth-tab flex-1 py-2 rounded-lg transition">Регистрация</button>
          </div>
          <form id="auth-form" class="space-y-3">
            <input name="username" autocomplete="username" placeholder="Логин"
              class="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition" />
            <input name="password" type="password" autocomplete="current-password" placeholder="Пароль"
              class="w-full bg-ink border border-line rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition" />
            <button type="submit" id="auth-submit"
              class="w-full py-3 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Войти</button>
          </form>
        </div>
      </div>
    </div>`);

  let mode = 'login';
  const tabs = view.querySelectorAll('.auth-tab');
  const submit = view.querySelector('#auth-submit');

  function setMode(m) {
    mode = m;
    tabs.forEach((t) => {
      const active = t.dataset.mode === m;
      t.classList.toggle('bg-cardhi', active);
      t.classList.toggle('text-white', active);
      t.classList.toggle('text-muted', !active);
    });
    submit.textContent = m === 'login' ? 'Войти' : 'Создать аккаунт';
  }
  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));
  setMode('login');

  view.querySelector('#auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = (fd.get('username') || '').trim();
    const password = fd.get('password') || '';
    if (username.length < 2 || password.length < 4) {
      return toast('Логин от 2 символов, пароль от 4', 'error');
    }
    submit.disabled = true;
    submit.textContent = 'Минуту…';
    try {
      const user = await api(`/api/auth/${mode}`, { method: 'POST', json: { username, password } });
      state.user = user;
      await loadDishes();
      renderApp();
      toast(`Добро пожаловать, ${user.username}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      submit.disabled = false;
      setMode(mode);
    }
  });

  root.appendChild(view);
}

/* ============================== ГЛАВНЫЙ ЭКРАН ============================ */
function renderApp() {
  const root = document.getElementById('root');
  root.innerHTML = '';

  const view = h(`
    <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
      <!-- Шапка -->
      <header style="padding-top: calc(env(safe-area-inset-top) + 1rem)" class="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 bg-ink/85 backdrop-blur-md border-b border-line/60">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-accent">${ICON.spark}</span>
            <h1 class="text-lg font-semibold tracking-tight">Меню</h1>
          </div>
          <button id="profile-btn" class="flex items-center gap-2 text-sm text-muted hover:text-white border border-line rounded-full pl-3 pr-2 py-1.5 bg-card transition">
            <span class="max-w-[8rem] truncate">${esc(state.user?.username || 'Профиль')}</span>
            <span class="text-muted">${ICON.user}</span>
          </button>
        </div>

        <!-- Табы категорий -->
        <div id="tabs" class="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1"></div>
      </header>

      <!-- Случайный выбор -->
      <button id="random-btn" class="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-accent/40 bg-accent/10 text-accent font-medium text-sm hover:bg-accent/15 transition">
        ${ICON.dice}<span>Что приготовить? <span class="text-accent/70">Случайный выбор</span></span>
      </button>

      <!-- Сетка блюд -->
      <main id="grid" class="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"></main>
      <div id="empty" class="hidden text-center text-muted py-20">
        <p class="text-base">Здесь пока пусто</p>
        <p class="text-sm mt-1 text-muted/70">Добавьте первое блюдо кнопкой ниже</p>
      </div>
    </div>

    <!-- Кнопка добавления -->
    <div style="padding-bottom: calc(env(safe-area-inset-bottom) + 1rem)" class="fixed bottom-0 inset-x-0 z-40 px-4 sm:px-6 pt-6 bg-gradient-to-t from-ink via-ink/90 to-transparent">
      <div class="max-w-6xl mx-auto">
        <button id="add-btn" class="w-full py-4 rounded-2xl bg-accent text-ink font-semibold text-sm shadow-soft hover:bg-[#eecb96] transition flex items-center justify-center gap-2">
          <span class="w-5 h-5 inline-block">${ICON.plus}</span> Добавить новое блюдо
        </button>
      </div>
    </div>`);

  root.appendChild(view);

  renderTabs();
  renderGrid();

  view.querySelector('#add-btn').addEventListener('click', () => openAddModal());
  view.querySelector('#random-btn').addEventListener('click', openRandomModal);
  view.querySelector('#profile-btn').addEventListener('click', openProfileModal);
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  TABS.forEach((cat) => {
    const active = cat === state.category;
    const btn = h(`
      <button class="shrink-0 px-4 py-1.5 rounded-full text-sm border transition ${
        active ? 'bg-white text-ink border-white font-medium'
               : 'bg-card text-muted border-line hover:text-white'
      }">${esc(cat)}</button>`);
    btn.addEventListener('click', async () => {
      if (state.category === cat) return;
      state.category = cat;
      renderTabs();
      await loadDishes();
      renderGrid();
    });
    tabsEl.appendChild(btn);
  });
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  if (!grid) return;
  grid.innerHTML = '';

  if (!state.dishes.length) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  state.dishes.forEach((dish) => grid.appendChild(dishCard(dish)));
}

function dishCard(dish) {
  const hasImg = !!dish.image_path;
  const card = h(`
    <article class="fadein group relative rounded-2xl overflow-hidden bg-card border border-line cursor-pointer hover:border-line/80 transition">
      <div class="relative aspect-square bg-graphite">
        ${
          hasImg
            ? `<img src="${esc(dish.image_path)}" alt="${esc(dish.title)}" loading="lazy" class="w-full h-full object-cover" />`
            : `<div class="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                 <div class="w-9 h-9 rounded-full border border-line grid place-items-center text-muted mb-2">${ICON.image}</div>
                 <p class="text-[11px] leading-tight text-muted/80">Нет фото</p>
               </div>`
        }
        <!-- Плашка с названием -->
        <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 class="text-sm font-medium leading-snug line-clamp-2">${esc(dish.title)}</h3>
          <p class="text-[11px] text-accent/80 mt-0.5">${fmt(dish.calories)} ккал</p>
        </div>
      </div>
    </article>`);

  card.addEventListener('click', () => openDetailModal(dish));

  const genBtn = card.querySelector('[data-gen]');
  if (genBtn) {
    genBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await generateForDish(dish);
    });
  }
  return card;
}

/* --------------------- Блок КБЖУ (фитнес-стиль) ------------------------- */
function macrosBlock(dish) {
  const p = num(dish.proteins), f = num(dish.fats), c = num(dish.carbohydrates);
  const total = p + f + c;
  const pct = (v) => (total > 0 ? Math.max(2, Math.round((v / total) * 100)) : 0);
  const bar = (label, val, pctVal, color) => `
    <div>
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="text-sm text-muted">${label}</span>
        <span class="text-sm"><span class="font-semibold">${fmt(val)}</span><span class="text-muted"> г</span></span>
      </div>
      <div class="h-2 rounded-full bg-ink overflow-hidden">
        <div class="h-full rounded-full" style="width:${pctVal}%;background:${color}"></div>
      </div>
    </div>`;

  return `
    <div class="rounded-2xl bg-card border border-line p-5">
      <div class="flex items-end justify-between mb-5">
        <div>
          <p class="text-xs uppercase tracking-wider text-muted">Калорийность</p>
          <p class="mt-1"><span class="text-4xl font-bold text-accent">${fmt(dish.calories)}</span><span class="text-muted text-sm ml-1.5">ккал</span></p>
        </div>
        <span class="text-xs text-muted">на порцию</span>
      </div>
      <div class="space-y-4">
        ${bar('Белки', p, pct(p), '#5ec8a8')}
        ${bar('Жиры', f, pct(f), '#e6b260')}
        ${bar('Углеводы', c, pct(c), '#6aa8e6')}
      </div>
    </div>`;
}

function recipeBlock(text) {
  if (!text) {
    return `<div class="rounded-2xl bg-card border border-line p-5 text-sm text-muted/70">Рецепт не добавлен</div>`;
  }
  if (isLink(text)) {
    return `
      <div class="rounded-2xl bg-card border border-line p-5">
        <p class="text-xs uppercase tracking-wider text-muted mb-2">Рецепт</p>
        <a href="${esc(text)}" target="_blank" rel="noopener" class="text-accent text-sm break-all hover:underline">${esc(text)}</a>
      </div>`;
  }
  return `
    <div class="rounded-2xl bg-card border border-line p-5">
      <p class="text-xs uppercase tracking-wider text-muted mb-2">Рецепт</p>
      <div class="recipe text-sm text-gray-200 leading-relaxed max-h-64 overflow-y-auto no-scrollbar">${esc(text)}</div>
    </div>`;
}

/* image | placeholder для детального просмотра */
function detailImage(dish) {
  if (dish.image_path) {
    return `<img src="${esc(dish.image_path)}" alt="${esc(dish.title)}" class="w-full h-full object-cover" />`;
  }
  return `
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <div class="w-12 h-12 rounded-full border border-line grid place-items-center text-muted mb-3">${ICON.image}</div>
      <p class="text-sm text-muted">Изображения пока нет</p>
      <button data-gen class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-ink text-sm font-medium hover:bg-[#eecb96] transition">${ICON.spark} Сгенерировать</button>
    </div>`;
}

/* ============================ ДЕТАЛЬНЫЙ ПРОСМОТР ========================= */
function openDetailModal(dish) {
  const inner = `
    <div class="grid md:grid-cols-2 gap-0">
      <!-- Изображение -->
      <div class="relative">
        <div class="relative aspect-square md:aspect-auto md:h-full md:min-h-[26rem] bg-graphite md:rounded-l-2xl overflow-hidden">
          ${detailImage(dish)}
          <div class="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none">
            <span class="inline-block text-[11px] uppercase tracking-wider text-accent/90 mb-1">${esc(dish.category)}</span>
            <h2 class="text-xl font-semibold leading-tight">${esc(dish.title)}</h2>
            ${dish.description ? `<p class="text-sm text-gray-300 mt-1 line-clamp-2">${esc(dish.description)}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Информация -->
      <div class="p-5 sm:p-6 space-y-4">
        ${macrosBlock(dish)}
        ${recipeBlock(dish.recipe_text_or_link)}
        <button data-edit class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition">
          ${ICON.edit} Редактировать
        </button>
        <button data-delete class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#5b2630] text-red-300 text-sm hover:bg-[#2a1518] transition">
          ${ICON.trash} Удалить блюдо
        </button>
      </div>
    </div>`;

  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);

  const genBtn = node.querySelector('[data-gen]');
  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      closeModal();
      await generateForDish(dish);
    });
  }

  node.querySelector('[data-delete]').addEventListener('click', async () => {
    if (!confirm(`Удалить «${dish.title}»?`)) return;
    try {
      await api(`/api/dishes/${dish.id}`, { method: 'DELETE' });
      closeModal();
      await loadDishes();
      renderGrid();
      toast('Блюдо удалено', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  node.querySelector('[data-edit]').addEventListener('click', () => {
    closeModal();
    openAddModal(dish);
  });

  openModal(node);
}

/* ============================ ДОБАВЛЕНИЕ БЛЮДА =========================== */
function openAddModal(dish = null) {
  const isEdit = !!dish;
  // Состояние картинки внутри формы.
  const img = { file: null, previewUrl: null, generatedPath: null };

  const selectedCat = (isEdit && dish.category) ? dish.category : 'Обед';
  const catOptions = CATEGORIES
    .map((c) => `<option value="${c}"${c === selectedCat ? ' selected' : ''}>${c}</option>`)
    .join('');

  // Значение поля для предзаполнения при редактировании.
  const v = (key) => (isEdit && dish[key] != null ? esc(String(dish[key])) : '');

  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';

  const inner = `
    <form id="add-form" class="grid md:grid-cols-2 gap-0">
      <!-- Зона изображения (повторяет геометрию детального просмотра) -->
      <div class="relative">
        <div id="img-zone" class="relative aspect-square md:aspect-auto md:h-full md:min-h-[28rem] bg-graphite md:rounded-l-2xl overflow-hidden flex items-center justify-center">
          <img id="img-preview" class="hidden w-full h-full object-cover" alt="" />
          <div id="img-actions" class="flex flex-col gap-3 px-8 w-full max-w-xs">
            <p class="text-center text-xs text-muted mb-1">Изображение блюда</p>
            <button type="button" id="pick-img" class="flex items-center justify-center gap-2 py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition">${ICON.image} Вставить изображение</button>
            <button type="button" id="gen-img" class="flex items-center justify-center gap-2 py-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-sm hover:bg-accent/15 transition">${ICON.spark} Сгенерировать изображение</button>
            <input type="file" id="file-input" accept="image/*" class="hidden" />
          </div>
          <button type="button" id="img-reset" class="hidden absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-ink/80 border border-line text-xs text-muted hover:text-white">Заменить</button>
        </div>
      </div>

      <!-- Поля ввода (на месте инфо-блока) -->
      <div class="p-5 sm:p-6 space-y-3 max-h-[80vh] md:max-h-[80vh] overflow-y-auto no-scrollbar">
        <p class="text-base font-semibold mb-1">${isEdit ? 'Редактировать блюдо' : 'Новое блюдо'}</p>
        <div>
          <label class="text-xs text-muted mb-1 block">Название</label>
          <input name="title" required placeholder="Например, Паста карбонара" value="${v('title')}" class="${fieldCls}" />
        </div>
        <div>
          <label class="text-xs text-muted mb-1 block">Категория</label>
          <select name="category" class="${fieldCls}">${catOptions}</select>
        </div>
        <div>
          <label class="text-xs text-muted mb-1 block">Описание</label>
          <textarea name="description" rows="2" placeholder="Короткое описание" class="${fieldCls} resize-none">${v('description')}</textarea>
        </div>

        <div class="rounded-2xl bg-card border border-line p-4">
          <p class="text-xs uppercase tracking-wider text-muted mb-3">КБЖУ на порцию</p>
          <div class="mb-3">
            <label class="text-xs text-muted mb-1 block">Калории, ккал</label>
            <input name="calories" inputmode="decimal" placeholder="0" value="${v('calories')}" class="${fieldCls}" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="text-xs text-prot mb-1 block">Белки</label><input name="proteins" inputmode="decimal" placeholder="0" value="${v('proteins')}" class="${fieldCls}" /></div>
            <div><label class="text-xs text-fat mb-1 block">Жиры</label><input name="fats" inputmode="decimal" placeholder="0" value="${v('fats')}" class="${fieldCls}" /></div>
            <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input name="carbohydrates" inputmode="decimal" placeholder="0" value="${v('carbohydrates')}" class="${fieldCls}" /></div>
          </div>
        </div>

        <div>
          <label class="text-xs text-muted mb-1 block">Рецепт или ссылка</label>
          <textarea name="recipe_text_or_link" rows="4" placeholder="Текст рецепта или ссылка https://…" class="${fieldCls} resize-none">${v('recipe_text_or_link')}</textarea>
        </div>

        <button type="submit" id="save-dish" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">${isEdit ? 'Сохранить изменения' : 'Сохранить блюдо'}</button>
      </div>
    </form>`;

  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);

  const form = node.querySelector('#add-form');
  const fileInput = node.querySelector('#file-input');
  const preview = node.querySelector('#img-preview');
  const actions = node.querySelector('#img-actions');
  const resetBtn = node.querySelector('#img-reset');

  function showPreview(url) {
    preview.src = url;
    preview.classList.remove('hidden');
    actions.classList.add('hidden');
    resetBtn.classList.remove('hidden');
  }
  function resetImage() {
    img.file = null; img.generatedPath = null;
    if (img.previewUrl) { URL.revokeObjectURL(img.previewUrl); img.previewUrl = null; }
    preview.src = ''; preview.classList.add('hidden');
    actions.classList.remove('hidden');
    resetBtn.classList.add('hidden');
  }

  node.querySelector('#pick-img').addEventListener('click', () => fileInput.click());
  resetBtn.addEventListener('click', resetImage);

  // В режиме редактирования показываем текущую картинку (остаётся, если её не заменить).
  if (isEdit && dish.image_path) showPreview(dish.image_path);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    img.file = file;
    img.generatedPath = null;
    img.previewUrl = URL.createObjectURL(file);
    showPreview(img.previewUrl);
  });

  node.querySelector('#gen-img').addEventListener('click', async () => {
    const title = form.title.value.trim();
    if (!title) return toast('Сначала введите название блюда', 'error');
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', form.description.value.trim());
    showLoader('Генерируем изображение блюда…\nЭто может занять до минуты');
    try {
      const res = await apiForm('/api/dishes/generate-preview', fd);
      img.file = null;
      img.generatedPath = res.image_path;
      showPreview(res.image_path);
      toast('Изображение готово', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      hideLoader();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    if (!title) return toast('Введите название блюда', 'error');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', form.description.value.trim());
    fd.append('category', form.category.value);
    fd.append('calories', num(form.calories.value));
    fd.append('proteins', num(form.proteins.value));
    fd.append('fats', num(form.fats.value));
    fd.append('carbohydrates', num(form.carbohydrates.value));
    fd.append('recipe_text_or_link', form.recipe_text_or_link.value.trim());
    if (img.file) fd.append('image', img.file);
    else if (img.generatedPath) fd.append('image_path', img.generatedPath);

    const btn = node.querySelector('#save-dish');
    const saveLabel = isEdit ? 'Сохранить изменения' : 'Сохранить блюдо';
    btn.disabled = true; btn.textContent = 'Сохраняем…';
    try {
      if (isEdit) {
        await apiForm(`/api/dishes/${dish.id}`, fd, 'PUT');
      } else {
        await apiForm('/api/dishes', fd);
        state.category = 'Все';
        renderTabs();
      }
      closeModal();
      await loadDishes();
      renderGrid();
      toast(isEdit ? 'Блюдо обновлено' : 'Блюдо добавлено', 'success');
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = saveLabel;
    }
  });

  openModal(node);
}

/* ============================== СЛУЧАЙНЫЙ ВЫБОР ========================== */
async function openRandomModal() {
  showLoader('Подбираем блюдо…');
  let dish;
  try {
    const q = state.category !== 'Все' ? `?category=${encodeURIComponent(state.category)}` : '';
    dish = await api(`/api/dishes/random${q}`);
  } catch (err) {
    hideLoader();
    return toast(err.message, 'error');
  }
  hideLoader();

  const inner = `
    <div class="p-1">
      <div class="relative aspect-[4/3] sm:rounded-t-2xl overflow-hidden bg-graphite">
        ${dish.image_path
          ? `<img src="${esc(dish.image_path)}" alt="${esc(dish.title)}" class="w-full h-full object-cover" />`
          : `<div class="absolute inset-0 grid place-items-center text-muted">${ICON.image}</div>`}
        <div class="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 to-transparent">
          <p class="text-[11px] uppercase tracking-wider text-accent/90">${esc(dish.category)} · сегодня готовим</p>
          <h2 class="text-2xl font-semibold">${esc(dish.title)}</h2>
          <p class="text-accent text-sm mt-1">${fmt(dish.calories)} ккал</p>
        </div>
      </div>
      <div class="p-5 grid grid-cols-2 gap-3">
        <button data-again class="py-3 rounded-xl border border-line text-sm hover:bg-cardhi transition">Ещё раз</button>
        <button data-open class="py-3 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Открыть блюдо</button>
      </div>
    </div>`;

  const node = h(`<div class="fadein relative w-full sm:max-w-md bg-graphite sm:rounded-2xl border border-line shadow-soft overflow-hidden">
      <button data-close class="absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-ink/70 border border-line text-muted hover:text-white">${ICON.close}</button>
      ${inner}
    </div>`);

  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelector('[data-again]').addEventListener('click', () => { closeModal(); openRandomModal(); });
  node.querySelector('[data-open]').addEventListener('click', () => { closeModal(); openDetailModal(dish); });

  openModal(node);
}

/* =============================== ПРОФИЛЬ ================================= */
function openProfileModal() {
  const inner = `
    <div class="p-6 sm:p-8 text-center max-w-sm mx-auto">
      <div class="mx-auto w-16 h-16 rounded-full bg-card border border-line grid place-items-center text-accent mb-4">${ICON.user}</div>
      <h2 class="text-lg font-semibold">${esc(state.user?.username || '')}</h2>
      <p class="text-sm text-muted mt-1">${state.dishes.length} блюд в категории «${esc(state.category)}»</p>
      <button data-logout class="mt-6 w-full py-3 rounded-xl border border-line text-sm hover:bg-cardhi transition">Выйти</button>
    </div>`;
  const node = h(`<div class="fadein relative w-full sm:max-w-md bg-graphite sm:rounded-2xl border border-line shadow-soft min-h-screen sm:min-h-0">
      <button data-close class="absolute top-4 right-4 z-10 w-9 h-9 grid place-items-center rounded-full bg-ink/70 border border-line text-muted hover:text-white">${ICON.close}</button>
      ${inner}
    </div>`);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelector('[data-logout]').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) {}
    state.user = null; state.dishes = []; state.category = 'Все';
    closeModal();
    renderAuth();
  });
  openModal(node);
}

/* ===================== Генерация картинки для блюда ====================== */
async function generateForDish(dish) {
  showLoader('Генерируем изображение блюда…\nЭто может занять до минуты');
  try {
    const updated = await api(`/api/dishes/${dish.id}/generate-image`, { method: 'POST' });
    const i = state.dishes.findIndex((d) => d.id === updated.id);
    if (i !== -1) state.dishes[i] = updated;
    renderGrid();
    toast('Изображение готово', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    hideLoader();
  }
}

/* ============================= Загрузка данных =========================== */
async function loadDishes() {
  const q = state.category !== 'Все' ? `?category=${encodeURIComponent(state.category)}` : '';
  state.dishes = await api(`/api/dishes${q}`);
}

/* ================================= Старт ================================ */
async function init() {
  try {
    state.user = await api('/api/auth/me');
    await loadDishes();
    renderApp();
  } catch (_) {
    renderAuth();
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

init();
