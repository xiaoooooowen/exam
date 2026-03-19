/**
 * 早餐店菜单数据
 */

const MenuItems = [
  { id: '1', name: '豆浆', price: 3, desc: '现磨浓香豆浆' },
  { id: '2', name: '油条', price: 2, desc: '酥脆可口油条' },
  { id: '3', name: '包子', price: 3, desc: '鲜肉大包' },
  { id: '4', name: '煎饼', price: 6, desc: '杂粮煎饼加蛋' },
  { id: '5', name: '粥', price: 4, desc: '皮蛋瘦肉粥' },
  { id: '6', name: '茶叶蛋', price: 2, desc: '卤味茶叶蛋' },
  { id: '7', name: '馒头', price: 1, desc: '白面馒头' },
  { id: '8', name: '牛奶', price: 5, desc: '盒装纯牛奶' }
];

/**
 * 根据ID获取菜单项
 * @param {string} id 菜单ID
 * @returns {object|null}
 */
function getMenuItem(id) {
  return MenuItems.find(item => item.id === id) || null;
}

/**
 * 获取完整菜单
 */
function getFullMenu() {
  return [...MenuItems];
}

module.exports = {
  MenuItems,
  getMenuItem,
  getFullMenu
};