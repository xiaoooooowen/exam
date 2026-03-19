/**
 * 状态管理模块
 * 负责管理订单、状态存储、状态变更、事件广播
 */

const { OrderStatus, canTransition, StatusChinese } = require('../shared/status');
const { getMenuItem } = require('../shared/menu');

// 订单存储
let orders = new Map();

// 当前叫号
let currentCallNumber = 0;

// 事件监听器
const listeners = new Set();

/**
 * 生成订单ID
 */
function generateOrderId() {
  const timestamp = Date.now().toString(36).slice(-4);
  const random = Math.random().toString(36).slice(2, 6);
  return `ORD${timestamp}${random}`.toUpperCase();
}

/**
 * 生成顾客ID
 */
function generateCustomerId() {
  return `CUST${Date.now()}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();
}

/**
 * 广播事件到所有监听器
 */
function broadcast(event, data) {
  listeners.forEach(listener => {
    try {
      listener(event, data);
    } catch (err) {
      console.error('Broadcast error:', err);
    }
  });
}

/**
 * 添加事件监听器
 */
function addListener(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * 创建新订单
 * @param {string} customerName 顾客名称
 * @param {Array} items 点餐项目 [{id, quantity}]
 * @returns {object} 订单对象
 */
function createOrder(customerName, items) {
  const orderId = generateOrderId();
  const customerId = generateCustomerId();

  let total = 0;
  const orderItems = items.map(item => {
    const menuItem = getMenuItem(item.id);
    if (!menuItem) throw new Error(`菜单项不存在: ${item.id}`);
    const subtotal = menuItem.price * item.quantity;
    total += subtotal;
    return {
      ...menuItem,
      quantity: item.quantity,
      subtotal
    };
  });

  const order = {
    id: orderId,
    customerId,
    customerName,
    items: orderItems,
    total,
    status: OrderStatus.PENDING,
    payCode: `mock://pay/${orderId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  orders.set(orderId, order);

  // 广播新订单事件
  broadcast('order:created', order);

  return order;
}

/**
 * 更新订单状态
 * @param {string} orderId 订单ID
 * @param {string} newStatus 新状态
 * @returns {object} {success, order, error}
 */
function updateOrderStatus(orderId, newStatus) {
  const order = orders.get(orderId);

  if (!order) {
    return { success: false, error: '订单不存在' };
  }

  // 检查状态流转是否合法
  if (!canTransition(order.status, newStatus)) {
    return {
      success: false,
      error: `非法状态跳转: ${StatusChinese[order.status]} -> ${StatusChinese[newStatus]}`
    };
  }

  const oldStatus = order.status;
  order.status = newStatus;
  order.updatedAt = new Date().toISOString();

  // 广播状态变更事件
  broadcast('order:status_changed', {
    orderId,
    oldStatus,
    newStatus,
    order
  });

  return { success: true, order };
}

/**
 * 获取订单列表
 * @param {object} filters 过滤条件
 */
function getOrders(filters = {}) {
  let result = Array.from(orders.values());

  if (filters.status) {
    result = result.filter(o => o.status === filters.status);
  }

  // 按创建时间倒序
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return result;
}

/**
 * 根据ID获取订单
 */
function getOrderById(orderId) {
  return orders.get(orderId) || null;
}

/**
 * 获取当前叫号
 */
function getCurrentCallNumber() {
  return currentCallNumber;
}

/**
 * 设置叫号
 */
function setCallNumber(number) {
  currentCallNumber = number;
  broadcast('call:changed', { currentNumber: number });
  return currentCallNumber;
}

/**
 * 获取等待中的订单数量
 */
function getWaitingCount() {
  return orders.values.filter(o =>
    o.status === OrderStatus.PENDING || o.status === OrderStatus.PAID
  ).length;
}

/**
 * 重置所有数据（测试用）
 */
function reset() {
  orders.clear();
  currentCallNumber = 0;
  broadcast('state:reset', null);
}

/**
 * 获取完整状态（用于初始化同步）
 */
function getFullState() {
  return {
    orders: Array.from(orders.values()),
    currentCallNumber
  };
}

module.exports = {
  createOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
  getCurrentCallNumber,
  setCallNumber,
  getWaitingCount,
  getFullState,
  addListener,
  reset,
  OrderStatus
};