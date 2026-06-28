/**
 * dashboard.js
 * Calcula métricas agregadas a partir da lista de tarefas e renderiza os cards
 * de indicadores. Puramente derivado do estado de tasks.js — sem lógica própria de dados.
 */

import { deadlineStatus } from './utils.js';

let containerEl = null;

export function initDashboard(el) {
  containerEl = el;
  containerEl.innerHTML = cardsShell();
}

function cardsShell() {
  const cards = [
    { id: 'total', icon: 'layout-grid', label: 'Total de tarefas' },
    { id: 'producao', icon: 'pencil-ruler', label: 'Em produção' },
    { id: 'pendentes', icon: 'hourglass', label: 'Pendentes' },
    { id: 'finalizadas', icon: 'check-check', label: 'Finalizadas' },
    { id: 'atrasadas', icon: 'alarm-clock', label: 'Atrasadas', tone: 'danger' },
    { id: 'urgentes', icon: 'flame', label: 'Urgentes', tone: 'warning' },
  ];
  return cards
    .map(
      (c) => `
    <div class="metric-card ${c.tone ? `metric-card--${c.tone}` : ''}" id="metric-${c.id}">
      <div class="metric-card__icon"><i data-lucide="${c.icon}"></i></div>
      <div class="metric-card__body">
        <span class="metric-card__value">0</span>
        <span class="metric-card__label">${c.label}</span>
      </div>
    </div>`
    )
    .join('');
}

/** Recalcula e atualiza os números dos cards. Chamado sempre que as tarefas mudam. */
export function renderDashboard(tasks) {
  const metrics = computeMetrics(tasks);
  Object.entries(metrics).forEach(([key, value]) => {
    const el = containerEl.querySelector(`#metric-${key} .metric-card__value`);
    if (el) animateNumber(el, value);
  });
}

function computeMetrics(tasks) {
  const total = tasks.length;
  const producao = tasks.filter((t) => t.status === 'em_producao').length;
  const finalizadas = tasks.filter((t) => t.status === 'finalizado').length;
  const pendentes = tasks.filter((t) => t.status !== 'finalizado').length;
  const atrasadas = tasks.filter((t) => deadlineStatus(t) === 'overdue').length;
  const urgentes = tasks.filter((t) => t.priority === 'urgente' && t.status !== 'finalizado').length;

  return { total, producao, pendentes, finalizadas, atrasadas, urgentes };
}

/** Pequena animação de contagem para dar vida aos números (sem libs externas). */
function animateNumber(el, target) {
  const start = parseInt(el.textContent, 10) || 0;
  if (start === target) return;
  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.round(start + (target - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
