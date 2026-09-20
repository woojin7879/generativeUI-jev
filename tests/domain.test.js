import test from "node:test";
import assert from "node:assert/strict";
import {
  datesFor,
  makeSpec,
  mealsFor,
  decisionSchema,
  eventsFor,
} from "../server/domain.js";
import { buildQuestions, interpret } from "../server/jev.js";
const base = {
  service: "meals",
  date: "2026-09-21",
  scope: "day",
  meal: "lunch",
  metric: "all",
  leaveView: "apply",
  leaveKind: "full",
  secondary: "none",
};
test("week boundaries remain correct on Sunday and across months", () => {
  assert.deepEqual(datesFor({ ...base, date: "2026-09-27", scope: "week" }), [
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ]);
  assert.equal(
    datesFor({ ...base, date: "2026-09-27", scope: "nextweek" }).at(-1),
    "2026-10-04",
  );
});
test("single meal vs all meals and multi-card specs", () => {
  assert.equal(mealsFor(base.date, "all").length, 3);
  assert.equal(mealsFor(base.date, "lunch")[0].id, "lunch");
  const spec = makeSpec(
    { ...base, secondary: "schedule" },
    { leave: [], reservations: [] },
  );
  assert.deepEqual(spec.elements.root.children, ["meals", "schedule"]);
  assert.equal(spec.elements.meals.props.days[0].meals.length, 1);
});
test("LLM routing cannot leak a second portal action", () => {
  const spec = makeSpec(
    { ...base, service: "llm", secondary: "leave" },
    { leave: [], reservations: [] },
  );
  assert.deepEqual(spec.elements.root.children, ["llm"]);
});
test("cancelled leave restores balance and pending half days are reserved", () => {
  const spec = makeSpec(
    { ...base, service: "leave" },
    {
      leave: [
        { days: 1, status: "취소됨" },
        { days: 0.5, status: "승인 대기" },
      ],
      reservations: [],
    },
  );
  assert.equal(spec.elements.leave.props.balance, 14.5);
});
test("weekend calendar is honestly empty and unknown choices rejected", () => {
  assert.equal(eventsFor("2026-09-27").length, 0);
  assert.throws(() =>
    decisionSchema.parse({ ...base, service: "execute_sql" }),
  );
});
test("date candidate pool covers today and future dates; no key means no fake semantic response", async () => {
  const q = buildQuestions(base.date);
  assert.ok(q.date.criteria["2026-09-21"]);
  assert.ok(q.date.criteria["2026-11-20"]);
  await assert.rejects(() => interpret("점심 메뉴", {}, null), /JEV_KEY/);
});
