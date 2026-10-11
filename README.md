# wist-web-core

wist 前端（`wist-center-web` / `wist-gateway-web`）共用的**纯口径**。零运行时依赖、不含 React、
不含 fetch —— 只有能在浏览器与 Node 里同样跑、能脱离框架单测的纯函数。

## 双语（i18n）

```js
import { setLocale, getLocale, pickLabel, pickTemplate } from "@dayu-sec/wist-web-core/i18n";

setLocale("en");                     // "zh"（默认）| "en"；认不出的值忽略
planStatusLabel("rolling");          // → "Rolling out"（"zh" 时 → "灰度中"）
pickLabel("已接入", "Enrolled");      // 二选一取词
pickTemplate("已选 {n} 台", "{n} selected", { n: 3 });
```

- **默认 `zh`**：不调 `setLocale` 的调用方，行为与 0.1.0 完全一致（导出的 `*_LABEL` 表保持 zh 原文）。
- 语言是**模块级状态**，不自动触发重渲染：各 app 调 `setLocale` 后自己重渲染（本包不含 React）。
- 随语言变的：计划 / 阶段 / 条目状态、推进闸门文案、阶段规模文字、`planPhases` 的错误串、
  `planStatusFilters()` / `planTimeRanges()`。
- 页面里若直接用 `tracking` 的 `PLAN_STATUS_FILTERS` / `PLAN_TIME_RANGES` 数组（zh 原文表），
  改用同名函数版即可拿到当前语言（值不变、只换文案）。

## 管理面鉴权机制（admin token）

两个前端的 `src/api/admin.ts` 里，「token 存哪 / 怎么发 Bearer / 401 与 429 怎么判 /
`{error:{code,message}}` 信封怎么拆」是**逐字相同**的一份；差异只有 storage key 与事件名。
这里收敛成一份，差异参数化：

```js
import {
  createAdminAuth,
  AdminApiError,
  isRateLimitedError,
  isUnauthorizedError,
  readAdminApiError,
} from "@dayu-sec/wist-web-core/auth";

const auth = createAdminAuth({
  storageKey: "warpInsightAdminApiToken",          // 中心：warpInsightCenterApiToken
  authChangedEvent: "warpInsightAdminAuthChanged", // 中心：warpInsightCenterAuthChanged
});
auth.setAdminApiToken("…");   // 存 sessionStorage + 在 window 上派发变更事件
```

- **只抽机制，不抽客户端**：端点函数、视图类型、`requestJson` 的实作（超时 / 重试 / 示例回落）
  仍留在各 app —— 那些绑的是不同服务。
- `AdminApiError` 是统一错误类型（`status` / `code` / `detail` / `retryAfterSeconds`）；
  `readAdminApiError(response)` 解后端信封（只用到 `text()`，与 `Response` 结构兼容）。
- 不含 fetch、不含 React；`window` / `sessionStorage` 用 `typeof window` 兜底，故也能在 Node 里 import 与单测。

## 它是什么、不是什么

**是**：两个前端里**同一套口径**的实作。原先它们各存一份、注释里写着「改一处要改两处」，
现在收敛到这里一份，测试随包走。

**不是**：React 组件、页面、各服务的 **API 客户端**（端点函数、视图类型），以及各 app 绑定的实体
（网关实例 vs 子系统 Agent）。那些绑的是**不同的服务**，共享它们会把两个可独立发布的产物耦死。
但**鉴权机制**这类与「哪个服务」无关的部分（token 存取、Bearer 注入口径、401 / 429 归类、
错误信封解析）是共享的（见 `./auth`）—— 两条线别混。

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
src/auth/index.js        管理面 token 的存取 / 变更通知 + 统一错误类型 / 401·429 归类 / 信封解析
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
