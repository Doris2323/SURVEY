import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';

const GITHUB_API_BASE = 'https://api.github.com';

function getSheet(world, sheetName) {
  const sheet = world.ctx.SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  assert.ok(sheet, `工作表 ${sheetName} 應存在`);
  return sheet;
}

function getHeaders(world, sheetName) {
  world._sheetHeaders = world._sheetHeaders || {};
  if (!world._sheetHeaders[sheetName]) {
    const sheet = getSheet(world, sheetName);
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const [headers] = headerRange.getValues();
    world._sheetHeaders[sheetName] = headers;
  }
  return world._sheetHeaders[sheetName];
}

function getColumnIndex(world, sheetName, columnName) {
  const headers = getHeaders(world, sheetName);
  const index = headers.indexOf(columnName);
  assert.ok(index !== -1, `工作表 ${sheetName} 缺少欄位 ${columnName}`);
  return index + 1;
}

function appendRow(world, sheetName, valuesByColumn = {}) {
  const sheet = getSheet(world, sheetName);
  const headers = getHeaders(world, sheetName);
  const row = headers.map(header => (header in valuesByColumn ? valuesByColumn[header] : ''));
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function setSheetValue(world, sheetName, rowIndex, columnName, value) {
  const columnIndex = getColumnIndex(world, sheetName, columnName);
  getSheet(world, sheetName).getRange(rowIndex, columnIndex).setValue(value);
}

function getSheetValue(world, sheetName, rowIndex, columnName) {
  const columnIndex = getColumnIndex(world, sheetName, columnName);
  const [[cell]] = getSheet(world, sheetName).getRange(rowIndex, columnIndex).getDisplayValues();
  return cell;
}

function ensureGithubMock(world) {
  if (world.githubMockReady) return;
  world.githubApiCalls = [];
  world.githubApiResponseMap = new Map();
  world.ctx.UrlFetchApp = {
    fetch(url, options = {}) {
      const method = (options.method || 'GET').toUpperCase();
      const payload = options.payload ?? null;
      const key = `${method} ${url}`;
      const response = world.githubApiResponseMap.get(key) || { statusCode: 200, body: '' };
      const call = {
        url,
        method,
        payload,
        headers: options.headers || {},
        responseCode: response.statusCode
      };
      world.githubApiCalls.push(call);
      return {
        getResponseCode() {
          return response.statusCode;
        },
        getContentText() {
          return response.body ?? '';
        }
      };
    }
  };
  world.githubMockReady = true;
}

function ensureMailAppMock(world) {
  if (world.mailAppMockReady) return;
  world.sentEmails = [];
  world.ctx.MailApp = {
    sendEmail(arg1, arg2, arg3, arg4) {
      if (typeof arg1 === 'object') {
        const message = arg1 || {};
        world.sentEmails.push({
          recipient: message.to || '',
          subject: message.subject || '',
          body: message.body || message.htmlBody || '',
          options: message
        });
        return;
      }
      world.sentEmails.push({
        recipient: arg1,
        subject: arg2 || '',
        body: arg3 || '',
        options: arg4 || {}
      });
    }
  };
  world.mailAppMockReady = true;
}

function resolveGithubUrl(pathOrUrl) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }
  return `${GITHUB_API_BASE}${pathOrUrl}`;
}

function registerGithubResponse(world, method, pathOrUrl, statusCode, body = '') {
  ensureGithubMock(world);
  const url = resolveGithubUrl(pathOrUrl);
  const key = `${method.toUpperCase()} ${url}`;
  world.githubApiResponseMap.set(key, { statusCode, body });
  return url;
}

function markGithubHandleValid(world, handle) {
  registerGithubResponse(world, 'GET', `/users/${handle}`, 200, JSON.stringify({ login: handle }));
  const slug = world.repoSlug || 'Doris2323/survey-gift';
  const collaboratorPath = `/repos/${slug}/collaborators/${handle}`;
  const statusCode = world.expectedCollaboratorResponseCode ?? 201;
  registerGithubResponse(world, 'PUT', collaboratorPath, statusCode);
  world.currentGithubHandle = handle;
}

function getLastCollaboratorCall(world) {
  if (!world.githubApiCalls) return null;
  const matches = world.githubApiCalls.filter(call => /\/collaborators\//.test(call.url));
  return matches[matches.length - 1] || null;
}

function getCollaboratorCalls(world) {
  if (!world.githubApiCalls) return [];
  return world.githubApiCalls.filter(call => /\/collaborators\//.test(call.url));
}

function seedCompletedSubmission(world, submissionId) {
  const respondentId = `RESP-${submissionId}`;
  const grantId = `GR-${submissionId}`;
  const submissionRowIndex = appendRow(world, 'survey_response', {
    submission_id: submissionId,
    questionnaire_id: 'QN-001',
    respondent_id: respondentId,
    questionnaire_version: 'v1',
    submitted_at: '2026-02-11T00:00:00Z',
    submitted_from: 'web',
    completion_status: 'completed',
    has_reward_grant: false
  });
  const respondentRowIndex = appendRow(world, 'respondent', {
    respondent_id: respondentId,
    full_name: '',
    email: '',
    github_name: ''
  });
  const grantRowIndex = appendRow(world, 'reward_grant', {
    grant_id: grantId,
    submission_id: submissionId,
    github_name: '',
    email: '',
    status: 'pending',
    failure_reason: '',
    last_attempt_at: '',
    granted_at: ''
  });
  world.currentSubmission = { id: submissionId, rowIndex: submissionRowIndex };
  world.currentRespondent = { id: respondentId, rowIndex: respondentRowIndex };
  world.currentGrant = { id: grantId, rowIndex: grantRowIndex };
  world.expectedCollaboratorResponseCode = 201;
  world.submissionPayload = {};
}

Given(/^贈品儲存庫 slug 為「([^」]+)」$/, function(slug) {
  const props = this.ctx.PropertiesService.getScriptProperties();
  props.setProperty('GIFT_REPO_SLUG', slug);
  this.repoSlug = slug;
});

Given(/^協作者邀請必須在 (\d+) 天內被接受$/, function(days) {
  const props = this.ctx.PropertiesService.getScriptProperties();
  props.setProperty('GITHUB_INVITE_TTL_DAYS', String(days));
  this.inviteAcceptanceDays = Number(days);
});

Given('自動化會以 `pending`、`granted` 或 `failed` 記錄每一次授權嘗試', function() {
  this.allowedGrantStatuses = ['pending', 'granted', 'failed'];
});

Given(/^受訪者提交「([^」]+)」已被標記為 completed$/, function(submissionId) {
  seedCompletedSubmission(this, submissionId);
});

Given(/^提交「([^」]+)」已標記為 completed$/, function(submissionId) {
  seedCompletedSubmission(this, submissionId);
});

Given('提交內容包含', function(dataTable) {
  assert.ok(this.currentSubmission, '缺少 submission 初始資料');
  const rows = dataTable.hashes();
  rows.forEach(raw => {
    const field = (raw['欄位'] || '').trim();
    const value = (raw['值'] || '').trim();
    const [entity, column] = field.split('.');
    assert.ok(column, `欄位格式應為 entity.column，收到 ${field}`);

    if (entity === 'respondent') {
      setSheetValue(this, 'respondent', this.currentRespondent.rowIndex, column, value);
      if (column === 'email') {
        setSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'email', value);
      }
      if (column === 'github_name') {
        setSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'github_name', value);
      }
    } else if (entity === 'survey_response' || entity === 'submission') {
      setSheetValue(this, 'survey_response', this.currentSubmission.rowIndex, column, value);
    } else if (entity === 'reward_grant') {
      setSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, column, value);
    } else {
      throw new Error(`無法識別欄位來源: ${field}`);
    }

    this.submissionPayload[field] = value;
  });
});

Given('Email 與 Google Sheet 對應列一致', function() {
  assert.ok(this.currentRespondent && this.currentGrant, '缺少受訪者或授權紀錄');
  const respondentEmail = getSheetValue(this, 'respondent', this.currentRespondent.rowIndex, 'email');
  const grantEmail = getSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'email');
  assert.strictEqual(respondentEmail, grantEmail, 'Email 應該一致');
});

Given(/^GitHub 顯示「([^」]+)」是有效帳號$/, function(handle) {
  ensureGithubMock(this);
  markGithubHandleValid(this, handle);
});

Given(/^(.+) 的 GitHub 帳號仍有效$/, function(handle) {
  ensureGithubMock(this);
  markGithubHandleValid(this, handle.trim());
});

Given(/^系統紀錄 Email 為 (\S+) 但受訪者在贈品頁輸入 (\S+)$/, function(recorded, provided) {
  assert.ok(this.currentRespondent && this.currentGrant, '缺少受訪者上下文');
  setSheetValue(this, 'respondent', this.currentRespondent.rowIndex, 'email', recorded);
  setSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'email', provided);
  this.recordedEmail = recorded;
  this.userProvidedEmail = provided;
});

Given('存在超過 24 小時仍為 pending 的授權紀錄', function(dataTable) {
  const rows = dataTable.hashes();
  assert.ok(rows.length > 0, '需要至少一筆 pending 紀錄');
  this.pendingGrants = rows.map(row => {
    const grantId = row.grant_id;
    const rowIndex = appendRow(this, 'reward_grant', {
      grant_id: grantId,
      submission_id: grantId.replace('GR', 'SR'),
      github_name: row.github_name,
      email: `${row.github_name}@example.com`,
      status: row.status,
      failure_reason: '',
      last_attempt_at: row.last_attempt_at,
      granted_at: ''
    });
    return {
      id: grantId,
      rowIndex,
      github_name: row.github_name,
      lastAttemptAt: row.last_attempt_at,
      expectedCode: grantId.endsWith('5') ? 404 : 201
    };
  });
  this.currentGrant = this.pendingGrants[this.pendingGrants.length - 1];
  this.expectedCollaboratorResponseCode = this.currentGrant.expectedCode;
});

When('自動化系統呼叫 GitHub Collaborators API', function(dataTable) {
  ensureGithubMock(this);
  ensureMailAppMock(this);
  assert.ok(this.ctx.grantGithubAccess, 'grantGithubAccess 函式尚未建立');
  const [{ method, path, body }] = dataTable.hashes();
  const upperMethod = method.toUpperCase();
  const url = registerGithubResponse(this, upperMethod, path, this.expectedCollaboratorResponseCode ?? 201, '');
  const parsedBody = body ? JSON.parse(body) : undefined;
  this.expectedGithubRequest = { method: upperMethod, url, body: parsedBody };
  this.lastGrantResult = this.ctx.grantGithubAccess(this.currentSubmission.id);
  const collaboratorCall = getLastCollaboratorCall(this);
  if (collaboratorCall) {
    this.lastCollaboratorResponseCode = collaboratorCall.responseCode;
  }
});

When('自動化比較身分資訊', function() {
  ensureMailAppMock(this);
  ensureGithubMock(this);
  assert.ok(this.ctx.grantGithubAccess, 'grantGithubAccess 函式尚未建立');
  this.lastGrantResult = this.ctx.grantGithubAccess(this.currentSubmission.id);
});

When('排程器觸發邀請重試作業', function() {
  ensureGithubMock(this);
  ensureMailAppMock(this);
  assert.ok(this.ctx.retryPendingRewardGrants, 'retryPendingRewardGrants 函式尚未建立');
  this.retryResult = this.ctx.retryPendingRewardGrants();
  const collaboratorCall = getLastCollaboratorCall(this);
  if (collaboratorCall) {
    this.lastCollaboratorResponseCode = collaboratorCall.responseCode;
  }
});

Then('GitHub 回傳 201 或 204', function() {
  const call = getLastCollaboratorCall(this);
  assert.ok(call, '預期要呼叫 GitHub Collaborators API');
  if (this.expectedGithubRequest) {
    assert.strictEqual(call.method, this.expectedGithubRequest.method, 'HTTP method 應符合預期');
    assert.strictEqual(call.url, this.expectedGithubRequest.url, 'API path 應符合預期');
    if (this.expectedGithubRequest.body) {
      let payload = call.payload;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch (err) {
          throw new Error(`Collaborators API payload 應為 JSON，實際值: ${payload}`);
        }
      }
      assert.deepStrictEqual(payload, this.expectedGithubRequest.body, 'payload 應符合預期');
    }
  }
  assert.ok([201, 204].includes(call.responseCode), 'GitHub 應該回傳 201 或 204');
});

Then(/^自動化會把授權紀錄更新為 `([^`]+)`$/, function(expectedStatus) {
  const status = getSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'status');
  assert.strictEqual(status, expectedStatus);
});

Then('受訪者會收到包含儲存庫網址與接受提醒的 Email', function() {
  ensureMailAppMock(this);
  assert.ok(this.sentEmails.length > 0, '預期要寄送 Email');
  const message = this.sentEmails[this.sentEmails.length - 1];
  const repoUrl = `https://github.com/${this.repoSlug}`;
  assert.ok(message.body.includes(repoUrl), 'Email 需包含儲存庫網址');
  assert.ok(/接受/.test(message.body), 'Email 需提醒受訪者接受邀請');
});

Then(/^驗證結果為 `([^`]+)`$/, function(expectedResult) {
  assert.notStrictEqual(this.lastGrantResult, undefined, '缺少驗證結果');
  let actual = this.lastGrantResult;
  if (typeof actual === 'object' && actual !== null) {
    actual = actual.verification ?? actual.validation ?? actual.result ?? actual.status ?? actual.outcome;
  }
  assert.strictEqual(actual, expectedResult);
});

Then('不會呼叫任何 GitHub API', function() {
  const collaboratorCalls = getCollaboratorCalls(this);
  assert.strictEqual(collaboratorCalls.length, 0, '不應呼叫 GitHub 協作者 API');
});

Then(/^授權紀錄寫入 `([^`]+)`$/, function(expectedStatus) {
  const status = getSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'status');
  assert.strictEqual(status, expectedStatus);
});

Then('受訪者會看到指示其以註冊 Email 重試', function() {
  ensureMailAppMock(this);
  assert.ok(this.sentEmails.length > 0, '預期要顯示提醒');
  const message = this.sentEmails[this.sentEmails.length - 1];
  assert.ok(/註冊 Email/.test(message.body), 'Email 需提示使用註冊 Email 重試');
});

Then('自動化再次呼叫協作者 API', function() {
  const call = getLastCollaboratorCall(this);
  assert.ok(call, '應該再次呼叫協作者 API');
  const handle = this.currentGrant?.github_name;
  if (handle) {
    assert.ok(call.url.endsWith(`/collaborators/${handle}`), '協作者 API 應以當前 handle 為目標');
  }
});

Then(/^若 GitHub 回應 201 或 204 則狀態改為 `([^`]+)`$/, function(expectedStatus) {
  if ([201, 204].includes(this.lastCollaboratorResponseCode)) {
    const status = getSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'status');
    assert.strictEqual(status, expectedStatus);
  }
});

Then(/^若 GitHub 回應 404 則狀態改為 `([^`]+)`$/, function(expectedStatus) {
  if (this.lastCollaboratorResponseCode === 404) {
    const status = getSheetValue(this, 'reward_grant', this.currentGrant.rowIndex, 'status');
    assert.strictEqual(status, expectedStatus);
  }
});
