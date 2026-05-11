import React from "react";
import {
  Card, CardContent, Typography, Box, Chip, Button, Tooltip,
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import PersonIcon from "@material-ui/icons/Person";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import { statusMeta } from "./surveyStatus";
import { surveyPalette } from "./surveyTheme";
import { fmtAgo } from "./surveyUtils";

// One interview "card" in the live feed: status, who, where, quick links.
function InterviewFeedCard({ interview, hqBaseUrl, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const pal = surveyPalette(theme);
  const meta = statusMeta(interview.status, theme);
  const hqLink = hqBaseUrl && interview.interviewId
    ? `${hqBaseUrl.replace(/\/$/, "")}/Interview/Review/${interview.interviewId}`
    : null;
  return (
    <Card variant="outlined" style={{ borderLeft: `4px solid ${meta.color}`, marginBottom: 8 }}>
      <CardContent style={{ padding: "10px 14px" }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
            {interview.interviewKey || (interview.interviewId ? interview.interviewId.slice(0, 8) : "—")}
          </Typography>
          <Chip size="small" label={meta.label} style={{ background: meta.color, color: theme.palette.getContrastText ? theme.palette.getContrastText(meta.color) : "#fff" }} />
        </Box>
        <Box display="flex" alignItems="center" mt={0.5} style={{ gap: 6, flexWrap: "wrap" }}>
          <PersonIcon style={{ fontSize: 14, color: pal.textSecondary }} />
          <Typography variant="caption">{interview.responsibleName || "—"}</Typography>
          {interview.supervisorName ? (
            <Typography variant="caption" color="textSecondary">· {interview.supervisorName}</Typography>
          ) : null}
          {interview.errorsCount ? (
            <Tooltip title={t("survey.dashboard.errors", "Validation errors")}>
              <Box display="flex" alignItems="center" style={{ color: pal.error }}>
                <ErrorOutlineIcon style={{ fontSize: 14 }} />
                <Typography variant="caption">{interview.errorsCount}</Typography>
              </Box>
            </Tooltip>
          ) : null}
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
          <Typography variant="caption" color="textSecondary">
            {interview.questionnaireTitle ? `${interview.questionnaireTitle} · ` : ""}
            {t("survey.dashboard.changed", "changed")} {fmtAgo(interview.statusChangedAt) || "—"}
            {interview.durationMinutes ? ` · ${interview.durationMinutes}m` : ""}
          </Typography>
          {hqLink ? (
            <Button size="small" color="primary" href={hqLink} target="_blank" rel="noopener noreferrer">
              {t("survey.dashboard.openInHq", "Open in HQ")}
            </Button>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}

export default InterviewFeedCard;
