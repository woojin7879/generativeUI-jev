import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { todayISO, addDays } from "../server/domain.js";
test("demo actions validate, reserve balances, reject duplicates, and cancel", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "moa-test-"));
  const port = 31000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["server/index.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "production",
      JEV_NETWORK_PROBE: "0",
      DEMO_DATA_DIR: dir,
    },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  const post = async (endpoint, body) => {
    const r = await fetch(url + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch(url + "/api/health")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    let date = addDays(todayISO(), 1);
    while ([0, 6].includes(new Date(date + "T12:00:00Z").getUTCDay()))
      date = addDays(date, 1);
    const body = {
      date,
      kind: "pm",
      reason: "Automated demo test",
      requestId: "test-leave",
    };
    assert.equal(
      (await post("/api/leave", { ...body, date: "2026-02-31" })).status,
      400,
    );
    assert.equal((await post("/api/leave", body)).status, 200);
    assert.equal((await post("/api/leave", body)).status, 200); // idempotent retry
    assert.equal(
      (await post("/api/leave", { ...body, requestId: "overlap" })).status,
      409,
    );
    let view = await post("/api/view", { service: "leave", date });
    assert.equal(view.data.spec.elements.leave.props.balance, 14.5);
    assert.equal((await post("/api/leave/test-leave/cancel", {})).status, 200);
    view = await post("/api/view", { service: "leave", date });
    assert.equal(view.data.spec.elements.leave.props.balance, 15);
    const booking = {
      roomId: "orion",
      date,
      time: "10:00",
      requestId: "room-test",
    };
    assert.equal((await post("/api/rooms", booking)).status, 200);
    assert.equal(
      (await post("/api/rooms", { ...booking, requestId: "other" })).status,
      409,
    );
    assert.equal((await post("/api/rooms/room-test/cancel", {})).status, 200);
    assert.equal(
      (await post("/api/rooms", { ...booking, requestId: "rebook" })).status,
      200,
    );
    assert.equal(
      (await post("/api/view", { service: "weather", date: "2026-02-31" }))
        .status,
      400,
    );
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
