# 🛒 pi-marketplace

[English](./README.md) | 简体中文

[![npm version](https://img.shields.io/npm/v/pi-marketplace.svg)](https://www.npmjs.com/package/pi-marketplace)
[![license](https://img.shields.io/npm/l/pi-marketplace.svg)](https://github.com/ssdiwu/pi-marketplace/blob/main/LICENSE)
[![install size](https://packagephobia.now.sh/badge?p=pi-marketplace)](https://packagephobia.now.sh/result?p=pi-marketplace)

面向 npm 的 pi 包**搜索、审计与安装**扩展 —— 内置安全审查，可选 pi.dev 信息补充。

## 功能

| 工具 | 作用 |
|------|------|
| `marketplace_search` | 按关键词搜索 pi 包，可按类型过滤（extension/skill/prompt/theme） |
| `marketplace_detail` | 包的完整信息：版本、作者、许可证、pi manifest、依赖、大小 |
| `marketplace_audit` | 安全审计：元数据检查 + 源码关键字扫描 |
| `marketplace_install` | 审计 → 用户确认 → 安装（绝不自动安装） |

## 安装

```bash
pi install npm:pi-marketplace
```

如果 pi 已在运行，重载：

```
/reload
```

## 使用

### 搜索包

直接让 pi 帮你找：

> 帮我找一个 MCP 相关的 Pi 包

> 有哪些主题包可用？

> 搜一下和 subagent 相关的扩展

### 查看详情

> 看看 pi-mcp-adapter 的详情

### 安全审计

> 安装前先审计一下 @some-user/some-pkg

### 带审查安装

> 安装 pi-mcp-adapter（会先跑审计）

## 工作原理

1. **搜索**：用 `keywords:pi-package` 查询 npm registry，并按你的关键词过滤
2. **类型过滤**：取每个结果的 `pi` manifest，在本地判定资源类型
3. **pi.dev 补充**（可选）：取 pi.dev 的包卡片，补充作者、可读的下载量、相对发布时间与更丰富的类型展示
4. **安全审计**：
   - **第 1 层 —— 元数据**（零成本）：资源类型、依赖数、文件数、包体积、不安全标记
   - **第 2 层 —— 源码扫描**（下载 tarball）：扫描已发布的 `.ts/.js/.mjs/.cjs` 文件中的危险模式：
     - 🔴 严重：`rm -rf`、`rimraf`、`fs.unlink`、`fs.rmdir`
     - 🟠 高：`eval()`、`Function()`、`execSync()`、`spawn()`
     - 🟡 中：`process.env`、`child_process`、HTTP 请求
     - 🟢 低：`chmod`、`chown`
5. **安装**：展示审计报告 → 要求用户明确确认 → 执行 `pi install`

## 设计原则

- **Registry 优先**：搜索、详情、类型过滤与审计都依赖 npm registry 元数据保证正确性。
- **pi.dev 补充是可选的**：搜索结果可用 pi.dev gallery 元数据补充，改善浏览与展示。
- **绝不自动安装**：审计后始终要求用户确认。
- **静态扫描免责声明**：明确说明关键字扫描无法识别混淆过的代码。
- **零依赖**：纯 TypeScript，没有运行时 npm 依赖。

## 开发

```bash
git clone https://github.com/ssdiwu/pi-marketplace.git
cd pi-marketplace
npm install          # peer deps
pi --no-extensions -e .   # load only this extension for testing
```

### 测试

```bash
npm test
```

### 类型检查

```bash
npm run typecheck
```

## 配置

无需配置。所有工具都在调用时接受参数：

| 参数 | 工具 | 说明 |
|------|------|------|
| `query` | search | 搜索关键词 |
| `type` | search | 过滤：extension / skill / prompt / theme |
| `limit` | search | 最大结果数（默认 20） |
| `name` | detail / audit / install | 包名 |
| `deepScan` | audit / install | 下载并扫描源码（默认 true） |

## 文档与核心契约入口

| 入口 | 回答什么问题 |
|------|-------------|
| [`AGENTS.md`](./AGENTS.md) | Agent 边界：第三方包风险、审计与确认语义、验证入口、文档与 Git 规则 |
| [`src/README.md`](./src/README.md) | 源码职责与目录边界 |
| [`src/tools/README.md`](./src/tools/README.md) | 每个注册工具的文件归属 |
| [`doc/README.md`](./doc/README.md) | 文档导航：现行正文、决策档案、参考证据 |
| [`doc/决策档案/`](./doc/决策档案/) | 难逆转决策，一条一文件 |
| [`doc/references/`](./doc/references/) | 来源、影响评估与历史方案 —— 不是现行权威 |
| [`CHANGELOG.md`](./CHANGELOG.md) | 已发布版本历史（英文） |

公开的工具契约（参数、审计规则、确认语义）留在本 README 与实现中；安全边界留在 `AGENTS.md`。

## 贡献

欢迎提交 PR 与 issue。

- 本 README 有两个语言版本：[`README.md`](./README.md)（英文）与 [`README-zh.md`](./README-zh.md)（中文）。改动请在同一次提交里更新两份，语义必须保持同步。
- 贡献与协作规则见 [`AGENTS.md`](./AGENTS.md) 与 [`doc/README.md`](./doc/README.md)。
- 日常 changelog 在本仓用中文写入 [`CHANGELOG-zh.md`](./CHANGELOG-zh.md)；英文 [`CHANGELOG.md`](./CHANGELOG.md) 在发布时按版本同步更新，且只记录用户可感知的事实。两份 changelog 与两版 README 都随 npm 包发布。
- 未获维护者明确批准，不执行 commit、push、tag 或 `npm publish`。

## 许可证

MIT
