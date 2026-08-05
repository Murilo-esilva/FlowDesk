/**
 * main.js
 * Ponto de entrada. Orquestra autenticação, inicialização dos módulos de UI
 * e conecta os controles globais (busca, filtros, botão "nova tarefa").
 */
import { initCalendar, refreshCalendarSize } from './calendar.js';
import { login, logout, observeAuth, translateAuthError } from './auth.js';
import { startTaskslistener, stopTasksListener, onTasksChange } from './tasks.js';
import { initKanban, renderBoard } from './kanban.js';
import { initModal, openCreateModal, openEditModal } from './modal.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import {
  setFilter, resetFilters, uniqueAssignees,
} from './filters.js';
import { debounce, toast, CATEGORIES, PRIORITIES } from './utils.js';

let currentUser = null;

/* ---------- Elementos ---------- */

const els = {
  loginScreen: document.getElementById('login-screen'),
  appScreen: document.getElementById('app-screen'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  loginSubmitBtn: document.getElementById('login-submit'),
  userEmail: document.getElementById('user-email'),
  userAvatar: document.getElementById('user-avatar'),
  logoutBtn: document.getElementById('logout-btn'),
  board: document.getElementById('kanban-board'),
  dashboard: document.getElementById('dashboard'),
  newTaskBtn: document.getElementById('new-task-btn'),
  searchInput: document.getElementById('search-input'),
  filterCategory: document.getElementById('filter-category'),
  filterPriority: document.getElementById('filter-priority'),
  filterAssignee: document.getElementById('filter-assignee'),
  filterDeadline: document.getElementById('filter-deadline'),
  sortSelect: document.getElementById('sort-select'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalPanel: document.getElementById('modal-panel'),
  themeToggle: document.getElementById('theme-toggle'),
  calendarSection: document.getElementById('calendar-section'), // Container do FullCalendar
  btnKanbanView: document.getElementById('btn-kanban-view'),     // Botão aba Kanban
  btnCalendarView: document.getElementById('btn-calendar-view'), // Botão aba Agenda
  
  newTaskBtn: document.getElementById('new-task-btn'),
};

/* ---------- Auth ---------- */

observeAuth((user) => {
  currentUser = user;
  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(els.loginForm);
  const email = fd.get('email');
  const password = fd.get('password');
  els.loginError.textContent = '';
  els.loginSubmitBtn.disabled = true;
  els.loginSubmitBtn.classList.add('is-loading');

  try {
    await login(email, password);
    els.loginForm.reset();
  } catch (err) {
    els.loginError.textContent = translateAuthError(err.code);
  } finally {
    els.loginSubmitBtn.disabled = false;
    els.loginSubmitBtn.classList.remove('is-loading');
  }
});

els.logoutBtn.addEventListener('click', async () => {
  stopTasksListener();
  await logout();
});

function showLogin() {
  els.appScreen.classList.remove('is-visible');
  els.loginScreen.classList.add('is-visible');
}

function showApp(user) {
  els.loginScreen.classList.remove('is-visible');
  els.appScreen.classList.add('is-visible');
  els.userEmail.textContent = user.email;
  els.userAvatar.textContent = user.email.slice(0, 2).toUpperCase();
  bootstrapApp();
}

/* ---------- Bootstrap dos módulos (uma vez por sessão) ---------- */

let bootstrapped = false;

function bootstrapApp() {
  if (bootstrapped) {
    startTaskslistener();
    return;
  }
  bootstrapped = true;

  populateStaticFilters();

  initKanban(els.board, {
    onCardClick: (taskId) => openEditModal(taskId),
    getUserEmail: () => currentUser?.email,
  });

  initModal(els.modalOverlay, els.modalPanel, {
    getUserEmail: () => currentUser?.email,
  });

  initDashboard(els.dashboard);

  bindToolbarEvents();
  startTaskslistener();

  onTasksChange((tasks) => {
    renderBoard();
    renderDashboard(tasks);
    populateAssigneeFilter(tasks);
  });
  initCalendar(tasks); 
  });
}

function populateStaticFilters() {
  els.filterCategory.innerHTML =
    `<option value="all">Todas categorias</option>` +
    CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

  els.filterPriority.innerHTML =
    `<option value="all">Todas prioridades</option>` +
    PRIORITIES.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
}

function populateAssigneeFilter(tasks) {
  const current = els.filterAssignee.value || 'all';
  const names = uniqueAssignees(tasks);
  els.filterAssignee.innerHTML =
    `<option value="all">Todos responsáveis</option>` +
    names.map((n) => `<option value="${n}">${n}</option>`).join('');
  if (names.includes(current)) els.filterAssignee.value = current;
}

/* ---------- Toolbar: busca, filtros, ordenação, nova tarefa ---------- */

function bindToolbarEvents() {
  els.newTaskBtn.addEventListener('click', () => openCreateModal());

  const debouncedSearch = debounce((value) => {
    setFilter('search', value);
    renderBoard();
  }, 200);

  els.searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

  els.filterCategory.addEventListener('change', (e) => {
    setFilter('category', e.target.value);
    renderBoard();
  });
  els.filterPriority.addEventListener('change', (e) => {
    setFilter('priority', e.target.value);
    renderBoard();
  });
  els.filterAssignee.addEventListener('change', (e) => {
    setFilter('assignee', e.target.value);
    renderBoard();
  });
  els.filterDeadline.addEventListener('change', (e) => {
    setFilter('deadline', e.target.value);
    renderBoard();
  });
  els.sortSelect.addEventListener('change', (e) => {
    setFilter('sortBy', e.target.value);
    renderBoard();
  });

  els.resetFiltersBtn.addEventListener('click', () => {
    resetFilters();
    els.searchInput.value = '';
    els.filterCategory.value = 'all';
    els.filterPriority.value = 'all';
    els.filterAssignee.value = 'all';
    els.filterDeadline.value = 'all';
    els.sortSelect.value = 'createdAt-desc';
    renderBoard();
    toast('Filtros limpos.', 'info', 1800);
  });
}

/* ---------- Tema ---------- */

const THEME_KEY = 'ctb-theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

els.themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();
if (els.btnKanbanView && els.btnCalendarView) {
  els.btnCalendarView.addEventListener('click', () => {
    // Oculta o Kanban e o Dashboard (se necessário), mostra o calendário
    els.board.style.display = 'none';
    if (els.dashboard) els.dashboard.style.display = 'none';
    els.calendarSection.style.display = 'block';

    // Ajusta classes ativas dos botões
    els.btnKanbanView.classList.remove('active');
    els.btnCalendarView.classList.add('active');

    // Força o FullCalendar a recalcular o tamanho (evita bugs visuais por iniciar oculto)
    refreshCalendarSize();
  });

  els.btnKanbanView.addEventListener('click', () => {
    // Oculta o calendário, mostra o Kanban e o Dashboard
    els.calendarSection.style.display = 'none';
    els.board.style.display = 'grid'; // ou o display original do seu layout do board
    if (els.dashboard) els.dashboard.style.display = 'block';

    // Ajusta classes ativas dos botões
    els.btnCalendarView.classList.remove('active');
    els.btnKanbanView.classList.add('active');
  });
}
