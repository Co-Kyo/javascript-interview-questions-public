# Workflow Skills Index

> 题库配套工作流技能包。每个 `.zip` 是一个独立 skill，解压到 OpenClaw 的 `skills/` 目录即可使用。

## 技能列表

| Skill | 文件 | 用途 | 触发词 |
|-------|------|------|--------|
| **interview-qa-auditor** | `skills/interview-qa-auditor.zip` | 三阶段校准：检测偏离 → 重写代码 → 交叉验证 | `审计题库`、`校准答案`、`calibrate solutions` |
| **textbook-writer** | `skills/textbook-writer-skill.zip` | 将 explanation.md 重写为引导式教程（guide.md + guide.html） | `写教程`、`生成guide`、`rewrite for learners` |
| **ai-page-tester** | `skills/ai-page-tester-skill.zip` | 自动化测试 guide.html 等页面的交互功能 | `测试页面`、`检查交互`、`E2E test` |
| **darwin-skill** | `skills/darwin-skill.zip` | 自动优化 SKILL.md 质量（8维评分 + 爬山算法） | `优化skill`、`skill评分`、`auto optimize` |

## interview-qa-auditor 详解

本 skill 的核心价值：**`question.md → solution.js → explanation.md` 的一致性校准**

### 三阶段流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ 阶段一：检测  │────→│ 阶段二：重写  │────→│ 阶段三：交叉验证  │
│              │     │              │     │                  │
│ scan + grep  │     │ solution.js  │     │ web-fetch 参考   │
│ 6种偏离模式  │     │ explanation  │     │ 篇幅+质量比对    │
│ 输出诊断报告 │     │ test.js 验证 │     │ ✅成功/❌失败回退 │
└──────────────┘     └──────────────┘     └──────────────────┘
```

### 6 种偏离模式

| # | 模式 | 检测方式 | 典型实例 |
|---|------|---------|---------|
| 1 | 库内核移植 | grep 特征函数名 | debounce 的 invokeFunc/leadingEdge |
| 2 | 规格全量实现 | 行数超标+规范术语 | promise 204行实现完整 A+ |
| 3 | 需求外溢 | 对比 question.md | debounce 追踪 result 返回值 |
| 4 | 过度防御 | grep typeof/throw | observer 的 TypeError 抛出 |
| 5 | 函数碎片化 | 行/函数比 < 15 | debounce 14个函数 |
| 6 | Class膨胀 | class 数 > 2 | observer 3个class 94行 |

### 联动关系

- **solution.js 重写后** → explanation.md 必须同步重写（讲解要对齐新代码的思路）
- **explanation.md 变化后** → textbook-writer 可接力生成 guide.md + guide.html
- **交叉验证失败** → 回退到阶段一或阶段二重做

## 典型工作流

```
1. interview-qa-auditor  检测 → 重写 → 交叉验证（三阶段闭环）
2. textbook-writer       explanation.md → guide.md + guide.html
3. ai-page-tester        验证 guide.html 交互功能正常
4. darwin-skill          迭代优化 skill 本身的质量
```

## 使用方式

```bash
# 解压任意 skill 到 OpenClaw skills 目录
unzip skills/xxx-skill.zip -d ~/.openclaw/skills/
```
