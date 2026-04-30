# 批量处理进度模板

批量处理多道题目时，使用此模板追踪进度。

## 文件格式

在题库根目录创建 `batch-progress.tsv`：

```tsv
题号	状态	耗时	guide.md	guide.html	检查点	备注
01-call-apply-bind	done	3m11s	7.7KB	22KB	skipped	全通过
02-deep-clone	running	-	-	-	-	-
03-debounce-throttle	pending	-	-	-	-	-
```

## 状态说明

| 状态 | 含义 |
|------|------|
| `pending` | 未开始 |
| `running` | 执行中 |
| `done` | 完成，Stage 5 全部通过 |
| `error` | 失败，备注栏记录原因 |
| `partial` | 部分完成（如 guide.md 已生成但 HTML 失败） |

## 检查点列

| 值 | 含义 |
|----|------|
| `confirmed` | 用户确认了检查点 1 和 2 |
| `skipped` | 自动模式，跳过人工确认 |
| `partial` | 只确认了其中一个检查点 |

## 汇总报告模板

全部完成后，在 `batch-progress.tsv` 同目录生成 `batch-report.md`：

```markdown
# 批量处理报告

## 总览
- 处理题数：N
- 成功：X（Y%）
- 失败：Z
- 总耗时：HH:MM:SS
- 平均每题：MM:SS

## 分数变化
| 题号 | 步骤 | 概念 | 覆盖率 | guide.md | guide.html | 状态 |
|------|------|------|--------|----------|------------|------|
| 01 | 9 | 10 | 100% | 7.7KB | 22KB | ✅ |
| ... | ... | ... | ... | ... | ... | ... |

## 失败记录
（如有失败，列出题号、失败阶段、错误原因、建议重试方式）

## 主要改进
（列出本次批量处理中发现的共性改进点）
```

## 执行策略

- 按优先级排序：P0（15题）→ P1（17题）→ P2（3题）
- 并发数：≤3 个子 agent
- 每完成一题，更新 `batch-progress.tsv`
- 失败题不阻塞，最后统一重试
