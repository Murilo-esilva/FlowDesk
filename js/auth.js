/**
 * auth.js
 * Camada de autenticação. Expõe funções simples (login, logout, observeAuth)
 * para que o restante da aplicação nunca importe diretamente o SDK do Firebase.
 */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

/**
 * Realiza login com email e senha.
 * @returns {Promise<import('firebase/auth').UserCredential>}
 */
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  return signOut(auth);
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

/**
 * Registra callback chamado sempre que o estado de autenticação muda.
 * @param {(user: import('firebase/auth').User|null) => void} callback
 * @returns {() => void} função para cancelar a inscrição
 */
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Traduz códigos de erro comuns do Firebase Auth para mensagens em PT-BR. */
export function translateAuthError(code) {
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
  };
  return map[code] || 'Não foi possível entrar. Tente novamente.';
}
