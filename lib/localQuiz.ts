// 免費、離線的出題引擎：直接用單字庫產生 Part 5 詞彙題，不需任何 API。
import type { QuizQuestion, QuizItem, VocabWord } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 從同詞性的單字中挑 n 個干擾選項（不含正解） */
function pickDistractors(target: VocabWord, pool: VocabWord[], n: number): VocabWord[] {
  const samePos = pool.filter((w) => w.word !== target.word && w.pos === target.pos);
  const others = pool.filter((w) => w.word !== target.word && w.pos !== target.pos);
  return shuffle([...shuffle(samePos), ...shuffle(others)]).slice(0, n);
}

/** 把例句中的目標字（含詞形變化）挖空 */
function blankSentence(word: string, example: string): string | null {
  const stem = word.slice(0, Math.min(word.length, 5));
  const re = new RegExp(`\\b(${stem}[a-z]*)\\b`, "i");
  if (!re.test(example)) return null;
  return example.replace(re, "____");
}

/** 產生一題詞彙題 */
function makeItem(target: VocabWord, pool: VocabWord[]): { item: QuizItem; passage: string } {
  const distractors = pickDistractors(target, pool, 3);
  const options = shuffle([target, ...distractors]);
  const answer = options.findIndex((o) => o.word === target.word);

  const blanked = blankSentence(target.word, target.example);

  if (blanked) {
    // 情境填空題
    return {
      passage: "",
      item: {
        question: blanked,
        options: options.map((o) => o.word),
        answer,
        explanation: `正解 ${target.word}（${target.zh}）：${target.definition}。完整句：${target.example}`,
      },
    };
  }

  // 退而求其次：詞義配對題
  return {
    passage: "",
    item: {
      question: `下列哪個字最符合「${target.zh}」的意思？`,
      options: options.map((o) => o.word),
      answer,
      explanation: `正解 ${target.word}（${target.zh}）：${target.definition}`,
    },
  };
}

/**
 * 產生 Part 5 詞彙測驗（離線、免費）。
 * @param vocab 全部單字庫
 * @param count 題數
 * @param prefer 優先出題的單字（例如該複習的字）
 */
export function generateLocalQuiz(
  vocab: VocabWord[],
  count: number,
  prefer: string[] = []
): QuizQuestion[] {
  if (vocab.length < 4) return [];
  const preferSet = new Set(prefer);
  const preferred = shuffle(vocab.filter((v) => preferSet.has(v.word)));
  const rest = shuffle(vocab.filter((v) => !preferSet.has(v.word)));
  const targets = [...preferred, ...rest].slice(0, count);

  return targets.map((t, i) => {
    const { item, passage } = makeItem(t, vocab);
    return {
      id: `local-${Date.now()}-${i}`,
      part: "part5",
      passage,
      items: [item],
    };
  });
}
