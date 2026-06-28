// js/calendar.js
import { db } from './firebase.js';
import { collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js'; // Ajuste a versão do SDK conforme o seu firebase.js

let calendar = null;

export function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    if (!calendarEl) return;

    // Inicializa o FullCalendar com configurações em português
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
        eventClick: function(info) {
            // Ação ao clicar numa tarefa no calendário (ex: abrir o seu modal de detalhes existente)
            alert('Tarefa: ' + info.event.title + '\nDescrição: ' + info.event.extendedProps.description);
            // Aqui você pode chamar a função do seu modal: openTaskModal(info.event.id);
        }
    });

    calendar.render();

    // Escuta em tempo real as tarefas do Firestore para atualizar a agenda
    listenToTasksForCalendar();
}

function listenToTasksForCalendar() {
    const tasksCollection = collection(db, 'tasks'); // Ajuste o nome da coleção se for diferente

    onSnapshot(tasksCollection, (snapshot) => {
        const events = [];

        snapshot.forEach((doc) => {
            const task = doc.data();
            
            // Certifique-se de que a tarefa tem um prazo/data limite para exibir no calendário
            if (task.dueDate || task.prazo) { 
                events.push({
                    id: doc.id,
                    title: task.title || task.titulo || 'Sem título',
                    start: task.dueDate || task.prazo, // Formato ideal: YYYY-MM-DD
                    description: task.description || task.descricao || '',
                    backgroundColor: getEventColorByStatus(task.status),
                    borderColor: getEventColorByStatus(task.status)
                });
            }
        });

        // Remove os eventos antigos e adiciona os atualizados
        calendar.removeAllEvents();
        calendar.addEventSource(events);
    });
}

// Define cores para os blocos do calendário baseadas no status da coluna Kanban
function getEventColorByStatus(status) {
    switch (status) {
        case 'todo': return '#3788d8';     // Azul
        case 'in-progress': return '#f39c12'; // Laranja
        case 'review': return '#9b59b6';      // Roxo
        case 'done': return '#2ecc71';        // Verde
        default: return '#7f8c8d';
    }
}

// Força a renderização correta se o calendário foi inicializado enquanto oculto
export function refreshCalendarSize() {
    if (calendar) {
        calendar.updateSize();
    }
}
