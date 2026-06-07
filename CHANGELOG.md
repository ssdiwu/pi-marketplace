# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.1] - TBD

> **一句话**：v0.1.0 是"能用"，v0.1.1 是"**用得爽**" — 4 个 tool 输出从"淹没屏幕"变成"1 行可折叠"。

### 用户视角：1 类能力提升

#### 1. Tool 输出支持折叠/展开 ⭐⭐⭐

之前 4 个 tool 调下去，输出直接铺满屏幕：
- `marketplace_search` 20 个包 = 80 行
- `marketplace_audit` 一个包 = 几十行 finding

用户被迫在长输出里找关键信息，或者要滚很多屏。

v0.1.1 后，pi 框架的 `renderResult` 字段启用：

- **默认折叠态**：1 行摘要 + `(ctrl+o to expand)` 提示
- **按 `ctrl+o` 展开**：完整 markdown
- **加载中（`isPartial`）**：`⏳ Running...`

4 个 tool 各自的摘要：

| Tool | 摘要格式 | 示例 |
|---|---|---|
| `marketplace_search` | `📦 Found N pi package(s)` | `📦 Found 5 pi package(s)` |
| `marketplace_detail` | `📦 {name} v{version}` | `📦 pi-mcp-adapter v2.9.0` |
| `marketplace_audit` | `🔒 {name}: {RISK_BADGE} (N finding(s))` | `🔒 pi-mcp-adapter: 🟠 HIGH (25 findings)` |
| `marketplace_install` | `📥 {result} {name} (Audit: {RISK_BADGE})` | `📥 Installed pi-mcp-adapter (Audit: 🟠 HIGH)` |

**效果**：终端不再被淹没，重要信息一眼可见。

**对 LLM 完全透明**：`renderResult` 只影响用户 UI 层，LLM 看到的 `content[].text` 仍是完整数据，行为 100% 向后兼容。

### 改进明细（1 项）

- **#1** 4 个 tool 加 `renderResult` 字段 + 新建共享 `extensions/render.ts`（~100 行）
  - 借鉴 pi-tinyfish 的 `renderCollapsibleMarkdown` 模式
  - 加 `formatRiskBadge` helper 给 audit / install 共享
  - 加 peer/dev dep `@earendil-works/pi-tui@^0.78.1`

### 不做（明确 scope 边界）

- ❌ 任何数据模型改动（推到 v0.2.0）
- ❌ 任何 slash command（推到 v0.3.0）
- ❌ 任何 overlay 面板（推到 v0.4.0+）
- ❌ 完整 5 语言 i18n（基础在 v0.2.0，完整 + 缓存推到 v0.6.0）
- ❌ 翻译缓存（推到 v0.6.0）

### 验证标准（v0.1.1 完成时跑一遍）

- [ ] `/reload` 后 4 个 tool 都显示折叠态（1 行摘要）
- [ ] 按 `ctrl+o` 展开看到完整 markdown
- [ ] 4 个 tool 摘要都对：
  - search：`resultCount` 正确
  - detail：`name` + `version` 正确
  - audit：`name` + `risk` + `findingCount` 正确
  - install：`name` + 安装结果 + `riskLevel` 正确
- [ ] 现有 5/5 测试通过
- [ ] `npm run typecheck` 通过
- [ ] `npm pack --dry-run` tarball 仍不含 `doc/`

### 工作量与风险

- **工作量**：0.5-1 天
- **风险**：低（纯 UI 增强，`execute` 返回值不变，LLM 视角 100% 兼容）

### 关联材料

- 借鉴路线图：`从-pi-packages-manager-借鉴-架构与UX路线图.md` § 2.1.1
- 版本路线图：`版本路线图.md` v0.1.1
- 实现 commit：`0fcee91` 功能：tool 输出支持折叠/展开（renderResult）
- 借鉴来源：pi-tinyfish `extensions/render.ts`

---

## [v0.1.0] - 2026-06-01

基线版本，commit `cbe52da`。

**能力**：
- 4 个 LLM tool：`marketplace_search` / `marketplace_detail` / `marketplace_audit` / `marketplace_install`
- **每个 tool 都有 `promptSnippet` + `promptGuidelines` 字段**（LLM 协作精准基线）
- `extensions/security.ts` 两层审计（metadata + source scan）
- 14 个测试（unit + integration）

**局限**（后续版本要解决的部分）：
- ~~Tool 输出没折叠/展开~~ → v0.1.1 ✅
- 审计大包会卡、无法取消、有 HTTP 误报 → v0.2.0
- 安装黑箱等待 → v0.2.0
- UI 文案无 i18n → v0.2.0（基础）
- `tools/` 4 文件并列 → v0.2.0
