import { lighten, darken } from "@material-ui/core/styles";

export function surveyPalette(theme) {
  const p = (theme && theme.palette) || {};
  const primary = (p.primary && p.primary.main) || "#006273";
  const primaryLight = (p.primary && p.primary.light) || lighten(primary, 0.4);
  const primaryDark = (p.primary && p.primary.dark) || darken(primary, 0.25);
  return {
    primary,
    primaryLight,
    primaryDark,
    error: (p.error && p.error.main) || "#c62828",
    warning: (p.warning && p.warning.main) || "#ef6c00",
    success: (p.success && p.success.main) || "#2e7d32",
    grey: (p.grey && p.grey[500]) || "#9e9e9e",
    greyLight: (p.grey && p.grey[300]) || "#e0e0e0",
    greyBg: (p.grey && p.grey[100]) || "#f5f5f5",
    textSecondary: (p.text && p.text.secondary) || "#757575",
    paper: (p.background && p.background.paper) || "#fff",
  };
}

export function statusColor(status, pal) {
  switch (status) {
    case "ApprovedByHeadquarters":
      return pal.primaryDark;
    case "ApprovedBySupervisor":
    case "SentToCapi":
    case "SentToCapital":
      return pal.primary;
    case "Completed":
      return pal.primaryLight;
    case "RejectedBySupervisor":
    case "RejectedByHeadquarters":
      return pal.error;
    case "InterviewerAssigned":
    case "ReadyForInterview":
      return pal.grey;
    case "Created":
    case "Restored":
    case "SupervisorAssigned":
    case "Deleted":
      return pal.greyLight;
    default:
      return pal.grey;
  }
}

export function severityColor(severity, pal) {
  switch (severity) {
    case "ok": return pal.success;
    case "warn": return pal.warning;
    case "bad": return pal.error;
    default: return pal.primary;
  }
}
