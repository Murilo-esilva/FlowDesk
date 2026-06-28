/**
 * modal.js
 * Controla o modal de tarefa: modo criação e modo edição, checklist interativo
 * e timeline de histórico. Delega toda persistência para tasks.js.
 */

import {
  COLUMNS, PRIORITIES, CATEGORIES, escapeHtml, uid, formatDateTime, relativeTime, toast,
} from './utils.js';
import {
  createTask, updateTask, deleteTask, getTaskById,
  toggleChecklistItem, addChecklistItem, removeChecklistItem,
} from './tasks.js';

let overlayEl, panelEl, getUserEmail;
let editingTaskId = null; // null => modo criação
let draftChecklist = [];  // checklist em edição local antes de salvar (modo criação)

const HISTORY_ICON = {
  created: 'sparkles', updated: 'pencil', moved: 'move', checklist: 'list-checks', deleted: 'trash-2',
};

export function initModal(overlay, panel, opts) {
  overlayEl = overlay;
  panelEl = panel;
  getUserEmail = opts.getUserEmail;

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl.classList.contains('is-open')) closeModal();
  });
}

export function openCreateModal(defaultStatus = 'solicitado') {
  editingTaskId = null;
  draftChecklist = [];
  panelEl.innerHTML = formTemplate(null, defaultStatus);
  bindFormEvents(null);
  openOverlay();
}

export function openEditModal(taskId) {
  const task = getTaskById(taskId);
  if (!task) return;
  editingTaskId = taskId;
  panelEl.innerHTML = formTemplate(task);
  bindFormEvents(task);
  openOverlay();
}

function openOverlay() {
  overlayEl.classList.add('is-open');
  document.body.classList.add('no-scroll');
  if (window.lucide) window.lucide.createIcons();
  panelEl.querySelector('input[name="title"]')?.focus();
}

export function closeModal() {
  overlayEl.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
  editingTaskId = null;
}

/* ---------- Template ---------- */

function formTemplate(task, defaultStatus = 'solicitado') {
  const t = task || {
    title: '', description: '', category: CATEGORIES[0], priority: 'media',
    assignee: '', dueDate: '', status: defaultStatus, tags: [], checklist: [],
    notes: '', fileLink: '', history: [],
  };
  const checklist = task ? t.checklist : draftChecklist;

  return `
    <header class="modal__header">
      <h2>${task ? 'Editar tarefa' : 'Nova tarefa'}</h2>
      <button type="button" class="icon-btn" data-action="close" aria-label="Fechar">
        <i data-lucide="x"></i>
      </button>
    </header>

    <form class="modal__form" id="task-form" novalidate>
      <div class="form-grid">
        <label class="field field--full">
          <span>Título *</span>
          <input type="text" name="title" required maxlength="120" value="${escapeHtml(t.title)}" placeholder="Ex: Banner para Festival de Inverno" />
        </label>

        <label class="field field--full">
          <span>Descrição</span>
          <textarea name="description" rows="3" placeholder="Detalhes da solicitação...">${escapeHtml(t.description)}</textarea>
        </label>

        <label class="field">
          <span>Categoria</span>
          <select name="category">
            ${CATEGORIES.map((c) => `<option value="${c}" ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>Prioridade</span>
          <select name="priority">
            ${PRIORITIES.map((p) => `<option value="${p.id}" ${p.id === t.priority ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>Responsável</span>
          <input type="text" name="assignee" maxlength="60" value="${escapeHtml(t.assignee)}" placeholder="Nome do designer" />
        </label>

        <label class="field">
          <span>Prazo</span>
          <input type="date" name="dueDate" value="${t.dueDate ? String(t.dueDate).slice(0, 10) : ''}" />
        </label>

        <label class="field">
          <span>Status</span>
          <select name="status">
            ${COLUMNS.map((c) => `<option value="${c.id}" ${c.id === t.status ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </label>

        <label class="field">
          <span>Link do arquivo</span>
          <input type="url" name="fileLink" value="${escapeHtml(t.fileLink)}" placeholder="Google Drive, Canva, Figma..." />
        </label>

        <label class="field field--full">
          <span>Tags <small>(separadas por vírgula)</small></span>
          <input type="text" name="tags" value="${escapeHtml((t.tags || []).join(', '))}" placeholder="curso, evento, idosos" />
        </label>

        <label class="field field--full">
          <span>Observações</span>
          <textarea name="notes" rows="2" placeholder="Anotações internas...">${escapeHtml(t.notes)}</textarea>
        </label>
      </div>

      <div class="checklist-block">
        <div class="checklist-block__header">
          <span><i data-lucide="list-checks"></i> Checklist</span>
        </div>
        <ul class="checklist-list" id="checklist-list">
          ${checklist.map((item) => checklistItemTemplate(item)).join('') || '<li class="checklist-empty">Nenhum item ainda.</li>'}
        </ul>
        <div class="checklist-add">
          <input type="text" id="checklist-input" placeholder="Adicionar item ao checklist..." maxlength="120" />
          <button type="button" class="btn btn--ghost btn--sm" id="checklist-add-btn">
            <i data-lucide="plus"></i> Adicionar
          </button>
        </div>
      </div>

      ${task ? historyTemplate(t.history) : ''}

      <footer class="modal__footer">
        ${task ? `<button type="button" class="btn btn--danger" id="delete-task-btn"><i data-lucide="trash-2"></i> Excluir</button>` : '<span></span>'}
        <div class="modal__footer-actions">
          <button type="button" class="btn btn--ghost" data-action="close">Cancelar</button>
          <button type="submit" class="btn btn--primary">
            <i data-lucide="check"></i> ${task ? 'Salvar alterações' : 'Criar tarefa'}
          </button>
        </div>
      </footer>
    </form>
  `;
}

function checklistItemTemplate(item) {
  return `
    <li class="checklist-item ${item.done ? 'is-done' : ''}" data-id="${item.id}">
      <label class="checklist-item__label">
        <input type="checkbox" ${item.done ? 'checked' : ''} class="checklist-toggle" />
        <span>${escapeHtml(item.label)}</span>
      </label>
      <button type="button" class="icon-btn icon-btn--xs checklist-remove" aria-label="Remover item">
        <i data-lucide="x"></i>
      </button>
    </li>`;
}

function historyTemplate(history) {
  if (!history?.length) return '';
  const sorted = [...history].sort((a, b) => new Date(b.at) - new Date(a.at));
  return `
    <div class="history-block">
      <div class="history-block__header"><i data-lucide="history"></i> Histórico</div>
      <ul class="history-list">
        ${sorted
          .slice(0, 12)
          .map(
            (h) => `
          <li class="history-item">
            <i data-lucide="${HISTORY_ICON[h.action] || 'circle'}"></i>
            <div>
              <p>${escapeHtml(h.detail)}</p>
              <small title="${formatDateTime(h.at)}">${escapeHtml(h.author)} · ${relativeTime(h.at)}</small>
            </div>
          </li>`
          )
          .join('')}
      </ul>
    </div>`;
}

/* ---------- Eventos ---------- */

function bindFormEvents(task) {
  const form = panelEl.querySelector('#task-form');
  panelEl.querySelectorAll('[data-action="close"]').forEach((btn) =>
    btn.addEventListener('click', closeModal)
  );

  // Checklist: adicionar
  const addBtn = panelEl.querySelector('#checklist-add-btn');
  const input = panelEl.querySelector('#checklist-input');
  const addHandler = async () => {
    const label = input.value.trim();
    if (!label) return;
    if (task) {
      await safeCall(() => addChecklistItem(task.id, label, getUserEmail()));
      refreshAfterMutation(task.id);
    } else {
      draftChecklist.push({ id: uid('chk'), label, done: false });
      rerenderChecklist();
    }
    input.value = '';
    input.focus();
  };
  addBtn.addEventListener('click', addHandler);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHandler();
    }
  });

  bindChecklistItemEvents(task);

  // Excluir tarefa
  const delBtn = panelEl.querySelector('#delete-task-btn');
  delBtn?.addEventListener('click', async () => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa? Essa ação não pode ser desfeita.')) return;
    await safeCall(async () => {
      await deleteTask(task.id);
      toast('Tarefa excluída.', 'success');
      closeModal();
    });
  });

  // Submit (criar/salvar)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      category: fd.get('category'),
      priority: fd.get('priority'),
      assignee: fd.get('assignee'),
      dueDate: fd.get('dueDate') || null,
      status: fd.get('status'),
      fileLink: fd.get('fileLink'),
      notes: fd.get('notes'),
      tags: String(fd.get('tags') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (!payload.title?.trim()) {
      toast('Informe um título para a tarefa.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (task) {
        await updateTask(task.id, payload, getUserEmail());
        toast('Tarefa atualizada.', 'success');
      } else {
        payload.checklist = draftChecklist;
        await createTask(payload, getUserEmail());
        toast('Tarefa criada.', 'success');
      }
      closeModal();
    } catch (err) {
      console.error('[modal] erro ao salvar tarefa:', err);
      toast('Erro ao salvar a tarefa. Tente novamente.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function bindChecklistItemEvents(task) {
  panelEl.querySelectorAll('.checklist-item').forEach((li) => {
    const itemId = li.dataset.id;
    li.querySelector('.checklist-toggle').addEventListener('change', async () => {
      if (task) {
        await safeCall(() => toggleChecklistItem(task.id, itemId, getUserEmail()));
        refreshAfterMutation(task.id);
      } else {
        const item = draftChecklist.find((i) => i.id === itemId);
        item.done = !item.done;
        rerenderChecklist();
      }
    });
    li.querySelector('.checklist-remove').addEventListener('click', async () => {
      if (task) {
        await safeCall(() => removeChecklistItem(task.id, itemId, getUserEmail()));
        refreshAfterMutation(task.id);
      } else {
        draftChecklist = draftChecklist.filter((i) => i.id !== itemId);
        rerenderChecklist();
      }
    });
  });
}

/** Re-renderiza apenas a lista de checklist no modo criação (sem fechar o modal). */
function rerenderChecklist() {
  const list = panelEl.querySelector('#checklist-list');
  list.innerHTML =
    draftChecklist.map(checklistItemTemplate).join('') ||
    '<li class="checklist-empty">Nenhum item ainda.</li>';
  if (window.lucide) window.lucide.createIcons();
  bindChecklistItemEvents(null);
}

/** Após uma mutação no modo edição, redesenha o modal inteiro com dados frescos. */
function refreshAfterMutation(taskId) {
  const fresh = getTaskById(taskId);
  if (!fresh) return closeModal();
  panelEl.innerHTML = formTemplate(fresh);
  bindFormEvents(fresh);
  if (window.lucide) window.lucide.createIcons();
}

async function safeCall(fn) {
  try {
    await fn();
  } catch (err) {
    console.error('[modal] erro:', err);
    toast('Ocorreu um erro. Tente novamente.', 'error');
  }
}
