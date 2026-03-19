/**
 * 权限控制测试
 */
const net = require('net');

console.log('=== 权限控制测试 ===\n');

let orderIdA = ''; // 顾客A的订单
let customerBId = ''; // 顾客B的customerId

async function test() {
  // 步骤1: 顾客A创建订单
  console.log('1. 顾客A创建订单');
  const clientA = new net.Socket();
  await connect(clientA, 8025);
  clientA.write('order 1,1\n');
  await wait(1000);

  let resp = getResponse(clientA);
  const match = resp.match(/订单号: (ORD[A-Z0-9]+)/);
  if (match) {
    orderIdA = match[1];
    console.log('   订单号:', orderIdA);
  }
  clientA.end();

  // 步骤2: 顾客B尝试支付顾客A的订单（应该失败）
  console.log('\n2. 顾客B尝试支付顾客A的订单');
  const clientB = new net.Socket();
  await connect(clientB, 8025);

  // 保存customerId
  setTimeout(() => {
    clientB.write('status\n');
  }, 300);

  await wait(1000);
  clientB.write('pay ' + orderIdA + '\n');
  await wait(1000);

  resp = getResponse(clientB);
  console.log('   响应:', resp.slice(0, 200));

  if (resp.includes('权限不足')) {
    console.log('   ✅ 权限控制生效！');
  } else {
    console.log('   ❌ 权限控制未生效');
  }
  clientB.end();

  // 步骤3: 顾客A支付自己的订单（应该成功）
  console.log('\n3. 顾客A支付自己的订单');
  const clientA2 = new net.Socket();
  await connect(clientA2, 8025);
  clientA2.write('pay ' + orderIdA + '\n');
  await wait(1000);

  resp = getResponse(clientA2);
  if (resp.includes('支付成功')) {
    console.log('   ✅ 支付成功！');
  } else {
    console.log('   ❌ 支付失败:', resp.slice(0, 100));
  }
  clientA2.end();

  console.log('\n=== 测试完成 ===');
  process.exit(0);
}

function connect(client, port) {
  return new Promise(resolve => {
    client.connect(port, '127.0.0.1', resolve);
  });
}

let fullData = '';
function getResponse(client) {
  const result = fullData;
  fullData = '';
  return result;
}

const client = new net.Socket();
client.connect(8025, '127.0.0.1', () => {});
client.on('data', d => fullData += d.toString());

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

test();