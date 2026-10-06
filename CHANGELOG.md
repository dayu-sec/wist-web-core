# 更新日志

本文件记录 `@dayu-sec/wist-web-core` 的所有重要变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

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
