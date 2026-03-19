/**
 * 简单 TCP 客户端测试
 */

const net = require('net');

function testPort(port, name) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let data = '';

    client.connect(port, 'localhost', () => {
      console.log(`[${name}] 连接成功`);
    });

    client.on('data', (chunk) => {
      data += chunk.toString();
    });

    client.on('close', () => {
      console.log(`[${name}] 收到响应:\n${data.slice(0, 500)}...`);
      resolve();
    });

    client.on('error', (err) => {
      console.log(`[${name}] 错误: ${err.message}`);
      resolve();
    });

    // 发送测试命令
    setTimeout(() => {
      client.write('status\n');
    }, 1000);

    // 3秒后断开
    setTimeout(() => {
      client.destroy();
    }, 3000);
  });
}

async function runTests() {
  console.log('=== 服务器测试 ===\n');

  await testPort(8024, '叫号牌端(8024)');
  await testPort(8025, '顾客下单端(8025)');
  await testPort(8026, '店主管理端(8026)');

  console.log('\n测试完成');
  process.exit(0);
}

runTests();