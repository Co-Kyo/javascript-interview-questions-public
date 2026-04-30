---
name: textbook-writer
description: "Rewrite expert-style technical explanations into learner-guided teaching material with progressive concept building. Outputs guide.md (text script) + guide.html (interactive learning experience — the effect amplifier). Use when the user provides an explanation.md, technical notes, or any dense documentation and asks to make it understandable for beginners, create a guide, rewrite for learners, or fix reading comprehension issues in technical content. Triggers on phrases like \"看不懂\", \"读不进去\", \"初学者\", \"guide\", \"引导式\", \"教材\", \"改写\", \"降维讲解\", \"交互式\", \"可视化\"."
---

# Textbook Writer

Rewrite expert notes into guided tutorials. Two deliverables, one goal: **让读者真正学会**。

- **`guide.md`** — 文字引导脚本（内容骨架，Stage 3 产出）
- **`guide.html`** — 交互式学习体验（效果放大器，Stage 4 产出）

guide.md 是脚手架，guide.html 是教学体验本身。不是"文字版 + 可视化版"的并列关系，而是"剧本 + 舞台演出"的递进关系。

## Pipeline

Run these 5 stages in order. Each stage has a verifiable output.

### Stage 1: Concept Dependency Graph

**提取方法**（按以下 4 类逐项扫描源文档）：

1. **术语**：技术名词首次出现即为一个概念（如"闭包"、"原型链"、"this 绑定"）
2. **代码模式**：独立的代码技巧（如"用 Symbol 做临时属性键"、"Object.create 切断引用"）
3. **API/方法**：被实现或调用的原生 API（如 `Function.prototype`、`instanceof`、`Reflect.construct`）
4. **设计决策**：需要理解"为什么"的选择（如"为什么用 Symbol 不用字符串"、"为什么 new 优先级高于 bind"）

**依赖判断**：对每对概念 (A, B)，问"不理解 A 能理解 B 吗？"如果不能，画边 A → B。

**验证**：
- 无环（如果 A→B→C→A，说明依赖关系分析有误，重新检查）
- 无孤立节点（每个概念至少有一条边连接到最终实现）
- 每个节点到最终实现有路径

**输出**：概念 DAG（列出所有节点 + 边）

**⏸ 检查点 1**：展示概念 DAG 给用户确认后再进入 Stage 2。如果用户指出遗漏或多余的概念，修正 DAG 后继续。

> **自动模式**：批量处理或子 agent 执行时，跳过人工确认，直接进入 Stage 2。在最终汇报中标注"跳过检查点"。

### Stage 2: Topological Sort + Step Splitting

**拓扑排序算法**（Kahn's）：

1. 计算每个节点的入度（被依赖次数）
2. 入度为 0 的节点 = 第一批可学的概念（无前置依赖）
3. 选一个入度为 0 的节点，加入步骤列表，将其从图中移除（指向的节点入度 -1）
4. 重复步骤 2-3 直到所有节点处理完
5. 如果处理完的数量 ≠ 总节点数，说明有环 → 回 Stage 1 修正

**步骤拆分规则**：
- 每个概念 = 1 步
- 如果一步需要 2+ 个新概念，拆成多步
- 每步代码 ≤ 10 行（例外：最终拼装步骤允许 ≤20 行，因为它是引用前面已学过的代码片段）
- 步骤 N 只使用步骤 1..N-1 中已出现的概念

**验证**：步骤数 = 概念数，入度检查通过

**输出**：有序步骤列表 + 概念-步骤映射表

### Stage 3: Write guide.md

Follow the template in `references/guide-template.md`. Each step has exactly this structure:

```
### Step N: {concept name}
困境 → 思考 → 解法 → 代码 (≤10 lines) → 验证
```

Rules:
- Never introduce a concept without first presenting a problem that needs it
- Explain each term on first appearance
- Show code as incremental diffs, not full rewrites
- Use concrete analogies (daily scene + action mapping)
- Ask a question before revealing each answer

Verify: every step's 困境 naturally emerges from the previous step; zero unexplained terms on first use.

**⏸ 检查点 2**：展示 guide.md 给用户确认后再进入 Stage 4 构建 HTML。用户可以调整步骤顺序、措辞、代码示例。

> **自动模式**：批量处理或子 agent 执行时，跳过人工确认，直接进入 Stage 4。在最终汇报中标注"跳过检查点"。

### Stage 4: Build guide.html (Effect Amplifier)

基于 guide.md 的内容结构，构建交互式教学 HTML。这不是"给文字加个皮肤"——而是用交互、动画、可运行代码把理解效率提升一个量级。

**设计原则：**

| guide.md 中的内容 | guide.html 中的对应 | 为什么 HTML 更好 |
|-------------------|---------------------|-----------------|
| 文字描述概念关系 | SVG 动画图解 | 空间推理 > 文字解析 |
| 代码块展示实现 | 可编辑 + 实时运行的代码沙盒 | 试错是最快的学习方式 |
| 步骤间的逻辑推导 | 点击逐步揭示（reveal） | 控制节奏，避免信息过载 |
| before/after 代码对比 | diff 高亮动画 | 一眼看出改了什么 |
| 执行流程描述 | CSS/JS 时序动画 | 时间过程变成可见运动 |

**硬性要求：**
- 单文件，所有 CSS/JS 内联，零外部依赖
- 浏览器直接打开，移动端响应式
- 每个交互元素对应 guide.md 中的一个具体步骤
- 包含可运行代码片段 + 输出展示区
- 暗色主题（bg: #0f0f13, text: #e4e4ef, accent: #6c8cff）

**HTML 骨架（必须包含的结构）：**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{题名} — 引导式讲解</title>
<style>
  /* 暗色主题全局样式 */
  /* 手风琴步骤卡片样式 */
  /* 代码块 + 运行按钮样式 */
  /* SVG/动画样式 */
</style>
</head>
<body>
  <header><!-- 标题 + 进度条 --></header>
  <main>
    <!-- 每个 guide.md 步骤对应一个 section -->
    <section class="step" id="step-N">
      <h2>Step N: {概念名}</h2>
      <div class="困境">...</div>
      <div class="思考">...</div>
      <div class="解法">...</div>
      <pre><code>{代码}</code></pre>
      <button onclick="run(N)">▶ 运行验证</button>
      <pre id="output-N"></pre>
    </section>
    <!-- SVG 可视化区域（如有） -->
    <!-- 概念速查表 -->
  </main>
  <script>
    // run() 函数：eval 代码并捕获输出
    // 进度条更新逻辑
    // 手风琴展开/折叠逻辑
  </script>
</body>
</html>
```

**每个 Step section 必须包含**：
1. 困境描述（1-2 句话）
2. 解法说明（2-3 句话）
3. 代码块（带语法高亮的 `<pre><code>`）
4. 运行按钮 + 输出区（`<button>` + `<pre id="output-N">`）
5. 验证提示（运行后显示 ✅/❌ + 简短说明）

See `references/visual-patterns.md` for implementation patterns.

**HTML 起始模板**：使用 `references/html-skeleton.html` 作为骨架，替换占位符即可。包含完整的暗色主题样式、运行按钮逻辑、进度条、手风琴折叠。

**质量标准（Stage 5 验证用）：**
- 所有 guide.md 步骤在 HTML 中都有对应呈现（100% 覆盖）
- 交互元素可操作（点击/编辑/运行均正常）
- 无 console 报错
- HTML 文件大小 ≤ guide.md × 5（避免过度膨胀）

### Stage 5: Verification

Run these checks against both outputs. All must pass.

| Check | Method | Pass criteria |
|-------|--------|---------------|
| Concept coverage | List all concepts from source → confirm each has a dedicated step | 100% |
| Dependency order | For each step B, verify all B's prerequisites appeared in earlier steps | 0 violations |
| Density | Count code lines and new terms per step | ≤10 lines（最终拼装 ≤20 行），≤1 term |
| Code concatenability | Concatenate all step code snippets → compare with solution.js | Functionally equivalent |
| HTML coverage | Every guide.md step has a corresponding section/interaction in guide.html | 100% |
| HTML interactivity | Open guide.html in browser → all interactive elements functional | 0 broken |
| HTML zero-dep | No external CDN links, no npm imports, no fetch to external URLs | 0 violations |

**⏸ 最终汇报（必须执行，自动模式不跳过）**：

Stage 5 完成后，向用户汇报以下内容：

```
## 完成报告

| 项目 | 结果 |
|------|------|
| 步骤数 | N 步 |
| 概念数 | M 个 |
| guide.md | XKB（源文件的 Y%） |
| guide.html | XKB（guide.md 的 Y 倍） |
| Stage 5 验证 | ✅ 全部通过 / ⚠️ 部分失败（列出） |

### 概念覆盖
（列出所有概念，标注覆盖情况）

### 交互元素
（列出 HTML 中的交互元素类型和数量）
```

如果 Stage 5 有检查失败，在报告中明确列出哪项失败、失败原因、建议修复方式。

## Output

For each question, produce both files in the same directory as the source `explanation.md`:

- **`guide.md`** — 引导式文字讲解（内容脚本）
- **`guide.html`** — 交互式教学体验（效果放大器，基于 guide.md 构建）

Do not modify the original files.

## 批量处理

当需要处理多道题目时（如整个题库），按以下策略调度：

**执行顺序**：按优先级 P0 → P1 → P2，同优先级内按题号顺序

**并行策略**：
- 每道题独立执行 Stage 1-5，互不依赖
- 可同时 spawn 多个子 agent 并行处理（建议 ≤3 个并发，避免资源争抢）
- 每个子 agent 完成后独立汇报，不阻塞其他子 agent

**进度追踪**：
- 维护 `batch-progress.tsv`（格式见 `references/batch-progress.md`）
- 每道题完成后更新进度文件
- 全部完成后生成汇总报告 `batch-report.md`

**容错**：
- 单题失败不影响其他题继续执行
- 失败题记录到 `batch-progress.tsv`，最后统一重试

## 异常与边界条件

| 场景 | 触发条件 | 处理动作 |
|------|----------|---------|
| 源文件不存在 | `explanation.md` 路径 404 或文件为空 | 终止，告知用户"源文件不存在或为空" |
| solution.js 缺失 | 目录下无 `solution.js` | Stage 5 跳过 code concatenability 检查，在输出中标注 `⚠️ 无 solution.js 对照` |
| 概念提取为空 | Stage 1 扫描后 0 个概念 | 重新扫描一次；仍为 0 则终止，告知用户"源文档无可用技术概念" |
| DAG 有环 | Stage 1 验证发现循环依赖 | 检查环上节点的依赖关系，松开最弱的一条边（改为"可选前置"），记录修正原因 |
| 拓扑排序失败 | 处理完数量 ≠ 总节点数 | 回 Stage 1 重新检查 DAG，标注未处理节点 |
| guide.md 过大 | 新文件 > 源 explanation.md × 150% | 精简：合并相似步骤、删除冗余类比、压缩代码注释区，重新验证 |
| HTML 生成失败 | Stage 4 中途报错 | 保留已生成的 guide.md，HTML 输出标注 `⚠️ 生成中断`，告知用户具体失败步骤 |
| 源文档为英文 | 检测到源文档主要语言为英文 | 正常处理，guide.md 和 guide.html 使用中文讲解（面向中文用户），代码和术语保留英文 |
| 步骤代码 >10 行 | Stage 3 验证发现超限 | 如果是中间步骤：拆分为两个子步骤或提取辅助函数到前置步骤。如果是最终拼装步骤：允许 ≤20 行，无需拆分 |

**原则**：异常先告知用户，再按规则处理；绝不静默跳过或静默失败。告知时说明：什么异常、怎么处理的、结果是否可信。
