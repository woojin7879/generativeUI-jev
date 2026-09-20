import { z } from "zod";
export const services = {
  meals: "구내식당",
  schedule: "나의 일정",
  weather: "날씨",
  leave: "휴가",
  rooms: "회의실",
  notices: "사내 공지",
  llm: "사내 LLM",
};
export const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function addDays(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dayLabel = (iso) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso + "T03:00:00Z"));
export const decisionSchema = z.object({
  service: z.enum(Object.keys(services)),
  secondary: z
    .enum(["none", ...Object.keys(services).filter((x) => x !== "llm")])
    .default("none"),
  scope: z.enum(["day", "week", "nextweek"]).default("day"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const d = new Date(s + "T12:00:00Z");
      return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
    }),
  meal: z.enum(["all", "breakfast", "lunch", "dinner"]).default("lunch"),
  metric: z
    .enum(["all", "temperature", "humidity", "rain", "wind"])
    .default("all"),
  leaveView: z.enum(["apply", "balance", "status"]).default("apply"),
  leaveKind: z.enum(["full", "am", "pm"]).default("full"),
});
export function datesFor(d) {
  if (d.scope === "day") return [d.date];
  const day = new Date(d.date + "T12:00:00Z").getUTCDay();
  const monday = addDays(
    d.date,
    -(day === 0 ? 6 : day - 1) + (d.scope === "nextweek" ? 7 : 0),
  );
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
const lunches = [
  ["직화 제육볶음", "현미밥 · 미역국 · 계란말이 · 배추김치", "한식", "720"],
  ["버섯 불고기", "잡곡밥 · 된장국 · 잡채 · 깍두기", "한식", "685"],
  ["바질 치킨 파스타", "양송이 수프 · 그린 샐러드 · 피클", "양식", "640"],
  ["연어 포케", "현미밥 · 아보카도 · 에다마메 · 유자 소스", "샐러드", "520"],
  ["돈가스 카레", "백미밥 · 미소국 · 양배추 샐러드", "일식", "810"],
  ["소고기 비빔밥", "맑은 무국 · 두부조림 · 백김치", "한식", "610"],
  ["닭갈비 덮밥", "콩나물국 · 감자 샐러드 · 깍두기", "한식", "695"],
];
export function mealsFor(date, meal = "all") {
  const idx = new Date(date + "T12:00:00Z").getUTCDay();
  const [name, sides, category, kcal] = lunches[idx];
  const all = [
    {
      id: "breakfast",
      label: "아침",
      time: "07:30 – 09:00",
      name: "에그 샌드위치",
      sides: "그릭 요거트 · 제철 과일 · 아메리카노",
      category: "모닝",
      kcal: "410",
    },
    {
      id: "lunch",
      label: "점심",
      time: "11:30 – 13:30",
      name,
      sides,
      category,
      kcal,
    },
    {
      id: "dinner",
      label: "저녁",
      time: "17:30 – 19:00",
      name: "뚝배기 순두부찌개",
      sides: "잡곡밥 · 고등어구이 · 나물무침 · 배추김치",
      category: "한식",
      kcal: "630",
    },
  ];
  return all.filter((m) => meal === "all" || m.id === meal);
}
export function eventsFor(date) {
  const dow = new Date(date + "T12:00:00Z").getUTCDay();
  if (dow === 0 || dow === 6) return [];
  return [
    {
      id: date + "-1",
      date,
      time: "09:30",
      end: "10:00",
      title: "프로덕트팀 데일리 싱크",
      location: "라운지 · 3F",
      people: ["김서연", "박지훈", "정우진"],
      kind: "team",
    },
    {
      id: date + "-2",
      date,
      time: "14:00",
      end: "15:00",
      title: [
        "",
        "신규 서비스 킥오프",
        "디자인 시스템 리뷰",
        "프론트엔드 기술 공유",
        "스프린트 체크인",
        "주간 회고",
      ][dow],
      location: "오리온 · 4F",
      people: ["김서연", "최민수"],
      kind: "meeting",
    },
    {
      id: date + "-3",
      date,
      time: "16:30",
      end: "17:30",
      title: "집중 업무 시간",
      location: "개인 일정",
      people: [],
      kind: "focus",
    },
  ];
}
export function weatherFor(date) {
  const n = new Date(date + "T12:00:00Z").getUTCDay();
  return {
    date,
    location: "서울 · 성수 오피스",
    temperature: 23 + (n % 3),
    low: 18 + (n % 2),
    high: 27 + (n % 2),
    humidity: 54 + n * 3,
    rain: n === 3 ? 60 : 10,
    wind: 2.1 + n / 10,
    condition: n === 3 ? "흐리고 비" : "구름 조금",
    hours: ["09", "12", "15", "18", "21"].map((hour, i) => ({
      hour,
      temp: 20 + (n % 3) + [0, 4, 6, 3, 0][i],
    })),
  };
}
export const notices = [
  {
    id: "n1",
    tag: "피플팀",
    date: "오늘",
    title: "10월 리프레시 데이 안내",
    body: "10월 둘째 주 금요일은 리프레시 데이입니다. 부서별 업무 인수인계를 미리 준비해 주세요. 데모용 안내이며 실제 사내 정책이 아닙니다.",
    pinned: true,
  },
  {
    id: "n2",
    tag: "총무팀",
    date: "어제",
    title: "4층 포커스룸 이용 안내",
    body: "포커스룸은 1인 집중 업무 공간입니다. 1회 최대 2시간 이용할 수 있으며, 사용 후 자리를 정리해 주세요.",
    pinned: false,
  },
  {
    id: "n3",
    tag: "IT팀",
    date: "9월 18일",
    title: "사내 Wi-Fi 보안 업데이트",
    body: "성수 오피스의 사내 Wi-Fi 점검이 예정되어 있습니다. 점검 시간에는 게스트 네트워크를 이용할 수 있습니다. 이 공지는 데모 데이터입니다.",
    pinned: false,
  },
];
export const rooms = [
  {
    id: "orion",
    name: "오리온",
    floor: "4F",
    capacity: 6,
    equipment: "디스플레이 · 화이트보드",
  },
  {
    id: "sirius",
    name: "시리우스",
    floor: "4F",
    capacity: 10,
    equipment: "화상회의 · 디스플레이",
  },
  {
    id: "luna",
    name: "루나",
    floor: "3F",
    capacity: 4,
    equipment: "화이트보드",
  },
];
export function componentFor(d) {
  if (d.service === "meals")
    return d.scope !== "day"
      ? "MealWeekCard"
      : d.meal === "all"
        ? "MealDayCard"
        : "MealSingleCard";
  if (d.service === "leave")
    return {
      apply: "LeaveApplicationCard",
      balance: "LeaveBalanceCard",
      status: "LeaveHistoryCard",
    }[d.leaveView];
  if (d.service === "schedule")
    return d.scope === "day" ? "ScheduleDayCard" : "ScheduleWeekCard";
  if (d.service === "weather")
    return d.scope !== "day"
      ? "WeatherWeekCard"
      : d.metric === "all"
        ? "WeatherOverviewCard"
        : "WeatherMetricCard";
  return {
    rooms: "RoomBookingCard",
    notices: "NoticeListCard",
    llm: "LLMHandoffCard",
  }[d.service];
}

export function makeSpec(decision, db) {
  const d = decisionSchema.parse(decision),
    dates = datesFor(d),
    types = [
      d.service,
      ...(d.secondary === "none" ||
      d.secondary === d.service ||
      d.service === "llm"
        ? []
        : [d.secondary]),
    ];
  const elements = { root: { type: "PortalStack", props: {}, children: [] } };
  for (const service of types) {
    const props = {
      decision: { ...d, service, secondary: "none" },
      label: services[service],
      dateLabel: dayLabel(d.date),
    };
    if (service === "meals")
      props.days = dates.map((date) => ({
        date,
        label: dayLabel(date),
        meals: mealsFor(date, d.meal),
      }));
    if (service === "schedule")
      props.days = dates.map((date) => ({
        date,
        label: dayLabel(date),
        events: eventsFor(date),
      }));
    if (service === "weather") props.days = dates.map(weatherFor);
    if (service === "leave") {
      props.requests = db.leave;
      props.balance =
        15 -
        db.leave
          .filter((r) => r.status !== "취소됨")
          .reduce((s, r) => s + r.days, 0);
    }
    if (service === "rooms")
      props.rooms = rooms.map((r) => ({
        ...r,
        reservations: db.reservations.filter(
          (v) => v.roomId === r.id && v.date === d.date,
        ),
      }));
    if (service === "notices") props.notices = notices;
    if (service === "meals")
      props.label =
        d.scope !== "day"
          ? "주간 식단표"
          : {
              lunch: "점심 식단",
              dinner: "저녁 식단",
              breakfast: "아침 식단",
              all: "하루 전체 식단",
            }[d.meal];
    if (service === "leave")
      props.label = {
        apply: "휴가 신청",
        balance: "잔여 휴가",
        status: "휴가 신청 내역",
      }[d.leaveView];
    if (service === "weather" && d.metric !== "all")
      props.label = {
        temperature: "기온",
        humidity: "습도",
        rain: "강수 확률",
        wind: "풍속",
      }[d.metric];
    elements[service] = { type: componentFor({ ...d, service }), props };
    elements.root.children.push(service);
  }
  return { root: "root", elements };
}
