Feature: 提交問卷回覆
  為了捕捉開發者的工作流程習慣
  作為填寫 Spec Habit Survey 的受訪者
  我希望在單一導引流程內完成所有必填段落

  Background:
    Given 「Spec Habit Survey」問卷版本為「2026.02」
    And 問卷切分為下列段落
      | 段落                  | 題目數 | 輸入類型                                |
      | 基本資料               | 11     | 文字、單選                               |
      | 工作環境或組織現況        | 3      | 單選、條件跳題                           |
      | 個人工作與職涯現況        | 4      | 單選、多選                               |
      | 學習資源獲取與規劃        | 5      | 單選、多選、文字                         |
      | 規格驅動開發認知度        | 7      | 單選、多選、選填                         |
    And 每題皆定義 question_code 欄位
    And Google Sheets 會為每位受訪者及 question_code 保留一格 JSON

  Scenario: 以有效資料完成全段落問卷
    Given 受訪者在網頁上開啟導引式問卷表單
    And 系統已先驗證身分區塊的 Email 格式與 GitHub 使用者名稱模式
    When 受訪者以上述資料送出問卷
      | 欄位                        | 值                                         |
      | respondent.full_name       | Lin Pei                                   |
      | respondent.email           | lin@example.com                           |
      | respondent.github_name     | linpei                                    |
      | respondent.career_stage    | 入職 1 - 3 年                               |
      | respondent.cs_major        | 否                                         |
      | respondent.compensation    | 800,000 ~ 999,999                         |
      | org.type                   | 成熟軟體產品服務                             |
      | org.ai_in_workflow         | 是                                         |
      | org.ai_impact              | 有明顯感受，開發速度提升至少 2 倍                   |
      | org.test_culture           | 有                                         |
      | workflow.ai_usage          | 在多個開發環節使用 AI                        |
      | workflow.testing_depth     | 寫過實際功能的測試                            |
      | workflow.spec_participation| 提供技術實踐的可行性評估，並提出風險疑慮               |
      | workflow.top_confusion     | 不知道如何寫有效的測試                          |
      | learning.has_training      | 是                                         |
      | learning.latest_topic      | 「AI BDD workshop」                        |
      | learning.discovery_channels| [「同事或朋友推薦」, 「技術部落格」]               |
      | learning.funding_sources   | [「公司付費」, 「自費參加」]                    |
      | learning.decision_factor   | 課程大綱與學習內容是否實用                        |
      | sdd.awareness              | 理解概念，未使用實際運用在軟體開發專案中                |
      | sdd.primary_need           | 提升程式碼品質與可維護性，可以有測試保護的實踐            |
      | academy.heard_waterball    | 是                                         |
      | academy.heard_courses      | [「AI x BDD：規格驅動全自動化開發術」]              |
      | academy.workshop_interest  | 有興趣，但需要了解更多細節                          |
      | academy.accept_interview   | 願意                                       |
      | academy.interview_slots    | 週一至週五，19:00~21:00                      |
    Then 系統確認所有段落的必填題皆恰好作答一次
    And 系統會依問卷列與 question_code 將 JSON 寫入對應儲存格
    And 提交狀態標記為 completed 並記錄時間戳記
    And 受訪者看到成功頁面並告知後續 GitHub 贈品驗證

  Scenario: 受訪者選擇不導入 AI 時遵守跳題邏輯
    Given 受訪者在「目前是否導入 AI 工作流程」選擇「否」
    When 受訪者留空所有後續 AI 導入相關題目
    Then 問卷引擎會在介面中隱藏這些題目
    And 被跳過 question_code 的 JSON 儲存為 `{ "skipped_due_to": "ai_not_adopted" }`
    And 因為滿足跳題條件所以驗證仍通過

  Scenario Outline: 同步紀錄含「其他」文字的多選題
    When 受訪者在多選題「目前最困擾的工作情境」選擇 <selections>
    And 為動態顯示的文字欄位填寫 <other_text>
    Then 儲存的 JSON 陣列包含
      | key           | value                    |
      | selections    | <normalized_selections>  |
      | other_text    | <other_text>             |
    And 分析匯出會保留自由文字內容

    Examples:
      | selections                                 | other_text           | normalized_selections                                      |
      | ["跨團隊協作時難以對齊", "實踐 AI Coding..."] | "Legacy burden"     | ["collaboration_misalignment", "ai_to_elite_unclear"] |
      | ["其他"]                                     | "缺乏測試基礎設施"      | ["other"]                                                |
