import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PLAN_STATUS_FILTERS,
  PLAN_TIME_RANGES,
  filterRolloutPlans,
  matchesPlanStatus,
  matchesPlanTimeRange,
  startOfWeek,
  timeRangeBounds,
} from "../src/release/filters.js";

const DAY = 24 * 60 * 60 * 1000;

/** 本地时间的一个「基准时刻」；具体是星期几无所谓，断言都用不变量。 */
const NOW = new Date(2026, 9, 6, 15, 30);

test("可选项：状态分页与时间窗", () => {
  assert.deepEqual(
    PLAN_STATUS_FILTERS.map((item) => item.value),
    ["all", "rolling", "succeeded", "failed"],
  );
  assert.deepEqual(
    PLAN_TIME_RANGES.map((item) => item.value),
    ["all", "this_week", "last_week", "this_month"],
  );
});

test("状态分页：draft / canceled 只在「全部」里出现", () => {
  assert.equal(matchesPlanStatus("draft", "all"), true);
  assert.equal(matchesPlanStatus("draft", "rolling"), false);
  assert.equal(matchesPlanStatus("rolling", "rolling"), true);
  assert.equal(matchesPlanStatus("completed", "succeeded"), true, "成功 = completed");
  assert.equal(matchesPlanStatus("rolling", "succeeded"), false);
  assert.equal(matchesPlanStatus("failed", "failed"), true);
  assert.equal(matchesPlanStatus("canceled", "failed"), false);
});

test("一周之始：周一 00:00，且幂等", () => {
  const start = startOfWeek(NOW);
  assert.equal(start.getDay(), 1, "周一");
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.ok(start.getTime() <= NOW.getTime());
  assert.ok(NOW.getTime() - start.getTime() < 7 * DAY);
  assert.equal(startOfWeek(start).getTime(), start.getTime(), "幂等");
});

test("时间窗边界（本地日历）：本周 / 上周 / 本月 / 全部", () => {
  const week = startOfWeek(NOW);
  assert.equal(timeRangeBounds("all", NOW), null);

  const thisWeek = timeRangeBounds("this_week", NOW);
  assert.equal(thisWeek.start.getTime(), week.getTime());
  assert.equal(thisWeek.end.getTime(), week.getTime() + 7 * DAY);

  const lastWeek = timeRangeBounds("last_week", NOW);
  assert.equal(lastWeek.start.getTime(), week.getTime() - 7 * DAY);
  assert.equal(lastWeek.end.getTime(), week.getTime());

  const thisMonth = timeRangeBounds("this_month", NOW);
  assert.equal(thisMonth.start.getDate(), 1);
  assert.equal(thisMonth.start.getMonth(), NOW.getMonth());
  assert.equal(thisMonth.end.getMonth(), NOW.getMonth() + 1);
  assert.equal(thisMonth.end.getDate(), 1);
});

test("时间窗命中：闭开区间 [起, 止)", () => {
  const week = startOfWeek(NOW);
  const inside = new Date(week.getTime() + 3 * DAY).toISOString();
  const before = new Date(week.getTime() - DAY).toISOString();
  assert.equal(matchesPlanTimeRange(inside, "this_week", NOW), true);
  assert.equal(matchesPlanTimeRange(before, "this_week", NOW), false);
  assert.equal(matchesPlanTimeRange(inside, "last_week", NOW), false);
  assert.equal(matchesPlanTimeRange(inside, "all", NOW), true);
  assert.equal(
    matchesPlanTimeRange("not-a-date", "this_week", NOW),
    false,
    "认不出的时间戳不进任何时间窗",
  );
});

test("状态 + 时间窗一起筛", () => {
  const week = startOfWeek(NOW);
  const plans = [
    { status: "completed", createdAt: new Date(week.getTime() + DAY).toISOString() },
    { status: "rolling", createdAt: new Date(week.getTime() + 2 * DAY).toISOString() },
    { status: "failed", createdAt: new Date(week.getTime() - 8 * DAY).toISOString() },
    { status: "draft", createdAt: new Date(week.getTime() + 3 * DAY).toISOString() },
  ];
  const inWeek = filterRolloutPlans(plans, { status: "all", timeRange: "this_week" }, NOW);
  assert.equal(inWeek.length, 3, "上周那条被收窄掉");

  const succeeded = filterRolloutPlans(plans, { status: "succeeded", timeRange: "all" }, NOW);
  assert.deepEqual(succeeded.map((plan) => plan.status), ["completed"]);

  const failedAll = filterRolloutPlans(plans, { status: "failed", timeRange: "all" }, NOW);
  assert.deepEqual(failedAll.map((plan) => plan.status), ["failed"]);
});
