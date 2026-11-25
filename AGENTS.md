# pi-marketplace — Agent 规范

## 文件职责与阅读顺序

- 本文件只记录市场扩展长期安全与工具契约；公开工具、安装和使用以 `README.md`、注册实现、类型和测试为准。
- 修改前读取搜索、详情、审计、安装各路径及其测试，不复制当前工具表。
- 文档导航见 `doc/README.md`：现行机制在仓库根 `README.md`，源码职责与工具归属在 `src/README.md` 与 `src/tools/README.md`，难逆转决定在 `doc/决策档案/`，来源与历史方案在 `doc/references/`（备查，不是权威）。

## 安全边界

- 第三方 Pi 包可执行任意代码。推荐或安装前必须先展示来源、资源类型、依赖、大小与安全审计结果。
- 安装必须经过用户对具体包和审计结果的明确确认；“直接安装”也不能跳过审计或确认。
- 搜索、详情和审计保持只读；安装是独立副作用，不能由搜索结果自动触发。
- 包名、版本、manifest、tarball 内容和 registry 返回均视为不可信输入；校验路径，防止解包越界与命令注入。
- 不执行下载包中的脚本来完成审计，不输出环境变量或凭据。
- 调试先用固定元数据/fixture 建立失败信号，连续两次同类失败且范围未缩小时停止原路径。

## 验证

```bash
npm run typecheck
npm test
```

工具注册变化还需临时加载当前仓库，验证搜索、详情、审计和安装确认边界；真实安装只在用户授权的隔离目标中进行。

## 文档与 Git

- 工具参数、审计规则、确认语义、包格式或安装入口变化时同步 `README.md`。
- 未经用户明确要求，不执行 commit、push、tag、npm publish 或安装第三方包。

## 双语与发布约定

- `README.md`（英文）与 `README-zh.md`（中文）是同一份公开说明的两版，改动时同一次提交内同步，语义必须一致；公开贡献说明以两版 README 与 `doc/README.md` 的导航为准，不得只改一版。
- 两份变更日志都在本 GitHub 仓库维护：`CHANGELOG.md` 是英文发布记录，`CHANGELOG-zh.md` 是中文日常记录；两份只写用户可感知事实，不写验证日志、内部过程或纯文档整理。
- 日常用中文把已完成的用户可感知变化写入 `CHANGELOG-zh.md`；准备发布（release）时按版本把同一版本的用户可感知条目同步进英文 `CHANGELOG.md`，两份都保留该版本记录，并核对版本、日期与 issue 链接。
- `README.md` 是英文默认版（npm 默认展示），`README-zh.md` 是同包附带的中文版；两份 README 与两份 changelog 都随 npm 包发布。发布前用 `npm pack --dry-run --ignore-scripts --json` 核对清单包含 `README.md`、`README-zh.md`、`CHANGELOG.md`、`CHANGELOG-zh.md`。
- `doc/` 下的内部资料可用中文，与公开 README 的语言无关；`doc/README.md` 顶部保留英文贡献导航，中文原文留在其后。
