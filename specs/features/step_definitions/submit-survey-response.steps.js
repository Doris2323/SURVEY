import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

function ensureFunction(ctx, name) {
  if (!ctx || typeof ctx[name] !== 'function') {
    throw new Error(`請在 GAS 環境中實作 ${name}()，以支援 submit-survey-response.feature`);
  }
  return ctx[name].bind(ctx);
}

function parseStructuredValue(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed.length) return '';
  const looksJson =
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'));
  if (looksJson) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      // fall through to return trimmed text
    }
  }
  return trimmed;
}

function tableToPayload(dataTable) {
  const rows = dataTable.rowsHash();
  const payload = {};
  Object.entries(rows).forEach(([key, value]) => {
    payload[key.trim()] = parseStructuredValue(value);
  });
  return payload;
}

Given(/^「Spec Habit Survey」問卷版本為「([^」]+)」$/, function(version) {
  this.activeQuestionnaireVersion = version;
});

Given('問卷切分為下列段落', function(dataTable) {
  this.questionnaireSections = dataTable.hashes();
});

Given('每題皆定義 question_code 欄位', function() {
  this.questionCodeDefined = true;
});

Given('Google Sheets 會為每位受訪者及 question_code 保留一格 JSON', function() {
  this.sheetStoragePolicyReady = true;
});

Given('受訪者在網頁上開啟導引式問卷表單', function() {
  const startSession = ensureFunction(this.ctx, 'startSurveySession');
  this.surveySession = startSession();
});

Given('系統已先驗證身分區塊的 Email 格式與 GitHub 使用者名稱模式', function() {
  const prevalidate = ensureFunction(this.ctx, 'prevalidateRespondentIdentityBlock');
  this.identityCheck = prevalidate(this.surveySession);
});

When('受訪者以上述資料送出問卷', function(dataTable) {
  const payload = tableToPayload(dataTable);
  const submit = ensureFunction(this.ctx, 'submitSurveyResponse');
  const result = submit(payload);
  this.submissionResult = result;
  this.lastSubmissionId = result?.submission_id ?? result?.submissionId ?? null;
  assert.ok(this.lastSubmissionId, '提交後應該回傳 submission_id');
});

Then('系統確認所有段落的必填題皆恰好作答一次', function() {
  const assertMandatory = ensureFunction(this.ctx, 'assertAllMandatorySectionsAnswered');
  assertMandatory(this.lastSubmissionId);
});

Then('系統會依問卷列與 question_code 將 JSON 寫入對應儲存格', function() {
  const verifyStorage = ensureFunction(this.ctx, 'verifySubmissionAnswersPersisted');
  verifyStorage(this.lastSubmissionId);
});

Then('提交狀態標記為 completed 並記錄時間戳記', function() {
  const getStatus = ensureFunction(this.ctx, 'getSubmissionStatus');
  const status = getStatus(this.lastSubmissionId);
  assert.strictEqual(status, 'completed');
});

Then('受訪者看到成功頁面並告知後續 GitHub 贈品驗證', function() {
  const getSuccessState = ensureFunction(this.ctx, 'getSubmissionSuccessState');
  const state = getSuccessState(this.lastSubmissionId);
  const message = typeof state === 'string' ? state : state?.message;
  assert.ok(message, '應該回傳成功訊息');
  assert.match(message, /GitHub/, '成功訊息需提到 GitHub 贈品驗證');
});

Given('受訪者在「目前是否導入 AI 工作流程」選擇「否」', function() {
  const setPreference = ensureFunction(this.ctx, 'setAiWorkflowPreference');
  this.aiPreference = setPreference('否');
});

When('受訪者留空所有後續 AI 導入相關題目', function() {
  const submitFollowUps = ensureFunction(this.ctx, 'submitAiAdoptionFollowUps');
  const result = submitFollowUps(this.aiPreference, []);
  this.aiSkipSubmissionId = result?.submission_id ?? result?.submissionId ?? this.aiPreference?.submission_id ?? null;
  assert.ok(this.aiSkipSubmissionId, '應該能取得掛勾的 submission_id');
});

Then('問卷引擎會在介面中隱藏這些題目', function() {
  const isHidden = ensureFunction(this.ctx, 'areAiFollowUpQuestionsHidden');
  assert.ok(isHidden(this.aiSkipSubmissionId), 'AI 導入後續題目應被隱藏');
});

Then('因為滿足跳題條件所以驗證仍通過', function() {
  const validate = ensureFunction(this.ctx, 'validateSkipLogicCompliance');
  validate(this.aiSkipSubmissionId);
});

When(/^受訪者在多選題「目前最困擾的工作情境」選擇 (.+)$/, function(selectionsRaw) {
  const selections = parseStructuredValue(selectionsRaw);
  assert.ok(Array.isArray(selections), '多選題資料必須為陣列 JSON');
  this.workflowConfusionSelections = selections;
  this.workflowConfusionQuestion = '目前最困擾的工作情境';
});

When('為動態顯示的文字欄位填寫 {string}', function(otherTextRaw) {
  const otherText = parseStructuredValue(otherTextRaw);
  const recordAnswer = ensureFunction(this.ctx, 'recordWorkflowConfusionAnswer');
  const result = recordAnswer({
    question: this.workflowConfusionQuestion,
    selections: this.workflowConfusionSelections,
    other_text: otherText
  });
  this.multiSelectSubmissionId = result?.submission_id ?? result?.submissionId ?? null;
});

Then('儲存的 JSON 陣列包含', function(dataTable) {
  const expectations = dataTable.hashes();
  const fetchAnswer = ensureFunction(this.ctx, 'getWorkflowConfusionAnswerPayload');
  const stored = fetchAnswer(this.multiSelectSubmissionId, this.workflowConfusionQuestion);
  assert.ok(stored, '應該能取得多選題儲存結果');
  expectations.forEach(row => {
    const key = row.key?.trim();
    const expectedValue = parseStructuredValue(row.value);
    assert.deepStrictEqual(stored[key], expectedValue);
  });
});

Then('分析匯出會保留自由文字內容', function() {
  const includeFreeText = ensureFunction(this.ctx, 'isWorkflowConfusionFreeTextIncluded');
  assert.ok(includeFreeText(this.workflowConfusionQuestion));
});

Then(/^被跳過 question_code 的 JSON 儲存為 `\{ "skipped_due_to": "ai_not_adopted" \}`$/, function() {
  const getMetadata = ensureFunction(this.ctx, 'getSkippedQuestionMetadata');
  const metadata = getMetadata(this.aiSkipSubmissionId);
  assert.ok(Array.isArray(metadata) && metadata.length > 0, '應回傳跳題紀錄');
  metadata.forEach(entry => {
    assert.strictEqual(entry.skipped_due_to, 'ai_not_adopted');
  });
});
