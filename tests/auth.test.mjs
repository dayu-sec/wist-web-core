import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AdminApiError,
  createAdminAuth,
  isRateLimitedError,
  isUnauthorizedError,
  readAdminApiError,
} from "@dayu-sec/wist-web-core/auth";

test("createAdminAuth 必须给 key 与事件名", () => {
  assert.throws(() => createAdminAuth(), TypeError);
  assert.throws(() => createAdminAuth({ storageKey: "k" }), TypeError);
  assert.throws(() => createAdminAuth({ authChangedEvent: "e" }), TypeError);
});

test("无 window 时退化为纯内存：set / 去空白 / clear", () => {
  const auth = createAdminAuth({ storageKey: "k", authChangedEvent: "e" });
  assert.equal(auth.getAdminApiToken(), null);
  auth.setAdminApiToken("  token-1  ");
  assert.equal(auth.getAdminApiToken(), "token-1");
  auth.setAdminApiToken("   ");
  assert.equal(auth.getAdminApiToken(), null);
  auth.setAdminApiToken("token-2");
  auth.clearAdminApiToken();
  assert.equal(auth.getAdminApiToken(), null);
  assert.equal(auth.authChangedEvent, "e");
});

test("有 window 时：从 sessionStorage 读初值、写回、派发变更事件", (t) => {
  const store = new Map([["k", "initial"]]);
  const events = [];
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    dispatchEvent: (event) => {
      events.push(event.type);
      return true;
    },
  };
  t.after(() => {
    delete globalThis.window;
  });

  const auth = createAdminAuth({ storageKey: "k", authChangedEvent: "e" });
  assert.equal(auth.getAdminApiToken(), "initial");

  auth.setAdminApiToken("next");
  assert.equal(store.get("k"), "next");
  assert.deepEqual(events, ["e"]);

  auth.clearAdminApiToken();
  assert.equal(store.has("k"), false);
  assert.deepEqual(events, ["e", "e"]);
});

test("AdminApiError：字段与兜底文案", () => {
  const withDetail = new AdminApiError(422, "/x", { code: "c", detail: "坏了" });
  assert.equal(withDetail.status, 422);
  assert.equal(withDetail.path, "/x");
  assert.equal(withDetail.code, "c");
  assert.equal(withDetail.detail, "坏了");
  assert.equal(withDetail.name, "AdminApiError");
  assert.equal(withDetail.message, "HTTP 422 /x：坏了");

  const bare = new AdminApiError(500, "/x");
  assert.equal(bare.message, "HTTP 500 /x");
  assert.equal(bare.code, undefined);
  assert.equal(bare.retryAfterSeconds, undefined);
});

test("isRateLimitedError / isUnauthorizedError 只认 AdminApiError", () => {
  assert.equal(isRateLimitedError(new AdminApiError(429, "/x")), true);
  assert.equal(isRateLimitedError(new AdminApiError(401, "/x")), false);
  assert.equal(isUnauthorizedError(new AdminApiError(401, "/x")), true);
  assert.equal(isUnauthorizedError(new Error("boom")), false);
  assert.equal(isRateLimitedError("429"), false);
});

test("readAdminApiError：解信封 / 回落正文 / 截断 / 空正文 / 无正文", async () => {
  const envelope = await readAdminApiError({
    text: async () =>
      JSON.stringify({ error: { code: "package_source_unavailable", message: "来源拉不到" } }),
  });
  assert.deepEqual(envelope, {
    code: "package_source_unavailable",
    detail: "来源拉不到",
  });

  const plain = await readAdminApiError({ text: async () => "  boom  " });
  assert.deepEqual(plain, { detail: "boom" });

  const empty = await readAdminApiError({ text: async () => "   " });
  assert.deepEqual(empty, {});

  const truncated = await readAdminApiError({ text: async () => "x".repeat(400) });
  assert.equal(truncated.detail.length, 301);
  assert.equal(truncated.detail.endsWith("…"), true);

  const broken = await readAdminApiError({
    text: async () => {
      throw new Error("no body");
    },
  });
  assert.deepEqual(broken, {});
});

test("setAdminApiToken：非字符串（null / undefined）按清除处理", () => {
  delete globalThis.window; // 保证走内存分支
  const auth = createAdminAuth({ storageKey: "k", authChangedEvent: "e" });
  auth.setAdminApiToken("x");
  assert.equal(auth.getAdminApiToken(), "x");
  auth.setAdminApiToken(null);
  assert.equal(auth.getAdminApiToken(), null);
  auth.setAdminApiToken("y");
  auth.setAdminApiToken(undefined);
  assert.equal(auth.getAdminApiToken(), null);
});

test("有 window 时：两个实例（不同 key）互不干扰，各写自己的键", (t) => {
  const fake = installFakeWindow();
  t.after(fake.restore);

  const a = createAdminAuth({ storageKey: "a", authChangedEvent: "ea" });
  const b = createAdminAuth({ storageKey: "b", authChangedEvent: "eb" });

  a.setAdminApiToken("token-a");
  assert.equal(a.getAdminApiToken(), "token-a");
  assert.equal(b.getAdminApiToken(), null);
  assert.equal(fake.store.get("a"), "token-a");
  assert.equal(fake.store.has("b"), false);

  b.setAdminApiToken("token-b");
  assert.equal(a.getAdminApiToken(), "token-a");
  assert.equal(b.getAdminApiToken(), "token-b");
  assert.equal(fake.store.get("b"), "token-b");
});

test("有 window 时：set 相同值也派发变更（不去重）", (t) => {
  const fake = installFakeWindow();
  t.after(fake.restore);

  const auth = createAdminAuth({ storageKey: "k", authChangedEvent: "auth-changed" });
  auth.setAdminApiToken("same");
  auth.setAdminApiToken("same");
  assert.deepEqual(fake.events, ["auth-changed", "auth-changed"]);
});

test("AdminApiError：retryAfterSeconds / instanceof / 空 detail 回落状态码文案", () => {
  const limited = new AdminApiError(429, "/x", {
    code: "too_many_requests",
    detail: "blocked",
    retryAfterSeconds: 42,
  });
  assert.equal(limited.retryAfterSeconds, 42);
  assert.equal(limited instanceof Error, true);
  assert.equal(limited instanceof AdminApiError, true);
  assert.equal(limited.message, "HTTP 429 /x：blocked");

  const emptyDetail = new AdminApiError(500, "/x", { detail: "" });
  assert.equal(emptyDetail.detail, "");
  assert.equal(emptyDetail.message, "HTTP 500 /x");
});

test("分类器：非 AdminApiError（普通对象 / null / undefined）一律 false", () => {
  assert.equal(isRateLimitedError({ status: 429 }), false);
  assert.equal(isUnauthorizedError({ status: 401 }), false);
  assert.equal(isRateLimitedError(undefined), false);
  assert.equal(isUnauthorizedError(null), false);
});

test("readAdminApiError：信封缺字段 / 非信封 JSON 回落到正文", async () => {
  const messageOnly = await readAdminApiError({
    text: async () => JSON.stringify({ error: { message: "只有 message" } }),
  });
  assert.deepEqual(messageOnly, { code: undefined, detail: "只有 message" });

  const codeOnly = await readAdminApiError({
    text: async () => JSON.stringify({ error: { code: "only_code" } }),
  });
  assert.deepEqual(codeOnly, { code: "only_code", detail: undefined });

  // 合法 JSON 但不是信封形状 → 当纯文本用（不能因为「能 parse」就丢掉正文）
  const notEnvelope = await readAdminApiError({
    text: async () => JSON.stringify({ foo: 1 }),
  });
  assert.deepEqual(notEnvelope, { detail: '{"foo":1}' });

  // `error` 不是对象 → 同样回落正文
  const errorNotObject = await readAdminApiError({
    text: async () => JSON.stringify({ error: "boom" }),
  });
  assert.deepEqual(errorNotObject, { detail: '{"error":"boom"}' });

  // JSON 数组也不是信封
  const arrayBody = await readAdminApiError({ text: async () => "[1,2]" });
  assert.deepEqual(arrayBody, { detail: "[1,2]" });
});

test("readAdminApiError：300 字不截、301 字截（边界）", async () => {
  const atLimit = await readAdminApiError({ text: async () => "y".repeat(300) });
  assert.equal(atLimit.detail.length, 300);
  assert.equal(atLimit.detail.endsWith("…"), false);

  const overLimit = await readAdminApiError({ text: async () => "y".repeat(301) });
  assert.equal(overLimit.detail.length, 301);
  assert.equal(overLimit.detail.endsWith("…"), true);
});

/** 装一个假的 `window`（`sessionStorage` + `dispatchEvent`），返回可断言的记录与卸载函数。 */
function installFakeWindow(initial = {}) {
  const store = new Map(Object.entries(initial));
  const events = [];
  globalThis.window = {
    sessionStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    dispatchEvent: (event) => {
      events.push(event.type);
      return true;
    },
  };
  return {
    store,
    events,
    restore: () => {
      delete globalThis.window;
    },
  };
}
