// 共用型別定義

/** 詞性 */
export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "preposition"
  | "conjunction"
  | "phrase";

/** 單字資料 */
export interface VocabWord {
  /** 單字本身（小寫） */
  word: string;
  /** 詞性 */
  pos: PartOfSpeech;
  /** 英文定義 */
  definition: string;
  /** 繁體中文翻譯 */
  zh: string;
  /** 例句（英文） */
  example: string;
  /** 多益主題分類，例如 "辦公室"、"商務"、"旅遊" */
  category: string;
  /** KK / IPA 音標（由爬蟲補上，可能為空） */
  phonetic?: string;
  /** 發音音檔 URL（由爬蟲補上，可能為空） */
  audio?: string;
}

/** 多益題型 */
export type QuizPart =
  | "part5" // 句子填空（文法 / 詞彙）
  | "part6" // 段落填空（克漏字）
  | "part7"; // 閱讀理解

/** 單一選擇題 */
export interface QuizQuestion {
  id: string;
  part: QuizPart;
  /** 題目文字；Part 6/7 為短文，空格以 ____ 標示 */
  passage: string;
  /** 子題（Part 5 只有一題；Part 6/7 可能多題） */
  items: QuizItem[];
}

export interface QuizItem {
  /** 題幹（Part 5 可省略，直接用 passage） */
  question?: string;
  /** 四個選項 */
  options: string[];
  /** 正解索引 0-3 */
  answer: number;
  /** 中文解析 */
  explanation: string;
}

/** 單字學習進度（間隔重複，SM-2 簡化版） */
export interface CardProgress {
  word: string;
  /** 熟練度等級 0=新, 1..5 */
  level: number;
  /** 下次複習時間（timestamp ms） */
  due: number;
  /** 連續答對次數 */
  streak: number;
  /** 最後複習時間 */
  lastReviewed: number;
}

/** 測驗紀錄 */
export interface QuizRecord {
  date: number;
  part: QuizPart;
  total: number;
  correct: number;
}
