/**
 * tasks.js
 * Fonte única de verdade dos dados de tarefas.
 * - Mantém um "store" em memória (array `state.tasks`) sincronizado em tempo real com o Firestore.
 * - Expõe CRUD completo + registro automático de histórico.
 * - Outros módulos (kanban, dashboard, filters) APENAS leem `getTasks()` e reagem a `onTasksChange`.
 *   Isso evita que cada módulo tenha sua própria query/listener duplicado.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db, TASKS_COLLECTION } from './firebase.js';
import { uid } from './utils.js';

const state = {
  tasks: [],
  loaded: false,
};

const listeners = new Set();
let unsubscribeSnapshot = null;

/** Converte um doc do Firestore (com Timestamps) num objeto plano amigável ao JS. */
function normalizeTask(id, data) {
  const toIso = (v) => (v instanceof Timestamp ? v.toDate().toISOString() : v || null);
  return {
    id,
    title: data.title || '',
    description: data.description || '',
    category: data.category || 'Outro',
    priority: data.priority || 'media',
    assignee: data.assignee || '',
    dueDate: data.dueDate || null,
    status: data.status || 'solicitado',
    tags: Array.isArray(data.tags) ? data.tags : [],
    checklist: Array.isArray(data.checklist) ? data.checklist : [],
    notes: data.notes || '',
    fileLink: data.fileLink || '',
    history: Array.isArray(data.history) ? data.history : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

/** Inicia o listener em tempo real. Deve ser chamado uma única vez após login. */
export function startTaskslistener() {
  if (unsubscribeSnapshot) return; // já ativo
  const q = query(collection(db, TASKS_COLLECTION), orderBy('createdAt', 'desc'));
  unsubscribeSnapshot = onSnapshot(
    q,
    (snapshot) => {
      state.tasks = snapshot.docs.map((d) => normalizeTask(d.id, d.data()));
      state.loaded = true;
      listeners.forEach((cb) => cb(state.tasks));
    },
    (error) => {
      console.error('[tasks] erro no listener:', error);
    }
  );
}

export function stopTasksListener() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  state.tasks = [];
  state.loaded = false;
}

/** Inscreve um callback para receber a lista de tarefas sempre que ela mudar. */
export function onTasksChange(callback) {
  listeners.add(callback);
  if (state.loaded) callback(state.tasks);
  return () => listeners.delete(callback);
}

export function getTasks() {
  return state.tasks;
}

export function getTaskById(id) {
  return state.tasks.find((t) => t.id === id) || null;
}

/** Monta uma entrada de histórico padronizada. */
function historyEntry(action, detail, authorEmail) {
  return {
    id: uid('hist'),
    action, // 'created' | 'updated' | 'moved' | 'checklist' | 'deleted'
    detail,
    author: authorEmail || 'sistema',
    at: new Date().toISOString(),
  };
}

/**
 * Cria uma nova tarefa.
 * @param {object} payload campos da tarefa (ver utils COLUMNS/PRIORITIES/CATEGORIES)
 * @param {string} authorEmail email do usuário autenticado (para histórico)
 */
export async function createTask(payload, authorEmail) {
  const now = serverTimestamp();
  const data = {
    title: payload.title?.trim() || 'Sem título',
    description: payload.description || '',
    category: payload.category || 'Outro',
    priority: payload.priority || 'media',
    assignee: payload.assignee || '',
    dueDate: payload.dueDate || null,
    status: payload.status || 'solicitado',
    tags: payload.tags || [],
    checklist: payload.checklist || [],
    notes: payload.notes || '',
    fileLink: payload.fileLink || '',
    history: [historyEntry('created', 'Tarefa criada', authorEmail)],
    createdAt: now,
    updatedAt: now,
  };
  return addDoc(collection(db, TASKS_COLLECTION), data);
}

/**
 * Atualiza campos de uma tarefa e registra histórico com um resumo do que mudou.
 * @param {string} id
 * @param {object} changes campos alterados (parcial)
 * @param {string} authorEmail
 * @param {string} [summary] descrição customizada para o histórico
 */
export async function updateTask(id, changes, authorEmail, summary) {
  const current = getTaskById(id);
  const ref = doc(db, TASKS_COLLECTION, id);
  const entry = historyEntry('updated', summary || describeChanges(current, changes), authorEmail);
  const newHistory = current ? [...current.history, entry] : [entry];

  return updateDoc(ref, {
    ...changes,
    history: newHistory,
    updatedAt: serverTimestamp(),
  });
}

/** Move uma tarefa entre colunas (status) — usado pelo drag & drop. */
export async function moveTask(id, newStatus, authorEmail) {
  const current = getTaskById(id);
  if (!current || current.status === newStatus) return;
  const ref = doc(db, TASKS_COLLECTION, id);
  const fromLabel = current.status;
  const entry = historyEntry('moved', `Movida de "${fromLabel}" para "${newStatus}"`, authorEmail);
  return updateDoc(ref, {
    status: newStatus,
    history: [...current.history, entry],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id) {
  return deleteDoc(doc(db, TASKS_COLLECTION, id));
}

/** Alterna um item do checklist e registra histórico. */
export async function toggleChecklistItem(taskId, itemId, authorEmail) {
  const task = getTaskById(taskId);
  if (!task) return;
  const checklist = task.checklist.map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item
  );
  const toggled = checklist.find((i) => i.id === itemId);
  const entry = historyEntry(
    'checklist',
    `${toggled.done ? 'Concluiu' : 'Reabriu'} o item "${toggled.label}"`,
    authorEmail
  );
  const ref = doc(db, TASKS_COLLECTION, taskId);
  return updateDoc(ref, {
    checklist,
    history: [...task.history, entry],
    updatedAt: serverTimestamp(),
  });
}

export async function addChecklistItem(taskId, label, authorEmail) {
  const task = getTaskById(taskId);
  if (!task) return;
  const item = { id: uid('chk'), label: label.trim(), done: false };
  const entry = historyEntry('checklist', `Adicionou item "${item.label}" ao checklist`, authorEmail);
  const ref = doc(db, TASKS_COLLECTION, taskId);
  return updateDoc(ref, {
    checklist: [...task.checklist, item],
    history: [...task.history, entry],
    updatedAt: serverTimestamp(),
  });
}

export async function removeChecklistItem(taskId, itemId, authorEmail) {
  const task = getTaskById(taskId);
  if (!task) return;
  const removed = task.checklist.find((i) => i.id === itemId);
  const checklist = task.checklist.filter((i) => i.id !== itemId);
  const entry = historyEntry('checklist', `Removeu item "${removed?.label}" do checklist`, authorEmail);
  const ref = doc(db, TASKS_COLLECTION, taskId);
  return updateDoc(ref, {
    checklist,
    history: [...task.history, entry],
    updatedAt: serverTimestamp(),
  });
}

/** Gera um resumo legível das mudanças para o histórico automático. */
function describeChanges(current, changes) {
  if (!current) return 'Tarefa atualizada';
  const labels = {
    title: 'título', description: 'descrição', category: 'categoria',
    priority: 'prioridade', assignee: 'responsável', dueDate: 'prazo',
    tags: 'tags', notes: 'observações', fileLink: 'link do arquivo',
  };
  const changed = Object.keys(changes).filter((k) => labels[k]);
  if (!changed.length) return 'Tarefa atualizada';
  return `Atualizou ${changed.map((k) => labels[k]).join(', ')}`;
}
