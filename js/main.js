<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Organização de Tarefas - Estratégia Corretora</title>

  <meta
    name="description"
    content="Sistema de organização e gestão de demandas da equipe de Estratégia da Unicoob Corretora."
  />

  <!-- Fontes -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin
  />

  <link
    href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..800;1,14..32,400..700&family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,500&n.css"
  />

  <!-- Estilos da aplicação -->
  <link rels.css
</head>

<body>

  <!-- Área de notificações -->
  <div
    id="toast-root"
    class="toast-root"
    aria-live="polite"
    aria-atomic="true"
  ></div>

  <!-- ======================================================
       TELA DE LOGIN
  ======================================================= -->

  <section
    id="login-screen"
    class="screen login-screen is-visible"
    aria-label="Acesso ao sistema"
  >
    <div class="login-screen__art" aria-hidden="true">
      <svg
        class="login-blob"
        viewBox="0 0 600 600"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="blobGrad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stop-color="#ff7a59" />
            <stop offset="100%" stop-color="#ffb454" />
          </linearGradient>
        </defs>

        <path
          fill="url(#blobGrad)"
          d="M421,67Q481,134,468,217Q455,300,432,372Q409,444,335,470Q261,496,189,463Q117,430,79,358Q41,286,64,206Q87,126,156,79Q225,32,303,30Q381,28,421,67Z"
        />
      </svg>

      <div class="login-screen__brandmark">
        <i data-lucide="palette"></i>
      </div>
    </div>

    <div class="login-screen__panel">
      <div class="login-card">
        <div class="login-card__logo">
          <i data-lucide="layout-dashboard"></i>
          <span>Gestão de Demandas</span>
        </div>

        <p class="login-card__subtitle">
          Organização de tarefas da equipe de Estratégia
        </p>

        <form id="login-form" class="login-form" novalidate>
          <label class="field">
            <span>E-mail</span>

            <input
              type="email"
              name="email"
              required
              autocomplete="username"
              placeholder="voce@unicoob.com.br"
            />
          </label>

          <label class="field">
            <span>Senha</span>

            <input
              type="password"
              name="password"
              required
              autocomplete="current-password"
              placeholder="••••••••"
            />
          </label>

          <p
            id="login-error"
            class="login-error"
            role="alert"
          ></p>

          <button
            type="submit"
            id="login-submit"
            class="btn btn--primary btn--block"
          >
            <span class="btn__label">Entrar</span>

            <i
              data-lucide="loader-2"
              class="btn__spinner"
            ></i>
          </button>
        </form>

        <p class="login-card__hint">
          Acesso restrito à equipe de Estratégia da Unicoob Corretora.
        </p>
      </div>
    </div>
  </section>

  <!-- ======================================================
       APLICAÇÃO PRINCIPAL
  ======================================================= -->

  <section
    id="app-screen"
    class="screen app-screen"
    aria-label="Gestão de demandas"
  >

    <!-- Barra superior -->
    <header class="topbar">
      <div class="topbar__brand">
        <i data-lucide="layout-dashboard"></i>
        <span>Organização de Tarefas - Estratégia</span>
      </div>

      <!-- Alternância entre Kanban e calendário -->
      <nav
        class="view-switchers"
        aria-label="Alternar visualização"
      >
        <button
          type="button"
          id="btn-kanban-view"
          class="btn active"
          aria-pressed="true"
          aria-controls="kanban-section"
        >
          <i data-lucide="columns-3"></i>
          <span>Quadro Kanban</span>
        </button>

        <button
          type="button"
          id="btn-calendar-view"
          class="btn"
          aria-pressed="false"
          aria-controls="calendar-section"
        >
          <i data-lucide="calendar-days"></i>
          <span>Agenda / Calendário</span>
        </button>
      </nav>

      <div class="topbar__actions">
        <button
          type="button"
          id="theme-toggle"
          class="icon-btn"
          aria-label="Alternar tema"
          title="Alternar tema"
        >
          <i data-lucide="sun-moon"></i>
        </button>

        <div class="topbar__user">
          <span
            class="avatar avatar--user"
            id="user-avatar"
            aria-hidden="true"
          >
            --
          </span>

          <span
            id="user-email"
            class="topbar__email"
          ></span>
        </div>

        <button
          type="button"
          id="logout-btn"
          class="icon-btn"
          aria-label="Sair"
          title="Sair"
        >
          <i data-lucide="log-out"></i>
        </button>
      </div>
    </header>

    <!-- Conteúdo principal -->
    <main class="app-main">

      <!-- ==================================================
           VISUALIZAÇÃO KANBAN
      =================================================== -->

      <section
        id="kanban-section"
        class="view-section"
        aria-label="Visualização do quadro Kanban"
      >

        <!-- Indicadores -->
        <section
          class="dashboard"
          id="dashboard"
          aria-label="Indicadores das tarefas"
        ></section>

        <!-- Barra de ferramentas -->
        <section
          class="toolbar"
          aria-label="Ferramentas e filtros"
        >
          <div class="toolbar__search">
            <i data-lucide="search" aria-hidden="true"></i>

            <input
              type="search"
              id="search-input"
              aria-label="Buscar tarefas"
              placeholder="Buscar por título, tag ou responsável..."
            />
          </div>

          <div class="toolbar__filters">
            <label class="sr-only" for="filter-category">
              Filtrar por categoria
            </label>

            <select
              id="filter-category"
              class="select-control"
              aria-label="Filtrar por categoria"
            >
              <option value="all">Todas categorias</option>
            </select>

            <label class="sr-only" for="filter-priority">
              Filtrar por prioridade
            </label>

            <select
              id="filter-priority"
              class="select-control"
              aria-label="Filtrar por prioridade"
            >
              <option value="all">Todas prioridades</option>
            </select>

            <label class="sr-only" for="filter-assignee">
              Filtrar por responsável
            </label>

            <select
              id="filter-assignee"
              class="select-control"
              aria-label="Filtrar por responsável"
            >
              <option value="all">Todos responsáveis</option>
            </select>

            <label class="sr-only" for="filter-deadline">
              Filtrar por prazo
            </label>

            <select
              id="filter-deadline"
              class="select-control"
              aria-label="Filtrar por prazo"
            >
              <option value="all">Qualquer prazo</option>
              <option value="overdue">Atrasadas</option>
              <option value="due-3">Vencendo em 3 dias</option>
              <option value="due-7">Vencendo em 7 dias</option>
            </select>

            <label class="sr-only" for="sort-select">
              Ordenar tarefas
            </label>

            <select
              id="sort-select"
              class="select-control"
              aria-label="Ordenar tarefas"
            >
              <option value="createdAt-desc">Mais recentes</option>
              <option value="createdAt-asc">Mais antigas</option>
              <option value="dueDate-asc">Prazo mais próximo</option>
              <option value="priority-desc">Prioridade</option>
              <option value="title-asc">Título A–Z</option>
            </select>

            <button
              type="button"
              id="reset-filters-btn"
              class="icon-btn"
              aria-label="Limpar filtros"
              title="Limpar filtros"
            >
              <i data-lucide="filter-x"></i>
            </button>
          </div>

          <button
            type="button"
            id="new-task-btn"
            class="btn btn--primary"
          >
            <i data-lucide="plus"></i>
            <span>Nova tarefa</span>
          </button>
        </section>

        <!-- Quadro Kanban -->
        <section
          class="kanban-board"
          id="kanban-board"
          aria-label="Quadro Kanban"
        ></section>
      </section>

      <!-- ==================================================
           VISUALIZAÇÃO DO CALENDÁRIO
      =================================================== -->

      <section
        id="calendar-section"
        class="view-section calendar-section"
        aria-label="Agenda e calendário de tarefas"
        hidden
      >
        <div class="calendar-section__header">
          <div>
            <span class="calendar-section__eyebrow">
              Planejamento
            </span>

            <h1 class="calendar-section__title">
              Agenda de tarefas
            </h1>

            <p class="calendar-section__description">
              Consulte os prazos e compromissos da equipe no calendário.
            </p>
          </div>

          <button
            type="button"
            id="calendar-new-task-btn"
            class="btn btn--primary"
          >
            <i data-lucide="plus"></i>
            <span>Nova tarefa</span>
          </button>
        </div>

        <div class="calendar-wrapper">
          <div
            id="calendar"
            aria-label="Calendário de tarefas"
          ></div>
        </div>
      </section>

    </main>
  </section>

  <!-- ======================================================
       MODAL DE TAREFA
  ======================================================= -->

  <div
    id="modal-overlay"
    class="modal-overlay"
    aria-hidden="true"
  >
    <div
      id="modal-panel"
      class="modal-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Dados da tarefa"
      tabindex="-1"
    ></div>
  </div>

  <!-- ======================================================
       SCRIPTS
  ======================================================= -->

  <!-- FullCalendar -->
  <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>

  <!-- Ícones Lucide -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

  <script>
    window.addEventListener('DOMContentLoaded', function () {
      window.lucide?.createIcons();
    });
  </script>

  <!-- JavaScript principal -->
  js/main.jsscript>
</body>
</html>
