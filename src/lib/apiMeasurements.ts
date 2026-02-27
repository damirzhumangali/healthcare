import { API_URL } from "./apiAuth";
import { getToken } from "./auth";

export async function createMeasurement(deviceId: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/measurements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error("create measurement failed");
  return res.json();
}

export async function fetchMyMeasurements() {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/measurements/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("fetch measurements failed");
  return res.json();
}
