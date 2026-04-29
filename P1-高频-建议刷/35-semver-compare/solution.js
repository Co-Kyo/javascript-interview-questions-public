/**
 * 比较两个语义化版本号
 * @param {string} v1 - 版本号字符串，如 '1.2.3' 或 '1.0.0-alpha.1'
 * @param {string} v2 - 版本号字符串
 * @returns {number} 1 (v1 > v2) | 0 (v1 === v2) | -1 (v1 < v2)
 */
function compareVersions(v1, v2) {
  // 输入校验：确保为非空字符串
  if (typeof v1 !== 'string' || typeof v2 !== 'string') {
    throw new TypeError('Arguments must be strings');
  }
  if (!v1 || !v2) {
    throw new Error('Version strings must not be empty');
  }

  // 第一步：按 '-' 分离主版本号和预发布标签
  // '1.0.0-alpha.1' → { core: '1.0.0', prerelease: 'alpha.1' }
  // '1.0.0-alpha-beta' → { core: '1.0.0', prerelease: 'alpha-beta' }
  const parseVersion = (version) => {
    const idx = version.indexOf('-');
    if (idx === -1) return { core: version, prerelease: null };
    return { core: version.slice(0, idx), prerelease: version.slice(idx + 1) };
  };

  // 第二步：将核心版本号拆分为数值数组
  // '1.2.3' → [1, 2, 3]
  const parseSegments = (core) => core.split('.').map(Number);

  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);

  const segments1 = parseSegments(parsed1.core);
  const segments2 = parseSegments(parsed2.core);

  // 第三步：逐段比较核心版本号（major → minor → patch）
  // 取较长的长度，缺失段默认为 0
  const len = Math.max(segments1.length, segments2.length);
  for (let i = 0; i < len; i++) {
    const a = segments1[i] || 0; // 缺失段视为 0，如 '1.2' 的 patch 段
    const b = segments2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }

  // 第四步：核心版本号相同时，比较预发布标签
  // Semver 规范：有预发布标签 < 无预发布标签（即 alpha < 正式版）
  const pre1 = parsed1.prerelease;
  const pre2 = parsed2.prerelease;

  // 两者都没有预发布标签 → 完全相等
  if (!pre1 && !pre2) return 0;

  // 有预发布标签的版本 < 没有预发布标签的正式版
  // 例如 '1.0.0-alpha' < '1.0.0'
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;

  // 第五步：两者都有预发布标签，逐段比较
  // 预发布标签也可以是 '.' 分隔的多段，如 'alpha.1', 'beta.2'
  const preSegments1 = pre1.split('.');
  const preSegments2 = pre2.split('.');
  const preLen = Math.max(preSegments1.length, preSegments2.length);

  for (let i = 0; i < preLen; i++) {
    const s1 = preSegments1[i];
    const s2 = preSegments2[i];

    // 缺失的预发布段更小（更早版本）
    // 例如 '1.0.0-alpha' < '1.0.0-alpha.1'
    if (s1 === undefined) return -1;
    if (s2 === undefined) return 1;

    // 尝试按数值比较（处理 'alpha.1' 中的 '1'）
    const n1 = Number(s1);
    const n2 = Number(s2);

    // 两端都是纯数字 → 数值比较
    if (!isNaN(n1) && !isNaN(n2)) {
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
      continue;
    }

    // 否则按字符串字典序比较
    // 'alpha' < 'beta' < 'rc' 按字母序自然成立
    if (s1 > s2) return 1;
    if (s1 < s2) return -1;
  }

  // 所有段都相等
  return 0;
}

// ============ 测试用例 ============
const tests = [
  // 基本比较
  ['1.2.3', '1.2.4', -1],
  ['2.0.0', '1.9.9', 1],
  ['1.0.0', '1.0.0', 0],

  // 不同长度
  ['1.2', '1.2.0', 0],
  ['1.2.0.0', '1.2.0', 0],

  // 数值比较（非字符串）
  ['1.10.0', '1.9.0', 1],
  ['0.1.0', '0.0.99', 1],

  // 预发布标签
  ['1.0.0-alpha', '1.0.0-beta', -1],
  ['1.0.0-beta', '1.0.0-rc', -1],
  ['1.0.0-rc', '1.0.0', -1],
  ['1.0.0-alpha.1', '1.0.0-alpha.2', -1],
  ['1.0.0-alpha', '1.0.0-alpha.1', -1],

  // 多 '-' 预发布标签（B1 bug 修复验证）
  ['1.0.0-alpha-beta', '1.0.0-alpha', 1],

  // 对称性验证
  ['1.0.0', '1.0.0-alpha', 1],
  ['1.2.4', '1.2.3', 1],
];

let passed = 0;
for (const [a, b, expected] of tests) {
  const result = compareVersions(a, b);
  const ok = result === expected;
  if (!ok) {
    console.log(`FAIL: compareVersions('${a}', '${b}') → ${result}, expected ${expected}`);
  }
  passed += ok ? 1 : 0;
}
console.log(`\n${passed}/${tests.length} tests passed`);
if (passed < tests.length) process.exit(1);

// 导出供其他模块使用
module.exports = { compareVersions };
