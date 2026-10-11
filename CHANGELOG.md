# 更新日志

本文件记录 `@dayu-sec/wist-web-core` 的所有重要变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.0] - 2026-10-11

### Added
- **双语（zh / en）**：新增 `i18n`（`setLocale` / `getLocale` / `pickLabel` / `pickTemplate`）。
  计划 / 阶段 / 条目状态、推进闸门文案、阶段规模文字、状态与时间窗筛选项都随语言切换；
  导出名与取值（`value` / `kind`）不变，**默认 `zh`** —— 不设置语言的调用方行为与 0.1.0 完全一致。
- 筛选选项的**按语言版本**：`planStatusFilters()` / `planTimeRanges()`（原数组保留为 zh 原文表）。
- **管理面鉴权机制（`auth`）**：新增 `./auth` 子路径 —— `createAdminAuth({ storageKey, authChangedEvent })`
  （token 存取 / 变更通知）、`AdminApiError`（统一错误类型，`status` / `code` / `detail` / `retryAfterSeconds`）、
  `isRateLimitedError` / `isUnauthorizedError`、`readAdminApiError`（解 `{error:{code,message}}` 信封，
  非信封回落截断原文）。收敛 `wist-center-web` 与 `wist-gateway-web` 里**逐字相同**的 `src/api/admin.ts`
  鉴权段；差异（storage key / 事件名）参数化。

### 说明
- 语言是模块级状态，**不自动触发重渲染**：切换语言由各 app 的 store 负责（调 `setLocale` 后重渲染）。
- **鉴权只抽机制，不抽客户端**：端点函数、视图类型、`requestJson` 的实作仍留在各 app（绑的是不同服务）；
  不含 fetch、不含 React，`window` / `sessionStorage` 用 `typeof window` 兜底，可在 Node 里 import 与单测。

## [0.1.0] - 2026-10-06

### Added
- **发布计划灰度阶梯**（`release/phases`）：`planPhases` / `availablePhaseCounts` / `phaseScaleLabel` /
  `PHASE_COUNTS`。收敛原先 `wist-center-web` 与 `wist-gateway-web` 里**两份逐字相同**的实作
  （原先注释写着「改阶梯时两处一起改」），并与 Rust `wist-release::rollout` 的期望切点互钉。
- **计划状态口径**（`release/status`）：计划 / 阶段 / 逐目标条目的 label 与 tone、条目计数、
  阶段是否了结、当前阶段、推进闸门文案、默认列表条数。
- **计划列表筛选**（`release/filters`）：状态分页 + 按本地日历的周/月时间窗。
- **制品版本解析**（`artifact/version`）：从来源名粗解析版本号（轻量镜像中心侧规则，供表单预览）。

### 说明
- 零运行时依赖；不含 React、不含 API 客户端。
- 灰度阶梯与「推进闸门」等口径的**权威仍在 Rust 侧**（`wist-release::rollout`）；本包只做提交前预览。
