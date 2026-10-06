import assert from "node:assert/strict";
import { test } from "node:test";

import { versionFromArtifactUrl } from "../src/artifact/version.js";

test("从真实发布地址里取版本（含预发布后缀）", () => {
  const cases = [
    [
      "https://github.com/galaxio-labs/galaxy-flow/releases/download/v0.16.1-alpha/galaxy-flow-v0.16.1-alpha-x86_64-unknown-linux-musl.tar.gz",
      "v0.16.1-alpha",
    ],
    [
      "https://github.com/dayu-sec/wist-gwlinkd/releases/download/v0.5.2-alpha/wist-gwlinkd-v0.5.2-alpha-aarch64-apple-darwin.tar.gz",
      "v0.5.2-alpha",
    ],
    [
      "https://center.example/api/v1/releases/artifact/warp-gateway/0.1.27/warp-gateway-0.1.27.tar.gz",
      "0.1.27",
    ],
    ["/var/pkg/wist-agentd-0.1.34.bin", "0.1.34"],
  ];
  for (const [source, expected] of cases) {
    assert.equal(versionFromArtifactUrl(source), expected, source);
  }
});

test("查询串与片段先剥掉", () => {
  assert.equal(
    versionFromArtifactUrl("https://x.example/pkgs/warp-gateway-1.2.tar.gz?token=abc#frag"),
    "1.2",
  );
});

test("读不出时返回空串（调用方据此显示未识别）", () => {
  assert.equal(versionFromArtifactUrl("no-version-here.tar.gz"), "");
  assert.equal(versionFromArtifactUrl(""), "");
  assert.equal(versionFromArtifactUrl("https://x.example/"), "");
});

test("只截掉已知架构后缀，且不从首段认架构", () => {
  // `arm` 是已知架构，但它出现在**首段**时不截（否则会把包名当成架构）。
  assert.equal(versionFromArtifactUrl("arm-tool-2.0.0.tar.gz"), "2.0.0");
  assert.equal(
    versionFromArtifactUrl("wist-gateway-stack-v0.1.25-x86_64-unknown-linux-gnu.tar.gz"),
    "v0.1.25",
  );
});
