# Workflow Skills Index

> 题库配套工作流技能包。每个 `.zip` 是一个独立 skill，解压到 OpenClaw 的 `skills/` 目录即可使用。

## 技能列表

| Skill | 文件 | 用途 | 触发词 |
|-------|------|------|--------|
| **interview-qa-auditor** | `skills/interview-qa-auditor.zip` | 审计题库质量：检测 solution.js 的过度工程化、行数超标、不必要的辅助函数等 | `审计题库`、`检查答案质量`、`audit interview questions` |
| **textbook-writer** | `skills/textbook-writer-skill.zip` | 将 explanation.md 重写为引导式教程（guide.md + guide.html） | `写教程`、`生成guide`、`rewrite for learners` |
| **ai-page-tester** | `skills/ai-page-tester-skill.zip` | 自动化测试 guide.html 等页面的交互功能 | `测试页面`、`检查交互`、`E2E test` |
| **darwin-skill** | `skills/darwin-skill.zip` | 自动优化 SKILL.md 质量（8维评分 + 爬山算法） | `优化skill`、`skill评分`、`auto optimize` |

## 典型工作流

```
1. textbook-writer    explanation.md → guide.md + guide.html
2. ai-page-tester     验证 guide.html 交互功能正常
3. interview-qa-auditor  审计 solution.js 是否过度工程化
4. darwin-skill       迭代优化上述 skill 本身的质量
```

## 使用方式

```bash
# 解压任意 skill 到 OpenClaw skills 目录
unzip skills/xxx-skill.zip -d ~/.openclaw/skills/
```
