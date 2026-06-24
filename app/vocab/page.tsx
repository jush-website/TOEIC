"use client";

import { useEffect, useMemo, useState } from "react";
import type { VocabWord } from "@/lib/types";
import { loadVocabClient } from "@/lib/getVocab";

const POS_ZH: Record<string, string> = {
  noun: "名",
  verb: "動",
  adjective: "形",
  adverb: "副",
  preposition: "介",
  conjunction: "連",
  phrase: "片",
};

export default function VocabPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("全部");

  useEffect(() => {
    loadVocabClient().then(setVocab);
  }, []);

  const cats = useMemo(
    () => ["全部", ...Array.from(new Set(vocab.map((v) => v.category)))],
    [vocab]
  );

  const filtered = vocab.filter((v) => {
    const matchCat = cat === "全部" || v.category === cat;
    const t = q.trim().toLowerCase();
    const matchQ = !t || v.word.includes(t) || v.zh.includes(q.trim()) || v.definition.toLowerCase().includes(t);
    return matchCat && matchQ;
  });

  const play = (audio?: string) => {
    if (audio) new Audio(audio).play().catch(() => {});
  };

  return (
    <div className="fade-up">
      <header className="mb-7">
        <p className="chip mb-3">Vocabulary</p>
        <h1 className="display text-4xl font-semibold text-cream">單字庫</h1>
        <p className="mt-2 text-cream-dim">
          {vocab.length} 個多益高頻字。音標與發音由免費字典 API 爬取。
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋單字、中文或定義…"
          className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-cream outline-none placeholder:text-muted focus:border-gold/60"
        />
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                cat === c ? "bg-gold/15 text-gold" : "border border-line text-cream-dim hover:text-cream"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((v, i) => (
          <article
            key={v.word}
            className="panel fade-up p-5"
            style={{ animationDelay: `${Math.min(i * 18, 320)}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="display text-2xl font-semibold text-cream">{v.word}</h2>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                  <span className="rounded bg-panel-2 px-1.5 py-0.5 text-xs text-gold">
                    {POS_ZH[v.pos] ?? v.pos}
                  </span>
                  {v.phonetic && <span className="tnum">{v.phonetic}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{v.category}</span>
                {v.audio && (
                  <button
                    onClick={() => play(v.audio)}
                    aria-label="播放發音"
                    className="grid h-9 w-9 place-items-center rounded-full border border-line text-gold transition-colors hover:bg-gold/10"
                  >
                    ♪
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-lg text-cream">{v.zh}</p>
            <p className="mt-1 text-sm text-cream-dim">{v.definition}</p>
            <p className="mt-3 border-l-2 border-gold/40 pl-3 text-sm italic text-cream-dim">
              {v.example}
            </p>
          </article>
        ))}
      </div>

      {filtered.length === 0 && vocab.length > 0 && (
        <p className="py-16 text-center text-muted">找不到符合的單字。</p>
      )}
      {vocab.length === 0 && <p className="py-16 text-center text-muted">載入中…</p>}
    </div>
  );
}
