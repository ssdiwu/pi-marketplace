# Overlay Panel 最小 Demo — 设计备忘

| 字段 | 值 |
|---|---|
| 状态 | **草案 / 待评审** |
| 创建 | 2026-06-06 |
| 作者 | 507 |
| 关联 | pi-packages-manager PR #1（`#issuecomment-4612182900`）；pi-packages-manager `src/ui/panel.ts` |
| 目标版本 | pi-marketplace v0.2.0（暂定） |

---

## 1. 背景

`pi-marketplace` 当前是**纯 LLM 工具链**，4 个 tool（`marketplace_search` / `marketplace_detail` / `marketplace_audit` / `marketplace_install`）全部依赖 AI 触发 + 文本/Markdown 输出。

**问题**：
- 用户必须先跟 AI 说话（"找包"、"看看 pi-mcp-adapter"）才能进入流程，发现性差
- 没有键盘流可走，纯命令式交互门槛偏高
- 在终端里没有可视化的"包浏览"入口

**对照**：`pi-packages-manager`（RexYoung000/pi-packages-manager）已经实现了 Claude Code 风格的 overlay 面板。它的设计点里第 5 点 —— **panelLoop 重入模式** —— 对我们价值最大：用户操作 → 面板关 → 跑动作 → 动作完成 → 面板自动重开，状态保留。

但整套 overlay 面板**太重**（~500 行 + 自定义 TUI 组件 + 多语言 + 进度条 + 快捷键），不适合直接搬。需要做最小化验证。

---

## 2. 目标

**唯一目标**：验证 **panelLoop 重入模式**能否嫁接到我们纯工具链上。

**非目标**（明确不做）：
- 不复刻 `pi-packages-manager` 的完整 overlay 体验
- 不引入 pi-tui 自定义组件
- 不改变现有 4 个 tool 的对外行为
- 不做多语言（仅中文/英文硬编码）
- 不做 i18n 持久化

---

## 3. 范围

### 3.1 做

| 项 | 说明 |
|---|---|
| 新增 slash command | `/marketplace` 打开面板 |
| 单 tab 浏览 | 用内置 `SelectList`，每项显示 `name + type + description` |
| panelLoop 重入 | 选中包 → 面板关 → 跑详情/审计 → 完成后面板自动开回来 |
| 状态保留 | 列表和当前选中位置在重入时保留 |
| 进度提示 | `setStatus` 显示简单 spinner，不用 `setWidget` 流式 |

### 3.2 不做（先不做）

| 项 | 原因 |
|---|---|
| 多 tab（Installed / Browse / Updates） | 增加状态机复杂度 |
| 自定义 `PackageList` 组件 | 内置 `SelectList` 先看够不够用 |
| Tab 切换键 / 1-5 过滤 | 单 tab 不需要 |
| 进度条 / setWidget 流式 | demo 不做 `pi install` 完整流程 |
| i18n（zh-CN / zh-TW / ja / ko） | 硬编码 2 套就够 |
| 快捷键 `i` / `r` / `u` / `a` | 走菜单点选 |
| 安装流程的 panel 内嵌入 | 留在现有 `marketplace_install` tool |

---

## 4. 设计

### 4.1 入口

新增一个 slash command：

```ts
pi.registerCommand("marketplace", {
  description: "🛒 Browse pi packages in an overlay panel",
  handler: async (_args, ctx) => {
    await panelLoop(ctx);
  },
});
```

跟 `pi-packages-manager` 的 `/packages-list` 对位。

### 4.2 架构

```
/marketplace
    ↓
panelLoop(ctx)              ← 闭包状态：currentList, selectedIndex
    ↓ (loop)
showPanel(ctx)              ← ctx.ui.custom() 单 tab
    ↓ (done)
处理 result.action          ← detail / audit
    ↓
回到 panelLoop 顶部          ← continue
```

### 4.3 代码骨架（预计 ~80 行）

**新文件**：`extensions/ui/panel.ts`

```ts
import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getSearchResults } from "../api";   // 复用现有 search

interface PanelResult {
  action: "detail" | "audit";
  pkgName: string;
}

export async function panelLoop(ctx: ExtensionCommandContext): Promise<void> {
  // 闭包状态
  let cached: PackageInfo[] | null = null;

  while (true) {
    const result = await showPanel(ctx, cached ?? (cached = await loadCatalog()));
    if (!result) return;
    if (result.action === "detail") {
      // 复用 marketplace_detail 的展示逻辑
      await showDetailInline(result.pkgName, ctx);
      continue;   // ← 关键：动作完成后自动重开面板
    }
    if (result.action === "audit") {
      await showAuditInline(result.pkgName, ctx);
      continue;
    }
  }
}

async function showPanel(
  ctx: ExtensionCommandContext,
  items: PackageInfo[],
): Promise<PanelResult | null> {
  return ctx.ui.custom((tui, theme, _kb, done) => {
    const labels = items.map((p) => `${p.name} [${p.types?.join(",") ?? ""}]\n  ${p.description ?? ""}`);
    const sel = require("@earendil-works/pi-tui").SelectList;
    const list = new sel(labels, /* maxRows */ 10, {
      /* theme ... */
    });
    list.onSelect = (item: { value: string }) => {
      const idx = labels.indexOf(item.value);
      if (idx >= 0) done({ action: "detail", pkgName: items[idx].name });
    };
    list.onCancel = () => done(null);
    return {
      render: (w: number) => [/* title */, ...list.render(w), /* help bar */],
      invalidate: () => list.invalidate(),
      handleInput: (data: string) => list.handleInput(data),
    };
  });
}
```

> **注**：上面是骨架示意，不是最终代码。最终 `showPanel` 内部细节要按 `pi-tui` 的实际 API 调整。

### 4.4 文件改动清单

| 文件 | 改动 |
|---|---|
| `extensions/ui/panel.ts` | **新增**（~80 行） |
| `extensions/index.ts` | 注册 `marketplace` slash command（约 +10 行） |
| `extensions/api.ts` | 复用 `searchNpmRegistry`，不动 |
| `extensions/format.ts` | 复用 `formatPackageDetail` / `formatAuditReport`，不动 |
| `README.md` | 增加 `/marketplace` 命令说明（如 demo 落地） |

---

## 5. 验证标准

demo 落地后，回答这 3 个问题：

1. **重入模式是否成立** — 面板里按 `Enter` → 详情出来 → Esc → 面板**状态在不在**（列表、选中位置）？
2. **离 AI 中转能否走通** — 用户**不通过 LLM 触发**能走完"浏览 → 详情 → 审计"全流程吗？
3. **内置 `SelectList` 信息密度够不够** — 一行一项能否承载 `name + type + description`？不够则需写自定义组件（demo 扩到 ~200 行）。

任一问题答案否定，都需要返工或扩大范围。

---

## 6. 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| **跟 LLM 工具链的认知冲突** — 用户分不清"该说话还是点菜单" | README 需明确"两种入口并存"，UI 上给提示 | 在面板底部加 help bar 说明"也可以直接问 pi" |
| **`ctx.ui.custom()` API 兼容性** | 我们 peer dep 是 `*`，但 runtime 可能 < 0.7x 不支持 | 启动时检测 API 存在性，不存在时 fallback 到 `select` 菜单 |
| **内置 `SelectList` 信息密度** | 答案可能是不够，触发返工 | 这正是验证点之一 |
| **状态闭包难测试** | panelLoop 的状态在闭包里，无独立测试入口 | 把 `loadCatalog` / `showDetailInline` 这些**纯函数**部分写 unit test；闭包逻辑不测 |

---

## 7. 决策选项

507 后面选：

- **A. 做这个最小 demo**（80 行，1-2 小时）
  - 答完 3 个验证问题
  - 答案正面则并入 v0.2.0；答案负面则保留为内部工具，不发布
- **B. 不做** — 保持纯工具链
  - 缺点：发现性问题不解决
  - 优点：心智模型简单，不增加维护成本
- **C. 观望** — 等 pi 官方推出 overlay 模板
  - 缺点：时间不可控
  - 优点：避免重复造轮子

**当前倾向**：A（先小做），但**等 507 拍板**。

---

## 8. 关联材料

- `pi-packages-manager` PR #1 — 安全审计（含"启发自 pi-marketplace"声明）
- `pi-packages-manager/src/ui/panel.ts`（252 行，面板主文件）
- `pi-packages-manager/src/ui/package-list.ts`（162 行，自定义组件）
- `pi-packages-manager/src/index.ts:271-300`（`panelLoop` 入口）
- `pi-marketplace/extensions/security.ts`（本地审计实现，PR #1 中借鉴）
- `pi-marketplace/extensions/format.ts`（详情/审计展示，可直接复用）

---

## 9. 变更日志

| 日期 | 变更 |
|---|---|
| 2026-06-06 | 初稿。记录 507 与 pi-packages-manager overlay 面板对比后的最小 demo 方案 |
