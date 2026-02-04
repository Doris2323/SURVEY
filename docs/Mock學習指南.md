# Mock 學習指南：模擬 Google Apps Script 行為

本文件說明如何讓測試環境的 Mock 正確模擬真實 Google Apps Script (GAS) 的行為。

---

## 一、Mock API 對照表

### SpreadsheetApp 系列

| 真實 GAS API | Mock 函式 | 說明 |
|-------------|-----------|------|
| `SpreadsheetApp.getActiveSpreadsheet()` | `createMockSpreadsheetApp()` | 取得當前試算表 |
| `SpreadsheetApp.openById(id)` | `createMockSpreadsheetApp()` | 用 ID 開啟試算表 |
| `Spreadsheet.getSheetByName(name)` | `createMockSpreadsheet()` | 取得工作表 |
| `Spreadsheet.insertSheet(name)` | `createMockSpreadsheet()` | 新增工作表 |
| `Sheet.getDataRange()` | `createMockSheet()` | 取得資料範圍 |
| `Sheet.getRange(row, col, numRows, numCols)` | `createMockSheet()` | 取得指定範圍 |
| `Sheet.appendRow(row)` | `createMockSheet()` | 新增一列 |
| `Sheet.getLastRow()` | `createMockSheet()` | 取得最後一列編號 |
| `Range.getValues()` | 回傳含 Date 物件的陣列 | ⚠️ 注意序列化問題 |
| `Range.getDisplayValues()` | 回傳純字串陣列 | ✅ 推薦用於 Web API |

### Utilities 系列

| 真實 GAS API | Mock 函式 | 說明 |
|-------------|-----------|------|
| `Utilities.getUuid()` | `createMockUtilities()` | 產生 UUID |
| `Utilities.formatDate(date, tz, format)` | `createMockUtilities()` | 格式化日期 |
| `Utilities.sleep(ms)` | `createMockUtilities()` | 暫停（Mock 中不實際等待） |

### Session 系列

| 真實 GAS API | Mock 函式 | 說明 |
|-------------|-----------|------|
| `Session.getScriptTimeZone()` | `createMockSession()` | 取得腳本時區 |
| `Session.getActiveUser().getEmail()` | `createMockSession()` | 取得當前使用者 Email |

### HtmlService / ContentService

| 真實 GAS API | Mock 函式 | 說明 |
|-------------|-----------|------|
| `HtmlService.createHtmlOutputFromFile()` | `createMockHtmlService()` | 建立 HTML 輸出 |
| `ContentService.createTextOutput()` | `createMockContentService()` | 建立文字輸出 |

### 前端 API

| 真實 GAS API | Mock 函式 | 說明 |
|-------------|-----------|------|
| `google.script.run` | `createMockGoogleScriptRun()` | 前端呼叫後端函式 |

---

## 二、GAS 行為模擬指南

### 2.1 getValues() vs getDisplayValues()

**真實行為差異**：

```javascript
// 假設 A1 儲存格內容是日期 "2026-01-21 12:00:00"

// getValues() - 回傳原生型別（Date 物件）
sheet.getRange('A1').getValues()
// → [[Date Object]]  // JavaScript Date 物件

// getDisplayValues() - 回傳顯示的字串
sheet.getRange('A1').getDisplayValues()
// → [["2026-01-21 12:00:00"]]  // 字串
```

**Mock 實作**：

```javascript
getValues() {
  return data.map(row => row.map(cell => {
    // 日期時間字串轉為 Date 物件
    if (isDateTimeString(cell)) {
      return new Date(cell.replace(' ', 'T'));
    }
    return cell;
  }));
}

getDisplayValues() {
  return data.map(row => row.map(cell => String(cell)));
}
```

### 2.2 google.script.run 序列化規則

**真實行為**：
- 回傳值必須能被 JSON 序列化
- **Date 物件** → 整個回傳值變成 `null`（無錯誤訊息）
- **NaN** → 整個回傳值變成 `null`（無錯誤訊息）
- **undefined** → 變成 `null`
- **Function** → 整個回傳值變成 `null`

**Mock 實作**：

```javascript
function checkSerializable(value, path = 'root') {
  if (value instanceof Date) {
    return { canSerialize: false, reason: `Date 物件在 ${path}` };
  }
  if (typeof value === 'number' && isNaN(value)) {
    return { canSerialize: false, reason: `NaN 在 ${path}` };
  }
  // 遞迴檢查陣列和物件...
  return { canSerialize: true };
}
```

### 2.3 獨立腳本 vs 綁定腳本

| 方法 | 綁定腳本 | 獨立腳本 |
|------|---------|---------|
| `getActiveSpreadsheet()` | ✅ 回傳當前試算表 | ❌ 回傳 `null` |
| `openById(id)` | ✅ 可用 | ✅ 可用 |

**Mock 策略**：預設使用 `openById()` 模式，確保測試與真實行為一致。

### 2.4 中文日期格式

**真實行為**（台灣地區）：

Google Sheets 顯示日期可能是中文格式：
```
2026/1/19 下午 4:44:36
```

JavaScript `new Date()` 無法解析此格式。

**解決方案**：

```javascript
function parseTime(timeStr) {
  if (timeStr.includes('上午') || timeStr.includes('下午')) {
    const isPM = timeStr.includes('下午');
    const cleaned = timeStr.replace('上午', '').replace('下午', '').trim();
    const [datePart, timePart] = cleaned.split(' ');
    const [year, month, day] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    let hour24 = hour;
    if (isPM && hour !== 12) hour24 = hour + 12;
    if (!isPM && hour === 12) hour24 = 0;

    return new Date(year, month - 1, day, hour24, minute, second);
  }
  return new Date(timeStr);
}
```

### 2.5 appendRow 的自動類型轉換 ⚠️ 重要

**真實行為**：

當你用 `appendRow()` 寫入**看起來像日期的字串**時，Google Sheets 會**自動轉換為 Date 物件**：

```javascript
// 寫入
sheet.appendRow(['uuid-123', 'IN', '2026/1/27上午9:00:00', '2026-01-27T09:00:00.000Z']);

// 稍後讀取
const data = sheet.getDataRange().getValues();
console.log(data[1][2]);  
// 真實環境：Date Object（不是字串！）
// 測試環境（舊版 Mock）：'2026/1/27上午9:00:00'（字串）
```

**問題症狀**：

```javascript
// 在真實環境中會失敗！
const timeString = row[2];  // 是 Date 物件，不是字串
timeString.match(/正則表達式/);  // TypeError: timeString.match is not a function
```

**Mock 實作（模擬真實行為）**：

```javascript
// lib/gas-mock.js

function isDateTimeString(value) {
  if (typeof value !== 'string') return false;
  
  // 中文格式：2026/1/27上午9:00:00
  const chineseFormat = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  if (chineseFormat.test(value)) return true;
  
  // ISO 格式：2026-01-27T09:00:00
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value);
}

function convertToDateIfNeeded(value) {
  if (typeof value === 'string' && isDateTimeString(value)) {
    // 模擬 Google Sheets 的自動轉換
    return parseChineseTime(value);  // 返回 Date 物件
  }
  return value;
}

// 在 appendRow 中使用
appendRow(row) {
  // ⚠️ 模擬 Google Sheets 的自動類型轉換
  const convertedRow = row.map(cell => convertToDateIfNeeded(cell));
  data.push(convertedRow);
}
```

**GAS 程式碼修正（容錯處理）**：

```javascript
// src/程式碼.js

function getTodayRecordsInternal() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const timeValue = row[2];  // ⚠️ 可能是 Date 物件或字串
    
    // 檢查是否為 Date 物件（多種方式）
    let timeString;
    if (timeValue instanceof Date || 
        (timeValue && typeof timeValue === 'object' && typeof timeValue.getTime === 'function')) {
      // 轉換為字串格式
      timeString = formatChineseTime(timeValue);
    } else {
      timeString = String(timeValue);
    }
    
    // 現在可以安全使用 timeString.match()
  }
}
```

**測試策略**：

在 Feature 文件中添加明確的數據類型驗證：

```gherkin
Example: 時間欄位應為可解析的字串格式
  Given 已有一筆打卡記錄：類型「IN」時間「2026/1/27上午9:00:00」
  When 我查詢今日打卡記錄
  Then 第 1 筆記錄的時間應該是文字格式「2026/1/27上午9:00:00」
  And 時間欄位應可用於字串比對
```

**關鍵要點**：
- ✅ Mock 環境應該**模擬真實行為**，包括自動類型轉換
- ✅ GAS 程式碼必須**處理兩種可能**：Date 物件或字串
- ✅ 使用 `getDisplayValues()` 而非 `getValues()` 可避免此問題
- ✅ 測試應該驗證數據類型，而不只是驗證值

---

## 三、踩坑紀錄

### 踩坑 #1：google.script.run 回傳 null

**症狀**：
- 後端函式在編輯器執行正常
- 透過 `google.script.run` 呼叫卻回傳 `null`
- 沒有錯誤訊息

**原因**：
回傳值包含無法序列化的內容（Date 物件或 NaN）

**解決方案**：
```javascript
// ❌ 錯誤：使用 getValues()
const data = sheet.getDataRange().getValues();

// ✅ 正確：使用 getDisplayValues()
const data = sheet.getDataRange().getDisplayValues();

// ✅ 加入 NaN 防護
let workHours = calculateWorkHours(records);
if (isNaN(workHours)) {
  workHours = 0;
}
```

**除錯技巧**：
1. 先呼叫簡單測試函式確認連線正常
2. 逐步排除：先不計算，只回傳原始資料
3. 使用 `testStepByStep()` 逐步檢查每個操作

---

### 踩坑 #2：獨立腳本無法存取試算表

**症狀**：
- `SpreadsheetApp.getActiveSpreadsheet()` 回傳 `null`
- 函式在編輯器執行正常，但 Web App 失敗

**原因**：
獨立腳本（Standalone Script）沒有「當前試算表」概念

**解決方案**：
```javascript
// ❌ 錯誤：獨立腳本中會回傳 null
const ss = SpreadsheetApp.getActiveSpreadsheet();

// ✅ 正確：明確指定 ID
const SPREADSHEET_ID = '1bze...';
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
```

**額外設定**：
在 `appsscript.json` 加入 OAuth scope：
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

---

### 踩坑 #3：前端 Invalid Date

**症狀**：
- 打卡記錄顯示 "Invalid Date"
- 後端資料正常

**原因**：
前端使用 `new Date(r.time)` 解析中文格式日期失敗

**解決方案**：
```javascript
// ❌ 錯誤：嘗試解析中文日期
const time = new Date(r.time).toLocaleTimeString();

// ✅ 正確：直接顯示（後端已格式化）
const time = r.time;
```

---

### 踩坑 #4：Logger 在 Web App 中的問題

**症狀**：
- 函式在編輯器執行正常
- Web App 呼叫時回傳 `null`

**原因**：
某些情況下 `Logger.log()` 可能影響 Web App 執行

**解決方案**：
生產環境移除 `Logger.log()` 或使用 try-catch 包裝：
```javascript
function getRecordsForWeb() {
  try {
    const records = getTodayRecords();
    // 不使用 Logger.log
    return { records, workHours: 0 };
  } catch (e) {
    return { error: true, message: e.message };
  }
}
```

---

### 踩坑 #5：getValues() 返回 Date 物件導致 .match() 失敗 ⚠️ 常見

**症狀**：
- 測試環境正常運行
- 部署到 Google Apps Script 後出現錯誤：
  ```
  TypeError: timeString.match is not a function
  ```

**原因**：
1. **寫入時**：`appendRow(['uuid', 'IN', '2026/1/27上午9:00:00', ...])` 
   - Google Sheets **自動將日期字串轉換為 Date 物件**
2. **讀取時**：`getValues()` 返回的是 **Date 物件**，不是字串
3. **測試環境**：舊版 Mock 沒有模擬這個自動轉換行為，仍然返回字串

**錯誤程式碼**：

```javascript
function getTodayRecords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const timeString = data[i][2];  // ❌ 實際上是 Date 物件！
    
    // ❌ 錯誤：Date 物件沒有 .match() 方法
    if (timeString.match(/上午|下午/)) {
      // ...
    }
  }
}
```

**正確解決方案**：

**方案 1：處理兩種可能的類型**
```javascript
function getTodayRecords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    let timeValue = data[i][2];  // 可能是 Date 物件或字串
    
    // ✅ 統一轉換為字串
    if (timeValue instanceof Date || 
        (timeValue && typeof timeValue === 'object' && typeof timeValue.getTime === 'function')) {
      timeValue = formatChineseTime(timeValue);  // 轉為中文格式字串
    } else {
      timeValue = String(timeValue);
    }
    
    // 現在可以安全使用字串方法
    if (timeValue.match(/上午|下午/)) {
      // ...
    }
  }
}
```

**方案 2：使用 getDisplayValues()（推薦）**
```javascript
function getTodayRecords() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('打卡記錄');
  // ✅ 使用 getDisplayValues() 直接取得字串
  const data = sheet.getDataRange().getDisplayValues();
  
  for (let i = 1; i < data.length; i++) {
    const timeString = data[i][2];  // ✅ 保證是字串
    
    if (timeString.match(/上午|下午/)) {
      // ...
    }
  }
}
```

**測試環境修正**：

更新 Mock 來模擬真實行為：

```javascript
// lib/gas-mock.js

appendRow(row) {
  // ✅ 模擬 Google Sheets 的自動類型轉換
  const convertedRow = row.map(cell => {
    if (typeof cell === 'string' && isDateTimeString(cell)) {
      return parseChineseTime(cell);  // 轉為 Date 物件
    }
    return cell;
  });
  data.push(convertedRow);
}
```

**Feature 文件中添加驗證**：

```gherkin
Example: 時間欄位應為可解析的字串格式
  Given 已有一筆打卡記錄：類型「IN」時間「2026/1/27上午9:00:00」
  When 我查詢今日打卡記錄
  Then 第 1 筆記錄的時間應該是文字格式「2026/1/27上午9:00:00」
  And 時間欄位應可用於字串比對
```

**Step Definition 範例**：

```javascript
Then(/^第 (\d+) 筆記錄的時間應該是文字格式「(.+)」$/, function(index, expectedTime) {
  const record = this.records[parseInt(index) - 1];
  const actualTime = record['時間'] || record.time;
  
  // ✅ 關鍵驗證：必須是字串類型
  assert.strictEqual(typeof actualTime, 'string',
    `時間欄位應該是字串類型，實際為 ${typeof actualTime}`);
  
  assert.strictEqual(actualTime, expectedTime);
});

Then('時間欄位應可用於字串比對', function() {
  const record = this.records[0];
  const timeValue = record['時間'] || record.time;
  
  // ✅ 驗證：必須支援 .match() 方法
  assert.ok(typeof timeValue.match === 'function',
    '時間欄位應該支援 .match() 字串方法');
  
  // ✅ 驗證：可以用正則表達式匹配
  const regex = /^\d{4}\/\d{1,2}\/\d{1,2}(上午|下午)\d{1,2}:\d{2}:\d{2}$/;
  assert.ok(timeValue.match(regex),
    `時間格式應符合中文日期格式，實際為 "${timeValue}"`);
});
```

**經驗教訓**：
- 🎯 **Mock 環境必須模擬真實環境的所有行為**，包括隱藏的類型轉換
- 🎯 **測試應該驗證數據類型**，而不只是驗證值
- 🎯 **程式碼應該處理多種可能的類型**，保持容錯性
- 🎯 **優先使用 `getDisplayValues()`** 來避免類型問題

---

## 四、Mock 測試模式

### 預設模式（模擬真實行為）

```javascript
const mockRun = createMockGoogleScriptRun(gasContext);
// Date 物件 → 回傳 null + console 警告
```

### 嚴格模式（開發推薦）

```javascript
const mockRun = createMockGoogleScriptRun(gasContext, { strictMode: true });
// Date 物件 → 拋出錯誤讓測試失敗
```

---

## 五、快速檢查清單

### 部署前檢查

**數據處理**：
- [ ] 是否使用 `getDisplayValues()` 而非 `getValues()`？
- [ ] 處理 `getValues()` 返回值時，是否檢查 Date 物件類型？
- [ ] 對字串使用 `.match()` 前，是否確認類型為 string？
- [ ] 回傳值是否包含 `NaN`？加入 `isNaN()` 檢查

**環境配置**：
- [ ] 是否使用 `openById()` 而非 `getActiveSpreadsheet()`？
- [ ] `appsscript.json` 是否有正確的 OAuth scope？

**前端整合**：
- [ ] 前端是否直接顯示時間字串而非用 `new Date()` 轉換？
- [ ] 是否啟用嚴格模式測試 `google.script.run` 序列化？

### 測試環境檢查

**Mock 環境配置**：
- [ ] Mock 的 `appendRow()` 是否模擬自動類型轉換？
- [ ] Mock 的 `getValues()` 是否返回 Date 物件（而非字串）？
- [ ] 是否在 Feature 文件中添加數據類型驗證場景？

**Step Definitions**：
- [ ] 是否添加驗證時間欄位為字串類型的測試？
- [ ] 是否添加驗證字串方法可用的測試（如 `.match()`）？

### 除錯時檢查

**常見錯誤症狀**：
- `TypeError: xxx.match is not a function` → 可能是 Date 物件，需要轉字串
- `google.script.run` 返回 `null` → 可能有 Date/NaN/Function
- `Invalid Date` → 可能是中文日期格式未正確解析
- 測試通過但部署失敗 → Mock 環境與真實環境行為不一致

---

## 六、Mock 環境功能清單

### SpreadsheetApp

- `getActiveSpreadsheet()` - 取得試算表
- `openById(id)` - 用 ID 開啟試算表
- `getSheetByName(name)` - 取得工作表
- `insertSheet(name)` - 新增工作表
- `sheet.clear()` - 清空工作表
- `sheet.appendRow([])` - 新增列
- `sheet.getDataRange().getValues()` - 取得所有資料（含 Date 物件）
- `sheet.getDataRange().getDisplayValues()` - 取得顯示值（純字串）

### HtmlService

- `createHtmlOutputFromFile(filename)` - 讀取 HTML 檔案
- `createTemplateFromFile(filename)` - 建立模板（支援 `<?= ?>` 語法）
- `setTitle(title)` - 設定標題
- `getContent()` - 取得 HTML 內容
- 檔案不存在時拋出錯誤（可被測試捕捉）

### Utilities

- `getUuid()` - 生成 UUID
- `formatDate(date, tz, format)` - 格式化日期
- `sleep(ms)` - 暫停（Mock 中不實際等待）

### Session

- `getScriptTimeZone()` - 取得時區
- `getActiveUser().getEmail()` - 取得當前使用者 Email

### google.script.run

- 動態代理任何後端函式
- 序列化檢查（Date、NaN 偵測）
- `withSuccessHandler()` / `withFailureHandler()` 支援

---

## 七、破壞性測試建議

驗證 Mock 環境正確性的方法：

```bash
# 測試 1: 移除 HTML 檔案，測試應該失敗
mv src/Index.html src/Index.html.backup
npm test  # 應該報錯
mv src/Index.html.backup src/Index.html

# 測試 2: 在程式碼中使用 getValues() 返回 Date 物件
# 然後透過 google.script.run 回傳
# 應該看到序列化警告或失敗

# 測試 3: 忘記設定模板變數
# 測試應該報錯：「模板錯誤：變數 'xxx' 未定義」
```
