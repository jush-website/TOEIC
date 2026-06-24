// 伺服器端單字載入：優先讀取爬蟲產生的 enriched 檔，否則回退種子庫。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { VocabWord } from "./types";

const DATA_DIR = join(process.cwd(), "data");

let cache: VocabWord[] | null = null;

export async function loadVocab(): Promise<VocabWord[]> {
  if (cache) return cache;
  // 先試爬蟲補強過的檔案
  for (const file of ["vocab.enriched.json", "vocab.json"]) {
    try {
      const raw = await readFile(join(DATA_DIR, file), "utf8");
      cache = JSON.parse(raw) as VocabWord[];
      return cache;
    } catch {
      // 試下一個
    }
  }
  cache = [];
  return cache;
}

export function clearVocabCache() {
  cache = null;
}
