/** 中间切点的覆盖口径：固定台数，或占目标总量的百分比。 */
export type CoverageCut =
  | { kind: "count"; value: number }
  | { kind: "percent"; value: number };

/** 可选的阶段数：阶梯最多 4 个中间切点 + 一级「剩余」= 5 阶段。 */
export declare const PHASE_COUNTS: readonly number[];

/** 目标台数**能支持**的阶段数（≤ 台数的预设；一个目标时 `[1]`；空目标 `[]`）。 */
export declare function availablePhaseCounts(total: number): number[];

/** 一个已分配的阶段。 */
export interface AssignedPhase {
  /** 从 1 开始。 */
  index: number;
  /** 本阶段的目标 id（互不重叠，取自排序后的目标）。 */
  targetIds: string[];
  /** 目标覆盖比例（**阶梯口径**，0..1）；金丝雀段为 `null`。 */
  coverage: number | null;
  /** 金丝雀段（首段且恰好 1 个）。 */
  isCanary: boolean;
  /** 收尾段（覆盖到全量）。 */
  isFinal: boolean;
}

/** 切阶段的结果；`error` 非空时 `phases` 为空。 */
export interface PhasePlan {
  phases: AssignedPhase[];
  /** 分不出来时的原因（空目标 / 分段数大于台数）；`null` = 可分。 */
  error: string | null;
}

/** 把目标切成 `phaseCount` 个互不重叠的阶段（顺序取排序后的 id）。 */
export declare function planPhases(
  targetIds: readonly string[],
  phaseCount: number,
): PhasePlan;

/** 阶段的规模文字：金丝雀读「1 个」，其余读「覆盖 ~X%」。 */
export declare function phaseScaleLabel(phase: AssignedPhase): string;
