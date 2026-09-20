// A bounded single-process replay guard; no prompts or keys written to disk.
export function createRequestCache({
  ttlMs = 300_000,
  maxEntries = 200,
  now = Date.now,
} = {}) {
  const entries = new Map();
  return function once(id, payload, run) {
    if (!id) return run();
    const time = now();
    for (const [key, entry] of entries)
      if (entry.expires <= time && entry.done) entries.delete(key);
    const fingerprint = JSON.stringify(payload);
    const existing = entries.get(id);
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw Object.assign(
          new Error("같은 요청 ID에 다른 내용이 전달됐어요."),
          { status: 409 },
        );
      return existing.promise;
    }
    if (entries.size >= maxEntries) {
      const completed = [...entries].find(([, entry]) => entry.done);
      if (completed) entries.delete(completed[0]);
      else
        throw Object.assign(
          new Error("처리 중인 요청이 많아요. 잠시 후 다시 시도해 주세요."),
          { status: 429 },
        );
    }
    const entry = { fingerprint, expires: time + ttlMs, done: false };
    entry.promise = Promise.resolve()
      .then(run)
      .finally(() => {
        entry.done = true;
      });
    entries.set(id, entry);
    return entry.promise;
  };
}
