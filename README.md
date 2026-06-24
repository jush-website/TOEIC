# 多益神器 · TOEIC Master

一站式多益準備工具：**爬取單字** → **AI 即時出題** → **間隔重複複習**。

採用 Next.js 16 + React 19 + Tailwind v4，題目由 Claude（Anthropic API）即時生成。

## 功能

| 模組 | 說明 |
| --- | --- |
| **單字庫** | 多益高頻字，含詞性、中文、英文定義、例句。音標與發音由免費字典 API 爬取。搜尋 + 分類篩選。 |
| **單字卡** | 翻卡學習，內建間隔重複（SM-2 簡化版）演算法，自動安排該複習的字。鍵盤操作。 |
| **測驗** | **免費離線**：用單字庫即時產生 Part 5 詞彙題，零費用、不需金鑰。**選用 AI**：接 Anthropic 金鑰可出 Part 5/6/7 擬真題與詳解。 |
| **總覽** | 學習統計：精熟數、待複習、測驗正確率。 |
| **雲端同步**（選用）| 用 Google 登入後，學習進度存到 Firebase，跨裝置同步；單字庫也可上雲。未設定時自動用瀏覽器 `localStorage`。 |

進度預設存在瀏覽器 `localStorage`，免後端即可使用；接上 Firebase 後可跨裝置同步（見〈Firebase 設定〉）。

## 快速開始

```bash
npm install
npm run dev     # 開啟 http://localhost:3000（已附約 280 字起始庫，直接能用）
```

想把單字庫擴充到 ~4000 字，見下方〈擴充到 4000 字〉。

> **完全免費就能用全部核心功能**：單字庫、單字卡、以及「免費離線」詞彙測驗，都不需要任何金鑰。
> 只有「AI 生成」題型（Part 6/7）才需要 Anthropic 金鑰——把 `.env.local.example` 複製成 `.env.local` 填入金鑰即可。

## Firebase 設定（雲端同步，選用）

讓學習進度跨裝置同步，並把單字庫放雲端。`.env.local` 已填好你的 Firebase 設定。

> Firebase 網頁版 `apiKey` **不是機密**，公開沒關係——安全性靠 Firestore 規則。

**一次性設定（在 [Firebase Console](https://console.firebase.google.com/)）：**

1. **Authentication** → 開始使用 → 登入方式 → 啟用 **Google**。
2. **Firestore Database** → 建立資料庫（正式版即可）。
3. **Firestore → 規則**：貼上專案根目錄 `firestore.rules` 的內容並發布。

**把單字庫上傳到雲端：**

1. 暫時放寬規則：把 `firestore.rules` 裡 `vocabChunks` 與 `meta` 的
   `allow write: if false;` 改成 `if true;`，發布。
2. 執行上傳：
   ```bash
   npm run upload-vocab
   ```
3. 上傳完，把那兩個 `write` 改回 `if false;` 重新發布（避免被亂改）。

之後 App 會從 Firebase 讀單字庫**一次並快取在本機**，幾乎不耗讀取額度。
登入後（右上角「登入同步」），進度就會自動同步；換裝置用**同一個 Google 帳號**登入即可接續。

> 沒做這段也完全沒問題：App 會自動退回本機檔案與 `localStorage`，功能不受影響。

## 擴充到 4000 字（爬蟲）

單字庫可長到約 4000 字，全程免費。兩個步驟：

```bash
npm run wordlist   # 1. 組裝 ~4000 字的字表 → data/wordlist.txt
npm run crawl      # 2. 逐字補齊定義/例句/音標/發音/中文 → data/vocab.enriched.json
```

- **字表來源**：[TSL（TOEIC Service List）](https://www.newgeneralservicelist.org/toeic-list)
  約 1200 個多益專用字（CC 授權）＋ 公開高頻英文字表（公共領域）補足，共 4000 字。
- **詞性／英文定義／例句／音標／發音**：[Free Dictionary API](https://dictionaryapi.dev)（免費）。
- **繁體中文**：[MyMemory](https://mymemory.translated.net) 免費翻譯 API。

> **可中斷續跑**：`npm run crawl` 每 25 字存檔一次，已補好的字會自動略過，
> 中途關掉再跑一次即可接續。4000 字約需 20–40 分鐘。
>
> **翻譯額度**：MyMemory 免費版每日約 5000 字。若中途顯示額度用完，
> 隔天再跑一次 `npm run crawl` 會自動續補；或在 `.env.local` 設
> `MYMEMORY_EMAIL=你的信箱` 把上限提高到每日 5 萬字。
>
> **翻譯品質**：自動翻譯對多義字偶有誤差（例：client 可能譯成「用戶端」而非「客戶」），
> 想完美可手動校對 `data/vocab.enriched.json`。

只想先試小量：`node scripts/crawl-vocab.mjs 200`（只跑前 200 字）。
本專案已附約 280 字的起始庫，裝好即可用。

## 關於版權

本專案刻意**不爬取有版權的官方考題或市售題庫**——那會有法律風險。
改採兩個合法來源：

1. **單字 / 例句**：屬事實性字典資料，來自免費開放的字典 API。
2. **練習題**：由 Claude **即時生成**符合多益題型的擬真題目，不重製任何受版權保護的內容，
   且可無限量產生、自由調整難度。

## 自訂單字

- **精選字（高品質）**：編輯 `data/vocab.json`（陣列，每筆含
  `word / pos / definition / zh / example / category`）。這些字會被爬蟲視為權威、優先保留。
- **大量字**：把想要的字（一行一個）加進 `data/wordlist.txt`，再跑 `npm run crawl` 自動補齊。
- 校對自動翻譯：直接改 `data/vocab.enriched.json` 即可。

## 模型設定

預設使用 `claude-opus-4-8`。若想省成本，在 `.env.local` 設定 `ANTHROPIC_MODEL=claude-haiku-4-5`。
