/**
 * main.js
 * Ponto de entrada da aplicacao.
 *
 * Responsabilidades:
 * - Orquestrar autenticacao e troca entre as telas de login e aplicacao.
 * - Inicializar Kanban, modal, dashboard e calendario.
 * - Conectar busca, filtros, ordenacao, tema e troca de visualizacao.
 * - Iniciar e interromper a sincronizacao de tarefas.
 */

import { initCalendar, refreshCalendarSize } from './calendar.js';
import { login, logout, observeAuth, translateAuthError } from './auth.js';
import {
  startTasksListener,
  stopTasksListener,
  onTasksChange,
} from './tasks.js';
import { initKanban, renderBoard } from './kanban.js';
import {
  initModal,
  openCreateModal,
  openEditModal,
} from './modal.js';
import { initDashboard, renderDashboard } from './dashboard.js';
import {
  setFilter,
  resetFilters,
  uniqueAssignees,
} from './filters.js';
import {
  debounce,
  toast,
  CATEGORIES,
  PRIORITIES,
} from './utils.js';

let currentUser = null;
let els = {};
let bootstrapped = false;
let unsubscribeTasksChange = null;

const THEME_KEY = 'ctb-theme';

/* =========================================================
   VALIDACAO DA ESTRUTURA DA PAGINA
   ========================================================= */

function getRequiredElements() {
  return {
    loginScreen: document.getElementById('login-screen'),
    appScreen: document.getElementById('app-screen'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    loginSubmitBtn: document.getElementById('login-submit'),
    userEmail: document.getElementById('user-email'),
    userAvatar: document.getElementById('user-avatar'),
    logoutBtn: document.getElementById('logout-btn'),

    dashboard: document.getElementById('dashboard'),
    kanbanSection: document.getElementById('kanban-section'),
    board: document.getElementById('kanban-board'),
    calendarSection: document.getElementById('calendar-section'),
    calendar: document.getElementById('calendar'),

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
    btnKanbanView: document.getElementById('btn-kanban-view'),
    btnCalendarView: document.getElementById('btn-calendar-view'),
  };
}

function validateRequiredElements() {
  const required = [
    'loginScreen',
    'appScreen',
    'loginForm',
    'loginError',
    'loginSubmitBtn',
    'userEmail',
    'userAvatar',
    'logoutBtn',
    'dashboard',
    'kanbanSection',
    'board',
    'calendarSection',
    'calendar',
    'newTaskBtn',
    'searchInput',
    'filterCategory',
    'filterPriority',
    'filterAssignee',
    'filterDeadline',
    'sortSelect',
    'resetFiltersBtn',
    'modalOverlay',
    'modalPanel',
    'themeToggle',
    'btnKanbanView',
    'btnCalendarView',
  ];

  const missing = required.filter((key) => !els[key]);

  if (missing.length > 0) {
    console.error(
      '[main] Elementos obrigatorios ausentes no HTML:',
      missing
    );
    return false;
  }

  return true;
}

/* =========================================================
   TELAS E AUTENTICACAO
   ========================================================= */

function showLogin() {
  if (!els.appScreen || !els.loginScreen) return;

  els.appScreen.classList.remove('is-visible');
  els.loginScreen.classList.add('is-visible');
}

function showApp(user) {
  if (
    !els.loginScreen ||
    !els.appScreen ||
    !els.userEmail ||
    !els.userAvatar
  ) {
    return;
  }

  const email = user?.email || 'Usuario';

  els.loginScreen.classList.remove('is-visible');
  els.appScreen.classList.add('is-visible');
  els.userEmail.textContent = email;
  els.userAvatar.textContent = email.slice(0, 2).toUpperCase();

  bootstrapApp();
}

function setLoginLoading(isLoading) {
  if (!els.loginSubmitBtn) return;

  els.loginSubmitBtn.disabled = isLoading;
  els.loginSubmitBtn.classList.toggle('is-loading', isLoading);
  els.loginSubmitBtn.setAttribute(
    'aria-busy',
    String(isLoading)
  );
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  if (!els.loginForm) return;

  const formData = new FormData(els.loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (els.loginError) {
    els.loginError.textContent = '';
  }

  if (!email || !password) {
    if (els.loginError) {
      els.loginError.textContent = 'Informe o e-mail e a senha.';
    }
    return;
  }

  setLoginLoading(true);

  try {
    await login(email, password);
    els.loginForm.reset();
  } catch (error) {
    console.error('[main] Erro no login:', error);

    if (els.loginError) {
      els.loginError.textContent = translateAuthError(error?.code);
    }
  } finally {
    setLoginLoading(false);
  }
}

async function handleLogout() {
  if (!els.logoutBtn) return;

  els.logoutBtn.disabled = true;
  els.logoutBtn.setAttribute('aria-busy', 'true');

  try {
    await logout();
    stopTasksListener();
  } catch (error) {
    console.error('[main] Erro no logout:', error);
    toast('Nao foi possivel sair. Tente novamente.', 'error');

    // Mantem a aplicacao sincronizada se o logout falhar.
    startTasksListener();
  } finally {
    els.logoutBtn.disabled = false;
    els.logoutBtn.setAttribute('aria-busy', 'false');
  }
}

/* =========================================================
   INICIALIZACAO DOS MODULOS
   ========================================================= */

function bootstrapApp() {
  if (bootstrapped) {
    startTasksListener();
    return;
  }

  bootstrapped = true;

  try {
    populateStaticFilters();

    initKanban(els.board, {
      onCardClick: (taskId) => openEditModal(taskId),
      getUserEmail: () => currentUser?.email || null,
    });

    initModal(els.modalOverlay, els.modalPanel, {
      getUserEmail: () => currentUser?.email || null,
    });

    initDashboard(els.dashboard);
    bindToolbarEvents();
    bindViewEvents();

    unsubscribeTasksChange = onTasksChange((tasks) => {
      renderBoard();
      renderDashboard(tasks);
      populateAssigneeFilter(tasks);

      // calendar.js deve reutilizar ou destruir a instancia anterior.
      initCalendar(tasks);
    });

    startTasksListener();
  } catch (error) {
    bootstrapped = false;
    console.error('[main] Falha ao inicializar a aplicacao:', error);
    toast('Nao foi possivel inicializar a aplicacao.', 'error');
  }
}

/* =========================================================
   FILTROS
   ========================================================= */

function appendOption(selectElement, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  selectElement.appendChild(option);
}

function populateStaticFilters() {
  if (!els.filterCategory || !els.filterPriority) return;

  els.filterCategory.replaceChildren();
  appendOption(
    els.filterCategory,
    'all',
    'Todas as categorias'
  );

  CATEGORIES.forEach((category) => {
    appendOption(
      els.filterCategory,
      category,
      category
    );
  });

  els.filterPriority.replaceChildren();
  appendOption(
    els.filterPriority,
    'all',
    'Todas as prioridades'
  );

  PRIORITIES.forEach((priority) => {
    appendOption(
      els.filterPriority,
      priority.id,
      priority.label
    );
  });
}

function populateAssigneeFilter(tasks) {
  if (!els.filterAssignee) return;

  const currentValue = els.filterAssignee.value || 'all';
  const names = uniqueAssignees(tasks);

  els.filterAssignee.replaceChildren();
  appendOption(
    els.filterAssignee,
    'all',
    'Todos os responsaveis'
  );

  names.forEach((name) => {
    appendOption(els.filterAssignee, name, name);
  });

  if (names.includes(currentValue)) {
    els.filterAssignee.value = currentValue;
  } else {
    els.filterAssignee.value = 'all';

    if (currentValue !== 'all') {
      setFilter('assignee', 'all');
    }
  }
}

function renderFilteredBoard(filterName, value) {
  setFilter(filterName, value);
  renderBoard();
}

function resetToolbarFilters() {
  resetFilters();

  els.searchInput.value = '';
  els.filterCategory.value = 'all';
  els.filterPriority.value = 'all';
  els.filterAssignee.value = 'all';
  els.filterDeadline.value = 'all';
  els.sortSelect.value = 'createdAt-desc';

  renderBoard();
  toast('Filtros limpos.', 'info', 1800);
}

function bindToolbarEvents() {
  els.newTaskBtn.addEventListener('click', () => {
    openCreateModal();
  });

  const debouncedSearch = debounce((value) => {
    renderFilteredBoard('search', value);
  }, 200);

  els.searchInput.addEventListener('input', (event) => {
    debouncedSearch(event.target.value);
  });

  els.filterCategory.addEventListener('change', (event) => {
    renderFilteredBoard('category', event.target.value);
  });

  els.filterPriority.addEventListener('change', (event) => {
    renderFilteredBoard('priority', event.target.value);
  });

  els.filterAssignee.addEventListener('change', (event) => {
    renderFilteredBoard('assignee', event.target.value);
  });

  els.filterDeadline.addEventListener('change', (event) => {
    renderFilteredBoard('deadline', event.target.value);
  });

  els.sortSelect.addEventListener('change', (event) => {
    renderFilteredBoard('sortBy', event.target.value);
  });

  els.resetFiltersBtn.addEventListener(
    'click',
    resetToolbarFilters
  );
}

/* =========================================================
   TEMA
   ========================================================= */

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const theme = savedTheme === 'light' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute('data-theme');

  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
}

/* =========================================================
   ALTERNANCIA ENTRE KANBAN E CALENDARIO
   ========================================================= */

function showKanbanView() {
  els.kanbanSection.hidden = false;
  els.calendarSection.hidden = true;
  els.dashboard.hidden = false;

  els.btnKanbanView.classList.add('active');
  els.btnCalendarView.classList.remove('active');

  els.btnKanbanView.setAttribute('aria-pressed', 'true');
  els.btnCalendarView.setAttribute('aria-pressed', 'false');
}

function showCalendarView() {
  els.kanbanSection.hidden = true;
  els.calendarSection.hidden = false;
  els.dashboard.hidden = true;

  els.btnKanbanView.classList.remove('active');
  els.btnCalendarView.classList.add('active');

  els.btnKanbanView.setAttribute('aria-pressed', 'false');
  els.btnCalendarView.setAttribute('aria-pressed', 'true');

  // Aguarda o navegador aplicar a mudanca de visibilidade.
  requestAnimationFrame(() => {
    refreshCalendarSize();
  });
}

function bindViewEvents() {
  els.btnKanbanView.addEventListener('click', showKanbanView);
  els.btnCalendarView.addEventListener('click', showCalendarView);
}

/* =========================================================
   INICIALIZACAO DA PAGINA
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  els = getRequiredElements();

  if (!validateRequiredElements()) {
    return;
  }

  initTheme();
  showKanbanView();

  els.loginForm.addEventListener('submit', handleLoginSubmit);
  els.logoutBtn.addEventListener('click', handleLogout);
  els.themeToggle.addEventListener('click', toggleTheme);

  observeAuth((user) => {
    currentUser = user;

    if (user) {
      showApp(user);
      return;
    }

    // Garante que dados da sessao anterior nao continuem sincronizando.
    stopTasksListener();
    showLogin();
  });

  window.lucide?.createIcons();
});

/*
 * Mantido para facilitar uma futura rotina de desmontagem da SPA.
 * Atualmente a pagina possui um unico ciclo de vida.
 */
export function destroyMain() {
  stopTasksListener();
  unsubscribeTasksChange?.();
  unsubscribeTasksChange = null;
  bootstrapped = false;
}
