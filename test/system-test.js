/**
 * 系统测试脚本
 * 包含: 多连接测试、状态流转测试、断连恢复测试、并发一致性测试
 */

const net = require('net');
const { OrderStatus } = require('../src/shared/status');

const PORTS = {
  CALL_BOARD: 8024,
  CUSTOMER: 8025,
  SHOP_OWNER: 8026
};

let testsPassed = 0;
let testsFailed = 0;

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${testName}`);
    testsFailed++;
  }
}

// ========== 测试1: 多连接测试 ==========
async function testMultipleConnections() {
  console.log('\n========== 测试1: 多连接测试 ==========');

  const connections = [];

  // 连接到三个终端
  for (const [name, port] of Object.entries(PORTS)) {
    await new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.connect(port, '127.0.0.1', () => {
        log(`连接到${name}成功`);
        connections.push(client);
        resolve();
      });
      client.on('error', reject);
    });
  }

  // 同时发送命令
  const results = await Promise.all([
    sendCommand(connections[0], 'status'),
    sendCommand(connections[1], 'menu'),
    sendCommand(connections[2], 'list')
  ]);

  assert(results[0].includes('早餐店状态'), '叫号牌端响应正常');
  assert(results[1].includes('早餐店菜单'), '顾客端响应正常');
  assert(results[2].includes('订单'), '店主端响应正常');

  // 断开所有连接
  connections.forEach(c => c.end());

  await delay(500);
  log('多连接测试完成');
}

function sendCommand(client, cmd) {
  return new Promise((resolve) => {
    let data = '';
    const handler = (chunk) => {
      data += chunk.toString();
    };
    client.on('data', handler);
    client.write(cmd + '\n');
    setTimeout(() => {
      client.removeListener('data', handler);
      resolve(data);
    }, 800);
  });
}

// ========== 测试2: 状态流转测试 ==========
async function testStatusTransition() {
  console.log('\n========== 测试2: 状态流转测试 ==========');

  const client = new net.Socket();
  let orderId = '';

  await new Promise((resolve) => {
    client.connect(PORTS.CUSTOMER, '127.0.0.1', resolve);
  });

  // 下单
  client.write('order 1,1\n');
  await delay(800);

  // 获取订单号
  let response = await receiveData(client);
  const match = response.match(/订单号: (ORD[A-Z0-9]+)/);
  if (match) orderId = match[1];
  assert(orderId !== '', '订单创建成功');

  // 支付 -> 状态: PENDING -> PAID
  client.write(`pay ${orderId}\n`);
  await delay(800);
  response = await receiveData(client);
  assert(response.includes('支付成功'), '支付成功 PENDING -> PAID');

  // 尝试非法跳转: PAID -> COMPLETED (应该失败)
  client.write(`update ${orderId} completed\n`);
  await delay(800);
  response = await receiveData(client);
  assert(response.includes('非法状态跳转') || response.includes('更新失败'),
    '非法状态跳转被拒绝 PAID -> COMPLETED');

  // 正确流程: PAID -> COOKING -> COMPLETED
  client.write(`update ${orderId} cooking\n`);
  await delay(800);
  response = await receiveData(client);
  assert(response.includes('制作中'), '状态变更 PAID -> COOKING');

  client.write(`update ${orderId} completed\n`);
  await delay(800);
  response = await receiveData(client);
  assert(response.includes('已完成'), '状态变更 COOKING -> COMPLETED');

  client.end();
  await delay(500);
  log('状态流转测试完成');
}

function receiveData(client, timeout = 1000) {
  return new Promise((resolve) => {
    let data = '';
    const handler = (chunk) => {
      data += chunk.toString();
    };
    client.on('data', handler);
    setTimeout(() => {
      client.removeListener('data', handler);
      resolve(data);
    }, timeout);
  });
}

// ========== 测试3: 断连恢复测试 ==========
async function testDisconnectRecovery() {
  console.log('\n========== 测试3: 断连恢复测试 ==========');

  // 客户端1: 创建订单
  const client1 = new net.Socket();
  await new Promise((resolve) => {
    client1.connect(PORTS.CUSTOMER, '127.0.0.1', resolve);
  });

  client1.write('order 2,1\n');
  await delay(800);

  let response = await receiveData(client1);
  const match = response.match(/订单号: (ORD[A-Z0-9]+)/);
  const orderId = match ? match[1] : '';
  client1.end();

  assert(orderId !== '', '创建订单成功');

  // 断连后，通过店主端查看订单是否存在
  await delay(500);

  const client2 = new net.Socket();
  await new Promise((resolve) => {
    client2.connect(PORTS.SHOP_OWNER, '127.0.0.1', resolve);
  });

  client2.write('list\n');
  await delay(800);

  response = await receiveData(client2);
  assert(response.includes(orderId), '断连后订单数据保持');

  // 支付订单
  client2.write(`update ${orderId} paid\n`);
  await delay(800);

  response = await receiveData(client2);
  assert(response.includes('已支付'), '断连后仍可操作订单');

  client2.end();
  await delay(500);
  log('断连恢复测试完成');
}

// ========== 测试4: 并发一致性测试 ==========
async function testConcurrentConsistency() {
  console.log('\n========== 测试4: 并发一致性测试 ==========');

  // 同时创建3个订单
  const createOrder = (index) => {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(PORTS.CUSTOMER, '127.0.0.1', () => {
        client.write(`order ${index},1\n`);
      });
      client.on('data', (data) => {
        const txt = data.toString();
        const match = txt.match(/订单号: (ORD[A-Z0-9]+)/);
        resolve(match ? match[1] : null);
      });
      setTimeout(() => resolve(null), 2000);
    });
  };

  const orderIds = await Promise.all([
    createOrder(1),
    createOrder(2),
    createOrder(3)
  ]);

  const validOrders = orderIds.filter(id => id !== null);
  assert(validOrders.length === 3, `并发创建订单: ${validOrders.length}/3 成功`);

  // 验证订单ID唯一性
  const uniqueIds = new Set(validOrders);
  assert(uniqueIds.size === validOrders.length, '订单ID唯一');

  // 并发支付
  const payOrder = (orderId) => {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.connect(PORTS.CUSTOMER, '127.0.0.1', () => {
        client.write(`pay ${orderId}\n`);
      });
      client.on('data', (data) => {
        resolve(data.toString().includes('成功'));
      });
      setTimeout(() => resolve(false), 2000);
    });
  };

  const payResults = await Promise.all(validOrders.map(id => payOrder(id)));
  assert(payResults.every(r => r), `并发支付: ${payResults.filter(r => r).length}/${validOrders.length} 成功`);

  // 验证订单状态一致性
  await delay(500);
  const client = new net.Socket();
  await new Promise((resolve) => {
    client.connect(PORTS.SHOP_OWNER, '127.0.0.1', resolve);
  });

  client.write('paid\n');
  await delay(800);

  const response = await receiveData(client);
  let paidCount = 0;
  validOrders.forEach(id => {
    if (response.includes(id)) paidCount++;
  });

  assert(paidCount === validOrders.length, `订单状态一致: ${paidCount}/${validOrders.length}`);

  client.end();
  await delay(500);
  log('并发一致性测试完成');
}

// ========== 辅助函数 ==========
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== 主函数 ==========
async function runAllTests() {
  console.log('========================================');
  console.log('   早餐店系统 - 综合测试');
  console.log('========================================');
  console.log(`测试时间: ${new Date().toLocaleString()}`);

  try {
    await testMultipleConnections();
    await testStatusTransition();
    await testDisconnectRecovery();
    await testConcurrentConsistency();
  } catch (err) {
    console.error('测试过程出错:', err.message);
  }

  console.log('\n========================================');
  console.log(`测试结果: ${testsPassed} 通过, ${testsFailed} 失败`);
  console.log('========================================');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runAllTests();