# 从 pi-packages-manager 借鉴 — 架构与 UX 路线图

| 字段 | 值 |
|---|---|
| 状态 | 路线图 / 待评审 |
| 创建 | 2026-06-06（重写自 `overlay-panel-demo-design.md`，范围从单一 demo 扩展为全方位借鉴） |
| 关联 | pi-packages-manager PR #1（`#issuecomment-4612182900`） |

---

## 1. 背景

### 1.1 我们当前的状况

`pi-marketplace` 当前是**极简**的 LLM 工具链：

- **目录结构平铺**：`extensions/` 下直接放 `api.ts` / `security.ts` / `format.ts` / `index.ts` + `tools/` 子目录放 4 个 tool 文件。**没有 ui / i18n / model 分层**。
- **无 UI 入口**：4 个 tool（`marketplace_search` / `marketplace_detail` / `marketplace_audit` / `marketplace_install`）全靠 AI 触发 + 文本/Markdown 输出。**没有 slash command，没有 overlay 面板**。
- **数据模型简单**：`PackageDetail` 只覆盖 npm 元数据。**没有 `installed` / `scope` / `sourceType` / `pinned` / `hasUpdate` 等运行时字段**。
- **无 i18n**：所有 UI 文案散落在代码里，**没有 `t()` 提取**。
- **无 fallback 策略**：`marketplace_install` 失败就是失败，**没有"直接改 settings"的兜底**。
- **测试 14 个**（unit + integration），但**没有 `promptSnippet` / `promptGuidelines`** 这种 LLM 引导字段。

### 1.2 pi-packages-manager 的状况（参考对象）

- **1127 行** `index.ts`（主流程）+ 多个**独立模块**（`api.ts` / `security.ts` / `i18n.ts` / `locale.ts` / `tools.ts`）+ **`ui/` 子目录**放 TUI 组件
- 完整 overlay UI（`pi-tui` 深度使用）：多 tab、键盘流、进度条、自定义组件
- **5 语言 i18n**（en/zh-CN/zh-TW/ja/ko）+ 4 层优先级 + 翻译缓存 + 种子翻译
- 完整 `PackageInfo` 字段（`installed` / `installedVersion` / `scope` / `sourceType` / `pinned` / `hasUpdate` / `skipReason`）
- **双轨交互**：slash command + LLM tool 共存
- **fallback 策略**：uninstall 失败时直接改 settings

---

## 2. 学习路线图

按"价值 / 成本"排序。每项标 **[架构]** / **[UX]** / **[健壮性]** / **[工程]** 标签。

### 2.1 短期（1-2 周，每项 1-3 天）

| # | 项 | 标签 | 价值 | 成本 |
|---|---|---|---|---|
| 1 | `promptSnippet` + `promptGuidelines` 补齐 | UX | 高 | 低 |
| 2 | `security.ts` 同步三项改进 | 健壮性 | 中 | 低 |
| 3 | 安装进度用 `setStatus` spinner | UX | 中 | 低 |
| 4 | `tools/` 子目录按对象重组（不要 4 个并列） | 工程 | 中 | 低 |
| 5 | i18n 基础设施：提取 `t()` 函数，硬编码 2 套 | 工程 | 中 | 中 |

**详细说明**：

**#1 `promptSnippet` + `promptGuidelines`**
- pi-packages-manager 的 4 个 tool 都填了这两个字段，告诉 LLM "何时调、怎么用"
- 我们 4 个 tool 都**没填**，LLM 靠 description 猜何时调用
- 改动：每个 tool 的 `registerTool` 加 2 个字段，10 分钟

**#2 `security.ts` 三项改进**
- `maxBuffer: 32 * 1024 * 1024`（大输出不挂）
- `AbortSignal` 支持（长时间操作可取消）
- HTTP URL 白名单 `?!registry.npmjs.org|api.npmjs.com`（HTTP 模式去重误报）
- 改动：`extensions/security.ts` 的 `runCommand` 函数，30 分钟

**#3 安装进度**
- pi-packages-manager 用 `setWidget` 流式滚动 6 行 npm 输出
- 我们先用 `setStatus` 一个 spinner 顶上，复杂流式后面再说
- 改动：`extensions/tools/install.ts` 加 `setStatus`，30 分钟

**#4 目录重组**
- 当前 `tools/search.ts` / `detail.ts` / `audit.ts` / `install.ts` 平铺
- 可选：合并成 `tools/index.ts`（单文件 ~200 行），或按"搜索-详情"和"审计-安装"分两文件
- 改动：移动文件，5 分钟

**#5 i18n 基础设施**
- 当前没有 `t()` 提取，所有 UI 文案直接写在代码里
- 短期：建 `extensions/i18n.ts`，暴露 `t(key, locale?)` 函数，硬编码 zh-CN + en 两套
- 改动：新建文件 + 把现有 4 个 tool 的 UI 文案替换成 `t('xxx')`，1-2 小时

### 2.2 中期（1-2 月）

| # | 项 | 标签 | 价值 | 成本 |
|---|---|---|---|---|
| 6 | `PackageInfo` 模型扩展 | 架构 | 高 | 中 |
| 7 | slash command `/marketplace` 入口 | UX | 中 | 中 |
| 8 | scope 选择（Global / Project） | UX | 中 | 中 |
| 9 | fallback 策略（uninstall 失败时改 settings） | 健壮性 | 中 | 中 |
| 10 | 测试分层（unit 纯函数 + integration IO） | 工程 | 中 | 中 |
| 11 | 完整 `PackageInfo` 字段 + 数据流 | 架构 | 中 | 中 |

**详细说明**：

**#6 `PackageInfo` 模型**
- 当前 `PackageDetail` 只覆盖 npm registry 返回的字段
- 需要扩展：`installed`（是否已装）/ `installedVersion` / `scope`（user/project）/ `sourceType`（npm/git/local）/ `pinned`（是否锁定）/ `hasUpdate` / `skipReason`
- 这些字段是 #7、#8、#9 的基础

**#7 slash command `/marketplace`**
- 新增 `registerCommand("marketplace", ...)`，handler 调 `panelLoop`
- 这是 pi-packages-manager panelLoop 模式的入口
- 跟 LLM tool 共存，不冲突

**#8 scope 选择**
- 安装前 `select` 让用户选 Global（写入 `~/.pi/agent/settings.json`） vs Project（写入 `.pi/settings.json`）
- pi-packages-manager 已实现，可参考 `src/index.ts:installPackageFlow`

**#9 fallback 策略**
- 当前 `pi uninstall` 失败 = 失败
- pi-packages-manager 的做法：失败时直接调 `removeFromSettings()` 改 settings 文件
- 我们的 `marketplace_install` 也应该有这个兜底

**#10 测试分层**
- pi-packages-manager 把 `evaluateRisk` / `severityRank` 暴露为 `__test__` 纯函数，方便 unit
- 我们当前测试混在一起，可以学这个分层

**#11 完整 `PackageInfo` 字段**
- 把 #6 扩展后的字段用到所有展示逻辑
- `formatPackageDetail` / `formatAuditReport` 都读新模型

### 2.3 长期（观望或按需）

| # | 项 | 标签 | 价值 | 成本 |
|---|---|---|---|---|
| 12 | TUI overlay 面板（`ctx.ui.custom`） | UX | 中 | 高 |
| 13 | `panelLoop` 重入模式 | UX | 中 | 高 |
| 14 | 自定义 `PackageList` 组件 | UX | 低 | 中 |
| 15 | filter chips / 快捷键（1-5 / i/r/u/a） | UX | 低 | 中 |
| 16 | 完整 i18n（5 语言 + 缓存 + override） | 架构 | 中 | 高 |
| 17 | README 渲染在详情页 | UX | 低 | 中 |
| 18 | AI 语义搜索 | UX | 低 | 高 |

**详细说明**：

**#12-#15 整套 overlay**
- pi-packages-manager 用 ~500 行 + 自定义 TUI 组件实现
- 我们短期 #7 只需要 slash command + 简单 `select` 菜单就能解决发现性问题
- 完整 overlay 是 v0.5.0+ 的话题

**#16 完整 i18n**
- 短期 #5 只做 2 套硬编码
- 完整版：5 语言 + 翻译缓存（`~/.pi/.../translations.json`）+ 项目覆盖（`<cwd>/.pi/pi-packages-manager.json`）+ 内置种子翻译
- pi-packages-manager 的 `src/i18n.ts`（约 200 行）可参考

**#17-#18 锦上添花**
- README 渲染、AI 搜索是 v1+ 的话题

---

## 3. 不学什么

明确**不做**的，避免 scope 蔓延：

- ❌ **不做多 tab**（Installed / Browse / Updates） — 我们定位是"市场浏览"，单 tab browse 就够
- ❌ **不做安装进度条**（pi-packages-manager 那种 6 行流式） — 短期 #3 用 spinner 顶上，长期再说
- ❌ **不做 AI 语义搜索** — 关键词搜索够用，AI 搜索价值/成本比低
- ❌ **不做 5 语言 i18n** — 短期 #5 硬编码 2 套，海外用户是 v1+ 的话题
- ❌ **不做 pi.dev enrichment** — pi-packages-manager 有这个功能，但我们 npm registry 够用

---

## 4. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 一次推太大，破坏现有用户 | tool 行为变了，slash command 撞名 | 拆 commit / 拆 PR；新功能默认 opt-in |
| UI 改造可能影响依赖我们 tool 的 LLM workflow | LLM 调 tool 的逻辑变了 | `promptSnippet` / `promptGuidelines` 增量补，不改 description 关键信息 |
| i18n 维护成本（每次加 UI 元素都要双语言） | 开发速度变慢 | 只在需要时加 i18n，关键路径（安装/审计）优先 |
| `ctx.ui.custom` API 兼容性 | peer dep 是 `*`，但 runtime 可能 < 0.7x 不支持 | 启动时检测 API 存在性，不存在时 fallback 到 `select` 菜单 |
| 借鉴过度，丧失"AI 工具包"定位 | 变成另一款 Claude Code | § 3 不学什么 + § 5 关联材料 守住边界 |

---

## 5. 关联材料

### 5.1 pi-packages-manager 关键文件

| 文件 | 行数 | 学什么 |
|---|---|---|
| `src/index.ts` | 1127 | `panelLoop`（行 271-300）、`installPackageFlow`（含 audit + scope）、`removePackageFlow`（含 fallback） |
| `src/ui/panel.ts` | 252 | `ctx.ui.custom` 模式、闭包状态机、`rebuild` + `requestRender` |
| `src/ui/package-list.ts` | 162 | 自定义 TUI 组件（3 行/项 + badge 右对齐） |
| `src/tools.ts` | ~280 | 4 个 tool + `promptSnippet` + `promptGuidelines` 写法 |
| `src/i18n.ts` | ~200 | 5 语言 + 4 层优先级 + 翻译缓存 + 种子翻译 |
| `src/security.ts` | ~350 | 从我们 fork + maxBuffer/AbortSignal/URL 白名单改进 |
| `src/api.ts` | - | `PackageInfo` 字段设计 |

### 5.2 我们项目对应位置

| 文件 | 借鉴改进点 |
|---|---|
| `extensions/security.ts` | § 2.1 #2（maxBuffer / AbortSignal / URL 白名单） |
| `extensions/tools/{search,detail,audit,install}.ts` | § 2.1 #1（`promptSnippet` / `promptGuidelines`） |
| `extensions/tools/install.ts` | § 2.1 #3（`setStatus` spinner） |
| `extensions/format.ts` | § 2.2 #6、#11（`PackageInfo` 字段） |
| `extensions/api.ts` | § 2.2 #6（数据模型扩展） |
| `extensions/index.ts` | § 2.2 #7（slash command `/marketplace`） |

### 5.3 重写自

- `doc/overlay-panel-demo-design.md`（已删除，2026-06-06）
- 原方案范围过窄：仅关注 TUI overlay 面板 demo
- 本次扩展为：架构 + UX + 健壮性 + 工程 4 大类全景借鉴

---

## 6. 变更日志

| 日期 | 变更 |
|---|---|
| 2026-06-06 | 初版。范围从"overlay panel 最小 demo"扩展为"从 pi-packages-manager 全方位借鉴路线图"。理由：我们当前没分层、没架构设计，需要路线图级别而非 demo 级别的学习 |
