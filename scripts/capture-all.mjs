import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9555;
const PROFILE_DIR = `/tmp/chrome-capture-all-${Date.now()}`;
const OUTPUT_DIR = "docs/screenshots";

const tasks = [
  {
    name: "00_main_dashboard.png",
    title: "메인 대시보드 (초기 홈 화면)",
    url: "http://localhost:3004/?preview=home",
    waitFor: ".welcome",
    scroll: 0,
  },
  {
    name: "01_meal_lunch.png",
    title: "구내식당 - 오늘 점심 메뉴 (MealSingleCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 점심 뭐 나와?"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "02_meal_dinner.png",
    title: "구내식당 - 오늘 저녁 메뉴 (MealSingleCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 저녁 메뉴 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "03_meal_day_all.png",
    title: "구내식당 - 하루 전체 식단 (MealDayCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("점심 말고 전체 메뉴 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "04_meal_week.png",
    title: "구내식당 - 이번 주 식단 (MealWeekCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("이번 주 식단 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "05_schedule_today.png",
    title: "나의 일정 - 오늘 타임라인 (ScheduleDayCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 일정 보여줘"),
    waitFor: ".card-shell",
    action: async (call) => {
      // Expand first event for rich detail
      await call("Runtime.evaluate", {
        expression: 'document.querySelector(".event-item button")?.click()',
      });
      await new Promise((r) => setTimeout(r, 200));
    },
    scroll: 0,
  },
  {
    name: "06_schedule_week.png",
    title: "나의 일정 - 이번 주 전체 일정 (ScheduleWeekCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("이번 주 전체 일정 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "07_weather_today.png",
    title: "날씨 - 오늘 날씨 종합 (WeatherOverviewCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 날씨 알려줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "08_weather_metric.png",
    title: "날씨 - 습도 단일 지표 (WeatherMetricCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 습도만 알려줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "09_weather_week.png",
    title: "날씨 - 이번 주 예보 (WeatherWeekCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("이번 주 날씨 알려줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "10_leave_application.png",
    title: "휴가 관리 - 휴가 신청 폼 (LeaveApplicationCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("금요일 오후 반차 쓰고 싶어"),
    waitFor: ".card-shell",
    action: async (call) => {
      // Pre-fill a sample reason in the textarea
      await call("Runtime.evaluate", {
        expression: `
          const ta = document.querySelector(".leave-form textarea");
          if (ta) {
            ta.value = "개인 용무 및 병원 진료로 반차 신청합니다.";
            ta.dispatchEvent(new Event("input", { bubbles: true }));
          }
        `,
      });
      await new Promise((r) => setTimeout(r, 200));
    },
    scroll: 0,
  },
  {
    name: "11_leave_balance.png",
    title: "휴가 관리 - 잔여 연차 조회 (LeaveBalanceCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("내 연차 얼마나 남았어?"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "12_leave_history.png",
    title: "휴가 관리 - 신청 내역 및 취소 (LeaveHistoryCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("휴가 신청 내역 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "13_room_booking.png",
    title: "회의실 예약 (RoomBookingCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("내일 회의실 예약하고 싶어"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "14_notices.png",
    title: "사내 공지 (NoticeListCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("최근 사내 공지 보여줘"),
    waitFor: ".card-shell",
    action: async (call) => {
      // Expand first notice
      await call("Runtime.evaluate", {
        expression: 'document.querySelector(".notice-item button")?.click()',
      });
      await new Promise((r) => setTimeout(r, 200));
    },
    scroll: 0,
  },
  {
    name: "15_llm_handoff.png",
    title: "업무 외 질문 라우팅 (LLMHandoffCard)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("파이썬으로 정렬 함수 만들어줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "16_composite_portal.png",
    title: "복합 업무 요청 조합 (PortalStack)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 점심이랑 일정 같이 보여줘"),
    waitFor: ".card-shell",
    scroll: 0,
  },
  {
    name: "17_trace_inspector.png",
    title: "요청 처리 과정 인스펙터 (Trace Inspector)",
    url: "http://localhost:3004/?q=" + encodeURIComponent("오늘 점심 뭐 나와?"),
    waitFor: ".card-shell",
    action: async (call) => {
      await call("Runtime.evaluate", {
        expression: 'document.querySelector(".response-meta button")?.click()',
      });
      await new Promise((r) => setTimeout(r, 600));
    },
    scroll: 0,
  },
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Starting Chrome CDP batch runner for ${tasks.length} screenshots...`);

  for (let i = 0; i < tasks.length; i++) {
    const item = tasks[i];
    console.log(`[${i + 1}/${tasks.length}] Capturing ${item.name} (${item.title})...`);

    const chrome = spawn(CHROME_PATH, [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--window-size=1280,980",
      `--user-data-dir=${PROFILE_DIR}`,
      item.url,
    ]);

    try {
      let target = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 150));
        try {
          const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
          const tabs = await r.json();
          target = tabs.find((t) => t.type === "page");
          if (target) break;
        } catch {}
      }

      if (!target) throw new Error(`Target page not found for ${item.name}`);

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((res) => ws.addEventListener("open", res));

      let msgId = 1;
      const callbacks = new Map();
      ws.addEventListener("message", (e) => {
        const d = JSON.parse(e.data);
        if (d.id && callbacks.has(d.id)) {
          callbacks.get(d.id)(d);
          callbacks.delete(d.id);
        }
      });

      const call = (method, params = {}) =>
        new Promise((resolve, reject) => {
          const id = msgId++;
          callbacks.set(id, (res) =>
            res.error ? reject(res.error) : resolve(res.result),
          );
          ws.send(JSON.stringify({ id, method, params }));
        });

      await call("Page.enable");

      // Wait for target element
      for (let check = 0; check < 50; check++) {
        const res = await call("Runtime.evaluate", {
          expression: `!!document.querySelector("${item.waitFor}")`,
        });
        if (res.result?.value) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      if (item.action) {
        await item.action(call);
      }

      // Expand layout dynamically so nothing is cut off
      await call("Runtime.evaluate", {
        expression: `
          const app = document.querySelector(".app");
          if (app) {
            app.style.height = "auto";
            app.style.minHeight = "100vh";
          }
          const sidebar = document.querySelector(".sidebar");
          if (sidebar) sidebar.style.minHeight = "100%";
          const mainShell = document.querySelector(".main-shell");
          if (mainShell) mainShell.style.height = "auto";
          const conv = document.querySelector(".conversation");
          if (conv) {
            conv.style.overflow = "visible";
            conv.style.height = "auto";
            conv.scrollTop = 0;
          }
          const insp = document.querySelector(".inspector");
          if (insp) {
            insp.style.position = "absolute";
            insp.style.height = "auto";
            insp.style.minHeight = "100%";
            insp.style.overflow = "visible";
          }
          const back = document.querySelector(".inspector-backdrop");
          if (back) {
            back.style.position = "absolute";
            back.style.height = "100%";
          }
        `,
      });

      // Calculate total required height including composer and footnote
      const hEval = await call("Runtime.evaluate", {
        expression: `
          Math.max(
            1000,
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            (document.querySelector(".main-shell")?.scrollHeight || 0) + 50,
            (document.querySelector(".inspector")?.scrollHeight || 0) + 50,
            (document.querySelector(".card-shell")?.getBoundingClientRect().bottom || 0) + 320
          )
        `,
      });
      const totalH = Math.ceil(hEval.result?.value || 1100) + 40;

      await call("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: totalH,
        deviceScaleFactor: 1,
        mobile: false,
      });

      // Small stabilization pause
      await new Promise((r) => setTimeout(r, 400));

      const snap = await call("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const outPath = path.join(OUTPUT_DIR, item.name);
      fs.writeFileSync(outPath, Buffer.from(snap.data, "base64"));

      ws.close();
    } catch (err) {
      console.error(`Error capturing ${item.name}:`, err.message);
    } finally {
      chrome.kill("SIGKILL");
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  try {
    fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  } catch {}

  console.log("All screenshots captured successfully!");
}

main().catch(console.error);
