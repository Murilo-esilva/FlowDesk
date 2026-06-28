/**
 * firebase.js
 * Ponto único de inicialização do Firebase. Usa o SDK modular (v10) via CDN/ESM,
 * sem necessidade de bundler — compatível com GitHub Pages.
 *
 * IMPORTANTE: substitua firebaseConfig pelos dados do seu projeto
 * (Firebase Console > Configurações do projeto > Seus apps > SDK setup).
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  enableIndexedDbPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// ⚠️ Substitua pelos dados reais do seu projeto Firebase.
const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'seu-projeto.firebaseapp.com',
  projectId: 'seu-projeto',
  storageBucket: 'seu-projeto.appspot.com',
  messagingSenderId: 'SEU_SENDER_ID',
  appId: 'SEU_APP_ID',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Mantém a sessão do usuário entre reloads/abas.
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.warn('[firebase] Não foi possível definir persistência de auth:', err)
);

// Permite uso offline básico do Firestore (cache local).
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('[firebase] Persistência offline desativada: múltiplas abas abertas.');
  } else if (err.code === 'unimplemented') {
    console.warn('[firebase] Persistência offline não suportada neste navegador.');
  }
});

/** Nome da collection raiz de tarefas no Firestore. */
export const TASKS_COLLECTION = 'tasks';
