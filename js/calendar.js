/**
 * js/calendar.js
 * Módulo de visualização em formato de Agenda/Calendário usando FullCalendar.
 * Consome os dados reativos compartilhados pelo orquestrador central.
 */
import { openEditModal } from './modal.js';

let calendar = null;

/**
 * Inicializa ou atualiza os eventos do calendário com base na lista de tarefas atual do sistema.
 * @param {Array} tasks - Lista de tarefas vinda do listener reativo do main.js
 */
export function initCalendar(tasks = []) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  // Se o calendário ainda não existe, cria a instância inicial
  if (!calendar) {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Hoje',
        month: 'Mês',
        week: 'Semana',
        day: 'Dia'
      },
      // Abre o modal nativo de edição ao clicar no card da agenda
      eventClick: function(info) {
        if (typeof openEditModal === 'function') {
          openEditModal(info.event.id);
        } else {
          alert('Tarefa: ' + info.event.title);
        }
      }
    });
    calendar.render();
  }

  // Mapeia o array de tarefas recebido para o formato aceito pelo FullCalendar
  const events = tasks
    .filter(task => task.deadline || task.dueDate || task.prazo) // Garante que possui data limite
    .map(task => {
      const dateStr = task.deadline || task.dueDate || task.prazo;
      // Extrai apenas a porção YYYY-MM-DD caso venha um formato ISO completo
      const startTarget = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

      return {
        id: task.id,
        title: task.title || 'Sem título',
        start: startTarget,
        backgroundColor: getEventColorByStatus(task.status),
        borderColor: getEventColorByStatus(task.status),
        extendedProps: {
          description: task.description || '',
          category: task.category || '',
          priority: task.priority || ''
        }
      };
    });

  // Atualiza a fonte de eventos de maneira limpa na tela
  calendar.removeAllEvents();
  calendar.addEventSource(events);
}

/**
 * Força o redimensionamento do componente quando visibilidade do container mudar.
 */
export function refreshCalendarSize() {
  if (calendar) {
    calendar.updateSize();
  }
}

/**
 * Retorna o mapeamento de cores hexadecimais baseado nos status padrão do Kanban
 */
function getEventColorByStatus(status) {
  switch (status) {
    case 'todo': return '#3788d8';        // Azul
    case 'in-progress': return '#f39c12'; // Laranja
    case 'review': return '#9b59b6';      // Roxo
    case 'done': return '#2ecc71';        // Verde
    default: return '#7f8c8d';            // Cinza padrão
  }
}
