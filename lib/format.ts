export function formatMs(ms: number) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${String(r).padStart(2, "0")}s` : `${r}s`;
}

export function sanitizeCodeInput(val: string): string {
  return val
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[`"'“”‘’\s]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}
