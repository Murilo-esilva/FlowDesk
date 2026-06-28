/**
 * utils.js
 * Funções puras e reutilizáveis. Nenhuma dependência de Firebase ou DOM global.
 * Mantém regras de negócio simples (datas, formatação) isoladas e testáveis.
 */

/* ---------- Datas / Prazos ---------- */

export const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Calcula quantos dias faltam até o prazo (negativo = atrasado).
 * @param {string|number|Date} deadline
 */
export function daysUntil(deadline) {
  if (!deadline) return null;
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(deadline));
  return Math.round((due - today) / MS_DAY);
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Classifica a urgência de prazo de uma tarefa (ignora tarefas finalizadas).
 * @returns {'overdue'|'due-3'|'due-7'|'ok'|'none'}
 */
export function deadlineStatus(task) {
  if (task.status === 'finalizado' || !task.dueDate) return 'none';
  const diff = daysUntil(task.dueDate);
  if (diff === null) return 'none';
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-3';
  if (diff <= 7) return 'due-7';
  return 'ok';
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(value) {
  if (!value) return '—';
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffSec = Math.round((now - then) / 1000);
  const ranges = [
    ['ano', 31536000], ['mês', 2592000], ['semana', 604800],
    ['dia', 86400], ['hora', 3600], ['min', 60],
  ];
  for (const [label, secs] of ranges) {
    const v = Math.floor(diffSec / secs);
    if (v >= 1) return `há ${v} ${label}${v > 1 && label !== 'min' && label !== 'mês' ? 's' : label === 'mês' && v > 1 ? 'es' : ''}`;
  }
  return 'agora';
}

/* ---------- IDs / Strings ---------- */

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function truncate(str = '', max = 90) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trimEnd() + '…';
}

/* ---------- Performance ---------- */

export function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Domínio: constantes compartilhadas ---------- */

export const COLUMNS = [
  { id: 'solicitado', label: 'Solicitado', icon: 'inbox' },
  { id: 'em_producao', label: 'Em produção', icon: 'pencil-ruler' },
  { id: 'aguardando_aprovacao', label: 'Aguardando aprovação', icon: 'eye' },
  { id: 'alteracoes', label: 'Alterações', icon: 'rotate-ccw' },
  { id: 'finalizado', label: 'Finalizado', icon: 'check-check' },
];

export const PRIORITIES = [
  { id: 'baixa', label: 'Baixa', order: 0 },
  { id: 'media', label: 'Média', order: 1 },
  { id: 'alta', label: 'Alta', order: 2 },
  { id: 'urgente', label: 'Urgente', order: 3 },
];

export const CATEGORIES = [
  'Post Redes Sociais', 'Banner', 'Folder', 'Cartaz', 'Certificado',
  'Convite', 'Apresentação', 'Material Impresso', 'Vídeo', 'Outro',
];

export function priorityOrder(id) {
  return PRIORITIES.find((p) => p.id === id)?.order ?? -1;
}

export function toast(message, type = 'info', duration = 3200) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  setTimeout(() => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 250);
  }, duration);
}
