import { refreshNetworkBaseline, splitTiming } from "./network-baseline.js";
import { estimateCost } from "./telemetry.js";
import { decisionSchema, todayISO, addDays, dayLabel } from "./domain.js";
const choice = (instructions, criteria) => ({
  type: "choice",
  instructions,
  criteria,
});
export function buildQuestions(today = todayISO()) {
  const dates = Object.fromEntries(
    Array.from({ length: 63 }, (_, i) => {
      const date = addDays(today, i - 2);
      return [
        date,
        `${date} ${dayLabel(date)} · ${i === 2 ? "오늘" : i === 3 ? "내일" : i === 4 ? "모레" : `${i - 2}일 후`} · ${["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][new Date(date + "T12:00:00Z").getUTCDay()]}`,
      ];
    }),
  );
  const questions = {
    service: choice(
      '`latestMessage`를 `activeTask` 및 `activeContext`와 함께 읽고 요청을 처리할 기능을 선택하세요. "내일은?", "일주일은?", "전체로", "습도만"처럼 생략된 후속 요청이면 현재 기능을 이어갑니다. 명시적인 새 주제는 새 기능으로 전환합니다. 두 기능을 같이 요청하면 먼저 언급한 기능을 선택하세요.',
      {
        meals:
          "사내 식당 식단 조회. 점심/아침/저녁 메뉴, 전체 식단. 현재 식단 화면의 후속 날짜나 범위 변경.",
        schedule:
          "내 캘린더 일정 조회. 오늘/주간 스케줄. 현재 일정 화면에서 내일은?, 다음 주는? 등 후속 조회.",
        weather:
          "날씨 데이터 조회. 온도/습도/강수/바람. 현재 날씨 화면의 후속 조회.",
        leave: "휴가 신청, 연차 잔여량, 반차, 신청 내역.",
        rooms: "회의실 목록, 빈 회의실, 회의실 예약 UI.",
        notices: "사내 공지 목록 열람.",
        llm: "위 기능으로 처리 불가한 일반 질문, 코딩, 글쓰기, 원리 설명. 현재 기능 문맥이 전혀 없는 불명확한 말. 단 기존 기능의 생략된 후속 질문은 여기 해당하지 않음.",
      },
    ),

    scope: choice(
      "Requested time span. 주간/이번 주/일주일 = week; 다음 주 = nextweek. 오늘/내일/specific date = day. 전체메뉴 means all meals, NOT a week. For same-domain follow-up with no new time span preserve activeContext.scope; new domain defaults to day.",
      {
        day: "Single day",
        week: "Full Monday–Sunday week containing reference date",
        nextweek: "Next Monday–Sunday week relative to today",
      },
    ),
    date: choice(
      "latestMessage에서 날짜를 선택하세요. 오늘=today, 내일=today+1일, 모레=today+2일. 금요일/수요일 같은 요일은 오늘을 포함한 가장 가까운 해당 요일의 날짜를 반드시 선택하세요. 예: today가 2026-09-21 월요일이고 금요일 오후 반차 요청이면 2026-09-25를 선택. 주간 조회에서 이번 주/다음 주만 있고 특정 요일이 없으면 today를 기준일로 선택(주간 범위는 코드가 계산). 날짜 언급 없는 같은 기능 후속 요청이면 activeContext.date를 유지, 새 기능이면 today. 명시 날짜가 선택지에 없으면 unavailable.",
      {
        ...dates,
        unavailable:
          "Requested date outside supported range or unresolvable explicit date",
      },
    ),
    meal: choice(
      'latestMessage가 요청하는 식사 종류를 고르세요. 현재 화면의 종류가 아니라 최신 요청의 의미를 판단합니다. "점심 말고 저녁"은 dinner, "저녁 말고 점심"은 lunch. "전체 메뉴"는 all. 식사 종류 언급이 전혀 없을 때만 inherit. "저녁은?"도 명시적인 저녁 요청입니다.',
      {
        all: "아침·점심·저녁 전체 또는 하루 식단 모두",
        breakfast: "아침 식사, 조식 메뉴",
        lunch: "점심 식사, 중식 메뉴 (취소/부정된 점심은 제외)",
        dinner: "저녁 식사, 석식 메뉴 (취소/부정된 저녁은 제외)",
        inherit:
          "식사 종류를 새로 지정하지 않음. 예: 내일은?, 다음 주는?, 메뉴 보여줘",
      },
    ),
    metric: choice(
      "Assuming request concerns weather: which metric to focus? 날씨/예보/all/multiple metrics = all. 습도만/얼마나 습해 = humidity. Preserve metric on same-domain date-only follow-up.",
      {
        all: "Weather overview or multiple metrics",
        temperature: "Temperature / 기온 / 온도 / 얼마나 더워",
        humidity: "Humidity / 습도 / 습해",
        rain: "Rain chance / 강수 / 우산",
        wind: "Wind / 바람 / 풍속",
      },
    ),
    leaveView: choice(
      'latestMessage에서 사용자가 휴가에 관해 지금 원하는 행동을 고르세요. 이전 화면(activeContext.leaveView)을 유지하지 말고, 명시적인 새 요청을 우선하세요. "휴가신청"은 apply, "잔여휴가일수"는 balance. "신청 말고 며칠 남았는지"는 balance. "잔여일수 말고 신청할래"는 apply. 날짜/오전/오후만 수정하는 발언은 inherit.',
      {
        apply: {
          meaning: "휴가/연차/반차를 쓰거나 신청하기. 신청 화면 열기.",
          examples: [
            "휴가신청",
            "연차 신청할래",
            "반차 쓰고 싶어",
            "그럼 신청할게",
          ],
          exclude: "잔여량 조회, 이미 신청한 내역 조회",
        },
        balance: {
          meaning: "현재 남은 휴가 일수/연차 잔여량 조회.",
          examples: [
            "잔여휴가일수",
            "휴가 며칠 남았어",
            "내 연차 얼마나 남아",
            "남은 거 보여줘",
          ],
          exclude: "신규 신청 폼이나 과거 신청 내역",
        },
        status: {
          meaning: "이미 제출한 휴가의 신청 내역, 처리 상태, 취소 화면.",
          examples: ["신청 내역", "내 휴가 승인됐어?", "신청한 거 취소할래"],
        },
        inherit:
          "휴가 화면 종류를 새로 지정하지 않음. 예: 날짜만 내일로, 오후로 바꿔줘",
      },
    ),
    leaveKind: choice(
      'latestMessage에 명시된 휴가 종류를 선택. "오전 말고 오후"는 pm. "반차 말고 하루"는 full. 종류가 없으면 inherit. 이전 종류에 끌리지 말고 최신 명시 요청을 우선.',
      {
        full: "Full day annual leave",
        am: "Morning half-day / 오전 반차",
        pm: "Afternoon half-day / 오후 반차",
        inherit: "휴가 종류를 새로 지정하지 않음",
      },
    ),
  };
  const names = {
    meals: "구내식당 식단",
    schedule: "내 일정",
    weather: "날씨",
    leave: "휴가",
    rooms: "회의실",
    notices: "공지",
  };
  const ids = Object.keys(names);
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i],
        b = ids[j];
      questions.service.criteria[a + "+" + b] =
        `${names[a]}와 ${names[b]} 두 기능을 모두 요청함`;
    }
  questions.service.instructions +=
    " 두 기능을 동시에 요청하면 반드시 두 기능이 합쳐진 선택지를 고르세요. 예: 오늘 점심이랑 일정 같이 보여줘 → meals+schedule. 하나만 요청하면 단일 기능을 고르세요.";
  return questions;
}
export async function interpret(
  message,
  activeContext = {},
  key,
  model = "jev-latest",
) {
  if (!key)
    throw Object.assign(
      new Error(
        "JEV_KEY가 설정되지 않았어요. .env를 설정하거나 메뉴 버튼으로 UI를 둘러보세요.",
      ),
      { status: 503 },
    );
  void refreshNetworkBaseline();
  const today = todayISO(),
    questions = buildQuestions(today),
    start = performance.now();
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      state: {
        today,
        timezone: "Asia/Seoul",
        latestMessage: message,
        portalConvention:
          "이 회사 포털에서 점심 보여줘 / 오늘 점심 / 점심이랑 일정은 점심 식단 조회를 포함한다. 약속이나 점심 미팅이 명시된 경우에만 캘린더 일정이다.",
        activeTask:
          {
            meals: "구내식당 식단을 보고 있음",
            schedule: "내 캘린더 일정을 보고 있음",
            weather: "날씨를 보고 있음",
            leave: "휴가를 처리하고 있음",
            rooms: "회의실을 보고 있음",
            notices: "사내 공지를 보고 있음",
          }[activeContext.service] || "현재 조회 중인 업무 없음",
        activeContext,
      },
      questions,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok)
    throw Object.assign(
      new Error(
        `JEV 연결에 실패했어요 (${res.status}). 잠시 후 다시 시도해 주세요.`,
      ),
      { status: 502 },
    );
  const data = await res.json();
  const chosen = {};
  for (const [id, q] of Object.entries(questions)) {
    if (q.type !== "choice") continue;
    const a = data.answers?.[id];
    if (!a || !(a.choice in q.criteria))
      throw Object.assign(
        new Error("JEV 응답 형식을 확인할 수 없어요. 다시 시도해 주세요."),
        { status: 502 },
      );
    chosen[id] = a.choice;
  }
  if (chosen.service === "llm") chosen.date = today;
  if (chosen.date === "unavailable")
    throw Object.assign(
      new Error(
        "날짜는 오늘 기준 이틀 전부터 60일 후까지 조회할 수 있어요. 이 범위에서 다시 요청해 주세요.",
      ),
      { status: 422 },
    );
  const [primary, secondary = "none"] = chosen.service.split("+");
  chosen.service = primary;
  chosen.secondary = secondary;
  const includes = (service) => primary === service || secondary === service;
  const resolve = (field, service, fallback) => {
    if (!includes(service)) {
      chosen[field] = fallback;
      return;
    }
    if (chosen[field] === "inherit")
      chosen[field] =
        activeContext.service === service
          ? activeContext[field] || fallback
          : fallback;
  };
  resolve("meal", "meals", "lunch");
  resolve("leaveView", "leave", "apply");
  resolve("leaveKind", "leave", "full");
  const decision = decisionSchema.parse(chosen);
  if (decision.service === "llm") decision.secondary = "none";
  const latencyMs = performance.now() - start;
  return {
    decision,
    trace: {
      engine: data.model || model,
      latencyMs: Math.round(latencyMs),
      timingEstimate: splitTiming(latencyMs),
      usage: data.usage,
      cost: estimateCost(data.usage, data.model || model),
      answers: data.answers,
    },
  };
}
