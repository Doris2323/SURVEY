#!/usr/bin/env node

/**
 * Workshop 重置腳本
 *
 * 執行: npm run reset
 *
 * 功能:
 * 1. 清除 Step Definitions（保留空資料夾）
 * 2. 重置 src/程式碼.js 為空白範本
 *
 * 這讓學生可以從 Feature 開始，走過完整的 BDD 四步驟：
 * 綁定 → 紅燈 → 綠燈 → 重構
 */

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

// Template 檔案路徑（不放 src/ 下避免 clasp push 錯誤）
const TEMPLATE_PATH = 'templates/程式碼.template.js';

async function confirmReset() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    log('\n========================================', 'yellow');
    log('  警告：這將重置專案到學習起始狀態', 'yellow');
    log('========================================\n', 'yellow');

    log('將會清除：');
    log('  • features/step_definitions/*.js');
    log('  • src/程式碼.js（重置為空白範本）\n');

    rl.question('確定要重置嗎？(y/N) ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  // 檢查是否有 --force 參數
  const forceMode = process.argv.includes('--force') || process.argv.includes('-f');

  if (!forceMode) {
    const confirmed = await confirmReset();
    if (!confirmed) {
      log('\n已取消重置。', 'yellow');
      process.exit(0);
    }
  }

  log('\n========================================', 'cyan');
  log('  Workshop 重置中...', 'cyan');
  log('========================================\n', 'cyan');

  // Step 1: 清除 Step Definitions
  logStep('1/2', '清除 Step Definitions...');

  const stepDefsPath = path.join(projectRoot, 'features', 'step_definitions');

  if (fs.existsSync(stepDefsPath)) {
    const files = fs.readdirSync(stepDefsPath);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = path.join(stepDefsPath, file);
        fs.unlinkSync(filePath);
        log(`  刪除: ${file}`);
        count++;
      }
    }

    if (count > 0) {
      logSuccess(`已刪除 ${count} 個 Step Definition 檔案`);
    } else {
      logWarning('沒有找到 Step Definition 檔案');
    }
  } else {
    // 建立空資料夾
    fs.mkdirSync(stepDefsPath, { recursive: true });
    logSuccess('已建立空的 step_definitions 資料夾');
  }

  // Step 2: 從 template 還原程式碼
  logStep('2/2', '還原 src/程式碼.js...');

  const gasCodePath = path.join(projectRoot, 'src', '程式碼.js');
  const templatePath = path.join(projectRoot, TEMPLATE_PATH);

  if (!fs.existsSync(templatePath)) {
    logWarning(`找不到 template 檔案: ${TEMPLATE_PATH}`);
    logWarning('請確認 templates/程式碼.template.js 存在');
  } else {
    fs.copyFileSync(templatePath, gasCodePath);
    logSuccess('已從 template 還原 src/程式碼.js');
  }

  // 完成
  log('\n========================================', 'green');
  log('  重置完成！', 'green');
  log('========================================\n', 'green');

  log('現在你可以開始 BDD 流程：', 'cyan');
  log('');
  log('  1. 閱讀 features/打卡記錄.feature');
  log('');
  log('  2. 綁定 - 複製以下指令給 AI：');
  log('     do: @prompts/01-Gherkin-to-Step-Definition.md');
  log('     for: @features/打卡記錄.feature');
  log('');
  log('  3. 紅燈 - 執行 npm test 看到測試失敗');
  log('');
  log('  4. 綠燈 - 複製以下指令給 AI：');
  log('     do: @prompts/03-綠燈.md');
  log('     for: @features/打卡記錄.feature');
  log('');
  log('  5. 執行 npm test 看到綠燈');
  log('');
  log('開始你的 BDD 學習之旅！\n', 'green');
}

main().catch(error => {
  log(`\n發生錯誤: ${error.message}`, 'red');
  process.exit(1);
});
