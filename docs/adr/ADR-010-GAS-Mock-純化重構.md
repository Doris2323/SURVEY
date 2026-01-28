# ADR-010: GAS Mock 純化重構

## 狀態
已採用

## 日期
2026-01-29

## 背景

原有的 `lib/gas-mock.js` 包含過多職責：
1. GAS API 模擬（SpreadsheetApp, Sheet, Range 等）
2. 測試工具函式（formatDateForLocale, parseChineseDate, isToday）
3. 瀏覽器環境模擬（createMockBrowserEnvironment）
4. HTML 檢查工具（checkHtmlForSandboxIssues）

這違反了單一職責原則，且混淆了「GAS API Fake」與「測試工具」的邊界。

## 決策

### 1. 分離 FakeSheet2DArray

將試算表資料邏輯抽離為獨立的純 JavaScript 類別：

```
lib/
├── fake-sheet.js      # FakeSheet2DArray + FakeRange（純資料操作）
├── gas-mock.js        # GAS API Mock（只包含 API 介面）
└── gas-loader.js      # VM 沙盒載入器
```

### 2. 移除非 GAS API 函數

從 `gas-mock.js` 移除：
- `formatDateForLocale` - 測試工具，非 GAS API
- `parseChineseDate` - 測試工具，非 GAS API
- `isToday` - 測試工具，非 GAS API
- `createMockBrowserEnvironment` - 未使用
- `checkHtmlForSandboxIssues` - 未使用

從 `gas-loader.js` 移除：
- `getGasFunctionNames()` - 未使用
- 所有工具函式的 re-export

### 3. 統一日期格式化來源

Step definitions 改用 `this.ctx.formatDateZhTW()`，而非從 lib/ 匯入：

```javascript
// Before（錯誤）
import { formatDateForLocale } from '../../lib/gas-loader.js';
const createdAt = formatDateForLocale(new Date(), 'zh-TW');

// After（正確）
const createdAt = this.ctx.formatDateZhTW(new Date());
```

## 理由

### Fake Fidelity = AI Least Knowledge

```
如果 Fake 100% 忠實於 GAS API
    ↓
AI 只需要知道標準 GAS API
    ↓
不需要知道任何 Mock/Fake 實作細節
    ↓
AI 寫出的程式碼可直接部署到真實 GAS
```

這個原則確保：
1. **AI 開發者**只需要 GAS 知識
2. **測試程式碼**與**產品程式碼**使用相同的函數
3. **本地測試通過**即代表**雲端部署會成功**

### 關注點分離

| 層級 | 檔案 | 職責 |
|------|------|------|
| 資料層 | fake-sheet.js | 純 JavaScript 二維陣列操作 |
| API 層 | gas-mock.js | GAS API 介面模擬 |
| 載入層 | gas-loader.js | VM 沙盒環境建立 |
| 業務層 | src/*.js | 實際業務邏輯 |

## 後果

### 正面
- `gas-mock.js` 從 720 行減少到 490 行
- `gas-loader.js` 從 184 行減少到 134 行
- Step definitions 不再依賴 lib/ 的工具函式
- 測試程式碼與產品程式碼使用相同的日期函數

### 負面
- 需要更新現有的 step definitions

## 變更摘要

### fake-sheet.js（新增）

```javascript
export class FakeSheet2DArray {
  constructor(headers, options) { ... }
  appendRow(rowData) { ... }
  getDataRange() { ... }
  getRange(row, col, numRows, numCols) { ... }
  getLastRow() { ... }
  getLastColumn() { ... }
  clear() { ... }
}

export class FakeRange {
  getValues() { ... }      // 返回原始值（Date 物件）
  getDisplayValues() { ... } // 返回格式化字串
  setValues(values) { ... }
}
```

### gas-mock.js（精簡後）

只保留純 GAS API Mock：
- `createMockSheet`
- `createMockSpreadsheet`
- `createMockSpreadsheetApp`
- `createMockUtilities`
- `createMockSession`
- `createMockHtmlService`
- `createMockContentService`
- `createMockPropertiesService`
- `createMockLogger`
- `createMockGoogleScriptRun`

### gas-loader.js（精簡後）

只保留：
- `loadGasCodeForTesting(options)` - 唯一的公開函數
- 遞迴載入 `src/` 及子目錄的所有 `.js` 檔案

## 測試驗證

```
BDD 測試：25 scenarios, 131 steps ✅
單元測試：43 tests (fake-sheet.test.js) ✅
執行時間：0.02 秒
```

## 相關決策

- ADR-002: 使用 Node.js VM 沙箱執行 Apps Script
- ADR-003: Mock 策略
