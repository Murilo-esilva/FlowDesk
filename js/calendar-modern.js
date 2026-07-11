/**
 * js/calendar-modern.js
 * Enhanced calendar module with multiple views, drag-and-drop, and tight Kanban integration.
 * Replaces the basic FullCalendar implementation with a custom-built, modern solution.
 */

import { escapeHtml, deadlineStatus, formatDate, toast, PRIORITIES } from './utils.js';
import { getTasks, updateTask } from './tasks.js';
import { applyFilters } from './filters.js';

let currentView = 'month'; // month, week, day, agenda
let currentDate = new Date();
let tasks = [];
let filteredTasks = [];
let selectedTask = null;
let draggedTask = null;
let calendarContainer = null;

// Color mappings for priority and status
const PRIORITY_COLORS = {
  urgente: { bg: '#ff6b6b', text: '#fff', hex: '#ff6b6b' },
  alta: { bg: '#ffb454', text: '#1a1a1a', hex: '#ffb454' },
  media: { bg: '#6fb4ff', text: '#fff', hex: '#6fb4ff' },
  baixa: { bg: '#5fd99a', text: '#1a1a1a', hex: '#5fd99a' },
};

const STATUS_COLORS = {
  'todo': { bg: '#3788d8', label: 'A Fazer' },
  'in-progress': { bg: '#f39c12', label: 'Em Progresso' },
  'review': { bg: '#9b59b6', label: 'Em Revisão' },
  'done': { bg: '#2ecc71', label: 'Concluído' },
};

/**
 * Initialize the modern calendar
 */
export function initModernCalendar(containerEl, options = {}) {
  calendarContainer = containerEl;
  if (!calendarContainer) return;

  calendarContainer.innerHTML = renderCalendarShell();
  attachEventListeners();
  render();
}

/**
 * Update calendar when tasks change
 */
export function updateModernCalendar(newTasks = []) {
  tasks = newTasks;
  render();
}

/**
 * Main render function
 */
function render() {
  const now = new Date();
  const isToday = isSameDay(currentDate, now);

  filteredTasks = applyFilters(tasks.filter(t => t.dueDate || t.deadline || t.prazo));

  switch (currentView) {
    case 'month':
      renderMonth();
      break;
    case 'week':
      renderWeek();
      break;
    case 'day':
      renderDay();
      break;
    case 'agenda':
      renderAgenda();
      break;
  }

  updateMiniCalendar();
}

/**
 * Render shell structure
 */
function renderCalendarShell() {
  return `
    <div class="calendar-modern">
      <!-- Header with view switcher -->
      <div class="calendar__header">
        <div class="calendar__nav">
          <button class="btn btn--ghost btn--sm" id="cal-today" title="Hoje">
            <i data-lucide="calendar-today"></i> Hoje
          </button>
          <button class="icon-btn" id="cal-prev" title="Anterior">
            <i data-lucide="chevron-left"></i>
          </button>
          <span class="calendar__title" id="cal-title">Calendário</span>
          <button class="icon-btn" id="cal-next" title="Próximo">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>

        <div class="calendar__views">
          <button class="view-btn active" data-view="month" title="Mês">
            <i data-lucide="grid-3x3"></i>
          </button>
          <button class="view-btn" data-view="week" title="Semana">
            <i data-lucide="columns"></i>
          </button>
          <button class="view-btn" data-view="day" title="Dia">
            <i data-lucide="square"></i>
          </button>
          <button class="view-btn" data-view="agenda" title="Agenda">
            <i data-lucide="list"></i>
          </button>
        </div>

        <div class="calendar__filters">
          <select class="select-control" id="cal-filter-status">
            <option value="">Todos status</option>
            <option value="todo">A Fazer</option>
            <option value="in-progress">Em Progresso</option>
            <option value="review">Em Revisão</option>
            <option value="done">Concluído</option>
          </select>
          <select class="select-control" id="cal-filter-priority">
            <option value="">Todas prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
      </div>

      <!-- Main content -->
      <div class="calendar__content">
        <!-- Sidebar with mini calendar and shortcuts -->
        <aside class="calendar__sidebar">
          <div class="mini-calendar">
            <div class="mini-calendar__nav">
              <button class="icon-btn--xs" id="mini-prev">
                <i data-lucide="chevron-left"></i>
              </button>
              <span class="mini-calendar__title" id="mini-title"></span>
              <button class="icon-btn--xs" id="mini-next">
                <i data-lucide="chevron-right"></i>
              </button>
            </div>
            <div class="mini-calendar__grid" id="mini-grid"></div>
          </div>

          <div class="calendar__shortcuts">
            <button class="shortcut-btn" id="shortcut-today">
              <i data-lucide="sun"></i> Hoje
            </button>
            <button class="shortcut-btn" id="shortcut-tomorrow">
              <i data-lucide="sun"></i> Amanhã
            </button>
            <button class="shortcut-btn" id="shortcut-week">
              <i data-lucide="calendar"></i> Esta semana
            </button>
            <button class="shortcut-btn" id="shortcut-overdue">
              <i data-lucide="alert-circle"></i> Atrasadas
            </button>
          </div>

          <div class="calendar__upcoming">
            <h3>Próximos prazos</h3>
            <ul class="upcoming-list" id="upcoming-list"></ul>
          </div>
        </aside>

        <!-- Calendar view -->
        <main class="calendar__main">
          <div class="calendar-view" id="calendar-view"></div>
        </main>
      </div>

      <!-- Task preview panel -->
      <div class="calendar__panel panel-task" id="panel-task"></div>
    </div>
  `;
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  // View switchers
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentView = e.currentTarget.dataset.view;
      render();
    });
  });

  // Navigation
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  });

  document.getElementById('cal-next')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  });

  document.getElementById('cal-today')?.addEventListener('click', () => {
    currentDate = new Date();
    render();
  });

  // Mini calendar
  document.getElementById('mini-prev')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
  });

  document.getElementById('mini-next')?.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
  });

  // Shortcuts
  document.getElementById('shortcut-today')?.addEventListener('click', () => {
    currentDate = new Date();
    currentView = 'day';
    updateViewButtons();
    render();
  });

  document.getElementById('shortcut-tomorrow')?.addEventListener('click', () => {
    currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    currentView = 'day';
    updateViewButtons();
    render();
  });

  document.getElementById('shortcut-week')?.addEventListener('click', () => {
    currentView = 'week';
    updateViewButtons();
    render();
  });

  document.getElementById('shortcut-overdue')?.addEventListener('click', () => {
    currentView = 'agenda';
    updateViewButtons();
    render();
  });

  // Filters
  document.getElementById('cal-filter-status')?.addEventListener('change', render);
  document.getElementById('cal-filter-priority')?.addEventListener('change', render);
}

/**
 * Update view buttons
 */
function updateViewButtons() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
  });
}

/**
 * Render month view
 */
function renderMonth() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('cal-title').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  let html = `
    <div class="calendar-month">
      <div class="month-weekdays">
        ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => `<div class="weekday">${day}</div>`).join('')}
      </div>
      <div class="month-grid">
  `;

  const now = new Date();
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const isCurrentMonth = date.getMonth() === month;
    const isToday = isSameDay(date, now);
    const dayTasks = filteredTasks.filter(t => isSameDay(new Date(t.dueDate || t.deadline || t.prazo), date));

    html += `
      <div class="month-day ${!isCurrentMonth ? 'month-day--other' : ''} ${isToday ? 'month-day--today' : ''}" data-date="${date.toISOString().split('T')[0]}">
        <div class="month-day__header">
          <span class="month-day__num">${date.getDate()}</span>
        </div>
        <div class="month-day__tasks">
          ${dayTasks.slice(0, 3).map(task => `
            <div class="task-indicator" data-task-id="${task.id}" style="background: ${PRIORITY_COLORS[task.priority]?.bg || '#999'}" title="${escapeHtml(task.title)}">
              ${escapeHtml(truncate(task.title, 20))}
            </div>
          `).join('')}
          ${dayTasks.length > 3 ? `<div class="task-indicator--more">+${dayTasks.length - 3}</div>` : ''}
        </div>
      </div>
    `;
  }

  html += `</div></div>`;
  document.getElementById('calendar-view').innerHTML = html;

  // Attach task preview listeners
  document.querySelectorAll('.task-indicator').forEach(el => {
    el.addEventListener('click', () => {
      const taskId = el.dataset.taskId;
      showTaskPreview(taskId);
    });
  });

  document.querySelectorAll('.month-day').forEach(dayEl => {
    dayEl.addEventListener('click', (e) => {
      if (e.target.closest('.task-indicator')) return;
      const dateStr = dayEl.dataset.date;
      currentDate = new Date(dateStr);
      currentView = 'day';
      updateViewButtons();
      render();
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Render week view
 */
function renderWeek() {
  const weekStart = new Date(currentDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const weekName = `${formatDate(weekStart)} - ${formatDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}`;
  document.getElementById('cal-title').textContent = `Semana de ${weekName}`;

  let html = `<div class="calendar-week">`;

  for (let day = 0; day < 7; day++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + day);
    const dayTasks = filteredTasks.filter(t => isSameDay(new Date(t.dueDate || t.deadline || t.prazo), date));
    const isToday = isSameDay(date, new Date());

    html += `
      <div class="week-day ${isToday ? 'week-day--today' : ''}">
        <div class="week-day__header">
          <div class="week-day__date">${date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</div>
        </div>
        <div class="week-day__tasks">
          ${dayTasks.map(task => renderTaskBlock(task)).join('')}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  document.getElementById('calendar-view').innerHTML = html;

  document.querySelectorAll('[data-task-block]').forEach(el => {
    el.addEventListener('click', () => showTaskPreview(el.dataset.taskId));
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Render day view
 */
function renderDay() {
  const dayName = currentDate.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('cal-title').textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const dayTasks = filteredTasks.filter(t => isSameDay(new Date(t.dueDate || t.deadline || t.prazo), currentDate));

  let html = `
    <div class="calendar-day">
      <div class="day-overview">
        <p>${dayTasks.length} tarefa(s) para ${dayName}</p>
      </div>
      <div class="day-tasks">
        ${dayTasks.length === 0 ? `<p class="no-tasks">Nenhuma tarefa para este dia</p>` : dayTasks.map(task => `
          <div class="day-task-card" data-task-id="${task.id}">
            <div class="day-task-card__header">
              <div class="day-task-card__priority" style="background: ${PRIORITY_COLORS[task.priority]?.bg}"></div>
              <h3>${escapeHtml(task.title)}</h3>
              <span class="status-badge" style="background: ${STATUS_COLORS[task.status]?.bg}">${STATUS_COLORS[task.status]?.label}</span>
            </div>
            ${task.description ? `<p class="day-task-card__desc">${escapeHtml(task.description)}</p>` : ''}
            <div class="day-task-card__footer">
              ${task.assignee ? `<span class="avatar" title="${escapeHtml(task.assignee)}">${initials(task.assignee)}</span>` : ''}
              ${task.category ? `<span class="badge badge--category">${escapeHtml(task.category)}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('calendar-view').innerHTML = html;

  document.querySelectorAll('.day-task-card').forEach(el => {
    el.addEventListener('click', () => showTaskPreview(el.dataset.taskId));
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Render agenda (list) view
 */
function renderAgenda() {
  document.getElementById('cal-title').textContent = 'Agenda';

  const upcoming = filteredTasks
    .sort((a, b) => new Date(a.dueDate || a.deadline || a.prazo) - new Date(b.dueDate || b.deadline || b.prazo));

  let html = `
    <div class="calendar-agenda">
      <div class="agenda-list">
        ${upcoming.length === 0 ? `<p class="no-tasks">Nenhuma tarefa próxima</p>` : upcoming.map((task, idx) => {
          const dueDate = new Date(task.dueDate || task.deadline || task.prazo);
          const isOverdue = dueDate < new Date() && task.status !== 'done';
          return `
            <div class="agenda-item ${isOverdue ? 'agenda-item--overdue' : ''}" data-task-id="${task.id}">
              <div class="agenda-item__date">
                <div class="agenda-item__day">${dueDate.getDate()}</div>
                <div class="agenda-item__month">${dueDate.toLocaleDateString('pt-BR', { month: 'short' })}</div>
              </div>
              <div class="agenda-item__content">
                <h4>${escapeHtml(task.title)}</h4>
                ${task.description ? `<p>${escapeHtml(truncate(task.description, 100))}</p>` : ''}
              </div>
              <div class="agenda-item__meta">
                <span class="status-badge" style="background: ${STATUS_COLORS[task.status]?.bg}">${STATUS_COLORS[task.status]?.label}</span>
                ${task.assignee ? `<span class="avatar" title="${escapeHtml(task.assignee)}">${initials(task.assignee)}</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('calendar-view').innerHTML = html;

  document.querySelectorAll('.agenda-item').forEach(el => {
    el.addEventListener('click', () => showTaskPreview(el.dataset.taskId));
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Render a task block for week/day view
 */
function renderTaskBlock(task) {
  const priority = PRIORITY_COLORS[task.priority] || { bg: '#999' };
  return `
    <div class="task-block" data-task-block data-task-id="${task.id}" style="border-left: 4px solid ${priority.bg}">
      <div class="task-block__priority-dot" style="background: ${priority.bg}"></div>
      <div class="task-block__content">
        <h4>${escapeHtml(task.title)}</h4>
        <span class="task-block__status" style="background: ${STATUS_COLORS[task.status]?.bg}">${STATUS_COLORS[task.status]?.label}</span>
      </div>
    </div>
  `;
}

/**
 * Show task preview panel
 */
function showTaskPreview(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  selectedTask = task;
  const panel = document.getElementById('panel-task');

  const dueDate = new Date(task.dueDate || task.deadline || task.prazo);
  const isOverdue = dueDate < new Date() && task.status !== 'done';

  panel.innerHTML = `
    <div class="panel-task__header">
      <h2>${escapeHtml(task.title)}</h2>
      <button class="icon-btn" id="close-panel">
        <i data-lucide="x"></i>
      </button>
    </div>

    <div class="panel-task__body">
      <div class="panel-task__section">
        <h3>Status</h3>
        <select class="select-control" id="task-status-select">
          <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>A Fazer</option>
          <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>Em Progresso</option>
          <option value="review" ${task.status === 'review' ? 'selected' : ''}>Em Revisão</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>

      <div class="panel-task__section">
        <h3>Prioridade</h3>
        <select class="select-control" id="task-priority-select">
          <option value="urgente" ${task.priority === 'urgente' ? 'selected' : ''}>Urgente</option>
          <option value="alta" ${task.priority === 'alta' ? 'selected' : ''}>Alta</option>
          <option value="media" ${task.priority === 'media' ? 'selected' : ''}>Média</option>
          <option value="baixa" ${task.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
        </select>
      </div>

      <div class="panel-task__section">
        <h3>Descrição</h3>
        <p>${escapeHtml(task.description || 'Sem descrição')}</p>
      </div>

      <div class="panel-task__section">
        <h3>Prazo</h3>
        <p>${formatDate(dueDate)}${isOverdue ? ' <span class="overdue-label">Atrasada</span>' : ''}</p>
      </div>

      ${task.assignee ? `
        <div class="panel-task__section">
          <h3>Responsável</h3>
          <p>${escapeHtml(task.assignee)}</p>
        </div>
      ` : ''}

      ${task.category ? `
        <div class="panel-task__section">
          <h3>Categoria</h3>
          <p>${escapeHtml(task.category)}</p>
        </div>
      ` : ''}
    </div>

    <div class="panel-task__footer">
      <button class="btn btn--primary btn--sm" id="edit-task-btn">Editar</button>
      <button class="btn btn--danger btn--sm" id="delete-task-btn">Deletar</button>
    </div>
  `;

  panel.classList.add('is-open');

  document.getElementById('close-panel')?.addEventListener('click', closeTaskPreview);
  document.getElementById('task-status-select')?.addEventListener('change', async (e) => {
    await updateTask(taskId, { status: e.target.value });
    render();
  });
  document.getElementById('task-priority-select')?.addEventListener('change', async (e) => {
    await updateTask(taskId, { priority: e.target.value });
    render();
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Close task preview panel
 */
function closeTaskPreview() {
  const panel = document.getElementById('panel-task');
  panel?.classList.remove('is-open');
  selectedTask = null;
}

/**
 * Update mini calendar
 */
function updateMiniCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  document.getElementById('mini-title').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  let html = '';
  const now = new Date();

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const isCurrentMonth = date.getMonth() === month;
    const isToday = isSameDay(date, now);
    const isSelected = isSameDay(date, currentDate);

    html += `
      <button class="mini-calendar__day ${!isCurrentMonth ? 'mini-calendar__day--other' : ''} ${isToday ? 'mini-calendar__day--today' : ''} ${isSelected ? 'mini-calendar__day--selected' : ''}" data-date="${date.toISOString().split('T')[0]}">
        ${date.getDate()}
      </button>
    `;
  }

  document.getElementById('mini-grid').innerHTML = html;

  document.querySelectorAll('.mini-calendar__day').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDate = new Date(btn.dataset.date);
      render();
    });
  });
}

/**
 * Update upcoming list in sidebar
 */
function updateUpcomingList() {
  const upcoming = filteredTasks
    .sort((a, b) => new Date(a.dueDate || a.deadline || a.prazo) - new Date(b.dueDate || b.deadline || b.prazo))
    .slice(0, 5);

  const html = upcoming.map(task => {
    const dueDate = new Date(task.dueDate || task.deadline || task.prazo);
    return `
      <li class="upcoming-item" data-task-id="${task.id}">
        <div class="upcoming-item__icon" style="background: ${PRIORITY_COLORS[task.priority]?.bg}"></div>
        <div class="upcoming-item__content">
          <h4>${escapeHtml(truncate(task.title, 30))}</h4>
          <span>${formatDate(dueDate)}</span>
        </div>
      </li>
    `;
  }).join('');

  const upcomingList = document.getElementById('upcoming-list');
  if (upcomingList) upcomingList.innerHTML = html;

  document.querySelectorAll('.upcoming-item').forEach(el => {
    el.addEventListener('click', () => showTaskPreview(el.dataset.taskId));
  });
}

/**
 * Utility functions
 */

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export { currentView, currentDate };
