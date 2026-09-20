const endpoint = "https://api.typesafe.ai/v1/systemone";
const ttlMs = 300_000;
let baseline = null;
let pending = null;
let lastAttempt = 0;
// Deliberately omit credentials and user input. Only auth rejection is a valid sample.
export function refreshNetworkBaseline() {
  if (process.env.JEV_NETWORK_PROBE === "0") return Promise.resolve(null);
  if (pending) return pending;
  if (Date.now() - lastAttempt < ttlMs) return Promise.resolve(baseline);
  lastAttempt = Date.now();
  pending = (async () => {
    const samples = [];
    try {
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "jev-latest",
            state: "network calibration",
            questions: {
              probe: {
                type: "choice",
                instructions: "Calibration",
                criteria: { yes: "Yes", no: "No" },
              },
            },
          }),
          signal: AbortSignal.timeout(3000),
        });
        await res.arrayBuffer();
        if (res.status !== 401 && res.status !== 403) return null;
        samples.push(performance.now() - start);
      }
      baseline = {
        ms: [...samples].sort((a, b) => a - b)[1],
        samplesMs: samples,
        measuredAt: new Date().toISOString(),
        method: "unauthenticated-post-median",
        sampleCount: 3,
      };
      return baseline;
    } catch {
      return null;
    }
  })().finally(() => {
    pending = null;
  });
  return pending;
}
export function splitTiming(
  roundtripMs,
  reference = baseline,
  now = Date.now(),
) {
  if (
    !reference ||
    now - Date.parse(reference.measuredAt) > ttlMs ||
    !Number.isFinite(reference.ms) ||
    reference.ms < 0
  )
    return null;
  const difference = roundtripMs - reference.ms;
  return {
    networkMs: reference.ms,
    processingMs: difference >= 0 ? difference : null,
    baseline: reference,
    status: difference >= 0 ? "estimated" : "baseline-exceeds-request",
  };
}
