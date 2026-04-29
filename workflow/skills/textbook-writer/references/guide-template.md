# Guide Template

Use this structure for every guide.md output.

```markdown
# {Title} — 引导式讲解

## 0. 这道题在解决什么问题？

{1-2 paragraphs. Use a daily-life scenario to build intuition. Zero code.}

---

## 1. 最小尝试

{The simplest version that works but has obvious flaws. Purpose: let the reader try, expose real difficulties.}

```javascript
{≤10 lines}
```

> 💡 {1 sentence: what this code does and why it's "good enough for now"}

---

## 2. 发现问题：{problem name}

{What breaks? Show the failure case. Then introduce the concept that fixes it.}

**思考**：{A question. Give the reader 3 seconds to think before reading on.}

**解法**：{The concept, explained in 2-3 sentences. First-use terms get inline definitions.}

```diff
{Show only the change, not the full code}
```

---

## 3-{N}. (repeat pattern from step 2)

Each step:
- **困境**: What's broken / missing / limited
- **思考**: Question for the reader
- **解法**: The concept that resolves it
- **代码**: ≤10 lines, incremental
- **验证**: How the reader confirms they got it

---

## {N+1}. 拼在一起：完整实现

```javascript
{Final solution. Every line has been introduced in previous steps.}
```

{1 paragraph: "You now understand every line — it's not magic, it's the accumulation of steps 1 through N."}

---

## 面试追问速查

{3-5 most common follow-up questions. Keep answers ≤5 lines each.}

---

## 易错点

| 易错点 | 为什么会错 | 正确做法 |
|--------|-----------|---------|
{3-6 rows}
```
