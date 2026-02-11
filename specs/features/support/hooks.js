import { Before } from '@cucumber/cucumber';
import { loadGasCodeForTesting } from '../../../lib/gas-loader.js';

const SHEETS_CONFIG = {
  questionnaire: [
    'questionnaire_id',
    'version',
    'status',
    'section_order',
    'created_at',
    'published_at'
  ],
  respondent: [
    'respondent_id',
    'full_name',
    'email',
    'github_name',
    'career_stage',
    'cs_major',
    'compensation_band',
    'organization_type',
    'created_at'
  ],
  survey_response: [
    'submission_id',
    'questionnaire_id',
    'respondent_id',
    'questionnaire_version',
    'submitted_at',
    'submitted_from',
    'completion_status',
    'has_reward_grant'
  ],
  question_answer: [
    'answer_id',
    'submission_id',
    'question_code',
    'answer_json',
    'skipped_due_to',
    'sheet_cell_ref',
    'updated_at'
  ],
  reward_grant: [
    'grant_id',
    'submission_id',
    'github_name',
    'email',
    'status',
    'failure_reason',
    'last_attempt_at',
    'granted_at'
  ],
  audit_event: [
    'event_id',
    'submission_id',
    'event_type',
    'payload',
    'created_at'
  ]
};

/**
 * 全局 Before hook - 所有 scenario 執行前自動載入 GAS 測試環境
 */
Before(function() {
  const ctx = loadGasCodeForTesting({
    sheets: SHEETS_CONFIG
  });

  // Clear all sheets for test isolation
  const ss = ctx.SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS_CONFIG).forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) sheet.clear();
  });

  // 設定默認的 mock 時間
  ctx._setMockTime('2026/1/27上午10:00:00');

  this.ctx = ctx;
});
