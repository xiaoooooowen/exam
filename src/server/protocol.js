/**
 * 协议解析模块
 * 处理客户端命令、构建响应
 */

const { OrderStatus, StatusChinese, getAllStatuses } = require('../shared/status');
const { getFullMenu, getMenuItem } = require('../shared/menu');
const state = require('./state');

/**
 * 终端类型
 */
const TerminalType = {
  CALL_BOARD: 'call_board',   // 叫号牌端 8024
  CUSTOMER: 'customer',       // 顾客下单端 8025
  SHOP_OWNER: 'shop_owner'    // 店主管理端 8026
};

/**
 * 处理命令
 * @param {string} terminalType 终端类型
 * @param {string} command 输入命令
 * @param {object} session 会话数据
 * @returns {object} {output, action}
 */
function processCommand(terminalType, command, session) {
  // 保留原始命令，只将 action 部分转为小写
  const trimmed = command.trim();
  const parts = trimmed.split(/\s+/);
  const action = parts[0].toLowerCase();

  // 通用命令
  if (action === 'help' || action === '?') {
    return { output: getHelp(terminalType) };
  }

  if (action === 'status') {
    return { output: getSystemStatus() };
  }

  // 叫号牌端命令
  if (terminalType === TerminalType.CALL_BOARD) {
    return handleCallBoardCommand(action, parts, session);
  }

  // 顾客端命令
  if (terminalType === TerminalType.CUSTOMER) {
    return handleCustomerCommand(action, parts, session);
  }

  // 店主端命令
  if (terminalType === TerminalType.SHOP_OWNER) {
    return handleShopOwnerCommand(action, parts, session);
  }

  return { output: '未知命令，输入 help 查看帮助' };
}

/**
 * 获取帮助信息
 */
function getHelp(terminalType) {
  let help = '\n=== 可用命令 ===\n\n';

  help += '通用命令:\n';
  help += '  help / ?   - 显示帮助\n';
  help += '  status     - 显示系统状态\n';

  if (terminalType === TerminalType.CALL_BOARD) {
    help += '\n叫号牌端（只读）:\n';
    help += '  自动显示当前叫号和订单状态\n';
  }

  if (terminalType === TerminalType.CUSTOMER) {
    help += '\n顾客下单端:\n';
    help += '  menu               - 查看菜单\n';
    help += '  name <昵称>        - 设置昵称\n';
    help += '  order <items>      - 下单，格式: order 1,2 3,1\n';
    help += '  myorder            - 查看我的订单\n';
    help += '  pay <orderId>      - 模拟支付订单\n';
    help += '  cancel <orderId>   - 取消订单\n';
    help += '  quit               - 退出\n';
  }

  if (terminalType === TerminalType.SHOP_OWNER) {
    help += '\n店主管理端:\n';
    help += '  list               - 查看所有订单\n';
    help += '  pending            - 查看待支付订单\n';
    help += '  paid               - 查看已支付订单\n';
    help += '  cooking            - 查看制作中订单\n';
    help += '  call <num>         - 设置当前叫号\n';
    help += '  next               - 叫下一个号\n';
    help += '  update <id> <status> - 更新订单状态\n';
    help += '                     状态: pending/paid/cooking/completed\n';
    help += '  batch <status>     - 批量更新所有已支付订单\n';
  }

  return help + '\n';
}

/**
 * 获取系统状态概览
 */
function getSystemStatus() {
  const orders = state.getOrders();
  const pending = orders.filter(o => o.status === OrderStatus.PENDING).length;
  const paid = orders.filter(o => o.status === OrderStatus.PAID).length;
  const cooking = orders.filter(o => o.status === OrderStatus.COOKING).length;
  const completed = orders.filter(o => o.status === OrderStatus.COMPLETED).length;

  return `
=== 早餐店状态 ===
当前叫号: ${state.getCurrentCallNumber()}

订单统计:
  待支付: ${pending}
  已支付: ${paid}
  制作中: ${cooking}
  已完成: ${completed}
  总计: ${orders.length}
`;
}

/**
 * 处理叫号牌端命令
 */
function handleCallBoardCommand(action, parts, session) {
  return {
    output: renderCallBoard()
  };
}

/**
 * 渲染叫号牌界面
 */
function renderCallBoard() {
  const currentNumber = state.getCurrentCallNumber();
  const orders = state.getOrders();

  // 获取当前叫号的订单
  const currentOrder = orders.find(o => {
    const num = parseInt(o.customerId.replace(/\D/g, '').slice(-4));
    return num === currentNumber && o.status !== OrderStatus.COMPLETED;
  });

  let output = '\n';
  output += '╔════════════════════════════════════════╗\n';
  output += '║         🍳 终端早餐店 - 叫号牌        ║\n';
  output += '╠════════════════════════════════════════╣\n';
  output += '║                                        ║\n';
  output += '║     当前叫号:                          ║\n';
  output += `║       ████  ${currentNumber.toString().padStart(4, '0')}  ████       ║\n`;
  output += '║                                        ║\n';

  if (currentOrder) {
    output += `║     订单号: ${currentOrder.id.padEnd(20)}║\n`;
    output += `║     状态: ${StatusChinese[currentOrder.status].padEnd(22)}║\n`;
  }

  output += '║                                        ║\n';
  output += '╠════════════════════════════════════════╣\n';

  // 显示等待队列
  const waitingOrders = orders
    .filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PAID)
    .slice(0, 5);

  output += '║     等待队列:                          ║\n';
  if (waitingOrders.length === 0) {
    output += '║       暂无等待订单                     ║\n';
  } else {
    waitingOrders.forEach((o, i) => {
      output += `║     ${i + 1}. ${o.id} [${StatusChinese[o.status].slice(0, 3)}]                    ║\n`;
    });
  }

  output += '║                                        ║\n';
  output += '╚════════════════════════════════════════╝\n';
  output += '\n自动刷新中... 输入 refresh 手动刷新\n';

  return output;
}

/**
 * 处理顾客端命令
 */
function handleCustomerCommand(action, parts, session) {
  switch (action) {
    case 'menu':
      return { output: renderMenu() };

    case 'order':
      return handlePlaceOrder(parts.slice(1), session);

    case 'myorder':
      return { output: renderMyOrders(session) };

    case 'pay':
      return handlePay(parts[1]?.toUpperCase(), session);

    case 'refresh':
      return { output: session.orderId ? renderMyOrders(session) : '暂无订单' };

    case 'name':
      return handleSetName(parts.slice(1).join(' '), session);

    case 'cancel':
      return handleCancelOrder(parts[1]?.toUpperCase(), session);

    default:
      return { output: '未知命令，输入 help 查看帮助' };
  }
}

/**
 * 渲染菜单
 */
function renderMenu() {
  const menu = getFullMenu();
  let output = '\n=== 🍳 早餐店菜单 ===\n\n';

  menu.forEach(item => {
    output += `  ${item.id}. ${item.name.padEnd(8)} ¥${item.price}   ${item.desc}\n`;
  });

  output += '\n下单示例: order 1,2 3,1\n';
  output += '  (表示: 豆浆2份, 包子1份)\n';

  return output;
}

/**
 * 处理下单
 */
function handlePlaceOrder(args, session) {
  if (args.length === 0) {
    return { output: '请输入菜品，示例: order 1,2 3,1' };
  }

  try {
    const items = args.map(arg => {
      const [id, quantity = 1] = arg.split(',');
      return { id: id.trim(), quantity: parseInt(quantity) || 1 };
    });

    // 使用会话中的名字或默认
    const customerName = session.customerName || `顾客${session.customerId?.slice(-4) || '0000'}`;
    const order = state.createOrder(customerName, items);

    session.orderId = order.id;

    return {
      output: renderOrderCreated(order)
    };
  } catch (err) {
    return { output: `下单失败: ${err.message}` };
  }
}

/**
 * 渲染订单创建成功
 */
function renderOrderCreated(order) {
  let output = '\n=== ✅ 订单创建成功 ===\n\n';
  output += `  订单号: ${order.id}\n`;
  output += `  顾客: ${order.customerName}\n\n`;
  output += '  已点菜品:\n';

  order.items.forEach(item => {
    output += `    • ${item.name} x${item.quantity} = ¥${item.subtotal}\n`;
  });

  output += `\n  总计: ¥${order.total}\n`;
  output += `\n  状态: ${StatusChinese[order.status]}\n`;
  output += `\n  支付二维码:\n`;
  output += `  ${order.payCode}\n`;
  output += '\n  请完成支付后等待叫号\n';

  return output;
}

/**
 * 渲染我的订单
 */
function renderMyOrders(session) {
  if (!session.orderId) {
    return '\n暂无订单，输入 order <菜品> 下单\n';
  }

  const order = state.getOrderById(session.orderId);
  if (!order) {
    session.orderId = null;
    return '\n订单不存在\n';
  }

  let output = '\n=== 📋 我的订单 ===\n\n';
  output += `  订单号: ${order.id}\n`;
  output += `  状态: ${StatusChinese[order.status]}\n\n`;
  output += '  已点菜品:\n';

  order.items.forEach(item => {
    output += `    • ${item.name} x${item.quantity} = ¥${item.subtotal}\n`;
  });

  output += `\n  总计: ¥${order.total}\n`;

  if (order.status === OrderStatus.PENDING) {
    output += `\n  请输入 pay ${order.id} 完成支付\n`;
  }

  return output;
}

/**
 * 处理支付
 */
function handlePay(orderId, session) {
  const targetOrderId = orderId || session.orderId;

  if (!targetOrderId) {
    return { output: '请指定订单号，或先查看我的订单' };
  }

  // 权限检查：验证订单是否属于当前顾客
  const order = state.getOrderById(targetOrderId);
  if (!order) {
    return { output: '订单不存在' };
  }
  if (order.customerId !== session.customerId) {
    return { output: '❌ 权限不足：只能操作自己的订单' };
  }

  const result = state.updateOrderStatus(targetOrderId, OrderStatus.PAID);

  if (!result.success) {
    return { output: `支付失败: ${result.error}` };
  }

  return {
    output: `\n✅ 支付成功！订单号: ${targetOrderId}\n   等待叫号制作中...\n`
  };
}

/**
 * 处理设置昵称
 */
function handleSetName(name, session) {
  if (!name || name.trim().length === 0) {
    return { output: '请输入昵称: name <你的昵称>' };
  }

  const maxLen = 10;
  if (name.length > maxLen) {
    return { output: `昵称最多 ${maxLen} 个字符` };
  }

  session.customerName = name.trim();
  return {
    output: `\n✅ 昵称已设置为: ${session.customerName}\n   后续下单将使用此昵称\n`
  };
}

/**
 * 处理取消订单
 */
function handleCancelOrder(orderId, session) {
  const targetOrderId = orderId || session.orderId;

  if (!targetOrderId) {
    return { output: '请指定订单号，或先查看我的订单' };
  }

  // 权限检查：验证订单是否属于当前顾客
  const order = state.getOrderById(targetOrderId);
  if (!order) {
    return { output: '订单不存在' };
  }
  if (order.customerId !== session.customerId) {
    return { output: '❌ 权限不足：只能操作自己的订单' };
  }

  const result = state.updateOrderStatus(targetOrderId, OrderStatus.CANCELLED);

  if (!result.success) {
    return { output: `取消失败: ${result.error}` };
  }

  session.orderId = null;
  return {
    output: `\n✅ 订单已取消: ${targetOrderId}\n`
  };
}

/**
 * 处理店主端命令
 */
function handleShopOwnerCommand(action, parts, session) {
  switch (action) {
    case 'list':
      return { output: renderAllOrders() };

    case 'pending':
      return { output: renderOrdersByStatus(OrderStatus.PENDING) };

    case 'paid':
      return { output: renderOrdersByStatus(OrderStatus.PAID) };

    case 'cooking':
      return { output: renderOrdersByStatus(OrderStatus.COOKING) };

    case 'call':
      return handleCallNumber(parts[1]);

    case 'update':
      return handleUpdateOrder(parts[1]?.toUpperCase(), parts[2]);

    case 'refresh':
      return { output: renderAllOrders() };

    case 'batch':
      return handleBatchUpdate(parts.slice(1));

    case 'next':
      return handleNextCall();

    default:
      return { output: '未知命令，输入 help 查看帮助' };
  }
}

/**
 * 渲染所有订单
 */
function renderAllOrders() {
  const orders = state.getOrders();

  if (orders.length === 0) {
    return '\n暂无订单\n';
  }

  let output = '\n=== 📋 所有订单 ===\n\n';
  output += '订单号          顾客         金额   状态\n';
  output += '────────────────────────────────────────\n';

  orders.forEach(order => {
    const id = order.id.slice(-8);
    const name = order.customerName.slice(0, 8).padEnd(8);
    const total = `¥${order.total}`.padStart(6);
    const status = StatusChinese[order.status];
    output += `${id}  ${name}  ${total}  ${status}\n`;
  });

  output += '\n';

  return output;
}

/**
 * 按状态渲染订单
 */
function renderOrdersByStatus(status) {
  const orders = state.getOrders({ status });

  if (orders.length === 0) {
    return `\n暂无${StatusChinese[status]}订单\n`;
  }

  let output = `\n=== ${StatusChinese[status]}订单 ===\n\n`;

  orders.forEach(order => {
    output += `订单号: ${order.id}\n`;
    output += `顾客: ${order.customerName}\n`;
    output += `金额: ¥${order.total}\n`;
    output += `状态: ${StatusChinese[order.status]}\n`;
    output += `时间: ${order.createdAt.slice(11, 19)}\n`;
    output += '────────────────────────────────\n';
  });

  return output;
}

/**
 * 处理叫号
 */
function handleCallNumber(num) {
  if (!num || isNaN(parseInt(num))) {
    return { output: '请输入数字: call <号码>' };
  }

  const number = parseInt(num);
  state.setCallNumber(number);

  return {
    output: `\n✅ 已设置当前叫号为: ${number}\n`
  };
}

/**
 * 处理更新订单状态
 */
function handleUpdateOrder(orderId, status) {
  if (!orderId || !status) {
    return { output: '请输入: update <订单号> <状态>\n状态可选: pending, paid, cooking, completed' };
  }

  const statusMap = {
    'pending': OrderStatus.PENDING,
    'paid': OrderStatus.PAID,
    'cooking': OrderStatus.COOKING,
    'completed': OrderStatus.COMPLETED
  };

  const newStatus = statusMap[status.toLowerCase()];
  if (!newStatus) {
    return { output: `无效状态: ${status}\n可选: pending, paid, cooking, completed` };
  }

  const result = state.updateOrderStatus(orderId, newStatus);

  if (!result.success) {
    return { output: `更新失败: ${result.error}` };
  }

  return {
    output: `\n✅ 订单 ${orderId} 状态已更新为: ${StatusChinese[newStatus]}\n`
  };
}

/**
 * 处理批量更新订单状态
 * 格式: batch cooking (将所有已支付订单设为制作中)
 */
function handleBatchUpdate(args) {
  if (args.length === 0) {
    return { output: '请输入: batch <状态>\n示例: batch cooking\n将所有已支付订单设为制作中' };
  }

  const statusMap = {
    'pending': OrderStatus.PENDING,
    'paid': OrderStatus.PAID,
    'cooking': OrderStatus.COOKING,
    'completed': OrderStatus.COMPLETED
  };

  const targetStatus = statusMap[args[0].toLowerCase()];
  if (!targetStatus) {
    return { output: `无效状态: ${args[0]}\n可选: pending, paid, cooking, completed` };
  }

  // 获取可以批量更新的订单
  const orders = state.getOrders({ status: OrderStatus.PAID });
  let successCount = 0;
  let failCount = 0;

  orders.forEach(order => {
    const result = state.updateOrderStatus(order.id, targetStatus);
    if (result.success) successCount++;
    else failCount++;
  });

  return {
    output: `\n批量操作完成:\n  成功: ${successCount}\n  失败: ${failCount}\n  目标状态: ${StatusChinese[targetStatus]}\n`
  };
}

/**
 * 处理叫下一个号
 * 自动查找下一个待制作的订单并叫号
 */
function handleNextCall() {
  const orders = state.getOrders({ status: OrderStatus.PAID });

  if (orders.length === 0) {
    return { output: '\n暂无等待制作的订单\n' };
  }

  // 获取最早支付的订单
  const nextOrder = orders[0];
  const currentNum = state.getCurrentCallNumber();
  const newNum = currentNum + 1;

  state.setCallNumber(newNum);

  return {
    output: `\n✅ 叫号: ${newNum}\n   订单号: ${nextOrder.id}\n   顾客: ${nextOrder.customerName}\n   金额: ¥${nextOrder.total}\n`
  };
}

module.exports = {
  TerminalType,
  processCommand,
  renderCallBoard,
  renderMenu
};