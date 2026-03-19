/**
 * 店主端功能测试
 */
const net = require('net');

console.log('=== 店主端功能测试 ===\n');

// 连接店主端
const owner = new net.Socket();
owner.connect(8026, '127.0.0.1', () => {
  console.log('1. 连接到店主端');
  owner.write('list\n');
});

// 延迟获取订单列表
setTimeout(() => {
  console.log('2. 查看已支付订单...\n');
  owner.write('paid\n');
}, 1500);

setTimeout(() => {
  console.log('3. 更新订单状态为制作中...\n');
  owner.write('update ORD9OY94XZS cooking\n');
}, 3000);

setTimeout(() => {
  console.log('4. 完成订单...\n');
  owner.write('update ORD9OY94XZS completed\n');
}, 4500);

setTimeout(() => {
  console.log('5. 叫号测试...\n');
  owner.write('call 1001\n');
}, 6000);

setTimeout(() => {
  console.log('6. 查看所有订单...\n');
  owner.write('list\n');
}, 7500);

setTimeout(() => {
  owner.end();
}, 9000);

owner.on('data', (data) => {
  console.log(data.toString());
});

owner.on('close', () => {
  console.log('\n=== 店主端测试结束 ===');
  process.exit(0);
});