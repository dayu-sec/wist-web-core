import { pickLabel, pickTemplate } from "../i18n.js";

/**
 * 灰度阶段的分法（前端**预览**口径）。
 *
 * 服务端**权威口径**在 Rust 侧 `wist-release::rollout`（中心与网关共用同一份）；这里只是让操作者
 * 在提交前看见会切几段，真值以发布回执为准。实现与那份 Rust 逐条对齐，期望值同钉在
 * `tests/fixtures/rollout-ladder.json`（取自 Rust 侧 `available_phase_counts` 与
 * `cuts_follow_the_ladder_and_cover_everything_once`）——**改阶梯时以 Rust 为准**，两边测试一起改。
 *
 * 一个目标只能属于一个阶段（计划里阶段之间**互不重叠**），所以用「累计覆盖」的阶梯表达灰度：
 * 每个阶段声明「覆盖到全部目标的多少」，相邻阶段的**新增** = 本次覆盖 − 上次覆盖；运维只选
 * **阶段数**，不填任何目标 id。
 *
 * 阶梯固定：1 个（金丝雀）→ 10% → 30% → 70% → 全量（剩余）。选 K 个阶段时取阶梯前 K-1 级作为
 * 中间切点，最后一级永远是「剩余全部」，保证一把铺满目标。
 *
 * 本文件不含任何具体名词（网关 / Agent / 机队）：错误文案用中性的「目标」，两个 app 共用同一句。
 */

/** 中间切点阶梯（「全量」由阶段数隐含，不在表里）。 */
const LADDER = [
  { kind: "count", value: 1 }, // 金丝雀：1 个
  { kind: "percent", value: 10 },
  { kind: "percent", value: 30 },
  { kind: "percent", value: 70 },
];

/** 可选的阶段数：阶梯最多 4 个中间切点 + 一级「剩余」= 5 阶段。 */
export const PHASE_COUNTS = [2, 3, 4, 5];

/**
 * 目标台数**能支持**的阶段数：每段至少 1 个，所以阶段数不能大于台数 —— 目标少时就不该多轮。
 * 只保留 ≤ 台数的预设；一个目标时退化为 `[1]`（不分批，一把到位）。
 */
export function availablePhaseCounts(total) {
  if (total <= 0) return [];
  const feasible = PHASE_COUNTS.filter((count) => count <= total);
  return feasible.length > 0 ? [...feasible] : [1];
}

/** 阶梯第 i 级的**目标**覆盖比例；这一级是台数（金丝雀）时返回 `null`。 */
function ladderCoverage(i) {
  const cut = LADDER[Math.min(i, LADDER.length - 1)];
  return cut.kind === "percent" ? cut.value / 100 : null;
}

/** 一个切点折算成「覆盖几个」。 */
function cutSize(cut, total) {
  if (cut.kind === "count") return Math.min(cut.value, total);
  return Math.ceil((cut.value / 100) * total);
}

/**
 * 把目标切成 `phaseCount` 个互不重叠的阶段。
 *
 * 顺序取**排序后的 id**（确定、可复现）。累计覆盖保证切点单调不减，再夹到
 * `[上一切点 + 1, 台数 - 后面阶段数]`，确保每段**非空**；目标太少（分段数 > 台数）直接报错，
 * 而不是悄悄给出空阶段。
 */
export function planPhases(targetIds, phaseCount) {
  const total = targetIds.length;
  const order = [...targetIds].sort();
  if (total === 0) {
    return {
      phases: [],
      error: pickLabel(
        "还没有可选目标，无法分配阶段。",
        "No targets selected yet, so phases cannot be assigned.",
      ),
    };
  }
  if (phaseCount > total) {
    return {
      phases: [],
      error: pickTemplate(
        "只有 {total} 个目标，分不出 {phaseCount} 个非空阶段。",
        "Only {total} target(s): cannot split them into {phaseCount} non-empty phases.",
        { total, phaseCount },
      ),
    };
  }

  const cuts = [];
  let previous = 0;
  for (let i = 0; i < phaseCount - 1; i += 1) {
    const cut = LADDER[Math.min(i, LADDER.length - 1)];
    // 给后面每个阶段留至少 1 个。
    const upper = total - (phaseCount - i - 1);
    const size = Math.max(previous + 1, Math.min(cutSize(cut, total), upper));
    cuts.push(size);
    previous = size;
  }
  cuts.push(total);

  const phases = [];
  let start = 0;
  for (let i = 0; i < cuts.length; i += 1) {
    const end = cuts[i];
    const ids = order.slice(start, end);
    phases.push({
      index: i + 1,
      targetIds: ids,
      coverage: end === total ? 1 : ladderCoverage(i),
      // 金丝雀 = 首批且恰好 1 个；但若这一批就是全部（只选一个目标），不算金丝雀。
      isCanary: i === 0 && ids.length === 1 && end !== total,
      isFinal: end === total,
    });
    start = end;
  }
  return { phases, error: null };
}

/** 阶段的规模文字：金丝雀读「1 个」，其余读「覆盖 ~X%」（X 是阶梯上的那一级）。 */
export function phaseScaleLabel(phase) {
  if (phase.isCanary) return pickLabel("1 个（金丝雀）", "1 target (canary)");
  const percent = Math.round((phase.coverage ?? 0) * 100);
  return pickTemplate("覆盖 ~{percent}%", "~{percent}% coverage", { percent });
}
