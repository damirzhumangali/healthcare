export type ScheduleSelection = {
  requestId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  contextType?: "appointment" | "wardConsult";
};

export type ActiveScheduleTarget = {
  requestId: string;
  contextType: "appointment" | "wardConsult";
  date?: string;
};

const STORAGE_KEY = "healthassist_schedule_selection_v1";
const ACTIVE_TARGET_KEY = "healthassist_schedule_target_v1";

function readAllSelections(): Record<string, ScheduleSelection> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ScheduleSelection>) : {};
  } catch {
    return {};
  }
}

function writeAllSelections(data: Record<string, ScheduleSelection>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function writeActiveTarget(target: ActiveScheduleTarget | null) {
  if (!target) {
    sessionStorage.removeItem(ACTIVE_TARGET_KEY);
    return;
  }
  sessionStorage.setItem(ACTIVE_TARGET_KEY, JSON.stringify(target));
}

export function readScheduleSelection(requestId: string) {
  return readAllSelections()[requestId] ?? null;
}

export function readActiveScheduleTarget() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_TARGET_KEY);
    return raw ? (JSON.parse(raw) as ActiveScheduleTarget) : null;
  } catch {
    return null;
  }
}

export function saveActiveScheduleTarget(target: ActiveScheduleTarget) {
  writeActiveTarget(target);
}

export function saveScheduleSelection(selection: ScheduleSelection) {
  const current = readAllSelections();
  current[selection.requestId] = selection;
  writeAllSelections(current);
  writeActiveTarget({
    requestId: selection.requestId,
    contextType: selection.contextType ?? "appointment",
    date: selection.date,
  });
}

export function clearScheduleSelection(requestId: string) {
  const current = readAllSelections();
  delete current[requestId];
  writeAllSelections(current);
  const activeTarget = readActiveScheduleTarget();
  if (activeTarget?.requestId === requestId) {
    writeActiveTarget(null);
  }
}
