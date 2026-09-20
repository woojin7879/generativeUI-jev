import React, { createContext, useContext, useEffect, useState } from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import {
  Utensils,
  Moon,
  CalendarDays,
  Sun,
  CloudSun,
  CloudRain,
  Droplets,
  Wind,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  MapPin,
  Clock,
  Check,
  CheckCircle2,
  DoorOpen,
  Bell,
  Plane,
  Users,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { api } from "./api.js";
export const CardContext = createContext({});
const icons = {
  meals: Utensils,
  schedule: CalendarDays,
  weather: CloudSun,
  leave: Plane,
  rooms: DoorOpen,
  notices: Bell,
};
const mealLabels = {
  all: "전체 메뉴",
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
};
const metricLabels = {
  all: "전체",
  temperature: "기온",
  humidity: "습도",
  rain: "강수",
  wind: "바람",
};
function Tabs({ options, value, onChange, label }) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {Object.entries(options).map(([key, text]) => (
        <button
          key={key}
          className={key === value ? "selected" : ""}
          aria-pressed={key === value}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
function Card({ p, children, tools }) {
  const Icon = icons[p.decision.service];
  return (
    <section className={"portal-card " + p.decision.service}>
      <header className="card-header">
        <div className="card-heading">
          <span className="card-icon">
            <Icon size={18} />
          </span>
          <div>
            <h3>{p.label}</h3>
            <span>
              {p.decision.scope === "day"
                ? p.dateLabel
                : p.decision.scope === "nextweek"
                  ? "다음 주"
                  : "이번 주"}{" "}
              · 데모 데이터
            </span>
          </div>
        </div>
        {tools}
      </header>
      {children}
    </section>
  );
}
function Scope({ p }) {
  const { update } = useContext(CardContext);
  return (
    <div className="scope-row">
      <Tabs
        label="조회 기간"
        options={{ day: "하루", week: "이번 주", nextweek: "다음 주" }}
        value={p.decision.scope}
        onChange={(scope) => update({ ...p.decision, scope })}
      />
      <input
        aria-label="조회 날짜"
        type="date"
        value={p.decision.date}
        onChange={(e) =>
          e.target.value &&
          update({ ...p.decision, date: e.target.value, scope: "day" })
        }
      />
    </div>
  );
}
function Meals({ props: p }) {
  const { update } = useContext(CardContext);
  return (
    <Card p={p}>
      <Scope p={p} />
      <div className="card-body">
        <Tabs
          label="식사 종류"
          options={mealLabels}
          value={p.decision.meal}
          onChange={(meal) => update({ ...p.decision, meal })}
        />
        {p.days.map((day) => (
          <div className="meal-day" key={day.date}>
            {p.days.length > 1 && <h4 className="day-label">{day.label}</h4>}
            {day.meals.map((m) => (
              <div className="meal-row" key={m.id}>
                <div className={"meal-illustration " + m.id}>
                  {m.id === "dinner" ? (
                    <Moon size={25} />
                  ) : m.id === "breakfast" ? (
                    <Sun size={25} />
                  ) : (
                    <Utensils size={25} />
                  )}
                </div>
                <div className="meal-info">
                  <div className="eyebrow">
                    {m.label} <span>· {m.time}</span>
                  </div>
                  <h4>{m.name}</h4>
                  <p>{m.sides}</p>
                  <div className="meal-meta">
                    <span>{m.category}</span>
                    <span>{m.kcal} kcal</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <footer className="card-footer">
        <MapPin size={13} /> 성수 오피스 B1 · 모아 키친{" "}
        <span>식단은 예시입니다</span>
      </footer>
    </Card>
  );
}
function Schedule({ props: p }) {
  const [open, setOpen] = useState(null);
  return (
    <Card p={p}>
      <Scope p={p} />
      <div className="card-body schedule-body">
        {p.days.map((day) => (
          <div className="agenda-day" key={day.date}>
            {p.days.length > 1 && (
              <h4 className="day-label">
                {day.label}
                <span>{day.events.length}개 일정</span>
              </h4>
            )}
            {!day.events.length ? (
              <div className="empty-inline">
                <CalendarDays size={22} />
                <span>
                  등록된 일정이 없어요.
                  <small>잠깐 쉬어가도 좋은 하루예요.</small>
                </span>
              </div>
            ) : (
              day.events.map((e) => (
                <div key={e.id}>
                  <button
                    className="event-row"
                    onClick={() => setOpen(open === e.id ? null : e.id)}
                    aria-expanded={open === e.id}
                  >
                    <div className="event-time">
                      {e.time}
                      <small>{e.end}</small>
                    </div>
                    <div className={"event-line " + e.kind} />
                    <div className="event-info">
                      <strong>{e.title}</strong>
                      <span>
                        <MapPin size={12} />
                        {e.location}
                      </span>
                    </div>
                    <ChevronRight size={15} />
                  </button>
                  {open === e.id && (
                    <div className="event-details">
                      <Users size={14} />
                      {e.people.length
                        ? e.people.join(", ")
                        : "나만의 집중 시간"}
                      <span>예시 일정 · 읽기 전용</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
      <footer className="card-footer">
        <CalendarDays size={13} /> 내 캘린더 <span>시간대: 서울</span>
      </footer>
    </Card>
  );
}
function Weather({ props: p }) {
  const { update } = useContext(CardContext);
  const w = p.days[0];
  const metrics = {
    temperature: {
      value: w.temperature,
      unit: "°",
      icon: Sun,
      label: "현재 기온",
      sub: `최저 ${w.low}° / 최고 ${w.high}°`,
    },
    humidity: {
      value: w.humidity,
      unit: "%",
      icon: Droplets,
      label: "현재 습도",
      sub: "실내 적정 습도 40–60%",
    },
    rain: {
      value: w.rain,
      unit: "%",
      icon: CloudRain,
      label: "강수 확률",
      sub: "조회일의 예시 예보",
    },
    wind: {
      value: w.wind.toFixed(1),
      unit: "m/s",
      icon: Wind,
      label: "풍속",
      sub: "북서풍",
    },
  };
  const focus = p.decision.metric === "all" ? "temperature" : p.decision.metric;
  const m = metrics[focus],
    Icon = m.icon;
  return (
    <Card p={p}>
      <Scope p={p} />
      <div className="card-body">
        <Tabs
          label="날씨 항목"
          options={metricLabels}
          value={p.decision.metric}
          onChange={(metric) => update({ ...p.decision, metric })}
        />
        {p.days.length > 1 ? (
          <div className="forecast-list">
            {p.days.map((day) => (
              <div className="forecast-day" key={day.date}>
                <span>{day.date.slice(5).replace("-", "/")}</span>
                <CloudSun size={22} />
                <strong>
                  {p.decision.metric === "humidity"
                    ? day.humidity + "%"
                    : p.decision.metric === "rain"
                      ? day.rain + "%"
                      : p.decision.metric === "wind"
                        ? day.wind.toFixed(1) + "m/s"
                        : day.temperature + "°"}
                </strong>
                <small>{day.condition}</small>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="weather-main">
              <div>
                <div className="eyebrow">
                  <MapPin size={12} />
                  {w.location}
                </div>
                <div className="temperature">
                  {m.value}
                  <span>{m.unit}</span>
                </div>
                <p>
                  {p.decision.metric === "all" ? w.condition : m.label}{" "}
                  <span>· {m.sub}</span>
                </p>
              </div>
              <Icon className="weather-art" size={77} strokeWidth={1.25} />
            </div>
            {p.decision.metric === "all" ? (
              <>
                <div className="weather-metrics">
                  {Object.entries(metrics)
                    .filter(([key]) => key !== "temperature")
                    .map(([key, item]) => (
                      <button
                        key={key}
                        onClick={() => update({ ...p.decision, metric: key })}
                      >
                        <item.icon size={15} />
                        <span>{item.label}</span>
                        <strong>
                          {item.value}
                          {item.unit}
                        </strong>
                      </button>
                    ))}
                </div>
                <div className="hourly">
                  {w.hours.map((h) => (
                    <div key={h.hour}>
                      <small>{h.hour}:00</small>
                      <CloudSun size={20} />
                      <strong>{h.temp}°</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="focus-note">
                다른 항목은 위 탭에서 바로 확인할 수 있어요.
              </div>
            )}
          </>
        )}
      </div>
      <footer className="card-footer">
        <CloudSun size={13} /> 서울 기준 예시 날씨{" "}
        <span>실시간 관측값이 아닙니다</span>
      </footer>
    </Card>
  );
}
function Leave({ props: p }) {
  const { update, refresh, saveDraft, draft } = useContext(CardContext);
  const [date, setDate] = useState(draft?.date || p.decision.date),
    [kind, setKind] = useState(draft?.kind || p.decision.leaveKind),
    [reason, setReason] = useState(draft?.reason || ""),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setDate(p.decision.date);
    setKind(p.decision.leaveKind);
    setReview(false);
  }, [p.decision.date, p.decision.leaveKind]);
  useEffect(() => {
    saveDraft?.({ date, kind, reason });
  }, [date, kind, reason]);
  const days = kind === "full" ? 1 : 0.5;
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/leave", { date, kind, reason, requestId });
      setDone(true);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card p={p}>
      <div className="card-body">
        <div className="leave-eligibility">
          <Plane size={15} />
          <span>
            신청 가능한 연차 <strong>{p.balance}일</strong>
          </span>
          <button
            className="text-btn"
            onClick={() => update({ ...p.decision, leaveView: "balance" })}
          >
            잔여 내역 보기 <ArrowUpRight size={13} />
          </button>
        </div>
        {p.decision.leaveView === "apply" &&
          (done ? (
            <div className="success-panel">
              <CheckCircle2 />
              <h4>데모 휴가 신청이 접수됐어요</h4>
              <p>
                {date} ·{" "}
                {kind === "full"
                  ? "연차"
                  : kind === "am"
                    ? "오전 반차"
                    : "오후 반차"}{" "}
                · {days}일
              </p>
              <small>승인 대기 · 실제 회사 시스템에는 전송되지 않습니다.</small>
              <button
                className="outline-btn"
                onClick={() => update({ ...p.decision, leaveView: "status" })}
              >
                신청 내역 보기 <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (reason.trim()) setReview(true);
              }}
            >
              <div className="form-grid">
                <label>
                  휴가 날짜
                  <input
                    aria-label="휴가 날짜"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setReview(false);
                    }}
                  />
                </label>
                <label>
                  휴가 종류
                  <select
                    aria-label="휴가 종류"
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value);
                      setReview(false);
                    }}
                  >
                    <option value="full">연차 · 1일</option>
                    <option value="am">오전 반차 · 0.5일</option>
                    <option value="pm">오후 반차 · 0.5일</option>
                  </select>
                </label>
              </div>
              <label className="reason-label">
                신청 사유
                <textarea
                  aria-label="신청 사유"
                  required
                  maxLength={300}
                  placeholder="간단한 사유를 입력해 주세요"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReview(false);
                  }}
                />
              </label>
              <div className="approval-line">
                <span className="mini-avatar">서</span>
                <span>
                  승인자 <strong>김서연 팀장</strong>
                </span>
                <span>프로덕트팀</span>
              </div>
              {review ? (
                <div className="review-panel">
                  <strong>이 내용으로 신청할까요?</strong>
                  <p>
                    {date} · {days}일 사용 · 신청 후 {p.balance - days}일 남음
                  </p>
                  <div>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => setReview(false)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={busy}
                      onClick={submit}
                    >
                      {busy ? "처리 중…" : "데모 신청 확정"}
                      <Check size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="primary-btn full"
                  type="submit"
                  disabled={busy || !reason.trim()}
                >
                  신청 내용 검토 <ArrowRight size={16} />
                </button>
              )}
            </form>
          ))}
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
      </div>
      <footer className="card-footer">
        <Plane size={13} /> 피플팀 · 휴가 관리{" "}
        <span>데모 신청은 이 서버에 저장됩니다</span>
      </footer>
    </Card>
  );
}
function LeaveBalance({ props: p }) {
  const { update } = useContext(CardContext);
  const pending = p.requests
    .filter((r) => r.status === "승인 대기")
    .reduce((n, r) => n + r.days, 0);
  return (
    <Card p={p}>
      <div className="balance-hero">
        <div className="eyebrow">AVAILABLE DAYS</div>
        <div className="balance-number">
          {p.balance}
          <span>일</span>
        </div>
        <p>지금 사용할 수 있는 휴가예요.</p>
        <div className="balance-track">
          <div style={{ width: `${Math.max(0, p.balance / 15) * 100}%` }} />
        </div>
      </div>
      <div className="balance-stats">
        <div>
          <span>부여</span>
          <strong>
            15<small>일</small>
          </strong>
        </div>
        <div>
          <span>사용 완료</span>
          <strong>
            {15 - p.balance - pending}
            <small>일</small>
          </strong>
        </div>
        <div>
          <span>승인 대기</span>
          <strong>
            {pending}
            <small>일</small>
          </strong>
        </div>
      </div>
      <div className="balance-actions">
        <button
          className="outline-btn"
          onClick={() => update({ ...p.decision, leaveView: "status" })}
        >
          신청 내역
        </button>
        <button
          className="primary-btn"
          onClick={() => update({ ...p.decision, leaveView: "apply" })}
        >
          휴가 신청 <ArrowRight size={15} />
        </button>
      </div>
      <footer className="card-footer">
        <Plane size={13} />
        피플팀 · 잔여 연차<span>승인 대기분은 차감된 수치입니다</span>
      </footer>
    </Card>
  );
}
function LeaveHistory({ props: p }) {
  const { update, refresh } = useContext(CardContext);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function cancel(id) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/leave/${id}/cancel`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card p={p}>
      <div className="card-body">
        <div className="history-summary">
          <span>
            전체 <strong>{p.requests.length}</strong>건
          </span>
          <button
            className="text-btn"
            onClick={() => update({ ...p.decision, leaveView: "apply" })}
          >
            새 휴가 신청 <PlusIcon />
          </button>
        </div>
        {p.requests.length ? (
          <div className="request-list">
            {[...p.requests].reverse().map((r) => (
              <div key={r.id}>
                <div>
                  <strong>
                    {r.date} ·{" "}
                    {r.kind === "full"
                      ? "연차"
                      : r.kind === "am"
                        ? "오전 반차"
                        : "오후 반차"}
                  </strong>
                  <p>{r.reason}</p>
                  <small>
                    {r.status} · {r.days}일
                  </small>
                </div>
                {r.status !== "취소됨" && (
                  <button
                    className="text-btn"
                    disabled={busy}
                    onClick={() => cancel(r.id)}
                  >
                    신청 취소
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline">
            <FileText />
            <span>
              아직 신청한 휴가가 없어요.
              <small>새 휴가를 신청하면 여기에 표시됩니다.</small>
            </span>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="card-footer">
        <FileText size={13} />
        신청·처리 이력<span>데모 서버에 저장된 내역입니다</span>
      </footer>
    </Card>
  );
}
function PlusIcon() {
  return <ArrowUpRight size={13} />;
}
function Rooms({ props: p }) {
  const { refresh, update } = useContext(CardContext);
  const [selected, setSelected] = useState(null),
    [time, setTime] = useState("10:00"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const slots = [
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
  ];
  async function book(room) {
    setBusy(true);
    setError("");
    try {
      await api("/api/rooms", {
        roomId: room.id,
        date: p.decision.date,
        time,
        requestId: crypto.randomUUID(),
      });
      setNotice(`${room.name} ${time} · 1시간 데모 예약 완료`);
      setSelected(null);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/rooms/${id}/cancel`, {});
      setNotice("예약을 취소했어요.");
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card p={p}>
      <div className="card-body">
        <label className="room-date">
          예약 날짜
          <input
            type="date"
            aria-label="회의실 예약 날짜"
            value={p.decision.date}
            onChange={(e) =>
              e.target.value && update({ ...p.decision, date: e.target.value })
            }
          />
        </label>
        {p.rooms.map((room) => (
          <div className="room-row" key={room.id}>
            <div className="room-top">
              <span className="room-icon">
                <DoorOpen size={22} />
              </span>
              <div>
                <h4>
                  {room.name} <small>{room.floor}</small>
                </h4>
                <p>
                  {room.capacity}인 · {room.equipment}
                </p>
              </div>
              <button
                className="outline-btn"
                onClick={() => {
                  setSelected(selected === room.id ? null : room.id);
                  setError("");
                }}
              >
                {selected === room.id ? "닫기" : "시간 선택"}
              </button>
            </div>
            {selected === room.id && (
              <div className="booking">
                <div className="slot-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      disabled={room.reservations.some((r) => r.time === slot)}
                      className={time === slot ? "active" : ""}
                      onClick={() => setTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <button
                  className="primary-btn"
                  disabled={
                    busy || room.reservations.some((r) => r.time === time)
                  }
                  onClick={() => book(room)}
                >
                  {time} · 1시간 예약
                </button>
              </div>
            )}
            {room.reservations.map((r) => (
              <div className="reservation" key={r.id}>
                <Check size={13} />
                {r.time} 예약됨
                <button disabled={busy} onClick={() => cancel(r.id)}>
                  취소
                </button>
              </div>
            ))}
          </div>
        ))}
        {notice && (
          <p className="inline-success" role="status">
            <Check size={14} />
            {notice}
          </p>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer className="card-footer">
        <DoorOpen size={13} /> 성수 오피스{" "}
        <span>예약은 데모 서버에만 저장됩니다</span>
      </footer>
    </Card>
  );
}
function Notices({ props: p }) {
  const [open, setOpen] = useState(null);
  return (
    <Card p={p}>
      <div className="notice-list">
        {p.notices.map((n) => (
          <div className="notice-item" key={n.id}>
            <button
              onClick={() => setOpen(open === n.id ? null : n.id)}
              aria-expanded={open === n.id}
            >
              <div>
                <span className="notice-tag">{n.tag}</span>
                {n.pinned && <span className="pin-tag">중요</span>}
                <h4>{n.title}</h4>
                <small>{n.date}</small>
              </div>
              <ChevronRight size={17} />
            </button>
            {open === n.id && <p className="notice-detail">{n.body}</p>}
          </div>
        ))}
      </div>
      <footer className="card-footer">
        <Bell size={13} /> 사내 게시판 <span>예시 공지 3건</span>
      </footer>
    </Card>
  );
}
function LLM() {
  return (
    <section className="llm-card">
      <span className="llm-icon">
        <ArrowUpRight size={23} />
      </span>
      <div>
        <div className="eyebrow">ROUTED TO INTERNAL LLM</div>
        <h3>사내 LLM으로 라우팅됐어요</h3>
        <p>
          이 요청은 대화형 AI가 처리할 내용이에요.
          <br />
          데모에서는 LLM을 연결하지 않아 답변을 생성하지 않습니다.
        </p>
        <span className="route-label">
          <span />
          라우팅 완료 · 연결 없음
        </span>
      </div>
    </section>
  );
}
const components = {
  PortalStack: ({ children }) => <div className="portal-stack">{children}</div>,
  MealSingleCard: Meals,
  MealDayCard: Meals,
  MealWeekCard: Meals,
  ScheduleDayCard: Schedule,
  ScheduleWeekCard: Schedule,
  WeatherOverviewCard: Weather,
  WeatherMetricCard: Weather,
  WeatherWeekCard: Weather,
  LeaveApplicationCard: Leave,
  LeaveBalanceCard: LeaveBalance,
  LeaveHistoryCard: LeaveHistory,
  RoomBookingCard: Rooms,
  NoticeListCard: Notices,
  LLMHandoffCard: LLM,
  meals: Meals,
  schedule: Schedule,
  weather: Weather,
  leave: ({ props: p }) =>
    p.decision.leaveView === "balance" ? (
      <LeaveBalance props={p} />
    ) : p.decision.leaveView === "status" ? (
      <LeaveHistory props={p} />
    ) : (
      <Leave props={p} />
    ),
  rooms: Rooms,
  notices: Notices,
  llm: LLM,
};
const registry = Object.fromEntries(
  Object.entries(components).map(([name, Component]) => [
    name,
    ({ element, ...rest }) => <Component props={element.props} {...rest} />,
  ]),
);
export function PortalRenderer({ spec, context }) {
  return (
    <CardContext.Provider value={context}>
      <JSONUIProvider>
        <Renderer spec={spec} registry={registry} />
      </JSONUIProvider>
    </CardContext.Provider>
  );
}
