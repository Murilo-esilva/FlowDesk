/**
 * filters.js
 * Mantém o estado de busca/filtros/ordenação e aplica-os sobre a lista de tarefas.
 * Não toca no DOM diretamente — devolve um array filtrado para quem chamar (kanban.js).
 */

import { priorityOrder, daysUntil, deadlineStatus } from './utils.js';

const state = {
  search: '',
  category: 'all',
  priority: 'all',
  assignee: 'all',
  deadline: 'all', // all | overdue | due-3 | due-7
  sortBy: 'createdAt-desc', // createdAt-desc | createdAt-asc | dueDate-asc | priority-desc | title-asc
};

export function getFilterState() {
  return { ...state };
}

export function setFilter(key, value) {
  state[key] = value;
}

export function resetFilters() {
  state.search = '';
  state.category = 'all';
  state.priority = 'all';
  state.assignee = 'all';
  state.deadline = 'all';
  state.sortBy = 'createdAt-desc';
}

export function hasActiveFilters() {
  return (
    state.search.trim() !== '' ||
    state.category !== 'all' ||
    state.priority !== 'all' ||
    state.assignee !== 'all' ||
    state.deadline !== 'all'
  );
}

/** Lista única de responsáveis presentes nas tarefas, para popular o filtro. */
export function uniqueAssignees(tasks) {
  return [...new Set(tasks.map((t) => t.assignee).filter(Boolean))].sort();
}

/** Aplica busca + filtros + ordenação sobre a lista de tarefas. */
export function applyFilters(tasks) {
  let result = tasks;

  const term = state.search.trim().toLowerCase();
  if (term) {
    result = result.filter((t) => {
      const haystack = [t.title, t.description, t.assignee, ...(t.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  if (state.category !== 'all') {
    result = result.filter((t) => t.category === state.category);
  }
  if (state.priority !== 'all') {
    result = result.filter((t) => t.priority === state.priority);
  }
  if (state.assignee !== 'all') {
    result = result.filter((t) => t.assignee === state.assignee);
  }
  if (state.deadline !== 'all') {
    result = result.filter((t) => deadlineStatus(t) === state.deadline);
  }

  result = [...result].sort((a, b) => sortComparator(a, b, state.sortBy));
  return result;
}

function sortComparator(a, b, sortBy) {
  switch (sortBy) {
    case 'createdAt-asc':
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    case 'createdAt-desc':
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    case 'dueDate-asc': {
      const da = a.dueDate ? daysUntil(a.dueDate) : Infinity;
      const db = b.dueDate ? daysUntil(b.dueDate) : Infinity;
      return da - db;
    }
    case 'priority-desc':
      return priorityOrder(b.priority) - priorityOrder(a.priority);
    case 'title-asc':
      return a.title.localeCompare(b.title, 'pt-BR');
    default:
      return 0;
  }
}
