#!/usr/bin/env node

/**
 * Workshop 重置腳本
 *
 * 執行: npm run reset
 *
 * 功能:
 * 1. 清除 Step Definitions（保留空資料夾）
 * 2. 清除業務邏輯模組（src/*.js，保留 main.js 入口）
 * 3. 清除 src/utils/（保留空資料夾）
 *
 * 這讓學生可以從 Feature 開始，走過完整的 BDD 三步驟：
 * 紅燈 → 綠燈 → 重構
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

// 保留的檔案（入口點）
const KEEP_FILES = ['main.js'];

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
    log('  • specs/features/step_definitions/*.js');
    log('  • src/*.js（保留 main.js 入口）');
    log('  • src/utils/*.js');
    log('  • src/Index.html\n');

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
  logStep('1/4', '清除 Step Definitions...');

  const stepDefsPath = path.join(projectRoot, 'specs', 'features', 'step_definitions');

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

  // Step 2: 清除業務邏輯模組（保留 main.js）
  logStep('2/4', '清除業務邏輯模組...');

  const srcPath = path.join(projectRoot, 'src');

  if (fs.existsSync(srcPath)) {
    const files = fs.readdirSync(srcPath);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.js') && !KEEP_FILES.includes(file)) {
        const filePath = path.join(srcPath, file);
        fs.unlinkSync(filePath);
        log(`  刪除: ${file}`);
        count++;
      }
    }

    if (count > 0) {
      logSuccess(`已刪除 ${count} 個業務邏輯模組`);
    } else {
      logWarning('沒有找到業務邏輯模組');
    }
  }

  // Step 3: 清除 src/utils/
  logStep('3/4', '清除 src/utils/...');

  const utilsPath = path.join(projectRoot, 'src', 'utils');

  if (fs.existsSync(utilsPath)) {
    const files = fs.readdirSync(utilsPath);
    let count = 0;

    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = path.join(utilsPath, file);
        fs.unlinkSync(filePath);
        log(`  刪除: utils/${file}`);
        count++;
      }
    }

    if (count > 0) {
      logSuccess(`已刪除 ${count} 個工具模組`);
    } else {
      logWarning('沒有找到工具模組');
    }
  } else {
    fs.mkdirSync(utilsPath, { recursive: true });
    logSuccess('已建立空的 utils 資料夾');
  }

  // Step 4: 清除 src/Index.html
  logStep('4/4', '清除 src/Index.html...');

  const htmlPath = path.join(projectRoot, 'src', 'Index.html');

  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
    logSuccess('已刪除 src/Index.html');
  } else {
    logWarning('src/Index.html 不存在，跳過');
  }

  // 完成
  log('\n========================================', 'green');
  log('  重置完成！', 'green');
  log('========================================\n', 'green');

  log('現在你可以開始 BDD 流程：', 'cyan');
  log('');
  log('  1. 閱讀 specs/features/*.feature');
  log('');
  log('  2. 紅燈 - 複製以下指令給 AI：');
  log('     do: @prompts/01-紅燈.md');
  log('     for: @specs/features/XXX.feature');
  log('');
  log('  3. 執行 npm test 看到測試失敗（紅燈）');
  log('');
  log('  4. 綠燈 - 複製以下指令給 AI：');
  log('     do: @prompts/02-綠燈.md');
  log('     for: @specs/features/XXX.feature');
  log('');
  log('  5. 執行 npm test 看到測試通過（綠燈）');
  log('');
  log('  6. 重構 - 複製以下指令給 AI：');
  log('     do: @prompts/03-重構.md');
  log('     for: @src/xxx.js');
  log('');
  log('開始你的 BDD 學習之旅！\n', 'green');
}

main().catch(error => {
  log(`\n發生錯誤: ${error.message}`, 'red');
  process.exit(1);
});
