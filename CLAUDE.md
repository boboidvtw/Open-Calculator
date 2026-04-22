# Open-Calculator — AI 開發指引

> 這份文件給 AI / LLM 閱讀，說明本專案的版面設計邏輯、元件慣例、JS 架構。
> 每次修改前請先讀完，可避免 90% 的來回調整。

---

## 1. 專案概覽

| 項目 | 說明 |
|------|------|
| 檔案結構 | **單一 HTML 檔**（`index.html`），CSS + JS 全部內嵌 |
| 部署位置 | GitHub Pages：`https://boboidvtw.github.io/` |
| 主要功能 | 計算機、單位換算、匯率、公式庫（內建 + 自建）、儲存記錄 |
| 支援語言 | 繁中 / 英文 / 簡中 / 日文（`i18n` 物件切換） |
| 主題 | 深色（預設）/ 淺色，`body.light` class 切換 |
| 廣告 | Google AdSense（`ca-pub-3360648495679709`），`<head>` 第一行 |

---

## 2. 版面架構

```
<body>
  <div class="container">            ← 最外層，max-width: 1200px
    <!-- Header -->
    <div class="header">             ← 標題 + 語言選擇器 + 主題切換 + ? 說明按鈕
    </div>

    <!-- 主內容雙欄 Grid -->
    <div class="main-grid"           ← display: grid; grid-template-columns: 1fr 1fr
         style="...">
      <!-- 左欄：主計算區 -->
      <div>
        <div class="panel">          ← 計算機主體（含 5 個 tab）
        </div>
      </div>

      <!-- 右欄：Sidebar（手機隱藏）-->
      <div class="main-sidebar">     ← 桌機顯示，手機 display:none
        <div class="panel">常用按鈕</div>
        <div class="panel">支援函數</div>
        <div class="panel">即時匯率</div>
      </div>
    </div>
  </div>

  <!-- Modal：說明（? 按鈕觸發）-->
  <div id="helpModal">...</div>

  <!-- Modal：公式計算（點公式卡片觸發）-->
  <div id="formulaModal">...</div>
</body>
```

### 響應式規則

```css
/* 手機（≤ 768px）*/
@media (max-width: 768px) {
    .main-grid  { grid-template-columns: 1fr !important; }
    .main-sidebar { display: none !important; }
}
```

**原則**：手機只顯示左欄主計算區，右欄 sidebar 完全隱藏。不要在手機版增加 sidebar 內容。

---

## 3. CSS 設計系統

### CSS 變數（色彩 Token）

```css
:root {
    --primary:             #06b6d4;   /* 青色，主視覺色 */
    --primary-dark:        #0891b2;   /* hover 狀態 */
    --bg-dark:             #0f172a;   /* 最深背景 */
    --bg-dark-secondary:   #1e293b;   /* Panel 背景 */
    --bg-dark-tertiary:    #334155;   /* Input / 按鈕背景 */
    --text-dark:           #ffffff;   /* 主要文字 */
    --text-dark-secondary: #cbd5e1;   /* 次要文字 */
    --border-dark:         #475569;   /* 邊框 */
}

/* 淺色主題：body.light 覆蓋同名變數 */
body.light {
    --bg-dark:             #f8fafc;
    --bg-dark-secondary:   #ffffff;
    --bg-dark-tertiary:    #f1f5f9;
    --text-dark:           #0f172a;
    --text-dark-secondary: #475569;
    --border-dark:         #cbd5e1;
    /* --primary 不變，保持青色 */
}
```

**規則**：所有顏色必須用變數，不得 hardcode hex。淺色主題只需覆蓋背景與文字變數，強調色保持不變。

### 常用 CSS Class

| Class | 用途 |
|-------|------|
| `.panel` | 所有卡片容器，圓角 + 深色背景 |
| `.tab` | 主功能 tab 按鈕（計算/單位/匯率/公式/儲存） |
| `.tab.active` | 選中的 tab，底線 + primary 色 |
| `.tab-content` | Tab 對應內容，`hidden` class 控制顯示 |
| `.btn` | 計算機按鈕基底 |
| `.btn-number` | 數字按鈕 |
| `.btn-operator` | 運算符按鈕 |
| `.btn-function` | 函數按鈕（sin、log 等） |
| `.btn-equals` | 等號按鈕，primary 色 |
| `.empty-state` | 無資料時的提示文字 |
| `.formula-item` | 公式卡片（內建） |
| `.formula-item-custom` | 自建公式卡片（含刪除按鈕） |
| `.fcbtn` | 公式分類 tab 按鈕 |
| `.fcbtn-custom` | 自建分類按鈕，橘色 `#fb923c` |
| `.ucbtn` | 單位分類按鈕 |

---

## 4. 主要 Tab 系統

### 5 個主 Tab

```
計算（calcPanel）→ 主計算機，含按鈕分類 tab
單位（unitPanel）→ 單位換算，8 個分類
匯率（currencyPanel）→ 貨幣換算，雙向同步
公式（formulaPanel）→ 內建 + 自建公式
儲存（savedPanel）→ 計算歷史
```

### Tab 切換邏輯

```javascript
// 全部 .tab-content 加 hidden，移除目標的 hidden
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabContents.forEach(c => c.classList.add('hidden'));
        document.getElementById(tabName + 'Panel').classList.remove('hidden');
        // 特定 tab 需要觸發 render：
        if (tabName === 'formula')   { renderFormulas(); renderCustomFormulas(); }
        if (tabName === 'saved')     { renderSaved(); }
        if (tabName === 'currency')  { renderCurrencyGrid(); syncFromTWD(); }
    });
});
```

---

## 5. 公式系統

### 內建公式資料結構

```javascript
// builtInFormulas 陣列
{
    id: 39,
    name: '複利終值',
    expr: 'P*(1+r/n)^(n*t)',
    group: '金融',          // 分類：數學/工程/科學/物理/金融
    tags: ['財務', '金融'],
    vars: ['P', 'r', 'n', 't'],
    varDescMap: {           // 變數說明（顯示在 Modal placeholder）
        P: '本金',
        r: '年利率（%）',
        n: '每年複利次數',
        t: '年數'
    }
}
```

### 自動利率換算（varTransform）

```javascript
// 某些公式的變數輸入前需要自動換算（如年利率% → 月利率小數）
const varTransform = {
    39: { r: v => v / 100 },        // 複利終值：年利率% → 小數
    40: { r: v => v / 100 / 12 },   // 月繳貸款：年利率% → 月利率
    41: { r: v => v / 100 },
    // ...
};
// 使用者輸入 5（%），實際計算用 0.05 或 0.05/12
```

### 公式分類 Tab 邏輯

| Tab | 內建公式顯示 | 自建公式顯示 |
|-----|------------|------------|
| 全部 | 全部 | 全部 |
| 數學/工程/科學/物理/金融 | 該分類 | 該分類（空則顯示「尚無自建公式」） |
| 自建 | 隱藏 | 全部 + 新增表單 |

**重要**：每個分類 tab 底部永遠顯示「✏️ 自建公式」區塊（`#customMatchSection`），即使空白也要顯示。

### 自建公式儲存

```javascript
// localStorage key: 'customFormulas'
// 結構：[{ id, name, expr, group, vars[] }, ...]
```

---

## 6. 匯率系統

### 雙向同步防迴圈

```javascript
let _syncingCurrency = false;

function syncFromForeign() {
    if (_syncingCurrency) return;
    _syncingCurrency = true;
    // 計算並更新 TWD 欄位
    _syncingCurrency = false;
}

function syncFromTWD() {
    if (_syncingCurrency) return;
    _syncingCurrency = true;
    // 計算並更新外幣欄位
    _syncingCurrency = false;
}
```

**規則**：任何新的雙向同步功能都必須用相同的 flag 防迴圈模式。

### 匯率資料來源

```javascript
// 從 exchangeRates[currency] 取得對 TWD 的匯率
// API: https://api.exchangerate-api.com/v4/latest/TWD
// 儲存: localStorage 'exchangeRates' + 'exchangeRatesTime'（24h 快取）
```

---

## 7. 單位換算系統

### 資料結構

```javascript
UNIT_DATA = {
    '長度': {
        units: { '公尺 (m)': 1, '公里 (km)': 1000, ... },
        // special: true → 使用 toBase/fromBase 函數（溫度）
    },
    '溫度': {
        units: { '攝氏 (°C)': ..., },
        special: true,
        toBase: { '攝氏 (°C)': v => v, '華氏 (°F)': v => (v-32)*5/9, ... },
        fromBase: { '攝氏 (°C)': v => v, '華氏 (°F)': v => v*9/5+32, ... }
    }
}
```

### 雙向同步

與匯率相同，使用 `_syncingUnit` flag 防迴圈。

### Mobile 數字鍵盤

所有數值 input 必須加 `inputmode="decimal"`，讓手機彈出數字鍵盤：

```html
<input type="number" inputmode="decimal" ...>
```

---

## 8. 主題切換

```javascript
// localStorage key: 'theme' ('dark' | 'light')
function updateTheme() {
    document.body.classList.toggle('light', currentTheme === 'light');
    themeBtn.textContent = currentTheme === 'light' ? '🌙' : '☀️';
}
```

---

## 9. 國際化（i18n）

```javascript
const i18n = {
    'zh-TW': { tab_calc: '計算', tab_unit: '單位', ... },
    'en':    { tab_calc: 'Calc', tab_unit: 'Unit', ... },
    'zh-CN': { ... },
    'ja':    { ... }
};

// HTML 元素加 data-i18n="key"，updateLanguage() 會自動更新
```

---

## 10. 說明 Modal（? 按鈕）

- 按鈕：`.help-btn`（header 右側，青色圓形）
- Modal：`#helpModal`（`display:none` 預設隱藏）
- 內容：手風琴（Accordion）結構，每節 `.help-section` 含 header + body
- 展開/收合：點 header toggle `.help-body` display

---

## 11. 廣告版位規劃（AdSense）

| 位置 | ID | 尺寸 | 顯示 |
|------|-----|------|------|
| Header 下方 | （待建立） | 響應式 | 桌機 + 手機 |
| 右側欄底部 | （待建立） | 300×250 | 桌機 only |

**注意**：廣告不得放在計算機按鈕旁，避免誤點並符合 AdSense 政策。

---

## 12. 開發禁忌

| 禁止 | 原因 |
|------|------|
| 拆分成多個 HTML/CSS/JS 檔 | 單檔是核心設計，便於 GitHub Pages 部署 |
| Hardcode 顏色 hex | 破壞深/淺色主題切換 |
| 在計算機按鈕區放廣告 | AdSense 政策違規 + 使用者體驗差 |
| 雙向同步不加 flag | 會觸發無限迴圈 |
| input 數值不加 `inputmode="decimal"` | 手機無法彈出數字鍵盤 |
| 自建公式分類邏輯改為「全域顯示」 | 會讓不相關分類顯示到無關公式 |

---

## 13. Git / 部署

```bash
# 本地路徑
C:\claudecode\Open-Calculator\

# Remote
https://github.com/boboidvtw/boboidvtw.github.io.git

# 部署：push to main 即自動部署（GitHub Pages）
git add index.html
git commit -m "feat: ..."
git push origin main
```

Commit 格式：`feat:` / `fix:` / `refactor:` / `docs:`
