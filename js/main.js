import {
  initCalendar,
  refreshCalendarSize,
} from './calendar.js';

import {
  login,
  logout,
  observeAuth,
  translateAuthError,
} from './auth.js';

import {
  startTaskslistener,
  stopTasksListener,
  onTasksChange,
} from './tasks.js';

import {
  initKanban,
  renderBoard,
} from './kanban.js';

import {
  initModal,
  openCreateModal,
  openEditModal,
} from './modal.js';

import {
  initDashboard,
  renderDashboard,
} from './dashboard.js';

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

/* ==========================================================
   ESTADO DA APLICAÇÃO
========================================================== */

let currentUser = null;
let bootstrapped = false;
let activeView = 'kanban';

/* ==========================================================
   ELEMENTOS DO DOM
========================================================== */

const els = {
  // Telas
  loginScreen: document.getElementById('login-screen'),
  appScreen: document.getElementById('app-screen'),

  // Login
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  loginSubmitBtn: document.getElementById('login-submit'),

  // Usuário
  userEmail: document.getElementById('user-email'),
  userAvatar: document.getElementById('user-avatar'),
  logoutBtn: document.getElementById('logout-btn'),

  // Visualizações
  kanbanSection: document.getElementById('kanban-section'),
  calendarSection: document.getElementById('calendar-section'),
  btnKanbanView: document.getElementById('btn-kanban-view'),
  btnCalendarView: document.getElementById('btn-calendar-view'),

  // Kanban e dashboard
  board: document.getElementById('kanban-board'),
  dashboard: document.getElementById('dashboard'),

  // Calendário
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

  // Tema
  themeToggle: document.getElementById('theme-toggle'),
};

/* ==========================================================
   AUTENTICAÇÃO
========================================================== */

observeAuth((user) => {
  currentUser = user;

  if (user) {
    showApp(user);
  } else {
    showLogin();
  }
});

/**
 * Realiza o login do usuário.
 */
els.loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

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
  } catch (error) {
    console.error('Erro ao realizar login:', error);

    const message = translateAuthError(error?.code);
    setLoginError(message || 'Não foi possível realizar o login.');
  } finally {
    setLoginLoading(false);
  }
});

/**
 * Encerra a sessão do usuário.
 */
els.logoutBtn?.addEventListener('click', async () => {
  try {
    els.logoutBtn.disabled = true;

    stopTasksListener();
    await logout();
  } catch (error) {
    console.error('Erro ao sair:', error);
    toast('Não foi possível encerrar a sessão.', 'error');
  } finally {
    els.logoutBtn.disabled = false;
  }
});

/**
 * Exibe a tela de login.
 */
function showLogin() {
  currentUser = null;

  els.appScreen?.classList.remove('is-visible');
  els.loginScreen?.classList.add('is-visible');

  setLoginError('');
}

/**
 * Exibe a aplicação principal.
 *
 * @param {Object} user Usuário autenticado.
 */
function showApp(user) {
  els.loginScreen?.classList.remove('is-visible');
  els.appScreen?.classList.add('is-visible');

  const email = user?.email || '';

  if (els.userEmail) {
    els.userEmail.textContent = email;
  }

  if (els.userAvatar) {
    els.userAvatar.textContent = getUserInitials(email);
  }

  showKanbanView();
  bootstrapApp();
}

/**
 * Retorna as iniciais que serão mostradas no avatar.
 *
 * @param {string} email E-mail do usuário.
 * @returns {string}
 */
function getUserInitials(email) {
  if (!email) return '--';

  const username = email.split('@')[0];

  const parts = username
    .split(/[._\-\s]+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return username.slice(0, 2).toUpperCase();
}

/**
 * Exibe uma mensagem de erro no formulário de login.
 *
 * @param {string} message Mensagem de erro.
 */
function setLoginError(message) {
  if (els.loginError) {
    els.loginError.textContent = message;
  }
}

/**
 * Controla o estado de carregamento do botão de login.
 *
 * @param {boolean} isLoading Estado de carregamento.
 */
function setLoginLoading(isLoading) {
  if (!els.loginSubmitBtn) return;

  els.loginSubmitBtn.disabled = isLoading;
  els.loginSubmitBtn.classList.toggle('is-loading', isLoading);
}

/* ==========================================================
   INICIALIZAÇÃO DA APLICAÇÃO
========================================================== */

/**
 * Inicializa os módulos da aplicação uma única vez.
 */
function bootstrapApp() {
  if (bootstrapped) {
    startTaskslistener();
    return;
  }

  bootstrapped = true;

  populateStaticFilters();

  initKanban(els.board, {
    onCardClick: (taskId) => {
      openEditModal(taskId);
    },

    getUserEmail: () => currentUser?.email || '',
  });

  initModal(els.modalOverlay, els.modalPanel, {
    getUserEmail: () => currentUser?.email || '',
  });

  initDashboard(els.dashboard);

  bindToolbarEvents();
  bindViewEvents();

  /*
   * O calendário recebe as tarefas sempre que houver uma alteração.
   * O calendar.js deve reutilizar a instância existente do FullCalendar.
   */
  onTasksChange((tasks = []) => {
    renderBoard();
    renderDashboard(tasks);
    populateAssigneeFilter(tasks);
    initCalendar(tasks);

    if (activeView === 'calendar') {
      requestAnimationFrame(() => {
        refreshCalendarSize();
      });
    }

    window.lucide?.createIcons();
  });

  startTaskslistener();
}

/* ==========================================================
   FILTROS
========================================================== */

/**
 * Preenche os filtros fixos de categoria e prioridade.
 */
function populateStaticFilters() {
  if (els.filterCategory) {
    els.filterCategory.innerHTML = [
      '<option value="all">Todas categorias</option>',
      ...CATEGORIES.map((category) => {
        return `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`;
      }),
    ].join('');
  }

  if (els.filterPriority) {
    els.filterPriority.innerHTML = [
      '<option value="all">Todas prioridades</option>',
      ...PRIORITIES.map((priority) => {
        return `
          <option value="${escapeHtml(priority.id)}">
            ${escapeHtml(priority.label)}
          </option>
        `;
      }),
    ].join('');
  }
}

/**
 * Preenche o filtro de responsáveis com base nas tarefas.
 *
 * @param {Array} tasks Lista de tarefas.
 */
function populateAssigneeFilter(tasks) {
  if (!els.filterAssignee) return;

  const selectedValue = els.filterAssignee.value || 'all';
  const names = uniqueAssignees(tasks);

  els.filterAssignee.innerHTML = [
    '<option value="all">Todos responsáveis</option>',
    ...names.map((name) => {
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }),
  ].join('');

  if (names.includes(selectedValue)) {
    els.filterAssignee.value = selectedValue;
  } else {
    els.filterAssignee.value = 'all';
  }
}

/* ==========================================================
   EVENTOS DA TOOLBAR
========================================================== */

/**
 * Registra os eventos da barra de ferramentas.
 */
function bindToolbarEvents() {
  els.newTaskBtn?.addEventListener('click', () => {
    openCreateModal();
  });

  els.calendarNewTaskBtn?.addEventListener('click', () => {
    openCreateModal();
  });

  const debouncedSearch = debounce((value) => {
    setFilter('search', value.trim());
    renderBoard();
  }, 200);

  els.searchInput?.addEventListener('input', (event) => {
    debouncedSearch(event.target.value);
  });

  els.filterCategory?.addEventListener('change', (event) => {
    setFilter('category', event.target.value);
    renderBoard();
  });

  els.filterPriority?.addEventListener('change', (event) => {
    setFilter('priority', event.target.value);
    renderBoard();
  });

  els.filterAssignee?.addEventListener('change', (event) => {
    setFilter('assignee', event.target.value);
    renderBoard();
  });

  els.filterDeadline?.addEventListener('change', (event) => {
    setFilter('deadline', event.target.value);
    renderBoard();
  });

  els.sortSelect?.addEventListener('change', (event) => {
    setFilter('sortBy', event.target.value);
    renderBoard();
  });

  els.resetFiltersBtn?.addEventListener('click', () => {
    resetAllFilters();
  });
}

/**
 * Limpa os filtros e atualiza o quadro.
 */
function resetAllFilters() {
  resetFilters();

  if (els.searchInput) {
    els.searchInput.value = '';
  }

  if (els.filterCategory) {
    els.filterCategory.value = 'all';
  }

  if (els.filterPriority) {
    els.filterPriority.value = 'all';
  }

  if (els.filterAssignee) {
    els.filterAssignee.value = 'all';
  }

  if (els.filterDeadline) {
    els.filterDeadline.value = 'all';
  }

  if (els.sortSelect) {
    els.sortSelect.value = 'createdAt-desc';
  }

  renderBoard();
  toast('Filtros limpos.', 'info', 1800);
}

/* ==========================================================
   ALTERNÂNCIA ENTRE KANBAN E CALENDÁRIO
========================================================== */

/**
 * Registra os eventos dos botões de visualização.
 */
function bindViewEvents() {
  els.btnKanbanView?.addEventListener('click', () => {
    showKanbanView();
  });

  els.btnCalendarView?.addEventListener('click', () => {
    showCalendarView();
  });
}

/**
 * Mostra a visualização Kanban.
 */
function showKanbanView() {
  activeView = 'kanban';

  if (els.kanbanSection) {
    els.kanbanSection.hidden = false;
  }

  if (els.calendarSection) {
    els.calendarSection.hidden = true;
  }

  els.btnKanbanView?.classList.add('active');
  els.btnCalendarView?.classList.remove('active');

  els.btnKanbanView?.setAttribute('aria-pressed', 'true');
  els.btnCalendarView?.setAttribute('aria-pressed', 'false');

  window.lucide?.createIcons();
}

/**
 * Mostra a visualização do calendário.
 */
function showCalendarView() {
  activeView = 'calendar';

  if (els.kanbanSection) {
    els.kanbanSection.hidden = true;
  }

  if (els.calendarSection) {
    els.calendarSection.hidden = false;
  }

  els.btnKanbanView?.classList.remove('active');
  els.btnCalendarView?.classList.add('active');

  els.btnKanbanView?.setAttribute('aria-pressed', 'false');
  els.btnCalendarView?.setAttribute('aria-pressed', 'true');

  /*
   * O calendário foi criado enquanto seu contêiner estava oculto.
   * Por isso, o ajuste de tamanho deve ocorrer após a exibição.
   */
  requestAnimationFrame(() => {
    refreshCalendarSize();

    /*
     * Um segundo ajuste ajuda quando o layout possui transições CSS.
     */
    setTimeout(() => {
      refreshCalendarSize();
    }, 100);
  });

  window.lucide?.createIcons();
}

/* ==========================================================
   TEMA
========================================================== */

const THEME_KEY = 'ctb-theme';

/**
 * Inicializa o tema salvo no navegador.
 */
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const theme = savedTheme === 'light' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Alterna entre os temas claro e escuro.
 */
els.themeToggle?.addEventListener('click', () => {
  const currentTheme =
    document.documentElement.getAttribute('data-theme') || 'dark';

  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);

  /*
   * Recalcula o tamanho do calendário após a mudança visual.
   */
  if (activeView === 'calendar') {
    requestAnimationFrame(() => {
      refreshCalendarSize();
    });
  }
});

initTheme();

/* ==========================================================
   EVENTOS GLOBAIS
========================================================== */

/**
 * Recalcula o calendário quando a janela mudar de tamanho.
 */
window.addEventListener(
  'resize',
  debounce(() => {
    if (activeView === 'calendar') {
      refreshCalendarSize();
    }
  }, 150),
);

/**
 * Fecha o modal ao pressionar Escape.
 * O modal.js pode complementar esse comportamento.
 */
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!els.modalOverlay) return;

  const modalIsOpen =
    els.modalOverlay.classList.contains('is-visible') ||
    els.modalOverlay.classList.contains('is-open');

  if (!modalIsOpen) return;

  els.modalOverlay.classList.remove('is-visible', 'is-open');
  els.modalOverlay.setAttribute('aria-hidden', 'true');

  if (els.modalPanel) {
    els.modalPanel.innerHTML = '';
  }
});

/* ==========================================================
   FUNÇÕES AUXILIARES
========================================================== */

/**
 * Escapa caracteres HTML antes de inserir valores no innerHTML.
 *
 * @param {*} value Valor que será escapado.
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
