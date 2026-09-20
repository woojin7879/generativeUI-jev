import assert from "node:assert/strict";
const url = process.env.TEST_URL || "http://localhost:3004";
const cases = [
  [
    "오늘 점심 뭐 나와?",
    null,
    { service: "meals", meal: "lunch", scope: "day" },
  ],
  [
    "아침부터 저녁까지 다 보여줘",
    "previous",
    { service: "meals", meal: "all" },
  ],
  ["이번 주 일정 알려줘", null, { service: "schedule", scope: "week" }],
  ["내일은?", "previous", { service: "schedule", scope: "day" }],
  ["오늘 날씨 알려줘", null, { service: "weather", metric: "all" }],
  ["습도만 볼래", "previous", { service: "weather", metric: "humidity" }],
  [
    "오늘 점심이랑 일정 같이 보여줘",
    null,
    { service: "meals", secondary: "schedule" },
  ],
  [
    "금요일 오후 반차 쓰고 싶어",
    null,
    {
      service: "leave",
      leaveKind: "pm",
      leaveView: "apply",
      date: "2026-09-25",
    },
  ],
  ["내 연차 얼마나 남았어?", null, { service: "leave", leaveView: "balance" }],
  ["내일 회의실 예약하고 싶어", null, { service: "rooms" }],
  ["최근 사내 공지 보여줘", null, { service: "notices" }],
  ["파이썬으로 정렬 함수 만들어줘", null, { service: "llm" }],
  ["습도가 높으면 왜 더 덥게 느껴지는지 설명해줘", null, { service: "llm" }],
];
const health = await (await fetch(url + "/api/health")).json();
const friday = new Date(health.today + "T12:00:00Z");
friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7));
cases.find((c) => c[0].startsWith("금요일"))[2].date = friday
  .toISOString()
  .slice(0, 10);
let previous,
  failed = 0;
for (const [message, context, expected] of cases) {
  const res = await fetch(url + "/api/interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context: context ? previous : undefined }),
  });
  const data = await res.json();
  try {
    assert.equal(res.status, 200, JSON.stringify(data));
    if (expected.secondary) {
      assert.deepEqual(
        new Set([data.decision.service, data.decision.secondary]),
        new Set([expected.service, expected.secondary]),
      );
    } else {
      for (const [key, value] of Object.entries(expected))
        assert.equal(data.decision[key], value, key);
      assert.equal(data.decision.secondary, "none", "no unrelated extra card");
    }
    previous = data.decision;
    console.log(
      "PASS",
      message,
      JSON.stringify(data.decision),
      data.trace.latencyMs + "ms",
    );
  } catch (e) {
    failed++;
    console.error("FAIL", message, e.message, JSON.stringify(data.decision));
  }
}
if (failed) process.exitCode = 1;
