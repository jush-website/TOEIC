"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuizPart, QuizRecord } from "@/lib/types";
import { loadQuizHistory } from "@/lib/storage";
import { useSync } from "@/components/SyncProvider";

const PART_LABEL: Record<QuizPart, string> = {
  part5: "Part 5 · 詞彙／文法",
  part6: "Part 6 · 段落填空",
  part7: "Part 7 · 閱讀理解",
};

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { enabled, user } = useSync();
  const [history, setHistory] = useState<QuizRecord[]>([]);

  useEffect(() => {
    const refresh = () => setHistory(loadQuizHistory());
    refresh();
    // 登入同步或其他頁面作答後，重新讀取
    window.addEventListener("toeic-sync", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("toeic-sync", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const totalQ = history.reduce((s, r) => s + r.total, 0);
  const correctQ = history.reduce((s, r) => s + r.correct, 0);
  const accuracy = totalQ ? Math.round((correctQ / totalQ) * 100) : null;

  return (
    <div className="fade-up">
      <header className="mb-7">
        <p className="chip mb-3">History</p>
        <h1 className="display text-4xl font-semibold text-cream">測驗紀錄</h1>
        <p className="mt-2 text-cream-dim">
          {user
            ? `已登入為 ${user.displayName ?? user.email}，紀錄跨裝置同步。`
            : "每次交卷都會記錄在此。"}
        </p>
      </header>

      {/* 未登入提示：紀錄僅存本機 */}
      {enabled && !user && (
        <div className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm text-cream-dim">
          目前紀錄只存在這台裝置。點右上角
          <span className="font-semibold text-gold"> 登入同步 </span>
          用 Google 帳號登入，即可跨裝置保存你的測驗紀錄。
        </div>
      )}

      {/* 總覽 */}
      <section className="mb-8 grid grid-cols-3 gap-4">
        <Stat label="測驗次數" value={history.length} accent="gold" />
        <Stat label="總答題數" value={totalQ} accent="teal" />
        <Stat label="總正確率" value={accuracy === null ? "—" : `${accuracy}%`} accent="violet" />
      </section>

      {/* 明細 */}
      {history.length === 0 ? (
        <div className="panel grid place-items-center p-12 text-center">
          <p className="text-cream-dim">還沒有任何測驗紀錄。</p>
          <Link href="/quiz" className="btn btn-gold mt-4">
            開始測驗 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {history.map((r) => {
            const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
            const tone = pct >= 80 ? "text-teal" : pct >= 50 ? "text-gold" : "text-rose";
            return (
              <li
                key={r.date}
                className="panel flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="display font-semibold text-cream">
                    {PART_LABEL[r.part] ?? r.part}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{fmtDate(r.date)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="tnum text-sm text-cream-dim">
                    {r.correct}/{r.total}
                  </span>
                  <span className={`tnum display text-2xl font-semibold ${tone}`}>{pct}%</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
  accent: "teal" | "gold" | "violet";
}) {
  const color = { teal: "text-teal", gold: "text-gold", violet: "text-violet" }[accent];
  return (
    <div className="panel p-5">
      <div className={`display tnum text-3xl font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-xs tracking-wide text-muted">{label}</div>
    </div>
  );
}
