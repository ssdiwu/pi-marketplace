# tools/

`pi-marketplace` 注册工具定义目录，一个文件对应一个 Pi custom tool（自定义工具）。

## 工具清单

| 文件 | 工具名 | 职责 |
|------|--------|------|
| `search.ts` | `marketplace_search` | 搜索可安装的 pi packages，并支持按资源类型过滤 |
| `detail.ts` | `marketplace_detail` | 查看包详情、`pi` manifest、依赖和链接 |
| `audit.ts` | `marketplace_audit` | 安装前安全审计，支持元数据与源码扫描 |
| `install.ts` | `marketplace_install` | 审计后请求用户确认并执行安装 |
