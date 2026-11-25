# doc/

English navigation, with the original Chinese text preserved below.

| Document | Audience | What it answers |
|----------|----------|-----------------|
| [../README.md](../README.md) | users | English edition of the public guide to installation, tools, parameters, usage, and design |
| [../README-zh.md](../README-zh.md) | users | The same document in Chinese |
| [../AGENTS.md](../AGENTS.md) | agents | File responsibilities and reading order, security boundary, verification commands, doc and Git rules |

**Contributing**: keep the English `README.md` (npm default) and the Chinese `README-zh.md` in sync in the same commit; daily changelog entries live in Chinese in `../CHANGELOG-zh.md`, and the English `../CHANGELOG.md` is updated per version at release time with user-perceivable facts only. Both READMEs and both changelogs ship in the npm package. Verification entry points are `npm run typecheck` and `npm test` as recorded in `../AGENTS.md`. Do not commit, push, tag or publish without explicit maintainer approval.

---

本文件只做入口导航，不重复规格正文。公开工具、安装和使用以仓库根 [README.md](../README.md) 为准；agent 工作约定以 [AGENTS.md](../AGENTS.md) 为准。

## 现行正文

| 位置 | 面向 | 说明 |
|------|------|------|
| [../README.md](../README.md) | 使用者 | 公开使用指南英文版，涵盖安装、工具、参数、用法与设计 |
| [../README-zh.md](../README-zh.md) | 使用者 | 同一份文档的中文版 |
| [../AGENTS.md](../AGENTS.md) | agent | 文件职责与阅读顺序、安全边界、验证命令、文档与 Git 规则 |
| [../src/README.md](../src/README.md) | 维护者 | 源码职责与目录边界：入口、文件职责（api / enrich / format / render / security / tools） |
| [../src/tools/README.md](../src/tools/README.md) | 维护者 | 每个注册工具的文件归属与职责（search / detail / audit / install） |
| [../CHANGELOG.md](../CHANGELOG.md) | 使用者 | 英文发布记录，按版本说明用户可感知的变化 |

## 决策档案

难逆转的决定记在这里，一条一文件，索引见 [决策档案/README.md](./决策档案/README.md)。

| 位置 | 说明 |
|------|------|
| [决策档案/README.md](./决策档案/README.md) | 决策档案索引 |
| [决策档案/0001-工具结果人类可读投影.md](./决策档案/0001-工具结果人类可读投影.md) | 公开工具以摘要与文字详情投影展示，禁止 JSON 直出 |

## 参考证据（doc/references/）

来源、影响评估与历史方案等备查材料，不是现行权威。

| 文件 | 性质 | 说明 |
|------|------|------|
| [references/从-pi-packages-manager-借鉴-架构与UX路线图.md](./references/从-pi-packages-manager-借鉴-架构与UX路线图.md) | 来源 | 对照 pi-packages-manager 与 pi-tinyfish 的借鉴清单、优先级与价值/成本排序 |
| [references/Pi版本兼容性与影响分析.md](./references/Pi版本兼容性与影响分析.md) | 来源 / 影响评估 | 上游 Pi 2026-06-09 更新（包导出清理、Project Trust 等）对本项目的影响 |
| [references/版本路线图.md](./references/版本路线图.md) | 历史方案 | v0.1.0 → v0.7.0+ 的版本演进计划（状态：待评审） |
| [references/工作记录/pi-marketplace-代码质量与验收检查-20260601004646-19en.md](./references/工作记录/pi-marketplace-代码质量与验收检查-20260601004646-19en.md) | 工作记录 | 早期代码质量与验收检查的 PASS/FAIL 结论 |

## 使用约定

- 本目录不保留现行机制的第二份正文。新增材料先判断归属：用户可见的工具、安装与参数说明写进根 `README.md`，源码职责写进 `src/README.md` 与 `src/tools/README.md`，难逆转决定进 `决策档案/`，其余进 `references/`。
- 根目录没有 `PLAN.md`；已发布版本以 `../CHANGELOG.md` 与 `../package.json` 的版本号为准，日常变更在本仓中文 `../CHANGELOG-zh.md` 维护。
- 本仓库没有 `doc/架构/`、`doc/规格/`、`doc/术语表.md`、`doc/经验笔记.md`：机制与工具契约正文已在根 `README.md` 与 `src/README.md`、`src/tools/README.md`，没有对应内容时不建空目录。
- `README.md`（英文默认）与 `README-zh.md`（中文）需在同一次提交中同步；日常 changelog 在本仓用中文写入 `../CHANGELOG-zh.md`，英文 `../CHANGELOG.md` 发布时按版本同步更新，只记用户可感知事实；两份 README 与两份 changelog 都随 npm 包发布。
