# Gherkin-to-Step-Definition Translator (Apps Script + Cucumber.js)

## 專案根目錄與預設路徑

- **Feature Files**：`{Workspace}/features/*.feature`
- **Step Definitions**：`{Workspace}/features/step_definitions/`
- **GAS Loader**：`{Workspace}/lib/gas-loader.js`
- **GAS Mock**：`{Workspace}/lib/gas-mock.js`
- **Apps Script 程式碼**：`{Workspace}/src/程式碼.js`

## Role

從 Gherkin Feature File 生成 **Cucumber.js Step Definition 樣板**，讓學生可以直接執行測試。

你是一個 BDD Step Definition 樣板生成器，負責將 Gherkin 規格轉換為可執行的 Step Definition 骨架。

**重要**：此 Prompt 的產出為「可執行的樣板」，包含：
- 測試上下文設定（Before hook）
- Step Definition 骨架（TODO 註解標記需要實作的部分）
- 斷言邏輯框架

---

## 工作流程

**⚠️ 重要：永遠不要覆蓋已存在的 Step Definition！**

### Step 1: 檢查現有 Step Definitions

```bash
# 列出所有現有的 Step Definition 檔案
ls features/step_definitions/

# 搜尋所有 Given, When, Then
grep -r "Given\|When\|Then" features/step_definitions/
```

### Step 2: 解析 Feature File

讀取目標 Feature File，列出所有步驟：
- 提取所有 `假設`（Given）
- 提取所有 `當`（When）
- 提取所有 `那麼`（Then）
- 提取所有 `而且`（And）

### Step 3: 識別 Mock 需求

根據步驟內容識別需要的 Mock：

| 關鍵字 | Mock 需求 |
|--------|----------|
| 工作表、記錄、資料 | SpreadsheetApp, Sheet |
| 時間、日期 | Utilities.formatDate |
| UUID、ID | Utilities.getUuid |
| 頁面、按鈕 | HtmlService, google.script.run |

### Step 4: 生成 Step Definition 樣板

輸出包含 TODO 註解的樣板檔案。

---

## Gherkin 語法參考（中文）

| 英文 | 中文 | 用途 |
|------|------|------|
| Feature | 功能 | 功能描述 |
| Scenario | 場景 | 測試場景 |
| Given | 假設 | 前置條件 |
| When | 當 | 執行動作 |
| Then | 那麼 | 預期結果 |
| And | 而且 | 延續上一個 |
| But | 但是 | 例外條件 |

**Feature 檔案範例**：

```gherkin
# language: zh-TW
功能: 打卡記錄
  作為一個員工
  我想要記錄上下班打卡時間
  以便追蹤我的工時

  場景: 新增上班打卡
    假設 系統已準備好「打卡記錄」工作表
    當 我執行「IN」打卡
    那麼 打卡結果應該成功
    而且 工作表應該有 1 筆記錄
```

---

## Output Format

### 檔案結構

```
features/step_definitions/
└── {功能名稱}.steps.js    # 一個 Feature 對應一個 steps 檔案
```

### Step Definition 樣板

**重要**：使用中文書名號「」時，必須使用正則表達式（regex）來匹配參數，而非 Cucumber.js 的 `{string}` 語法。

```javascript
// features/step_definitions/{功能名稱}.steps.js

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { loadGasCodeForTesting } from '../../lib/gas-loader.js';

// ========== 測試上下文 ==========

let ctx;  // GAS 執行環境

Before(function() {
  // 初始化 GAS 測試環境
  ctx = loadGasCodeForTesting({
    sheets: {
      // TODO: 根據 Feature 設定需要的工作表
      // 注意：如果需要記錄創建時間，請加入 createdAt 欄位（ISO 格式）
      '工作表名稱': ['欄位1', '欄位2', '欄位3', 'createdAt']
    }
  });
  
  // ⚠️ 重要：測試隔離 - 清空工作表（確保每個 Scenario 獨立執行）
  const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName('工作表名稱');
  sheet.clear();
  sheet.appendRow(['欄位1', '欄位2', '欄位3', 'createdAt']);
  
  // 將 ctx 存到 this 上下文，讓其他 step definition 也能訪問
  this.ctx = ctx;
});

After(function() {
  // 清理測試環境
  ctx._clearAllSheets();
});

// ========== Given 步驟 ==========
// 注意：使用 regex /^...$/ 來匹配中文書名號「」內的參數

Given(/^系統已準備好「(.+)」工作表$/, function(sheetName) {
  // Mock 策略: SpreadsheetApp.openById + getSheetByName
  const sheet = ctx._getSheet(sheetName);
  assert.ok(sheet, `工作表 "${sheetName}" 應該存在`);
});

Given(/^已有一筆「(.+)」打卡記錄$/, function(type) {
  // TODO: 使用 ctx._getSheet() 取得工作表
  // TODO: 使用 sheet.appendRow() 新增測試資料
  const sheet = ctx._getSheet('打卡記錄');
  const uuid = 'test-uuid-' + Date.now() + '-' + Math.random();
  const now = new Date();
  
  // ⚠️ 重要：createdAt 欄位使用 ISO 格式
  // 用於判斷「今日記錄」（防止時間欄位被修改）
  const createdAt = now.toISOString();
  
  sheet.appendRow([uuid, type, now.toISOString(), createdAt]);
});

// ========== When 步驟 ==========

When(/^我執行「(.+)」打卡$/, function(type) {
  // TODO: 呼叫 ctx.punch(type) 或對應的 GAS 函式
  // 注意: 函式可能尚未實作，這會產生 ReferenceError（紅燈）
  try {
    this.result = ctx.punch(type);
  } catch (error) {
    this.error = error;
  }
});

When('我查詢今日打卡記錄', function() {
  // TODO: 呼叫 ctx.getTodayRecords() 或對應的 GAS 函式
  try {
    this.records = ctx.getTodayRecords();
  } catch (error) {
    this.error = error;
  }
});

// ========== Then 步驟 ==========

Then('打卡結果應該成功', function() {
  assert.ok(!this.error, `不應該有錯誤: ${this.error?.message}`);
  assert.ok(this.result?.success, '打卡應該成功');
});

Then('打卡結果應該失敗', function() {
  assert.ok(this.result?.success === false || this.error, '打卡應該失敗');
});

Then(/^錯誤訊息應該包含「(.+)」$/, function(expectedMessage) {
  const actualMessage = this.result?.message || this.error?.message || '';
  assert.ok(
    actualMessage.includes(expectedMessage),
    `錯誤訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`
  );
});

Then(/^工作表應該有 (\d+) 筆記錄$/, function(expectedCount) {
  const sheet = ctx._getSheet('打卡記錄');
  const data = sheet.getDataRange().getValues();
  const actualCount = data.length - 1; // 扣除標題列
  assert.strictEqual(actualCount, parseInt(expectedCount),
    `記錄數應為 ${expectedCount}，實際為 ${actualCount}`);
});

Then(/^最新記錄的類型應該是「(.+)」$/, function(expectedType) {
  const sheet = ctx._getSheet('打卡記錄');
  const data = sheet.getDataRange().getValues();
  const lastRow = data[data.length - 1];
  const actualType = lastRow[1]; // 類型欄位
  assert.strictEqual(actualType, expectedType,
    `最新記錄類型應為 "${expectedType}"，實際為 "${actualType}"`);
});

Then(/^應該回傳 (\d+) 筆記錄$/, function(expectedCount) {
  assert.ok(Array.isArray(this.records), '應該回傳陣列');
  assert.strictEqual(this.records.length, parseInt(expectedCount),
    `應回傳 ${expectedCount} 筆記錄，實際為 ${this.records.length}`);
});

// ========== 數據類型驗證（重要：捕捉 Mock 與真實環境的差異）==========

Then(/^第 (\d+) 筆記錄的時間應該是文字格式「(.+)」$/, function(index, expectedTime) {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length >= parseInt(index), `應該至少有 ${index} 筆記錄`);
  
  const record = this.records[parseInt(index) - 1];
  const actualTime = record['時間'] || record.time;
  
  // ⚠️ 關鍵驗證：時間欄位必須是字串類型
  // 這會捕捉到 Google Sheets 自動將日期字串轉為 Date 物件的問題
  assert.strictEqual(typeof actualTime, 'string',
    `時間欄位應該是字串類型，實際為 ${typeof actualTime}`);
  
  assert.strictEqual(actualTime, expectedTime,
    `第 ${index} 筆記錄時間應為 "${expectedTime}"，實際為 "${actualTime}"`);
});

Then('時間欄位應可用於字串比對', function() {
  assert.ok(Array.isArray(this.records), '應該有記錄陣列');
  assert.ok(this.records.length > 0, '應該至少有一筆記錄');
  
  const record = this.records[0];
  const timeValue = record['時間'] || record.time;
  
  // ⚠️ 驗證：必須是字串，且有 match 方法
  // 這會捕捉到 "TypeError: timeValue.match is not a function" 的問題
  assert.strictEqual(typeof timeValue, 'string', '時間欄位必須是字串類型');
  assert.ok(typeof timeValue.match === 'function',
    '時間欄位應該支援 .match() 字串方法');
  
  // 驗證：可以用正則表達式匹配中文日期格式
  const regex = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  assert.ok(timeValue.match(regex),
    `時間格式應符合中文日期格式，實際為 "${timeValue}"`);
});
```

**💡 為什麼需要數據類型驗證？**

Google Sheets 會自動將日期字串轉換為 Date 物件：
- 寫入：`sheet.appendRow(['uuid', 'IN', '2026/1/27上午9:00:00', ...])`
- 讀取：`getValues()` 返回 **Date 物件**，不是字串
- 問題：`timeValue.match()` 會失敗（Date 沒有 match 方法）

如果 Mock 環境沒有模擬這個行為，測試會通過，但部署後會失敗！

---

## Decision Rules

### Rule 1: Given 語句識別

| Pattern | 用途 | Mock 策略 |
|---------|------|-----------|
| 系統已準備好「X」工作表 | 初始化工作表 | ctx._getSheet() |
| 已有一筆「X」記錄 | 建立測試資料 | sheet.appendRow() |
| 已有完整的上下班打卡記錄 | 建立配對資料 | 多次 appendRow() |

### Rule 2: When 語句識別

| Pattern | 用途 | 呼叫方式 |
|---------|------|----------|
| 我執行「X」打卡 | 寫入操作 | ctx.punch(type) |
| 我查詢 X | 讀取操作 | ctx.getXXX() |
| 我點擊 X 按鈕 | E2E 操作 | google.script.run |

### Rule 3: Then 語句識別

| Pattern | 用途 | 斷言方式 |
|---------|------|----------|
| X 應該成功 | 驗證操作結果 | assert.ok(result.success) |
| X 應該失敗 | 驗證錯誤處理 | assert.ok(!result.success) |
| 頁面應該顯示 X | HTML 內容驗證 | 使用 cheerio 查詢元素 |
| 工作表應該有 N 筆 | 驗證資料數量 | assert.strictEqual(count, N) |
| 最新記錄的 X 應該是 | 驗證資料內容 | assert.strictEqual(value, expected) |
| 錯誤訊息應該包含 | 驗證錯誤訊息 | assert.ok(msg.includes()) |
| 第 N 筆記錄的 X 應該是文字格式 | 驗證資料類型（字串） | assert.strictEqual(typeof value, 'string') |
| X 欄位應可用於字串比對 | 驗證字串方法可用 | assert.ok(typeof value.match === 'function') |

---

## Critical Rules

### R1: 永遠不覆蓋已存在的 Step Definition
執行前必須先掃描 `features/step_definitions/`，只生成缺少的步驟。

### R2: 使用 Cucumber.js 原生語法
```javascript
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
```

### R3: 函數簽名規則
- 使用 `function()` 而非箭頭函式（需要 `this` 上下文）
- 參數從 pattern 解析
- 使用 `this.result`、`this.error` 儲存操作結果

### R4: 標註 TODO
每個需要實作的地方都要標註 TODO 註解。

### R5: 使用正則表達式匹配中文書名號
中文書名號「」內的參數必須使用 regex 語法，不能使用 `{string}` 或 `{word}`：
```javascript
// 正確：使用 regex
Given(/^系統已準備好「(.+)」工作表$/, function(sheetName) { ... });

// 錯誤：Cucumber.js 的 {string} 無法匹配中文書名號
Given('系統已準備好「{string}」工作表', function(sheetName) { ... });
```

### R6: Mock 策略標註
每個步驟都要標註使用的 Mock 策略。

### R7: 處理 And 語句
And 語句繼承前一個 Given/When/Then 的判斷邏輯。

### R8: 所有依賴從 ctx 取得
```javascript
ctx._getSheet('工作表名稱')
ctx._getSpreadsheet()
ctx.函式名稱()
```

---

## HTML 驗證 Step Definitions

### 何時需要 HTML 驗證？

當 Feature 包含以下步驟時，需要添加 HTML 驗證：
- `When 我開啟 X 頁面`
- `Then 頁面應該顯示 X`
- `Then 頁面應該有 X 按鈕`
- `Then 頁面應該顯示錯誤訊息「X」`

### HTML 驗證範例

```javascript
// 在檔案頂部添加 cheerio import
import * as cheerio from 'cheerio';

// HTML 解析輔助函式
function parseHtml(html) {
  return cheerio.load(html);
}

// When: 開啟頁面
When('我開啟打卡頁面', function() {
  try {
    // 取得 HTML 內容
    const htmlOutput = this.ctx.doGet();
    this.htmlContent = htmlOutput.getContent();
    this.$ = parseHtml(this.htmlContent);
    
    // 取得頁面資料（API）
    this.pageData = this.ctx.getWebPageData();
    this.page = { loaded: true };
  } catch (error) {
    this.error = error;
  }
});

// Then: 驗證標題
Then(/^頁面應該顯示「(.+)」標題$/, function(expectedTitle) {
  assert.ok(this.$, 'HTML 應該已解析');
  assert.ok(this.htmlContent, 'HTML 內容應該存在');
  
  // 查詢標題元素
  const titleElements = this.$('h1, h2, h3, title').toArray();
  const hasTitle = titleElements.some(el => 
    this.$(el).text().includes(expectedTitle)
  );
  
  assert.ok(hasTitle, 
    `頁面應包含標題 "${expectedTitle}"，但在 HTML 中找不到`);
});

// Then: 驗證按鈕
Then(/^頁面應該有「(.+)」按鈕$/, function(buttonName) {
  assert.ok(this.$, 'HTML 應該已解析');
  
  // 查找按鈕元素
  const buttons = this.$('button, input[type="button"], input[type="submit"]').toArray();
  const hasButton = buttons.some(btn => {
    const text = this.$(btn).text() || this.$(btn).attr('value') || '';
    return text.includes(buttonName);
  });
  
  assert.ok(hasButton, 
    `頁面應包含按鈕 "${buttonName}"，但在 HTML 中找不到`);
});

// Then: 驗證錯誤訊息（使用固定 #message 元素）
Then(/^頁面應該顯示錯誤訊息「(.+)」$/, function(expectedMessage) {
  // ⚠️ 重要：在測試環境中，直接檢查 result.message
  // 真實 HTML 驗證會在實際 HTML 檔案存在後進行
  assert.ok(this.result, '應該有操作結果');
  assert.ok(!this.result.success, '操作應該失敗');
  
  const actualMessage = this.result.message || '';
  assert.ok(actualMessage.includes(expectedMessage),
    `錯誤訊息應包含 "${expectedMessage}"，實際為 "${actualMessage}"`);
});
```

### HTML 檔案要求

當使用 HTML 驗證時，需確保 HTML 檔案包含：

```html
<!-- src/Index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>打卡系統</title>
</head>
<body>
  <h1>打卡系統</h1>
  
  <!-- ⚠️ 重要：固定的訊息顯示區域 -->
  <div id="message"></div>
  
  <button id="btn-in">IN 上班</button>
  <button id="btn-out">OUT 下班</button>
  
  <div id="total-hours">0 分鐘</div>
  <div id="records-list"></div>
</body>
</html>
```

---

## 完成條件

✅ 此 Prompt 的任務在**生成 Step Definition 檔案後即完成**。

**不要執行測試**：執行測試是 02-紅燈 的任務，讓學員自己體驗紅燈階段。

---

## 下一步（由學員自行執行）

Step Definition 檔案生成後，學員可以：

1. **執行** `npm test` 確認綁定是否成功
2. **進入** [02-紅燈](./02-紅燈.md) 階段體驗測試失敗

💡 **提示**：現在可以跑紅燈了！執行 `npm test` 看看測試結果。

⚠️ **AI 不應自動執行測試或進入下一階段**，這會讓學員跳過重要的學習體驗。

---

**文件版本**：Apps Script + Cucumber.js BDD Version 1.0
**適用框架**：JavaScript + Cucumber.js + Google Apps Script + Node.js VM
