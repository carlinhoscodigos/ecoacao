import { findUserByEmail } from '../services/storage';
import { apiFetch, readJsonOrEmpty, hasApiConfigured } from '../services/apiClient.js';

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

export async function checkEmailAvailable(email) {
  if (!hasApiConfigured()) {
    return !findUserByEmail(email);
  }
  const res = await apiFetch(
    `/api/auth/check-email?email=${encodeURIComponent(email.trim())}`
  );
  const data = await readJsonOrEmpty(res);
  if (!res.ok) return false;
  return data.available === true;
}
