Feature: 查詢問卷資料以供分析
  為了檢視聚合洞察並排查提交問題
  作為內部分析師或自動化儀表板
  我需要能回傳正規化 JSON 並支援篩選的 API

  Background:
    Given 每筆問卷回覆皆以 `submission_id` 為索引
    And 每題答案都以包含 `question_code`、`value`、`metadata` 的 JSON 儲存

  Scenario: 取得提供給 BI 工具的分頁資料
    Given Google Sheets 中有 2 筆 completed 的提交
      | submission_id    | submitted_at      |
      | SR-20260211-001 | 2026-02-11T01:00Z |
      | SR-20260211-002 | 2026-02-11T01:05Z |
    When 分析師呼叫 GET /api/survey-responses?limit=2&cursor=
    Then API 會以 HTTP 200 回傳下列內容
      "page": {
        "limit": 2,
        "next_cursor": "eyJvZmZzZXQiOjJ9"
      },
      "data": [
        {
          "submission_id": "SR-20260211-001",
          "respondent": {
            "full_name": "Lin Pei",
            "email": "lin@example.com",
            "github_name": "linpei"
          },
          "sections": {
            "basic": {...},
            "sdd_awareness": {...}
          }
        }
      ]
    And 每筆回應都包含依 question_code 儲存的完整段落 JSON

  Scenario: 匯出單選題的統計結果
    Given 系統已儲存 question_code「career_stage」的答案
    When 分析師呼叫 GET /api/survey-responses/aggregations?question_code=career_stage
    Then 回傳內容包含各選項的數量與百分比
      | 選項                   | 數量 | 百分比 |
      | 入職 0 - 1 年            | 20   | 18.2% |
      | 入職 1 - 3 年            | 32   | 29.1% |
      | 3 ~5 年以上              | 30   | 27.3% |
      | 5 年以上                | 24   | 21.8% |
      | Tech Lead / Manager   | 4    | 3.6%  |
    And 查詢可搭配 `submitted_after` 或 `has_reward_grant` 等參數

  Scenario: 取得單筆提交供客服追蹤
    Given 客服需要排查提交「SR-20260211-005」
    When 客服呼叫 GET /api/survey-responses/SR-20260211-005
    Then 回傳內容包含
      | 欄位                   | 預期                                                 |
      | submission_id         | SR-20260211-005                                     |
      | respondent            | 含姓名、Email、GitHub 使用者名稱                      |
      | answers[].question_code | 列出所有定義過的代碼，即使是被跳過的題目               |
      | answers[].value       | 受訪者提交的原始 JSON 字串                             |
      | reward_grant.status   | pending、granted、failed 並附時間戳                     |
    And 除授權角色外，敏感欄位皆會遮蔽
