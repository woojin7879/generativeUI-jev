import assert from "node:assert/strict";
import fs from "node:fs";
import { cases } from "./semantic-cases.js";
const url = process.env.TEST_URL || "http://localhost:3004";
const { today } = await (await fetch(url + "/api/health")).json();
const results = [];
for (const [message, context, expected, component] of cases) {
  const res = await fetch(url + "/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      context: context ? { ...context, date: today } : undefined,
    }),
  });
  const data = await res.json();
  let error;
  try {
    assert.equal(res.status, 200, JSON.stringify(data));
    for (const [key, val] of Object.entries(expected))
      assert.equal(data.decision[key], val, key);
    assert.equal(data.decision.secondary, "none");
    const element = data.spec.elements[expected.service];
    assert.equal(element.type, component, "rendered component");
    if (expected.meal && expected.meal !== "all")
      assert.ok(
        element.props.days.every((day) =>
          day.meals.every((m) => m.id === expected.meal),
        ),
        "wrong meal data",
      );
    if (expected.leaveView)
      assert.equal(element.props.decision.leaveView, expected.leaveView);
  } catch (e) {
    error = e.message;
  }
  results.push({
    message,
    context: context ? { ...context, date: today } : null,
    expected,
    expectedComponent: component,
    actual: data.decision,
    component: data.spec?.elements?.[data.decision?.service]?.type,
    latencyMs: data.trace?.latencyMs,
    passed: !error,
    ...(error ? { error } : {}),
  });
  console.log(
    error ? "FAIL" : "PASS",
    message,
    JSON.stringify(data.decision),
    error || component,
  );
}
fs.writeFileSync(
  new URL("./semantic-report.json", import.meta.url),
  JSON.stringify(
    {
      date: new Date().toISOString(),
      passed: results.filter((r) => r.passed).length,
      total: results.length,
      results,
    },
    null,
    2,
  ),
);
if (results.some((r) => !r.passed)) process.exitCode = 1;
