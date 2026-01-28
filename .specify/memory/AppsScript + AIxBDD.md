# AppsScript + AI x BDD 本地開發創新方案

## 核心創新

透過 **GAS Sandbox 測試環境**，實現 Google Apps Script 的**本地 AI x BDD 開發**。

這是一個突破性的開發方式：讓原本「只能在雲端測試」的 GAS 開發，變成可以用專業的 TDD/BDD 方式在本地進行 AI 輔助開發。

---

## 傳統 GAS 開發的痛點

```
傳統流程：
寫程式 → 部署到 GAS → 手動測試 → 發現問題 → 修改 → 再部署...
         （每次都要上雲端才能測試，無法自動化）
```

**問題：**
- 無法本地測試，每次修改都要部署
- 沒有自動化測試保護，容易引入 bug
- AI 輔助開發時，無法驗證 AI 生成的程式碼是否正確
- 開發回饋循環慢，效率低落

---

## AI x BDD 創新流程

```
創新流程：
寫 Feature → 本地 BDD 測試 → AI 輔助開發 → 全部通過 → 才部署到 GAS
                  ↑
            Node.js + GAS Sandbox
            模擬 GAS 後端行為
```

### 四階段 BDD 循環

```
┌─────────────────────────────────────────────────────────────────┐
│  01-Binding    02-Red       03-Green     04-Refactor           │
│  (綁定)        (紅燈)        (綠燈)        (重構)                 │
│     │            │            │            │                    │
│     ▼            ▼            ▼            ▼                    │
│  .feature  →  Skeleton  →  Test Fail →  Test Pass →  Clean Code │
│  (需求)       (骨架)        (失敗)        (通過)        (重構)    │
└─────────────────────────────────────────────────────────────────┘
```

每個階段都有對應的 AI Prompt，引導 AI 按照正確的 BDD 流程進行開發。

---

## 沙盒技術架構

### 三層架構

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cucumber.js 測試層                          │
│  features/*.feature + step_definitions/*.steps.js               │
├─────────────────────────────────────────────────────────────────┤
│                      GAS Sandbox 層                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ gas-loader.js│→ │ gas-mock.js  │→ │ fake-sheet.js│          │
│  │ VM Context   │  │ Mock APIs    │  │ 2D Array     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                      業務邏輯層 (src/)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   main.js    │  │   punch.js   │  │ utils/*.js   │          │
│  │   doGet()    │  │   punch()    │  │ 工具函式      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 核心元件

#### 1. gas-loader.js - VM 沙盒載入器

```javascript
// 載入 GAS 程式碼到 VM 沙盒執行
export function loadGasCodeForTesting(options) {
  const { sheets, locale } = options;

  // 建立 Mock 環境
  const mockSpreadsheet = createMockSpreadsheet({ locale });
  const mockSpreadsheetApp = createMockSpreadsheetApp(mockSpreadsheet);

  // 初始化工作表
  for (const [name, headers] of Object.entries(sheets)) {
    mockSpreadsheet._getOrCreateSheet(name, headers);
  }

  // 讀取 src/*.js 並在沙盒中執行
  const gasCode = loadAllJsFromSrc();
  const context = vm.createContext(sandbox);
  vm.runInContext(gasCode, context);

  return context;
}
```

#### 2. gas-mock.js - GAS API 模擬層

模擬 Google Apps Script 的完整 API：

| Mock 物件 | 模擬目標 | 核心功能 |
|-----------|----------|----------|
| `SpreadsheetApp` | 試算表應用 | getActiveSpreadsheet() |
| `Sheet (FakeSheet2DArray)` | 工作表 | appendRow, getRange, getValues |
| `Range (FakeRange)` | 儲存格範圍 | getValue, setValue, getDisplayValues |
| `HtmlService` | HTML 輸出 | createHtmlOutputFromFile, 模板語法 |
| `Utilities` | 工具函式 | getUuid, formatDate |
| `Session` | 使用者資訊 | getActiveUser |
| `google.script.run` | 前端呼叫後端 | 序列化檢查 |

#### 3. fake-sheet.js - 純 JavaScript 試算表模擬

```javascript
// FakeSheet2DArray - 用純 JavaScript 二維陣列模擬 GAS Sheet
class FakeSheet2DArray {
  constructor(name, options) {
    this._name = name;
    this._data = [];  // 二維陣列
    this._locale = options.locale || 'zh-TW';
  }

  // 完整模擬 GAS Sheet API
  appendRow(values) { ... }
  getRange(row, col, numRows, numCols) { ... }
  getLastRow() { ... }
  getLastColumn() { ... }
  clear() { ... }
}

// FakeRange - 模擬 GAS Range
class FakeRange {
  constructor(sheet, row, col, numRows, numCols) { ... }

  getValue() { ... }
  setValue(value) { ... }
  getValues() { ... }           // 返回原始值（Date 物件）
  getDisplayValues() { ... }    // 返回格式化字串
  setValues(values) { ... }
}
```

### 關鍵行為模擬

#### Date 自動轉換（寫入時）

```javascript
// 寫入日期字串時，自動轉換為 Date 物件
sheet.appendRow(['IN', '2026/1/29上午9:00:00', createdAt]);

// 內部儲存為 Date 物件
// _data[row] = ['IN', Date(2026-01-29T01:00:00), Date(...)]
```

#### getValues vs getDisplayValues（讀取時）

```javascript
// getValues() - 返回原始值（Date 物件）
const values = range.getValues();
// [[Date, Date, ...], [...]]

// getDisplayValues() - 返回格式化字串
const display = range.getDisplayValues();
// [['2026/1/29上午9:00:00', ...], [...]]
```

#### 1-based 索引（與 GAS 一致）

```javascript
// GAS 使用 1-based 索引
sheet.getRange(1, 1);  // 第一行第一列
sheet.getRange(2, 1, 3, 4);  // 從 row=2, col=1 取 3x4 範圍
```

---

## 測試執行機制

### 自動初始化（hooks.js）

```javascript
// features/support/hooks.js
Before(function() {
  const ctx = loadGasCodeForTesting({
    sheets: {
      '打卡記錄': ['類型', '時間', 'createdAt']
    }
  });

  // 每個 Scenario 前清空工作表
  const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('打卡記錄');
  sheet.clear();

  this.ctx = ctx;
});
```

### Step Definition 使用方式

```javascript
// features/step_definitions/打卡紀錄.steps.js
import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

// 不需要 Before hook，this.ctx 已由 hooks.js 初始化

When(/^我打卡"(.+)"$/, function(type) {
  this.result = this.ctx.punch(type);
});

Then('打卡結果應該成功', function() {
  assert.ok(this.result.success);
});
```

---

## 專案架構規範

### 目錄結構

```
workshop_clock_in_v2/
├── features/                       # BDD 測試
│   ├── 打卡流程.feature            # Gherkin 需求規格
│   ├── 打卡紀錄.feature
│   ├── step_definitions/           # Step Definition
│   │   └── 打卡紀錄.steps.js
│   └── support/
│       └── hooks.js                # 全局測試初始化
│
├── src/                            # GAS 業務邏輯（部署到雲端）
│   ├── main.js                     # Web App 入口 (doGet)
│   ├── punch.js                    # punch() 函數
│   ├── getTodayRecords.js          # getTodayRecords() 函數
│   └── utils/
│       └── date-utils.js           # 共用工具函式
│
├── lib/                            # 本地測試基礎設施（不部署）
│   ├── gas-loader.js               # VM 沙盒載入器
│   ├── gas-mock.js                 # GAS API Mock
│   ├── fake-sheet.js               # FakeSheet2DArray + FakeRange
│   └── fake-sheet.test.js          # 43 個單元測試
│
├── prompts/                        # AI Prompt 文件
│   ├── 01-Gherkin-to-Step-Definition.md
│   ├── 02-紅燈.md
│   ├── 03-綠燈.md
│   └── 04-重構.md
│
└── package.json
```

### 模組規範

**一個 Feature = 一個模組**

```javascript
// src/punch.js - 檔名 = 函數名
function punch(type) {
  // 唯一的公開函數
}

function _validateType(type) {
  // 私有輔助函數以 _ 開頭
}
```

### 工具函式重用

`src/utils/date-utils.js` 提供：

```javascript
parseChineseDate(dateInput)  // 解析中文日期
formatDateZhTW(date)         // 格式化為中文日期
isToday(dateInput)           // 判斷是否為今天
```

---

## AI x BDD 核心原則

### Fake Fidelity = AI Least Knowledge

```
┌─────────────────────────────────────────────────────────────────┐
│                    核心設計原則                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   如果 Fake 100% 忠實於 GAS API                                  │
│        ↓                                                        │
│   那麼 AI 只需要知道標準 GAS API                                  │
│        ↓                                                        │
│   不需要知道任何 Mock/Fake 實作細節                               │
│        ↓                                                        │
│   AI 寫出的程式碼可直接部署到真實 GAS                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**AI 需要知道的：**
- 標準 GAS API（SpreadsheetApp, Sheet, Range...）
- `this.ctx` 測試上下文
- 業務函數簽名（punch, getTodayRecords...）

**AI 不需要知道的：**
- FakeSheet2DArray 如何實作
- gas-mock.js 的內部結構
- 任何測試基礎設施細節

### NFR-1: Fake 真實性 → 可移植性

```
如果 Fake 正確：

本地測試通過 ✅  →  clasp push 部署  →  雲端執行成功 ✅
     │                                        │
     │         Fake 與真實 GAS 行為一致        │
     │                                        │
     └────── 程式碼可無縫移植到雲端 ───────────┘
```

**驗收標準：**
- FakeSheet2DArray 有 43 個單元測試驗證行為正確性
- 所有 API 方法與真實 GAS 簽名一致
- 邊界行為（Date 序列化、1-based 索引）都正確模擬

### NFR-2: Mock 完整性 → AI 防護

**受保護的檔案（AI 絕對不能修改）：**

| 路徑 | 類型 | 原因 |
|------|------|------|
| `lib/*` | 基礎設施 | 修改會破壞 Fake 真實性 |
| `features/*.feature` | 需求契約 | Feature 是規格，不是實作 |
| `features/support/hooks.js` | 測試初始化 | 全局配置不應被修改 |

### NFR-3: 知識效率 → AI 上下文管理

**分層知識管理：**

```
系統層級（自動注入）
├── 不改 lib/*
├── 不改 *.feature
└── 不改 hooks.js

Prompt 層級（階段性）
├── 綁定：只產生骨架
├── 紅燈：不實作業務邏輯
├── 綠燈：最少程式碼
└── 重構：改善品質

參考文件（按需查閱）
├── GAS API 文件
└── src/utils/ 工具說明
```

---

## AI Prompt 系統

| Prompt | 階段 | 用途 |
|--------|------|------|
| `01-Gherkin-to-Step-Definition.md` | 綁定 | Feature → Step Definition 骨架 |
| `02-紅燈.md` | 紅燈 | 補完測試邏輯，確認測試能偵測問題 |
| `03-綠燈.md` | 綠燈 | 實作最少程式碼讓測試通過 |
| `04-重構.md` | 重構 | 改善程式碼品質 |

### 使用方式

```
do: @prompts/03-綠燈.md
for: @features/打卡流程.feature
```

---

## 測試執行

```bash
# 執行所有測試
npm test

# 執行特定 Feature
npm test -- features/打卡流程.feature

# 執行 FakeSheet2DArray 單元測試
npx vitest run lib/fake-sheet.test.js
```

---

## 整體價值

### 1. 本地可測試

```bash
npm test  # 幾秒內得到測試結果（25 scenarios, 131 steps）
```

### 2. AI 輔助開發可驗證

```
AI 生成程式碼 → npm test → 立即知道對不對
```

### 3. 快速回饋循環

```
傳統：修改 → 部署(30秒) → 手動測試(1分鐘) → 發現問題...
創新：修改 → npm test(0.02秒) → 看結果 → 修改...
```

### 4. 需求即測試

Feature 檔案就是需求規格，同時也是可執行的測試。

### 5. 部署前品質保證

```
本地測試全部通過 → 有信心部署到 GAS → 減少生產環境 bug
```

---

**文件版本**：2.0
**最後更新**：2026-01-29
**變更記錄**：
- v2.0: 重構沙盒架構（FakeSheet2DArray + FakeRange），新增 AI Least Knowledge 原則
- v1.1: 新增三個非功能性需求 (NFR-1, NFR-2, NFR-3)
