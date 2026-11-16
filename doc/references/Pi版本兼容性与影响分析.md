# Pi 版本兼容性与影响分析

> **备查材料**，不是现行权威。现行工具契约与安装使用以仓库根 `README.md` 为准。

> 记录上游 Pi 更新对本项目的直接影响和可改进点，供维护决策参考。

---

## 适用范围

本文档跟踪的 Pi 更新基线：**2026-06-09 发布版**

核心变更：
- 包导出清理：移除过时的 `./hooks` 子路径（#5332 关联）
- Project trust（项目信任门控）
- RPC / SDK 类型导出增强
- 其他 TUI / 输入修复

---

## 影响评估：🟢 低 — 包导出清理消除潜在干扰

### 变更详情

> Fixed package exports by removing the stale ./hooks subpath that pointed at non-existent build output.

### 与 marketplace 的关系

marketplace 核心功能是**搜索、审计、安装 npm 上的 pi 包**。在扫描和分析包信息时会读取：

- `package.json` 的 `exports` 字段
- `pi.manifest` 或 `package.json` 的 `pi` 字段
- 包的实际文件结构

### 影响

| 维度 | 说明 |
|------|------|
| 过去风险 | 某些包可能声明了 `./hooks` export 但实际不存在该文件，导致 marketplace 的审计或安装逻辑需要额外处理这个幽灵路径 |
| 现在 | 上游已清理，新发布的包不会再带 `./hooks` 幽灵 export |
| 兼容性 | 历史包可能仍有残留，marketplace 的审计逻辑应保持容错（已有 `try/catch` 保护则无需改动） |

### 建议

1. **[ ] 确认** `extensions/security.ts` 的源码扫描逻辑对不存在的 export 路径是否有容错处理
2. **[ ] 可选** 在审计报告中过滤掉 `./hooks` 相关的 warning（如果之前因此产生过误报）

### 优先级

🔵 **几乎不需要专门处理** — 记录备查即可。

---

## 次要关联

| 变更项 | 影响 | 说明 |
|--------|------|------|
| Project Trust | 🔵 无 | marketplace 作为全局扩展，不依赖项目本地资源 |
| RPC / SDK 类型导出 | 💡 未来机会 | 如果 marketplace 未来加 UI 面板（v0.4.0 overlay），可用官方类型 |
| Cache-hit CH | 📊 可观测 | marketplace tool 调用本身不产生大 prompt，CH 主要反映用户主会话效率 |
| Skill prompt 间距 | 🔵 无 | marketplace 是纯 extension |

---

## 版本记录

| 日期 | Pi 基线 | 变更 |
|------|---------|------|
| 2026-06-09 | 2026-06-09 发布版 | 初版创建；标记包导出清理为低影响项 |
