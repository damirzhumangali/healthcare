export const API_URL = "http://localhost:4000";

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/google/url`);
  const data = await res.json();
  return data.url;
}

export async function exchangeGoogleCode(code: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_URL}/auth/google/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) throw new Error("Google auth failed");
  return res.json();
}
