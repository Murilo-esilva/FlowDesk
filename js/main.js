/**
 * js/main.js
 * Orchestrator refactor: centralized initialization, safer DOM access,
 * named handlers and clearer lifecycle for bootstrapping modules.
 */

import { initCalendar, refreshCalendarSize } from './calendar.js';
import { login, logout, observeAuth, translateAuthError } from './auth.js';
import { startTaskslistener, stopTasksListener, onTasksChange } from './tasks.js';
import { initKanban, renderBoard } from './kanban.js';
import { initModal, openCreateModal, openEditModal } from './modal.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import { setFilter, resetFilters, uniqueAssignees, applyFilters } from './filters.js';
import { debounce, toast, CATEGORIES, PRIORITIES } from './utils.js';

/* ==========================================================
   APPLICATION STATE
   - keep minimal globals, manage via init() lifecycle
========================================================== */

let currentUser = null;
let bootstrapped = false;
let activeView = 'kanban';

/* ==========================================================
   ELEMENTS (populated after DOMContentLoaded)
========================================================== */

let els = {};

/* ==========================================================
   AUTH OBSERVER
   - observeAuth is started once DOM is ready so we can update the UI
========================================================== */

function observeAuthAndSyncUI() {
  // observeAuth returns an unsubscribe function, but we don't need it here
  observeAuth((user) => {
    currentUser = user;
    if (user) {
      showApp(user);
    } else {
      showLogin();
    }
  });
}

/* ==========================================================
   DOM HELPERS
========================================================== */

function initEls() {
  els = {
    // Screens
    loginScreen: document.getElementById('login-screen'),
    appScreen: document.getElementById('app-screen'),

    // Login
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    loginSubmitBtn: document.getElementById('login-submit'),

    // User
    userEmail: document.getElementById('user-email'),
    userAvatar: document.getElementById('user-avatar'),
    logoutBtn: document.getElementById('logout-btn'),

    // Views
    kanbanSection: document.getElementById('kanban-section'),
    calendarSection: document.getElementById('calendar-section'),
    btnKanbanView: document.getElementById('btn-kanban-view'),
    btnCalendarView: document.getElementById('btn-calendar-view'),

    // Kanban / Dashboard
    board: document.getElementById('kanban-board'),
    dashboard: document.getElementById('dashboard'),

    // Calendar
    calendar: document.getElementById('calendar'),
    calendarNewTaskBtn: document.getElementById('calendar-new-task-btn'),

    // Toolbar
    newTaskBtn: document.getElementById('new-task-btn'),
    searchInput: document.getElementById('search-input'),
    filterCategory: document.getElementById('filter-category'),
    filterPriority: document.getElementById('filter-priority'),
    filterAssignee: document.getElementById('filter-assignee'),
    filterDeadline: document.getElementById('filter-deadline'),
    sortSelect: document.getElementById('sort-select'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),

    // Modal
    modalOverlay: document.getElementById('modal-overlay'),
    modalPanel: document.getElementById('modal-panel'),

    // Theme
    themeToggle: document.getElementById('theme-toggle'),
  };
}

/* ==========================================================
   AUTH UI
========================================================== */

function showLogin() {
  currentUser = null;
  els?.appScreen?.classList.remove('is-visible');
  els?.loginScreen?.classList.add('is-visible');
  setLoginError('');
}

function showApp(user) {
  els?.loginScreen?.classList.remove('is-visible');
  els?.appScreen?.classList.add('is-visible');

  const email = user?.email || '';

  if (els.userEmail) els.userEmail.textContent = email;
  if (els.userAvatar) els.userAvatar.textContent = getUserInitials(email);

  showKanbanView();
  bootstrapApp();
}

function getUserInitials(email) {
  if (!email) return '--';
  const username = String(email).split('@')[0];
  const parts = username.split(/[._\-\s]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

function setLoginError(message) {
  if (els.loginError) els.loginError.textContent = message || '';
}

function setLoginLoading(isLoading) {
  if (!els.loginSubmitBtn) return;
  els.loginSubmitBtn.disabled = isLoading;
  els.loginSubmitBtn.classList.toggle('is-loading', isLoading);
}

/* ==========================================================
   BOOTSTRAP
========================================================== */

function bootstrapApp() {
  // If we've already initialized the modules once, just re-start listeners
  if (bootstrapped) {
    startTaskslistener();
    return;
  }
  bootstrapped = true;

  populateStaticFilters();

  // init modules that need DOM elements
  initKanban(els.board, {
    onCardClick: (taskId) => openEditModal(taskId),
    getUserEmail: () => currentUser?.email || '',
  });

  initModal(els.modalOverlay, els.modalPanel, {
    getUserEmail: () => currentUser?.email || '',
  });

  initDashboard(els.dashboard);

  bindToolbarEvents();
  bindViewEvents();

  // Tasks change hook - updates board, dashboard and calendar together
  onTasksChange((tasks = []) => {
    renderBoard();
    renderDashboard(tasks);
    populateAssigneeFilter(tasks);
    initCalendar(tasks);

    if (activeView === 'calendar') {
      requestAnimationFrame(() => refreshCalendarSize());
    }

    window.lucide?.createIcons();
  });

  startTaskslistener();
}

/* ==========================================================
   FILTERS
========================================================== */

function populateStaticFilters() {
  if (els.filterCategory) {
    els.filterCategory.innerHTML = [
      '<option value="all">Todas categorias</option>',
      ...CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`),
    ].join('');
  }

  if (els.filterPriority) {
    els.filterPriority.innerHTML = [
      '<option value="all">Todas prioridades</option>',
      ...PRIORITIES.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.label)}</option>`),
    ].join('');
  }
}

function populateAssigneeFilter(tasks = []) {
  if (!els.filterAssignee) return;
  const prev = els.filterAssignee.value || 'all';
  const names = uniqueAssignees(tasks);
  els.filterAssignee.innerHTML = ['<option value="all">Todos responsáveis</option>', ...names.map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`)].join('');
  if (names.includes(prev)) els.filterAssignee.value = prev;
  else els.filterAssignee.value = 'all';
}

/* ==========================================================
   TOOLBAR & VIEW EVENTS
========================================================== */

function bindToolbarEvents() {
  if (els.newTaskBtn) els.newTaskBtn.addEventListener('click', onNewTaskClick);
  if (els.calendarNewTaskBtn) els.calendarNewTaskBtn.addEventListener('click', onNewTaskClick);

  const debounced = debounce((value) => {
    setFilter('search', String(value || '').trim());
    renderBoard();
  }, 200);

  if (els.searchInput) {
    els.searchInput.addEventListener('input', (ev) => {
      debounced(ev?.target?.value || '');
    });
  }

  if (els.filterCategory) els.filterCategory.addEventListener('change', (e) => { setFilter('category', e.target.value); renderBoard(); });
  if (els.filterPriority) els.filterPriority.addEventListener('change', (e) => { setFilter('priority', e.target.value); renderBoard(); });
  if (els.filterAssignee) els.filterAssignee.addEventListener('change', (e) => { setFilter('assignee', e.target.value); renderBoard(); });
  if (els.filterDeadline) els.filterDeadline.addEventListener('change', (e) => { setFilter('deadline', e.target.value); renderBoard(); });
  if (els.sortSelect) els.sortSelect.addEventListener('change', (e) => { setFilter('sortBy', e.target.value); renderBoard(); });

  if (els.resetFiltersBtn) els.resetFiltersBtn.addEventListener('click', resetAllFilters);
}

function onNewTaskClick() {
  openCreateModal();
}

function bindViewEvents() {
  if (els.btnKanbanView) els.btnKanbanView.addEventListener('click', showKanbanView);
  if (els.btnCalendarView) els.btnCalendarView.addEventListener('click', showCalendarView);
}

/* ==========================================================
   VIEW SWITCHERS
========================================================== */

function showKanbanView() {
  activeView = 'kanban';
  if (els.kanbanSection) els.kanbanSection.hidden = false;
  if (els.calendarSection) els.calendarSection.hidden = true;

  els.btnKanbanView?.classList.add('active');
  els.btnCalendarView?.classList.remove('active');
  els.btnKanbanView?.setAttribute('aria-pressed', 'true');
  els.btnCalendarView?.setAttribute('aria-pressed', 'false');

  window.lucide?.createIcons();
}

function showCalendarView() {
  activeView = 'calendar';
  if (els.kanbanSection) els.kanbanSection.hidden = true;
  if (els.calendarSection) els.calendarSection.hidden = false;

  els.btnKanbanView?.classList.remove('active');
  els.btnCalendarView?.classList.add('active');
  els.btnKanbanView?.setAttribute('aria-pressed', 'false');
  els.btnCalendarView?.setAttribute('aria-pressed', 'true');

  // Resize calendar after it's shown (helps with hidden container rendering)
  requestAnimationFrame(() => {
    refreshCalendarSize();
    setTimeout(() => refreshCalendarSize(), 100);
  });

  window.lucide?.createIcons();
}

/* ==========================================================
   THEME
========================================================== */

const THEME_KEY = 'ctb-theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);

  if (activeView === 'calendar') {
    requestAnimationFrame(() => refreshCalendarSize());
  }
}

/* ==========================================================
   GLOBAL EVENTS
========================================================== */

function bindGlobalEvents() {
  // logout
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', async () => {
      try {
        els.logoutBtn.disabled = true;
        stopTasksListener();
        await logout();
      } catch (err) {
        console.error('Erro ao sair:', err);
        toast('Não foi possível encerrar a sessão.', 'error');
      } finally {
        els.logoutBtn.disabled = false;
      }
    });
  }

  if (els.themeToggle) els.themeToggle.addEventListener('click', toggleTheme);

  // window resize: debounce calendar resize
  window.addEventListener('resize', debounce(() => {
    if (activeView === 'calendar') refreshCalendarSize();
  }, 150));

  // Escape closes modal (keeps existing modal behavior)
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    const modalOpen = els.modalOverlay && (els.modalOverlay.classList.contains('is-visible') || els.modalOverlay.classList.contains('is-open'));
    if (!modalOpen) return;
    els.modalOverlay.classList.remove('is-visible', 'is-open');
    els.modalOverlay.setAttribute('aria-hidden', 'true');
    if (els.modalPanel) els.modalPanel.innerHTML = '';
  });
}

/* ==========================================================
   FILTERS UTILITIES
========================================================== */

function resetAllFilters() {
  resetFilters();
  if (els.searchInput) els.searchInput.value = '';
  if (els.filterCategory) els.filterCategory.value = 'all';
  if (els.filterPriority) els.filterPriority.value = 'all';
  if (els.filterAssignee) els.filterAssignee.value = 'all';
  if (els.filterDeadline) els.filterDeadline.value = 'all';
  if (els.sortSelect) els.sortSelect.value = 'createdAt-desc';
  renderBoard();
  toast('Filtros limpos.', 'info', 1800);
}

/* ==========================================================
   LOGIN FORM
========================================================== */

async function handleLoginSubmit(ev) {
  ev.preventDefault();
  if (!els.loginForm) return;
  const formData = new FormData(els.loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    setLoginError('Informe o e-mail e a senha.');
    return;
  }

  setLoginError('');
  setLoginLoading(true);

  try {
    await login(email, password);
    els.loginForm.reset();
  } catch (err) {
    console.error('Erro ao realizar login:', err);
    const message = translateAuthError(err?.code);
    setLoginError(message || 'Não foi possível realizar o login.');
  } finally {
    setLoginLoading(false);
  }
}

/* ==========================================================
   UTIL
========================================================== */

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* ==========================================================
   INIT / ENTRYPOINT
========================================================== */

function attachLoginHandler() {
  if (!els.loginForm) return;
  els.loginForm.addEventListener('submit', handleLoginSubmit);
}

function initApp() {
  initEls();
  initTheme();
  attachLoginHandler();
  bindGlobalEvents();
  observeAuthAndSyncUI();

  // Ensure lucide icons are rendered initially
  window.lucide?.createIcons();
}

// Kick off after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
