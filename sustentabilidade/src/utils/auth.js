import { findUserByEmail } from '../services/storage';

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function checkLogin(email, password) {
  if (!email || !password) return { ok: false, error: 'Preencha todos os campos.' };
  const user = findUserByEmail(email);
  if (!user) return { ok: false, error: 'E-mail não encontrado.' };
  if (user.password !== password) return { ok: false, error: 'Senha incorreta.' };
  return { ok: true, user };
}

export function checkEmailAvailable(email) {
  return !findUserByEmail(email);
}
