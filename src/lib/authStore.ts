import {
  getCurrentUser,
  getToken,
  logout,
  setCurrentUser,
  setToken,
} from "./auth";

export type User = {
  id: string;
  email: string;
  password: string; // для MVP храним так (позже будет hash на сервере)
  createdAt: string;
};

const USERS_KEY = "healthassist_users";
const IS_PRODUCTION = import.meta.env.PROD;

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

export { getToken, getCurrentUser, logout };

export function register(email: string, password: string) {
  if (IS_PRODUCTION) {
    throw new Error("В продакшене регистрация по email и паролю отключена. Используйте вход через Google.");
  }

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
  setToken(token);
  setCurrentUser({ id: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email } };
}

export function login(email: string, password: string) {
  if (IS_PRODUCTION) {
    throw new Error("В продакшене вход по email и паролю отключен. Используйте вход через Google.");
  }

  const e = email.trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.email === e);
  if (!user) throw new Error("Пользователь не найден");
  if (user.password !== password) throw new Error("Неверный пароль");

  const token = "token_" + user.id;
  setToken(token);
  setCurrentUser({ id: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email } };
}
