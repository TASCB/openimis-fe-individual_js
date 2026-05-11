// Shared formatting helpers for the Survey Monitoring dashboard.

export function fmtInt(n) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString();
}

export function pctStr(a, b, decimals = 0) {
  if (!b) return "—";
  const v = (Number(a) / Number(b)) * 100;
  if (Number.isNaN(v)) return "—";
  return `${v.toFixed(v < 10 && decimals === 0 ? 1 : decimals)}%`;
}

export function fmtAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
}

export function fmtShortDate(iso) {
  if (!iso) return "";
  const s = String(iso);
  return s.length >= 10 ? s.slice(5) : s; // "MM-DD"
}

// "DODOSO LA KAYA - RM4-IFAKARATC" -> "IFAKARATC" ; leaves other titles untouched.
export function paaLabel(q) {
  if (!q) return "";
  const title = String(q.title || q.identity || "").trim();
  const stripped = title.replace(/^DODOSO\s+LA\s+KAYA\s*[-–—]?\s*(RM4\s*[-–—]?\s*)?/i, "").trim();
  return stripped || title;
}

