import React from "react";
import {
  Box, Chip, Typography, CircularProgress, IconButton, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell,
} from "@material-ui/core";
import { useTheme, fade } from "@material-ui/core/styles";
import ViewModuleIcon from "@material-ui/icons/ViewModule";
import ViewListIcon from "@material-ui/icons/ViewList";
import CloseIcon from "@material-ui/icons/Close";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import InterviewFeedCard from "./InterviewFeedCard";
import { SURVEY_FILTERABLE_STATUSES, statusMeta } from "./surveyStatus";
import { surveyPalette } from "./surveyTheme";
import { fmtAgo } from "./surveyUtils";

function hqInterviewUrl(hqBaseUrl, interviewId) {
  if (!hqBaseUrl || !interviewId) return null;
  return `${String(hqBaseUrl).replace(/\/$/, "")}/Interview/Review/${interviewId}`;
}

function FeedTable({ interviews, theme, hqBaseUrl, formatMessage }) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const pal = surveyPalette(theme);
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{t("survey.dashboard.interviewCol", "Interview")}</TableCell>
          <TableCell>{t("survey.dashboard.statusCol", "Status")}</TableCell>
          <TableCell>{t("survey.dashboard.enumerator", "Enumerator")}</TableCell>
          <TableCell align="right">{t("survey.dashboard.errorsCol", "Errors")}</TableCell>
          <TableCell align="right">{t("survey.dashboard.changed", "changed")}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {interviews.map((iv) => {
          const meta = statusMeta(iv.status, theme);
          const link = hqInterviewUrl(hqBaseUrl, iv.interviewId);
          return (
            <TableRow key={iv.interviewId} hover>
              <TableCell>
                {iv.interviewKey || (iv.interviewId ? iv.interviewId.slice(0, 8) : "—")}
                {link ? (
                  <Tooltip title={t("survey.dashboard.openInHq", "Open in HQ")}>
                    <IconButton size="small" href={link} target="_blank" rel="noopener noreferrer" style={{ padding: 2, marginLeft: 4 }}>
                      <OpenInNewIcon style={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </TableCell>
              <TableCell>
                <Chip size="small" label={meta.label} style={{ background: meta.color, color: theme.palette.getContrastText(meta.color) }} />
              </TableCell>
              <TableCell>
                <Typography variant="body2">{iv.responsibleName || "—"}</Typography>
                {iv.supervisorName ? <Typography variant="caption" color="textSecondary">{iv.supervisorName}</Typography> : null}
              </TableCell>
              <TableCell align="right">{iv.errorsCount ? <Chip size="small" label={iv.errorsCount} style={{ background: fade(pal.error, 0.18) }} /> : 0}</TableCell>
              <TableCell align="right"><Typography variant="caption">{fmtAgo(iv.statusChangedAt) || "—"}</Typography></TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Scrollable live feed: status filter chips, an active-filter indicator, a
// cards/table view toggle, and the interview list itself.
function InterviewFeed({
  interviews = [], loading = false, statusFilter, onStatusFilter,
  responsibleFilter, onClearResponsible, fromDate, onClearFromDate,
  hqBaseUrl, formatMessage, view = "cards", onViewChange,
}) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const hasActiveFilter = !!statusFilter || !!responsibleFilter || !!fromDate;
  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" alignItems="center" style={{ marginBottom: 4 }}>
        <Tooltip title={t("survey.dashboard.cardsView", "Cards")}>
          <IconButton size="small" color={view === "cards" ? "primary" : "default"} onClick={() => onViewChange && onViewChange("cards")}>
            <ViewModuleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("survey.dashboard.tableView", "Table")}>
          <IconButton size="small" color={view === "table" ? "primary" : "default"} onClick={() => onViewChange && onViewChange("table")}>
            <ViewListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {/* status filter chips — 4 per row, equal width */}
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 8 }}>
        <Chip
          size="small"
          label={t("survey.dashboard.all", "All")}
          color={!statusFilter ? "primary" : "default"}
          onClick={() => onStatusFilter && onStatusFilter(null)}
          style={{ width: "100%" }}
        />
        {SURVEY_FILTERABLE_STATUSES.map((s) => {
          const m = statusMeta(s, theme);
          const active = statusFilter === s;
          return (
            <Tooltip key={s} title={m.label}>
              <Chip
                size="small"
                label={m.label}
                onClick={() => onStatusFilter && onStatusFilter(active ? null : s)}
                style={active
                  ? { width: "100%", background: m.color, color: theme.palette.getContrastText(m.color) }
                  : { width: "100%", borderColor: m.color, color: m.color }}
                variant={active ? "default" : "outlined"}
              />
            </Tooltip>
          );
        })}
      </Box>

      {(responsibleFilter || fromDate) ? (
        <Box mb={1} display="flex" style={{ gap: 6, flexWrap: "wrap" }}>
          {responsibleFilter ? (
            <Chip size="small" color="primary" label={`${t("survey.dashboard.enumerator", "Enumerator")}: ${responsibleFilter}`} onDelete={onClearResponsible} deleteIcon={<CloseIcon />} />
          ) : null}
          {fromDate ? (
            <Chip size="small" color="primary" variant="outlined" label={`${t("survey.dashboard.submittedSince", "Submitted since")} ${fromDate}`} onDelete={onClearFromDate} deleteIcon={<CloseIcon />} />
          ) : null}
        </Box>
      ) : null}

      <Box style={{ maxHeight: 560, overflow: "auto", paddingRight: 4 }}>
        {loading && !interviews.length ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></Box>
        ) : null}
        {!loading && !interviews.length ? (
          <Typography variant="body2" color="textSecondary">
            {hasActiveFilter
              ? t("survey.dashboard.noInterviewsFiltered", "No interviews match this filter in the synced sample.")
              : t("survey.dashboard.noInterviews", "No interviews to show.")}
          </Typography>
        ) : null}
        {interviews.length ? (
          view === "table"
            ? <FeedTable interviews={interviews} theme={theme} hqBaseUrl={hqBaseUrl} formatMessage={formatMessage} />
            : interviews.map((iv) => (
              <InterviewFeedCard key={iv.interviewId} interview={iv} hqBaseUrl={hqBaseUrl} formatMessage={formatMessage} />
            ))
        ) : null}
      </Box>
    </Box>
  );
}

export default InterviewFeed;
