/**
 * 里程碑2 功能测试
 */
const net = require('net');

console.log('=== 里程碑2功能测试 ===\n');

// 测试顾客端新功能
function testCustomerNewFeatures() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let step = 0;

    client.connect(8025, '127.0.0.1', () => {
      console.log('1. 顾客端测试 - 设置昵称');
      client.write('name 测试用户A\n');
    });

    client.on('data', (data) => {
      const txt = data.toString();
      console.log(txt);

      step++;
      if (step === 1) {
        console.log('2. 下单（使用昵称）');
        client.write('order 1,1 2,1\n');
      } else if (step === 2) {
        // 提取订单号
        const match = txt.match(/订单号: (ORD[A-Z0-9]+)/);
        if (match) {
          console.log('3. 取消订单');
          client.write('cancel ' + match[1] + '\n');
        }
        setTimeout(() => client.end(), 500);
      }
    });

    client.on('close', () => {
      console.log('顾客端测试完成\n');
      resolve();
    });
  });
}

// 测试店主端新功能
function testShopOwnerNewFeatures() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let step = 0;

    client.connect(8026, '127.0.0.1', () => {
      console.log('4. 店主端测试 - 先创建订单');
      // 连接到顾客端创建订单
      createTestOrder();
    });

    client.on('data', (data) => {
      const txt = data.toString();
      console.log(txt);

      step++;
      if (step === 1) {
        console.log('5. 批量操作 - 设置所有已支付为制作中');
        client.write('batch cooking\n');
      } else if (step === 2) {
        console.log('6. 叫下一个号');
        client.write('next\n');
      } else if (step === 3) {
        setTimeout(() => client.end(), 500);
      }
    });

    client.on('close', () => {
      console.log('店主端测试完成\n');
      resolve();
    });
  });
}

// 创建测试订单的辅助函数
function createTestOrder() {
  const client = new net.Socket();
  client.connect(8025, '127.0.0.1', () => {
    client.write('name 测试用户B\n');
    setTimeout(() => client.write('order 3,1\n'), 300);
    setTimeout(() => {
      client.write('pay\n');
      setTimeout(() => client.end(), 500);
    }, 800);
  });
  client.on('data', () => {});
}

// 运行测试
async function runTests() {
  await testCustomerNewFeatures();
  await new Promise(r => setTimeout(r, 2000));
  await testShopOwnerNewFeatures();
  console.log('=== 所有测试完成 ===');
  process.exit(0);
}

runTests();