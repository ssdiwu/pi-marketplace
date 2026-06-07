# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.2.0] - TBD

> **一句话**：v0.1.0 是"能跑通"，v0.2.0 是"**跑得稳、用得爽、可扩展**"。

### 用户视角：4 类能力提升

#### 1. 装包更稳 ⭐⭐⭐

之前审计有 3 个烦人问题，v0.2.0 全修：

| 问题 | 修法 |
|---|---|
| 审计大包会**卡死** | `maxBuffer: 32 * 1024 * 1024` |
| 审计**无法取消** | `AbortSignal` 支持，外部可中断 |
| HTTP 模式**误报** | URL 白名单 `?!registry.npmjs.org\|api.npmjs.com` |

**效果**：装包**不再"卡"或"误报警"**。

#### 2. 装包看得见进度 ⭐⭐

之前 `marketplace_install` 调下去，用户**黑箱等待**几十秒，不知道是装好了还是卡了。
v0.2.0 后 `setStatus` 显示 spinner（"🔄 正在安装 pi-xxx..."），完成时切换到成功/失败状态。

**效果**：少一点"它是不是挂了"的焦虑。

#### 3. 中英文可切换 ⭐

之前 UI 文案散落代码里，**没有 `t()` 提取**，基本中文硬编码。
v0.2.0 后：

- 新建 `extensions/i18n.ts`，暴露 `t(key, locale?)` 函数
- 4 个 tool 内部所有 `ctx.ui.notify` / `ctx.ui.confirm` 文案走 `t('xxx')`
- 硬编码 zh-CN + en 两套

**效果**：英文用户**看到英文 UI**（之前看运气）。

**长期价值**：为 v0.6.0 完整 5 语言 i18n + 翻译缓存铺路。

#### 4. 代码更好维护（开发者价值）

之前 `tools/` 下 4 个并列文件（search / detail / audit / install），import 路径散乱。
v0.2.0 后合并为 `tools/index.ts`（~200 行）或按"搜索-详情"和"审计-安装"分 2 文件。

**效果**：用户不直接感知，但**新功能开发更快、bug 更好定位**。

### 改进明细（4 项，对应借鉴路线图 § 2.1 #2-#5）

- **#1** `security.ts` 三项同步：`maxBuffer` 32MB / `AbortSignal` / HTTP URL 白名单
- **#2** 安装进度 `setStatus` spinner
- **#3** `tools/` 目录重组（4 并列 → 合并/分组）
- **#4** i18n 基础设施：`extensions/i18n.ts`，`t()` 函数，硬编码 zh-CN + en

> 注：`promptSnippet` + `promptGuidelines` 字段在 v0.1.0 commit `cbe52da` 已包含（4 个 tool 都已带 3-5 条规则），v0.2.0 不重复做。

### 不做（明确 scope 边界）

- ❌ 任何数据模型改动（推到 v0.3.0）
- ❌ 任何 slash command（推到 v0.3.0）
- ❌ 任何 overlay 面板（推到 v0.4.0+）
- ❌ 完整 5 语言 i18n（推到 v0.6.0）
- ❌ 翻译缓存（推到 v0.6.0）

### 验证标准（v0.2.0 完成时跑一遍）

- [ ] `security.ts` 测试覆盖 `maxBuffer`、`AbortSignal` 取消、URL 白名单过滤
- [ ] `marketplace_install` 执行时 `setStatus` 可观察
- [ ] `tools/` 目录结构清晰（合并/分组完成）
- [ ] 存在 `extensions/i18n.ts`，4 个 tool 内部 UI 文案走 `t()`
- [ ] 4 个 tool 都有 `promptSnippet` / `promptGuidelines` 字段（v0.1.0 基线已满足，验证项可勾掉）
- [ ] 现有 14 个测试仍通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test:load` 通过（如果适用）
- [ ] `npm pack --dry-run` tarball 仍不含 `doc/`

### 工作量与风险

- **工作量**：0.5-1 周
- **风险**：中（4 项叠加，但单项都简单）
- **依赖**：v0.1.0（无前置依赖）

### 关联材料

- 借鉴路线图：`从-pi-packages-manager-借鉴-架构与UX路线图.md` § 2.1 #2-#5
- 版本路线图：`版本路线图.md` v0.2.0
- 安全审计原版：`extensions/security.ts`（被 `pi-packages-manager` 借鉴）

---

## [v0.1.0] - 2026-06-01

基线版本，commit `cbe52da`。

**能力**：
- 4 个 LLM tool：`marketplace_search` / `marketplace_detail` / `marketplace_audit` / `marketplace_install`
- **每个 tool 都有 `promptSnippet` + `promptGuidelines` 字段**（LLM 协作精准基线）
- `extensions/security.ts` 两层审计（metadata + source scan）
- 14 个测试（unit + integration）

**局限**（v0.2.0 要解决的部分）：
- 审计大包会卡、无法取消、有 HTTP 误报
- 安装黑箱等待
- UI 文案无 i18n
- `tools/` 4 文件并列
