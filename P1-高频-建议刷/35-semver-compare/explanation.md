# 35 - 版本号比较 - 讲解

## 第一步：理解问题

语义化版本（Semver）格式为 `MAJOR.MINOR.PATCH[-PRERELEASE]`，比较规则的核心思想：**从左到右逐段比较，高位不同直接出结果，高位相同才看低位**。

额外难点：
- 各段必须按**数值**比较（`'10' > '9'` 是字典序的坑，必须转 Number）
- 预发布标签的比较：有预发布 < 无预发布（`1.0.0-alpha < 1.0.0`）
- `split('-')` 可能产生多段（`'1.0.0-alpha-beta'`），不能用解构只取两个

---

## 第二步：核心思路

1. **解析**：用 `indexOf('-')` 分离核心版本和预发布标签（避免 `split('-')` 多段陷阱）
2. **拆段**：核心版本按 `.` 拆分，转为数值数组
3. **逐段比较**：从 major 到 patch，缺失段补 0
4. **预发布比较**：核心版本相同时，按 Semver 规则比较预发布标签

---

## 第三步：逐步实现

### 3.1 解析版本号字符串

```javascript
const parseVersion = (version) => {
  const idx = version.indexOf('-');
  if (idx === -1) return { core: version, prerelease: null };
  return { core: version.slice(0, idx), prerelease: version.slice(idx + 1) };
};
```

用 `indexOf('-')` 定位第一个 `-`，再用 `slice` 分割。这样 `'1.0.0-alpha-beta'` 的预发布标签是完整的 `'alpha-beta'`，不会丢失。

### 3.2 比较核心版本号

```javascript
const parseSegments = (core) => core.split('.').map(Number);

const segments1 = parseSegments(parsed1.core);
const segments2 = parseSegments(parsed2.core);

const len = Math.max(segments1.length, segments2.length);
for (let i = 0; i < len; i++) {
  const a = segments1[i] || 0;
  const b = segments2[i] || 0;
  if (a > b) return 1;
  if (a < b) return -1;
}
```

**`map(Number)`**：将字符串段转为数值，避免 `'10' < '9'` 的字典序陷阱。

**`|| 0`**：缺失段视为 0，这样 `'1.2'` 和 `'1.2.0'` 可以正确比较为相等。

### 3.3 处理预发布标签

```javascript
const pre1 = parsed1.prerelease;
const pre2 = parsed2.prerelease;

if (!pre1 && !pre2) return 0;
if (pre1 && !pre2) return -1;
if (!pre1 && pre2) return 1;
```

核心版本相同时：有预发布标签的版本更"早"（`1.0.0-alpha < 1.0.0`）。这是 Semver 规范的核心语义。

### 3.4 预发布标签逐段比较

```javascript
const preSegments1 = pre1.split('.');
const preSegments2 = pre2.split('.');
const preLen = Math.max(preSegments1.length, preSegments2.length);

for (let i = 0; i < preLen; i++) {
  const s1 = preSegments1[i];
  const s2 = preSegments2[i];

  if (s1 === undefined) return -1;
  if (s2 === undefined) return 1;

  const n1 = Number(s1);
  const n2 = Number(s2);

  if (!isNaN(n1) && !isNaN(n2)) {
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
    continue;
  }

  if (s1 > s2) return 1;
  if (s1 < s2) return -1;
}
```

预发布标签按 `.` 拆段后逐段比较：
- 缺失段更小（`'alpha' < 'alpha.1'`）
- 纯数字段按数值比较
- 字符串段按字典序（`'alpha' < 'beta' < 'rc'` 自然成立）

---

## 第四步：常见追问

### Q1：为什么用 indexOf 而不是 split('-')？

`'1.0.0-alpha-beta'.split('-')` 产生 `['1.0.0', 'alpha', 'beta']`，如果用解构 `[core, prerelease]` 只取前两个，会丢失 `'-beta'`。`indexOf` + `slice` 保留完整的预发布标签。

### Q2：为什么用 Number() 而不是 parseInt()？

`Number('')` 是 `0`，`parseInt('')` 是 `NaN`。但更重要的是 `Number` 对纯数字字符串的转换更严格，`Number('10a')` 返回 `NaN`，而 `parseInt('10a')` 返回 `10`。

### Q3：如何处理无效输入？

本实现对非字符串和空字符串抛异常。实际项目中可以根据需求选择抛错或静默处理。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 用字符串比较数字段 | `'10' < '9'` 为 true（字典序），必须转 Number |
| 用 split('-') 解构 | 多 `-` 预发布会丢失，应用 indexOf + slice |
| 缺失段不补 0 | `'1.2'` 和 `'1.2.0'` 应视为相等 |
| 忘记预发布标签比较 | 核心版本相同时不能直接返回 0 |
| 预发布段数不同不处理 | `'alpha' < 'alpha.1'`，缺失段更小 |
