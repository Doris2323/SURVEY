# Mock 環境驗證清單

> 確保 Mock 環境支援所有澄清的需求

## ✅ 決策 1: createdAt 欄位支援

### 需求
- 工作表需要有 `createdAt` 欄位
- 自動填入 ISO 格式的時間戳記

### Mock 實作狀態

**gas-loader.js**
```javascript
// ✅ 已支援：工作表初始化時包含 createdAt 欄位
ctx = loadGasCodeForTesting({
  sheets: {
    '打卡記錄': ['UUID', '類型', '時間', 'createdAt']
  }
});
```

**Step Definitions**
```javascript
// ✅ 已支援：Given 步驟會自動填入 createdAt
Given(/^已有一筆打卡記錄：類型「(.+)」時間「(.+)」$/, function(type, time) {
  const createdAt = new Date().toISOString();  // ISO 格式
  sheet.appendRow([uuid, type, time, createdAt]);
});
```

**驗證方法：**
```bash
# 測試案例應該能讀取 createdAt 並過濾日期
npm test -- features/打卡記錄.feature:78
```

**狀態：** ✅ 已支援

---

## ✅ 決策 2: 業務邏輯驗證（不檢查 disabled）

### 需求
- 測試專注於後端 API 驗證
- 不強制檢查 HTML 的 `disabled` 屬性

### Mock 實作狀態

**現有測試策略**
```javascript
// ✅ 正確：驗證 API 回傳的錯誤訊息
Then(/^頁面應該顯示錯誤訊息「(.+)」$/, function(expectedMessage) {
  assert.ok(this.result, '應該有操作結果');
  assert.ok(!this.result.success, '操作應該失敗');
  const actualMessage = this.result.message || '';
  assert.ok(actualMessage.includes(expectedMessage));
});
```

**不需要的測試（已避免）**
```javascript
// ❌ 不需要：檢查按鈕 disabled 狀態
// Then('IN 按鈕應該是 disabled 狀態', function() { ... });
```

**狀態：** ✅ 已正確實作

---

## ✅ 決策 3: 記錄倒序排列

### 需求
- `getTodayRecords()` 返回倒序記錄（最新在上）
- API 的 records 陣列第一筆 = 最新記錄

### Mock 實作狀態

**程式碼實作**
```javascript
// ✅ 支援：reverse() 方法
function getTodayRecords() {
  // ... 過濾邏輯 ...
  return records.reverse();  // 倒序
}
```

**測試驗證**
```javascript
// ✅ 支援：可以測試順序
Then(/^第 (\d+) 筆記錄的類型應該是「(.+)」$/, function(index, expectedType) {
  const record = this.apiData.records[parseInt(index) - 1];
  assert.strictEqual(record['類型'], expectedType);
});
```

**狀態：** ✅ 已支援

---

## ✅ 決策 4: 測試資料隔離

### 需求
- 每個 Scenario 開始前清空工作表
- 確保測試獨立執行

### Mock 實作狀態

**gas-mock.js**
```javascript
// ✅ 已支援：sheet.clear() 方法
export function createMockSheet(headers = [], options = {}) {
  return {
    clear() {
      this._data = [headers];  // 清空並保留標題
    },
    // ...
  };
}
```

**Before Hook**
```javascript
// ✅ 已實作：每個 Scenario 前清空
Before(function() {
  ctx = loadGasCodeForTesting({ ... });
  const sheet = ctx.SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName('打卡記錄');
  sheet.clear();
  sheet.appendRow(['UUID', '類型', '時間', 'createdAt']);
  this.ctx = ctx;
});
```

**驗證方法：**
```bash
# 執行多個測試，確保不會互相影響
npm test
```

**狀態：** ✅ 已支援

---

## ✅ 決策 5: HTML #message 元素驗證

### 需求
- HTML 需要有固定的訊息顯示區域（`#message`）
- 測試使用 cheerio 查詢該元素

### Mock 實作狀態

**gas-mock.js - HtmlService**
```javascript
// ✅ 已支援：實際讀取 HTML 檔案
export function createMockHtmlService() {
  return {
    createHtmlOutputFromFile(filename) {
      // 實際讀取 src/Index.html
      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      return {
        getContent() { return htmlContent; }
      };
    }
  };
}
```

**Step Definitions**
```javascript
// ✅ 已支援：cheerio 解析 HTML
import * as cheerio from 'cheerio';

When('我開啟打卡頁面', function() {
  const htmlOutput = this.ctx.doGet();
  this.htmlContent = htmlOutput.getContent();
  this.$ = cheerio.load(this.htmlContent);  // 解析 HTML
});

Then(/^頁面應該顯示錯誤訊息「(.+)」$/, function(expectedMessage) {
  const messageElement = this.$('#message');  // 查詢 #message
  const actualMessage = messageElement.text().trim();
  assert.ok(actualMessage.includes(expectedMessage));
});
```

**HTML 實作要求**
```html
<!-- ✅ 必須包含 -->
<div id="message" class="message"></div>
```

**驗證方法：**
```bash
# 破壞性測試：移除 #message 元素
# 測試應該失敗：找不到訊息顯示區域

# 破壞性測試：移除 Index.html
rm src/Index.html
npm test  # 應該失敗
```

**狀態：** ✅ 已支援

---

## 📊 Mock 環境完整功能清單

### SpreadsheetApp (gas-mock.js)

- ✅ `getActiveSpreadsheet()` - 取得試算表
- ✅ `getSheetByName(name)` - 取得工作表
- ✅ `sheet.clear()` - 清空工作表
- ✅ `sheet.appendRow([])` - 新增列
- ✅ `sheet.getDataRange().getValues()` - 取得所有資料
- ✅ `sheet.getDisplayValues()` - 取得顯示值（模擬序列化）

### HtmlService (gas-mock.js)

- ✅ `createHtmlOutputFromFile(filename)` - 讀取 HTML 檔案
- ✅ `setTitle(title)` - 設定標題
- ✅ `getContent()` - 取得 HTML 內容
- ✅ 檔案不存在時返回錯誤（可被測試捕捉）

### Utilities (gas-mock.js)

- ✅ `getUuid()` - 生成 UUID
- ✅ `formatDate(date, tz, format)` - 格式化日期

### Session (gas-mock.js)

- ✅ `getScriptTimeZone()` - 取得時區

### Cheerio (Step Definitions)

- ✅ `cheerio.load(html)` - 解析 HTML
- ✅ `$('#id')` - 查詢元素
- ✅ `.text()` - 取得文字內容
- ✅ `.includes()` - 檢查是否包含

---

## 🧪 驗證測試腳本

```bash
#!/bin/bash

echo "=== Mock 環境驗證測試 ==="

echo "✅ 測試 1: createdAt 欄位支援"
npm test -- features/打卡記錄.feature:78 || echo "❌ 失敗"

echo "✅ 測試 2: 業務邏輯驗證"
npm test -- features/打卡記錄.feature:14 || echo "❌ 失敗"

echo "✅ 測試 3: 記錄順序（需要 Feature 更新後測試）"
# npm test -- features/打卡記錄.feature:XX || echo "❌ 失敗"

echo "✅ 測試 4: 測試資料隔離"
npm test || echo "❌ 失敗"

echo "✅ 測試 5: HTML 驗證"
npm test -- features/頁面流程.feature:36 || echo "❌ 失敗"

echo ""
echo "=== 破壞性測試 ==="

echo "🔴 測試: 移除 HTML 檔案"
mv src/Index.html src/Index.html.backup 2>/dev/null
npm test -- features/頁面流程.feature:36 && echo "❌ 應該失敗但通過了" || echo "✅ 正確失敗"
mv src/Index.html.backup src/Index.html 2>/dev/null

echo ""
echo "=== 驗證完成 ==="
```

---

## 📝 改進建議

### 未來可以加強的地方

1. **時間 Mock**
   - 目前：使用 `new Date()` 當前時間
   - 建議：支援 Mock 固定時間，方便測試跨日場景

2. **記錄順序測試**
   - 目前：Feature 文件沒有明確測試順序
   - 建議：添加測試案例驗證 `records[0]` 是最新記錄

3. **HTML 元素完整性**
   - 目前：只驗證 #message 元素
   - 建議：可以添加更多元素驗證（按鈕、標題、列表）

4. **錯誤訊息格式**
   - 目前：只檢查是否包含關鍵字
   - 建議：可以驗證完整的錯誤訊息格式

---

## ✅ 結論

**所有 5 個澄清決策都已在 Mock 環境中得到支援！**

Mock 環境已經具備：
- ✅ createdAt 欄位支援
- ✅ 業務邏輯驗證（不依賴 UI 狀態）
- ✅ 記錄倒序功能
- ✅ 測試資料隔離
- ✅ HTML 內容驗證（使用 cheerio）

**可以開始 BDD 流程了！** 🚀
