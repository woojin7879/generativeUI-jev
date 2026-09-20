export async function api(url, body) {
  const start = performance.now();
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "연결에 실패했어요.");
  if (data.trace) data.trace.totalMs = performance.now() - start;
  return data;
}
export const defaults = (date) => ({
  service: "meals",
  secondary: "none",
  scope: "day",
  date,
  meal: "lunch",
  metric: "all",
  leaveView: "apply",
  leaveKind: "full",
});
