import { API_URL } from "./apiBase";
import { getToken } from "./auth";

export async function createMeasurement(deviceId: string) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/measurements`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error("create measurement failed");
  return res.json();
}

export async function fetchMyMeasurements() {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/measurements/my`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error("fetch measurements failed");
  return res.json();
}
