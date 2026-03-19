/**
 * 叫号牌端测试
 */
const net = require('net');

console.log('=== 叫号牌端测试 ===\n');

const callBoard = new net.Socket();
callBoard.connect(8024, '127.0.0.1', () => {
  console.log('连接到叫号牌端\n');
});

callBoard.on('data', (data) => {
  console.log('=== 叫号牌显示 ===');
  console.log(data.toString());
});

setTimeout(() => {
  console.log('刷新...\n');
  callBoard.write('refresh\n');
}, 3000);

setTimeout(() => {
  callBoard.end();
}, 6000);

callBoard.on('close', () => {
  console.log('\n=== 叫号牌端测试结束 ===');
  process.exit(0);
});