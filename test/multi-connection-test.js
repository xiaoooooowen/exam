/**
 * 多连接测试
 */
const net = require('net');

console.log('=== 多连接测试 ===\n');

async function test() {
  // 同时连接三个终端
  const results = await Promise.all([
    testPort(8024, '叫号牌端'),
    testPort(8025, '顾客端'),
    testPort(8026, '店主端')
  ]);

  console.log('\n结果:');
  results.forEach((r, i) => {
    console.log(`  ${r.name}: ${r.success ? '✅' : '❌'}`);
  });
}

function testPort(port, name) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let success = false;
    let data = '';

    client.connect(port, '127.0.0.1', () => {
      client.write('status\n');
    });

    client.on('data', (chunk) => {
      data += chunk.toString();
    });

    setTimeout(() => {
      client.end();
      success = data.includes('早餐店') || data.includes('订单');
      resolve({ name, success, data: data.slice(0, 100) });
    }, 1500);
  });
}

test().then(() => process.exit(0));