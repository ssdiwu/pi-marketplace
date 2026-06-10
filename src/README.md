# src/

`pi-marketplace` 的 Pi extension 实现代码。

## 入口

- `../index.ts` 是 npm 包标准入口，只 re-export 本目录的 `index.ts`。
- `index.ts` 注册 `marketplace_search`、`marketplace_detail`、`marketplace_audit`、`marketplace_install` 四个工具。

## 文件职责

| 文件 | 职责 |
|------|------|
| `api.ts` | npm registry 查询、包详情与 `pi` manifest 类型推断 |
| `enrich.ts` | 可选 pi.dev gallery 信息补充 |
| `format.ts` | 搜索、详情、审计结果的 Markdown 文本格式化 |
| `render.ts` | TUI 折叠渲染组件 |
| `security.ts` | 包元数据与源码关键字安全审计 |
| `tools/` | 一个文件对应一个注册工具 |
