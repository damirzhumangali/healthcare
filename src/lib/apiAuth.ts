export { API_URL } from "./apiBase";
import { API_URL } from "./apiBase";

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/google/url`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Не удалось получить ссылку Google OAuth");
  }
  const data = await res.json();
  return data.url;
}

export async function exchangeGoogleCode(code: string): Promise<{ token?: string | null; user: any }> {
  const res = await fetch(`${API_URL}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  if (!res.ok) throw new Error("Google auth failed");
  return res.json();
}
