import { useEffect, useMemo, useRef } from "react";

const SOUND_URL = "/sounds/ring.mp3";
const SOUND_ENABLED_KEY = "healthassist_sound_enabled";
const SOUND_RATE_LIMIT_MS = 2000;

let sharedAudio: HTMLAudioElement | null = null;
let lastPlayAt = 0;
let audioUnlocked = false;
let unlockListening = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function ensureAudio() {
  if (!isBrowser()) return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(SOUND_URL);
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function unlockAudio() {
  audioUnlocked = true;
  if (!isBrowser() || !unlockListening) return;
  unlockListening = false;
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
  window.removeEventListener("touchstart", unlockAudio);
}

function ensureUnlockListener() {
  if (!isBrowser() || unlockListening || audioUnlocked) return;
  unlockListening = true;
  window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
}

export function isSoundEnabled() {
  if (!isBrowser()) return true;
  const raw = window.localStorage.getItem(SOUND_ENABLED_KEY);
  return raw == null ? true : raw !== "0";
}

export function setSoundEnabled(next: boolean) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SOUND_ENABLED_KEY, next ? "1" : "0");
}

export function useSoundActivation() {
  useEffect(() => {
    ensureUnlockListener();
  }, []);
}

export function playNotificationSound() {
  if (!isBrowser()) return;
  ensureUnlockListener();
  if (!isSoundEnabled() || !audioUnlocked) return;

  const now = Date.now();
  if (now - lastPlayAt < SOUND_RATE_LIMIT_MS) return;
  lastPlayAt = now;

  const audio = ensureAudio();
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

function readSeenIds(storageKey: string) {
  if (!isBrowser()) return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed.filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function writeSeenIds(storageKey: string, ids: Set<string>) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(ids).slice(-400)));
  } catch {
    // Ignore quota / storage errors silently.
  }
}

export function useSoundOnNewIds(ids: Array<string | null | undefined>, storageScope: string) {
  useSoundActivation();

  const normalizedIds = useMemo(
    () => ids.map((value) => String(value || "").trim()).filter(Boolean),
    [ids],
  );
  const signature = useMemo(() => normalizedIds.join("|"), [normalizedIds]);
  const initializedRef = useRef(false);

  useEffect(() => {
    const storageKey = `ha_sound_seen_${storageScope}`;
    const seen = readSeenIds(storageKey);

    if (!initializedRef.current) {
      normalizedIds.forEach((id) => seen.add(id));
      writeSeenIds(storageKey, seen);
      initializedRef.current = true;
      return;
    }

    const nextIds = normalizedIds.filter((id) => !seen.has(id));
    if (nextIds.length > 0) {
      nextIds.forEach((id) => seen.add(id));
      writeSeenIds(storageKey, seen);
      playNotificationSound();
      return;
    }

    writeSeenIds(storageKey, seen);
  }, [normalizedIds, signature, storageScope]);
}
