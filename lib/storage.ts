// 進度儲存：localStorage 為本機鏡像（同步讀寫），登入後再同步到 Firestore。
"use client";

import type { CardProgress, QuizRecord } from "./types";

const CARDS_KEY = "toeic.cards";
const QUIZ_KEY = "toeic.quizHistory";

export interface ProgressSnapshot {
  cards: Record<string, CardProgress>;
  quizHistory: QuizRecord[];
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- 遠端同步掛鉤（由 SyncProvider 在登入時設定）----
let remoteWriter: ((snap: ProgressSnapshot) => void) | null = null;

export function setRemoteWriter(fn: ((snap: ProgressSnapshot) => void) | null) {
  remoteWriter = fn;
}

function pushRemote() {
  remoteWriter?.({ cards: loadCards(), quizHistory: loadQuizHistory() });
}

// ---- 單字卡進度 ----
export function loadCards(): Record<string, CardProgress> {
  return read<Record<string, CardProgress>>(CARDS_KEY, {});
}

export function saveCards(cards: Record<string, CardProgress>) {
  write(CARDS_KEY, cards);
  pushRemote();
}

// ---- 測驗紀錄 ----
export function loadQuizHistory(): QuizRecord[] {
  return read<QuizRecord[]>(QUIZ_KEY, []);
}

export function addQuizRecord(record: QuizRecord) {
  const history = loadQuizHistory();
  history.unshift(record);
  write(QUIZ_KEY, history.slice(0, 100));
  pushRemote();
}

// ---- 套用雲端快照到本機（同步時用）----
export function applySnapshot(snap: ProgressSnapshot) {
  write(CARDS_KEY, snap.cards ?? {});
  write(QUIZ_KEY, snap.quizHistory ?? []);
  // 通知頁面重新讀取
  if (typeof window !== "undefined") window.dispatchEvent(new Event("toeic-sync"));
}

// ---- 合併本機與雲端（首次登入時避免覆蓋）----
export function mergeSnapshots(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot {
  // 卡片：同字取最近複習的版本
  const cards: Record<string, CardProgress> = { ...a.cards };
  for (const [word, c] of Object.entries(b.cards ?? {})) {
    const cur = cards[word];
    if (!cur || (c.lastReviewed ?? 0) >= (cur.lastReviewed ?? 0)) cards[word] = c;
  }
  // 測驗紀錄：依時間去重後合併
  const seen = new Set<number>();
  const quizHistory = [...(a.quizHistory ?? []), ...(b.quizHistory ?? [])]
    .filter((r) => (seen.has(r.date) ? false : (seen.add(r.date), true)))
    .sort((x, y) => y.date - x.date)
    .slice(0, 100);
  return { cards, quizHistory };
}
