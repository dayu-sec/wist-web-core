/** 状态分页：成功 = 计划的 `completed`，进行中 = `rolling`，失败 = `failed`。 */
export type PlanStatusFilter = "all" | "rolling" | "succeeded" | "failed";

/** 时间窗：按**本地日历**切（周一为一周之始），不是「最近 N 天」。 */
export type PlanTimeRange = "all" | "this_week" | "last_week" | "this_month";

/** 状态分页的可选项（值 + 文案）。 */
export declare const PLAN_STATUS_FILTERS: readonly {
  value: PlanStatusFilter;
  label: string;
}[];

/** 时间窗的可选项（值 + 文案）。 */
export declare const PLAN_TIME_RANGES: readonly {
  value: PlanTimeRange;
  label: string;
}[];

/** 某个计划状态是否落在选中的状态分页里（`all` 恒真）。 */
export declare function matchesPlanStatus(
  status: string,
  filter: PlanStatusFilter,
): boolean;

/** 一周之始（周一 00:00，本地时区）。 */
export declare function startOfWeek(date: Date): Date;

/** 时间窗的 `[起, 止)`（本地时区）；`all` 返回 `null`。 */
export declare function timeRangeBounds(
  range: PlanTimeRange,
  now: Date,
): { start: Date; end: Date } | null;

/** `createdAt`（RFC3339）是否落在时间窗内；认不出的时间戳恒为 `false`。 */
export declare function matchesPlanTimeRange(
  createdAt: string,
  range: PlanTimeRange,
  now: Date,
): boolean;

/** 状态 + 时间窗一起筛。 */
export declare function filterRolloutPlans<
  T extends { status: string; createdAt: string },
>(
  plans: readonly T[],
  filters: { status: PlanStatusFilter; timeRange: PlanTimeRange },
  now: Date,
): T[];
