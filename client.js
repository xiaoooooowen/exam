#!/usr/bin/env node

/**
 * 终端早餐店 - 客户端连接工具
 * 用法: node client.js <port>
 *   node client.js 8024  - 叫号牌端
 *   node client.js 8025  - 顾客下单端
 *   node client.js 8026  - 店主管理端
 */

const net = require('net');
const readline = require('readline');

const args = process.argv.slice(2);
const port = parseInt(args[0]) || 8025;

const portNames = {
  8024: '叫号牌端',
  8025: '顾客下单端',
  8026: '店主管理端'
};

console.log(`连接 ${portNames[port] || '终端'} (${port})...`);

const client = new net.Socket();

client.connect(port, '127.0.0.1', () => {
  console.log('已连接，输入命令开始操作\n');
});

client.on('data', (data) => {
  process.stdout.write(data.toString());
});

client.on('close', () => {
  console.log('\n连接已断开');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('连接错误:', err.message);
  process.exit(1);
});

// 从 stdin 读取输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (line.trim()) {
    client.write(line + '\n');
  }
});

process.stdin.on('data', (chunk) => {
  // 处理方向键等特殊键
});