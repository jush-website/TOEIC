#!/usr/bin/env node
/**
 * 把 data/vocab.enriched.json 上傳到 Firestore（分塊存放）。
 * App 之後會從 Firebase 讀一次並快取在本機，幾乎不耗讀取額度。
 *
 * 前置：
 *   1. .env.local 已填好 NEXT_PUBLIC_FIREBASE_* 設定。
 *   2. Firebase Console → Firestore 已建立資料庫。
 *   3. 暫時把規則設成允許寫入（見 README〈Firebase 設定〉），上傳完再鎖回唯讀。
 *
 * 用法：node scripts/upload-vocab.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHUNK = 500;

// 手動讀 .env.local（node 不會自動載入）
async function loadEnv() {
  const raw = await readFile(join(ROOT, ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = await loadEnv();
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId) {
    console.error("找不到 Firebase 設定，請先填好 .env.local");
    process.exit(1);
  }

  const vocab = JSON.parse(await readFile(join(ROOT, "data", "vocab.enriched.json"), "utf8"));
  const app = initializeApp(config);
  const db = getFirestore(app);

  const chunks = [];
  for (let i = 0; i < vocab.length; i += CHUNK) chunks.push(vocab.slice(i, i + CHUNK));

  console.log(`📤 上傳 ${vocab.length} 字，分成 ${chunks.length} 塊…`);
  const batch = writeBatch(db);
  chunks.forEach((words, i) => {
    batch.set(doc(db, "vocabChunks", `chunk_${i}`), { index: i, words });
  });
  // 版本以字數 + 時間標記，App 用來判斷快取是否要更新
  const version = `${vocab.length}-${Date.now()}`;
  batch.set(doc(db, "meta", "vocab"), { count: vocab.length, chunks: chunks.length, version });
  await batch.commit();

  console.log(`✅ 完成！已寫入 vocabChunks（${chunks.length} 塊）與 meta/vocab。`);
  console.log(`   版本：${version}`);
  console.log("   記得把 Firestore 規則改回唯讀（見 README）。");
  process.exit(0);
}

main().catch((e) => {
  console.error("上傳失敗：", e?.message || e);
  process.exit(1);
});
