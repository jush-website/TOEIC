// 用戶端單字載入：Firestore 優先（讀一次後快取於本機），否則用本機 /api/vocab。
"use client";

import { doc, getDoc } from "firebase/firestore";
import { db, firebaseEnabled } from "./firebase";
import type { VocabWord } from "./types";

const CACHE_KEY = "toeic.vocabCache";
const VER_KEY = "toeic.vocabVersion";

async function fromFirestore(): Promise<VocabWord[] | null> {
  if (!firebaseEnabled || !db) return null;
  try {
    const metaSnap = await getDoc(doc(db, "meta", "vocab"));
    if (!metaSnap.exists()) return null;
    const { version, chunks } = metaSnap.data() as { version: string; chunks: number };

    // 版本相符 → 直接用本機快取（0 次雲端讀取）
    if (typeof window !== "undefined") {
      const cachedVer = localStorage.getItem(VER_KEY);
      const cached = localStorage.getItem(CACHE_KEY);
      if (cachedVer === version && cached) return JSON.parse(cached) as VocabWord[];
    }

    // 版本不同 → 讀取所有分塊並更新快取
    const all: VocabWord[] = [];
    for (let i = 0; i < chunks; i++) {
      const c = await getDoc(doc(db, "vocabChunks", `chunk_${i}`));
      if (c.exists()) all.push(...((c.data().words as VocabWord[]) ?? []));
    }
    if (all.length && typeof window !== "undefined") {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(all));
        localStorage.setItem(VER_KEY, version);
      } catch {
        /* 超出 localStorage 容量則略過快取 */
      }
    }
    return all.length ? all : null;
  } catch {
    return null;
  }
}

export async function loadVocabClient(): Promise<VocabWord[]> {
  const cloud = await fromFirestore();
  if (cloud) return cloud;
  // 後備：本機檔案
  try {
    const res = await fetch("/api/vocab");
    const d = await res.json();
    return d.vocab ?? [];
  } catch {
    return [];
  }
}
