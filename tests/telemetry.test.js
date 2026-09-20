import test from "node:test";
import assert from "node:assert/strict";
import { estimateCost } from "../server/telemetry.js";
test("cost uses input tokens only and does not fabricate prices for unknown models or missing usage", () => {
  const cost = estimateCost(
    { input_tokens: 1_000_000, output_tokens: 100 },
    "jev-1.13.0",
  );
  assert.equal(cost.usd, 0.042);
  assert.equal(cost.krw, 0.042 * 1388.1);
  assert.equal(estimateCost({}, "jev-1.13.0").usd, null);
  assert.equal(estimateCost({ input_tokens: 100 }, "new-model").usd, null);
  assert.equal(estimateCost({ input_tokens: 0 }, "jev-1.13.0").usd, 0);
});

import { splitTiming } from "../server/network-baseline.js";
test("auth baseline subtraction is explicit, expires, and rejects negative processing estimates", () => {
  const now = Date.now();
  const baseline = { ms: 200, measuredAt: new Date(now).toISOString() };
  assert.equal(splitTiming(350, baseline, now).processingMs, 150);
  assert.equal(splitTiming(150, baseline, now).processingMs, null);
  assert.equal(
    splitTiming(150, baseline, now).status,
    "baseline-exceeds-request",
  );
  assert.equal(splitTiming(350, baseline, now + 300001), null);
  assert.equal(splitTiming(350, null, now), null);
});
