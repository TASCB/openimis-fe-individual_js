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
  responsibleFilter, onClearResponsible, supervisorFilter, onClearSupervisor, fromDate, onClearFromDate,
  hqBaseUrl, formatMessage, view = "cards", onViewChange, listMaxHeight = 560,
}) {
  const t = (id, fallback) => (formatMessage ? (formatMessage(id) === id ? fallback : formatMessage(id)) : fallback);
  const theme = useTheme();
  const hasActiveFilter = !!statusFilter || !!responsibleFilter || !!supervisorFilter || !!fromDate;
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <Typography variant="caption" color="textSecondary">
          {t("survey.dashboard.feedHint", "Recent interview activity from the synced sample")}
        </Typography>
        <Tooltip title={t("survey.dashboard.cardsView", "Cards")}>
          <IconButton
            size="small"
            color={view === "cards" ? "primary" : "default"}
            onClick={() => onViewChange && onViewChange("cards")}
            aria-label={t("survey.dashboard.cardsView", "Cards")}
            aria-pressed={view === "cards"}
          >
            <ViewModuleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t("survey.dashboard.tableView", "Table")}>
          <IconButton
            size="small"
            color={view === "table" ? "primary" : "default"}
            onClick={() => onViewChange && onViewChange("table")}
            aria-label={t("survey.dashboard.tableView", "Table")}
            aria-pressed={view === "table"}
          >
            <ViewListIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {/* status filter chips — 4 per row, equal width */}
      <Box style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 6, marginBottom: 10 }}>
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

      {(responsibleFilter || supervisorFilter || fromDate) ? (
        <Box mb={1} display="flex" style={{ gap: 6, flexWrap: "wrap" }}>
          {responsibleFilter ? (
            <Chip size="small" color="primary" label={`${t("survey.dashboard.enumerator", "Enumerator")}: ${responsibleFilter}`} onDelete={onClearResponsible} deleteIcon={<CloseIcon />} />
          ) : null}
          {supervisorFilter ? (
            <Chip size="small" color="primary" label={`${t("survey.dashboard.supervisor", "Supervisor")}: ${supervisorFilter}`} onDelete={onClearSupervisor} deleteIcon={<CloseIcon />} />
          ) : null}
          {fromDate ? (
            <Chip size="small" color="primary" variant="outlined" label={`${t("survey.dashboard.submittedSince", "Submitted since")} ${fromDate}`} onDelete={onClearFromDate} deleteIcon={<CloseIcon />} />
          ) : null}
        </Box>
      ) : null}

      <Box style={{ maxHeight: listMaxHeight, overflow: "auto", paddingRight: 4, borderTop: `1px solid ${theme.palette.divider}`, paddingTop: 10 }}>
        {loading && !interviews.length ? (
          <Box display="flex" justifyContent="center" p={3}><CircularProgress size={28} /></Box>
        ) : null}
        {!loading && !interviews.length ? (
          <Box p={2}>
            <Typography variant="body2" color="textSecondary">
              {hasActiveFilter
                ? t("survey.dashboard.noInterviewsFiltered", "No interviews match this filter in the synced sample.")
                : t("survey.dashboard.noInterviews", "No interviews to show.")}
            </Typography>
          </Box>
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
