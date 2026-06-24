import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { QuizPart, QuizQuestion } from "@/lib/types";

// 預設使用 Opus 4.8；可用環境變數 ANTHROPIC_MODEL 改成較省成本的 claude-haiku-4-5
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const PART_GUIDE: Record<QuizPart, string> = {
  part5:
    "Part 5（單句填空）：每題是一個獨立的英文句子，句中有一個空格以 ____ 表示。" +
    "考點聚焦在文法（詞性、時態、介系詞、連接詞、主謂一致）或詞彙辨析。" +
    "把完整句子（含 ____）放在每個 item 的 question 欄位，passage 留空字串。",
  part6:
    "Part 6（段落填空 / 克漏字）：寫一篇 70-100 字、情境真實的短文（email、公告、廣告等），" +
    "其中挖 3 個空格，依序以 ____ 標示。passage 放整篇短文，items 依空格順序各一題，" +
    "item 的 question 用「第 N 格」標示，options 為該空格的四個選項。",
  part7:
    "Part 7（閱讀理解）：寫一篇 80-120 字的短文（email、通知、文章），passage 放短文。" +
    "接著出 2 題理解題（主旨、細節或推論），每題放在一個 item，question 為題幹。",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          passage: { type: "string", description: "短文內容；Part 5 留空字串" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                question: { type: "string", description: "題幹文字" },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "正好四個選項（不含 A/B/C/D 標號）",
                },
                answer: { type: "integer", enum: [0, 1, 2, 3] },
                explanation: { type: "string", description: "繁體中文解析" },
              },
              required: ["question", "options", "answer", "explanation"],
            },
          },
        },
        required: ["passage", "items"],
      },
    },
  },
  required: ["questions"],
} as const;

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "尚未設定 ANTHROPIC_API_KEY。請在專案根目錄建立 .env.local 並填入金鑰後重啟伺服器。",
      },
      { status: 400 }
    );
  }

  let body: {
    part?: QuizPart;
    words?: string[];
    difficulty?: "easy" | "medium" | "hard";
    count?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const part: QuizPart = body.part ?? "part5";
  const difficulty = body.difficulty ?? "medium";
  const count = Math.min(Math.max(body.count ?? (part === "part5" ? 5 : 1), 1), 10);
  const words = (body.words ?? []).slice(0, 20);

  const wordHint =
    words.length > 0
      ? `請盡量自然地融入以下多益單字（可變化詞形）：${words.join(", ")}。`
      : "";

  const difficultyHint = {
    easy: "難度：簡單（多益 400-550 分程度）。",
    medium: "難度：中等（多益 600-750 分程度）。",
    hard: "難度：困難（多益 800+ 分程度，選項具高度干擾性）。",
  }[difficulty];

  const system =
    "你是一位專業的 TOEIC（多益）出題老師，熟悉 ETS 官方題型與商業情境英文。" +
    "請出符合多益風格、情境真實、選項設計嚴謹的測驗題。" +
    "所有解析請用繁體中文，清楚說明為什麼正解正確、其他選項為什麼錯。" +
    "選項不要加上 A/B/C/D 或數字標號，只給選項文字本身。";

  const userPrompt =
    `${PART_GUIDE[part]}\n\n` +
    `${difficultyHint}\n${wordHint}\n\n` +
    `請出 ${count} ${part === "part5" ? "題（每題一個 question item）" : "組"}。` +
    `Part 5 時 questions 陣列長度為 ${count}，每個 question 物件只含 1 個 item。`;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userPrompt }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "AI 未回傳內容，請重試。" }, { status: 502 });
    }

    const parsed = JSON.parse(text.text) as { questions: Omit<QuizQuestion, "id" | "part">[] };
    const questions: QuizQuestion[] = parsed.questions.map((q, i) => ({
      ...q,
      id: `${part}-${Date.now()}-${i}`,
      part,
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "API 金鑰無效，請確認 ANTHROPIC_API_KEY。" }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "請求過於頻繁，請稍候再試。" }, { status: 429 });
    }
    return NextResponse.json({ error: `出題失敗：${message}` }, { status: 500 });
  }
}
