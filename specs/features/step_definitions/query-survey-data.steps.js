import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

const hasOwn = Object.prototype.hasOwnProperty;
const ANALYTICS_SECTIONS = ['basic', 'sdd_awareness'];
const DEFAULT_RESPONDENTS = {
  'SR-20260211-001': {
    respondent_id: 'RESP-20260211-001',
    full_name: 'Lin Pei',
    email: 'lin@example.com',
    github_name: 'linpei',
    career_stage: '入職 1 - 3 年',
    cs_major: true,
    compensation_band: 'IC2',
    organization_type: 'in-house',
    created_at: '2026-02-01T00:00:00Z'
  },
  'SR-20260211-002': {
    respondent_id: 'RESP-20260211-002',
    full_name: 'Chen Ilya',
    email: 'chen@example.com',
    github_name: 'chenilya',
    career_stage: '入職 3 - 5 年',
    cs_major: false,
    compensation_band: 'IC3',
    organization_type: 'consultant',
    created_at: '2026-02-01T00:00:00Z'
  }
};

const CAREER_STAGE_DISTRIBUTION = [
  { label: '入職 0 - 1 年', count: 20, percentage: '18.2%' },
  { label: '入職 1 - 3 年', count: 32, percentage: '29.1%' },
  { label: '3 ~5 年以上', count: 30, percentage: '27.3%' },
  { label: '5 年以上', count: 24, percentage: '21.8%' },
  { label: 'Tech Lead / Manager', count: 4, percentage: '3.6%' }
];

function normalizeForAssertion(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function getSheet(ctx, sheetName) {
  const ss = ctx.SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  assert.ok(sheet, `工作表 ${sheetName} 應該存在`);
  return sheet;
}

function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  const [headers] = sheet.getRange(1, 1, 1, lastCol).getValues();
  return headers;
}

function appendRecordsToSheet(ctx, sheetName, records) {
  if (!Array.isArray(records) || records.length === 0) return;
  const sheet = getSheet(ctx, sheetName);
  const headers = getHeaders(sheet);
  assert.ok(headers.length > 0, `工作表 ${sheetName} 缺少標題列`);
  records.forEach(record => {
    const row = headers.map(header => (hasOwn.call(record, header) ? record[header] : ''));
    sheet.appendRow(row);
  });
}

function seedPrimaryQuestionnaire(world) {
  if (world.primaryQuestionnaireId) {
    return world.primaryQuestionnaireId;
  }

  const questionnaireId = 'Q-2026-PRIMARY';
  appendRecordsToSheet(world.ctx, 'questionnaire', [{
    questionnaire_id: questionnaireId,
    version: 'v2026.02',
    status: 'active',
    section_order: JSON.stringify(ANALYTICS_SECTIONS),
    created_at: '2026-01-01T00:00:00Z',
    published_at: '2026-02-01T00:00:00Z'
  }]);

  world.primaryQuestionnaireId = questionnaireId;
  return questionnaireId;
}

function buildFallbackRespondent(submissionId, index) {
  const suffix = String(index + 1).padStart(3, '0');
  return {
    respondent_id: `RESP-${suffix}`,
    full_name: `User ${suffix}`,
    email: `user${suffix}@example.com`,
    github_name: `user${suffix}`,
    career_stage: '其他',
    cs_major: false,
    compensation_band: 'IC1',
    organization_type: 'startup',
    created_at: '2026-02-01T00:00:00Z'
  };
}

function buildSectionPayloads(profile) {
  return {
    basic: {
      full_name: profile.full_name,
      email: profile.email,
      github_name: profile.github_name
    },
    sdd_awareness: {
      aware_of_sdd: true,
      participated_before: false
    }
  };
}

function convertSectionsToQuestionAnswers(submissionId, sections) {
  const rows = [];
  Object.entries(sections).forEach(([sectionKey, sectionPayload], sectionIndex) => {
    Object.entries(sectionPayload).forEach(([fieldKey, value], fieldIndex) => {
      const questionCode = `${sectionKey}.${fieldKey}`;
      rows.push({
        answer_id: `${submissionId}-${questionCode}`,
        submission_id: submissionId,
        question_code: questionCode,
        answer_json: JSON.stringify({
          question_code: questionCode,
          value,
          metadata: { section: sectionKey }
        }),
        skipped_due_to: '',
        sheet_cell_ref: `${sectionIndex + 2}:${fieldIndex + 2}`,
        updated_at: '2026-02-11T00:00:00Z'
      });
    });
  });
  return rows;
}

Given('每筆問卷回覆皆以 `submission_id` 為索引', function () {
  const headers = getHeaders(getSheet(this.ctx, 'survey_response'));
  assert.ok(headers.includes('submission_id'), 'survey_response 應包含 submission_id 欄位');
});

Given('每題答案都以包含 `question_code`、`value`、`metadata` 的 JSON 儲存', function () {
  const headers = getHeaders(getSheet(this.ctx, 'question_answer'));
  assert.ok(headers.includes('answer_json'), 'question_answer 應儲存 JSON 原文');
  this.expectedAnswerPayloadKeys = ['question_code', 'value', 'metadata'];
});

Given('Google Sheets 中有 {int} 筆 completed 的提交', function (expectedCount, dataTable) {
  const records = dataTable.hashes();
  assert.strictEqual(records.length, expectedCount, '提交數量與表格列數不符');

  const questionnaireId = seedPrimaryQuestionnaire(this);
  this.seededSubmissions = [];
  this.seededSectionPayloads = {};

  records.forEach((row, index) => {
    const submissionId = row.submission_id;
    const respondentProfile = DEFAULT_RESPONDENTS[submissionId] || buildFallbackRespondent(submissionId, index);

    appendRecordsToSheet(this.ctx, 'respondent', [respondentProfile]);
    appendRecordsToSheet(this.ctx, 'survey_response', [{
      submission_id: submissionId,
      questionnaire_id: questionnaireId,
      respondent_id: respondentProfile.respondent_id,
      questionnaire_version: 'v2026.02',
      submitted_at: row.submitted_at,
      submitted_from: 'web',
      completion_status: 'completed',
      has_reward_grant: false
    }]);

    const sections = buildSectionPayloads(respondentProfile);
    this.seededSectionPayloads[submissionId] = sections;
    const qaRows = convertSectionsToQuestionAnswers(submissionId, sections);
    appendRecordsToSheet(this.ctx, 'question_answer', qaRows);

    this.seededSubmissions.push({
      submission_id: submissionId,
      respondent: {
        full_name: respondentProfile.full_name,
        email: respondentProfile.email,
        github_name: respondentProfile.github_name
      }
    });
  });
});

When(/^分析師呼叫 GET \/api\/survey-responses\?limit=(\d+)&cursor=(.*)$/, function (limit, cursor) {
  const params = {
    limit: Number(limit),
    cursor: cursor || undefined
  };
  this.latestListParams = params;
  this.latestResponse = this.ctx.getSurveyResponses(params);
});

Then('API 會以 HTTP 200 回傳下列內容', function (_docString) {
  assert.ok(this.latestResponse, 'API 應該回傳結果');
  const status = this.latestResponse.statusCode ?? this.latestResponse.status;
  assert.strictEqual(status, 200, '列表 API 應回傳 HTTP 200');

  const body = this.latestResponse.body ?? this.latestResponse;
  assert.ok(body.page, '回應應包含 page 物件');
  assert.strictEqual(body.page.limit, this.latestListParams.limit, 'page.limit 應回應查詢參數');
  assert.strictEqual(body.page.next_cursor, 'eyJvZmZzZXQiOjJ9', 'next_cursor 應提供穩定指標');

  assert.ok(Array.isArray(body.data) && body.data.length > 0, '回應應包含資料列');
  const firstRow = body.data[0];
  assert.strictEqual(firstRow.submission_id, 'SR-20260211-001');
  const normalizedRespondent = normalizeForAssertion(firstRow.respondent);
  assert.deepStrictEqual(normalizedRespondent, this.seededSubmissions[0].respondent);
  assert.ok(firstRow.sections?.basic, 'sections.basic 應存在');
});

Then('每筆回應都包含依 question_code 儲存的完整段落 JSON', function () {
  const body = this.latestResponse.body ?? this.latestResponse;
  assert.ok(Array.isArray(body?.data), '列表回應應包含 data 陣列');

  body.data.forEach(record => {
    const seededSections = this.seededSectionPayloads?.[record.submission_id];
    assert.ok(record.sections, `submission ${record.submission_id} 應包含 sections`);
    if (seededSections) {
      Object.entries(seededSections).forEach(([sectionKey, expectedSection]) => {
        const normalizedSection = normalizeForAssertion(record.sections[sectionKey]);
        assert.deepStrictEqual(normalizedSection, expectedSection, `${sectionKey} 段落應與題目答案一致`);
      });
    }
  });
});

Given('系統已儲存 question_code「career_stage」的答案', function () {
  const questionnaireId = seedPrimaryQuestionnaire(this);
  let counter = 0;

  CAREER_STAGE_DISTRIBUTION.forEach(option => {
    for (let i = 0; i < option.count; i += 1) {
      counter += 1;
      const suffix = String(counter).padStart(3, '0');
      const submissionId = `SR-AGG-${suffix}`;
      const respondentId = `RESP-AGG-${suffix}`;

      appendRecordsToSheet(this.ctx, 'respondent', [{
        respondent_id: respondentId,
        full_name: `Aggregate User ${suffix}`,
        email: `agg${suffix}@example.com`,
        github_name: `agg${suffix}`,
        career_stage: option.label,
        cs_major: i % 2 === 0,
        compensation_band: 'IC2',
        organization_type: 'hybrid',
        created_at: '2026-02-01T00:00:00Z'
      }]);

      appendRecordsToSheet(this.ctx, 'survey_response', [{
        submission_id: submissionId,
        questionnaire_id: questionnaireId,
        respondent_id: respondentId,
        questionnaire_version: 'v2026.02',
        submitted_at: `2026-02-11T0${(i % 9) + 1}:00:00Z`,
        submitted_from: 'web',
        completion_status: 'completed',
        has_reward_grant: i % 3 === 0
      }]);

      appendRecordsToSheet(this.ctx, 'question_answer', [{
        answer_id: `${submissionId}-career_stage`,
        submission_id: submissionId,
        question_code: 'career_stage',
        answer_json: JSON.stringify({
          question_code: 'career_stage',
          value: option.label,
          metadata: {
            option_label: option.label,
            recorded_at: '2026-02-11T00:00:00Z'
          }
        }),
        skipped_due_to: '',
        sheet_cell_ref: `B${counter + 1}`,
        updated_at: '2026-02-11T00:00:00Z'
      }]);
    }
  });
});

When(/^分析師呼叫 GET \/api\/survey-responses\/aggregations\?question_code=career_stage$/, function () {
  const params = { question_code: 'career_stage' };
  this.lastAggregationParams = params;
  this.aggregationResponse = this.ctx.getSurveyResponseAggregations(params);
});

Then('回傳內容包含各選項的數量與百分比', function (dataTable) {
  assert.ok(this.aggregationResponse, '聚合 API 應回傳結果');
  const status = this.aggregationResponse.statusCode ?? this.aggregationResponse.status;
  assert.strictEqual(status, 200, '聚合 API 應回傳 HTTP 200');

  const body = this.aggregationResponse.body ?? this.aggregationResponse;
  const breakdown = body.breakdown ?? body.data;
  assert.ok(Array.isArray(breakdown), '聚合結果應包含 breakdown 陣列');

  const expected = dataTable.hashes().map(row => ({
    option: row['選項'].trim(),
    count: Number(row['數量']),
    percentage: row['百分比'].trim()
  }));
  const normalizedBreakdown = normalizeForAssertion(breakdown);
  assert.deepStrictEqual(normalizedBreakdown, expected, '聚合結果應完整對應規格表');
});

Then('查詢可搭配 `submitted_after` 或 `has_reward_grant` 等參數', function () {
  const params = {
    question_code: 'career_stage',
    submitted_after: '2026-02-01T00:00:00Z',
    has_reward_grant: true
  };
  this.filteredAggregationResponse = this.ctx.getSurveyResponseAggregations(params);
  assert.ok(this.filteredAggregationResponse, '聚合 API 應接受進階篩選');
  const status = this.filteredAggregationResponse.statusCode ?? this.filteredAggregationResponse.status;
  assert.strictEqual(status, 200, '帶篩選條件時仍應成功');
});

Given(/^客服需要排查提交「(.+)」$/, function (submissionId) {
  const questionnaireId = seedPrimaryQuestionnaire(this);
  const respondentProfile = {
    respondent_id: 'RESP-DETAIL-001',
    full_name: 'Casey Support',
    email: 'casey@example.com',
    github_name: 'casey',
    career_stage: '3 ~5 年以上',
    cs_major: true,
    compensation_band: 'IC3',
    organization_type: 'vendor',
    created_at: '2026-01-10T00:00:00Z'
  };

  appendRecordsToSheet(this.ctx, 'respondent', [respondentProfile]);
  appendRecordsToSheet(this.ctx, 'survey_response', [{
    submission_id: submissionId,
    questionnaire_id: questionnaireId,
    respondent_id: respondentProfile.respondent_id,
    questionnaire_version: 'v2026.02',
    submitted_at: '2026-02-11T02:00:00Z',
    submitted_from: 'admin',
    completion_status: 'completed',
    has_reward_grant: true
  }]);

  const answerPayloads = [
    { section: 'basic', code: 'basic.full_name', value: JSON.stringify({ text: 'Casey Support' }) },
    { section: 'basic', code: 'basic.email', value: JSON.stringify({ text: 'casey@example.com' }) },
    { section: 'basic', code: 'basic.github_name', value: JSON.stringify({ text: 'casey' }) },
    { section: 'ops', code: 'ops.need_follow_up', value: JSON.stringify({ bool: true }) }
  ];

  this.detailAnswerCodes = answerPayloads.map(item => item.code);
  this.detailAnswerRawValues = answerPayloads.map(item => item.value);

  appendRecordsToSheet(this.ctx, 'question_answer', answerPayloads.map((item, index) => ({
    answer_id: `${submissionId}-${index + 1}`,
    submission_id: submissionId,
    question_code: item.code,
    answer_json: item.value,
    skipped_due_to: '',
    sheet_cell_ref: `D${index + 2}`,
    updated_at: '2026-02-11T02:30:00Z'
  })));

  appendRecordsToSheet(this.ctx, 'reward_grant', [{
    grant_id: 'GRANT-0001',
    submission_id: submissionId,
    github_name: respondentProfile.github_name,
    email: respondentProfile.email,
    status: 'pending',
    failure_reason: '',
    last_attempt_at: '2026-02-11T03:00:00Z',
    granted_at: ''
  }]);

  this.detailSubmissionId = submissionId;
  this.detailRespondentProfile = respondentProfile;
});

When(/^客服呼叫 GET \/api\/survey-responses\/(SR-[0-9-]+)$/, function (submissionId) {
  this.detailResponse = this.ctx.getSurveyResponseDetail(submissionId);
});

Then('回傳內容包含', function (dataTable) {
  assert.ok(this.detailResponse, '客服查詢應回傳結果');
  const status = this.detailResponse.statusCode ?? this.detailResponse.status;
  assert.strictEqual(status, 200, '客服查詢應成功');
  const body = this.detailResponse.body ?? this.detailResponse;

  dataTable.hashes().forEach(row => {
    const field = row['欄位'];
    const expectation = row['預期'].trim();
    switch (field) {
      case 'submission_id':
        assert.strictEqual(body.submission_id, expectation);
        break;
      case 'respondent':
        assert.ok(body.respondent, '應包含 respondent 物件');
        ['full_name', 'email', 'github_name'].forEach(key => {
          assert.ok(body.respondent[key], `respondent.${key} 應存在`);
        });
        break;
      case 'answers[].question_code':
        assert.deepStrictEqual(body.answers?.map(ans => ans.question_code), this.detailAnswerCodes);
        break;
      case 'answers[].value':
        assert.deepStrictEqual(body.answers?.map(ans => ans.value), this.detailAnswerRawValues);
        break;
      case 'reward_grant.status':
        assert.ok(body.reward_grant, '應包含 reward_grant 資訊');
        assert.ok(['pending', 'granted', 'failed'].includes(body.reward_grant.status), 'status 應在允許值內');
        assert.ok(body.reward_grant.last_attempt_at || body.reward_grant.granted_at, '應附帶時間戳');
        break;
      default:
        throw new Error(`未處理的欄位期望: ${field}`);
    }
  });
});

Then('除授權角色外，敏感欄位皆會遮蔽', function () {
  const body = this.detailResponse.body ?? this.detailResponse;
  assert.ok(body?.respondent, '應提供 respondent 物件以套用遮蔽');
  assert.match(body.respondent.email, /\*\*\*/, 'Email 應以 *** 遮蔽');
  assert.match(body.respondent.github_name, /\*\*\*/, 'GitHub 名稱應以 *** 遮蔽');
});
