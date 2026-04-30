# Git Hooks and Line Ending Maintenance

> 这个文档只用于本仓库的版本管理规范，不属于题库项目原有的业务说明。

## 目的

本仓库使用 Husky 管理 Git pre-commit 钩子，主要目标是：

- 避免 `.md` 文件因 `LF/CRLF` 换行符差异而产生无意义提交
- 让钩子脚本可版本控制、可共享
- 为项目维护人员提供统一的 onboarding 和维护方法

## 当前方案

本仓库已启用 Husky：

- `package.json` 中包含 `husky` 依赖
- `scripts.prepare` 为 `husky install`
- 钩子脚本放在 `scripts/hooks/pre-commit.sh`
- Husky 真正执行的 hook 在 `.husky/pre-commit`

## 新成员 onboarding

拉取仓库后，请执行：

```bash
npm install
```

这会自动触发 `prepare`，安装 Husky 并启用 `.husky/pre-commit`。

## 日常维护

### 1. 提交前检查

如果你怀疑是行尾变化导致的改动，可先用：

```bash
git diff --ignore-space-at-eol
```

### 2. 如果需要查看当前钩子状态

```bash
git config --get core.hooksPath
```

预期结果：

```bash
.husky
```

### 3. 修改或新增钩子

如果需要新增或更改钩子，请修改：

- `scripts/hooks/pre-commit.sh`
- 或者 `.husky/pre-commit`

一般必要步骤是：

```bash
npm exec -- husky add .husky/<hook-name> "<command>"
```

例如：

```bash
npm exec -- husky add .husky/pre-push "npm test"
```

### 4. 不要直接修改 `.git/hooks`

`.git/hooks` 目录是本地 Git 存储，不会随仓库同步。请不要手工维护这个目录。

## 行尾管理

本仓库已使用 `.gitattributes` 规范文本文件。维护时请保持：

- `.md` 文件统一为 `LF`
- 如果需要，也可以为脚本文件、JS 文件统一 `LF`

相关调试命令：

```bash
git diff --cached --ignore-space-at-eol -- '*.md'
```

如果该命令没有输出，说明暂存区里的 Markdown 文件只有行尾差异。

## 额外说明

如果你不确定某次提交是否只是换行符变动，可以先把相关文件恢复：

```bash
git restore --staged <file>
git checkout -- <file>
```

然后再重新提交真正的内容改动。

---

本文件用于本仓库内部版本管理规范，避免将维护细节混入题库说明。