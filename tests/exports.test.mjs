import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * `exports` 映射的运行时自检：Node 的「按包名自引用」会走 package.json 的 `exports`，
 * 所以这一条能证明消费方 `import "@dayu-sec/wist-web-core"` 真的解析得到（子路径同理）。
 */
test("按包名与其子路径都能解析到", async () => {
  const root = await import("@dayu-sec/wist-web-core");
  const release = await import("@dayu-sec/wist-web-core/release");
  const artifact = await import("@dayu-sec/wist-web-core/artifact");

  assert.equal(typeof root.planPhases, "function");
  assert.equal(typeof root.versionFromArtifactUrl, "function");
  assert.equal(typeof release.planPhases, "function");
  assert.equal(typeof release.filterRolloutPlans, "function");
  assert.equal(typeof artifact.versionFromArtifactUrl, "function");
});
