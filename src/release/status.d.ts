/** 与全局设计变量同一套语气。 */
export type RolloutTone = "ok" | "warn" | "crit" | "unknown";

/** 只要形状对得上就能喂进来：阶段只需 `targetIds`。 */
export interface PhaseLike {
  readonly targetIds: readonly string[];
}

/** 逐目标条目：`targetId` + `status`。 */
export interface EntryLike {
  readonly targetId: string;
  readonly status: string;
}

/** 计划：`currentPhase`（从 1 起）+ 阶段数组。 */
export interface PlanLike<TPhase extends PhaseLike = PhaseLike> {
  readonly currentPhase: number;
  readonly phases: readonly TPhase[];
}

/** 计划整体状态（模型 `RolloutPlan.status`）。 */
export declare const PLAN_STATUS_LABEL: Record<string, string>;
export declare function planStatusLabel(status: string): string;
export declare function planStatusTone(status: string): RolloutTone;

/** 阶段状态（模型 `RolloutPhase.status`）。 */
export declare const PHASE_STATUS_LABEL: Record<string, string>;
export declare function phaseStatusLabel(status: string): string;
export declare function phaseStatusTone(status: string): RolloutTone;

/** 逐目标条目状态。 */
export declare const ENTRY_STATUS_LABEL: Record<string, string>;
export declare function entryStatusLabel(status: string): string;
export declare function entryStatusTone(status: string): RolloutTone;

/** 条目是否已了结（成功 / 失败）。 */
export declare function isEntrySettled(status: string): boolean;

/** 推进闸门的可读写法；`isLastPhase` 时说明「末阶段自动收尾」。 */
export declare function advanceRuleLabel(rule: string, isLastPhase?: boolean): string;

/** 计划铺到的目标总数（阶段之间不重复）。 */
export declare function planTargetCount(plan: {
  readonly phases: readonly PhaseLike[];
}): number;

/** 条目的汇总计数。 */
export interface RolloutCounts {
  total: number;
  pending: number;
  dispatched: number;
  succeeded: number;
  failed: number;
}
export declare function countEntries(
  entries: readonly EntryLike[],
): RolloutCounts;

/** 本阶段是否全部了结（每个 target 都到终态；缺条目的视为未了结）。 */
export declare function phaseSettled(
  phase: PhaseLike,
  entries: readonly EntryLike[],
): boolean;

/** 本阶段里还在飞或尚未派发的 target 数。 */
export declare function phaseIncompleteCount(
  phase: PhaseLike,
  entries: readonly EntryLike[],
): number;

/** 当前进行中的阶段（越界返回 `null`）。 */
export declare function currentPhase<TPhase extends PhaseLike>(
  plan: PlanLike<TPhase>,
): TPhase | null;

/** 默认视图只展示最近这么多条。 */
export declare const LATEST_PLAN_LIMIT: number;
export declare function latestPlans<T>(plans: readonly T[], limit?: number): T[];
