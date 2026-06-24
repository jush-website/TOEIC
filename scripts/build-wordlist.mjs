#!/usr/bin/env node
/**
 * 組裝 ~4000 字的單字表 data/wordlist.txt：
 *   1. TSL（TOEIC Service List 1.1，多益專用 1200+ 字，CC 授權）— 優先
 *   2. 公開高頻英文字表（google-10000-english，公共領域）— 補足其餘
 * 過濾掉虛詞與過短的字。執行一次即可，結果存進專案。
 *
 * 用法：node scripts/build-wordlist.mjs [目標字數，預設 4000]
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "wordlist.txt");
const TARGET = Number(process.argv[2]) || 4000;

const TSL_URL =
  "https://raw.githubusercontent.com/antdurrant/word.lists/master/data-raw/list_toeic/TSL_1.1_stats.csv";
const FREQ_URL =
  "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt";

// 虛詞 / 太常見而非「該背的單字」者
const STOP = new Set(
  ("the of and to a in is it you that he was for on are with as his they i at be this have from or one had by " +
    "but not what all were we when your can said there use an each which she do how their if will up other about " +
    "out many then them these so some her would make like him into has more her two no way could my than first " +
    "been call who oil its now find long down day did get come made may part over new sound take only little work " +
    "know place year live me back give most very after thing our just name good sentence man think say great where " +
    "help through much before line right too mean old any same tell boy follow came want show also around form three " +
    "small set put end does another well large must big even such because turn here why ask went men read need land " +
    "different home us move try kind hand picture again change off play spell air away animal house point page letter " +
    "mother answer found study still learn should america world high every near add food between own below country plant " +
    "mr mrs am pm etc")
    .split(/\s+/)
);

const clean = (w) =>
  w
    .toLowerCase()
    .replace(/[^a-z'-]/g, "")
    .trim();

const usable = (w) => w.length >= 3 && /^[a-z][a-z'-]*$/.test(w) && !STOP.has(w);

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function main() {
  console.log("📥 下載 TSL（多益專用字表）…");
  const tslCsv = await fetchText(TSL_URL);
  const tsl = tslCsv
    .split(/\r?\n/)
    .slice(1) // 去掉標頭 Word,TSL Rank,...
    .map((line) => clean(line.split(",")[0] ?? ""))
    .filter(usable);

  console.log(`   TSL 取得 ${tsl.length} 字`);

  console.log("📥 下載高頻英文字表…");
  const freqTxt = await fetchText(FREQ_URL);
  const freq = freqTxt
    .split(/\r?\n/)
    .map(clean)
    .filter(usable);

  // 合併：TSL 優先，再用高頻字補到目標數
  const seen = new Set();
  const out = [];
  for (const w of [...tsl, ...freq]) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= TARGET) break;
  }

  await writeFile(OUT, out.join("\n") + "\n", "utf8");
  console.log(`\n✅ 完成：${out.length} 字（TSL 優先 ${tsl.length}）→ ${OUT}`);
}

main().catch((e) => {
  console.error("組裝失敗：", e);
  process.exit(1);
});
