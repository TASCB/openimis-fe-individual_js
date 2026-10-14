const DAY_MS = 86400000;

export const toTime = (iso) => new Date(`${iso}T00:00:00`).getTime();

export const fmtDay = (time, withYear = false) => new Date(time).toLocaleDateString(undefined, withYear
  ? { day: "numeric", month: "short", year: "numeric" }
  : { day: "numeric", month: "short" });

export const PIPELINE_KEYS = ["inProgress", "awaitingSupervisor", "awaitingHq", "approved", "rejected"];
export const MOVEMENT_KEYS = ["completed", "supervisorApproved", "hqApproved", "rejected"];

export function pipelineGroups(s) {
  return {
    inProgress: Math.max(0, (s.inProgress || 0) - (s.rejectedBySupervisor || 0)),
    awaitingSupervisor: s.completed || 0,
    awaitingHq: (s.approvedBySupervisor || 0) + (s.sentToCapi || 0),
    approved: s.approvedByHq || 0,
    rejected: (s.rejectedBySupervisor || 0) + (s.rejectedByHq || 0),
  };
}

function reached(s) {
  return {
    completed: s.cumulativeCompleted || 0,
    supervisorApproved: (s.approvedBySupervisor || 0) + (s.sentToCapi || 0) + (s.approvedByHq || 0),
    hqApproved: s.approvedByHq || 0,
    rejected: (s.rejectedBySupervisor || 0) + (s.rejectedByHq || 0),
  };
}

export function inPeriod(history, periodDays) {
  if (!periodDays) return history;
  const start = Date.now() - periodDays * DAY_MS;
  return history.filter((s) => toTime(s.date) >= start);
}

export function movements(history, periodDays) {
  const start = periodDays ? Date.now() - periodDays * DAY_MS : -Infinity;
  const out = [];
  for (let i = 1; i < history.length; i += 1) {
    const cur = history[i];
    const t = toTime(cur.date);
    if (t >= start) {
      const prev = history[i - 1];
      const a = reached(prev);
      const b = reached(cur);
      const days = Math.max(1, Math.round((t - toTime(prev.date)) / DAY_MS));
      const row = { t, from: toTime(prev.date), days };
      MOVEMENT_KEYS.forEach((k) => {
        const total = Math.max(0, b[k] - a[k]);
        row[`${k}Total`] = total;
        row[k] = Math.round(total / days);
      });
      out.push(row);
    }
  }
  return out;
}

export function lastChange(history) {
  for (let i = history.length - 1; i > 0; i -= 1) {
    const a = pipelineGroups(history[i - 1]);
    const b = pipelineGroups(history[i]);
    if (PIPELINE_KEYS.some((k) => a[k] !== b[k])) {
      const t = toTime(history[i].date);
      return { t, days: Math.floor((Date.now() - t) / DAY_MS) };
    }
  }
  return null;
}
