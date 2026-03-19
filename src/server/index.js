/**
 * 早餐店多端 TUI 系统 - 服务器入口
 * 监听端口:
 *   8024 - 叫号牌端 (只读)
 *   8025 - 顾客下单端
 *   8026 - 店主管理端
 */

const net = require('net');
const state = require('./state');
const { TerminalType, processCommand, renderCallBoard } = require('./protocol');

// 服务器配置
const PORTS = {
  [TerminalType.CALL_BOARD]: 8024,
  [TerminalType.CUSTOMER]: 8025,
  [TerminalType.SHOP_OWNER]: 8026
};

// 终端配置
const TerminalConfig = {
  [TerminalType.CALL_BOARD]: {
    name: '叫号牌端',
    welcome: `
================================================
       🍳 欢迎使用终端早餐店 - 叫号牌
================================================
显示当前叫号和订单状态，自动刷新
================================================
`,
    readonly: true
  },
  [TerminalType.CUSTOMER]: {
    name: '顾客下单端',
    welcome: `
================================================
       🍳 欢迎使用终端早餐店 - 下单端
================================================
输入 menu 查看菜单，order 下单
================================================
`,
    readonly: false
  },
  [TerminalType.SHOP_OWNER]: {
    name: '店主管理端',
    welcome: `
================================================
       🍳 欢迎使用终端早餐店 - 管理端
================================================
输入 help 查看命令
================================================
`,
    readonly: false
  }
};

// 客户端连接管理
const clients = new Map();

/**
 * 创建 TCP 服务器
 */
function createServer(terminalType) {
  const port = PORTS[terminalType];
  const config = TerminalConfig[terminalType];

  const server = net.createServer((socket) => {
    const clientId = `${terminalType}-${Date.now()}`;
    const session = {
      id: clientId,
      type: terminalType,
      customerId: `C${Date.now()}`,
      orderId: null
    };

    console.log(`[${config.name}] 新连接: ${socket.remoteAddress}:${socket.remotePort}`);

    // 发送欢迎信息
    socket.write(config.welcome);

    // 如果是叫号牌端，自动显示界面
    if (terminalType === TerminalType.CALL_BOARD) {
      socket.write(renderCallBoard());
      clients.set(clientId, { socket, session, terminalType });
    }

    // 定时刷新叫号牌
    let refreshInterval = null;
    if (terminalType === TerminalType.CALL_BOARD) {
      refreshInterval = setInterval(() => {
        if (!socket.destroyed) {
          socket.write('\x1B[2J\x1B[H'); // 清屏
          socket.write(renderCallBoard());
        }
      }, 3000);
    }

    // 数据缓冲区
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      // 处理每行命令
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留未完成的行

      lines.forEach(line => {
        if (!line.trim()) return;

        // 处理叫号牌端的刷新命令
        if (terminalType === TerminalType.CALL_BOARD && line.trim().toLowerCase() === 'refresh') {
          socket.write('\x1B[2J\x1B[H');
          socket.write(renderCallBoard());
          return;
          // 只读终端不处理其他命令
        }

        if (config.readonly) {
          socket.write('此终端为只读模式，不能执行命令\n');
          return;
        }

        // 处理命令
        const result = processCommand(terminalType, line, session);
        socket.write(result.output);
      });
    });

    socket.on('close', () => {
      console.log(`[${config.name}] 断开连接: ${clientId}`);
      clients.delete(clientId);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    });

    socket.on('error', (err) => {
      console.error(`[${config.name}] 错误: ${err.message}`);
      clients.delete(clientId);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    });
  });

  server.listen(port, () => {
    console.log(`[${config.name}] 服务已启动，监听端口 ${port}`);
  });

  return server;
}

/**
 * 广播消息到指定类型的所有客户端
 */
function broadcastToType(terminalType, message) {
  clients.forEach((client, id) => {
    if (client.terminalType === terminalType && !client.socket.destroyed) {
      client.socket.write(message);
    }
  });
}

/**
 * 初始化事件监听
 */
function initEventListeners() {
  state.addListener((event, data) => {
    if (event === 'order:status_changed' || event === 'call:changed') {
      // 状态变更时，通知叫号牌端刷新
      broadcastToType(TerminalType.CALL_BOARD, '\x1B[2J\x1B[H');
      broadcastToType(TerminalType.CALL_BOARD, renderCallBoard());
    }
  });
}

// 启动服务器
function start() {
  console.log('================================================');
  console.log('       🍳 终端早餐店 - 多端 TUI 系统');
  console.log('================================================\n');

  initEventListeners();

  // 启动三个服务器
  createServer(TerminalType.CALL_BOARD);
  createServer(TerminalType.CUSTOMER);
  createServer(TerminalType.SHOP_OWNER);

  console.log('\n服务启动完成！\n');
  console.log('连接方式:');
  console.log('  叫号牌端: nc localhost 8024');
  console.log('  顾客下单: nc localhost 8025');
  console.log('  店主管理: nc localhost 8026');
  console.log('\n按 Ctrl+C 停止服务\n');
}

// 导出
module.exports = { start };

// 主入口
if (require.main === module) {
  start();
}