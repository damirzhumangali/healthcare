type TicketStatus = "waiting" | "invited" | "passed";

type QueueState = {
  lastTicketNumber: number;
  nowServingNumber: number;
  lastAdvancedAt: string;
};

type TicketRecord = {
  id: string;
  userId: string;
  ticketNumber: number;
  createdAt: string;
};

export type OnlineTicketView = {
  ticketNumber: number;
  createdAt: string;
  status: TicketStatus;
  peopleAhead: number;
  etaMinutes: number;
  servingNow: number;
};

const QUEUE_KEY = "healthassist_queue_state_v1";
const TICKETS_KEY = "healthassist_tickets_v1";
const ADVANCE_EVERY_MS = 90_000;
const MINUTES_PER_PATIENT = 3;

function readQueueState(): QueueState {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return {
        lastTicketNumber: 120,
        nowServingNumber: 118,
        lastAdvancedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(raw) as QueueState;
  } catch {
    return {
      lastTicketNumber: 120,
      nowServingNumber: 118,
      lastAdvancedAt: new Date().toISOString(),
    };
  }
}

function writeQueueState(state: QueueState) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(state));
}

function readTickets(): TicketRecord[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    return raw ? (JSON.parse(raw) as TicketRecord[]) : [];
  } catch {
    return [];
  }
}

function writeTickets(items: TicketRecord[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(items));
}

function advanceQueueIfNeeded() {
  const state = readQueueState();
  const now = Date.now();
  const last = Date.parse(state.lastAdvancedAt);
  if (Number.isNaN(last)) {
    writeQueueState({ ...state, lastAdvancedAt: new Date(now).toISOString() });
    return;
  }

  const steps = Math.floor((now - last) / ADVANCE_EVERY_MS);
  if (steps <= 0) return;

  const nextServing = Math.min(state.lastTicketNumber, state.nowServingNumber + steps);
  const nextLastAdvancedAt = new Date(last + steps * ADVANCE_EVERY_MS).toISOString();

  writeQueueState({
    ...state,
    nowServingNumber: nextServing,
    lastAdvancedAt: nextLastAdvancedAt,
  });
}

function resolveUserId(): string | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string; email?: string; name?: string };
    return user.id || user.email || user.name || null;
  } catch {
    return null;
  }
}

export function getOrCreateMyTicket(): OnlineTicketView | null {
  advanceQueueIfNeeded();
  const userId = resolveUserId();
  if (!userId) return null;

  const tickets = readTickets();
  let mine = tickets
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.ticketNumber - a.ticketNumber)[0];

  if (!mine) {
    const queue = readQueueState();
    const ticketNumber = queue.lastTicketNumber + 1;
    mine = {
      id: crypto.randomUUID(),
      userId,
      ticketNumber,
      createdAt: new Date().toISOString(),
    };
    tickets.push(mine);
    writeTickets(tickets);
    writeQueueState({
      ...queue,
      lastTicketNumber: ticketNumber,
    });
  }

  return getMyTicket();
}

export function createNewMyTicket(): OnlineTicketView | null {
  advanceQueueIfNeeded();
  const userId = resolveUserId();
  if (!userId) return null;

  const queue = readQueueState();
  const ticketNumber = queue.lastTicketNumber + 1;
  const tickets = readTickets();

  tickets.push({
    id: crypto.randomUUID(),
    userId,
    ticketNumber,
    createdAt: new Date().toISOString(),
  });
  writeTickets(tickets);
  writeQueueState({
    ...queue,
    lastTicketNumber: ticketNumber,
  });

  return getMyTicket();
}

export function getMyTicket(): OnlineTicketView | null {
  advanceQueueIfNeeded();
  const userId = resolveUserId();
  if (!userId) return null;

  const tickets = readTickets();
  const mine = tickets
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.ticketNumber - a.ticketNumber)[0];
  if (!mine) return null;

  const queue = readQueueState();
  const peopleAhead = Math.max(0, mine.ticketNumber - queue.nowServingNumber - 1);
  const etaMinutes = peopleAhead * MINUTES_PER_PATIENT;

  let status: TicketStatus = "waiting";
  if (mine.ticketNumber === queue.nowServingNumber) {
    status = "invited";
  } else if (mine.ticketNumber < queue.nowServingNumber) {
    status = "passed";
  }

  return {
    ticketNumber: mine.ticketNumber,
    createdAt: mine.createdAt,
    status,
    peopleAhead,
    etaMinutes,
    servingNow: queue.nowServingNumber,
  };
}
