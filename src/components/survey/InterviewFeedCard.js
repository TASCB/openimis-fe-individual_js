import React from "react";
import {
  Box, Typography, Button, Tooltip,
} from "@material-ui/core";
import { useTheme, fade, darken } from "@material-ui/core/styles";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import { statusGroup, feedStatusLabel, toneColors } from "./surveyStatus";
import { surveyPalette } from "./surveyTheme";
import { fmtAgo, paaLabel } from "./surveyUtils";

export function StatusBadge({ status, t }) {
  const theme = useTheme();
  const { fg } = toneColors(statusGroup(status)?.tone, theme);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 4,
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: fade(fg, 0.12),
        color: darken(fg, 0.35),
      }}
    >
      {feedStatusLabel(status, t)}
    </span>
  );
}

function InterviewFeedCard({ interview, hqBaseUrl, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const hqLink = hqBaseUrl && interview.interviewId
    ? `${hqBaseUrl.replace(/\/$/, "")}/Interview/Review/${interview.interviewId}`
    : null;
  const paa = interview.questionnaireTitle ? paaLabel({ title: interview.questionnaireTitle }) : null;
  return (
    <Box
      style={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 10,
        background: pal.paper,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" style={{ gap: 8 }}>
        <Typography style={{ fontWeight: 700, fontSize: "0.95rem", color: pal.primaryDark }}>
          {interview.interviewKey || (interview.interviewId ? interview.interviewId.slice(0, 8) : "—")}
        </Typography>
        <StatusBadge status={interview.status} t={t} />
      </Box>
      <Box display="flex" alignItems="center" mt={0.75} style={{ gap: 6, flexWrap: "wrap", color: pal.textSecondary }}>
        <PersonOutlineIcon style={{ fontSize: 15 }} />
        <Typography variant="caption" style={{ color: theme.palette.text.primary }}>{interview.responsibleName || "—"}</Typography>
        {interview.supervisorName ? <Typography variant="caption">· {interview.supervisorName}</Typography> : null}
        {interview.errorsCount ? (
          <Tooltip title={t("survey.dashboard.errors", "Validation errors")}>
            <Box display="flex" alignItems="center" style={{ color: pal.error, gap: 2 }}>
              <ErrorOutlineIcon style={{ fontSize: 14 }} />
              <Typography variant="caption">{interview.errorsCount}</Typography>
            </Box>
          </Tooltip>
        ) : null}
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5} style={{ gap: 8 }}>
        <Typography variant="caption" color="textSecondary">
          {paa ? `${paa} · ` : ""}
          {t("survey.dashboard.changed", "changed")} {fmtAgo(interview.statusChangedAt) || "—"}
        </Typography>
        {hqLink ? (
          <Button
            size="small"
            href={hqLink}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNewIcon style={{ fontSize: 14 }} />}
            style={{ textTransform: "none", fontWeight: 600, color: pal.primaryDark, padding: "2px 6px" }}
          >
            {t("survey.dashboard.openInHq", "Open in HQ")}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}

export default InterviewFeedCard;
