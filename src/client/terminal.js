/**
 * TUI 终端渲染模块
 * ANSI 转义序列封装
 */

const Readline = require('readline');

/**
 * ANSI 转义码
 */
const ANSI = {
  // 颜色
  RESET: '\x1b[0m',
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // 背景色
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m',

  // 光标控制
  CLEAR_SCREEN: '\x1B[2J',
  CLEAR_LINE: '\x1B[2K',
  HOME_CURSOR: '\x1B[H',
  HIDE_CURSOR: '\x1B[?25l',
  SHOW_CURSOR: '\x1B[?25h',

  // 移动光标
  MOVE_UP: (n = 1) => `\x1B[${n}A`,
  MOVE_DOWN: (n = 1) => `\x1B[${n}B`,
  MOVE_RIGHT: (n = 1) => `\x1B[${n}C`,
  MOVE_LEFT: (n = 1) => `\x1B[${n}D`
};

/**
 * 清屏
 */
function clearScreen() {
  return ANSI.CLEAR_SCREEN + ANSI.HOME_CURSOR;
}

/**
 * 创建带颜色的文本
 */
function color(text, colorCode) {
  return `${colorCode}${text}${ANSI.RESET}`;
}

/**
 * 创建带背景色的文本
 */
function bgColor(text, colorCode) {
  return `${colorCode}${text}${ANSI.RESET}`;
}

/**
 * 进度条
 */
function progressBar(current, total, width = 30) {
  const filled = Math.floor((current / total) * width);
  const empty = width - filled;
  return '[' + '='.repeat(filled) + ' '.repeat(empty) + '] ' + current + '/' + total;
}

/**
 * 表格渲染
 */
function renderTable(headers, rows) {
  const colWidths = headers.map((h, i) => {
    const maxWidth = Math.max(
      h.length,
      ...rows.map(r => String(r[i] || '').length)
    );
    return maxWidth + 2;
  });

  let output = '\n';

  // 表头
  headers.forEach((h, i) => {
    output += '│ ' + h.padEnd(colWidths[i] - 1);
  });
  output += '│\n';

  // 分隔线
  colWidths.forEach(w => {
    output += '─'.repeat(w);
  });
  output += '──\n';

  // 数据行
  rows.forEach(row => {
    row.forEach((cell, i) => {
      output += '│ ' + String(cell).padEnd(colWidths[i] - 1);
    });
    output += '│\n';
  });

  return output;
}

/**
 * 框线渲染
 */
function box(text, width = 50) {
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length), width - 4);

  let output = '┌' + '─'.repeat(maxLen + 2) + '┐\n';

  lines.forEach(line => {
    output += '│ ' + line.padEnd(maxLen) + ' │\n';
  });

  output += '└' + '─'.repeat(maxLen + 2) + '┘';

  return output;
}

module.exports = {
  ANSI,
  clearScreen,
  color,
  bgColor,
  progressBar,
  renderTable,
  box
};