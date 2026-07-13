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
  menuQuery: '',        // поиск блюд по названию
  tab: 'menu',          // 'menu' | 'diary'
  menuMode: 'dishes',   // 'dishes' | 'products'
  diaryDate: null,      // 'YYYY-MM-DD'
  day: null,            // загруженные данные дня
  products: null,       // личный каталог продуктов
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
ICON.grid = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="w-full h-full"><rect x="3" y="3" width="8" height="8" rx="1.6"/><rect x="13" y="3" width="8" height="8" rx="1.6"/><rect x="3" y="13" width="8" height="8" rx="1.6"/><rect x="13" y="13" width="8" height="8" rx="1.6"/></svg>';
ICON.book = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M5 4a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2z"/><path d="M9 7h6M9 11h6"/></svg>';
ICON.barcode = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" class="w-5 h-5"><path d="M4 6v12M7.5 6v12M11 6v12M14 6v12M17 6v12M20 6v12"/></svg>';
ICON.camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h5l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.2"/></svg>';
ICON.drop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" class="w-full h-full"><path d="M12 3s6 6.6 6 11a6 6 0 1 1-12 0c0-4.4 6-11 6-11z"/></svg>';
ICON.target = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="w-full h-full"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>';
ICON.chevL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M15 6l-6 6 6 6"/></svg>';
ICON.chevR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M9 6l6 6-6 6"/></svg>';
ICON.search = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
ICON.calendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>';

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
let activeScanner = null;   // функция остановки камеры, если открыт сканер
function closeModal() {
  if (activeScanner) { try { activeScanner(); } catch (_) {} activeScanner = null; }
  const m = document.getElementById('modal');
  if (m) m.remove();
  document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function modalShell(innerHTML) {
  return h(`
    <div style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)" class="fadein relative w-full sm:max-w-4xl bg-graphite sm:rounded-2xl border border-line shadow-soft min-h-screen sm:min-h-0">
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

  if (state.tab === 'diary') {
    root.appendChild(diaryView());
    wireDiary(root);
  } else {
    root.appendChild(menuView());
    if (state.menuMode === 'dishes') { renderTabs(); renderGrid(); }
    else { renderProducts(); }
    wireMenu(root);
  }

  root.appendChild(navBar());
  wireNav(root);
}

/* --------------------------- Экран «Меню» ------------------------------- */
function menuView() {
  const isProducts = state.menuMode === 'products';

  const segBtn = (mode, label) => `
    <button data-mode="${mode}" class="flex-1 py-2 rounded-lg text-sm font-medium transition ${
      state.menuMode === mode ? 'bg-card text-white' : 'text-muted hover:text-white'
    }">${label}</button>`;

  const body = isProducts
    ? `<main id="prod-grid" class="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"></main>`
    : `<button id="random-btn" class="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-accent/40 bg-accent/10 text-accent font-medium text-sm hover:bg-accent/15 transition">
         ${ICON.dice}<span>Что приготовить? <span class="text-accent/70">Случайный выбор</span></span>
       </button>
       <main id="grid" class="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"></main>
       <div id="empty" class="hidden text-center text-muted py-20">
         <p class="text-base">Здесь пока пусто</p>
         <p class="text-sm mt-1 text-muted/70">Добавьте первое блюдо кнопкой ниже</p>
       </div>`;

  const addBtn = isProducts ? '' : `
    <div style="bottom: calc(env(safe-area-inset-bottom) + 4.5rem)" class="fixed inset-x-0 z-40 px-4 sm:px-6 pt-6 pb-2 bg-gradient-to-t from-ink via-ink/90 to-transparent pointer-events-none">
      <div class="max-w-6xl mx-auto pointer-events-auto">
        <button id="add-btn" class="w-full py-4 rounded-2xl bg-accent text-ink font-semibold text-sm shadow-soft hover:bg-[#eecb96] transition flex items-center justify-center gap-2">
          <span class="w-5 h-5 inline-block">${ICON.plus}</span> Добавить новое блюдо
        </button>
      </div>
    </div>`;

  return h(`
    <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-44">
      <header style="padding-top: calc(env(safe-area-inset-top) + 1rem)" class="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 bg-ink/85 backdrop-blur-md border-b border-line/60">
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

        <!-- Переключатель Блюда / Продукты -->
        <div class="mt-3 flex gap-1 p-1 rounded-xl bg-ink border border-line">
          ${segBtn('dishes', 'Блюда')}${segBtn('products', 'Продукты')}
        </div>

        ${isProducts ? '' : `
        <div id="tabs" class="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1"></div>
        <div class="relative mt-3">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${ICON.search}</span>
          <input id="dish-search" value="${esc(state.menuQuery || '')}" placeholder="Поиск блюд по названию" autocomplete="off" class="w-full bg-ink border border-line rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-accent/60 transition" />
        </div>`}
      </header>

      ${body}
    </div>
    ${addBtn}`);
}

function wireMenu(root) {
  root.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', async () => {
      const m = b.getAttribute('data-mode');
      if (state.menuMode === m) return;
      state.menuMode = m;
      if (m === 'products' && state.products === null) {
        showLoader('Загружаем продукты…'); await loadProducts(); hideLoader();
      }
      renderApp();
    });
  });
  const addBtn = root.querySelector('#add-btn');
  if (addBtn) addBtn.addEventListener('click', () => openAddModal());
  const randomBtn = root.querySelector('#random-btn');
  if (randomBtn) randomBtn.addEventListener('click', openRandomModal);
  root.querySelector('#profile-btn').addEventListener('click', openProfileModal);

  const search = root.querySelector('#dish-search');
  if (search) {
    let t = null;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        state.menuQuery = search.value.trim();
        try { await loadDishes(); renderGrid(); } catch (_) {}
      }, 300);
    });
  }
}

/* -------------------------- Экран «Дневник» ----------------------------- */
const MEALS = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDate(str, delta) {
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function dateLabel(str) {
  const t = todayStr();
  if (str === t) return 'Сегодня';
  if (str === shiftDate(t, -1)) return 'Вчера';
  if (str === shiftDate(t, 1)) return 'Завтра';
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

async function loadDay() {
  if (!state.diaryDate) state.diaryDate = todayStr();
  try {
    state.day = await api(`/api/tracker/day?date=${state.diaryDate}`);
  } catch (err) {
    toast(err.message, 'error');
  }
}
async function reloadDay() {
  await loadDay();
  renderApp();
}

function progressBar(value, target, colorCls) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return `<div class="h-1.5 rounded-full bg-line/80 overflow-hidden"><div class="h-full ${colorCls} rounded-full" style="width:${pct}%"></div></div>`;
}

function diaryView() {
  const day = state.day || { totals: { calories: 0, proteins: 0, fats: 0, carbohydrates: 0 }, water_ml: 0, goal: null, meals: {} };
  const goal = day.goal;
  const t = day.totals;

  // Сводка по калориям
  const goalCal = goal?.target_calories || 0;
  const remaining = Math.round(goalCal - t.calories);
  const summary = goalCal > 0
    ? `<div class="flex items-end justify-between mb-2">
         <div>
           <p class="text-3xl font-semibold ${remaining < 0 ? 'text-red-300' : 'text-white'}">${fmt(Math.abs(remaining))}</p>
           <p class="text-xs text-muted mt-0.5">${remaining < 0 ? 'превышение, ккал' : 'осталось, ккал'}</p>
         </div>
         <p class="text-sm text-muted">${fmt(t.calories)} / ${fmt(goalCal)}</p>
       </div>
       ${progressBar(t.calories, goalCal, remaining < 0 ? 'bg-red-400' : 'bg-accent')}`
    : `<div class="flex items-end justify-between mb-2">
         <div><p class="text-3xl font-semibold text-white">${fmt(t.calories)}</p><p class="text-xs text-muted mt-0.5">ккал съедено</p></div>
         <button data-goal class="text-sm text-accent border border-accent/40 rounded-full px-3 py-1.5">Задать цель</button>
       </div>`;

  const macro = (label, val, target, cls) => `
    <div class="min-w-0">
      <p class="text-xs ${cls}">${label}</p>
      <p class="text-[11px] text-muted mb-1.5 truncate">${fmt(val)}${target ? ` / ${fmt(target)}` : ''} г</p>
      ${progressBar(val, target || val || 1, cls.replace('text-', 'bg-'))}
    </div>`;

  const macros = `
    <div class="grid grid-cols-3 gap-3 mt-4">
      ${macro('Белки', t.proteins, goal?.target_proteins, 'text-prot')}
      ${macro('Жиры', t.fats, goal?.target_fats, 'text-fat')}
      ${macro('Углеводы', t.carbohydrates, goal?.target_carbohydrates, 'text-carb')}
    </div>`;

  // Вода
  const waterGoal = goal?.target_water_ml || 2000;
  const waterMax = Math.ceil(Math.max(3000, waterGoal, day.water_ml) / 50) * 50;
  const water = `
    <section class="rounded-2xl bg-card border border-line p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2"><span class="text-carb w-5 h-5 inline-block">${ICON.drop}</span><h3 class="text-sm font-medium">Вода</h3></div>
        <p class="text-sm text-muted"><span id="water-val" class="text-white font-medium">${fmt(day.water_ml)}</span> / ${fmt(waterGoal)} мл</p>
      </div>
      <input id="water-range" type="range" min="0" max="${waterMax}" step="50" value="${day.water_ml}" class="water-range" />
      <div class="flex justify-between text-[10px] text-muted/60 mt-1.5 px-0.5">
        <span>0</span><span>шаг 50 мл</span><span>${fmt(waterMax)} мл</span>
      </div>
    </section>`;

  // Приёмы пищи
  const mealCards = MEALS.map((m) => {
    const items = (day.meals && day.meals[m.id]) || [];
    const kcal = items.reduce((s, e) => s + (e.calories || 0), 0);
    const rows = items.length
      ? items.map((e) => {
          const unit = e.unit === 'serving' ? 'порц.' : e.unit === 'ml' ? 'мл' : 'г';
          return `
          <button data-entry="${e.id}" class="block w-full px-4 py-2.5 border-t border-line/60 text-left hover:bg-cardhi/40 transition">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm truncate min-w-0">${esc(e.name)}</p>
              <span class="text-sm text-accent shrink-0">${fmt(e.calories)} ккал</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] whitespace-nowrap">
              <span class="text-muted">${fmt(e.amount)} ${unit}</span>
              <span class="text-line">·</span>
              <span class="text-prot">Б ${fmt(e.proteins)}</span>
              <span class="text-fat">Ж ${fmt(e.fats)}</span>
              <span class="text-carb">У ${fmt(e.carbohydrates)}</span>
            </div>
          </button>`;
        }).join('')
      : `<p class="px-4 py-3 border-t border-line/60 text-xs text-muted/70">Пусто</p>`;
    return `
      <section class="rounded-2xl bg-card border border-line overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <div><h3 class="text-sm font-medium">${m.label}</h3><p class="text-[11px] text-accent/80">${fmt(kcal)} ккал</p></div>
          <button data-add-meal="${m.id}" class="w-8 h-8 grid place-items-center rounded-full bg-accent/15 text-accent hover:bg-accent/25 transition"><span class="w-4 h-4">${ICON.plus}</span></button>
        </div>
        ${rows}
      </section>`;
  }).join('');

  return h(`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 pb-28">
      <header style="padding-top: calc(env(safe-area-inset-top) + 1rem)" class="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-3 bg-ink/85 backdrop-blur-md border-b border-line/60">
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-semibold tracking-tight">Дневник</h1>
          <div class="flex items-center gap-2">
            <button data-cal class="w-9 h-9 grid place-items-center rounded-full border border-line bg-card text-muted hover:text-white transition" title="Календарь"><span class="w-4 h-4">${ICON.calendar}</span></button>
            <button data-goal class="flex items-center gap-1.5 text-sm text-muted hover:text-white border border-line rounded-full px-3 py-1.5 bg-card transition"><span class="w-4 h-4">${ICON.target}</span> Цель</button>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <button data-day="-1" class="w-9 h-9 grid place-items-center rounded-full border border-line bg-card text-muted hover:text-white"><span class="w-5 h-5">${ICON.chevL}</span></button>
          <button data-pick-date class="text-sm font-medium capitalize px-3 py-1.5">${esc(dateLabel(state.diaryDate))}</button>
          <button data-day="1" class="w-9 h-9 grid place-items-center rounded-full border border-line bg-card text-muted hover:text-white"><span class="w-5 h-5">${ICON.chevR}</span></button>
        </div>
      </header>

      <div class="mt-4 rounded-2xl bg-card border border-line p-4">
        ${summary}
        ${macros}
      </div>

      <div class="mt-3">${water}</div>

      <div class="mt-3 space-y-3">${mealCards}</div>
    </div>`);
}

function wireDiary(root) {
  root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', async () => {
    state.diaryDate = shiftDate(state.diaryDate, Number(b.getAttribute('data-day')));
    showLoader('Загружаем день…'); await loadDay(); hideLoader(); renderApp();
  }));
  const pick = root.querySelector('[data-pick-date]');
  if (pick) pick.addEventListener('click', openCalendar);
  const cal = root.querySelector('[data-cal]');
  if (cal) cal.addEventListener('click', openCalendar);
  root.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', openGoalModal));
  root.querySelectorAll('[data-add-meal]').forEach((b) => b.addEventListener('click', () => openAddToMeal(b.getAttribute('data-add-meal'))));
  root.querySelectorAll('[data-entry]').forEach((b) => b.addEventListener('click', () => openEntryActions(Number(b.getAttribute('data-entry')))));

  const wr = root.querySelector('#water-range');
  if (wr) {
    const wl = root.querySelector('#water-val');
    const paintFill = () => {
      const pct = wr.max > 0 ? (wr.value / wr.max) * 100 : 0;
      wr.style.background = `linear-gradient(90deg, #6aa8e6 ${pct}%, #1a1d23 ${pct}%)`;
    };
    paintFill();
    wr.addEventListener('input', () => { wl.textContent = fmt(Number(wr.value)); paintFill(); });
    wr.addEventListener('change', () => setWater(Number(wr.value)));
  }
}

async function setWater(target) {
  const current = (state.day && state.day.water_ml) || 0;
  const delta = Math.round(target) - Math.round(current);
  if (delta === 0) return;
  try {
    await api('/api/tracker/water', { method: 'POST', json: { date: state.diaryDate, amount_ml: delta } });
    await reloadDay();
  } catch (err) { toast(err.message, 'error'); }
}

async function addWater(ml) {
  try {
    await api('/api/tracker/water', { method: 'POST', json: { date: state.diaryDate, amount_ml: ml } });
    await reloadDay();
  } catch (err) { toast(err.message, 'error'); }
}

/* Выбор способа добавления в приём пищи */
function openAddToMeal(mealType) {
  const label = (MEALS.find((m) => m.id === mealType) || {}).label || '';
  const modes = [
    { id: 'search', label: 'Поиск', icon: ICON.search },
    { id: 'photo', label: 'Камера', icon: ICON.camera },
    { id: 'barcode', label: 'Штрих-код', icon: ICON.barcode },
    { id: 'dish', label: 'Из меню', icon: ICON.grid },
    { id: 'manual', label: 'Вручную', icon: ICON.edit },
  ];
  const tabBtn = (m) => `
    <button data-mode="${m.id}" class="shrink-0 w-[4.5rem] flex flex-col items-center gap-1.5">
      <span data-tile class="w-14 h-14 grid place-items-center rounded-2xl border transition"><span class="w-6 h-6">${m.icon}</span></span>
      <span data-lbl class="text-[11px] transition">${m.label}</span>
    </button>`;
  const fieldCls = 'w-full bg-ink border border-line rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';

  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-3">Добавить — ${esc(label)}</h2>
      <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">${modes.map(tabBtn).join('')}</div>
      <div class="relative mt-4 mb-3">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted">${ICON.search}</span>
        <input id="am-q" placeholder="Что вы ели на ${esc(label.toLowerCase())}?" class="${fieldCls}" autocomplete="off" />
      </div>
      <div id="am-res" class="space-y-2 max-h-[46vh] overflow-y-auto no-scrollbar"></div>
      <button id="am-create" class="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-line bg-card text-sm text-accent hover:border-accent/50 transition"><span class="w-4 h-4">${ICON.plus}</span> Создать свой продукт</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const input = node.querySelector('#am-q');

  const paintTabs = (active) => node.querySelectorAll('[data-mode]').forEach((b) => {
    const on = b.getAttribute('data-mode') === active;
    const tile = b.querySelector('[data-tile]');
    const lbl = b.querySelector('[data-lbl]');
    tile.classList.toggle('bg-accent', on); tile.classList.toggle('text-ink', on); tile.classList.toggle('border-accent', on);
    tile.classList.toggle('bg-card', !on); tile.classList.toggle('text-accent', !on); tile.classList.toggle('border-line', !on);
    lbl.classList.toggle('text-white', on); lbl.classList.toggle('text-muted', !on);
  });
  paintTabs('search');

  node.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const m = b.getAttribute('data-mode');
    if (m === 'search') { input.focus(); return; }
    if (m === 'dish') openPickDish(mealType);
    else if (m === 'barcode') openBarcodeScanner(mealType);
    else if (m === 'photo') openPhotoFlow(mealType);
    else if (m === 'manual') openProductPortion(blankProduct(input.value.trim()), mealType, state.diaryDate);
  }));

  // Встроенный поиск (каталог + OFF), как в openProductSearch.
  const res = node.querySelector('#am-res');
  let timer = null, seq = 0;
  const msg = (text, cls = 'text-muted/70') => { res.innerHTML = `<p class="text-center text-sm ${cls} py-8">${text}</p>`; };
  const renderList = (items, heading) => {
    res.innerHTML = '';
    if (heading) res.insertAdjacentHTML('beforeend', `<p class="text-[11px] uppercase tracking-wider text-muted px-1 pb-1">${heading}</p>`);
    items.forEach((p) => {
      const badge = p.source === 'catalog' ? (p.is_mine ? `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">Мои</span>` : `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-line/40 text-muted border border-line">База</span>`) : (p.source === 'base' ? `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-line/40 text-muted border border-line">База</span>` : '');
      const b = h(`
        <button class="w-full flex items-center gap-3 p-2.5 rounded-xl border border-line bg-card hover:border-accent/50 transition text-left">
          ${p.image_url ? `<img src="${esc(p.image_url)}" class="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />` : `<span class="w-10 h-10 rounded-lg bg-ink grid place-items-center text-muted shrink-0">${ICON.barcode}</span>`}
          <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><p class="text-sm truncate">${esc(p.name)}</p>${badge}</div><p class="text-[11px] text-muted truncate">${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(p.calories)} ккал / 100 г</p></div>
          <span class="text-accent w-5 h-5 shrink-0">${ICON.plus}</span>
        </button>`);
      b.addEventListener('click', () => openProductPortion(p, mealType, state.diaryDate));
      res.appendChild(b);
    });
  };
  const showRecent = () => {
    const recent = (state.products || []).map((p) => ({ ...p, source: 'catalog' }));
    if (recent.length) renderList(recent.slice(0, 15), 'Недавние');
    else msg('Найдите продукт в базе или создайте свой');
  };
  const doSearch = async (q) => {
    const my = ++seq;
    msg('Ищем…', 'text-muted');
    try {
      const items = await api(`/api/products/search?q=${encodeURIComponent(q)}`);
      if (my !== seq) return;
      if (!items.length) { msg('Ничего не найдено — можно создать свой продукт'); return; }
      renderList(items);
    } catch (err) { if (my !== seq) return; msg(esc(err.message), 'text-red-300'); }
  };
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer); seq++;
    if (q.length < 2) { showRecent(); return; }
    timer = setTimeout(() => doSearch(q), 350);
  });
  node.querySelector('#am-create').addEventListener('click', () =>
    openProductPortion(blankProduct(input.value.trim()), mealType, state.diaryDate));

  (async () => { if (state.products === null) await loadProducts(); if (input.value.trim().length < 2) showRecent(); })();

  openModal(node);
  setTimeout(() => input.focus(), 60);
}

/* Список блюд меню для добавления в дневник */
async function openPickDish(mealType) {
  showLoader('Загружаем блюда…');
  let dishes = [];
  try { dishes = await api('/api/dishes'); } catch (err) { hideLoader(); return toast(err.message, 'error'); }
  hideLoader();

  const thumb = (d) => d.image_path
    ? `<img src="${esc(d.image_path)}" alt="" loading="lazy" class="w-11 h-11 rounded-lg object-cover shrink-0 bg-graphite" />`
    : `<div class="w-11 h-11 rounded-lg bg-graphite border border-line grid place-items-center text-muted shrink-0"><span class="w-5 h-5">${ICON.book}</span></div>`;
  const row = (d) => `
    <button data-dish="${d.id}" class="w-full flex items-center gap-3 p-2.5 rounded-xl border border-line bg-card hover:border-accent/50 transition text-left">
      ${thumb(d)}
      <div class="min-w-0 flex-1"><p class="text-sm truncate">${esc(d.title)}</p><p class="text-[11px] text-muted">${fmt(d.calories)} ккал${d.servings ? ' · ' + fmt(d.servings) + ' порц.' : ''}</p></div>
      <span class="text-accent w-5 h-5 shrink-0">${ICON.plus}</span>
    </button>`;

  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-3">Из меню</h2>
      <div class="relative mb-3">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${ICON.search}</span>
        <input id="pd-q" placeholder="Поиск блюда по названию" autocomplete="off" class="w-full bg-ink border border-line rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-accent/60 transition" />
      </div>
      <div id="pd-list" class="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar"></div>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);

  const listEl = node.querySelector('#pd-list');
  const render = (q) => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = tokens.length
      ? dishes.filter((d) => { const t = (d.title || '').toLowerCase(); return tokens.every((tok) => t.includes(tok)); })
      : dishes;
    listEl.innerHTML = filtered.length
      ? filtered.map(row).join('')
      : `<p class="text-center text-sm text-muted py-8">${dishes.length ? 'Ничего не найдено' : 'В меню пока нет блюд'}</p>`;
    listEl.querySelectorAll('[data-dish]').forEach((b) => b.addEventListener('click', () => {
      const dish = dishes.find((x) => x.id === Number(b.getAttribute('data-dish')));
      openServings(dish, mealType);
    }));
  };
  render('');
  const q = node.querySelector('#pd-q');
  q.addEventListener('input', () => render(q.value.trim()));
  openModal(node);
}

/* Ввод количества порций для блюда */
function openServings(dish, mealType) {
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-1">${esc(dish.title)}</h2>
      <p class="text-sm text-muted mb-4">${fmt(dish.calories)} ккал за порцию</p>
      <label class="text-xs text-muted mb-1 block">Сколько порций</label>
      <input id="srv" inputmode="decimal" value="1" class="w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
      <button id="srv-add" class="mt-4 w-full py-3 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Добавить</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelector('#srv-add').addEventListener('click', async () => {
    const servings = num(node.querySelector('#srv').value) || 1;
    try {
      await api('/api/tracker/entries/from-dish', { method: 'POST', json: { date: state.diaryDate, meal_type: mealType, dish_id: dish.id, servings } });
      closeModal();
      await reloadDay();
      toast('Добавлено в дневник', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Ручная запись / редактирование записи */
function openCustomEntry(mealType, existing = null) {
  const isEdit = !!existing;
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const v = (k, d = '') => (isEdit && existing[k] != null ? esc(String(existing[k])) : d);
  const unit = isEdit ? existing.unit : 'g';
  const unitOpt = (val, label) => `<option value="${val}"${unit === val ? ' selected' : ''}>${label}</option>`;

  const inner = `
    <div class="p-5 sm:p-6 space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar">
      <h2 class="text-lg font-semibold">${isEdit ? 'Изменить запись' : 'Своя запись'}</h2>
      <div><label class="text-xs text-muted mb-1 block">Название</label><input id="f-name" value="${v('name')}" placeholder="Например, Гречка с курицей" class="${fieldCls}" /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="text-xs text-muted mb-1 block">Количество</label><input id="f-amount" inputmode="decimal" value="${v('amount', '1')}" class="${fieldCls}" /></div>
        <div><label class="text-xs text-muted mb-1 block">Единица</label><select id="f-unit" class="${fieldCls}">${unitOpt('g', 'граммы')}${unitOpt('serving', 'порции')}${unitOpt('ml', 'мл')}</select></div>
      </div>
      <div class="rounded-2xl bg-card border border-line p-4">
        <p class="text-xs uppercase tracking-wider text-muted mb-3">КБЖУ записи (итого)</p>
        <div class="mb-3"><label class="text-xs text-muted mb-1 block">Калории, ккал</label><input id="f-cal" inputmode="decimal" value="${v('calories', '0')}" class="${fieldCls}" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-prot mb-1 block">Белки</label><input id="f-prot" inputmode="decimal" value="${v('proteins', '0')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-fat mb-1 block">Жиры</label><input id="f-fat" inputmode="decimal" value="${v('fats', '0')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input id="f-carb" inputmode="decimal" value="${v('carbohydrates', '0')}" class="${fieldCls}" /></div>
        </div>
      </div>
      <button id="f-save" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">${isEdit ? 'Сохранить' : 'Добавить'}</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);

  // Ввод Б/Ж/У автоматически считает калории.
  const recalcF = () => {
    node.querySelector('#f-cal').value = Math.round(
      num(node.querySelector('#f-prot').value) * 4 +
      num(node.querySelector('#f-fat').value) * 9 +
      num(node.querySelector('#f-carb').value) * 4
    );
  };
  ['#f-prot', '#f-fat', '#f-carb'].forEach((s) => node.querySelector(s).addEventListener('input', recalcF));

  // При редактировании смена количества (веса) пропорционально пересчитывает КБЖУ.
  if (isEdit) {
    const base = {
      amount: num(existing.amount) || 1,
      calories: num(existing.calories),
      proteins: num(existing.proteins),
      fats: num(existing.fats),
      carbohydrates: num(existing.carbohydrates),
    };
    node.querySelector('#f-amount').addEventListener('input', () => {
      if (base.amount <= 0) return;
      const k = (num(node.querySelector('#f-amount').value) || 0) / base.amount;
      node.querySelector('#f-cal').value = Math.round(base.calories * k);
      node.querySelector('#f-prot').value = Math.round(base.proteins * k * 10) / 10;
      node.querySelector('#f-fat').value = Math.round(base.fats * k * 10) / 10;
      node.querySelector('#f-carb').value = Math.round(base.carbohydrates * k * 10) / 10;
    });
  }

  node.querySelector('#f-save').addEventListener('click', async () => {
    const name = node.querySelector('#f-name').value.trim();
    if (!name) return toast('Введите название', 'error');
    const body = {
      meal_type: mealType,
      name,
      amount: num(node.querySelector('#f-amount').value) || 1,
      unit: node.querySelector('#f-unit').value,
      calories: num(node.querySelector('#f-cal').value),
      proteins: num(node.querySelector('#f-prot').value),
      fats: num(node.querySelector('#f-fat').value),
      carbohydrates: num(node.querySelector('#f-carb').value),
    };
    try {
      if (isEdit) {
        await api(`/api/tracker/entries/${existing.id}`, { method: 'PUT', json: body });
      } else {
        await api('/api/tracker/entries', { method: 'POST', json: { ...body, date: state.diaryDate, source_type: 'custom' } });
      }
      closeModal();
      await reloadDay();
      toast(isEdit ? 'Запись обновлена' : 'Добавлено', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Действия с записью: редактировать / удалить */
function openEntryActions(entryId) {
  let entry = null;
  for (const m of MEALS) {
    const found = (state.day?.meals?.[m.id] || []).find((e) => e.id === entryId);
    if (found) { entry = found; break; }
  }
  if (!entry) return;
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-base font-semibold mb-1 truncate">${esc(entry.name)}</h2>
      <p class="text-sm text-muted mb-4">${fmt(entry.calories)} ккал · Б ${fmt(entry.proteins)} · Ж ${fmt(entry.fats)} · У ${fmt(entry.carbohydrates)}</p>
      <div class="space-y-2">
        <button data-do="edit" class="w-full flex items-center gap-2 py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition justify-center">${ICON.edit} Редактировать</button>
        <button data-do="del" class="w-full flex items-center gap-2 py-3 rounded-xl border border-[#5b2630] text-red-300 text-sm hover:bg-[#2a1518] transition justify-center">${ICON.trash} Удалить</button>
      </div>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelector('[data-do="edit"]').addEventListener('click', () => openCustomEntry(entry.meal_type, entry));
  node.querySelector('[data-do="del"]').addEventListener('click', async () => {
    try {
      await api(`/api/tracker/entries/${entry.id}`, { method: 'DELETE' });
      closeModal();
      await reloadDay();
      toast('Запись удалена', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Пересчёт Б/Ж/У от калорий и режима (фитнес-логика). */
function macrosFor(cal, mode, weight) {
  cal = Math.max(0, cal || 0);
  let p, f, c; // в ккал
  if (weight > 0) {
    if (mode === 'deficit') {
      p = 2.2 * weight * 4;                 // белок высокий, фиксирован
      const rest = Math.max(0, cal - p);
      f = rest * 0.35;                       // дефицит за счёт жиров и углей
      c = rest * 0.65;
    } else if (mode === 'gain') {
      f = 1.0 * weight * 9;                  // жир — норма, фиксирован
      const rest = Math.max(0, cal - f);
      p = rest * 0.30;                       // профицит за счёт белков и углей
      c = rest * 0.70;
    } else {
      p = 1.8 * weight * 4;
      f = 1.0 * weight * 9;
      c = Math.max(0, cal - p - f);
    }
  } else {
    const split = mode === 'gain' ? [0.30, 0.20, 0.50]
      : mode === 'deficit' ? [0.40, 0.20, 0.40]
      : [0.30, 0.30, 0.40];
    p = cal * split[0]; f = cal * split[1]; c = cal * split[2];
  }
  return { proteins: Math.round(p / 4), fats: Math.round(f / 9), carbohydrates: Math.round(c / 4) };
}

/* Цель КБЖУ + калькулятор Миффлина с режимами */
function openGoalModal() {
  const g = state.day?.goal || {};
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const gv = (k, d = '') => (g[k] != null ? esc(String(g[k])) : d);
  const actOpt = (val, label) => `<option value="${val}"${Number(g.activity) === val ? ' selected' : ''}>${label}</option>`;
  const sexOpt = (val, label) => `<option value="${val}"${g.sex === val ? ' selected' : ''}>${label}</option>`;

  let mode = g.mode || 'maintenance';
  const MODES = [['gain', 'Набор'], ['maintenance', 'Поддержание'], ['deficit', 'Дефицит']];
  const modeBtns = MODES.map(([id, label]) =>
    `<button data-mode-sel="${id}" class="flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition">${label}</button>`
  ).join('');

  const inner = `
    <div class="flex flex-col max-h-[90vh]">
      <div class="p-5 sm:p-6 space-y-4 overflow-y-auto no-scrollbar">
      <h2 class="text-lg font-semibold">Цель</h2>

      <div class="flex gap-1 p-1 rounded-xl bg-ink border border-line">${modeBtns}</div>

      <div class="rounded-2xl bg-card border border-line p-4 space-y-3">
        <p class="text-xs uppercase tracking-wider text-muted">Калькулятор (необязательно)</p>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-muted mb-1 block">Пол</label><select id="g-sex" class="${fieldCls}">${sexOpt('male', 'Мужской')}${sexOpt('female', 'Женский')}</select></div>
          <div><label class="text-xs text-muted mb-1 block">Возраст</label><input id="g-age" inputmode="numeric" value="${gv('age')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-muted mb-1 block">Рост, см</label><input id="g-h" inputmode="decimal" value="${gv('height_cm')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-muted mb-1 block">Вес, кг</label><input id="g-w" inputmode="decimal" value="${gv('weight_kg')}" class="${fieldCls}" /></div>
        </div>
        <div><label class="text-xs text-muted mb-1 block">Активность</label><select id="g-act" class="${fieldCls}">${actOpt(1.2, 'Минимальная')}${actOpt(1.375, 'Лёгкая (1–3 трен/нед)')}${actOpt(1.55, 'Средняя (3–5)')}${actOpt(1.725, 'Высокая (6–7)')}${actOpt(1.9, 'Очень высокая')}</select></div>
        <button id="g-calc" class="w-full py-2.5 rounded-xl border border-accent/40 bg-accent/10 text-accent text-sm font-medium hover:bg-accent/15 transition">Рассчитать</button>
        <p class="text-[11px] text-muted/80">Калории — главный рычаг: меняешь их, и Б/Ж/У пересчитываются под режим. Жиры держим на норме или ниже.</p>
      </div>

      <div class="rounded-2xl bg-card border border-line p-4 space-y-3">
        <p class="text-xs uppercase tracking-wider text-muted">Цель на день</p>
        <div><label class="text-xs text-muted mb-1 block">Калории, ккал</label><input id="g-cal" inputmode="decimal" value="${gv('target_calories', '0')}" class="${fieldCls}" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-prot mb-1 block">Белки</label><input id="g-prot" inputmode="decimal" value="${gv('target_proteins', '0')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-fat mb-1 block">Жиры</label><input id="g-fat" inputmode="decimal" value="${gv('target_fats', '0')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input id="g-carb" inputmode="decimal" value="${gv('target_carbohydrates', '0')}" class="${fieldCls}" /></div>
        </div>
        <div><label class="text-xs text-muted mb-1 block">Вода, мл</label><input id="g-water" inputmode="numeric" value="${gv('target_water_ml', '2000')}" class="${fieldCls}" /></div>
      </div>

      </div>

      <div class="px-5 sm:px-6 pt-3 pb-4 bg-graphite border-t border-line">
        <button id="g-save" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Сохранить цель</button>
      </div>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const $ = (sel) => node.querySelector(sel);
  const factor = { gain: 1.15, maintenance: 1.0, deficit: 0.80 };

  const computeTdee = () => {
    const age = num($('#g-age').value), h = num($('#g-h').value), w = num($('#g-w').value);
    const act = num($('#g-act').value) || 1.2;
    if (!age || !h || !w) return 0;
    const bmr = 10 * w + 6.25 * h - 5 * age + ($('#g-sex').value === 'female' ? -161 : 5);
    return bmr * act;
  };
  const fillMacros = () => {
    const m = macrosFor(num($('#g-cal').value), mode, num($('#g-w').value));
    $('#g-prot').value = m.proteins; $('#g-fat').value = m.fats; $('#g-carb').value = m.carbohydrates;
  };
  const paintModes = () => node.querySelectorAll('[data-mode-sel]').forEach((b) => {
    const on = b.getAttribute('data-mode-sel') === mode;
    b.classList.toggle('bg-accent', on);
    b.classList.toggle('text-ink', on);
    b.classList.toggle('text-muted', !on);
  });
  paintModes();

  node.querySelectorAll('[data-mode-sel]').forEach((b) => b.addEventListener('click', () => {
    mode = b.getAttribute('data-mode-sel');
    paintModes();
    const tdee = computeTdee();
    if (tdee > 0) $('#g-cal').value = Math.round(tdee * factor[mode]);
    fillMacros();
  }));

  $('#g-calc').addEventListener('click', () => {
    const tdee = computeTdee();
    if (!tdee) return toast('Заполните пол, возраст, рост и вес', 'error');
    $('#g-cal').value = Math.round(tdee * factor[mode]);
    $('#g-water').value = Math.round(num($('#g-w').value) * 30) || 2000;
    fillMacros();
    toast('Рассчитано — проверьте и сохраните', 'success');
  });

  $('#g-cal').addEventListener('input', fillMacros);

  // Обратная связь: правка любого макроса пересчитывает калории как сумму Б/Ж/У.
  const recalcCal = () => {
    const p = num($('#g-prot').value), f = num($('#g-fat').value), c = num($('#g-carb').value);
    $('#g-cal').value = Math.round(p * 4 + f * 9 + c * 4);
  };
  ['#g-prot', '#g-fat', '#g-carb'].forEach((sel) => $(sel).addEventListener('input', recalcCal));

  $('#g-save').addEventListener('click', async () => {
    const body = {
      target_calories: num($('#g-cal').value),
      target_proteins: num($('#g-prot').value),
      target_fats: num($('#g-fat').value),
      target_carbohydrates: num($('#g-carb').value),
      target_water_ml: Math.round(num($('#g-water').value)) || 2000,
      sex: $('#g-sex').value,
      age: Math.round(num($('#g-age').value)) || null,
      height_cm: num($('#g-h').value) || null,
      weight_kg: num($('#g-w').value) || null,
      activity: num($('#g-act').value) || null,
      mode,
    };
    try {
      await api('/api/tracker/goal', { method: 'PUT', json: body });
      closeModal();
      await reloadDay();
      toast('Цель сохранена', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Полный календарь выбора дня */
function openCalendar() {
  let [vy, vm] = state.diaryDate.split('-').map(Number); // vm: 1-12
  const node = modalShell('<div id="cal-body" class="p-5 sm:p-6"></div>');
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const body = node.querySelector('#cal-body');

  const go = async (ds) => {
    state.diaryDate = ds; closeModal();
    showLoader('Загружаем день…'); await loadDay(); hideLoader(); renderApp();
  };

  // Подсветка дней, где есть записи о еде (точка под числом).
  const decorate = async () => {
    const p2 = (n) => String(n).padStart(2, '0');
    const dim = new Date(vy, vm, 0).getDate();
    const start = `${vy}-${p2(vm)}-01`, end = `${vy}-${p2(vm)}-${p2(dim)}`;
    try {
      const res = await api(`/api/tracker/marked?start=${start}&end=${end}`);
      const marked = new Set(res.dates || []);
      body.querySelectorAll('[data-pick]').forEach((b) => {
        const ds = b.getAttribute('data-pick');
        if (!marked.has(ds)) return;
        const dot = document.createElement('span');
        dot.className = `absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${ds === state.diaryDate ? 'bg-ink/70' : 'bg-accent'}`;
        b.appendChild(dot);
      });
    } catch (_) { /* отметки необязательны */ }
  };

  function draw() {
    const first = new Date(vy, vm - 1, 1);
    const startWd = (first.getDay() + 6) % 7;            // Пн = 0
    const days = new Date(vy, vm, 0).getDate();
    const monthName = first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    const today = todayStr();
    const cells = [];
    for (let i = 0; i < startWd; i++) cells.push('<div></div>');
    for (let d = 1; d <= days; d++) {
      const ds = `${vy}-${String(vm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sel = ds === state.diaryDate, tod = ds === today;
      cells.push(`<button data-pick="${ds}" class="relative aspect-square rounded-lg text-sm flex items-center justify-center transition ${
        sel ? 'bg-accent text-ink font-semibold' : tod ? 'border border-accent/50 text-accent' : 'text-gray-200 hover:bg-ink'
      }">${d}</button>`);
    }
    body.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <button id="cal-prev" class="w-9 h-9 grid place-items-center rounded-full border border-line text-muted hover:text-white"><span class="w-5 h-5">${ICON.chevL}</span></button>
        <p class="text-sm font-medium capitalize">${monthName}</p>
        <button id="cal-next" class="w-9 h-9 grid place-items-center rounded-full border border-line text-muted hover:text-white"><span class="w-5 h-5">${ICON.chevR}</span></button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-1">${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => `<div>${w}</div>`).join('')}</div>
      <div class="grid grid-cols-7 gap-1">${cells.join('')}</div>
      <button id="cal-today" class="mt-4 w-full py-2.5 rounded-xl border border-line text-sm text-accent hover:bg-card transition">Сегодня</button>`;
    body.querySelector('#cal-prev').onclick = () => { vm--; if (vm < 1) { vm = 12; vy--; } draw(); };
    body.querySelector('#cal-next').onclick = () => { vm++; if (vm > 12) { vm = 1; vy++; } draw(); };
    body.querySelector('#cal-today').onclick = () => go(today);
    body.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => go(b.getAttribute('data-pick')); });
    decorate();
  }
  draw();
  openModal(node);
}

/* ------------------------------ Продукты -------------------------------- */
function guessMeal() {
  const hr = new Date().getHours();
  if (hr < 11) return 'breakfast';
  if (hr < 16) return 'lunch';
  if (hr < 21) return 'dinner';
  return 'snack';
}

async function loadProducts() {
  try { state.products = await api('/api/products'); }
  catch (err) { toast(err.message, 'error'); state.products = []; }
}

function renderProducts() {
  const grid = document.getElementById('prod-grid');
  if (!grid) return;
  const items = state.products || [];
  if (!items.length) {
    grid.innerHTML = `
      <div class="col-span-full text-center text-muted py-16">
        <div class="w-14 h-14 mx-auto rounded-2xl border border-line grid place-items-center mb-4 text-accent"><span class="w-5 h-5 inline-block">${ICON.barcode}</span></div>
        <p class="text-base text-gray-200">Пока нет продуктов</p>
        <p class="text-sm mt-1 text-muted/80 max-w-xs mx-auto">Добавьте продукт в дневник через поиск или штрих-код — он сохранится здесь для быстрого повторного добавления.</p>
      </div>`;
    return;
  }
  grid.innerHTML = '';
  items.forEach((p) => grid.appendChild(productCard(p)));
}

function productCard(p) {
  const card = h(`
    <article class="fadein relative rounded-2xl overflow-hidden bg-card border border-line cursor-pointer hover:border-line/80 transition">
      <div class="relative aspect-square bg-graphite">
        ${p.image_url
          ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" class="w-full h-full object-cover" />`
          : `<div class="absolute inset-0 flex flex-col items-center justify-center text-center px-3"><div class="w-9 h-9 rounded-full border border-line grid place-items-center text-muted mb-2">${ICON.barcode}</div><p class="text-[11px] text-muted/80">Продукт</p></div>`}
        <button data-add-diary class="absolute top-2 right-2 z-10 w-8 h-8 grid place-items-center rounded-full bg-ink/70 backdrop-blur border border-line text-accent hover:bg-accent hover:text-ink transition" title="В дневник"><span class="w-4 h-4">${ICON.plus}</span></button>
        <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 class="text-sm font-medium leading-snug line-clamp-2">${esc(p.name)}</h3>
          <p class="text-[11px] text-accent/80 mt-0.5">${fmt(p.calories)} ккал / 100 г</p>
        </div>
      </div>
    </article>`);
  card.addEventListener('click', () => openProductActions(p));
  card.querySelector('[data-add-diary]').addEventListener('click', (e) => { e.stopPropagation(); openProductPortion(p, null, todayStr()); });
  return card;
}

function openProductActions(p) {
  const owner = p.is_mine
    ? `
        <button data-do="edit" class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition">${ICON.edit} Изменить КБЖУ</button>
        <button data-do="del" class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#5b2630] text-red-300 text-sm hover:bg-[#2a1518] transition">${ICON.trash} Удалить</button>`
    : `<p class="text-xs text-muted text-center pt-1">${p.author ? 'Добавил: ' + esc(p.author) + ' · ' : ''}редактировать может только автор</p>`;
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-base font-semibold mb-1 truncate">${esc(p.name)}</h2>
      <p class="text-sm text-muted mb-4">${fmt(p.calories)} ккал · Б ${fmt(p.proteins)} · Ж ${fmt(p.fats)} · У ${fmt(p.carbohydrates)} / 100 г</p>
      <div class="space-y-2">
        <button data-do="add" class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-ink text-sm font-semibold hover:bg-[#eecb96] transition"><span class="w-4 h-4">${ICON.plus}</span> В дневник</button>
        ${owner}
      </div>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelector('[data-do="add"]').addEventListener('click', () => openProductPortion(p, null, todayStr()));
  const editBtn = node.querySelector('[data-do="edit"]');
  if (editBtn) editBtn.addEventListener('click', () => openProductEdit(p));
  const delBtn = node.querySelector('[data-do="del"]');
  if (delBtn) delBtn.addEventListener('click', async () => {
    try {
      await api(`/api/products/${p.id}`, { method: 'DELETE' });
      closeModal();
      await loadProducts(); renderApp();
      toast('Продукт удалён', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

function openProductEdit(p) {
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const inner = `
    <div class="p-5 sm:p-6 space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar">
      <h2 class="text-lg font-semibold">Изменить продукт</h2>
      <div><label class="text-xs text-muted mb-1 block">Название</label><input id="p-name" value="${esc(p.name)}" class="${fieldCls}" /></div>
      <div class="rounded-2xl bg-card border border-line p-4">
        <p class="text-xs uppercase tracking-wider text-muted mb-3">КБЖУ на 100 г</p>
        <div class="mb-3"><label class="text-xs text-muted mb-1 block">Калории</label><input id="p-cal" inputmode="decimal" value="${esc(String(p.calories))}" class="${fieldCls}" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-prot mb-1 block">Белки</label><input id="p-prot" inputmode="decimal" value="${esc(String(p.proteins))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-fat mb-1 block">Жиры</label><input id="p-fat" inputmode="decimal" value="${esc(String(p.fats))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input id="p-carb" inputmode="decimal" value="${esc(String(p.carbohydrates))}" class="${fieldCls}" /></div>
        </div>
      </div>
      <button id="p-save" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Сохранить</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);

  // Ввод Б/Ж/У автоматически считает калории на 100 г.
  const recalc = () => {
    node.querySelector('#p-cal').value = Math.round(
      num(node.querySelector('#p-prot').value) * 4 +
      num(node.querySelector('#p-fat').value) * 9 +
      num(node.querySelector('#p-carb').value) * 4
    );
  };
  ['#p-prot', '#p-fat', '#p-carb'].forEach((s) => node.querySelector(s).addEventListener('input', recalc));

  node.querySelector('#p-save').addEventListener('click', async () => {
    const name = node.querySelector('#p-name').value.trim();
    if (!name) return toast('Введите название', 'error');
    const body = {
      barcode: p.barcode || null, name,
      calories: num(node.querySelector('#p-cal').value),
      proteins: num(node.querySelector('#p-prot').value),
      fats: num(node.querySelector('#p-fat').value),
      carbohydrates: num(node.querySelector('#p-carb').value),
      serving_size_g: p.serving_size_g || null,
      image_url: p.image_url || null,
    };
    try {
      await api(`/api/products/${p.id}`, { method: 'PUT', json: body });
      closeModal();
      await loadProducts(); renderApp();
      toast('Сохранено', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Порция продукта: приём + граммы + правка КБЖУ на 100 г */
function openProductPortion(product, mealType = null, date = null) {
  const d = date || state.diaryDate || todayStr();
  let meal = mealType || guessMeal();
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const mealBtns = MEALS.map((m) => `<button data-meal="${m.id}" class="py-2 rounded-lg text-xs font-medium transition">${m.label}</button>`).join('');
  const g0 = product.serving_size_g && product.serving_size_g > 0 ? product.serving_size_g : 100;

  const inner = `
    <div class="p-5 sm:p-6 space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar">
      <div><label class="text-xs text-muted mb-1 block">Название</label><input id="pp-name" value="${esc(product.name || '')}" placeholder="Название продукта" class="${fieldCls}" /></div>
      ${product.brand ? `<p class="text-[11px] text-muted -mt-1">${esc(product.brand)}</p>` : ''}

      <div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink border border-line">${mealBtns}</div>

      <div><label class="text-xs text-muted mb-1 block">Сколько грамм</label><input id="pp-g" inputmode="decimal" value="${g0}" class="${fieldCls}" /></div>

      <div class="rounded-2xl bg-card border border-line p-4">
        <div class="flex items-center justify-between mb-3"><p class="text-xs uppercase tracking-wider text-muted">КБЖУ на 100 г</p><span class="text-[11px] text-muted/70">правьте при неточности</span></div>
        <div class="mb-3"><label class="text-xs text-muted mb-1 block">Калории</label><input id="pp-cal" inputmode="decimal" value="${esc(String(product.calories))}" class="${fieldCls}" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-prot mb-1 block">Белки</label><input id="pp-prot" inputmode="decimal" value="${esc(String(product.proteins))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-fat mb-1 block">Жиры</label><input id="pp-fat" inputmode="decimal" value="${esc(String(product.fats))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input id="pp-carb" inputmode="decimal" value="${esc(String(product.carbohydrates))}" class="${fieldCls}" /></div>
        </div>
      </div>

      <div class="flex items-center justify-between rounded-xl bg-card border border-line px-4 py-3">
        <span class="text-sm text-muted">Итого в порции</span>
        <span id="pp-total" class="text-sm font-semibold text-accent">— ккал</span>
      </div>

      <button id="pp-add" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Добавить в дневник</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const $ = (s) => node.querySelector(s);

  const paintMeal = () => node.querySelectorAll('[data-meal]').forEach((b) => {
    const on = b.getAttribute('data-meal') === meal;
    b.classList.toggle('bg-accent', on); b.classList.toggle('text-ink', on); b.classList.toggle('text-muted', !on);
  });
  const updateTotal = () => {
    const g = num($('#pp-g').value) || 0;
    $('#pp-total').textContent = `${fmt(Math.round(num($('#pp-cal').value) * g / 100))} ккал`;
  };
  paintMeal(); updateTotal();
  node.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => { meal = b.getAttribute('data-meal'); paintMeal(); }));
  ['#pp-g', '#pp-cal'].forEach((s) => $(s).addEventListener('input', updateTotal));

  // Ввод Б/Ж/У автоматически считает калории на 100 г.
  const recalcCal = () => {
    $('#pp-cal').value = Math.round(num($('#pp-prot').value) * 4 + num($('#pp-fat').value) * 9 + num($('#pp-carb').value) * 4);
    updateTotal();
  };
  ['#pp-prot', '#pp-fat', '#pp-carb'].forEach((s) => $(s).addEventListener('input', recalcCal));

  $('#pp-add').addEventListener('click', async () => {
    const name = $('#pp-name').value.trim();
    if (!name) return toast('Введите название', 'error');
    const grams = num($('#pp-g').value) || 100;
    const body = {
      date: d, meal_type: meal, grams,
      product_id: product.id || null,
      barcode: product.barcode || null,
      name, brand: product.brand || null,
      calories_100: num($('#pp-cal').value),
      proteins_100: num($('#pp-prot').value),
      fats_100: num($('#pp-fat').value),
      carbohydrates_100: num($('#pp-carb').value),
      serving_size_g: product.serving_size_g || null,
      image_url: product.image_url || null,
      save_to_catalog: true,
    };
    try {
      await api('/api/tracker/entries/from-product', { method: 'POST', json: body });
      closeModal();
      toast('Добавлено в дневник', 'success');
      state.products = null; // каталог обновился
      if (state.tab === 'diary' && state.diaryDate === d) await reloadDay();
      else if (state.tab === 'menu' && state.menuMode === 'products') { await loadProducts(); renderApp(); }
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* Поиск продукта в OFF */
const blankProduct = (name, barcode = null) => ({
  source: 'custom', id: null, barcode: barcode || null, name: name || '', brand: null,
  calories: 0, proteins: 0, fats: 0, carbohydrates: 0, serving_size_g: null, image_url: null,
});

function openProductSearch(mealType) {
  const fieldCls = 'w-full bg-ink border border-line rounded-xl pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-3">Поиск продукта</h2>
      <div class="relative mb-3">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted">${ICON.search}</span>
        <input id="ps-q" placeholder="Например, творог 5%" class="${fieldCls}" autocomplete="off" />
      </div>
      <div id="ps-res" class="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar"></div>
      <button id="ps-create" class="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-line bg-card text-sm text-accent hover:border-accent/50 transition"><span class="w-4 h-4">${ICON.plus}</span> Создать свой продукт</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const res = node.querySelector('#ps-res');
  const input = node.querySelector('#ps-q');
  let timer = null, seq = 0;

  const msg = (text, cls = 'text-muted/70') =>
    { res.innerHTML = `<p class="text-center text-sm ${cls} py-8">${text}</p>`; };

  const renderList = (items, heading) => {
    res.innerHTML = '';
    if (heading) res.insertAdjacentHTML('beforeend', `<p class="text-[11px] uppercase tracking-wider text-muted px-1 pb-1">${heading}</p>`);
    items.forEach((p) => {
      const badge = p.source === 'catalog'
        ? (p.is_mine ? `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">Мои</span>` : `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-line/40 text-muted border border-line">База</span>`) : (p.source === 'base' ? `<span class="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-line/40 text-muted border border-line">База</span>` : '');
      const b = h(`
        <button class="w-full flex items-center gap-3 p-2.5 rounded-xl border border-line bg-card hover:border-accent/50 transition text-left">
          ${p.image_url ? `<img src="${esc(p.image_url)}" class="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />` : `<span class="w-10 h-10 rounded-lg bg-ink grid place-items-center text-muted shrink-0">${ICON.barcode}</span>`}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2"><p class="text-sm truncate">${esc(p.name)}</p>${badge}</div>
            <p class="text-[11px] text-muted truncate">${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(p.calories)} ккал / 100 г</p>
          </div>
        </button>`);
      b.addEventListener('click', () => openProductPortion(p, mealType, state.diaryDate));
      res.appendChild(b);
    });
  };

  const showRecent = () => {
    const recent = (state.products || []).map((p) => ({ ...p, source: 'catalog' }));
    if (recent.length) renderList(recent.slice(0, 15), 'Недавние');
    else msg('Введите название или создайте свой продукт');
  };

  const doSearch = async (q) => {
    const my = ++seq;
    msg('Ищем…', 'text-muted');
    try {
      const items = await api(`/api/products/search?q=${encodeURIComponent(q)}`);
      if (my !== seq) return;
      if (!items.length) { msg('Ничего не найдено — можно создать свой продукт'); return; }
      renderList(items);
    } catch (err) {
      if (my !== seq) return;
      msg(esc(err.message), 'text-red-300');
    }
  };

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);
    seq++;
    if (q.length < 2) { showRecent(); return; }
    timer = setTimeout(() => doSearch(q), 350);
  });

  node.querySelector('#ps-create').addEventListener('click', () =>
    openProductPortion(blankProduct(input.value.trim()), mealType, state.diaryDate));

  (async () => {
    if (state.products === null) await loadProducts();
    if (input.value.trim().length < 2) showRecent();
  })();

  openModal(node);
  setTimeout(() => input.focus(), 50);
}

/* Общий разбор найденного штрих-кода: каталог/кэш/OFF, при 404 — создать со штрих-кодом */
async function lookupBarcode(code, mealType) {
  showLoader('Ищем продукт…');
  try {
    const p = await api(`/api/products/barcode/${code}`);
    hideLoader();
    openProductPortion(p, mealType, state.diaryDate);
  } catch (err) {
    hideLoader();
    if (err.status === 404) {
      toast('Не найдено — добавьте вручную', 'info');
      openProductPortion(blankProduct('', code), mealType, state.diaryDate);
    } else {
      toast(err.message || 'Ошибка поиска', 'error');
    }
  }
}

function loadZXing() {
  return new Promise((resolve, reject) => {
    if (window.ZXing) return resolve(window.ZXing);
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
    s.async = true;
    s.onload = () => (window.ZXing ? resolve(window.ZXing) : reject(new Error('Сканер не загрузился')));
    s.onerror = () => reject(new Error('Не удалось загрузить сканер'));
    document.head.appendChild(s);
  });
}

/* Сканирование штрих-кода камерой (ZXing) */
function openBarcodeScanner(mealType) {
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-1">Сканирование</h2>
      <p class="text-sm text-muted mb-4">Наведите камеру на штрих-код продукта</p>
      <div class="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
        <video id="scan-video" playsinline muted autoplay class="w-full h-full object-cover"></video>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="w-4/5 h-28 border-2 border-accent/80 rounded-xl"></div>
        </div>
        <div id="scan-status" class="absolute bottom-0 inset-x-0 p-3 text-center text-xs text-white/90 bg-gradient-to-t from-black/70 to-transparent">Запуск камеры…</div>
      </div>
      <button id="scan-manual" class="mt-4 w-full py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition flex items-center justify-center gap-2"><span class="w-4 h-4">${ICON.edit}</span> Ввести номер вручную</button>
    </div>`;
  const node = modalShell(inner);
  const video = node.querySelector('#scan-video');
  const status = node.querySelector('#scan-status');
  let reader = null, stopped = false;

  const stop = () => {
    stopped = true;
    try { reader && reader.reset(); } catch (_) {}
    const s = video && video.srcObject;
    if (s && s.getTracks) s.getTracks().forEach((t) => t.stop());
  };

  node.querySelector('[data-close]').addEventListener('click', () => closeModal());
  node.querySelector('#scan-manual').addEventListener('click', () => { stop(); openBarcodeManual(mealType); });

  openModal(node);          // закроет предыдущее окно (на этом этапе сканер ещё не активен)
  activeScanner = stop;     // теперь любое закрытие окна остановит камеру

  (async () => {
    let ZX;
    try { ZX = await loadZXing(); }
    catch (_) { status.textContent = 'Сканер недоступен — нажмите «Ввести вручную».'; return; }
    if (stopped) return;
    try {
      const hints = new Map();
      hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [
        ZX.BarcodeFormat.EAN_13, ZX.BarcodeFormat.EAN_8,
        ZX.BarcodeFormat.UPC_A, ZX.BarcodeFormat.UPC_E,
      ]);
      reader = new ZX.BrowserMultiFormatReader(hints);
      status.textContent = 'Наведите на штрих-код';
      await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        video,
        (result) => {
          if (!result || stopped) return;
          const code = (result.getText && result.getText()) || result.text || '';
          if (!/^\d{6,}$/.test(code)) return;
          stop();
          if (navigator.vibrate) navigator.vibrate(60);
          closeModal();
          lookupBarcode(code, mealType);
        }
      );
    } catch (e) {
      if (stopped) return;
      const name = e && e.name;
      status.textContent = (name === 'NotAllowedError')
        ? 'Нет доступа к камере. Разрешите доступ или введите номер вручную.'
        : 'Камера недоступна — нажмите «Ввести вручную».';
    }
  })();
}

/* Ручной ввод штрих-кода (запасной вариант) */
function openBarcodeManual(mealType) {
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-1">Штрих-код</h2>
      <p class="text-sm text-muted mb-4">Введите номер под штрих-кодом (EAN/UPC)</p>
      <input id="bc" inputmode="numeric" placeholder="Например, 4600000000000" class="${fieldCls} mb-3" autocomplete="off" />
      <button id="bc-find" class="w-full py-3 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Найти</button>
      <button id="bc-scan" class="mt-2 w-full py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition flex items-center justify-center gap-2"><span class="w-4 h-4">${ICON.camera}</span> Сканировать камерой</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const find = () => {
    const code = node.querySelector('#bc').value.trim();
    if (!/^\d{6,}$/.test(code)) return toast('Введите корректный штрих-код', 'error');
    lookupBarcode(code, mealType);
  };
  node.querySelector('#bc-find').addEventListener('click', find);
  node.querySelector('#bc').addEventListener('keydown', (e) => { if (e.key === 'Enter') find(); });
  node.querySelector('#bc-scan').addEventListener('click', () => openBarcodeScanner(mealType));
  openModal(node);
  setTimeout(() => node.querySelector('#bc').focus(), 50);
}

/* ------------------------- Оценка калорий по фото ------------------------ */
function compressImage(file, maxDim = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось обработать фото'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть фото')); };
    img.src = url;
  });
}

function openPhotoFlow(mealType) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.className = 'hidden';
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    showLoader('Анализируем фото…');
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append('image', blob, 'photo.jpg');
      const est = await apiForm('/api/products/estimate-photo', fd);
      hideLoader();
      openPhotoReview(est, mealType);
    } catch (err) {
      hideLoader();
      toast(err.message || 'Не удалось распознать фото', 'error');
    }
  });
  input.click();
}

function openPhotoReview(est, mealType) {
  const d = state.diaryDate || todayStr();
  let meal = mealType || guessMeal();
  const fieldCls = 'w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 transition';
  const conf = ({ high: ['высокая', 'text-emerald-300'], medium: ['средняя', 'text-amber-300'], low: ['низкая', 'text-red-300'] })[est.confidence] || ['низкая', 'text-red-300'];
  const mealBtns = MEALS.map((m) => `<button data-meal="${m.id}" class="py-2 rounded-lg text-xs font-medium transition">${m.label}</button>`).join('');

  const inner = `
    <div class="p-5 sm:p-6 space-y-3 max-h-[85vh] overflow-y-auto no-scrollbar">
      <h2 class="text-lg font-semibold">Оценка по фото</h2>
      <div class="flex items-start gap-2 text-xs rounded-xl bg-card border border-line px-3 py-2.5">
        <span class="w-4 h-4 shrink-0 ${conf[1]}">${ICON.spark}</span>
        <span class="text-muted">Оценка приблизительная · уверенность: <span class="${conf[1]}">${conf[0]}</span>. Проверьте и поправьте значения перед сохранением.</span>
      </div>
      <div><label class="text-xs text-muted mb-1 block">Название</label><input id="ph-name" value="${esc(est.name || '')}" placeholder="Что на фото" class="${fieldCls}" /></div>
      <div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink border border-line">${mealBtns}</div>
      <div class="rounded-2xl bg-card border border-line p-4">
        <p class="text-xs uppercase tracking-wider text-muted mb-3">КБЖУ порции</p>
        <div class="mb-3"><label class="text-xs text-muted mb-1 block">Калории</label><input id="ph-cal" inputmode="decimal" value="${esc(String(est.calories || 0))}" class="${fieldCls}" /></div>
        <div class="grid grid-cols-3 gap-2">
          <div><label class="text-xs text-prot mb-1 block">Белки</label><input id="ph-prot" inputmode="decimal" value="${esc(String(est.proteins || 0))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-fat mb-1 block">Жиры</label><input id="ph-fat" inputmode="decimal" value="${esc(String(est.fats || 0))}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input id="ph-carb" inputmode="decimal" value="${esc(String(est.carbohydrates || 0))}" class="${fieldCls}" /></div>
        </div>
      </div>
      <button id="ph-add" class="w-full py-3.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Добавить в дневник</button>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  const $ = (s) => node.querySelector(s);

  const paintMeal = () => node.querySelectorAll('[data-meal]').forEach((b) => {
    const on = b.getAttribute('data-meal') === meal;
    b.classList.toggle('bg-accent', on); b.classList.toggle('text-ink', on); b.classList.toggle('text-muted', !on);
  });
  paintMeal();
  node.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => { meal = b.getAttribute('data-meal'); paintMeal(); }));

  // Правка Б/Ж/У пересчитывает калории.
  const recalc = () => { $('#ph-cal').value = Math.round(num($('#ph-prot').value) * 4 + num($('#ph-fat').value) * 9 + num($('#ph-carb').value) * 4); };
  ['#ph-prot', '#ph-fat', '#ph-carb'].forEach((s) => $(s).addEventListener('input', recalc));

  $('#ph-add').addEventListener('click', async () => {
    const name = $('#ph-name').value.trim();
    if (!name) return toast('Введите название', 'error');
    try {
      await api('/api/tracker/entries', { method: 'POST', json: {
        date: d, meal_type: meal, name, amount: 1, unit: 'serving', source_type: 'photo',
        calories: num($('#ph-cal').value), proteins: num($('#ph-prot').value),
        fats: num($('#ph-fat').value), carbohydrates: num($('#ph-carb').value),
      } });
      closeModal();
      toast('Добавлено в дневник', 'success');
      if (state.tab === 'diary' && state.diaryDate === d) await reloadDay();
    } catch (err) { toast(err.message, 'error'); }
  });
  openModal(node);
}

/* --------------------------- Нижняя навигация --------------------------- */
function navBar() {
  const tabBtn = (id, icon, label) => `
    <button data-tab="${id}" class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 ${
      state.tab === id ? 'text-accent' : 'text-muted hover:text-white'
    } transition">
      <span class="w-6 h-6">${icon}</span>
      <span class="text-[11px] font-medium">${label}</span>
    </button>`;
  return h(`
    <nav style="padding-bottom: env(safe-area-inset-bottom)" class="fixed bottom-0 inset-x-0 z-50 bg-graphite/95 backdrop-blur-md border-t border-line">
      <div class="max-w-6xl mx-auto flex">
        ${tabBtn('menu', ICON.grid, 'Меню')}
        ${tabBtn('diary', ICON.book, 'Дневник')}
      </div>
    </nav>`);
}

function wireNav(root) {
  root.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const t = btn.getAttribute('data-tab');
      if (state.tab === t) return;
      if (t === 'diary') {
        if (!state.diaryDate) state.diaryDate = todayStr();
        showLoader('Загружаем дневник…');
        await loadDay();
        hideLoader();
      }
      state.tab = t;
      renderApp();
    });
  });
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
        <button data-add-diary class="absolute top-2 right-2 z-10 w-8 h-8 grid place-items-center rounded-full bg-ink/70 backdrop-blur border border-line text-accent hover:bg-accent hover:text-ink transition" title="Добавить в дневник"><span class="w-4 h-4">${ICON.plus}</span></button>
        <!-- Плашка с названием -->
        <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <h3 class="text-sm font-medium leading-snug line-clamp-2">${esc(dish.title)}</h3>
          <p class="text-[11px] text-accent/80 mt-0.5">${fmt(dish.calories)} ккал</p>
        </div>
      </div>
    </article>`);

  card.addEventListener('click', () => openDetailModal(dish));

  const diaryBtn = card.querySelector('[data-add-diary]');
  if (diaryBtn) diaryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    quickAddDishToDiary(dish);
  });

  const genBtn = card.querySelector('[data-gen]');
  if (genBtn) {
    genBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await generateForDish(dish);
    });
  }
  return card;
}

/* Быстрое добавление блюда из меню в сегодняшний приём пищи */
function quickAddDishToDiary(dish) {
  const date = todayStr();
  const mealBtns = MEALS.map((m) =>
    `<button data-meal="${m.id}" class="py-2.5 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition">${m.label}</button>`
  ).join('');
  const inner = `
    <div class="p-5 sm:p-6">
      <h2 class="text-lg font-semibold mb-1">${esc(dish.title)}</h2>
      <p class="text-sm text-muted mb-4">${fmt(dish.calories)} ккал / порция · в дневник на сегодня</p>
      <label class="text-xs text-muted mb-1 block">Порции</label>
      <input id="qa-srv" inputmode="decimal" value="1" class="w-full bg-ink border border-line rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60 mb-4" />
      <label class="text-xs text-muted mb-2 block">Приём пищи</label>
      <div class="grid grid-cols-2 gap-2">${mealBtns}</div>
    </div>`;
  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  node.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', async () => {
    const servings = num(node.querySelector('#qa-srv').value) || 1;
    try {
      await api('/api/tracker/entries/from-dish', {
        method: 'POST',
        json: { date, meal_type: b.getAttribute('data-meal'), dish_id: dish.id, servings },
      });
      closeModal();
      toast('Добавлено в дневник на сегодня', 'success');
      if (state.tab === 'diary' && state.diaryDate === date) await reloadDay();
    } catch (err) { toast(err.message, 'error'); }
  }));
  openModal(node);
}

/* --------------------- Блок КБЖУ (фитнес-стиль) ------------------------- */
function dishViews(dish) {
  const cal = num(dish.calories), p = num(dish.proteins), f = num(dish.fats), c = num(dish.carbohydrates);
  const total = { key: 'total', label: 'Всё блюдо', cal, p, f, c };
  const s = num(dish.servings), w = num(dish.total_weight_g);
  let per = null;
  if (s > 0) per = { key: 'per', label: 'На порцию', cal: cal / s, p: p / s, f: f / s, c: c / s };
  else if (w > 0) per = { key: 'per', label: 'На 100 г', cal: cal / w * 100, p: p / w * 100, f: f / w * 100, c: c / w * 100 };
  return { total, per };
}

function macrosBlock(dish) {
  const { total, per } = dishViews(dish);
  const init = per || total;
  const p = num(dish.proteins), f = num(dish.fats), c = num(dish.carbohydrates);
  const totalMac = p + f + c;
  const pct = (v) => (totalMac > 0 ? Math.max(2, Math.round((v / totalMac) * 100)) : 0);
  const bar = (label, id, val, pctVal, color) => `
    <div>
      <div class="flex items-baseline justify-between mb-1.5">
        <span class="text-sm text-muted">${label}</span>
        <span class="text-sm"><span class="font-semibold" id="${id}">${fmt(val)}</span><span class="text-muted"> г</span></span>
      </div>
      <div class="h-2 rounded-full bg-ink overflow-hidden">
        <div class="h-full rounded-full" style="width:${pctVal}%;background:${color}"></div>
      </div>
    </div>`;
  const toggle = per ? `
    <div class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink border border-line mb-4 text-xs font-medium">
      <button type="button" data-mbmode="per" class="py-1.5 rounded-lg transition">${esc(per.label)}</button>
      <button type="button" data-mbmode="total" class="py-1.5 rounded-lg transition">Всё блюдо</button>
    </div>` : '';
  return `
    <div class="rounded-2xl bg-card border border-line p-5">
      ${toggle}
      <div class="flex items-end justify-between mb-5">
        <div>
          <p class="text-xs uppercase tracking-wider text-muted">Калорийность</p>
          <p class="mt-1"><span class="text-4xl font-bold text-accent" id="mb-cal">${fmt(init.cal)}</span><span class="text-muted text-sm ml-1.5">ккал</span></p>
        </div>
        ${per ? '' : '<span class="text-xs text-muted">на всё блюдо</span>'}
      </div>
      <div class="space-y-4">
        ${bar('Белки', 'mb-p', init.p, pct(p), '#5ec8a8')}
        ${bar('Жиры', 'mb-f', init.f, pct(f), '#e6b260')}
        ${bar('Углеводы', 'mb-c', init.c, pct(c), '#6aa8e6')}
      </div>
    </div>`;
}

function wireMacros(node, dish) {
  const views = dishViews(dish);
  if (!views.per) return;
  let mode = 'per';
  const apply = () => {
    const v = mode === 'total' ? views.total : views.per;
    node.querySelector('#mb-cal').textContent = fmt(v.cal);
    node.querySelector('#mb-p').textContent = fmt(v.p);
    node.querySelector('#mb-f').textContent = fmt(v.f);
    node.querySelector('#mb-c').textContent = fmt(v.c);
    node.querySelectorAll('[data-mbmode]').forEach((b) => {
      const on = b.getAttribute('data-mbmode') === mode;
      b.classList.toggle('bg-accent', on); b.classList.toggle('text-ink', on); b.classList.toggle('text-muted', !on);
    });
  };
  node.querySelectorAll('[data-mbmode]').forEach((b) =>
    b.addEventListener('click', () => { mode = b.getAttribute('data-mbmode'); apply(); }));
  apply();
}

function ingredientsBlock(dish) {
  const ings = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  if (!ings.length) return '';
  const rows = ings.map((it) => `
    <div class="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-line/60">
      <span class="text-sm truncate">${esc(it.name)}</span>
      <span class="text-sm text-muted shrink-0">${fmt(it.grams)} г</span>
    </div>`).join('');
  return `
    <div class="rounded-2xl bg-card border border-line overflow-hidden">
      <button type="button" data-ing-toggle class="w-full flex items-center justify-between p-4 text-left">
        <span class="text-sm font-medium">Ингредиенты <span class="text-muted">· ${ings.length}</span></span>
        <span data-ing-chev class="w-6 h-6 grid place-items-center rounded-full border border-line text-muted transition-transform duration-200">${ICON.plus}</span>
      </button>
      <div data-ing-body class="hidden">${rows}</div>
    </div>`;
}

function wireIngredientsView(node) {
  const btn = node.querySelector('[data-ing-toggle]');
  if (!btn) return;
  const body = node.querySelector('[data-ing-body]');
  const chev = node.querySelector('[data-ing-chev]');
  btn.addEventListener('click', () => {
    const open = body.classList.toggle('hidden') === false;
    chev.classList.toggle('rotate-45', open);
    chev.classList.toggle('text-accent', open);
  });
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
        ${ingredientsBlock(dish)}
        ${recipeBlock(dish.recipe_text_or_link)}
        ${dish.is_mine ? `
        <button data-edit class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-line bg-card text-sm hover:border-accent/50 transition">
          ${ICON.edit} Редактировать
        </button>
        <button data-delete class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#5b2630] text-red-300 text-sm hover:bg-[#2a1518] transition">
          ${ICON.trash} Удалить блюдо
        </button>` : `
        <p class="text-xs text-muted text-center pt-1">Добавил: ${esc(dish.author || 'другой пользователь')} · редактировать может только автор</p>`}
      </div>
    </div>`;

  const node = modalShell(inner);
  node.querySelector('[data-close]').addEventListener('click', closeModal);
  wireMacros(node, dish);
  wireIngredientsView(node);

  const genBtn = node.querySelector('[data-gen]');
  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      closeModal();
      await generateForDish(dish);
    });
  }

  const delBtn = node.querySelector('[data-delete]');
  if (delBtn) delBtn.addEventListener('click', async () => {
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

  const editBtn = node.querySelector('[data-edit]');
  if (editBtn) editBtn.addEventListener('click', () => {
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

        <div class="rounded-2xl bg-card border border-line overflow-hidden">
          <button type="button" id="ing-toggle" class="w-full flex items-center justify-between p-4 text-left">
            <span class="text-sm font-medium">Ингредиенты <span id="ing-count" class="text-muted"></span></span>
            <span id="ing-chev" class="w-6 h-6 grid place-items-center rounded-full border border-line text-muted transition-transform duration-200">${ICON.plus}</span>
          </button>
          <div id="ing-body" class="hidden px-4 pb-4 space-y-3">
            <p class="text-[11px] text-muted/80">Добавьте ингредиенты — КБЖУ блюда посчитается автоматически.</p>
            <div id="ing-list" class="space-y-2"></div>
            <button type="button" id="ing-add" class="w-full py-2.5 rounded-xl border border-line bg-ink text-sm hover:border-accent/50 transition flex items-center justify-center gap-2"><span class="w-4 h-4">${ICON.plus}</span> Добавить ингредиент</button>

            <div id="ing-panel" class="hidden rounded-xl border border-line bg-ink p-3 space-y-3">
              <div class="grid grid-cols-2 gap-1 p-1 rounded-lg bg-card border border-line text-xs font-medium">
                <button type="button" data-imode="off" class="py-1.5 rounded-md transition">Через OFF</button>
                <button type="button" data-imode="manual" class="py-1.5 rounded-md transition">Вручную</button>
              </div>
              <div id="ing-off">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted">${ICON.search}</span>
                  <input id="ing-q" placeholder="Название продукта" autocomplete="off" class="w-full bg-graphite border border-line rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-accent/60 transition" />
                </div>
                <div id="ing-res" class="mt-2 space-y-1 max-h-56 overflow-y-auto no-scrollbar"></div>
              </div>
              <div id="ing-manual" class="hidden space-y-2">
                <input id="im-name" placeholder="Название" class="${fieldCls}" />
                <div class="grid grid-cols-4 gap-2">
                  <div><label class="text-[10px] text-muted mb-1 block">ккал/100г</label><input id="im-cal" inputmode="decimal" placeholder="0" class="${fieldCls}" /></div>
                  <div><label class="text-[10px] text-prot mb-1 block">Б/100г</label><input id="im-prot" inputmode="decimal" placeholder="0" class="${fieldCls}" /></div>
                  <div><label class="text-[10px] text-fat mb-1 block">Ж/100г</label><input id="im-fat" inputmode="decimal" placeholder="0" class="${fieldCls}" /></div>
                  <div><label class="text-[10px] text-carb mb-1 block">У/100г</label><input id="im-carb" inputmode="decimal" placeholder="0" class="${fieldCls}" /></div>
                </div>
                <div><label class="text-[10px] text-muted mb-1 block">Граммов в блюде</label><input id="im-grams" inputmode="decimal" placeholder="100" class="${fieldCls}" /></div>
                <button type="button" id="im-add" class="w-full py-2.5 rounded-xl bg-accent text-ink font-semibold text-sm hover:bg-[#eecb96] transition">Добавить ингредиент</button>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-muted mb-1 block">Вес блюда, г</label><input name="total_weight_g" inputmode="decimal" placeholder="напр. 800" value="${v('total_weight_g')}" class="${fieldCls}" /></div>
          <div><label class="text-xs text-muted mb-1 block">Порций</label><input name="servings" inputmode="decimal" placeholder="напр. 4" value="${v('servings')}" class="${fieldCls}" /></div>
        </div>

        <div class="rounded-2xl bg-card border border-line p-4">
          <p id="kbju-title" class="text-xs uppercase tracking-wider text-muted mb-3">КБЖУ на всё блюдо</p>
          <div class="mb-3">
            <label class="text-xs text-muted mb-1 block">Калории, ккал</label>
            <input name="calories" inputmode="decimal" placeholder="0" value="${v('calories')}" class="${fieldCls}" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="text-xs text-prot mb-1 block">Белки</label><input name="proteins" inputmode="decimal" placeholder="0" value="${v('proteins')}" class="${fieldCls}" /></div>
            <div><label class="text-xs text-fat mb-1 block">Жиры</label><input name="fats" inputmode="decimal" placeholder="0" value="${v('fats')}" class="${fieldCls}" /></div>
            <div><label class="text-xs text-carb mb-1 block">Углеводы</label><input name="carbohydrates" inputmode="decimal" placeholder="0" value="${v('carbohydrates')}" class="${fieldCls}" /></div>
          </div>
          <p id="kbju-auto" class="hidden text-[11px] text-accent/80 mt-2">Считается из ингредиентов автоматически</p>
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

  // ------------------------- Ингредиенты блюда -------------------------
  let ings = (isEdit && Array.isArray(dish.ingredients))
    ? dish.ingredients.map((it) => ({
        name: it.name || '', grams: num(it.grams),
        calories: num(it.calories), proteins: num(it.proteins),
        fats: num(it.fats), carbohydrates: num(it.carbohydrates),
      }))
    : [];

  const macroInputs = ['calories', 'proteins', 'fats', 'carbohydrates'];

  // Ввод Б/Ж/У вручную считает калории — только когда нет ингредиентов.
  const recalcDishCal = () => {
    if (ings.length) return;
    form.calories.value = Math.round(
      num(form.proteins.value) * 4 + num(form.fats.value) * 9 + num(form.carbohydrates.value) * 4
    );
  };
  ['proteins', 'fats', 'carbohydrates'].forEach((n) => form[n].addEventListener('input', recalcDishCal));

  const ingList = node.querySelector('#ing-list');
  const ingCount = node.querySelector('#ing-count');
  const kbjuAuto = node.querySelector('#kbju-auto');
  const kbjuTitle = node.querySelector('#kbju-title');
  const weightInput = form.total_weight_g;

  function recomputeTotals() {
    const has = ings.length > 0;
    // блокируем ручной ввод КБЖУ, когда есть ингредиенты
    macroInputs.forEach((n) => {
      form[n].disabled = has;
      form[n].classList.toggle('opacity-60', has);
    });
    kbjuAuto.classList.toggle('hidden', !has);
    kbjuTitle.textContent = has ? 'КБЖУ на всё блюдо (из ингредиентов)' : 'КБЖУ на всё блюдо';
    ingCount.textContent = has ? `· ${ings.length}` : '';
    if (!has) return;
    const t = ings.reduce((a, it) => {
      const k = (it.grams || 0) / 100;
      a.calories += it.calories * k; a.proteins += it.proteins * k;
      a.fats += it.fats * k; a.carbohydrates += it.carbohydrates * k;
      return a;
    }, { calories: 0, proteins: 0, fats: 0, carbohydrates: 0 });
    form.calories.value = Math.round(t.calories);
    form.proteins.value = Math.round(t.proteins * 10) / 10;
    form.fats.value = Math.round(t.fats * 10) / 10;
    form.carbohydrates.value = Math.round(t.carbohydrates * 10) / 10;
    // подсказываем вес = сумма граммов, если поле пустое
    if (!num(weightInput.value)) weightInput.value = Math.round(ings.reduce((s, it) => s + (it.grams || 0), 0));
  }

  function renderIngList() {
    ingList.innerHTML = ings.map((it, i) => `
      <div class="flex items-center gap-2 bg-graphite border border-line rounded-xl px-3 py-2">
        <div class="min-w-0 flex-1">
          <p class="text-sm truncate">${esc(it.name)}</p>
          <p class="text-[11px] text-muted">${fmt(it.calories)} ккал·100г</p>
        </div>
        <input type="text" inputmode="decimal" value="${esc(String(it.grams))}" data-grams="${i}" class="w-16 bg-ink border border-line rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-accent/60" />
        <span class="text-xs text-muted">г</span>
        <button type="button" data-del="${i}" class="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-red-300">${ICON.trash}</button>
      </div>`).join('');
    ingList.querySelectorAll('[data-grams]').forEach((inp) => {
      inp.addEventListener('input', () => { ings[+inp.getAttribute('data-grams')].grams = num(inp.value); recomputeTotals(); });
    });
    ingList.querySelectorAll('[data-del]').forEach((b) => {
      b.addEventListener('click', () => { ings.splice(+b.getAttribute('data-del'), 1); renderIngList(); recomputeTotals(); });
    });
  }

  function addIngredient(ing) {
    ings.push(ing);
    renderIngList();
    recomputeTotals();
  }

  // Аккордеон
  const ingBody = node.querySelector('#ing-body');
  const ingChev = node.querySelector('#ing-chev');
  node.querySelector('#ing-toggle').addEventListener('click', () => {
    const open = ingBody.classList.toggle('hidden') === false;
    ingChev.classList.toggle('rotate-45', open);
    ingChev.classList.toggle('text-accent', open);
  });

  // Панель добавления + режимы OFF/вручную
  const ingPanel = node.querySelector('#ing-panel');
  const ingOff = node.querySelector('#ing-off');
  const ingManual = node.querySelector('#ing-manual');
  const paintImode = (mode) => {
    node.querySelectorAll('[data-imode]').forEach((b) => {
      const on = b.getAttribute('data-imode') === mode;
      b.classList.toggle('bg-accent', on); b.classList.toggle('text-ink', on); b.classList.toggle('text-muted', !on);
    });
    ingOff.classList.toggle('hidden', mode !== 'off');
    ingManual.classList.toggle('hidden', mode !== 'manual');
  };
  node.querySelector('#ing-add').addEventListener('click', () => {
    ingPanel.classList.toggle('hidden');
    if (!ingPanel.classList.contains('hidden')) { paintImode('off'); node.querySelector('#ing-q').focus(); }
  });
  node.querySelectorAll('[data-imode]').forEach((b) => b.addEventListener('click', () => paintImode(b.getAttribute('data-imode'))));

  // OFF-поиск ингредиента
  const ingQ = node.querySelector('#ing-q');
  const ingRes = node.querySelector('#ing-res');
  let ingT = null;
  const renderIngResults = (items) => {
    if (!items.length) { ingRes.innerHTML = `<p class="text-xs text-muted/70 px-1 py-2">Ничего не найдено</p>`; return; }
    ingRes.innerHTML = items.map((p, i) => `
      <button type="button" data-pick="${i}" class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-graphite border border-line hover:border-accent/50 transition text-left">
        <span class="min-w-0"><span class="text-sm truncate block">${esc(p.name)}${p.source === 'catalog' ? (p.is_mine ? ' <span class=\"text-[10px] text-accent\">Мои</span>' : ' <span class=\"text-[10px] text-muted\">База</span>') : (p.source === 'base' ? ' <span class=\"text-[10px] text-muted\">База</span>' : '')}</span><span class="text-[11px] text-muted">${fmt(p.calories)} ккал·100г</span></span>
        <span class="w-6 h-6 grid place-items-center rounded-full bg-accent/15 text-accent shrink-0">${ICON.plus}</span>
      </button>`).join('');
    ingRes.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      const p = items[+b.getAttribute('data-pick')];
      addIngredient({ name: p.name, grams: 100, calories: num(p.calories), proteins: num(p.proteins), fats: num(p.fats), carbohydrates: num(p.carbohydrates) });
      ingQ.value = ''; ingRes.innerHTML = '';
      toast('Ингредиент добавлен — укажите граммы', 'success');
    }));
  };
  ingQ.addEventListener('input', () => {
    clearTimeout(ingT);
    const q = ingQ.value.trim();
    if (q.length < 2) { ingRes.innerHTML = ''; return; }
    ingT = setTimeout(async () => {
      try { renderIngResults(await api(`/api/products/search?q=${encodeURIComponent(q)}`)); }
      catch (_) { ingRes.innerHTML = `<p class="text-xs text-muted/70 px-1 py-2">Ошибка поиска</p>`; }
    }, 350);
  });

  // Ручной ингредиент
  node.querySelector('#im-add').addEventListener('click', () => {
    const name = node.querySelector('#im-name').value.trim();
    if (!name) return toast('Введите название ингредиента', 'error');
    addIngredient({
      name,
      grams: num(node.querySelector('#im-grams').value) || 100,
      calories: num(node.querySelector('#im-cal').value),
      proteins: num(node.querySelector('#im-prot').value),
      fats: num(node.querySelector('#im-fat').value),
      carbohydrates: num(node.querySelector('#im-carb').value),
    });
    ['#im-name', '#im-cal', '#im-prot', '#im-fat', '#im-carb', '#im-grams'].forEach((s) => { node.querySelector(s).value = ''; });
    toast('Ингредиент добавлен', 'success');
  });

  // первичная отрисовка + разворачиваем аккордеон, если ингредиенты уже есть
  renderIngList();
  recomputeTotals();
  if (ings.length) { ingBody.classList.remove('hidden'); ingChev.classList.add('rotate-45', 'text-accent'); }

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
    fd.append('ingredients', JSON.stringify(ings));
    fd.append('total_weight_g', num(form.total_weight_g.value));
    fd.append('servings', num(form.servings.value));
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

  const node = modalShell(inner);
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
  const node = modalShell(inner);
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
  const params = new URLSearchParams();
  if (state.category && state.category !== 'Все') params.set('category', state.category);
  if (state.menuQuery && state.menuQuery.trim()) params.set('q', state.menuQuery.trim());
  const qs = params.toString();
  state.dishes = await api(`/api/dishes${qs ? '?' + qs : ''}`);
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
