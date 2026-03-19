/**
 * 完整流程测试
 */
const net = require('net');

console.log('=== 完整流程测试 ===\n');

const client = new net.Socket();
let orderId = '';
let gotOrder = false;

client.connect(8025, '127.0.0.1', () => {
  console.log('1. 连接成功，创建订单...');
  client.write('order 1,1\n');
});

client.on('data', (data) => {
  const txt = data.toString();
  console.log(txt);

  // 提取订单号
  if (!gotOrder) {
    const match = txt.match(/订单号: (ORD[A-Z0-9]+)/);
    if (match) {
      orderId = match[1];
      gotOrder = true;
      console.log('>>> 订单号:', orderId);

      // 1秒后支付
      setTimeout(() => {
        console.log('2. 执行支付...\n');
        client.write('pay ' + orderId + '\n');
      }, 1000);
    }
  }
});

// 4秒后查看订单状态
setTimeout(() => {
  if (gotOrder) {
    console.log('3. 查看订单状态...\n');
    client.write('myorder\n');
  }
}, 3500);

// 5秒后断开
setTimeout(() => {
  console.log('4. 测试完成，断开连接\n');
  client.end();
}, 5000);

client.on('close', () => {
  console.log('=== 测试结束 ===');
  process.exit(0);
});

client.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});