import { isEnglish, pickLabel, pickTemplate } from "../i18n.js";

/**
 * 灰度发布计划的状态呈现口径（页面与契约测试共用一份，避免两处各写一套判断）。
 *
 * 语气沿用全局设计变量：ok / warn / crit / unknown。计划是「编排层」，条目（entry）才是逐台的事实
 * —— 计划的状态说「这张单子走到哪」，条目的状态说「这一台成没成」，两者不要混。
 *
 * 类型上只依赖**结构**（`targetIds` / `targetId`+`status` / `currentPhase`+`phases`），不引用各 app
 * 的视图类型：两个 app 的 `RolloutPlanView` 之类只要形状对得上就能直接喂进来。
 */

/** 计划整体状态（模型 `RolloutPlan.status`）。**zh 原文表**（导出保持原样，兼容老调用方）。 */
export const PLAN_STATUS_LABEL = {
  draft: "草稿（待批准）",
  rolling: "灰度中",
  completed: "已完成",
  failed: "失败",
  canceled: "已取消",
};

/** 英文表；键与 zh 表一一对应。 */
const PLAN_STATUS_LABEL_EN = {
  draft: "Draft (awaiting approval)",
  rolling: "Rolling out",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
};

export function planStatusLabel(status) {
  const table = isEnglish() ? PLAN_STATUS_LABEL_EN : PLAN_STATUS_LABEL;
  return table[status] ?? status;
}

export function planStatusTone(status) {
  switch (status) {
    case "rolling":
    case "completed":
      return "ok";
    case "draft":
      return "warn";
    case "failed":
      return "crit";
    default:
      return "unknown";
  }
}

/** 阶段状态（模型 `RolloutPhase.status`）。 */
export const PHASE_STATUS_LABEL = {
  pending: "待开始",
  rolling: "进行中",
  completed: "已完成",
};

/** 英文表；键与 zh 表一一对应。 */
const PHASE_STATUS_LABEL_EN = {
  pending: "Not started",
  rolling: "In progress",
  completed: "Completed",
};

export function phaseStatusLabel(status) {
  const table = isEnglish() ? PHASE_STATUS_LABEL_EN : PHASE_STATUS_LABEL;
  return table[status] ?? status;
}

export function phaseStatusTone(status) {
  switch (status) {
    case "rolling":
    case "completed":
      return "ok";
    default:
      return "unknown";
  }
}

/**
 * 逐目标条目状态（由 agentd 上报的结果折算）。
 *
 * 语气与「采集工作」页对一次性工作的口径一致：在飞（dispatched）= ok，
 * 还没派（pending）= unknown，成功 = ok，失败 = crit。
 */
export const ENTRY_STATUS_LABEL = {
  pending: "待派发",
  dispatched: "执行中",
  succeeded: "成功",
  failed: "失败",
};

/** 英文表；键与 zh 表一一对应。 */
const ENTRY_STATUS_LABEL_EN = {
  pending: "Awaiting dispatch",
  dispatched: "In progress",
  succeeded: "Succeeded",
  failed: "Failed",
};

export function entryStatusLabel(status) {
  const table = isEnglish() ? ENTRY_STATUS_LABEL_EN : ENTRY_STATUS_LABEL;
  return table[status] ?? status;
}

export function entryStatusTone(status) {
  switch (status) {
    case "succeeded":
    case "dispatched":
      return "ok";
    case "failed":
      return "crit";
    default:
      return "unknown";
  }
}

/** 条目是否已了结（成功 / 失败）。 */
export function isEntrySettled(status) {
  return status === "succeeded" || status === "failed";
}

/**
 * 推进闸门的可读写法（模型里的三种取值）。
 *
 * `isLastPhase` = 末阶段：闸门管的是「进入**下一阶段**」，而末阶段没有下一段 —— 推进它不派任何
 * 新活，只是把计划收尾，所以它全部了结后会**自动**收敛为 completed（不看闸门）。
 */
export function advanceRuleLabel(rule, isLastPhase = false) {
  if (isLastPhase) {
    return pickLabel(
      "末阶段：全部了结后自动收尾",
      "Last phase: converges automatically once every target settles",
    );
  }
  const text = rule.trim();
  if (text === "manual") return pickLabel("人工确认后推进", "Advances after a human confirms");
  if (text === "all_succeeded") {
    return pickLabel(
      "本阶段全部成功自动推进",
      "Advances automatically when every target in the phase succeeds",
    );
  }
  const prefix = "success_rate:";
  if (text.startsWith(prefix)) {
    const rate = text.slice(prefix.length).trim();
    if (/^\d+$/.test(rate)) {
      return pickTemplate(
        "本阶段成功率 ≥ {rate}% 自动推进",
        "Advances automatically once the phase success rate reaches {rate}%",
        { rate },
      );
    }
  }
  return text || "—";
}

/** 计划铺到的目标总数（阶段之间不重复，按创建规则保证）。 */
export function planTargetCount(plan) {
  const targets = new Set();
  for (const phase of plan.phases) {
    for (const target of phase.targetIds) targets.add(target);
  }
  return targets.size;
}

/** 条目的汇总计数（详情页摘要条用）。 */
export function countEntries(entries) {
  const counts = {
    total: entries.length,
    pending: 0,
    dispatched: 0,
    succeeded: 0,
    failed: 0,
  };
  for (const entry of entries) {
    if (entry.status === "pending") counts.pending += 1;
    else if (entry.status === "dispatched") counts.dispatched += 1;
    else if (entry.status === "succeeded") counts.succeeded += 1;
    else if (entry.status === "failed") counts.failed += 1;
  }
  return counts;
}

/**
 * 本阶段是否**全部了结**：每个阶段内 target 都到了 succeeded / failed 终态。
 *
 * 这是「能不能推进」的前提 —— 还有 target 在飞就没出结果，不能拿半截结果判成败。
 * 入口里没有条目的 target 视为未了结。
 */
export function phaseSettled(phase, entries) {
  const byTarget = new Map(entries.map((entry) => [entry.targetId, entry]));
  return phase.targetIds.every((target) => {
    const entry = byTarget.get(target);
    return entry ? isEntrySettled(entry.status) : false;
  });
}

/** 本阶段里还在飞（dispatched）或尚未派发（pending）的 target 数。 */
export function phaseIncompleteCount(phase, entries) {
  const byTarget = new Map(entries.map((entry) => [entry.targetId, entry]));
  return phase.targetIds.filter((target) => {
    const entry = byTarget.get(target);
    return !entry || !isEntrySettled(entry.status);
  }).length;
}

/** 当前进行中的阶段（`currentPhase` 从 1 开始；越界返回 `null`）。 */
export function currentPhase(plan) {
  if (plan.currentPhase < 1 || plan.currentPhase > plan.phases.length) return null;
  return plan.phases[plan.currentPhase - 1] ?? null;
}

/**
 * 升级计划列表**默认视图**（未筛选）只展示最近这么多条。
 *
 * 列表接口按 `created_at` 倒序返回，所以「最近 N 条」就是前 N 条。计划是编排记录、只增不减，
 * 页面上铺满历史会把「刚建的那份」淹掉。收敛只作用在**未筛选**的默认视图：一旦按状态 / 时间窗
 * 筛过，就把命中的全铺出来（筛完还被裁几条会让人以为「搜不到」）。
 */
export const LATEST_PLAN_LIMIT = 5;

/** 取列表最前面的 `limit` 条（调用方保证已按时间倒序）。`limit` 为负按 0 处理。 */
export function latestPlans(plans, limit = LATEST_PLAN_LIMIT) {
  return plans.slice(0, Math.max(0, limit));
}
