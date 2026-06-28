# Creative Task Board

Kanban para gestão de demandas de design gráfico da Universidade Aberta à Terceira Idade — do recebimento da solicitação até a entrega final.

**Stack:** HTML5 · CSS3 · JavaScript ES6+ (sem frameworks) · Firebase Authentication · Cloud Firestore · Firebase Storage (estrutura preparada) · GitHub Pages.

---

## 1. Estrutura do projeto

```
creative-task-board/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── firebase.js     # inicialização do Firebase
    ├── auth.js         # login / logout
    ├── tasks.js         # CRUD + tempo real + histórico (Firestore)
    ├── kanban.js        # renderização do board + drag and drop
    ├── modal.js          # criação/edição de tarefa, checklist, histórico
    ├── dashboard.js      # indicadores
    ├── filters.js        # busca, filtros, ordenação
    ├── utils.js          # helpers puros
    └── main.js           # orquestrador
```

## 2. Configurar o Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → ative **E-mail/senha**. Crie manualmente os usuários da equipe (Authentication → Users → Add user).
3. **Firestore Database** → criar banco (modo produção).
4. **Storage** → ative (a estrutura já está pronta no `firebase.js`, mesmo sem uso imediato).
5. Em **Configurações do projeto → Seus apps → Web**, copie o objeto `firebaseConfig` e cole em `js/firebase.js`:

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
};
```

### Regras de segurança do Firestore (sugestão mínima)

Em **Firestore → Regras**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Isso restringe leitura/escrita apenas a usuários autenticados (qualquer membro da equipe logado). Ajuste depois para regras mais granulares se necessário (ex.: só quem criou pode excluir).

### Regras do Storage (preparação futura)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tasks/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Índice do Firestore

A consulta usa `orderBy('createdAt', 'desc')` sobre a collection `tasks` — é um índice simples, criado automaticamente pelo Firestore na primeira execução (ele indicará no console caso precise confirmar a criação).

## 3. Rodar localmente

Como o projeto usa ES Modules (`<script type="module">`), é preciso servir os arquivos via HTTP (não funciona abrindo o `index.html` direto com `file://`).

```bash
# qualquer servidor estático funciona, por exemplo:
npx serve .
# ou
python3 -m http.server 8080
```

Acesse `http://localhost:8080`.

## 4. Deploy no GitHub Pages

```bash
git add .
git commit -m "feat: creative task board inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/creative-task-board.git
git push -u origin main
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**. Após alguns minutos, o site estará disponível em:

```
https://SEU_USUARIO.github.io/creative-task-board/
```

> ⚠️ Em **Authentication → Settings → Authorized domains**, adicione o domínio `SEU_USUARIO.github.io` para que o login funcione em produção.

## 5. Estrutura de uma tarefa (Firestore)

```ts
{
  title: string,
  description: string,
  category: string,            // ver CATEGORIES em utils.js
  priority: 'baixa'|'media'|'alta'|'urgente',
  assignee: string,
  dueDate: string|null,        // 'YYYY-MM-DD'
  status: 'solicitado'|'em_producao'|'aguardando_aprovacao'|'alteracoes'|'finalizado',
  tags: string[],
  checklist: { id, label, done }[],
  notes: string,
  fileLink: string,            // Google Drive, Canva, Figma...
  history: { id, action, detail, author, at }[],
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

## 6. Funcionalidades incluídas

- Login/logout com Firebase Auth (persistência de sessão).
- Board Kanban com 5 colunas e drag and drop nativo (HTML5 DnD).
- CRUD completo de tarefas, com atualização em tempo real (`onSnapshot`).
- Checklist por tarefa (adicionar, concluir, remover).
- Histórico automático de alterações (criação, edição, movimentação, checklist).
- Dashboard com 6 indicadores (total, em produção, pendentes, finalizadas, atrasadas, urgentes).
- Destaque visual automático de tarefas atrasadas / vencendo em 3 ou 7 dias.
- Busca por título, descrição, tags e responsável.
- Filtros por categoria, prioridade, responsável e prazo.
- Ordenação por data de criação, prazo, prioridade ou título.
- Dark mode (padrão) com alternância para tema claro, persistida em `localStorage`.
- Layout responsivo (mobile, tablet, desktop).
- Ícones via Lucide, fonte Inter.

## 7. Próximos passos sugeridos (fora do escopo inicial)

- Upload de anexos no Firebase Storage (a estrutura em `firebase.js` já exporta `storage`).
- Perfis/roles (ex.: só "coordenador" pode excluir tarefas).
- Notificações por e-mail/Cloud Functions para prazos próximos.
- Exportação de relatórios (CSV/PDF).
