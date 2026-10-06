# wist-web-core

wist 前端（`wist-center-web` / `wist-gateway-web`）共用的**纯口径**。零运行时依赖、不含 React、
不含 fetch —— 只有能在浏览器与 Node 里同样跑、能脱离框架单测的纯函数。

## 它是什么、不是什么

**是**：两个前端里**同一套口径**的实作。原先它们各存一份、注释里写着「改一处要改两处」，
现在收敛到这里一份，测试随包走。

**不是**：React 组件、页面、API 客户端、以及各 app 绑定的视图类型。那些绑的是**不同的服务**
（中心的 admin API vs 网关的 admin API）和**不同的实体**（网关实例 vs 子系统 Agent），共享它们会把
两个可独立发布的产物耦死。

## 权威在 Rust 侧，本包只做预览

| 口径 | 权威（真值） | 本包的角色 |
| --- | --- | --- |
| 发布计划**灰度阶梯**（切阶段） | `wist-release::rollout` | 提交前预览会切几段；真值以发布回执为准 |
| 制品**版本解析**（从来源名粗解析） | `wist-center` 的 `infra/package.rs` | 表单预览「会记哪个版本」；真值以发布回执为准 |

`tests/fixtures/rollout-ladder.json` 是与 `wist-release::rollout` 测试**同钉**的期望值
（`available_phase_counts` 与 `cuts_follow_the_ladder_and_cover_everything_once`）。
**改阶梯时以 Rust 侧为准**，两边测试一起改。

## 内容

```
src/release/phases.js    灰度阶梯与阶段切分（plan_phases 的前端实作）
src/release/status.js    计划 / 阶段 / 逐目标条目 的状态口径（label + tone + 计数 + 推进闸门）
src/release/filters.js   计划列表筛选：状态分页 + 按本地日历的时间窗
src/artifact/version.js  从制品来源（URL / 路径）粗解析版本号
```

## 怎么装（本包不发 registry）

从 git 装，按 tag 钉：

```json
"dependencies": {
  "@dayu-sec/wist-web-core": "github:dayu-sec/wist-web-core#v0.1.0"
}
```

> 走 git 安装的前提：安装环境要有 `git`（两个 web 的 Dockerfile 基底是 `node:24-alpine`，
> **不含 git**，需 `RUN apk add --no-cache git`）。
> 包内**零构建**：源码即产物（ESM `.js` + 手写 `.d.ts`），装的时候不跑任何编译。

## 开发

```sh
node --test tests/      # 行为测试（Node 内置 test runner，零依赖）
npm run check-types     # 校验 .d.ts 与用法自洽（devDependency: typescript）
```

版本与打标签走 gx：`gx adm v_patch` / `v_feat` → `gx adm tag_stable`（组件只在 `main`）。
`version.txt` 是版本权威，退出钩子把它同步进 `package.json`（见 `_gal/`）。
