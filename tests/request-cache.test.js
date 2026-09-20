import test from "node:test";
import assert from "node:assert/strict";
import { createRequestCache } from "../server/request-cache.js";
test("concurrent and completed request replays call the model only once", async () => {
  const once = createRequestCache();
  let calls = 0;
  const run = async () => {
    calls++;
    return { result: "ok" };
  };
  const results = await Promise.all([
    once("a", { text: "lunch" }, run),
    once("a", { text: "lunch" }, run),
  ]);
  assert.deepEqual(results[0], results[1]);
  await once("a", { text: "lunch" }, run);
  assert.equal(calls, 1);
  assert.throws(() => once("a", { text: "dinner" }, run), { status: 409 });
  await once("b", { text: "lunch" }, run);
  assert.equal(calls, 2);
});
test("failed requests are not silently replayed and completed entries expire", async () => {
  let time = 0,
    calls = 0;
  const once = createRequestCache({ ttlMs: 10, now: () => time });
  const fail = () => {
    calls++;
    throw new Error("unavailable");
  };
  await assert.rejects(once("a", {}, fail));
  await assert.rejects(once("a", {}, fail));
  assert.equal(calls, 1);
  time = 11;
  await assert.rejects(once("a", {}, fail));
  assert.equal(calls, 2);
});
