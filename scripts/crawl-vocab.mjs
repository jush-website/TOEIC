#!/usr/bin/env node
/**
 * 單字爬蟲：把 data/wordlist.txt 的每個字補成完整單字卡，輸出 data/vocab.enriched.json。
 *
 * 來源（皆免費、合法）：
 *   - 詞性 / 英文定義 / 例句 / 音標 / 發音：Free Dictionary API (dictionaryapi.dev)
 *   - 繁體中文翻譯：MyMemory 免費翻譯 API (mymemory.translated.net)
 *   - 精選的 data/vocab.json（56 字，含人工中文與例句）優先保留。
 *
 * 特性：
 *   - 可中斷續跑：已補好的字會自動略過（讀現有 vocab.enriched.json）。
 *   - 增量存檔：每 25 字寫一次，跑到一半中斷也不會白費。
 *   - 量大時 MyMemory 有每日額度；設環境變數 MYMEMORY_EMAIL 可提高上限。
 *
 * 用法：
 *   node scripts/crawl-vocab.mjs            # 跑完整字表
 *   node scripts/crawl-vocab.mjs 200        # 只跑前 200 字（測試）
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data");
const WORDLIST = join(DATA, "wordlist.txt");
const SEED = join(DATA, "vocab.json");
const OUT = join(DATA, "vocab.enriched.json");

const LIMIT = Number(process.argv[2]) || Infinity;
const EMAIL = process.env.MYMEMORY_EMAIL || "";
const TSL_COUNT = 1259; // wordlist.txt 前 1259 字為 TOEIC 專用字表

const DICT = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MM = "https://api.mymemory.translated.net/get";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 帶逾時的 fetch：請求超過 ms 毫秒就中止，避免卡死 */
const fetchT = (url, ms = 12000) => fetch(url, { signal: AbortSignal.timeout(ms) });

const POS_MAP = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  conjunction: "conjunction",
  interjection: "phrase",
  pronoun: "noun",
  determiner: "adjective",
  exclamation: "phrase",
};

/** 從字典 API 擷取定義、例句、詞性、音標、發音 */
async function lookup(word) {
  try {
    const res = await fetchT(`${DICT}/${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const entry = data[0];

    let phonetic = entry.phonetic ?? "";
    let audio = "";
    for (const p of entry.phonetics ?? []) {
      if (!phonetic && p.text) phonetic = p.text;
      if (!audio && p.audio) audio = p.audio.startsWith("http") ? p.audio : `https:${p.audio}`;
      if (phonetic && audio) break;
    }

    const meaning = entry.meanings?.[0];
    const pos = POS_MAP[meaning?.partOfSpeech] ?? "phrase";
    const def = meaning?.definitions?.[0];
    const definition = def?.definition ?? "";
    let example = def?.example ?? "";
    // 找有 example 的定義
    if (!example) {
      for (const m of entry.meanings ?? []) {
        for (const d of m.definitions ?? []) {
          if (d.example) { example = d.example; break; }
        }
        if (example) break;
      }
    }
    return { pos, definition, example, phonetic, audio };
  } catch {
    return null;
  }
}

let translateDisabled = false;

/** MyMemory 免費翻譯 en→繁中 */
async function translate(text) {
  if (translateDisabled) return "";
  try {
    const u = new URL(MM);
    u.searchParams.set("q", text);
    u.searchParams.set("langpair", "en|zh-TW");
    if (EMAIL) u.searchParams.set("de", EMAIL);
    const res = await fetchT(u);
    const data = await res.json();
    const details = (data.responseDetails || "").toString().toUpperCase();
    if (details.includes("QUOTA") || details.includes("LIMIT")) {
      console.warn("\n⚠ MyMemory 今日翻譯額度用完了，先暫停翻譯（其餘照常爬）。");
      console.warn("  明天再跑一次 npm run crawl 即可續補，或設 MYMEMORY_EMAIL 提高額度。\n");
      translateDisabled = true;
      return "";
    }
    if (data.responseStatus !== 200) return "";
    const raw = (data.responseData?.translatedText || "").trim();
    // 過濾掉翻譯失敗時直接回傳原文的情況
    if (!raw || raw.toLowerCase() === text.toLowerCase()) return "";
    // 去除重複的逗號片段（MyMemory 偶爾回傳「會議, 會議」），最多保留 3 個義項
    const parts = [...new Set(raw.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean))];
    return parts.slice(0, 3).join("、");
  } catch {
    return "";
  }
}

// 任何漏接的非同步錯誤都只記錄、不終止進程
process.on("unhandledRejection", (e) => {
  console.warn("\n（略過一個錯誤）", e?.message || e);
});

async function main() {
  if (!existsSync(WORDLIST)) {
    console.error(`找不到 ${WORDLIST}，請先執行 node scripts/build-wordlist.mjs`);
    process.exit(1);
  }

  const words = (await readFile(WORDLIST, "utf8"))
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);

  const result = new Map();

  // 既有成果（續跑，含先前爬到的音標／發音）
  if (existsSync(OUT)) {
    const prev = JSON.parse(await readFile(OUT, "utf8"));
    for (const w of prev) result.set(w.word, w);
  }

  // 精選種子（人工中文／例句，優先保留；但保住既有的音標與發音）
  const seed = JSON.parse(await readFile(SEED, "utf8"));
  for (const w of seed) {
    const prev = result.get(w.word) ?? {};
    result.set(w.word, { ...w, phonetic: prev.phonetic || "", audio: prev.audio || "" });
  }

  // 存檔：失敗（如 OneDrive 同步鎖檔）時重試，絕不讓整個爬蟲中斷
  const save = async () => {
    const json = JSON.stringify([...result.values()], null, 2) + "\n";
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await writeFile(OUT, json, "utf8");
        return;
      } catch {
        await sleep(1000);
      }
    }
    console.warn("\n（存檔暫時失敗，稍後會再試）");
  };

  console.log(`📚 字表 ${words.length} 字，開始補齊（已完成的會略過）…\n`);
  let done = 0, processed = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const existing = result.get(word);
    // 已有定義與中文 → 略過（續跑）
    if (existing && existing.definition && existing.zh) continue;

    processed++;
    const info = await lookup(word);
    const category = i < TSL_COUNT ? "多益核心" : "高頻";

    if (!info && !existing) {
      // 查無資料，仍放進去（至少有字），詞性 phrase
      result.set(word, {
        word, pos: "phrase", definition: "", zh: await translate(word),
        example: "", category, phonetic: "", audio: "",
      });
    } else {
      const base = existing ?? { word, category };
      const zh = base.zh || (await translate(word));
      result.set(word, {
        word,
        pos: base.pos ?? info?.pos ?? "phrase",
        definition: base.definition || info?.definition || "",
        zh,
        example: base.example || info?.example || "",
        category: base.category ?? category,
        phonetic: info?.phonetic || base.phonetic || "",
        audio: info?.audio || base.audio || "",
      });
    }

    done++;
    if (done % 20 === 0 || i === words.length - 1) {
      const cur = result.get(word);
      process.stdout.write(
        `\r  [${i + 1}/${words.length}] ${word.padEnd(16)} ${cur.zh || cur.definition.slice(0, 20) || "—"}`.padEnd(60)
      );
    }
    if (done % 25 === 0) await save();
    await sleep(280);
  }

  await save();
  const arr = [...result.values()];
  const withZh = arr.filter((w) => w.zh).length;
  console.log(`\n\n✅ 完成！單字庫共 ${arr.length} 字，其中 ${withZh} 字含中文。`);
  console.log(`   本次處理 ${processed} 字，已寫入 ${OUT}`);
  if (translateDisabled) console.log("   （部分中文待補：明天再跑一次即可續補。）");
}

main().catch((e) => {
  console.error("\n爬蟲失敗：", e);
  process.exit(1);
});
