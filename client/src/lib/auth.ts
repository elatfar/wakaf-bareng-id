import type { Pengguna } from "shared";

const TOKEN_KEY = "token";
const USER_KEY = "pengguna";

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function setUser(pengguna: Pengguna): void {
  localStorage.setItem(USER_KEY, JSON.stringify(pengguna));
}

export function getUser(): Pengguna | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Pengguna;
  } catch {
    return null;
  }
}
