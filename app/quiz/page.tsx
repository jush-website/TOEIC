"use client";

import { useEffect, useState } from "react";
import type { QuizPart, QuizQuestion, VocabWord } from "@/lib/types";
import { addQuizRecord, loadCards } from "@/lib/storage";
import { loadVocabClient } from "@/lib/getVocab";
import { isDue } from "@/lib/srs";
import { generateLocalQuiz } from "@/lib/localQuiz";

type Source = "local" | "ai";

const PARTS: { id: QuizPart; label: string; desc: string }[] = [
  { id: "part5", label: "Part 5", desc: "單句填空 · 文法詞彙" },
  { id: "part6", label: "Part 6", desc: "段落填空 · 克漏字" },
  { id: "part7", label: "Part 7", desc: "短文閱讀理解" },
];
const DIFF: { id: "easy" | "medium" | "hard"; label: string }[] = [
  { id: "easy", label: "簡單" },
  { id: "medium", label: "中等" },
  { id: "hard", label: "困難" },
];
const LETTERS = ["A", "B", "C", "D"];

export default function QuizPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [source, setSource] = useState<Source>("local");
  const [part, setPart] = useState<QuizPart>("part5");
  const [diff, setDiff] = useState<"easy" | "medium" | "hard">("medium");
  const [useVocab, setUseVocab] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    loadVocabClient().then(setVocab);
  }, []);

  const reset = () => {
    setQuestions(null);
    setAnswers({});
    setGraded(false);
    setError("");
  };

  const generate = async () => {
    reset();
    // ---- 免費離線出題 ----
    if (source === "local") {
      const cards = loadCards();
      const prefer = vocab.filter((v) => cards[v.word] && isDue(cards[v.word])).map((v) => v.word);
      const qs = generateLocalQuiz(vocab, 8, prefer);
      if (qs.length === 0) {
        setError("單字庫不足，無法出題。");
        return;
      }
      setQuestions(qs);
      return;
    }
    // ---- AI 出題（需金鑰）----
    setLoading(true);
    let words: string[] = [];
    if (useVocab && vocab.length) {
      words = [...vocab].sort(() => Math.random() - 0.5).slice(0, 8).map((v) => v.word);
    }
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part, difficulty: diff, words, count: part === "part5" ? 5 : 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "出題失敗");
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "出題失敗");
    } finally {
      setLoading(false);
    }
  };

  const key = (q: number, it: number) => `${q}.${it}`;

  const submit = () => {
    if (!questions) return;
    setGraded(true);
    let total = 0;
    let correct = 0;
    questions.forEach((q, qi) =>
      q.items.forEach((it, ii) => {
        total++;
        if (answers[key(qi, ii)] === it.answer) correct++;
      })
    );
    addQuizRecord({ date: Date.now(), part: questions[0].part, total, correct });
  };

  const totalItems = questions?.reduce((s, q) => s + q.items.length, 0) ?? 0;
  const answeredCount = Object.keys(answers).length;
  const score = questions
    ? questions.reduce(
        (s, q, qi) => s + q.items.filter((it, ii) => answers[key(qi, ii)] === it.answer).length,
        0
      )
    : 0;

  // ---- 設定畫面 ----
  if (!questions && !loading) {
    return (
      <div className="fade-up">
        <header className="mb-7">
          <p className="chip mb-3">Quiz</p>
          <h1 className="display text-4xl font-semibold text-cream">測驗</h1>
          <p className="mt-2 text-cream-dim">免費離線出題，或用 Claude 生成更豐富的擬真題。</p>
        </header>

        <div className="panel max-w-2xl space-y-6 p-7">
          {/* 出題來源 */}
          <div>
            <label className="mb-2 block text-sm text-muted">出題來源</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => setSource("local")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  source === "local" ? "border-gold bg-gold/10" : "border-line hover:border-cream-dim"
                }`}
              >
                <div className="display font-semibold text-cream">
                  免費 · 離線 <span className="ml-1 text-xs text-teal">推薦</span>
                </div>
                <div className="mt-0.5 text-xs text-muted">用單字庫即時產生詞彙題，零費用、不需金鑰。</div>
              </button>
              <button
                onClick={() => setSource("ai")}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  source === "ai" ? "border-gold bg-gold/10" : "border-line hover:border-cream-dim"
                }`}
              >
                <div className="display font-semibold text-cream">AI 生成</div>
                <div className="mt-0.5 text-xs text-muted">Part 5/6/7 擬真題與詳解，需 Anthropic 金鑰（付費）。</div>
              </button>
            </div>
          </div>

          {source === "local" ? (
            <div className="rounded-xl border border-line bg-ink/40 p-4 text-sm text-cream-dim">
              將從你的單字庫出 <span className="font-semibold text-gold">8</span> 題情境詞彙題，
              優先挑選「該複習」的字。完全免費、即時。
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm text-muted">題型</label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PARTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPart(p.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        part === p.id ? "border-gold bg-gold/10" : "border-line hover:border-cream-dim"
                      }`}
                    >
                      <div className="display font-semibold text-cream">{p.label}</div>
                      <div className="mt-0.5 text-xs text-muted">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted">難度</label>
                <div className="flex gap-2">
                  {DIFF.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDiff(d.id)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        diff === d.id ? "border-gold bg-gold/10 text-gold" : "border-line text-cream-dim hover:text-cream"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-cream-dim">
                <input
                  type="checkbox"
                  checked={useVocab}
                  onChange={(e) => setUseVocab(e.target.checked)}
                  className="h-4 w-4 accent-[var(--gold)]"
                />
                融入我的單字庫（隨機抽取單字入題）
              </label>
            </>
          )}

          {error && <p className="rounded-lg border border-rose/40 bg-rose/10 p-3 text-sm text-rose">{error}</p>}

          <button className="btn btn-gold w-full" disabled={vocab.length === 0} onClick={generate}>
            開始測驗 →
          </button>
        </div>
      </div>
    );
  }

  // ---- 載入中 ----
  if (loading) {
    return (
      <div className="fade-up grid place-items-center py-24 text-center">
        <div>
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-gold" />
          <p className="display text-xl text-cream">Claude 正在出題…</p>
          <p className="mt-1 text-sm text-muted">為你設計擬真的多益題目與詳解</p>
        </div>
      </div>
    );
  }

  // ---- 作答 / 結果 ----
  const partLabel = PARTS.find((p) => p.id === questions![0].part)?.label ?? "詞彙";
  return (
    <div className="fade-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display text-3xl font-semibold text-cream">
          {partLabel} 測驗 {source === "local" && <span className="text-sm text-teal">· 免費</span>}
        </h1>
        {graded ? (
          <span className="chip">得分 {score}/{totalItems}</span>
        ) : (
          <span className="tnum text-sm text-muted">已答 {answeredCount}/{totalItems}</span>
        )}
      </div>

      <div className="space-y-5">
        {questions!.map((q, qi) => (
          <article key={q.id} className="panel p-6">
            {q.passage && (
              <p className="mb-4 whitespace-pre-wrap rounded-lg bg-ink/50 p-4 text-[15px] leading-7 text-cream">
                {q.passage}
              </p>
            )}
            {q.items.map((it, ii) => {
              const sel = answers[key(qi, ii)];
              return (
                <div key={ii} className={ii > 0 ? "mt-6 border-t border-line pt-5" : ""}>
                  {it.question && (
                    <p className="mb-3 font-medium leading-7 text-cream">
                      {source === "local" && <span className="mr-2 text-gold">{qi + 1}.</span>}
                      {q.items.length > 1 && <span className="mr-2 text-gold">{ii + 1}.</span>}
                      {it.question}
                    </p>
                  )}
                  <div className="grid gap-2">
                    {it.options.map((opt, oi) => {
                      const isSel = sel === oi;
                      const isCorrect = oi === it.answer;
                      let cls = "border-line hover:border-cream-dim";
                      if (graded) {
                        if (isCorrect) cls = "border-teal bg-teal/10 text-teal";
                        else if (isSel) cls = "border-rose bg-rose/10 text-rose";
                        else cls = "border-line opacity-60";
                      } else if (isSel) {
                        cls = "border-gold bg-gold/10";
                      }
                      return (
                        <button
                          key={oi}
                          disabled={graded}
                          onClick={() => setAnswers((a) => ({ ...a, [key(qi, ii)]: oi }))}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${cls}`}
                        >
                          <span className="display grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs">
                            {LETTERS[oi]}
                          </span>
                          <span className="text-cream">{opt}</span>
                          {graded && isCorrect && <span className="ml-auto text-teal">✓</span>}
                          {graded && isSel && !isCorrect && <span className="ml-auto text-rose">✗</span>}
                        </button>
                      );
                    })}
                  </div>
                  {graded && (
                    <p className="mt-3 rounded-lg border-l-2 border-gold/50 bg-ink/40 p-3 text-sm leading-6 text-cream-dim">
                      <span className="font-semibold text-gold">解析　</span>
                      {it.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </article>
        ))}
      </div>

      <div className="mt-7 flex gap-3">
        {!graded ? (
          <button className="btn btn-gold" disabled={answeredCount < totalItems} onClick={submit}>
            {answeredCount < totalItems ? `還有 ${totalItems - answeredCount} 題未答` : "交卷對答案"}
          </button>
        ) : (
          <button className="btn btn-gold" onClick={generate}>
            再來一組 →
          </button>
        )}
        <button className="btn btn-ghost" onClick={reset}>
          返回設定
        </button>
      </div>
    </div>
  );
}
