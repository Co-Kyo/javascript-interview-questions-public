# 35 - 版本号比较 五步讲解

## 第一步：理解 Semver 规范

语义化版本（Semantic Versioning）是 npm 生态的基石。格式为：

```
MAJOR.MINOR.PATCH[-PRERELEASE]
```

- `MAJOR`：破坏性变更
- `MINOR`：新增功能（向下兼容）
- `PATCH`：Bug 修复
- `-PRERELEASE`：预发布标签（如 `-alpha.1`, `-beta.2`, `-rc.1`）

**比较规则的核心思想**：从左到右逐段比较，高位不同直接出结果，高位相同才看低位。

---

## 第二步：解析版本号字符串

将版本号字符串拆解为可比较的结构：

```js
// 分离核心版本和预发布标签
'1.0.0-alpha.1'.split('-')  // ['1.0.0', 'alpha.1']

// 核心版本拆段
'1.0.0'.split('.')          // ['1', '0', '0']

// 转为数值（关键！）
['1', '10', '0'].map(Number) // [1, 10, 0]
```

**易错点**：如果用字符串比较 `'10' < '9'` 会得到 `true`（字典序），必须转为数值。

---

## 第三步：逐段比较核心版本号

这是算法的核心。对 `major`、`minor`、`patch` 从左到右依次比较：

```js
const len = Math.max(segments1.length, segments2.length);
for (let i = 0; i < len; i++) {
  const a = segments1[i] || 0; // 缺失段视为 0
  const b = segments2[i] || 0;
  if (a > b) return 1;
  if (a < b) return -1;
}
```

**关键设计**：缺失段补 `0`，这样 `'1.2'` 和 `'1.2.0'` 可以正确比较为相等。

**时间复杂度**：O(1)，因为版本号段数是固定的小常数（通常 3 段）。

---

## 第四步：处理预发布标签（Bonus）

预发布标签的比较遵循 Semver 规范：

1. **有预发布 < 无预发布**：`1.0.0-alpha < 1.0.0`（预发布是正式版的"前奏"）
2. **预发布逐段比较**：`alpha.1` 拆为 `['alpha', '1']`，逐段比较
3. **数字段按数值比，字符串段按字典序**：`'alpha' < 'beta' < 'rc'`

```js
// 有预发布标签的版本更"早"
if (pre1 && !pre2) return -1;  // v1 是预发布，v2 是正式版
if (!pre1 && pre2) return 1;   // v1 是正式版，v2 是预发布

// 都有预发布 → 逐段比较
// 纯数字段按数值比，否则按字符串比
const preSegments1 = pre1.split('.');
const preSegments2 = pre2.split('.');
const preLen = Math.max(preSegments1.length, preSegments2.length);

for (let i = 0; i < preLen; i++) {
  const s1 = preSegments1[i];
  const s2 = preSegments2[i];
  if (s1 === undefined) return -1;  // 缺失段更小
  if (s2 === undefined) return 1;

  const n1 = Number(s1);
  const n2 = Number(s2);
  if (!isNaN(n1) && !isNaN(n2)) {   // 都是数字 → 数值比较
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
    continue;
  }
  if (s1 > s2) return 1;            // 否则字典序
  if (s1 < s2) return -1;
}
```

**字典序的天然优势**：`'alpha' < 'beta' < 'rc'` 按字母序自然成立，无需额外映射。

**⚠️ split('-') 陷阱**：`'1.0.0-alpha-beta'.split('-')` 产生 3 个段 `['1.0.0', 'alpha', 'beta']`，如果用解构 `[core, prerelease]` 只取前两个，会丢失 `'-beta'`。正确做法是用 `indexOf('-')` 定位第一个 `-`，再用 `slice` 分割，保留完整的预发布标签 `alpha-beta`。

---

## 第五步：边界情况与测试覆盖

完整实现需要考虑的边界情况：

| 场景 | 示例 | 预期结果 |
|------|------|---------|
| 核心版本相等 | `1.0.0` vs `1.0.0` | `0` |
| 不同长度 | `1.2` vs `1.2.0` | `0` |
| 数值 vs 字符串比较 | `1.10.0` vs `1.9.0` | `1` |
| 预发布 vs 正式版 | `1.0.0-alpha` vs `1.0.0` | `-1` |
| 预发布段数不同 | `1.0.0-alpha` vs `1.0.0-alpha.1` | `-1` |
| 预发布数字段 | `1.0.0-alpha.1` vs `1.0.0-alpha.2` | `-1` |
| 多 `-` 预发布 | `1.0.0-alpha-beta` vs `1.0.0-alpha` | `1` |
| 对称性 | `1.0.0` vs `1.0.0-alpha` | `1` |

**面试加分项**：
- 主动提到 `Number()` 转换防止字符串比较的坑
- 考虑缺失段补 0 的设计
- Bonus 部分能正确处理预发布标签的分层比较
- 注意 `split('-')` 多段陷阱，使用 `indexOf` + `slice` 替代解构
- 主动讨论无效输入的处理策略（抛异常 vs 静默处理）
- 写出测试用例验证实现

---

## 总结

版本号比较的本质是**多级有序标识符的逐段比较**：

1. **解析**：拆分字符串为可比较的结构
2. **补位**：缺失段补 0，保证长度一致
3. **逐段比较**：高位优先，遇不同立即返回
4. **预发布处理**：按 Semver 规范区分正式版与预发布
5. **数值转换**：始终用数值而非字符串比较数字段

这是一个看似简单但细节丰富的题目，能很好地考察候选人对边界情况的敏感度和代码的健壮性。
