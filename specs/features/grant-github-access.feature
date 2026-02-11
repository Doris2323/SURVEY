Feature: 問卷完成後授與 GitHub 儲存庫存取權
  為了兌現私有儲存庫贈品承諾
  作為自動化服務擁有者
  我希望驗證受訪者身分並自動邀請其成為協作者（具有 Read 權限）

  Background:
    Given 贈品儲存庫 slug 為「Doris2323/survey-gift」
    And 協作者邀請必須在 7 天內被接受
    And 自動化會以 `pending`、`granted` 或 `failed` 記錄每一次授權嘗試

  Scenario: 驗證通過後授與存取權
    Given 受訪者提交「SR-20260211-001」已被標記為 completed
    And 提交內容包含
      | 欄位                   | 值              |
      | respondent.email       | lin@example.com |
      | respondent.github_name | linpei          |
    And Email 與 Google Sheet 對應列一致
    And GitHub 顯示「linpei」是有效帳號
    When 自動化系統呼叫 GitHub Collaborators API
      | method | path                                              | body                   |
      | PUT    | /repos/Doris2323/survey-gift/collaborators/linpei | {"permission": "pull"} |
    Then GitHub 回傳 201 或 204
    And 自動化會把授權紀錄更新為 `granted`
    And 受訪者會收到包含儲存庫網址與接受提醒的 Email

  Scenario: 驗證失敗時拒絕授權
    Given 提交「SR-20260211-002」已標記為 completed
    And 系統紀錄 Email 為 lin@example.com 但受訪者在贈品頁輸入 lin@typo.com
    When 自動化比較身分資訊
    Then 驗證結果為 `email_mismatch`
    And 不會呼叫任何 GitHub API
    And 授權紀錄寫入 `failed`
    And 受訪者會看到指示其以註冊 Email 重試

  Scenario Outline: 每晚重試掛起的邀請
    Given 存在超過 24 小時仍為 pending 的授權紀錄
      | grant_id | github_name | status  | last_attempt_at   |
      | <grant>  | <handle>    | pending | <last_attempt_at> |
    And <handle> 的 GitHub 帳號仍有效
    When 排程器觸發邀請重試作業
    Then 自動化再次呼叫協作者 API
    And 若 GitHub 回應 201 或 204 則狀態改為 `granted`
    And 若 GitHub 回應 404 則狀態改為 `failed`

    Examples:
      | grant           | handle | last_attempt_at   |
      | GR-20260210-888 | suelyn | 2026-02-10T01:00Z |
      | GR-20260209-105 | ranwei | 2026-02-09T15:00Z |
