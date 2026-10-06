import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LATEST_PLAN_LIMIT,
  advanceRuleLabel,
  countEntries,
  currentPhase,
  entryStatusLabel,
  entryStatusTone,
  isEntrySettled,
  latestPlans,
  phaseIncompleteCount,
  phaseSettled,
  phaseStatusLabel,
  phaseStatusTone,
  planStatusLabel,
  planStatusTone,
  planTargetCount,
} from "../src/release/status.js";

const PHASE = { targetIds: ["a", "b", "c"] };
const entry = (targetId, status) => ({ targetId, status });

test("计划状态：文案与语气", () => {
  assert.equal(planStatusLabel("draft"), "草稿（待批准）");
  assert.equal(planStatusLabel("rolling"), "灰度中");
  assert.equal(planStatusLabel("completed"), "已完成");
  assert.equal(planStatusLabel("failed"), "失败");
  assert.equal(planStatusLabel("canceled"), "已取消");
  assert.equal(planStatusLabel("brand_new"), "brand_new", "认不出的原样返回");
  assert.deepEqual(
    ["rolling", "completed", "draft", "failed", "?"].map(planStatusTone),
    ["ok", "ok", "warn", "crit", "unknown"],
  );
});

test("阶段状态：文案与语气", () => {
  assert.equal(phaseStatusLabel("pending"), "待开始");
  assert.equal(phaseStatusLabel("rolling"), "进行中");
  assert.equal(phaseStatusLabel("completed"), "已完成");
  assert.deepEqual(
    ["pending", "rolling", "completed"].map(phaseStatusTone),
    ["unknown", "ok", "ok"],
  );
});

test("条目状态：在飞算 ok，失败算 crit，未了结不算", () => {
  assert.equal(entryStatusLabel("dispatched"), "执行中");
  assert.equal(entryStatusLabel("succeeded"), "成功");
  assert.equal(entryStatusTone("dispatched"), "ok");
  assert.equal(entryStatusTone("succeeded"), "ok");
  assert.equal(entryStatusTone("failed"), "crit");
  assert.equal(entryStatusTone("pending"), "unknown");
  assert.equal(isEntrySettled("succeeded"), true);
  assert.equal(isEntrySettled("failed"), true);
  assert.equal(isEntrySettled("dispatched"), false);
  assert.equal(isEntrySettled("pending"), false);
});

test("推进闸门文案：三种取值 + 末阶段", () => {
  assert.equal(advanceRuleLabel("manual"), "人工确认后推进");
  assert.equal(advanceRuleLabel("all_succeeded"), "本阶段全部成功自动推进");
  assert.equal(advanceRuleLabel("success_rate:80"), "本阶段成功率 ≥ 80% 自动推进");
  assert.equal(advanceRuleLabel(" success_rate:50 "), "本阶段成功率 ≥ 50% 自动推进");
  assert.equal(
    advanceRuleLabel("manual", true),
    "末阶段：全部了结后自动收尾",
    "末阶段没有下一段，不看闸门",
  );
  assert.equal(advanceRuleLabel(""), "—");
  assert.equal(advanceRuleLabel("success_rate:abc"), "success_rate:abc", "认不出的原样返回");
});

test("计划铺到的目标总数按去重算", () => {
  assert.equal(planTargetCount({ phases: [{ targetIds: ["a", "b"] }] }), 2);
  assert.equal(
    planTargetCount({ phases: [{ targetIds: ["a"] }, { targetIds: ["b", "c"] }] }),
    3,
  );
  assert.equal(planTargetCount({ phases: [] }), 0);
});

test("条目计数", () => {
  const tally = countEntries([
    entry("a", "pending"),
    entry("b", "dispatched"),
    entry("c", "succeeded"),
    entry("d", "failed"),
    entry("e", "succeeded"),
  ]);
  assert.deepEqual(tally, {
    total: 5,
    pending: 1,
    dispatched: 1,
    succeeded: 2,
    failed: 1,
  });
  assert.deepEqual(countEntries([]), {
    total: 0,
    pending: 0,
    dispatched: 0,
    succeeded: 0,
    failed: 0,
  });
});

test("阶段是否了结：缺条目的 target 视为未了结", () => {
  assert.equal(
    phaseSettled(PHASE, [
      entry("a", "succeeded"),
      entry("b", "failed"),
      entry("c", "succeeded"),
    ]),
    true,
  );
  assert.equal(
    phaseSettled(PHASE, [entry("a", "succeeded"), entry("b", "failed")]),
    false,
    "c 没有条目",
  );
  assert.equal(
    phaseSettled(PHASE, [entry("a", "succeeded"), entry("b", "dispatched"), entry("c", "failed")]),
    false,
    "还有在飞的",
  );
});

test("阶段未了结计数", () => {
  assert.equal(
    phaseIncompleteCount(PHASE, [
      entry("a", "succeeded"),
      entry("b", "dispatched"),
      entry("c", "pending"),
    ]),
    2,
  );
  assert.equal(phaseIncompleteCount(PHASE, []), 3, "条目全缺 = 全未了结");
});

test("当前阶段：越界返回 null", () => {
  const phases = [{ targetIds: ["a"] }, { targetIds: ["b"] }, { targetIds: ["c"] }];
  assert.deepEqual(currentPhase({ currentPhase: 2, phases }), phases[1]);
  assert.equal(currentPhase({ currentPhase: 0, phases }), null);
  assert.equal(currentPhase({ currentPhase: 4, phases }), null);
});

test("默认列表只取最近 N 条（负值按 0）", () => {
  assert.equal(LATEST_PLAN_LIMIT, 5);
  const plans = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(latestPlans(plans), [1, 2, 3, 4, 5]);
  assert.deepEqual(latestPlans(plans, 2), [1, 2]);
  assert.deepEqual(latestPlans(plans, -1), []);
  assert.deepEqual(latestPlans(plans, 0), []);
});
