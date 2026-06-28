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
  apiKey: "AIzaSyBXccg-DRzWAv3UURp4ZCfb7r6T9Gc6yZc",
  authDomain: "flowdesk-2ea8c.firebaseapp.com",
  projectId: "flowdesk-2ea8c",
  storageBucket: "flowdesk-2ea8c.firebasestorage.app",
  messagingSenderId: "723085701908",
  appId: "1:723085701908:web:a95afdfa7092ef0656c801",
  measurementId: "G-0RFK2YRFPM"
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
