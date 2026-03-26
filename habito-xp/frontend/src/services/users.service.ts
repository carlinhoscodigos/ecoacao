import { request } from './http';

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
};

export function listUsers() {
  return request<{ users: ManagedUser[] }>('/users');
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  plan?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}) {
  return request<{ user: ManagedUser }>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

