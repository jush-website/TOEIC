"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CardProgress, QuizRecord, VocabWord } from "@/lib/types";
import { loadCards, loadQuizHistory } from "@/lib/storage";
import { loadVocabClient } from "@/lib/getVocab";
import { isDue, isMastered } from "@/lib/srs";

export default function Home() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [cards, setCards] = useState<Record<string, CardProgress>>({});
  const [history, setHistory] = useState<QuizRecord[]>([]);

  useEffect(() => {
    loadVocabClient().then(setVocab);
    const refresh = () => {
      setCards(loadCards());
      setHistory(loadQuizHistory());
    };
    refresh();
    window.addEventListener("toeic-sync", refresh);
    return () => window.removeEventListener("toeic-sync", refresh);
  }, []);

  const cardList = Object.values(cards);
  const mastered = cardList.filter(isMastered).length;
  const due = cardList.filter(isDue).length;
  const learning = cardList.length - mastered;
  const totalQ = history.reduce((s, r) => s + r.total, 0);
  const correctQ = history.reduce((s, r) => s + r.correct, 0);
  const accuracy = totalQ ? Math.round((correctQ / totalQ) * 100) : null;

  return (
    <div className="fade-up">
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden">
        <p className="chip mb-5">Crawl · Generate · Master</p>
        <h1 className="display max-w-3xl text-5xl font-semibold leading-[1.05] text-cream sm:text-6xl">
          把多益準備
          <br />
          交給一台<span className="italic text-gold">神器</span>。
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-dim">
          爬取網路單字與例句、用單字庫免費即時出題、以間隔重複幫你記得牢。
          完全免費就能練單字與詞彙題；想要克漏字與閱讀，再接上 AI 即可。
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/quiz" className="btn btn-gold">
            開始 AI 測驗 →
          </Link>
          <Link href="/flashcards" className="btn btn-ghost">
            背單字卡
          </Link>
        </div>
        <span
          aria-hidden
          className="display pointer-events-none absolute -right-4 -top-10 select-none text-[10rem] font-semibold leading-none text-cream/[0.03] sm:text-[14rem]"
        >
          990
        </span>
      </section>

      {/* Stats */}
      <section className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="已精熟" value={mastered} accent="teal" />
        <Stat label="學習中" value={learning} accent="gold" />
        <Stat label="今日待複習" value={due} accent="rose" />
        <Stat label="測驗正確率" value={accuracy === null ? "—" : `${accuracy}%`} accent="violet" />
      </section>

      {/* Modes */}
      <section className="grid gap-4 sm:grid-cols-3">
        <ModeCard href="/vocab" n="01" title="單字庫" desc={`${vocab.length || "—"} 個多益高頻字，含音標、發音與例句。`} />
        <ModeCard href="/flashcards" n="02" title="單字卡" desc="間隔重複演算法，自動安排該複習的字。" />
        <ModeCard href="/quiz" n="03" title="測驗" desc="免費離線詞彙題，或接 AI 出 Part 5/6/7。" />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "teal" | "gold" | "rose" | "violet";
}) {
  const color = { teal: "text-teal", gold: "text-gold", rose: "text-rose", violet: "text-violet" }[accent];
  return (
    <div className="panel p-5">
      <div className={`display tnum text-4xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs tracking-wide text-muted">{label}</div>
    </div>
  );
}

function ModeCard({ href, n, title, desc }: { href: string; n: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="panel group relative flex flex-col p-6 transition-transform duration-200 hover:-translate-y-1"
    >
      <span className="display text-sm text-gold/70">{n}</span>
      <h3 className="display mt-2 text-2xl font-semibold text-cream">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cream-dim">{desc}</p>
      <span className="mt-4 text-sm text-gold opacity-0 transition-opacity group-hover:opacity-100">進入 →</span>
    </Link>
  );
}
