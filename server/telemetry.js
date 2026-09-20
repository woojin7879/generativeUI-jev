// Public list price and a dated reference FX quote; estimates, not invoices.
export const fx = {
  rate: 1388.1,
  date: "2026-09-18",
  source: "https://api.frankfurter.dev/v1/2026-09-18?base=USD&symbols=KRW",
};
export function estimateCost(usage, model) {
  const tokens = usage?.input_tokens;
  const supported = model === "jev-1.13.0";
  const usd =
    supported && Number.isFinite(tokens) && tokens >= 0
      ? (tokens * 0.042) / 1_000_000
      : null;
  return {
    usd,
    krw: usd === null ? null : usd * fx.rate,
    inputUsdPerMillion: supported ? 0.042 : null,
    outputUsdPerMillion: supported ? 0 : null,
    fx,
    source: "https://docs.typesafe.ai/models",
    verifiedAt: "2026-09-21",
  };
}
