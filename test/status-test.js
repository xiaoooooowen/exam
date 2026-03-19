/**
 * 状态流转测试
 */
const net = require('net');

let client;
let orderId = '';
let fullData = '';

function startTest() {
  console.log('=== 状态流转测试 ===\n');

  client = new net.Socket();
  client.connect(8025, '127.0.0.1', () => {
    console.log('1. 连接成功，下单');
    client.write('order 1,1\n');
  });

  client.on('data', (data) => {
    const txt = data.toString();
    fullData += txt;
    console.log('\n--- 收到数据 ---');
    console.log(txt.slice(0, 200));

    // 提取订单号
    if (!orderId) {
      const m = txt.match(/订单号: (ORD[A-Z0-9]+)/);
      if (m) {
        orderId = m[1];
        console.log('\n>>> 订单号:', orderId);
        console.log('2. 支付订单...');
        setTimeout(() => {
          client.write('pay ' + orderId + '\n');
        }, 500);
      }
    }

    // 支付成功后测试非法跳转
    if (orderId && txt.includes('支付成功')) {
      setTimeout(() => {
        console.log('\n3. 尝试非法跳转 (PAID -> COMPLETED)...');
        client.write('update ' + orderId + ' completed\n');
      }, 500);
    }

    // 检测非法跳转结果
    if (txt.includes('非法') || txt.includes('失败')) {
      console.log('\n4. 正确拒绝非法跳转!');

      // 正确流程
      setTimeout(() => {
        console.log('\n5. 正确流程: PAID -> COOKING');
        client.write('update ' + orderId + ' cooking\n');
      }, 500);
    }

    if (txt.includes('制作中')) {
      setTimeout(() => {
        console.log('\n6. 正确流程: COOKING -> COMPLETED');
        client.write('update ' + orderId + ' completed\n');
      }, 500);
    }

    if (txt.includes('已完成')) {
      console.log('\n=== 状态流转测试完成! ===');
      client.end();
      process.exit(0);
    }
  });
}

setTimeout(() => {
  if (!orderId) {
    console.log('超时，退出');
    if (client) client.end();
    process.exit(1);
  }
}, 8000);

startTest();