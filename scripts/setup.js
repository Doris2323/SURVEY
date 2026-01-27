#!/usr/bin/env node

/**
 * Workshop 一鍵初始化腳本
 *
 * 執行: npm run setup
 *
 * 功能:
 * 1. 安裝 npm 依賴
 * 2. 建立 .clasp.json (從 template)
 * 3. 建立 step_definitions 資料夾
 * 4. 提示設定 Google Sheet
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// ANSI 顏色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

async function main() {
  log('\n========================================', 'cyan');
  log('  AI X BDD Workshop - 環境初始化', 'cyan');
  log('========================================\n', 'cyan');

  // Step 1: 檢查 npm 依賴
  logStep('1/4', '檢查 npm 依賴...');

  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('正在安裝依賴 (npm install)...');
    try {
      execSync('npm install', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      logSuccess('依賴安裝完成');
    } catch (error) {
      logError('npm install 失敗');
      logError('請確認已安裝 Node.js 和 npm');
      process.exit(1);
    }
  } else {
    logSuccess('依賴已安裝');
  }

  // Step 2: 建立 .clasp.json
  logStep('2/4', '設定 clasp（部署 Web App 用）...');

  const claspJsonPath = path.join(projectRoot, '.clasp.json');
  const claspTemplatePath = path.join(projectRoot, 'templates', '.clasp.json.template');

  if (!fs.existsSync(claspJsonPath)) {
    if (fs.existsSync(claspTemplatePath)) {
      fs.copyFileSync(claspTemplatePath, claspJsonPath);
      logSuccess('.clasp.json 已建立');
      logWarning('請編輯 .clasp.json，填入你的 Script ID 和 Spreadsheet ID');
      log('');
      log('  ┌─────────────────────────────────────────────────────────┐', 'yellow');
      log('  │  如何設定 .clasp.json                                   │', 'yellow');
      log('  └─────────────────────────────────────────────────────────┘', 'yellow');
      log('');
      log('  1. 取得 Script ID:', 'cyan');
      log('     - 開啟 https://script.google.com');
      log('     - 建立新專案或開啟現有專案');
      log('     - 點擊「專案設定」（齒輪圖示）');
      log('     - 複製「指令碼 ID」');
      log('');
      log('  2. 取得 Spreadsheet ID:', 'cyan');
      log('     - 開啟你的 Google Sheet');
      log('     - 從網址複製 ID：');
      log('       https://docs.google.com/spreadsheets/d/<這段就是ID>/edit');
      log('');
      log('  3. 編輯 .clasp.json:', 'cyan');
      log('     - 將 <YOUR_SCRIPT_ID> 替換為 Script ID');
      log('     - 將 <YOUR_SPREADSHEET_ID> 替換為 Spreadsheet ID');
      log('');
    } else {
      logWarning('templates/.clasp.json.template 不存在，跳過此步驟');
    }
  } else {
    logSuccess('.clasp.json 已存在');
  }

  // Step 3: 建立 step_definitions 資料夾
  logStep('3/4', '建立測試資料夾結構...');

  const stepDefsPath = path.join(projectRoot, 'features', 'step_definitions');
  if (!fs.existsSync(stepDefsPath)) {
    fs.mkdirSync(stepDefsPath, { recursive: true });
    logSuccess('features/step_definitions/ 已建立');
  } else {
    logSuccess('features/step_definitions/ 已存在');
  }

  // Step 4: 提示 Google Sheet 設定
  logStep('4/4', 'Google Sheet 設定說明');

  log('\n為了完成 Workshop，請建立一個 Google Sheet：', 'cyan');
  log('');
  log('  1. 開啟 Google Sheets (sheets.google.com)');
  log('  2. 建立新的空白試算表');
  log('  3. 將第一個工作表命名為「打卡記錄」');
  log('  4. 在第一列填入標題：ID | 類型 | 時間 | 建立時間');
  log('');
  log('  欄位說明：', 'yellow');
  log('  - ID: 唯一識別碼 (UUID)');
  log('  - 類型: IN（上班）或 OUT（下班）');
  log('  - 時間: 打卡時間');
  log('  - 建立時間: 記錄建立時間');
  log('');

  // 完成
  log('\n========================================', 'green');
  log('  初始化完成！', 'green');
  log('========================================\n', 'green');

  log('下一步：', 'cyan');
  log('  1. 閱讀 README.md 了解專案結構');
  log('  2. 閱讀 docs/01-什麼是BDD.md 開始學習');
  log('  3. 執行 npm test 看看測試結果');
  log('');
  log('開始你的 AI X BDD 學習之旅！🚀\n', 'green');
}

main().catch(error => {
  logError(`發生錯誤: ${error.message}`);
  process.exit(1);
});
