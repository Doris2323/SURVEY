# Prompts 更新紀錄：Mock 環境改進

**日期**：2026-01-27  
**觸發原因**：部署到 Google Apps Script 後出現 `TypeError: timeString.match is not a function`

---

## 問題描述

### 症狀
- ✅ 測試環境：所有測試通過
- ❌ 生產環境：`TypeError: timeString.match is not a function`

### 根本原因
Google Sheets 會**自動將日期字串轉換為 Date 物件**：

```javascript
// 寫入時
sheet.appendRow(['uuid', 'IN', '2026/1/27上午9:00:00', ...]);

// 讀取時
const data = sheet.getDataRange().getValues();
console.log(typeof data[1][2]);  
// 真實環境：object (Date 物件)
// 舊 Mock 環境：string
```

### 影響範圍
任何使用 `getValues()` 讀取日期欄位，並對其使用字串方法（如 `.match()`、`.includes()` 等）的程式碼都會失敗。

---

## 解決方案

### 1. 更新 Mock 環境（lib/gas-mock.js）

**修改內容**：
- ✅ `isDateTimeString()` - 增加中文日期格式識別
- ✅ `convertToDateIfNeeded()` - 正確轉換中文日期為 Date 物件
- ✅ `appendRow()` - 模擬 Google Sheets 的自動類型轉換

**關鍵修改**：
```javascript
appendRow(row) {
  // ✅ 模擬 Google Sheets 的自動類型轉換
  const convertedRow = row.map(cell => convertToDateIfNeeded(cell));
  data.push(convertedRow);
}
```

### 2. 更新 GAS 程式碼（src/程式碼.js）

**增加容錯處理**：
```javascript
// 處理 Date 物件或字串兩種可能
if (timeValue instanceof Date || 
    (timeValue && typeof timeValue === 'object' && typeof timeValue.getTime === 'function')) {
  timeString = formatChineseTime(timeValue);
} else {
  timeString = String(timeValue);
}
```

### 3. 添加數據類型驗證測試

**Feature 文件**（features/打卡記錄.feature）：
```gherkin
Example: 時間欄位應為可解析的字串格式
  Given 已有一筆打卡記錄：類型「IN」時間「2026/1/27上午9:00:00」
  When 我查詢今日打卡記錄
  Then 第 1 筆記錄的時間應該是文字格式「2026/1/27上午9:00:00」
  And 時間欄位應可用於字串比對
```

**Step Definitions**（features/step_definitions/打卡記錄.steps.js）：
```javascript
Then(/^第 (\d+) 筆記錄的時間應該是文字格式「(.+)」$/, function(index, expectedTime) {
  const actualTime = record['時間'] || record.time;
  
  // ⚠️ 關鍵驗證：必須是字串類型
  assert.strictEqual(typeof actualTime, 'string',
    `時間欄位應該是字串類型，實際為 ${typeof actualTime}`);
});
```

---

## Prompts 更新清單

### ✅ 已更新的檔案

#### 1. **prompts/Mock學習指南.md**

新增章節：
- **2.5 appendRow 的自動類型轉換**
  - 說明 Google Sheets 的自動轉換行為
  - 提供 Mock 實作範例
  - 展示 GAS 程式碼的容錯處理
  - 給出測試策略建議

新增踩坑記錄：
- **踩坑 #5：getValues() 返回 Date 物件導致 .match() 失敗**
  - 完整的問題症狀描述
  - 兩種解決方案（處理兩種類型 vs 使用 getDisplayValues）
  - 測試環境修正方法
  - Feature 文件和 Step Definition 範例

更新快速檢查清單：
- 添加「部署前檢查」區塊
- 添加「測試環境檢查」區塊
- 添加「除錯時檢查」區塊

#### 2. **prompts/01-Gherkin-to-Step-Definition.md**

更新 Rule 3 表格：
- 新增「第 N 筆記錄的 X 應該是文字格式」模式
- 新增「X 欄位應可用於字串比對」模式

新增 Step Definition 樣板：
- 數據類型驗證的完整範例
- 說明為什麼需要這類驗證
- 註解標註重要檢查點

#### 3. **prompts/更新紀錄-Mock環境改進.md**（本檔案）

記錄完整的：
- 問題背景
- 解決方案
- 更新內容
- 經驗教訓

---

## 測試結果

### 更新前
```
27 scenarios (4 failed, 12 undefined, 11 passed)
152 steps (4 failed, 48 undefined, 2 skipped, 98 passed)
```

失敗原因：
- Mock 環境返回字串，真實環境返回 Date 物件
- 測試無法捕捉類型差異問題

### 更新後
```
27 scenarios (12 undefined, 15 passed)
152 steps (48 undefined, 1 skipped, 103 passed)
```

✅ 所有已實作場景通過（包括新的數據類型驗證場景）  
✅ Mock 環境成功模擬真實環境的類型轉換行為  
✅ 測試能夠捕捉到類型不匹配的問題

---

## 經驗教訓

### 🎯 核心原則

1. **Mock 環境必須模擬真實環境的所有行為**
   - 不只是模擬 API 介面
   - 還要模擬隱藏的行為（如自動類型轉換）

2. **測試應該驗證數據類型，不只是驗證值**
   - 添加 `typeof` 檢查
   - 驗證方法可用性（如 `.match()`）

3. **程式碼應該處理多種可能的類型**
   - 使用多種方式檢查類型（`instanceof`、`typeof`、duck typing）
   - 提供容錯轉換邏輯

4. **優先使用 getDisplayValues()**
   - 避免類型轉換問題
   - 確保返回字串格式

### 📚 實踐建議

**寫測試時**：
- ✅ 在 Feature 文件中添加數據類型驗證場景
- ✅ Step Definition 中驗證類型，不只驗證值
- ✅ 確保 Mock 環境模擬真實行為

**寫程式時**：
- ✅ 使用 `getDisplayValues()` 而非 `getValues()`
- ✅ 對 `getValues()` 的返回值進行類型檢查
- ✅ 提供多種類型的容錯處理

**部署前**：
- ✅ 檢查 Mock 環境是否完整模擬真實行為
- ✅ 執行完整測試套件
- ✅ 使用檢查清單逐項確認

---

## 後續工作

### 可選的進一步改進

1. **創建自動檢測工具**
   - 掃描程式碼中對 `getValues()` 的使用
   - 檢查是否有類型檢查或使用 `getDisplayValues()`

2. **擴展 Mock 環境**
   - 模擬更多 Google Sheets 的隱藏行為
   - 添加更多數據類型的自動轉換（如數字、布林值）

3. **建立最佳實踐文件**
   - 整理常見的 Google Sheets 行為差異
   - 提供標準的容錯模式

4. **改進錯誤訊息**
   - 當檢測到類型不匹配時，提供更清晰的錯誤訊息
   - 建議可能的修正方式

---

## 參考資料

- **Google Apps Script 官方文件**：
  - [Range.getValues()](https://developers.google.com/apps-script/reference/spreadsheet/range#getvalues)
  - [Range.getDisplayValues()](https://developers.google.com/apps-script/reference/spreadsheet/range#getdisplayvalues)

- **相關 Issue**：
  - 部署後出現 `TypeError: timeString.match is not a function`
  - 原因：Google Sheets 自動將日期字串轉為 Date 物件

- **修改的檔案**：
  - `lib/gas-mock.js` - Mock 環境改進
  - `src/程式碼.js` - GAS 程式碼容錯處理
  - `features/打卡記錄.feature` - 添加數據類型驗證場景
  - `features/step_definitions/打卡記錄.steps.js` - 添加類型驗證步驟
  - `prompts/Mock學習指南.md` - 文件更新
  - `prompts/01-Gherkin-to-Step-Definition.md` - 模板更新
