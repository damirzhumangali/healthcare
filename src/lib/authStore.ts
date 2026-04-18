export type User = {
  id: string;
  email: string;
  password: string; // для MVP храним так (позже будет hash на сервере)
  createdAt: string;
};

const USERS_KEY = "healthassist_users";
const TOKEN_KEY = "healthassist_token";
const CURRENT_USER_KEY = "healthassist_current_user";

function readUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? (JSON.parse(raw) as User[]) : [];
}

function writeUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function uuid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): { id: string; email: string; name?: string; role?: string } | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function register(email: string, password: string) {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) throw new Error("Введите корректный email");
  if (password.length < 6) throw new Error("Пароль должен быть минимум 6 символов");

  const users = readUsers();
  if (users.some(u => u.email === e)) throw new Error("Этот email уже зарегистрирован");

  const user: User = { id: uuid(), email: e, password, createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);

  // авто-логин после регистрации
  const token = "token_" + user.id;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ id: user.id, email: user.email }));
  return { token, user: { id: user.id, email: user.email } };
}

export function login(email: string, password: string) {
  const e = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.email === e);
  if (!user) throw new Error("Пользователь не найден");
  if (user.password !== password) throw new Error("Неверный пароль");

  const token = "token_" + user.id;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ id: user.id, email: user.email }));
  return { token, user: { id: user.id, email: user.email } };
}
