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
import InterviewFeedCard, { StatusBadge } from "./InterviewFeedCard";
import {
  STATUS_GROUPS, REJECTED_SUBGROUPS, isRejectedFilter, toneColors,
} from "./surveyStatus";
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
                <StatusBadge status={iv.status} t={t} />
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

function FilterChip({
  label, dot, active, subtle, onClick, theme,
}) {
  const ink = subtle ? theme.palette.error.dark : theme.palette.primary.dark;
  return (
    <Chip
      size="small"
      label={label}
      onClick={onClick}
      icon={dot ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#fff" : dot, marginLeft: 8 }} /> : undefined}
      style={{
        borderRadius: 4,
        height: 28,
        fontSize: "0.78rem",
        fontWeight: active ? 600 : 400,
        border: `1px solid ${active ? ink : theme.palette.divider}`,
        background: active ? ink : theme.palette.background.paper,
        color: active ? theme.palette.primary.contrastText : theme.palette.text.primary,
      }}
    />
  );
}

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
      <Box display="flex" alignItems="flex-start" style={{ gap: 8, marginBottom: 12 }}>
        <Box display="flex" style={{ gap: 6, flexWrap: "wrap", flex: 1 }}>
          <FilterChip
            theme={theme}
            label={t("survey.dashboard.all", "All")}
            active={!statusFilter}
            onClick={() => onStatusFilter && onStatusFilter(null)}
          />
          {STATUS_GROUPS.map((g) => {
            const active = g.key === "rejected" ? isRejectedFilter(statusFilter) : statusFilter === g.key;
            return (
              <FilterChip
                key={g.key}
                theme={theme}
                label={t(`survey.dashboard.group.${g.key}`, g.label)}
                dot={toneColors(g.tone, theme).dot}
                active={active}
                onClick={() => onStatusFilter && onStatusFilter(active ? null : g.key)}
              />
            );
          })}
          {isRejectedFilter(statusFilter) ? REJECTED_SUBGROUPS.map((g) => {
            const active = statusFilter === g.key;
            return (
              <FilterChip
                key={g.key}
                theme={theme}
                label={t(`survey.dashboard.group.${g.key}`, g.label)}
                active={active}
                subtle
                onClick={() => onStatusFilter && onStatusFilter(active ? "rejected" : g.key)}
              />
            );
          }) : null}
        </Box>
        <Box display="flex" style={{ flexShrink: 0 }}>
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
