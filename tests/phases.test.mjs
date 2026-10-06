import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE_COUNTS,
  availablePhaseCounts,
  phaseScaleLabel,
  planPhases,
} from "../src/release/phases.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(here, "fixtures", "rollout-ladder.json"), "utf8"),
);

/** 与 Rust 测试同一套目标 id：`gw-001` …（零填充，排序稳定）。 */
function targets(n) {
  return Array.from({ length: n }, (_, i) => `gw-${String(i + 1).padStart(3, "0")}`);
}

function sizes(phases) {
  return phases.map((phase) => phase.targetIds.length);
}

test("可选阶段数与 Rust 权威同钉", () => {
  assert.deepEqual([...PHASE_COUNTS], [2, 3, 4, 5]);
  for (const { total, counts } of fixture.availablePhaseCounts) {
    assert.deepEqual(availablePhaseCounts(total), counts, `total=${total}`);
  }
});

test("切点按阶梯走，且一把铺满（与 Rust 期望值同钉）", () => {
  for (const { targets: n, phaseCount, sizes: expected } of fixture.phaseSizes) {
    const plan = planPhases(targets(n), phaseCount);
    assert.equal(plan.error, null, `n=${n} k=${phaseCount} 应可分`);
    assert.deepEqual(sizes(plan.phases), expected, `n=${n} k=${phaseCount}`);
  }
});

test("阶段之间互不重叠、合起来恰好是全部目标", () => {
  const plan = planPhases(targets(10), 5);
  const all = plan.phases.flatMap((phase) => phase.targetIds);
  assert.deepEqual(all, targets(10), "互不重叠且覆盖全量");
  assert.deepEqual(new Set(all).size, all.length);
});

test("标志位与覆盖比例（金丝雀 / 收尾 / 阶梯那一级）", () => {
  const plan = planPhases(targets(10), 5);
  const { tenAtFive } = fixture;
  assert.deepEqual(plan.phases[0].targetIds, tenAtFive.firstPhaseTargetIds);
  assert.equal(plan.phases[0].isCanary, tenAtFive.firstPhaseIsCanary);
  assert.equal(plan.phases[0].isFinal, tenAtFive.firstPhaseIsFinal);
  assert.equal(plan.phases[0].coverage, null, "金丝雀段没有百分比");
  assert.equal(plan.phases.at(-1).isFinal, true);
  assert.equal(plan.phases.at(-1).coverage, 1, "收尾段覆盖到全量");
  assert.equal(
    plan.phases[2].coverage * 100,
    tenAtFive.thirdPhaseCoveragePercent,
    "展示的是阶梯那一级（30%），不是切片/台数的实现值",
  );
});

test("单目标：一把到位，不算金丝雀", () => {
  const one = planPhases(targets(1), 1);
  assert.deepEqual(sizes(one.phases), [1]);
  assert.equal(one.phases[0].isCanary, fixture.singleTarget.isCanary);
  assert.equal(one.phases[0].isFinal, fixture.singleTarget.isFinal);
});

test("顺序取排序后的 id（确定、可复现）", () => {
  const shuffled = ["gw-003", "gw-001", "gw-002"];
  const plan = planPhases(shuffled, 3);
  assert.deepEqual(
    plan.phases.flatMap((phase) => phase.targetIds),
    ["gw-001", "gw-002", "gw-003"],
  );
});

test("分不出来时报中性错误（不带「网关 / 机队」这类名词）", () => {
  const empty = planPhases([], 2);
  assert.deepEqual(empty.phases, []);
  assert.match(empty.error, /目标/);

  const tooFew = planPhases(targets(2), 4);
  assert.deepEqual(tooFew.phases, []);
  assert.match(tooFew.error, /只有 2 个目标/);
  assert.match(tooFew.error, /分不出 4 个非空阶段/);
});

test("规模文字：金丝雀读「1 个」，其余读阶梯那一级", () => {
  const plan = planPhases(targets(10), 5);
  assert.equal(phaseScaleLabel(plan.phases[0]), "1 个（金丝雀）");
  assert.equal(phaseScaleLabel(plan.phases[2]), "覆盖 ~30%");
  assert.equal(phaseScaleLabel(plan.phases.at(-1)), "覆盖 ~100%");
});
