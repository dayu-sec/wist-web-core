import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LOCALES,
  getLocale,
  setLocale,
  pickLabel,
  pickTemplate,
} from "../src/i18n.js";
import {
  planStatusLabel,
  phaseStatusLabel,
  entryStatusLabel,
  advanceRuleLabel,
} from "../src/release/status.js";
import { phaseScaleLabel } from "../src/release/phases.js";
import { planStatusFilters, planTimeRanges } from "../src/release/filters.js";

/** 每个用例自己收尾：语言是模块级状态，漏了会把后面用例带跑偏。 */
function withLocale(locale, fn) {
  setLocale(locale);
  try {
    fn();
  } finally {
    setLocale("zh");
  }
}

test("默认是 zh，且不设置时行为与加 i18n 之前一致", () => {
  setLocale("zh");
  assert.equal(getLocale(), "zh");
  assert.deepEqual([...LOCALES], ["zh", "en"]);
  assert.equal(planStatusLabel("draft"), "草稿（待批准）");
  assert.equal(entryStatusLabel("pending"), "待派发");
  assert.equal(advanceRuleLabel("manual"), "人工确认后推进");
  assert.equal(phaseScaleLabel({ isCanary: true }), "1 个（金丝雀）");
  assert.equal(planStatusFilters()[0].label, "全部");
});

test("认不出的语言忽略（保持原语言）", () => {
  withLocale("en", () => {
    assert.equal(setLocale("fr"), "en");
    assert.equal(getLocale(), "en");
  });
});

test("en 下标签整体切英文；值/键不变", () => {
  withLocale("en", () => {
    assert.equal(planStatusLabel("rolling"), "Rolling out");
    assert.equal(planStatusLabel("canceled"), "Canceled");
    assert.equal(phaseStatusLabel("pending"), "Not started");
    assert.equal(entryStatusLabel("dispatched"), "In progress");
    assert.equal(advanceRuleLabel("all_succeeded"), "Advances automatically when every target in the phase succeeds");
    assert.equal(advanceRuleLabel("success_rate: 80"), "Advances automatically once the phase success rate reaches 80%");
    assert.equal(advanceRuleLabel("manual", true), "Last phase: converges automatically once every target settles");
    assert.equal(phaseScaleLabel({ isCanary: true }), "1 target (canary)");
    assert.equal(phaseScaleLabel({ coverage: 0.3 }), "~30% coverage");

    const statuses = planStatusFilters();
    assert.deepEqual(statuses.map((o) => o.value), ["all", "rolling", "succeeded", "failed"]);
    assert.deepEqual(statuses.map((o) => o.label), ["All", "Rolling out", "Succeeded", "Failed"]);
    const ranges = planTimeRanges();
    assert.deepEqual(ranges.map((o) => o.value), ["all", "this_week", "last_week", "this_month"]);
    assert.equal(ranges[3].label, "This month");
  });
});

test("认不出的状态码原样露出（不编造英文）", () => {
  withLocale("en", () => {
    assert.equal(planStatusLabel("wat"), "wat");
    assert.equal(entryStatusLabel("wat"), "wat");
  });
});

test("pickLabel / pickTemplate", () => {
  withLocale("zh", () => {
    assert.equal(pickLabel("中文", "English"), "中文");
    assert.equal(pickTemplate("已选 {n} 台", "{n} selected", { n: 3 }), "已选 3 台");
    // 占位符没给值 → 原样留着（不写 "undefined"）。
    assert.equal(pickTemplate("a {missing} b", "a {missing} b"), "a {missing} b");
  });
  withLocale("en", () => {
    assert.equal(pickLabel("中文", "English"), "English");
    assert.equal(pickTemplate("已选 {n} 台", "{n} selected", { n: 3 }), "3 selected");
  });
});
