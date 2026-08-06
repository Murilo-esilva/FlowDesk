/**
 * main.js
 * Ponto de entrada. Orquestra autenticação, inicialização dos módulos de UI
 * e conecta os controles globais (busca, filtros, botão "nova tarefa").
 */
import { initCalendar, refreshCalendarSize } from './calendar.js';
import { login, logout, observeAuth, translateAuthError } from './auth.js';
import { startTasksListener, stopTasksListener, onTasksChange } from './tasks.js';
import { initKanban, renderBoard } from './kanban.js';
import { initModal, openCreateModal, openEditModal } from './modal.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import {
  setFilter, resetFilters, uniqueAssignees,
} from './filters.js';
import { debounce, toast, CATEGORIES, PRIORITIES } from './utils.js';

let currentUser = null;
let els = {}; // será preenchido no DOMContentLoaded

/* ---------- Funções auxiliares que usam `els` ---------- */

function showLogin() {
  if (!els.appScreen || !els.loginScreen) return;
  els.appScreen.classList.remove('is-visible');
  els.loginScreen.classList.add('is-visible');
}

function showApp(user) {
  if (!els.loginScreen || !els.appScreen || !els.userEmail || !els.userAvatar) return;
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
    if (typeof startTasksListener === 'function') startTasksListener();
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
  if (typeof startTasksListener === 'function') startTasksListener();

  onTasksChange((tasks) => {
    renderBoard();
    renderDashboard(tasks);
    populateAssigneeFilter(tasks);
    initCalendar(tasks);
  });
}

function populateStaticFilters() {
  if (!els.filterCategory || !els.filterPriority) return;

  els.filterCategory.innerHTML =
    `<option value="all">Todas categorias</option>` +
    CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');

  els.filterPriority.innerHTML =
    `<option value="all">Todas prioridades</option>` +
    PRIORITIES.map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
}

function populateAssigneeFilter(tasks) {
  if (!els.filterAssignee) return;
  const current = els.filterAssignee.value || 'all';
  const names = uniqueAssignees(tasks);
  els.filterAssignee.innerHTML =
    `<option value="all">Todos responsáveis</option>` +
    names.map((n) => `<option value="${n}">${n}</option>`).join('');
  if (names.includes(current)) els.filterAssignee.value = current;
}

/* ---------- Toolbar: busca, filtros, ordenação, nova tarefa ---------- */
function bindToolbarEvents() {
  if (els.newTaskBtn) els.newTaskBtn.addEventListener('click', () => openCreateModal());

  const debouncedSearch = debounce((value) => {
    setFilter('search', value);
    renderBoard();
  }, 200);

  if (els.searchInput) els.searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

  if (els.filterCategory) els.filterCategory.addEventListener('change', (e) => {
    setFilter('category', e.target.value);
    renderBoard();
  });
  if (els.filterPriority) els.filterPriority.addEventListener('change', (e) => {
    setFilter('priority', e.target.value);
    renderBoard();
  });
  if (els.filterAssignee) els.filterAssignee.addEventListener('change', (e) => {
    setFilter('assignee', e.target.value);
    renderBoard();
  });
  if (els.filterDeadline) els.filterDeadline.addEventListener('change', (e) => {
    setFilter('deadline', e.target.value);
    renderBoard();
  });
  if (els.sortSelect) els.sortSelect.addEventListener('change', (e) => {
    setFilter('sortBy', e.target.value);
    renderBoard();
  });

  if (els.resetFiltersBtn) els.resetFiltersBtn.addEventListener('click', () => {
    resetFilters();
    if (els.searchInput) els.searchInput.value = '';
    if (els.filterCategory) els.filterCategory.value = 'all';
    if (els.filterPriority) els.filterPriority.value = 'all';
    if (els.filterAssignee) els.filterAssignee.value = 'all';
    if (els.filterDeadline) els.filterDeadline.value = 'all';
    if (els.sortSelect) els.sortSelect.value = 'createdAt-desc';
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

/* ---------- DOM ready: Query elements and wire handlers ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Preencher referência aos elementos somente quando o DOM estiver pronto
  els = {
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
  };

  // Observa autenticação e mostra telas adequadas
  observeAuth((user) => {
    currentUser = user;
    if (user) {
      showApp(user);
    } else {
      showLogin();
    }
  });

  // Login form
  if (els.loginForm) {
    els.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(els.loginForm);
      const email = fd.get('email');
      const password = fd.get('password');
      if (els.loginError) els.loginError.textContent = '';
      if (els.loginSubmitBtn) {
        els.loginSubmitBtn.disabled = true;
        els.loginSubmitBtn.classList.add('is-loading');
      }

      try {
        await login(email, password);
        els.loginForm.reset();
      } catch (err) {
        if (els.loginError) els.loginError.textContent = translateAuthError(err.code);
      } finally {
        if (els.loginSubmitBtn) {
          els.loginSubmitBtn.disabled = false;
          els.loginSubmitBtn.classList.remove('is-loading');
        }
      }
    });
  }

  // Logout
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', async () => {
      stopTasksListener();
      await logout();
    });
  }

  // Inicializa tema
  initTheme();
  if (els.themeToggle) {
    els.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  // View toggle (Kanban / Calendar)
  if (els.btnKanbanView && els.btnCalendarView) {
    els.btnCalendarView.addEventListener('click', () => {
      // Oculta o Kanban e o Dashboard (se necessário), mostra o calendário
      if (els.board) els.board.style.display = 'none';
      if (els.dashboard) els.dashboard.style.display = 'none';
      if (els.calendarSection) els.calendarSection.style.display = 'block';

      // Ajusta classes ativas dos botões
      els.btnKanbanView.classList.remove('active');
      els.btnCalendarView.classList.add('active');

      // Força o FullCalendar a recalcular o tamanho (evita bugs visuais por iniciar oculto)
      refreshCalendarSize();
    });

    els.btnKanbanView.addEventListener('click', () => {
      // Oculta o calendário, mostra o Kanban e o Dashboard
      if (els.calendarSection) els.calendarSection.style.display = 'none';
      if (els.board) els.board.style.display = 'grid'; // ou o display original do seu layout do board
      if (els.dashboard) els.dashboard.style.display = 'block';

      // Ajusta classes ativas dos botões
      els.btnCalendarView.classList.remove('active');
      els.btnKanbanView.classList.add('active');
    });
  }
});
