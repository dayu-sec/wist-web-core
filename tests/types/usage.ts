/**
 * 类型自洽检查（`npm run check-types`）：用两个 app 里那种**形状**的对象喂公开 API，
 * 验证手写的 `.d.ts` 既能接住结构化的输入，又能给出正确的返回类型。
 *
 * 本文件不运行，只被 tsc 读取（见 `tsconfig.json` 的 include）。
 */
import {
  PHASE_COUNTS,
  advanceRuleLabel,
  availablePhaseCounts,
  countEntries,
  currentPhase,
  entryStatusLabel,
  filterRolloutPlans,
  latestPlans,
  phaseIncompleteCount,
  phaseScaleLabel,
  phaseSettled,
  planPhases,
  planStatusLabel,
  planStatusTone,
  planTargetCount,
  versionFromArtifactUrl,
  type AssignedPhase,
  type PhasePlan,
  type PlanStatusFilter,
  type PlanTimeRange,
  type RolloutCounts,
  type RolloutTone,
} from "../../src/index.js";

// 各 app 自己的视图类型（这里给出最小形状，验证结构化输入能被接住）。
interface PhaseView {
  targetIds: string[];
  status: string;
}
interface EntryView {
  targetId: string;
  status: string;
}
interface PlanView {
  currentPhase: number;
  phases: PhaseView[];
  status: string;
  createdAt: string;
}

export function exerciseTypes(
  plan: PlanView,
  entries: EntryView[],
  now: Date,
): {
  phaseCounts: number[];
  planResult: PhasePlan;
  scale: string;
  settled: boolean;
  incomplete: number;
  current: PhaseView | null;
  tally: RolloutCounts;
  targets: number;
  tone: RolloutTone;
  rule: string;
  newest: PlanView[];
  filtered: PlanView[];
  version: string;
} {
  const phaseCounts: number[] = availablePhaseCounts(plan.phases.length);
  const presets: readonly number[] = PHASE_COUNTS;
  void presets;

  const planResult: PhasePlan = planPhases(plan.phases[0].targetIds, 2);
  const first: AssignedPhase | undefined = planResult.phases[0];
  const scale: string = first ? phaseScaleLabel(first) : "";

  const settled: boolean = phaseSettled(plan.phases[0], entries);
  const incomplete: number = phaseIncompleteCount(plan.phases[0], entries);
  const current: PhaseView | null = currentPhase(plan);

  const tally: RolloutCounts = countEntries(entries);
  const targets: number = planTargetCount(plan);

  const tone: RolloutTone = planStatusTone(plan.status);
  const rule: string = advanceRuleLabel("success_rate:80", true);
  const labels: string = planStatusLabel(plan.status) + entryStatusLabel("dispatched");
  void labels;

  const newest: PlanView[] = latestPlans<PlanView>([plan]);
  const filters: { status: PlanStatusFilter; timeRange: PlanTimeRange } = {
    status: "all",
    timeRange: "this_week",
  };
  const filtered: PlanView[] = filterRolloutPlans([plan], filters, now);

  const version: string = versionFromArtifactUrl(
    "https://x.example/pkg-1.2.3.tar.gz",
  );

  return {
    phaseCounts,
    planResult,
    scale,
    settled,
    incomplete,
    current,
    tally,
    targets,
    tone,
    rule,
    newest,
    filtered,
    version,
  };
}
