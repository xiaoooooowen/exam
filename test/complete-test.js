/**
 * 完整功能测试
 */
const net = require('net');

let orderId = '';

console.log('=== 完整功能测试 ===\n');

// 步骤1: 顾客下单
function customerOrder() {
  return new Promise((resolve) => {
    const client = new net.Socket();

    client.connect(8025, '127.0.0.1', () => {
      console.log('【顾客端】设置昵称: Alice');
      client.write('name Alice\n');
    });

    client.on('data', (data) => {
      const txt = data.toString();
      console.log(txt);

      // 提取订单号
      const match = txt.match(/订单号: (ORD[A-Z0-9]+)/);
      if (match && !orderId) {
        orderId = match[1];
        console.log('>>> 订单号:', orderId);

        // 支付
        setTimeout(() => {
          console.log('\n【顾客端】支付订单');
          client.write('pay ' + orderId + '\n');
          setTimeout(() => client.end(), 500);
        }, 500);
      }
    });

    client.on('close', () => {
      console.log('>>> 顾客端完成\n');
      resolve();
    });
  });
}

// 步骤2: 店主操作
function shopOwner() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let step = 0;

    setTimeout(() => {
      client.connect(8026, '127.0.0.1', () => {
        console.log('【店主端】查看订单');
        client.write('list\n');
      });

      client.on('data', (data) => {
        const txt = data.toString();
        console.log(txt);

        step++;
        if (step === 1) {
          console.log('【店主端】批量设置制作中');
          client.write('batch cooking\n');
        } else if (step === 2) {
          console.log('【店主端】叫下一个号');
          client.write('next\n');
        } else if (step === 3) {
          console.log('【店主端】完成订单');
          client.write('update ' + orderId + ' completed\n');
          setTimeout(() => client.end(), 500);
        }
      });

      client.on('close', () => {
        console.log('>>> 店主端完成\n');
        resolve();
      });
    }, 1500);
  });
}

// 步骤3: 叫号牌
function callBoard() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const client = new net.Socket();

      client.connect(8024, '127.0.0.1', () => {
        console.log('【叫号牌】连接');
      });

      client.on('data', (data) => {
        console.log('【叫号牌】显示内容:');
        console.log(data.toString().slice(0, 500));
      });

      setTimeout(() => client.end(), 3500);

      client.on('close', () => {
        console.log('>>> 叫号牌完成\n');
        resolve();
      });
    }, 4500);
  });
}

// 运行
async function run() {
  await customerOrder();
  await shopOwner();
  await callBoard();
  console.log('=== 测试完成 ===');
  process.exit(0);
}

run();