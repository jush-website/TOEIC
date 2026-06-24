// 間隔重複演算法（SM-2 簡化版）
import type { CardProgress } from "./types";

const DAY = 24 * 60 * 60 * 1000;

// 各熟練度等級對應的複習間隔（天）
const INTERVALS = [0, 1, 2, 4, 8, 16];

export function newCard(word: string): CardProgress {
  return { word, level: 0, due: Date.now(), streak: 0, lastReviewed: 0 };
}

/**
 * 複習一張卡。
 * @param known true=記得（升級），false=忘記（降回等級 1）
 */
export function review(card: CardProgress, known: boolean): CardProgress {
  const now = Date.now();
  let level: number;
  let streak: number;
  if (known) {
    level = Math.min(card.level + 1, INTERVALS.length - 1);
    streak = card.streak + 1;
  } else {
    level = 1;
    streak = 0;
  }
  return {
    ...card,
    level,
    streak,
    lastReviewed: now,
    due: now + INTERVALS[level] * DAY,
  };
}

/** 是否到期該複習 */
export function isDue(card: CardProgress): boolean {
  return card.due <= Date.now();
}

/** 是否已精熟（達最高等級） */
export function isMastered(card: CardProgress): boolean {
  return card.level >= INTERVALS.length - 1;
}
