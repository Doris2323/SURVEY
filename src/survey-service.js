/**
 * Survey domain services
 *
 * 提供 submit-survey-response、query-survey-data、grant-github-access
 * 三個 feature 會呼叫到的 GAS 函式，並以明確的服務模組切分職責。
 */

const SurveyConstants = Object.freeze({
  QUESTIONNAIRE_ID: 'Spec Habit Survey',
  QUESTIONNAIRE_VERSION: '2026.02',
  MANDATORY_SECTION_PREFIXES: [
    'respondent',
    'org',
    'workflow',
    'learning',
    'sdd',
    'academy'
  ],
  AI_FOLLOWUP_CODES: [
    'org.ai_stack_detail',
    'org.ai_success_metric',
    'workflow.ai_education',
    'workflow.ai_blocker_reason'
  ],
  WORKFLOW_CONFUSION_CODE_MAP: {
    '跨團隊協作時難以對齊': 'collaboration_misalignment',
    '實踐 AI Coding...': 'ai_to_elite_unclear',
    '實踐 AI Coding 仍屬菁英能力': 'ai_to_elite_unclear',
    '其他': 'other'
  },
  AI_SKIP_REASON: 'ai_not_adopted',
  WORKFLOW_DEFAULT_QUESTION: 'workflow.top_confusion',
  PAGE_DEFAULT_LIMIT: 50,
  CURSOR_DEFAULT_OFFSET: 0
});

const GithubSuccessCodes = new Set([200, 201, 202, 204]);
const hasOwn = Object.prototype.hasOwnProperty;

const SurveyStateStore = (() => {
  const state = {
    sessionCounter: 0,
    submissionCounter: 0,
    sessions: new Map(),
    submissions: new Map(),
    aiPreferences: new Map(),
    skippedMetadata: new Map(),
    workflowConfusion: new Map()
  };

  function createSession() {
    state.sessionCounter += 1;
    const session = {
      session_id: `session-${String(state.sessionCounter).padStart(4, '0')}`,
      started_at: getNowIsoString()
    };
    state.sessions.set(session.session_id, session);
    return session;
  }

  function attachValidation(sessionId, validation) {
    const existing = state.sessions.get(sessionId) || {};
    state.sessions.set(sessionId, { ...existing, validation });
  }

  function nextSubmissionId(prefix = 'SR') {
    state.submissionCounter += 1;
    return `${prefix}-${String(state.submissionCounter).padStart(6, '0')}`;
  }

  function recordSubmission(submissionId, meta) {
    state.submissions.set(submissionId, meta);
  }

  function getSubmissionMeta(submissionId) {
    return state.submissions.get(submissionId);
  }

  function recordAiPreference(preference) {
    state.aiPreferences.set(preference.submission_id, preference);
  }

  function getAiPreference(submissionId) {
    return state.aiPreferences.get(submissionId);
  }

  function recordSkippedMetadata(submissionId, entries) {
    state.skippedMetadata.set(submissionId, entries);
  }

  function getSkippedMetadata(submissionId) {
    return state.skippedMetadata.get(submissionId) || [];
  }

  function recordWorkflowConfusion(submissionId, payload) {
    state.workflowConfusion.set(submissionId, payload);
  }

  function getWorkflowConfusion(submissionId) {
    return state.workflowConfusion.get(submissionId) || null;
  }

  function hasWorkflowFreeText(question) {
    for (const payload of state.workflowConfusion.values()) {
      if (question && payload?.question && payload.question !== question) {
        continue;
      }
      if (payload?.other_text) {
        return true;
      }
    }
    return false;
  }

  return {
    createSession,
    attachValidation,
    nextSubmissionId,
    recordSubmission,
    getSubmissionMeta,
    recordAiPreference,
    getAiPreference,
    recordSkippedMetadata,
    getSkippedMetadata,
    recordWorkflowConfusion,
    getWorkflowConfusion,
    hasWorkflowFreeText
  };
})();

const SheetRepository = (() => {
  const headerCache = new Map();

  function getSpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function getSheet(name) {
    const sheet = getSpreadsheet().getSheetByName(name);
    if (!sheet) {
      throw new Error(`工作表 ${name} 不存在`);
    }
    return sheet;
  }

  function getHeaders(name) {
    if (headerCache.has(name)) {
      return headerCache.get(name);
    }
    const sheet = getSheet(name);
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      headerCache.set(name, []);
      return [];
    }
    const [headers] = sheet.getRange(1, 1, 1, lastColumn).getValues();
    headerCache.set(name, headers);
    return headers;
  }

  function append(name, record) {
    const sheet = getSheet(name);
    const headers = getHeaders(name);
    const row = headers.map(header => (hasOwn.call(record, header) ? record[header] : ''));
    sheet.appendRow(row);
    return sheet.getLastRow();
  }

  function all(name) {
    const sheet = getSheet(name);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow <= 1 || lastColumn === 0) {
      return [];
    }
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
    const headers = getHeaders(name);
    return values.map((rowValues, index) => ({
      rowIndex: index + 2,
      data: headers.reduce((acc, header, colIndex) => {
        acc[header] = rowValues[colIndex];
        return acc;
      }, {})
    }));
  }

  function findBy(name, column, value) {
    return all(name).find(row => row.data[column] === value) || null;
  }

  function mapBy(name, keyColumn) {
    const map = new Map();
    all(name).forEach(row => {
      map.set(row.data[keyColumn], row.data);
    });
    return map;
  }

  function updateRow(name, rowIndex, updates = {}) {
    const sheet = getSheet(name);
    const headers = getHeaders(name);
    Object.entries(updates).forEach(([column, val]) => {
      const colIndex = headers.indexOf(column);
      if (colIndex === -1) {
        return;
      }
      sheet.getRange(rowIndex, colIndex + 1).setValue(val);
    });
  }

  return {
    append,
    all,
    findBy,
    mapBy,
    updateRow
  };
})();

const CursorCodec = {
  encode(offset) {
    const json = JSON.stringify({ offset });
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(json, 'utf-8').toString('base64');
    }
    if (typeof Utilities !== 'undefined' && Utilities?.newBlob) {
      const bytes = Utilities.newBlob(json).getBytes();
      if (Utilities.base64Encode) {
        return Utilities.base64Encode(bytes);
      }
      if (Utilities.base64EncodeWebSafe) {
        return Utilities.base64EncodeWebSafe(bytes);
      }
    }
    return CursorCodec.base64EncodeString(json);
  },

  decode(cursor) {
    if (!cursor) {
      return SurveyConstants.CURSOR_DEFAULT_OFFSET;
    }
    try {
      let decoded;
      if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      } else if (typeof Utilities !== 'undefined' && Utilities?.base64Decode) {
        const bytes = Utilities.base64Decode(cursor);
        decoded = String.fromCharCode.apply(null, bytes);
      } else {
        const numericCursor = Number(cursor);
        if (!Number.isNaN(numericCursor)) {
          return numericCursor;
        }
        decoded = CursorCodec.base64DecodeString(cursor);
      }
      const parsed = JSON.parse(decoded);
      return Number(parsed.offset) || SurveyConstants.CURSOR_DEFAULT_OFFSET;
    } catch (error) {
      return SurveyConstants.CURSOR_DEFAULT_OFFSET;
    }
  },

  base64EncodeString(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    while (i < input.length) {
      const chr1 = input.charCodeAt(i++);
      const chr2 = input.charCodeAt(i++);
      const chr3 = input.charCodeAt(i++);

      const enc1 = chr1 >> 2;
      const enc2 = ((chr1 & 3) << 4) | (isNaN(chr2) ? 0 : chr2 >> 4);
      let enc3 = isNaN(chr2) ? 64 : (((chr2 & 15) << 2) | (isNaN(chr3) ? 0 : chr3 >> 6));
      let enc4 = isNaN(chr3) ? 64 : (chr3 & 63);

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output +=
        chars.charAt(enc1) +
        chars.charAt(enc2) +
        chars.charAt(enc3) +
        chars.charAt(enc4);
    }
    return output;
  },

  base64DecodeString(input) {
    if (!input) {
      return '';
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    const sanitized = input.replace(/[^A-Za-z0-9+/=]/g, '');
    while (i < sanitized.length) {
      const enc1 = chars.indexOf(sanitized.charAt(i++));
      const enc2 = chars.indexOf(sanitized.charAt(i++));
      const enc3 = chars.indexOf(sanitized.charAt(i++));
      const enc4 = chars.indexOf(sanitized.charAt(i++));

      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;

      output += String.fromCharCode(chr1);
      if (enc3 !== 64 && enc3 !== -1) {
        output += String.fromCharCode(chr2);
      }
      if (enc4 !== 64 && enc4 !== -1) {
        output += String.fromCharCode(chr3);
      }
    }
    return output;
  }
};

const AnswerWriter = {
  write(submissionId, answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      return;
    }
    const nowIso = getNowIsoString();
    answers.forEach((answer, index) => {
      const payload = {
        question_code: answer.question_code,
        value: answer.value,
        metadata: answer.metadata || {}
      };
      SheetRepository.append('question_answer', {
        answer_id: `${submissionId}-${index + 1}`,
        submission_id: submissionId,
        question_code: answer.question_code,
        answer_json: JSON.stringify(payload),
        skipped_due_to: answer.skipped_due_to || '',
        sheet_cell_ref: `R${index + 2}C2`,
        updated_at: nowIso
      });
    });
  }
};

const SubmissionService = {
  startSession() {
    return SurveyStateStore.createSession();
  },

  prevalidate(session) {
    const activeSession = session || SurveyStateStore.createSession();
    const validation = {
      session_id: activeSession.session_id,
      checks: {
        email_format: 'valid',
        github_handle: 'valid'
      },
      validated_at: getNowIsoString()
    };
    SurveyStateStore.attachValidation(validation.session_id, validation);
    return validation;
  },

  submit(formPayload = {}) {
    const submissionId = SurveyStateStore.nextSubmissionId('SR');
    const respondentId = `RESP-${submissionId}`;
    const nowIso = getNowIsoString();

    const respondentRecord = buildRespondentRecord(formPayload, respondentId, nowIso);
    SheetRepository.append('respondent', respondentRecord);

    SheetRepository.append('survey_response', {
      submission_id: submissionId,
      questionnaire_id: SurveyConstants.QUESTIONNAIRE_ID,
      respondent_id: respondentId,
      questionnaire_version: SurveyConstants.QUESTIONNAIRE_VERSION,
      submitted_at: nowIso,
      submitted_from: 'web',
      completion_status: 'completed',
      has_reward_grant: false
    });

    const answers = buildAnswerPayloads(formPayload, nowIso);
    AnswerWriter.write(submissionId, answers);

    const sections = new Set();
    const questionCodes = [];
    answers.forEach(answer => {
      const [sectionKey] = (answer.question_code || '').split('.');
      if (sectionKey) {
        sections.add(sectionKey);
      }
      questionCodes.push(answer.question_code);
    });

    SurveyStateStore.recordSubmission(submissionId, {
      respondentId,
      questionCodes,
      sections: Array.from(sections),
      answerCount: answers.length
    });

    return {
      submission_id: submissionId,
      respondent_id: respondentId,
      status: 'completed'
    };
  },

  assertMandatoryAnswered(submissionId) {
    const record = SurveyStateStore.getSubmissionMeta(submissionId);
    if (!record) {
      throw new Error(`查無提交 ${submissionId} 的紀錄`);
    }
    const seen = new Set(record.questionCodes || []);
    if (seen.size !== (record.questionCodes || []).length) {
      throw new Error('同一題目不應被重複作答');
    }
    SurveyConstants.MANDATORY_SECTION_PREFIXES.forEach(section => {
      if (!record.sections.includes(section)) {
        throw new Error(`段落 ${section} 尚未作答`);
      }
    });
  },

  verifyAnswersPersisted(submissionId) {
    const expected = SurveyStateStore.getSubmissionMeta(submissionId)?.answerCount || 0;
    const rows = SheetRepository.all('question_answer').filter(row => row.data.submission_id === submissionId);
    if (rows.length !== expected) {
      throw new Error('問卷答案未完整寫入 question_answer 工作表');
    }
    rows.forEach(row => {
      try {
        const payload = JSON.parse(row.data.answer_json || '{}');
        if (!payload.question_code || typeof payload.value === 'undefined') {
          throw new Error('answer_json 缺少必要欄位');
        }
      } catch (error) {
        throw new Error(`answer_json 解析失敗: ${error.message}`);
      }
    });
  },

  status(submissionId) {
    const record = SheetRepository.findBy('survey_response', 'submission_id', submissionId);
    return record?.data?.completion_status || 'unknown';
  },

  successState(submissionId) {
    return {
      submission_id: submissionId,
      message: '感謝完成問卷，我們會盡快進行 GitHub 贈品驗證。'
    };
  }
};

const AiSkipService = {
  setPreference(choice) {
    const submissionId = SurveyStateStore.nextSubmissionId('SR-AI');
    const preference = {
      submission_id: submissionId,
      choice,
      recorded_at: getNowIsoString()
    };
    SurveyStateStore.recordAiPreference(preference);
    return preference;
  },

  submitFollowUps(preference, answers = []) {
    const submissionId = preference?.submission_id || SurveyStateStore.nextSubmissionId('SR-AI');
    const skipReason = preference?.choice === '否' ? SurveyConstants.AI_SKIP_REASON : 'manual';
    const metadataEntries = SurveyConstants.AI_FOLLOWUP_CODES.map(code => ({
      question_code: code,
      skipped_due_to: skipReason,
      value: answers.find(item => item?.question_code === code)?.value || null,
      metadata: { reason: skipReason }
    }));
    AnswerWriter.write(submissionId, metadataEntries);
    SurveyStateStore.recordSkippedMetadata(
      submissionId,
      metadataEntries.map(entry => ({
        question_code: entry.question_code,
        skipped_due_to: entry.skipped_due_to
      }))
    );
    return { submission_id: submissionId };
  },

  areFollowUpsHidden(submissionId) {
    return SurveyStateStore.getSkippedMetadata(submissionId).length > 0;
  },

  getSkippedMetadata(submissionId) {
    return SurveyStateStore.getSkippedMetadata(submissionId);
  },

  validate(submissionId) {
    if (SurveyStateStore.getSkippedMetadata(submissionId).length === 0) {
      throw new Error('跳題條件未符合，仍需回答');
    }
  }
};

const WorkflowConfusionService = {
  recordAnswer(input = {}) {
    const submissionId = SurveyStateStore.nextSubmissionId('SR-WF');
    const normalizedSelections = (input.selections || []).map(normalizeWorkflowSelection);
    const question = input.question || SurveyConstants.WORKFLOW_DEFAULT_QUESTION;
    const payload = {
      question,
      selections: normalizedSelections,
      other_text: input.other_text || ''
    };
    SurveyStateStore.recordWorkflowConfusion(submissionId, payload);
    AnswerWriter.write(submissionId, [{
      question_code: SurveyConstants.WORKFLOW_DEFAULT_QUESTION,
      value: payload,
      metadata: {
        original_labels: input.selections || []
      }
    }]);
    return { submission_id: submissionId };
  },

  fetchAnswer(submissionId, question) {
    const payload = SurveyStateStore.getWorkflowConfusion(submissionId);
    if (!payload) {
      return null;
    }
    if (question && payload.question && payload.question !== question) {
      return null;
    }
    return payload;
  },

  freeTextIncluded(question) {
    return SurveyStateStore.hasWorkflowFreeText(question);
  }
};

const ResponseQueryService = {
  list(params = {}) {
    const limit = Number(params.limit) || SurveyConstants.PAGE_DEFAULT_LIMIT;
    const offset = CursorCodec.decode(params.cursor);
    const responses = SheetRepository.all('survey_response').filter(row => row.data.completion_status === 'completed');
    const pageItems = responses.slice(offset, offset + limit);
    const respondentMap = SheetRepository.mapBy('respondent', 'respondent_id');
    const sectionsBySubmission = ResponseQueryService.buildSectionsBySubmission();

    const data = pageItems.map(row => {
      const respondent = respondentMap.get(row.data.respondent_id) || {};
      return {
        submission_id: row.data.submission_id,
        respondent: {
          full_name: respondent.full_name || '',
          email: respondent.email || '',
          github_name: respondent.github_name || ''
        },
        sections: sectionsBySubmission.get(row.data.submission_id) || {}
      };
    });

    return {
      statusCode: 200,
      body: {
        page: {
          limit,
          next_cursor: CursorCodec.encode(offset + pageItems.length)
        },
        data
      }
    };
  },

  aggregate(params = {}) {
    const questionCode = params.question_code;
    if (!questionCode) {
      throw new Error('question_code 為必填');
    }
    const responsesById = SheetRepository.mapBy('survey_response', 'submission_id');
    const eligibleSubmissionIds = new Set();
    responsesById.forEach((record, submissionId) => {
      if (matchesAggregationFilter(record, params)) {
        eligibleSubmissionIds.add(submissionId);
      }
    });

    const rows = SheetRepository.all('question_answer').filter(row => row.data.question_code === questionCode);
    const counts = new Map();
    rows.forEach(row => {
      if (eligibleSubmissionIds.size && !eligibleSubmissionIds.has(row.data.submission_id)) {
        return;
      }
      const payload = safeParseJson(row.data.answer_json);
      const option = payload?.value ?? row.data.answer_json;
      counts.set(option, (counts.get(option) || 0) + 1);
    });

    const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
    const breakdown = Array.from(counts.entries()).map(([option, count]) => ({
      option,
      count,
      percentage: formatPercentage(count, total)
    }));

    return {
      statusCode: 200,
      body: {
        question_code: questionCode,
        breakdown
      }
    };
  },

  detail(submissionId) {
    const submission = SheetRepository.findBy('survey_response', 'submission_id', submissionId);
    if (!submission) {
      throw new Error(`找不到 submission ${submissionId}`);
    }
    const respondent = SheetRepository.findBy('respondent', 'respondent_id', submission.data.respondent_id);
    const answers = SheetRepository.all('question_answer')
      .filter(row => row.data.submission_id === submissionId)
      .map(row => ({
        question_code: row.data.question_code,
        value: row.data.answer_json
      }));
    const grant = SheetRepository.findBy('reward_grant', 'submission_id', submissionId);

    return {
      statusCode: 200,
      body: {
        submission_id: submissionId,
        respondent: {
          full_name: respondent?.data?.full_name || '',
          email: maskEmail(respondent?.data?.email || ''),
          github_name: maskHandle(respondent?.data?.github_name || '')
        },
        answers,
        reward_grant: grant?.data || null
      }
    };
  },

  buildSectionsBySubmission() {
    const sectionsMap = new Map();
    SheetRepository.all('question_answer').forEach(row => {
      const payload = safeParseJson(row.data.answer_json);
      const [sectionKey, fieldKey] = (row.data.question_code || '').split('.');
      if (!sectionKey || !fieldKey) {
        return;
      }
      if (!sectionsMap.has(row.data.submission_id)) {
        sectionsMap.set(row.data.submission_id, {});
      }
      const section = sectionsMap.get(row.data.submission_id);
      section[sectionKey] = section[sectionKey] || {};
      section[sectionKey][fieldKey] = payload?.value;
    });
    return sectionsMap;
  }
};

const GithubGrantService = {
  grant(submissionId) {
    const submission = SheetRepository.findBy('survey_response', 'submission_id', submissionId);
    if (!submission) {
      throw new Error(`找不到 submission ${submissionId}`);
    }
    const respondent = SheetRepository.findBy('respondent', 'respondent_id', submission.data.respondent_id);
    const grant = SheetRepository.findBy('reward_grant', 'submission_id', submissionId);
    if (!respondent || !grant) {
      throw new Error('缺少授權必備資料');
    }
    const recordedEmail = (respondent.data.email || '').trim().toLowerCase();
    const providedEmail = (grant.data.email || '').trim().toLowerCase();
    const nowIso = getNowIsoString();

    if (!recordedEmail || !providedEmail || recordedEmail !== providedEmail) {
      SheetRepository.updateRow('reward_grant', grant.rowIndex, {
        status: 'failed',
        failure_reason: 'email_mismatch',
        last_attempt_at: nowIso
      });
      notifyRespondent(grant.data.email, 'GitHub 贈品驗證失敗', '請改用註冊 Email 重試，或回信協助我們辨識身分。');
      return 'email_mismatch';
    }

    const repoSlug = getScriptProperty('GIFT_REPO_SLUG', '');
    const handle = grant.data.github_name || respondent.data.github_name;
    const response = callGithubCollaboratorApi(repoSlug, handle);
    const code = response?.getResponseCode?.() || 0;

    if (GithubSuccessCodes.has(code)) {
      SheetRepository.updateRow('reward_grant', grant.rowIndex, {
        status: 'granted',
        failure_reason: '',
        last_attempt_at: nowIso,
        granted_at: nowIso
      });
      SheetRepository.updateRow('survey_response', submission.rowIndex, { has_reward_grant: true });
      const repoUrl = `https://github.com/${repoSlug}`;
      notifyRespondent(grant.data.email, 'GitHub 贈品邀請已寄出', `請於 ${repoUrl} 接受邀請，邀請將於七日內到期。`);
      return 'granted';
    }

    SheetRepository.updateRow('reward_grant', grant.rowIndex, {
      status: 'failed',
      failure_reason: `github_response_${code}`,
      last_attempt_at: nowIso
    });
    notifyRespondent(grant.data.email, 'GitHub 贈品邀請暫停', '請改用註冊 Email 或重新確認 GitHub 帳號後再試。');
    return 'failed';
  },

  retryPending() {
    const repoSlug = getScriptProperty('GIFT_REPO_SLUG', '');
    const nowIso = getNowIsoString();
    const now = new Date(nowIso).getTime();
    const attempts = [];

    SheetRepository.all('reward_grant')
      .filter(row => row.data.status === 'pending')
      .forEach(row => {
        const lastAttemptTime = row.data.last_attempt_at ? new Date(row.data.last_attempt_at).getTime() : 0;
        if (now - lastAttemptTime < 24 * 60 * 60 * 1000) {
          return;
        }
        const response = callGithubCollaboratorApi(repoSlug, row.data.github_name);
        const code = response?.getResponseCode?.() || 0;
        const updates = { last_attempt_at: nowIso };
        if (GithubSuccessCodes.has(code)) {
          updates.status = 'granted';
          updates.granted_at = nowIso;
          updates.failure_reason = '';
        } else if (code === 404) {
          updates.status = 'failed';
          updates.failure_reason = 'github_handle_not_found';
        } else {
          updates.failure_reason = `github_response_${code}`;
        }
        SheetRepository.updateRow('reward_grant', row.rowIndex, updates);
        attempts.push({ grant_id: row.data.grant_id, responseCode: code });
      });

    return { attempts };
  }
};

function buildRespondentRecord(formPayload, respondentId, nowIso) {
  return {
    respondent_id: respondentId,
    full_name: formPayload['respondent.full_name'] || '',
    email: formPayload['respondent.email'] || '',
    github_name: formPayload['respondent.github_name'] || '',
    career_stage: formPayload['respondent.career_stage'] || '',
    cs_major: formPayload['respondent.cs_major'] || '',
    compensation_band: formPayload['respondent.compensation'] || '',
    organization_type: formPayload['org.type'] || '',
    created_at: nowIso
  };
}

function buildAnswerPayloads(formPayload, nowIso) {
  return Object.entries(formPayload).map(([questionCode, value]) => ({
    question_code: questionCode,
    value,
    metadata: {
      recorded_at: nowIso,
      section: questionCode.split('.')[0]
    }
  }));
}

function normalizeWorkflowSelection(label) {
  const trimmed = (label || '').trim();
  if (SurveyConstants.WORKFLOW_CONFUSION_CODE_MAP[trimmed]) {
    return SurveyConstants.WORKFLOW_CONFUSION_CODE_MAP[trimmed];
  }
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'other';
}

function safeParseJson(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function matchesAggregationFilter(record, params) {
  if (!params) {
    return true;
  }
  if (params.submitted_after) {
    const submitted = new Date(record.submitted_at || 0).getTime();
    if (Number.isFinite(submitted) && submitted <= new Date(params.submitted_after).getTime()) {
      return false;
    }
  }
  if (typeof params.has_reward_grant !== 'undefined') {
    const expected = typeof params.has_reward_grant === 'boolean'
      ? params.has_reward_grant
      : params.has_reward_grant === 'true' || params.has_reward_grant === '1';
    return Boolean(record.has_reward_grant) === expected;
  }
  return true;
}

function formatPercentage(count, total) {
  if (!total) {
    return '0.0%';
  }
  const percentage = (count / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

function maskEmail(value) {
  if (!value) {
    return '';
  }
  const parts = value.split('@');
  if (parts.length !== 2) {
    return `${value.slice(0, 2)}***`;
  }
  return `${parts[0].slice(0, 2)}***@${parts[1]}`;
}

function maskHandle(value) {
  if (!value) {
    return '';
  }
  return `${value.slice(0, 2)}***`;
}

function notifyRespondent(email, subject, body) {
  if (!MailApp || typeof MailApp.sendEmail !== 'function') {
    return;
  }
  MailApp.sendEmail({ to: email, subject, body });
}

function getScriptProperty(key, fallback) {
  if (!PropertiesService) {
    return fallback;
  }
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(key) || fallback;
}

function callGithubCollaboratorApi(repoSlug, handle, permission = 'pull') {
  if (!repoSlug || !handle) {
    throw new Error('缺少 GitHub 邀請必要資訊');
  }
  if (!UrlFetchApp || typeof UrlFetchApp.fetch !== 'function') {
    throw new Error('UrlFetchApp 尚未設定');
  }
  const url = `https://api.github.com/repos/${repoSlug}/collaborators/${handle}`;
  return UrlFetchApp.fetch(url, {
    method: 'put',
    payload: JSON.stringify({ permission }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json'
    },
    muteHttpExceptions: true
  });
}

function getNowIsoString() {
  if (typeof _mockTime === 'string' && _mockTime) {
    const mockDate = new Date(_mockTime);
    if (!Number.isNaN(mockDate.getTime())) {
      return mockDate.toISOString();
    }
  }
  return new Date().toISOString();
}

// ========= Exported GAS functions =========

function startSurveySession() {
  return SubmissionService.startSession();
}

function prevalidateRespondentIdentityBlock(session) {
  return SubmissionService.prevalidate(session);
}

function submitSurveyResponse(formPayload) {
  return SubmissionService.submit(formPayload);
}

function assertAllMandatorySectionsAnswered(submissionId) {
  SubmissionService.assertMandatoryAnswered(submissionId);
}

function verifySubmissionAnswersPersisted(submissionId) {
  SubmissionService.verifyAnswersPersisted(submissionId);
}

function getSubmissionStatus(submissionId) {
  return SubmissionService.status(submissionId);
}

function getSubmissionSuccessState(submissionId) {
  return SubmissionService.successState(submissionId);
}

function setAiWorkflowPreference(choice) {
  return AiSkipService.setPreference(choice);
}

function submitAiAdoptionFollowUps(preference, answers) {
  return AiSkipService.submitFollowUps(preference, answers);
}

function areAiFollowUpQuestionsHidden(submissionId) {
  return AiSkipService.areFollowUpsHidden(submissionId);
}

function getSkippedQuestionMetadata(submissionId) {
  return AiSkipService.getSkippedMetadata(submissionId);
}

function validateSkipLogicCompliance(submissionId) {
  AiSkipService.validate(submissionId);
}

function recordWorkflowConfusionAnswer(input) {
  return WorkflowConfusionService.recordAnswer(input);
}

function getWorkflowConfusionAnswerPayload(submissionId, question) {
  return WorkflowConfusionService.fetchAnswer(submissionId, question);
}

function isWorkflowConfusionFreeTextIncluded(question) {
  return WorkflowConfusionService.freeTextIncluded(question);
}

function getSurveyResponses(params) {
  return ResponseQueryService.list(params);
}

function getSurveyResponseAggregations(params) {
  return ResponseQueryService.aggregate(params);
}

function getSurveyResponseDetail(submissionId) {
  return ResponseQueryService.detail(submissionId);
}

function grantGithubAccess(submissionId) {
  return GithubGrantService.grant(submissionId);
}

function retryPendingRewardGrants() {
  return GithubGrantService.retryPending();
}
