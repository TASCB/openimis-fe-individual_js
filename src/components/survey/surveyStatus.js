import { statusColor, surveyPalette } from "./surveyTheme";

export const SURVEY_STATUS_LABEL = {
  Restored: "Restored",
  Created: "Created",
  SupervisorAssigned: "With supervisor (assign)",
  InterviewerAssigned: "In progress",
  ReadyForInterview: "Ready",
  RejectedBySupervisor: "Rejected by supervisor",
  SentToCapi: "Sent to HQ",
  SentToCapital: "Sent to HQ",
  Completed: "Completed",
  ApprovedBySupervisor: "Approved by supervisor",
  RejectedByHeadquarters: "Rejected by HQ",
  ApprovedByHeadquarters: "Approved by HQ",
  Deleted: "Deleted",
};

export function statusMeta(status, theme) {
  const pal = surveyPalette(theme);
  return {
    color: statusColor(status, pal),
    label: SURVEY_STATUS_LABEL[status] || status || "Unknown",
  };
}

export const STATUS_GROUPS = [
  { key: "inProgress", label: "In progress", tone: "neutral", statuses: ["Created", "SupervisorAssigned", "InterviewerAssigned", "ReadyForInterview", "Restored", "Restarted"] },
  { key: "awaitingSupervisor", label: "Awaiting supervisor", tone: "warn", statuses: ["Completed"] },
  { key: "awaitingHq", label: "Awaiting HQ", tone: "warn", statuses: ["ApprovedBySupervisor", "SentToCapi"] },
  { key: "approved", label: "Approved", tone: "positive", statuses: ["ApprovedByHeadquarters"] },
  { key: "rejected", label: "Rejected", tone: "bad", statuses: ["RejectedBySupervisor", "RejectedByHeadquarters"] },
];

export const REJECTED_SUBGROUPS = [
  { key: "rejectedSup", label: "by supervisor", statuses: ["RejectedBySupervisor"] },
  { key: "rejectedHq", label: "by HQ", statuses: ["RejectedByHeadquarters"] },
];

export function isRejectedFilter(filter) {
  return filter === "rejected" || REJECTED_SUBGROUPS.some((g) => g.key === filter);
}

export function statusesForFilter(filter) {
  const g = STATUS_GROUPS.find((x) => x.key === filter) || REJECTED_SUBGROUPS.find((x) => x.key === filter);
  return g ? g.statuses.join(",") : undefined;
}

export function statusGroup(status) {
  return STATUS_GROUPS.find((g) => g.statuses.includes(status)) || null;
}

export function toneColors(tone, theme) {
  const pal = surveyPalette(theme);
  switch (tone) {
    case "bad": return { fg: pal.error, dot: pal.error };
    case "warn": return { fg: pal.warning, dot: pal.warning };
    case "positive": return { fg: pal.primary, dot: null };
    default: return { fg: pal.grey, dot: null };
  }
}

export function feedStatusLabel(status, t = (id, fallback) => fallback) {
  const g = statusGroup(status);
  if (!g) return SURVEY_STATUS_LABEL[status] || status || "Unknown";
  const label = t(`survey.dashboard.group.${g.key}`, g.label);
  const sub = REJECTED_SUBGROUPS.find((x) => x.statuses.includes(status));
  return sub ? `${label} · ${t(`survey.dashboard.group.${sub.key}`, sub.label)}` : label;
}
