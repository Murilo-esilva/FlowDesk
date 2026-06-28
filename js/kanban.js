/**
 * kanban.js
 * Renderiza o board Kanban (colunas + cartões) e implementa Drag and Drop nativo
 * (HTML5 Drag and Drop API). Não acessa Firestore diretamente: usa tasks.js para
 * ler/mover dados e filters.js para decidir o que exibir.
 */

import { COLUMNS, escapeHtml, initials, formatDate, truncate, deadlineStatus, toast } from './utils.js';
import { getTasks, moveTask } from './tasks.js';
import { applyFilters } from './filters.js';

let boardEl = null;
let onCardClick = null;
let currentUserEmail = null;
let draggedTaskId = null;

const DEADLINE_LABEL = {
  overdue: 'Atrasada',
  'due-3': 'Vence em até 3 dias',
  'due-7': 'Vence em até 7 dias',
};

const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };

/**
 * Inicializa o módulo do board.
 * @param {HTMLElement} el container onde as colunas serão renderizadas
 * @param {{onCardClick: (taskId:string)=>void, getUserEmail: ()=>string}} opts
 */
export function initKanban(el, opts) {
  boardEl = el;
  onCardClick = opts.onCardClick;
  currentUserEmail = opts.getUserEmail;
  renderColumnsShell();
}

/** Cria a estrutura estática das 5 colunas (uma vez). */
function renderColumnsShell() {
  boardEl.innerHTML = COLUMNS.map(
    (col) => `
    <section class="kanban-column" data-status="${col.id}" aria-label="${col.label}">
      <header class="kanban-column__header">
        <div class="kanban-column__title">
          <i data-lucide="${col.icon}"></i>
          <span>${col.label}</span>
        </div>
        <span class="kanban-column__count" id="count-${col.id}">0</span>
      </header>
      <div class="kanban-column__list" id="list-${col.id}" data-status="${col.id}"></div>
    </section>`
  ).join('');

  COLUMNS.forEach((col) => {
    const listEl = document.getElementById(`list-${col.id}`);
    listEl.addEventListener('dragover', handleDragOver);
    listEl.addEventListener('dragleave', handleDragLeave);
    listEl.addEventListener('drop', handleDrop);
  });
}

/** Re-renderiza os cartões dentro das colunas existentes, com base no estado atual. */
export function renderBoard() {
  const all = getTasks();
  const filtered = applyFilters(all);

  COLUMNS.forEach((col) => {
    const listEl = document.getElementById(`list-${col.id}`);
    const countEl = document.getElementById(`count-${col.id}`);
    const tasksInCol = filtered.filter((t) => t.status === col.id);
    countEl.textContent = tasksInCol.length;

    if (!tasksInCol.length) {
      listEl.innerHTML = `<div class="kanban-empty">Nenhuma tarefa aqui</div>`;
      return;
    }

    listEl.innerHTML = tasksInCol.map(cardTemplate).join('');

    listEl.querySelectorAll('.task-card').forEach((card) => {
      card.addEventListener('click', () => onCardClick?.(card.dataset.id));
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function cardTemplate(task) {
  const dStatus = deadlineStatus(task);
  const checklistDone = task.checklist.filter((i) => i.done).length;
  const checklistTotal = task.checklist.length;
  const tagsHtml = task.tags
    .slice(0, 3)
    .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
    .join('');

  return `
    <article class="task-card priority-${task.priority}" draggable="true" data-id="${task.id}" tabindex="0">
      ${dStatus !== 'none' && dStatus !== 'ok' ? `<div class="task-card__flag flag-${dStatus}"><i data-lucide="alarm-clock"></i>${DEADLINE_LABEL[dStatus]}</div>` : ''}
      <div class="task-card__top">
        <span class="badge badge--category">${escapeHtml(task.category)}</span>
        <span class="badge badge--priority priority-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
      </div>
      <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="task-card__desc">${escapeHtml(truncate(task.description, 90))}</p>` : ''}
      ${tagsHtml ? `<div class="task-card__tags">${tagsHtml}</div>` : ''}
      <footer class="task-card__footer">
        <div class="task-card__meta">
          ${task.assignee ? `<span class="avatar" title="${escapeHtml(task.assignee)}">${initials(task.assignee)}</span>` : ''}
          ${task.dueDate ? `<span class="due-date"><i data-lucide="calendar"></i>${formatDate(task.dueDate)}</span>` : ''}
        </div>
        ${checklistTotal ? `<span class="checklist-mini"><i data-lucide="list-checks"></i>${checklistDone}/${checklistTotal}</span>` : ''}
      </footer>
    </article>`;
}

/* ---------- Drag and Drop ---------- */

function handleDragStart(e) {
  draggedTaskId = e.currentTarget.dataset.id;
  e.currentTarget.classList.add('task-card--dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('task-card--dragging');
  document.querySelectorAll('.kanban-column__list--over').forEach((el) =>
    el.classList.remove('kanban-column__list--over')
  );
  draggedTaskId = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('kanban-column__list--over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('kanban-column__list--over');
}

async function handleDrop(e) {
  e.preventDefault();
  const listEl = e.currentTarget;
  listEl.classList.remove('kanban-column__list--over');
  const newStatus = listEl.dataset.status;
  const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
  if (!taskId) return;

  try {
    await moveTask(taskId, newStatus, currentUserEmail?.());
  } catch (err) {
    console.error('[kanban] erro ao mover tarefa:', err);
    toast('Não foi possível mover a tarefa. Tente novamente.', 'error');
  }
}
