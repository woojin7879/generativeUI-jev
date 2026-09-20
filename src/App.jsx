import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Plus,
  MessageSquare,
  Utensils,
  CalendarDays,
  CloudSun,
  Plane,
  DoorOpen,
  Bell,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
  Check,
  Loader2,
  X,
  Search,
  ArrowRight,
  Building2,
  Command,
  Trash2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { PortalRenderer } from "./cards.jsx";
import { api, defaults } from "./api.js";
const labels = {
  meals: "구내식당",
  schedule: "나의 일정",
  weather: "날씨",
  leave: "휴가 신청",
  rooms: "회의실",
  notices: "사내 공지",
  llm: "사내 LLM",
};
const icons = {
  meals: Utensils,
  schedule: CalendarDays,
  weather: CloudSun,
  leave: Plane,
  rooms: DoorOpen,
  notices: Bell,
};
const shortcuts = [
  ["meals", "오늘 점심 뭐 나와?", "오늘의 메뉴"],
  ["schedule", "이번 주 일정 보여줘", "놓치지 않는 하루"],
  ["weather", "오늘 날씨 알려줘", "출근길 날씨"],
  ["leave", "휴가 신청하고 싶어", "나를 위한 쉼"],
];
const examples = [
  "점심 말고 전체 메뉴 보여줘",
  "이번 주 일정 한눈에 보고 싶어",
  "오늘 습도만 알려줘",
  "금요일 오후 반차 쓰고 싶어",
  "내일 회의실 예약하고 싶어",
  "파이썬으로 정렬 함수 만들어줘",
];
function load() {
  try {
    const v = JSON.parse(localStorage.getItem("moa-conversations-v1") || "[]");
    return Array.isArray(v)
      ? v.filter((s) => s && s.id && Array.isArray(s.messages))
      : [];
  } catch {
    return [];
  }
}
function Logo({ small = false }) {
  return (
    <span className={"moa-symbol " + (small ? "small" : "")} aria-hidden="true">
      <svg viewBox="0 0 28 28">
        <path d="M5 21V8l9 8 9-8v13" />
      </svg>
    </span>
  );
}
function niceDate(iso) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso + "T03:00:00Z"));
}
function Message({
  message,
  onUpdate,
  onRefresh,
  onRetry,
  saveDraft,
  onInspect,
  busy,
}) {
  if (message.role === "user")
    return (
      <div className="user-message">
        <span>{message.text}</span>
      </div>
    );
  return (
    <div className="assistant-message">
      <Logo small />
      <div className="assistant-content">
        <div className="assistant-label">
          모아 <span>WORKPLACE</span>
        </div>
        {message.error ? (
          <div className="error-card" role="alert">
            <AlertCircle size={19} />
            <div>
              <strong>요청을 처리하지 못했어요</strong>
              <p>{message.error}</p>
              <button
                className="text-btn"
                disabled={busy}
                onClick={() => onRetry(message.input)}
              >
                다시 시도 <RefreshCw size={13} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={"card-shell " + (busy ? "card-busy" : "")}
              aria-busy={busy}
            >
              <fieldset disabled={busy}>
                <PortalRenderer
                  spec={message.spec}
                  context={{
                    update: (d) => onUpdate(message.id, d),
                    refresh: () => onRefresh(message.id),
                    draft: message.draft,
                    saveDraft: (draft) => saveDraft(message.id, draft),
                  }}
                />
              </fieldset>
            </div>
            <div className="response-meta">
              <span className="engine-dot" />
              {message.trace?.engine === "direct" ? "직접 선택" : "JEV 판단"}
              <span>·</span>
              {message.trace?.engine === "direct"
                ? "모델 호출 없음"
                : `${((message.trace?.totalMs ?? message.trace?.latencyMs ?? 0) / 1000).toFixed(2)}s`}
              <button onClick={() => onInspect(message)}>
                <Code2 size={12} /> 처리 과정
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export default function App() {
  const [sessions, setSessions] = useState(load),
    [activeId, setActiveId] = useState(() => {
      try {
        return localStorage.getItem("moa-active-v1") || null;
      } catch {
        return null;
      }
    }),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [health, setHealth] = useState(null),
    [sidebar, setSidebar] = useState(() => window.innerWidth > 900),
    [inspect, setInspect] = useState(null),
    [search, setSearch] = useState(""),
    [storageError, setStorageError] = useState(false);
  const inputRef = useRef(null),
    endRef = useRef(null),
    activeRef = useRef(null),
    busyRef = useRef(false);
  const today =
    health?.today ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(),
    );
  const session = sessions.find((s) => s.id === activeId);
  const messages = session?.messages || [];
  const hasMessages = messages.length > 0;
  useEffect(() => {
    api("/api/health")
      .then(setHealth)
      .catch(() => setHealth({ ready: false, error: true }));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("moa-conversations-v1", JSON.stringify(sessions));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [sessions]);
  useEffect(() => {
    activeRef.current = activeId;
    try {
      if (activeId) localStorage.setItem("moa-active-v1", activeId);
      else localStorage.removeItem("moa-active-v1");
    } catch {}
  }, [activeId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setInspect(null);
        if (window.innerWidth < 901) setSidebar(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function newChat() {
    if (busyRef.current) return;
    setActiveId(null);
    activeRef.current = null;
    setInput("");
    setInspect(null);
    inputRef.current?.focus();
    if (window.innerWidth < 901) setSidebar(false);
  }
  function modifyMessage(id, patch, sid = activeRef.current) {
    setSessions((ss) =>
      ss.map((s) =>
        s.id === sid
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === id ? { ...m, ...patch } : m,
              ),
            }
          : s,
      ),
    );
  }
  function ensureSession(title) {
    let id = activeRef.current;
    if (!id) {
      id = crypto.randomUUID();
      activeRef.current = id;
      setActiveId(id);
      setSessions((ss) =>
        [{ id, title, messages: [], createdAt: Date.now() }, ...ss].slice(
          0,
          30,
        ),
      );
    }
    return id;
  }
  async function send(text = input, direct = null) {
    text = text.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setInput("");
    const sid = ensureSession(text);
    const user = { id: crypto.randomUUID(), role: "user", text };
    setSessions((ss) =>
      ss.map((s) =>
        s.id === sid ? { ...s, messages: [...s.messages, user] } : s,
      ),
    );
    const last = [...messages].reverse().find((m) => m.decision);
    try {
      const result = await api(
        direct ? "/api/view" : "/api/interpret",
        direct || {
          message: text,
          context:
            last?.decision?.service === "leave" && last.draft
              ? {
                  ...last.decision,
                  date: last.draft.date,
                  leaveKind: last.draft.kind,
                }
              : last?.decision,
        },
      );
      const message = {
        id: crypto.randomUUID(),
        role: "assistant",
        ...result,
        input: text,
        ...(result.decision?.service === "leave" &&
        last?.decision?.service === "leave" &&
        last.draft
          ? {
              draft: {
                ...last.draft,
                date: result.decision.date,
                kind: result.decision.leaveKind,
              },
            }
          : {}),
      };
      setSessions((ss) =>
        ss.map((s) =>
          s.id === sid ? { ...s, messages: [...s.messages, message] } : s,
        ),
      );
    } catch (e) {
      setSessions((ss) =>
        ss.map((s) =>
          s.id === sid
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    input: text,
                    error: e.message,
                  },
                ],
              }
            : s,
        ),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
      inputRef.current?.focus();
    }
  }
  async function update(id, decision) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await api("/api/view", decision);
      modifyMessage(id, result);
    } catch (e) {
      modifyMessage(id, { error: e.message });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function refresh(id) {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    const result = await api("/api/view", msg.decision);
    modifyMessage(id, { spec: result.spec });
  }
  function direct(service) {
    send(labels[service], { ...defaults(today), service });
  }
  function saveDraft(id, draft) {
    setSessions((ss) =>
      ss.map((s) =>
        s.id === activeRef.current
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === id && JSON.stringify(m.draft) !== JSON.stringify(draft)
                  ? { ...m, draft }
                  : m,
              ),
            }
          : s,
      ),
    );
  }
  const filtered = sessions.filter((s) => s.title.includes(search));
  return (
    <div className={"app " + (sidebar ? "sidebar-open" : "sidebar-closed")}>
      {sidebar && (
        <button
          className="mobile-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className="sidebar" inert={!sidebar}>
        <div className="brand">
          <Logo />
          <strong>
            moa<span>workplace</span>
          </strong>
          <button
            className="icon-btn sidebar-hide"
            aria-label="사이드바 닫기"
            onClick={() => setSidebar(false)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="new-chat" disabled={busy} onClick={newChat}>
          <Plus size={17} />새 대화<span>⌘ K</span>
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {Object.entries(icons).map(([key, Icon]) => (
            <button
              key={key}
              disabled={busy}
              onClick={() => {
                direct(key);
                if (window.innerWidth < 901) setSidebar(false);
              }}
            >
              <Icon size={17} />
              <span>{labels[key]}</span>
              {key === "notices" && <small>3</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-history">
          <div className="nav-caption">
            최근 대화 {sessions.length > 0 && <span>{sessions.length}</span>}
          </div>
          {sessions.length > 3 && (
            <label className="history-search">
              <Search size={13} />
              <input
                placeholder="대화 찾기"
                aria-label="대화 찾기"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          )}
          {filtered.length ? (
            filtered.map((s) => (
              <div
                key={s.id}
                className={
                  "history-item " + (activeId === s.id ? "active" : "")
                }
              >
                <button
                  disabled={busy}
                  onClick={() => {
                    setActiveId(s.id);
                    activeRef.current = s.id;
                    if (window.innerWidth < 901) setSidebar(false);
                  }}
                >
                  <MessageSquare size={14} />
                  <span>{s.title}</span>
                </button>
                <button
                  disabled={busy}
                  className="delete-chat"
                  aria-label={`${s.title} 대화 삭제`}
                  onClick={() => {
                    setSessions((ss) => ss.filter((x) => x.id !== s.id));
                    if (activeId === s.id) newChat();
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="history-empty">
              업무 이야기를 시작해 보세요.
              <br />
              대화는 이 브라우저에 저장돼요.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="office-info">
            <Building2 size={15} />
            <span>성수 오피스</span>
            <span className="demo-pill">DEMO</span>
          </div>
          <div className="profile">
            <span className="avatar">우</span>
            <div>
              <strong>이우진</strong>
              <span>프로덕트팀 · 프론트엔드</span>
            </div>
            <span className="profile-status" title="데모 사용자" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-btn"
              aria-label="사이드바 열기/닫기"
              onClick={() => setSidebar(!sidebar)}
            >
              <PanelLeftOpen size={18} />
            </button>
            <span>나의 워크플레이스</span>
            <span className="topbar-slash">/</span>
            <strong>모아 어시스턴트</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">데모 워크스페이스</span>
            <span
              className={"connection " + (health?.ready ? "ready" : "offline")}
            >
              <i />
              {health === null
                ? "연결 확인 중"
                : health.ready
                  ? "JEV 연결됨"
                  : "JEV 연결 필요"}
            </span>
          </div>
        </header>
        <main
          className={"conversation " + (!hasMessages ? "welcome-mode" : "")}
        >
          {!hasMessages ? (
            <div className="welcome">
              <div className="today-label">
                <span />
                {niceDate(today)}
                <span className="welcome-location">SEOUL OFFICE</span>
              </div>
              <div className="welcome-mark">
                <Logo />
              </div>
              <h1>
                우진님, 반가워요.
                <br />
                <span>오늘은 무엇을 도와드릴까요?</span>
              </h1>
              <p className="welcome-copy">
                점심 메뉴부터 휴가 신청까지.
                <br className="mobile-only" /> 필요한 업무를 말하면, 바로
                여기에.
              </p>
              <div className="quick-grid">
                {shortcuts.map(([key, prompt, sub]) => {
                  const Icon = icons[key];
                  return (
                    <button
                      key={key}
                      disabled={busy}
                      onClick={() => send(prompt)}
                    >
                      <span className={"quick-icon " + key}>
                        <Icon size={19} />
                      </span>
                      <span className="quick-title">
                        {labels[key]}
                        <ArrowUpRight size={15} />
                      </span>
                      <span className="quick-sub">{sub}</span>
                    </button>
                  );
                })}
              </div>
              <div className="try-prompt">
                <span>이렇게 물어보세요</span>
                <button
                  disabled={busy}
                  onClick={() => send("오늘 점심이랑 일정 같이 보여줘")}
                >
                  “오늘 점심이랑 일정 같이 보여줘”
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="welcome-notice">
                <span>
                  <Bell size={14} />
                  NOTICE
                </span>
                <button disabled={busy} onClick={() => direct("notices")}>
                  10월 리프레시 데이 안내
                  <ChevronDown size={14} />
                </button>
                <small>피플팀</small>
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  onUpdate={update}
                  onRefresh={refresh}
                  onRetry={send}
                  saveDraft={saveDraft}
                  onInspect={setInspect}
                  busy={busy}
                />
              ))}
              {busy && (
                <div className="thinking">
                  <Logo small />
                  <span>
                    <Loader2 size={14} className="spin" />
                    요청을 처리하고 있어요
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </main>
        <div className="composer-zone">
          {hasMessages && !busy && (
            <div className="followups">
              {(messages.filter((m) => m.decision).at(-1)?.decision.service ===
              "meals"
                ? ["전체 메뉴 보여줘", "이번 주 점심은?"]
                : messages.filter((m) => m.decision).at(-1)?.decision
                      .service === "weather"
                  ? ["습도만 알려줘", "내일은?"]
                  : messages.filter((m) => m.decision).at(-1)?.decision
                        .service === "schedule"
                    ? ["이번 주 전체 일정", "내일은?"]
                    : ["오늘 점심 뭐 나와?", "오늘 일정 보여줘"]
              ).map((s) => (
                <button key={s} onClick={() => send(s)}>
                  {s}
                  <Plus size={12} />
                </button>
              ))}
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              maxLength={2000}
              aria-label="모아에게 메시지 보내기"
              placeholder="모아에게 물어보세요. ‘오늘 점심 뭐 나와?’"
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer-bottom">
              <span className="composer-mode">
                <span className="mini-spark">✳</span>워크플레이스 어시스턴트
              </span>
              <div>
                <span className="enter-hint">Enter로 전송</span>
                <button
                  type="submit"
                  className="send-btn"
                  aria-label="메시지 보내기"
                  disabled={!input.trim() || busy}
                >
                  {busy ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <ArrowUp size={20} />
                  )}
                </button>
              </div>
            </div>
          </form>
          <div className="composer-footnote">
            업무 데이터와 신청은 모두 데모입니다.{" "}
            <span>일반 대화는 사내 LLM으로 라우팅만 표시합니다.</span>
          </div>
          {storageError && (
            <p className="inline-error">
              브라우저 저장 공간이 부족해 대화를 저장하지 못했어요.
            </p>
          )}
        </div>
      </div>
      {inspect && (
        <div className="inspector-backdrop" onClick={() => setInspect(null)}>
          <aside
            className="inspector"
            role="dialog"
            aria-modal="true"
            aria-label="요청 처리 과정"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const controls = [
                  ...e.currentTarget.querySelectorAll(
                    "button,summary,input,a[href]",
                  ),
                ];
                const first = controls[0],
                  last = controls.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <header>
              <div>
                <span className="eyebrow">UNDER THE HOOD</span>
                <h2>요청 처리 과정</h2>
              </div>
              <button
                className="icon-btn"
                aria-label="처리 과정 닫기"
                onClick={() => setInspect(null)}
                autoFocus
              >
                <X size={20} />
              </button>
            </header>
            <div className="pipeline">
              <span>자연어 요청</span>
              <ArrowRight size={14} />
              <strong>
                {inspect.trace?.engine === "direct" ? "직접 선택" : "JEV"}
              </strong>
              <ArrowRight size={14} />
              <span>
                {inspect.decision?.service === "llm"
                  ? "LLM 라우팅"
                  : "JSON → UI"}
              </span>
            </div>
            <dl>
              <div>
                <dt>모델</dt>
                <dd>{inspect.trace?.engine}</dd>
              </div>
              <div>
                <dt>전체 응답 · 네트워크 + 판단</dt>
                <dd>
                  {inspect.trace?.totalMs == null
                    ? "—"
                    : `${Math.round(inspect.trace.totalMs)} ms`}
                </dd>
              </div>
              <div>
                <dt>JEV 왕복 · 네트워크 + 판단</dt>
                <dd>{inspect.trace?.latencyMs ?? "—"} ms</dd>
              </div>
              <div>
                <dt>예상 비용 · USD</dt>
                <dd>
                  {inspect.trace?.cost?.usd == null
                    ? "확인 불가"
                    : `$${inspect.trace.cost.usd.toFixed(8)}`}
                </dd>
              </div>
              <div>
                <dt>예상 비용 · 원화</dt>
                <dd>
                  {inspect.trace?.cost?.krw == null
                    ? "확인 불가"
                    : `₩${inspect.trace.cost.krw.toFixed(4)}`}
                </dd>
              </div>
              <div>
                <dt>입력 토큰</dt>
                <dd>{inspect.trace?.usage?.input_tokens ?? "—"}</dd>
              </div>
              <div>
                <dt>생성형 LLM 호출</dt>
                <dd>0회</dd>
              </div>
            </dl>
            {inspect.trace?.cost?.fx && (
              <p>
                입력 100만 토큰당 $
                {inspect.trace.cost.inputUsdPerMillion ?? "단가 미확인"}, 출력
                무료 기준의 JEV 예상 비용입니다. 환산 기준: $1 = ₩
                {inspect.trace.cost.fx.rate.toLocaleString("ko-KR")} (
                {inspect.trace.cost.fx.date} 고정 참고 환율). 실제 청구·결제
                환율과 다를 수 있습니다.{" "}
                <a
                  href={inspect.trace.cost.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  공식 단가
                </a>{" "}
                ·{" "}
                <a
                  href={inspect.trace.cost.fx.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  환율 출처
                </a>
              </p>
            )}
            <h3>의미 판단 결과</h3>
            <pre>{JSON.stringify(inspect.decision, null, 2)}</pre>
            <details>
              <summary>JEV 응답과 확률</summary>
              <pre>{JSON.stringify(inspect.trace?.answers || {}, null, 2)}</pre>
            </details>
            <details>
              <summary>json-render Spec</summary>
              <pre>{JSON.stringify(inspect.spec, null, 2)}</pre>
            </details>
            <p>
              자연어 판단은 JEV가, 데이터 조회와 UI 구성은 코드가 처리합니다.
              전체 응답은 브라우저 요청부터 응답 해석까지, JEV 왕복은 서버에서
              JEV 요청부터 응답 검증까지의 실측값입니다. 두 값은 포함 관계이며
              더하지 않습니다. 순수 네트워크 지연과 모델 판단 시간은 API에서
              별도로 제공하지 않아 분리하지 않습니다.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
