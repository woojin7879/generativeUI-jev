import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { interpret } from "./jev.js";
import { makeSpec, decisionSchema, todayISO, rooms } from "./domain.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env"), quiet: true });
// Reuse the existing workspace's TypeSafe credential without exposing it to the browser.
if (!process.env.JEV_KEY && !process.env.TYPESAFE_API_KEY) {
  for (const dir of [
    "project3-vibe-radar",
    "project2-smart-sidekick",
    "project1",
  ]) {
    const file = path.resolve(root, "..", dir, ".env");
    if (fs.existsSync(file)) {
      const env = dotenv.parse(fs.readFileSync(file));
      if (env.JEV_KEY || env.TYPESAFE_API_KEY) {
        process.env.JEV_KEY = env.JEV_KEY || env.TYPESAFE_API_KEY;
        break;
      }
    }
  }
}
const key = process.env.JEV_KEY || process.env.TYPESAFE_API_KEY;
const dbFile = path.join(
  process.env.DEMO_DATA_DIR || path.join(root, ".data"),
  "demo.json",
);
let db = { leave: [], reservations: [] };
if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch {
    console.error("Demo data could not be read; starting empty.");
  }
}
function save() {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  fs.writeFileSync(dbFile + ".tmp", JSON.stringify(db, null, 2));
  fs.renameSync(dbFile + ".tmp", dbFile);
}
const app = express();
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_, res) =>
  res.json({
    ready: !!key,
    model: process.env.JEV_MODEL || "jev-latest",
    today: todayISO(),
    demo: true,
  }),
);
app.post("/api/interpret", async (req, res, next) => {
  const start = performance.now();
  try {
    const input = z
      .object({
        message: z.string().trim().min(1).max(2000),
        context: decisionSchema.partial().optional(),
      })
      .parse(req.body);
    const result = await interpret(
      input.message,
      input.context,
      key,
      process.env.JEV_MODEL,
    );
    const spec = makeSpec(result.decision, db);
    result.trace.serverMs = performance.now() - start;
    res.json({ ...result, spec });
  } catch (e) {
    next(e);
  }
});
app.post("/api/view", (req, res, next) => {
  try {
    const decision = decisionSchema.parse(req.body);
    res.json({
      decision,
      spec: makeSpec(decision, db),
      trace: { engine: "direct", latencyMs: 0, cost: { usd: 0, krw: 0 } },
    });
  } catch (e) {
    next(e);
  }
});
const iso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(s + "T12:00:00Z");
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === s
    );
  }, "유효한 날짜를 선택해 주세요.");
app.post("/api/leave", (req, res, next) => {
  try {
    const input = z
      .object({
        date: iso,
        kind: z.enum(["full", "am", "pm"]),
        reason: z.string().trim().min(1).max(300),
        requestId: z.string().min(1).max(100),
      })
      .parse(req.body);
    const old = db.leave.find((r) => r.id === input.requestId);
    if (old) return res.json(old);
    if (input.date < todayISO())
      return res.status(400).json({ error: "지난 날짜에는 신청할 수 없어요." });
    if ([0, 6].includes(new Date(input.date + "T12:00:00Z").getUTCDay()))
      return res.status(400).json({ error: "휴가는 평일에 신청해 주세요." });
    if (
      db.leave.some(
        (r) =>
          r.date === input.date &&
          r.status !== "취소됨" &&
          (r.kind === input.kind || r.kind === "full" || input.kind === "full"),
      )
    )
      return res
        .status(409)
        .json({ error: "해당 시간에 신청된 휴가가 있어요." });
    const days = input.kind === "full" ? 1 : 0.5,
      used = db.leave
        .filter((r) => r.status !== "취소됨")
        .reduce((s, r) => s + r.days, 0);
    if (used + days > 15)
      return res.status(400).json({ error: "잔여 연차가 부족해요." });
    const record = {
      id: input.requestId,
      date: input.date,
      kind: input.kind,
      reason: input.reason,
      days,
      status: "승인 대기",
      createdAt: new Date().toISOString(),
    };
    db.leave.push(record);
    save();
    res.json(record);
  } catch (e) {
    next(e);
  }
});
app.post("/api/leave/:id/cancel", (req, res) => {
  const record = db.leave.find((r) => r.id === req.params.id);
  if (!record)
    return res.status(404).json({ error: "신청 내역을 찾을 수 없어요." });
  record.status = "취소됨";
  save();
  res.json(record);
});
app.post("/api/rooms", (req, res, next) => {
  try {
    const input = z
      .object({
        roomId: z.enum(rooms.map((r) => r.id)),
        date: iso,
        time: z.enum([
          "09:00",
          "10:00",
          "11:00",
          "13:00",
          "14:00",
          "15:00",
          "16:00",
          "17:00",
        ]),
        requestId: z.string().min(1).max(100),
      })
      .parse(req.body);
    const old = db.reservations.find((r) => r.id === input.requestId);
    if (old) return res.json(old);
    if (input.date < todayISO())
      return res.status(400).json({ error: "지난 날짜에는 예약할 수 없어요." });
    if (
      db.reservations.some(
        (r) =>
          r.roomId === input.roomId &&
          r.date === input.date &&
          r.time === input.time,
      )
    )
      return res
        .status(409)
        .json({ error: "이미 예약된 시간이에요. 다른 시간을 선택해 주세요." });
    const record = { ...input, id: input.requestId };
    db.reservations.push(record);
    save();
    res.json(record);
  } catch (e) {
    next(e);
  }
});
app.post("/api/rooms/:id/cancel", (req, res) => {
  const found = db.reservations.find((r) => r.id === req.params.id);
  if (!found) return res.status(404).json({ error: "예약을 찾을 수 없어요." });
  db.reservations = db.reservations.filter((r) => r.id !== req.params.id);
  save();
  res.json({ ok: true });
});
app.use("/api", (_, res) =>
  res.status(404).json({ error: "지원하지 않는 API입니다." }),
);
app.use((err, req, res, next) => {
  const status = err instanceof z.ZodError ? 400 : err.status || 500;
  res.status(status).json({
    error:
      err instanceof z.ZodError
        ? "입력값을 확인해 주세요."
        : status === 500
          ? "요청을 처리하지 못했어요. 다시 시도해 주세요."
          : err.message,
  });
});
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3004);
app.listen(port, "127.0.0.1", () =>
  console.log(
    `MOA workplace → http://localhost:${port} · Jev ${key ? "configured" : "not configured"}`,
  ),
);
