---
name: textbook-writer
description: Rewrite expert-style technical explanations into learner-guided teaching material with progressive concept building. Use when the user provides an explanation.md, technical notes, or any dense documentation and asks to make it understandable for beginners, create a guide, rewrite for learners, or fix reading comprehension issues in technical content. Triggers on phrases like "看不懂", "读不进去", "初学者", "guide", "引导式", "教材", "改写", "降维讲解".
---

# Textbook Writer

Rewrite expert notes into guided tutorials. Output: `guide.md` + optional `guide.html` (visual).

## Pipeline

Run these 4 stages in order. Each stage has a verifiable output.

### Stage 1: Concept Dependency Graph

1. Extract all technical concepts from the source document
2. For each pair (A, B): if understanding B requires knowing A, draw edge A → B
3. Verify: no cycles, no isolated nodes, every node has a path to the final implementation
4. Output: a DAG of concepts

### Stage 2: Topological Sort + Step Splitting

1. Topologically sort the DAG → linear concept order
2. Each concept = 1 step. If a step needs 2+ new concepts, split it
3. Verify: step count = concept count, each step's code ≤ 10 lines, step N only uses concepts from steps 1..N-1
4. Output: ordered step list with concept-per-step mapping

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

### Stage 4: Verification

Run these checks against the output. All must pass.

| Check | Method | Pass criteria |
|-------|--------|---------------|
| Concept coverage | List all concepts from source → confirm each has a dedicated step | 100% |
| Dependency order | For each step B, verify all B's prerequisites appeared in earlier steps | 0 violations |
| Density | Count code lines and new terms per step | ≤10 lines, ≤1 term |
| Code concatenability | Concatenate all step code snippets → compare with solution.js | Functionally equivalent |

## Visual Layer (guide.html)

Default output. Every guide gets an HTML version.

When a concept involves spatial relationships (prototype chains, trees, linked lists), temporal processes (execution flow, state transitions), or interactive verification (parameter tweaking), use animations and interactive elements in the HTML.

Requirements:
- Single file, all CSS/JS inline, zero external dependencies
- Browser-direct, mobile-responsive
- Each visual maps to exactly one concept that is hard to explain in text alone

See `references/visual-patterns.md` for implementation patterns.

## Output

For each question, produce both files in the same directory as the source `explanation.md`:

- **`guide.md`** — Guided text walkthrough
- **`guide.html`** — Visual/interactive version (default, not optional)

Do not modify the original files.

### guide.html Requirements

- Single file, all CSS/JS inline, zero external dependencies
- Browser-direct, mobile-responsive
- Each visual maps to exactly one concept that is hard to explain in text alone
- Includes runnable code snippets with output display

See `references/visual-patterns.md` for implementation patterns.
