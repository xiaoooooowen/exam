/**
 * 订单状态枚举
 */
const OrderStatus = {
  PENDING: 'PENDING',     // 待支付
  PAID: 'PAID',           // 已支付
  COOKING: 'COOKING',     // 制作中
  COMPLETED: 'COMPLETED', // 已完成
  CANCELLED: 'CANCELLED'  // 已取消
};

/**
 * 状态流转规则
 * key: 当前状态 -> value: 允许的下一状态
 */
const StatusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.COOKING],
  [OrderStatus.COOKING]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: []
};

/**
 * 状态中文描述
 */
const StatusChinese = {
  [OrderStatus.PENDING]: '待支付',
  [OrderStatus.PAID]: '已支付',
  [OrderStatus.COOKING]: '制作中',
  [OrderStatus.COMPLETED]: '已完成',
  [OrderStatus.CANCELLED]: '已取消'
};

/**
 * 检查状态流转是否合法
 * @param {string} currentStatus 当前状态
 * @param {string} newStatus 新状态
 * @returns {boolean} 是否允许
 */
function canTransition(currentStatus, newStatus) {
  const allowed = StatusTransitions[currentStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * 获取所有状态列表
 */
function getAllStatuses() {
  return Object.values(OrderStatus);
}

module.exports = {
  OrderStatus,
  StatusTransitions,
  StatusChinese,
  canTransition,
  getAllStatuses
};