# BDD Prompts 索引

這個目錄包含所有 BDD 流程的 AI Prompt 文件。

## 📚 核心流程 Prompts

### 🔴 [01-紅燈.md](./01-紅燈.md)
**階段**：紅燈（Red）
**目的**：從 Feature 檔案產出完整的 Step Definitions
**輸入**：`.feature` 檔案
**輸出**：包含斷言和業務函式呼叫的完整測試
**執行後**：執行 `npm test` 應該看到測試失敗（業務邏輯未實作）

```
do: @prompts/01-紅燈.md
for: @features/購物車.feature
```

---

### 🟢 [02-綠燈.md](./02-綠燈.md)
**階段**：綠燈（Green）
**目的**：實作最少的程式碼讓測試通過
**輸入**：失敗的測試
**輸出**：滿足測試要求的業務邏輯
**執行後**：執行 `npm test` 應該看到所有測試通過

```
do: @prompts/02-綠燈.md
for: @src/addToCart.js
```

---

### ♻️ [03-重構.md](./03-重構.md)
**階段**：重構（Refactor）
**目的**：在測試保護下改善程式碼品質
**輸入**：通過測試的程式碼
**輸出**：結構更好、更易維護的程式碼
**執行後**：執行 `npm test` 應該仍然全部通過

```
do: @prompts/03-重構.md
for: @src/addToCart.js
```

---

### 🌐 [05-前端網頁.md](./05-前端網頁.md)
**階段**：前端（Frontend）
**目的**：根據後端 API 產生前端網頁
**輸入**：`src/*.js` 業務邏輯 + `features/*.feature` 需求
**輸出**：`src/Index.html` 前端網頁
**執行後**：部署 Web App 測試

```
do: @prompts/05-前端網頁.md
for: @src/*.js @features/*.feature
```

---

## 🎯 使用建議

### 第一次使用？

1. 按順序執行 01 → 02 → 03 的流程
2. 每個階段完成後都執行 `npm test` 確認狀態

### 遇到問題？

- **測試顯示 "Undefined"** → Step Definition 沒有匹配到 Feature 步驟
- **不知道如何寫斷言** → 參考 `01-紅燈.md` 的範例
- **測試一直失敗** → 參考 `02-綠燈.md` 的 Trial-and-Error 流程
- **程式碼很亂** → 使用 `03-重構.md` 進行整理

---

## ⚠️ 重要提醒

### 絕對不要做的事

1. ❌ **修改 Feature 檔案**（除非需求真的變更）
2. ❌ **跳過紅燈階段**（沒看到失敗就不知道測試是否有效）
3. ❌ **過度實作**（綠燈階段只寫最少的程式碼）
4. ❌ **沒有測試保護就重構**（必須先綠燈才能重構）

### 一定要做的事

1. ✅ **每個階段都執行測試**
2. ✅ **遵守 BDD 的順序**（不要跳階段）
3. ✅ **保持 Feature 檔案穩定**
4. ✅ **小步前進**（一次只做一件事）

---

## 📊 流程狀態檢查表

- [ ] **紅燈完成**
  - [ ] 所有 Feature 步驟都有對應的 Step Definition
  - [ ] 加入斷言邏輯和業務函式呼叫
  - [ ] `npm test` 顯示失敗（ReferenceError 或 AssertionError）

- [ ] **綠燈完成**
  - [ ] 實作業務函式
  - [ ] `npm test` 顯示 "X passed"

- [ ] **重構完成**
  - [ ] 抽取常數、輔助函式
  - [ ] `npm test` 仍然全部通過

- [ ] **前端完成**（選用）
  - [ ] `src/Index.html` 已產生
  - [ ] 使用 `google.script.run` 呼叫後端
  - [ ] 部署 Web App 測試通過

---

## 🚀 快速參考

```bash
# 完整 BDD 循環
do: @prompts/01-紅燈.md for: @features/XXX.feature
npm test  # 確認失敗

do: @prompts/02-綠燈.md for: @src/xxx.js
npm test  # 確認通過

do: @prompts/03-重構.md for: @src/xxx.js
npm test  # 確認仍通過

# 前端網頁（後端完成後）
do: @prompts/05-前端網頁.md for: @src/*.js @features/*.feature
# 部署 Web App 測試
```

---

**記住**：BDD 的核心是「先定義需求（Feature），再寫測試，最後實作」。
