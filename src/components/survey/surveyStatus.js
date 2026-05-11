import { statusColor, surveyPalette } from "./surveyTheme";

// Human label per Survey Solutions interview status.
export const SURVEY_STATUS_LABEL = {
  Restored: "Restored",
  Created: "Created",
  SupervisorAssigned: "With supervisor (assign)",
  InterviewerAssigned: "In progress",
  ReadyForInterview: "Ready",
  RejectedBySupervisor: "Rejected by supervisor",
  SentToCapital: "Sent to HQ",
  Completed: "Completed",
  ApprovedBySupervisor: "Approved by supervisor",
  RejectedByHeadquarters: "Rejected by HQ",
  ApprovedByHeadquarters: "Approved by HQ",
  Deleted: "Deleted",
};

// Returns { color, label } for a status. Pass the MUI theme so the colour follows branding.
export function statusMeta(status, theme) {
  const pal = surveyPalette(theme);
  return {
    color: statusColor(status, pal),
    label: SURVEY_STATUS_LABEL[status] || status || "Unknown",
  };
}

// Statuses worth surfacing as filter chips on the dashboard.
export const SURVEY_FILTERABLE_STATUSES = [
  "InterviewerAssigned",
  "Completed",
  "ApprovedBySupervisor",
  "ApprovedByHeadquarters",
  "RejectedBySupervisor",
  "RejectedByHeadquarters",
  "SentToCapital",
];
