"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CardProgress, VocabWord } from "@/lib/types";
import { loadCards, saveCards } from "@/lib/storage";
import { loadVocabClient } from "@/lib/getVocab";
import { isDue, newCard, review } from "@/lib/srs";

const POS_ZH: Record<string, string> = {
  noun: "名", verb: "動", adjective: "形", adverb: "副",
  preposition: "介", conjunction: "連", phrase: "片",
};

export default function FlashcardsPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [cards, setCards] = useState<Record<string, CardProgress>>({});
  const [queue, setQueue] = useState<VocabWord[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState({ known: 0, forgot: 0 });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    loadVocabClient().then(setVocab);
    const refresh = () => setCards(loadCards());
    refresh();
    window.addEventListener("toeic-sync", refresh);
    return () => window.removeEventListener("toeic-sync", refresh);
  }, []);

  const dueCount = useMemo(() => {
    return vocab.filter((v) => {
      const c = cards[v.word];
      return !c || isDue(c);
    }).length;
  }, [vocab, cards]);

  const start = (mode: "due" | "all") => {
    const pool = vocab.filter((v) => {
      if (mode === "all") return true;
      const c = cards[v.word];
      return !c || isDue(c);
    });
    // 洗牌
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setQueue(pool.slice(0, 20));
    setIdx(0);
    setFlipped(false);
    setDone({ known: 0, forgot: 0 });
    setStarted(true);
  };

  const current = queue[idx];

  const answer = useCallback(
    (known: boolean) => {
      if (!current) return;
      const prev = cards[current.word] ?? newCard(current.word);
      const next = { ...cards, [current.word]: review(prev, known) };
      setCards(next);
      saveCards(next);
      setDone((d) => ({ known: d.known + (known ? 1 : 0), forgot: d.forgot + (known ? 0 : 1) }));
      setFlipped(false);
      setIdx((i) => i + 1);
    },
    [current, cards]
  );

  // 鍵盤：空白翻卡、1 忘記、2 記得
  useEffect(() => {
    if (!started || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && (e.key === "1")) answer(false);
      else if (flipped && (e.key === "2")) answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, current, flipped, answer]);

  const play = (audio?: string) => audio && new Audio(audio).play().catch(() => {});

  // ----- 起始畫面 -----
  if (!started) {
    return (
      <div className="fade-up">
        <header className="mb-7">
          <p className="chip mb-3">Flashcards</p>
          <h1 className="display text-4xl font-semibold text-cream">單字卡</h1>
          <p className="mt-2 text-cream-dim">翻卡複習，答對的字會自動延後再出現（間隔重複）。</p>
        </header>
        <div className="panel max-w-md p-7">
          <div className="flex items-baseline gap-3">
            <span className="display tnum text-5xl font-semibold text-gold">{dueCount}</span>
            <span className="text-cream-dim">個字今天該複習</span>
          </div>
          <p className="mt-1 text-sm text-muted">每回合最多 20 張。空白鍵翻卡，按 1（忘記）/ 2（記得）。</p>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-gold" disabled={vocab.length === 0} onClick={() => start("due")}>
              開始複習
            </button>
            <button className="btn btn-ghost" disabled={vocab.length === 0} onClick={() => start("all")}>
              全部隨機
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- 完成畫面 -----
  if (!current) {
    return (
      <div className="fade-up grid place-items-center py-16">
        <div className="panel max-w-sm p-8 text-center">
          <div className="display text-6xl">🎉</div>
          <h2 className="display mt-3 text-3xl font-semibold text-cream">本回合完成</h2>
          <p className="mt-3 text-cream-dim">
            記得 <span className="font-semibold text-teal">{done.known}</span> · 忘記{" "}
            <span className="font-semibold text-rose">{done.forgot}</span>
          </p>
          <button className="btn btn-gold mt-6" onClick={() => setStarted(false)}>
            再來一回合
          </button>
        </div>
      </div>
    );
  }

  // ----- 卡片畫面 -----
  return (
    <div className="fade-up">
      <div className="mb-5 flex items-center justify-between text-sm text-muted">
        <span className="tnum">{idx + 1} / {queue.length}</span>
        <span>記得 {done.known} · 忘記 {done.forgot}</span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full bg-gold transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setFlipped((f) => !f)}
        className="panel pop grid min-h-[320px] w-full place-items-center p-8 text-center"
      >
        {!flipped ? (
          <div>
            <h2 className="display text-5xl font-semibold text-cream sm:text-6xl">{current.word}</h2>
            {current.phonetic && <p className="tnum mt-3 text-muted">{current.phonetic}</p>}
            <p className="mt-6 text-sm text-muted">點一下或按空白鍵翻面</p>
          </div>
        ) : (
          <div className="flip-in">
            <div className="flex items-center justify-center gap-3">
              <span className="rounded bg-panel-2 px-1.5 py-0.5 text-xs text-gold">{POS_ZH[current.pos]}</span>
              {current.audio && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); play(current.audio); }}
                  className="grid h-8 w-8 place-items-center rounded-full border border-line text-gold hover:bg-gold/10"
                >
                  ♪
                </span>
              )}
            </div>
            <p className="display mt-3 text-4xl font-semibold text-gold">{current.zh}</p>
            <p className="mt-2 text-cream-dim">{current.definition}</p>
            <p className="mx-auto mt-4 max-w-md border-l-2 border-gold/40 pl-3 text-sm italic text-cream-dim">
              {current.example}
            </p>
          </div>
        )}
      </button>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          className="btn border border-rose/40 bg-rose/10 text-rose hover:bg-rose/20"
          disabled={!flipped}
          onClick={() => answer(false)}
        >
          忘記了 <span className="opacity-50">(1)</span>
        </button>
        <button
          className="btn border border-teal/40 bg-teal/10 text-teal hover:bg-teal/20"
          disabled={!flipped}
          onClick={() => answer(true)}
        >
          記得 <span className="opacity-50">(2)</span>
        </button>
      </div>
    </div>
  );
}
