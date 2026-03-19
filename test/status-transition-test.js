/**
 * 状态流转测试
 */
const net = require('net');

console.log('=== 状态流转测试 ===\n');

let client;
let orderId = '';

async function test() {
  client = new net.Socket();

  await new Promise((resolve) => {
    client.connect(8025, '127.0.0.1', () => {
      console.log('1. 连接顾客端成功');
      resolve();
    });
  });

  // 下单
  console.log('2. 下单...');
  client.write('order 1,1\n');
  await wait(1200);

  let response = getResponse();
  console.log('响应:', response.slice(0, 200));

  const match = response.match(/订单号: (ORD[A-Z0-9]+)/);
  if (match) {
    orderId = match[1];
    console.log('   订单号:', orderId);
  }

  // 支付
  if (orderId) {
    console.log('3. 支付订单...');
    client.write(`pay ${orderId}\n`);
    await wait(1200);

    response = getResponse();
    console.log('响应:', response.slice(0, 200));
  }

  // 尝试非法跳转
  if (orderId) {
    console.log('4. 尝试非法跳转 (PAID -> COMPLETED)...');
    client.write(`update ${orderId} completed\n`);
    await wait(1200);

    response = getResponse();
    console.log('响应:', response.slice(0, 200));
  }

  // 正确流程
  if (orderId) {
    console.log('5. 正确流程: PAID -> COOKING');
    client.write(`update ${orderId} cooking\n`);
    await wait(1200);

    response = getResponse();
    console.log('响应:', response.slice(0, 200));
  }

  if (orderId) {
    console.log('6. 正确流程: COOKING -> COMPLETED');
    client.write(`update ${orderId} completed\n`);
    await wait(1200);

    response = getResponse();
    console.log('响应:', response.slice(0, 200));
  }

  client.end();
  console.log('\n=== 测试完成 ===');
  process.exit(0);
}

let fullResponse = '';

function getResponse() {
  const result = fullResponse;
  fullResponse = '';
  return result;
}

client = new net.Socket();
client.connect(8025, '127.0.0.1', () => {});

client.on('data', (chunk) => {
  fullResponse += chunk.toString();
});

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

test();