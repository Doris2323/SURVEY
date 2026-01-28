# AI X BDD Workshop - 打卡系統

透過 AI 助手學習 BDD（行為驅動開發）的 Workshop 專案。

## 快速開始

```bash
# 1. Clone 專案後，執行初始化
npm run setup

# 2. 重置到學習起始狀態（清除已實作的程式碼）
npm run reset

# 3. 執行測試
npm test
```

## 專案結構

```
workshop_clock_in/
├── README.md              ← 你在這裡
├── package.json           # npm 設定
├── cucumber.js            # Cucumber 測試設定
│
├── .cursor/               # Cursor IDE 設定
│   └── rules/             # AI 助手規則系統
│       ├── README.md      # 規則說明文件
│       ├── bdd-workflow.mdc          # BDD 工作流程核心規則
│       ├── feature-protection.mdc    # Feature 檔案保護
│       ├── step-definitions.mdc      # Step Definition 規範
│       ├── apps-script.mdc           # GAS 撰寫規範
│       ├── lib-protection.mdc        # lib 目錄保護
│       └── testing-standards.mdc     # 測試撰寫規範
│
├── docs/                  # AI BDD 教學文件
│   ├── 01-什麼是BDD.md
│   ├── 02-如何撰寫Feature.md
│   ├── 03-打卡功能範例解說.md
│   └── 04-如何新增自己的功能.md
│
├── features/              # Gherkin Feature 檔案
│   ├── 打卡記錄.feature   # 打卡功能測試場景
│   ├── 頁面流程.feature   # E2E 流程測試
│   └── step_definitions/  # 步驟定義（你要寫的）
│
├── prompts/               # 給 AI 的 Prompts
│   ├── README.md          # Prompts 索引和使用指南
│   ├── 01-Gherkin-to-Step-Definition.md  # 綁定測試
│   ├── 02-紅燈.md         # 確認測試失敗
│   ├── 03-綠燈.md         # 最小實作
│   ├── 04-重構.md         # 改善程式碼
│   ├── Mock學習指南.md    # GAS Mock 說明
│   ├── 架構決策文件.md    # 技術決策記錄 (含 Feature 保護規則)
│   └── 改良計劃.md        # 改進規劃
│
├── lib/                   # 測試基礎設施
│   ├── gas-loader.js      # GAS 程式碼載入器
│   └── gas-mock.js        # GAS API Mock
│
└── src/                   # Apps Script 程式碼
    ├── 程式碼.js          # 主程式（你要實作的）
    ├── Index.html         # Web App 前端
    └── appsscript.json    # GAS 設定
```

## 學習路徑

### 1. 了解 BDD

閱讀 [docs/01-什麼是BDD.md](docs/01-什麼是BDD.md) 理解 BDD 的核心概念。

### 2. 學習 Feature 語法

閱讀 [docs/02-如何撰寫Feature.md](docs/02-如何撰寫Feature.md) 學習 Gherkin 語法。

### 3. 跟著範例走一遍

閱讀 [docs/03-打卡功能範例解說.md](docs/03-打卡功能範例解說.md) 並實際操作。

### 4. 建立自己的功能

閱讀 [docs/04-如何新增自己的功能.md](docs/04-如何新增自己的功能.md) 嘗試新增功能。

## BDD 工作流程

### 四步驟循環

```
       ┌──────────────────────────────────────────────────────────┐
       │                                                          │
       ▼                                                          │
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─┴────────┐
│  Feature │ => │  綁定    │ => │  紅燈    │ => │  綠燈    │ => │  重構    │
│ (Gherkin)│    │ (Step Def)│   │ (測試失敗)│    │ (測試通過)│    │ (改善)   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

每個階段都有對應的 Prompt：

| 階段 | Prompt 檔案 | 目標 | 產物 |
|------|-------------|------|------|
| 綁定 | `01-Gherkin-to-Step-Definition.md` | 建立測試骨架 | Step Definition（`return 'pending'`） |
| 紅燈 | `02-紅燈.md` | 確認測試失敗 | 完整測試邏輯（斷言 + 函式呼叫） |
| 綠燈 | `03-綠燈.md` | 最小實作 | 業務邏輯（讓測試通過） |
| 重構 | `04-重構.md` | 改善品質 | 優化後的程式碼（保持測試通過） |

### ⚠️ 重要：Feature 檔案保護原則

**Feature 檔案是需求契約，在 BDD 流程中應保持穩定。**

```
✅ 可以：讀取 Feature → 生成測試 → 實作程式碼
❌ 禁止：修改 Feature（除非需求真的變更）
```

#### 為什麼不能修改 Feature？

- 📋 **Feature 是規格**：由 Product Owner 或客戶定義
- 🎯 **Feature 是契約**：測試和實作的共同依據
- 🔒 **Feature 是基準**：應該先嘗試實作，而非修改需求

#### 什麼時候可以修改？

只有在以下情況才考慮修改：
1. 使用者（Product Owner）明確要求修改需求
2. 發現需求描述不清楚或有歧義（需與 PO 確認）
3. 真正的需求變更（應該經過審查流程）

詳細規則請參考：[`prompts/架構決策文件.md` (ADR-013)](prompts/架構決策文件.md#adr-013-feature-檔案保護規則)

## 使用 AI 助手

### 🎯 Cursor Rules 智能規則系統

本專案已整合 **Cursor Rules** 系統,會根據你打開的檔案自動提供對應的 AI 指引！

#### 自動觸發規則

```
打開 .feature 檔案
→ 自動啟用: Feature 保護規則 (禁止修改)

打開 Step Definition (.steps.js)
→ 自動啟用: Step Definition 規範 + 測試規範

打開 src/程式碼.js
→ 自動啟用: Google Apps Script 規範

打開 lib/*.js
→ 自動啟用: 測試環境保護 (修改需確認)
```

#### 核心保護機制

1. **Feature 檔案保護** - 絕對禁止修改 `.feature` 檔案
2. **lib 目錄保護** - 修改 `lib/` 目錄前需要確認
3. **BDD 流程指引** - 自動識別當前階段並提供對應建議
4. **測試規範強制** - 確保測試品質和隔離性

詳細說明請參考: [`.cursor/rules/README.md`](.cursor/rules/README.md)

### 基本指令格式

複製以下格式的指令給 AI 助手：

```
do: @prompts/01-Gherkin-to-Step-Definition.md
for: @features/打卡記錄.feature
```

- `do:` 指定要執行的 Prompt 檔案
- `for:` 指定要處理的目標檔案

執行完後使用 `npm test` 驗證結果

💡 **提示**: 使用 Cursor 時,規則會自動載入,AI 會自動遵循 BDD 流程！

### 完整開發流程範例

#### 1️⃣ 綁定階段：生成 Step Definition 骨架

```
do: @prompts/01-Gherkin-to-Step-Definition.md
for: @features/打卡流程.feature

請生成 Step Definition 骨架
```

執行測試確認綁定成功（預期：所有測試 pending）：
```bash
npm test
```

#### 2️⃣ 紅燈階段：補完測試邏輯

```
do: @prompts/02-紅燈.md
for: @features/step_definitions/打卡流程.steps.js

請補完測試邏輯
```

執行測試確認失敗（預期：測試失敗，因為業務邏輯未實作）：
```bash
npm test
```

#### 3️⃣ 綠燈階段：實作業務邏輯

```
do: @prompts/03-綠燈.md
for: @src/程式碼.js

請實作讓測試通過的最小程式碼
```

執行測試確認通過（預期：所有測試 passed）：
```bash
npm test
```

#### 4️⃣ 重構階段：改善程式碼品質

```
do: @prompts/04-重構.md
for: @src/程式碼.js

請重構程式碼，改善可讀性和結構
```

執行測試確認仍然通過（預期：重構後測試依然 passed）：
```bash
npm test
```

### ⚠️ 使用 AI 的注意事項

1. **不要讓 AI 修改 Feature 檔案**
   - AI 應該只讀取 Feature，不應修改
   - 如果 AI 建議修改 Feature，請拒絕並提醒它遵守 BDD 原則

2. **確認每個階段的產物**
   - 綁定階段：檢查 Step Definition 是否都是 `return 'pending'`
   - 紅燈階段：確認測試失敗是因為業務邏輯未實作
   - 綠燈階段：確認測試通過且實作最小化
   - 重構階段：確認程式碼改善但測試仍通過

3. **執行測試驗證每個階段**
   - 每完成一個階段都要執行 `npm test`
   - 不要跳過任何階段
   - 確保理解每個階段的目的

## 部署到 Apps Script

當你想把程式碼部署到真實環境時：

```bash
# 1. 設定 clasp（首次需要）
npx clasp login

# 2. 編輯 .clasp.json，填入你的 Script ID

# 3. 推送程式碼
npx clasp push
```

## 常用指令

```bash
# 執行所有測試
npm test

# 執行特定 Feature
npm test -- features/打卡記錄.feature

# 執行含特定標籤的場景
npm test -- --tags @wip

# 環境初始化
npm run setup

# 重置到學習起始狀態（會確認）
npm run reset

# 強制重置（不確認，適合講師使用）
npm run reset:force
```

## 問題排解

### Q: 測試顯示 "Undefined"

表示缺少 Step Definition。請使用 `01-Gherkin-to-Step-Definition.md` prompt 產生。

### Q: 測試顯示 "ReferenceError: xxx is not defined"

這是**預期中的紅燈**！表示你需要實作對應的函式。使用 `03-綠燈.md` prompt。

### Q: Mock 行為與真實 GAS 不同

請參考 `prompts/Mock學習指南.md` 了解 Mock 的限制和已知差異。

---

開始你的 AI X BDD 學習之旅！🚀
