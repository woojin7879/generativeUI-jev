# 대화형 회사 포털 UI 카탈로그

자연어 → JEV Choice 판단 → 검증된 데이터/컴포넌트 선택 → json-render Spec → 채팅 카드. 생성형 LLM 문장은 없으며 일반 질문에는 미연결 라우팅 카드만 표시한다. 아래 데이터는 모두 더미다.

## 문장에 따라 달라지는 UI

| 예시 문장 | 선택된 UI | 화면 차이 |
| --- | --- | --- |
| 점심메뉴 | MealSingleCard · lunch | 점심 한 끼의 메뉴와 영양 정보 |
| 오늘 저녁 메뉴 / 석식 뭐 나와? | MealSingleCard · dinner | 저녁 한 끼와 달 아이콘, 저녁 데이터 |
| 점심 말고 저녁 메뉴 | MealSingleCard · dinner | 부정된 점심을 제외하고 저녁 표시 |
| 아침 메뉴 보여줘 | MealSingleCard · breakfast | 아침 한 끼 |
| 전체메뉴 | MealDayCard | 아침·점심·저녁 세 행 |
| 이번 주 저녁 식단 | MealWeekCard | 날짜별 저녁 메뉴 목록 |
| 오늘 일정 | ScheduleDayCard | 하루 타임라인, 일정 펼치기 |
| 이번 주 전체 일정 | ScheduleWeekCard | 날짜별 일정 그룹 |
| 오늘 날씨 | WeatherOverviewCard | 날씨 요약, 여러 지표와 시간대 정보 |
| 오늘 온도 | WeatherMetricCard · temperature | 온도를 큰 숫자로 표시 |
| 오늘 습도 | WeatherMetricCard · humidity | 습도를 큰 숫자로 표시 |
| 이번 주 날씨 | WeatherWeekCard | 날짜별 예보 |
| 휴가신청 | LeaveApplicationCard | 날짜·종류·사유 입력 → 검토 → 확정 |
| 잔여휴가일수 / 내 연차 얼마나 남았어? | LeaveBalanceCard | 큰 잔여 일수, 부여·사용·대기 수치. 신청 폼 없음 |
| 신청 내역 보여줘 / 휴가 신청한 거 취소하고 싶어 | LeaveHistoryCard | 제출 내역·상태·취소 버튼 |
| 오후 반차 신청할게 | LeaveApplicationCard · pm | 오후 반차가 선택된 폼 |
| 내일 회의실 예약 | RoomBookingCard | 날짜, 회의실별 빈 시간 선택과 예약 |
| 사내 공지 보여줘 | NoticeListCard | 제목 목록과 본문 펼치기 |
| 자바스크립트 Promise 설명해줘 | LLMHandoffCard | 사내 LLM으로 라우팅됨 · 미연결 |
| 오늘 점심이랑 일정 같이 보여줘 | PortalStack | 식단 카드 + 일정 카드 조합 |

같은 레이아웃을 재사용하는 점심/저녁은 데이터와 제목이 달라진다. 휴가 신청/잔여/내역은 별도 컴포넌트로 분리되어 입력 폼과 조회 화면이 구분된다.

## 조합 전 컴포넌트 구성

아래는 실제 카드의 구성 요소를 설명하는 와이어프레임이다. 전체 채팅 화면을 조합하기 전 단위이며 구현은 `src/cards.jsx`에 있다. 일부 변형은 내부 렌더러를 공유한다.

```text
PortalStack
└─ 요청에 선택된 업무 카드 (최대 2개)

Card (공통 프레임)
├─ 아이콘 / 제목 / 기준 날짜
├─ Tabs (식사 종류, 날씨 항목 등)
├─ Scope (하루/이번 주/다음 주, 지원 카드)
└─ 업무별 본문

MealSingleCard       MealDayCard           MealWeekCard
[점심/저녁 제목]      [전체 식단 제목]       [주간 제목]
[한 끼 메뉴]         [아침 메뉴]            [월: 선택 식사]
[영양 정보]          [점심 메뉴]            [화: 선택 식사] …
                    [저녁 메뉴]

LeaveApplicationCard  LeaveBalanceCard      LeaveHistoryCard
[신청 가능 잔여]       [잔여 일수 크게]       [신청 상태 목록]
[날짜 / 휴가 종류]     [잔여 비율 막대]       [기간 / 종류]
[사유 / 결재자]        [부여 / 사용 / 대기]  [취소 버튼]
[검토 → 확정]         [신청 / 내역 이동]     [새 신청]

ScheduleDayCard / ScheduleWeekCard
[기간 선택] → [하루 타임라인 / 날짜별 그룹] → [일정 상세 펼치기]

WeatherOverviewCard / WeatherMetricCard / WeatherWeekCard
[항목 탭] → [종합 지표 / 단일 지표 큰 숫자 / 날짜별 예보]

RoomBookingCard
[날짜] → [회의실] → [시간 슬롯] → [예약 / 취소]

NoticeListCard           LLMHandoffCard
[공지 제목 / 날짜]       [라우팅 대상: 사내 LLM]
[본문 펼치기]            [연결되지 않음, 실제 LLM 호출 0회]
```

## 문맥과 상호작용

- `오늘 점심` → `저녁은?`는 dinner로 전환, 이어서 `내일은?`은 dinner를 유지하고 날짜만 바꾼다.
- `잔여휴가일수` → `휴가신청`은 잔여 카드에서 신청 폼으로 전환한다. 명시적인 최신 요청이 기존 화면보다 우선한다.
- `오늘 온도` → `습도만` → `내일은?`은 습도 선택을 유지한다.
- 자연어는 새 채팅 응답을 추가한다. 탭·날짜·버튼은 해당 카드를 직접 갱신하며 JEV를 호출하지 않는다.
- 휴가와 예약의 확정·취소만 로컬 데모 데이터에 저장한다. 복합 업무는 날짜/기간을 공유한다.

## 처리 과정 · 비용과 시간

- 전체 응답: 브라우저 요청 시작부터 JSON 응답 해석 완료까지. 네트워크·JEV 판단·서버 구성 시간이 포함되며 화면 페인트 시간은 제외한다.
- JEV 왕복: 서버가 JEV 요청을 시작하고 응답을 검증하는 데 걸린 시간. 네트워크 + 판단을 포함한다. 전체 응답의 일부이므로 두 값을 더하지 않는다.
- 순수 모델 판단과 네트워크 지연은 API에서 분리된 값이 확인되지 않아 추정으로 나누지 않는다.
- USD 예상 비용 = 실제 input_tokens × $0.042 / 1,000,000. Jev 1.13의 출력 토큰은 무료. 알 수 없는 모델/사용량은 확인 불가로 표시한다.
- 원화 예상 비용 = USD × 1,388.1. 2026-09-18 고정 참고 환율이며 실시간 환율이 아니다. 세금·결제 수수료는 제외한다.
- 직접 UI 조작의 JEV 비용은 0이다. 카드가 직접 선택으로 갱신되면 처리 과정도 해당 직접 선택을 나타낸다. 대화 전체 누적 청구액은 아니다.
- 기존 저장 대화에 측정 정보가 없으면 — 또는 확인 불가로 표시한다. 새 요청부터 시간과 비용이 저장된다.

출처: [공식 모델 단가](https://docs.typesafe.ai/models), [기준 환율](https://api.frankfurter.dev/v1/2026-09-18?base=USD&symbols=KRW).

## 검증 재현

`npm test`는 로컬 데이터/액션/비용 계산을 검사한다. 서버 실행 후 `npm run test:semantic`은 실제 JEV로 위 문장과 문맥 전환 30개를 검사한다(유료 API 호출). 2026-09-21 실행에서 30/30 통과했으며 `tests/semantic-report.json`에 결과가 있다. 확률적 판단이므로 모든 표현에 대한 보장은 아니다.
