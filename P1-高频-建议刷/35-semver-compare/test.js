const { compareVersions } = require('./solution.js')

// 基本比较
console.assert(compareVersions('1.2.3', '1.2.4') === -1, 'patch 段 3 < 4')
console.assert(compareVersions('2.0.0', '1.9.9') === 1, 'major 段 2 > 1')
console.assert(compareVersions('1.0.0', '1.0.0') === 0, '完全相等')

// 不同长度
console.assert(compareVersions('1.2', '1.2.0') === 0, '不同长度视为相等')
console.assert(compareVersions('1.2.0.0', '1.2.0') === 0, '四段 vs 三段')

// 数值比较（非字符串）
console.assert(compareVersions('1.10.0', '1.9.0') === 1, '数值比较 10 > 9')
console.assert(compareVersions('0.1.0', '0.0.99') === 1, 'minor 段 1 > 0')

// 预发布标签
console.assert(compareVersions('1.0.0-alpha', '1.0.0-beta') === -1, 'alpha < beta')
console.assert(compareVersions('1.0.0-beta', '1.0.0-rc') === -1, 'beta < rc')
console.assert(compareVersions('1.0.0-rc', '1.0.0') === -1, 'rc < 正式版')
console.assert(compareVersions('1.0.0-alpha.1', '1.0.0-alpha.2') === -1, '预发布数字段')
console.assert(compareVersions('1.0.0-alpha', '1.0.0-alpha.1') === -1, '预发布段数不同')

// 多 '-' 预发布标签
console.assert(compareVersions('1.0.0-alpha-beta', '1.0.0-alpha') === 1, '多 - 预发布标签')

// 对称性验证
console.assert(compareVersions('1.0.0', '1.0.0-alpha') === 1, '正式版 > 预发布')
console.assert(compareVersions('1.2.4', '1.2.3') === 1, '对称性 patch')

// 输入校验
try {
  compareVersions(123, '1.0.0');
  console.assert(false, '非字符串应抛 TypeError');
} catch (e) {
  console.assert(e instanceof TypeError, '非字符串抛 TypeError');
}

try {
  compareVersions('', '1.0.0');
  console.assert(false, '空字符串应抛 Error');
} catch (e) {
  console.assert(e instanceof Error, '空字符串抛 Error');
}

console.log('✅ 全部通过')
