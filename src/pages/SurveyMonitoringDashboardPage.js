import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper, Grid, Typography, Box, Button, FormControlLabel, Switch, CircularProgress,
  Select, MenuItem, FormControl, TextField, Tabs, Tab, Tooltip,
} from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import { makeStyles, fade } from "@material-ui/core/styles";
import SyncIcon from "@material-ui/icons/Sync";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import {
  Helmet, useModulesManager, useTranslations, useToast,
} from "@openimis/fe-core";

import {
  fetchSurveyDashboard, fetchSurveyInterviews, refreshSurveyDashboard, fetchAvailableQuestionnaires,
} from "../actions";
import { INDIVIDUAL_MODULE_NAME, RIGHT_SURVEY_DASHBOARD } from "../constants";
import PipelineStrip from "../components/survey/PipelineStrip";
import KpiTile from "../components/survey/KpiTile";
import InterviewFeed from "../components/survey/InterviewFeed";
import EnumeratorLeaderboard from "../components/survey/EnumeratorLeaderboard";
import SupervisorLeaderboard from "../components/survey/SupervisorLeaderboard";
import PipelineHistoryChart from "../components/survey/PipelineHistoryChart";
import StageMovementChart from "../components/survey/StageMovementChart";
import {
  inPeriod, movements, trendStatus, fmtDay,
} from "../components/survey/surveyTrends";
import ActivityHeatmap from "../components/survey/ActivityHeatmap";
import { fmtInt, fmtDateTime, paaLabel } from "../components/survey/surveyUtils";
import { statusesForFilter, isRejectedFilter } from "../components/survey/surveyStatus";

const POLL_SECONDS = 30;

const useStyles = makeStyles((theme) => ({
  page: theme.page,

  surface: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    boxShadow: "none",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(3),
    flexWrap: "wrap",
    padding: theme.spacing(1, 0, 0),
    marginBottom: theme.spacing(3),
  },
  heroIntro: { flex: "1 1 420px", minWidth: 0 },
  heroTitle: { fontWeight: 700, color: theme.palette.primary.dark, marginBottom: theme.spacing(1) },
  heroSubtitle: { color: theme.palette.grey[600], maxWidth: 620 },
  syncedChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(2.5),
    fontSize: "0.78rem",
    color: theme.palette.grey[600],
  },
  syncedIcon: { fontSize: 18, color: theme.palette.grey[700] },
  heroControls: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2.5),
    flexWrap: "wrap",
    marginTop: theme.spacing(1),
  },
  autoRefreshLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
  },
  autoRefreshControl: { margin: 0 },
  syncBtn: {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
    fontWeight: 700,
    padding: theme.spacing(1.25, 2.25),
    borderRadius: 4,
    "&:hover": { backgroundColor: theme.palette.primary.main },
  },

  filterCard: {
    padding: theme.spacing(2, 2.5),
    marginBottom: theme.spacing(4),
    borderRadius: 4,
    backgroundColor: fade(theme.palette.primary.main, 0.03),
  },
  filterBar: {
    display: "flex",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  filterDivider: {
    alignSelf: "stretch",
    width: 1,
    backgroundColor: theme.palette.divider,
    margin: theme.spacing(0.5, 0.5),
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75),
  },
  filterGroupLabel: {
    color: theme.palette.grey[700],
    fontSize: "0.78rem",
    fontWeight: 600,
  },
  control: {
    height: 40,
    backgroundColor: theme.palette.background.paper,
  },
  filterField: { minWidth: 260, maxWidth: 360 },
  dateField: {
    width: 170,
    "& .MuiOutlinedInput-root": { height: 40, backgroundColor: theme.palette.background.paper },
  },
  periodRow: { display: "flex", alignItems: "center", gap: theme.spacing(1), flexWrap: "wrap" },
  quickBtn: {
    height: 40,
    textTransform: "none",
    borderRadius: 4,
    minWidth: 0,
    padding: theme.spacing(0, 2),
    borderColor: theme.palette.divider,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    "&:hover": { borderColor: theme.palette.primary.main, backgroundColor: fade(theme.palette.primary.main, 0.04) },
  },
  quickBtnActive: {
    borderColor: theme.palette.primary.dark,
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.dark,
    fontWeight: 600,
    "&:hover": { borderColor: theme.palette.primary.main, backgroundColor: theme.palette.primary.main },
  },
  filterStatus: {
    marginLeft: "auto",
    height: 40,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontSize: "0.82rem",
    color: theme.palette.grey[600],
    whiteSpace: "nowrap",
  },
  filterCount: { fontWeight: 600, color: theme.palette.primary.dark },
  clearBtn: { textTransform: "none", fontWeight: 600, color: theme.palette.primary.dark, minWidth: 0 },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: theme.spacing(2),
  },

  sectionHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5),
  },
  sectionTitle: { fontWeight: 700, color: theme.palette.text.primary, fontSize: "1.15rem" },
  sectionHint: { color: theme.palette.grey[600], fontSize: "0.8rem" },

  tabsBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2.5),
  },
  sampleNote: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    fontSize: "0.78rem",
    color: theme.palette.grey[600],
    cursor: "help",
  },
  tab: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    minWidth: 0,
    minHeight: 48,
  },

  panel: {
    padding: theme.spacing(2.5),
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  uniformPanel: { minHeight: 600 },
  panelTitle: { fontWeight: 700, color: theme.palette.text.primary, fontSize: "1.1rem", marginBottom: theme.spacing(0.5) },
  panelNote: { color: theme.palette.grey[600], fontSize: "0.78rem", marginTop: theme.spacing(0.25) },
  panelBody: {
    flex: 1,
    minHeight: 0,
    marginTop: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
  },
  scrollBody: { flex: 1, minHeight: 0, overflow: "auto", paddingRight: theme.spacing(0.5) },
  chartBody: { flex: 1, minHeight: 0, display: "flex", alignItems: "stretch" },

  rowMargin: { marginBottom: theme.spacing(3.5) },
  trendBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginBottom: theme.spacing(2),
  },
  trendHeadline: {
    fontSize: "0.95rem",
    color: theme.palette.text.primary,
  },
}));

function rejectionSeverity(rate) {
  if (rate == null) return "neutral";
  if (rate < 2) return "ok";
  if (rate < 8) return "warn";
  return "bad";
}

function mergeQuestionnaires(fromDashboard = [], fromHq = []) {
  const byId = new Map();
  (fromDashboard || []).forEach((q) => {
    if (q && q.identity) byId.set(q.identity, { identity: q.identity, id: q.id, title: q.title, version: q.version, count: q.count || 0 });
  });
  (fromHq || []).forEach((q) => {
    if (!q) return;
    const identity = q.identity || (q.id && q.version ? `${q.id}$${q.version}` : q.id);
    if (identity && !byId.has(identity)) byId.set(identity, { identity, id: q.id, title: q.title, version: q.version, count: 0 });
  });
  return Array.from(byId.values()).sort((a, b) => String(a.title || a.identity || "").localeCompare(String(b.title || b.identity || "")));
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function SurveyMonitoringDashboardPage() {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(INDIVIDUAL_MODULE_NAME, modulesManager);
  const t = (id, fallback) => {
    const v = formatMessage(id);
    return v === id ? (fallback ?? id) : v;
  };
  const dispatch = useDispatch();
  const toast = useToast();
  const rights = useSelector((s) => s.core?.user?.i_user?.rights || []);
  const canView = rights.includes(RIGHT_SURVEY_DASHBOARD);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [responsibleFilter, setResponsibleFilter] = useState(null);
  const [supervisorFilter, setSupervisorFilter] = useState(null);
  const [questionnaireFilter, setQuestionnaireFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [customPeriod, setCustomPeriod] = useState(false);
  const [feedView, setFeedView] = useState("table");
  const [analyticsTab, setAnalyticsTab] = useState(0);
  const [trendPeriod, setTrendPeriod] = useState(0);
  const intervalRef = useRef(null);
  const didMount = useRef(false);

  const dashboard = useSelector((s) => s.individual?.surveyDashboard);
  const fetchingDashboard = useSelector((s) => s.individual?.fetchingSurveyDashboard);
  const errorDashboard = useSelector((s) => s.individual?.errorSurveyDashboard);
  const interviews = useSelector((s) => s.individual?.surveyInterviews) || [];
  const fetchingInterviews = useSelector((s) => s.individual?.fetchingSurveyInterviews);
  const refreshing = useSelector((s) => s.individual?.refreshingSurveyDashboard);
  const hqQuestionnaires = useSelector((s) => s.individual?.availableQuestionnaires) || [];

  const m = dashboard || {};
  const questionnaires = mergeQuestionnaires(m.questionnaires, hqQuestionnaires);
  const qid = questionnaireFilter || undefined;
  const fromDateArg = fromDate || undefined;

  const reloadFeed = () => dispatch(fetchSurveyInterviews({
    questionnaireId: qid,
    status: statusesForFilter(statusFilter),
    responsibleName: responsibleFilter || undefined,
    supervisorName: supervisorFilter || undefined,
    fromDate: fromDateArg,
    first: 80,
  }));
  const reloadAll = () => {
    dispatch(fetchSurveyDashboard(qid));
    reloadFeed();
  };

  useEffect(() => {
    if (!canView) return;
    reloadAll();
    didMount.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    if (m.questionnaires && m.questionnaires.length) return;
    if (hqQuestionnaires && hqQuestionnaires.length) return;
    dispatch(fetchAvailableQuestionnaires(null, null, null, true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, m.questionnaires]);

  useEffect(() => {
    if (didMount.current) reloadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, responsibleFilter, supervisorFilter, fromDate]);
  useEffect(() => {
    if (didMount.current) reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireFilter]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (canView && autoRefresh) intervalRef.current = setInterval(reloadAll, POLL_SECONDS * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, autoRefresh, statusFilter, responsibleFilter, supervisorFilter, fromDate, questionnaireFilter]);

  const onManualRefresh = async () => {
    const resp = await dispatch(refreshSurveyDashboard(qid));
    const r = resp?.payload?.data?.refreshSurveyDashboard;
    const gqlErr = resp?.payload?.errors?.[0]?.message;
    if (gqlErr) {
      toast.showError(`${t("survey.dashboard.syncFailed", "Sync failed")}: ${gqlErr}`);
    } else if (r && r.success === false) {
      toast.showError(`${t("survey.dashboard.syncFailed", "Sync failed")}: ${r.message || "?"}`);
    } else if (r) {
      const parts = [];
      if (r.totalCount != null) parts.push(`${t("survey.dashboard.hqReports", "HQ reports")} ${fmtInt(r.totalCount)} ${t("survey.dashboard.interviewsWord", "interviews")}`);
      parts.push(`${t("survey.dashboard.syncOk", "synced sample of")} ${fmtInt(r.seen ?? 0)}`);
      if (r.changed) parts.push(`${r.changed} ${t("survey.dashboard.statusChanges", "status changes")}`);
      toast.showSuccess(parts.join(" · "));
    }
    reloadAll();
  };

  const clearAllFilters = () => {
    setQuestionnaireFilter("");
    setFromDate("");
    setCustomPeriod(false);
    setStatusFilter(null);
    setResponsibleFilter(null);
    setSupervisorFilter(null);
  };

  const dashLoading = fetchingDashboard && !dashboard;
  const rejected = (m.rejectedBySupervisor || 0) + (m.rejectedByHq || 0);
  const dailySpark = (m.dailyProductivity || []).map((d) => ({ count: d.count || 0 }));
  const stages = m.approvalFunnel || [];
  const history = m.statusHistory || [];
  const trend = trendStatus(history);
  const activeFilterCount = [questionnaireFilter, fromDate, statusFilter, responsibleFilter, supervisorFilter].filter(Boolean).length;
  const periods = [
    { key: "today", label: t("survey.dashboard.today", "Today"), iso: isoDaysAgo(0) },
    { key: "yesterday", label: t("survey.dashboard.sinceYesterday", "Since yesterday"), iso: isoDaysAgo(1) },
    { key: "last7", label: t("survey.dashboard.last7", "Last 7 days"), iso: isoDaysAgo(7) },
    { key: "last30", label: t("survey.dashboard.last30", "Last 30 days"), iso: isoDaysAgo(30) },
  ];
  const activePeriod = customPeriod ? null : periods.find((p) => p.iso === fromDate)?.key;
  const showCustom = customPeriod || (!!fromDate && !activePeriod);
  const errorMsg = (() => {
    if (!errorDashboard) return null;
    if (typeof errorDashboard === "string") return errorDashboard;
    if (Array.isArray(errorDashboard)) return errorDashboard.map((e) => e?.message || e).join(" · ");
    return errorDashboard.message || errorDashboard.detail || JSON.stringify(errorDashboard);
  })();
  const isPermError = errorMsg && /unauthor|permission|forbidden/i.test(errorMsg);

  const SectionHead = ({ title, hint }) => (
    <div className={classes.sectionHead}>
      <Typography className={classes.sectionTitle}>{title}</Typography>
      {hint ? <Typography className={classes.sectionHint}>{hint}</Typography> : null}
    </div>
  );

  if (!canView) {
    return (
      <div className={classes.page}>
        <Helmet title={t("survey.dashboard.title", "Survey Solutions — Field Monitoring")} />
        <Paper className={classes.surface} style={{ padding: 24 }}>
          <Box display="flex" alignItems="center" style={{ gap: 12 }}>
            <LockOutlinedIcon color="action" />
            <Box>
              <Typography variant="h6" className={classes.heroTitle}>
                {t("survey.dashboard.permissionDeniedTitle", "Survey Monitoring is not available for your role")}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {t("survey.dashboard.permissionDeniedBody", "Ask an administrator to grant the “Survey Dashboard” right (953001) to your role.")}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <Helmet title={t("survey.dashboard.title", "Survey Solutions — Field Monitoring")} />

      <div className={classes.header}>
        <Box className={classes.heroIntro}>
          <Typography variant="h4" className={classes.heroTitle}>
            {t("survey.dashboard.pageTitle", "Field Monitoring")}
          </Typography>
          <Typography variant="body1" className={classes.heroSubtitle}>
            {t("survey.dashboard.subtitle", "A near-real-time operational view of interview progress, review backlogs, and field activity sourced from Survey Solutions HQ.")}
          </Typography>
          <span className={classes.syncedChip}>
            {fetchingDashboard ? (
              <CircularProgress size={14} aria-label={t("survey.dashboard.syncing", "Syncing dashboard")} />
            ) : (
              <SyncIcon className={classes.syncedIcon} />
            )}
            {t("survey.dashboard.lastPolled", "Last synced from HQ")}: {fmtDateTime(m.lastPolledAt)}
          </span>
        </Box>
        <div className={classes.heroControls}>
          <FormControlLabel
            className={classes.autoRefreshControl}
            labelPlacement="start"
            control={<Switch color="primary" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label={(
              <span className={classes.autoRefreshLabel}>
                <SyncIcon fontSize="small" />
                {t("survey.dashboard.autoRefresh", `Auto-refresh (${POLL_SECONDS}s)`)}
              </span>
            )}
          />
          <Button
            variant="contained"
            className={classes.syncBtn}
            startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            onClick={onManualRefresh}
            disabled={refreshing}
          >
            {t("survey.dashboard.refreshNow", "Sync now")}
          </Button>
        </div>
      </div>
      <Paper className={`${classes.surface} ${classes.filterCard}`}>
        <div className={classes.filterBar}>
          <div className={classes.filterGroup}>
            <span className={classes.filterGroupLabel}>{t("survey.dashboard.questionnaire", "PAA / Questionnaire")}</span>
            {questionnaires.length ? (
              <FormControl variant="outlined" size="small" className={classes.filterField}>
                <Select
                  className={classes.control}
                  value={questionnaireFilter}
                  displayEmpty
                  onChange={(e) => {
                    setStatusFilter(null);
                    setResponsibleFilter(null);
                    setSupervisorFilter(null);
                    setQuestionnaireFilter(e.target.value);
                  }}
                >
                  <MenuItem value="">{t("survey.dashboard.allQuestionnaires", "All PAAs / questionnaires")}</MenuItem>
                  {questionnaires.map((q) => (
                    <MenuItem key={q.identity} value={q.identity}>
                      {paaLabel(q)}
                      {q.version ? ` (v${q.version})` : ""}
                      {q.count ? `  · ${fmtInt(q.count)}` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="caption" color="textSecondary">
                {t("survey.dashboard.noQuestionnaires", "(no questionnaires available yet — sync from HQ)")}
              </Typography>
            )}
          </div>

          <div className={classes.filterDivider} />

          <div className={classes.filterGroup}>
            <span className={classes.filterGroupLabel}>{t("survey.dashboard.period", "Submitted")}</span>
            <div className={classes.periodRow}>
              {periods.map((p) => (
                <Button
                  key={p.key}
                  variant="outlined"
                  className={`${classes.quickBtn} ${activePeriod === p.key ? classes.quickBtnActive : ""}`.trim()}
                  onClick={() => {
                    setCustomPeriod(false);
                    setFromDate(activePeriod === p.key ? "" : p.iso);
                  }}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                variant="outlined"
                className={`${classes.quickBtn} ${showCustom ? classes.quickBtnActive : ""}`.trim()}
                onClick={() => {
                  if (showCustom) {
                    setCustomPeriod(false);
                    setFromDate("");
                  } else {
                    setCustomPeriod(true);
                  }
                }}
              >
                {t("survey.dashboard.customPeriod", "Custom…")}
              </Button>
              {showCustom ? (
                <TextField
                  variant="outlined"
                  size="small"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputProps={{ startAdornment: <span style={{ marginRight: 6, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{t("survey.dashboard.since", "Since")}</span> }}
                  className={classes.dateField}
                  autoFocus={customPeriod && !fromDate}
                />
              ) : null}
            </div>
          </div>

          <div className={classes.filterStatus}>
            {activeFilterCount ? (
              <>
                <span className={classes.filterCount}>
                  {activeFilterCount} {activeFilterCount === 1 ? t("survey.dashboard.filterActive", "filter active") : t("survey.dashboard.filtersActive", "filters active")}
                </span>
                <Button size="small" className={classes.clearBtn} onClick={clearAllFilters}>
                  {t("survey.dashboard.clearFilters", "Clear")}
                </Button>
              </>
            ) : t("survey.dashboard.noFilters", "No filters applied")}
          </div>
        </div>
      </Paper>

      {errorMsg ? (
        <MuiAlert severity={isPermError ? "warning" : "error"} variant="outlined" className={classes.rowMargin}>
          {isPermError
            ? t("survey.dashboard.permissionDeniedBody", "Ask an administrator to grant the “Survey Dashboard” right (953001) to your role.")
            : `${t("survey.dashboard.loadError", "Could not load the dashboard from the backend")}: ${errorMsg}`}
        </MuiAlert>
      ) : null}
      <Box className={classes.rowMargin}>
        <SectionHead title={t("survey.dashboard.householdSummaryTitle", "Household summary")} />
        <Box className={classes.kpiGrid}>
          <KpiTile
            label={t("survey.dashboard.totalHouseholds", "Total households")}
            value={m.totalInterviews}
            subtitle={t("survey.dashboard.totalHouseholdsSub", "Exact interview count for the current scope")}
            tooltip={t("survey.dashboard.totalHouseholdsTip", "One household interview is treated as one household in the monitoring scope.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.totalMembers", "Total members")}
            value={m.householdMembersTotal}
            subtitle={m.householdMembersTotal != null
              ? `${fmtInt(m.householdSizeInterviews || 0)} ${t("survey.dashboard.responsesWord", "responses")}`
              : t("survey.dashboard.householdSizeUnavailable", "Household-size statistics are not available from this HQ API yet.")}
            tooltip={t("survey.dashboard.totalMembersTip", "Running total of the hh_size numeric question for the selected questionnaire scope.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.householdAverage", "Average hh size")}
            value={m.householdSizeAverage}
            subtitle={m.householdSizeAverage != null
              ? `${t("survey.dashboard.householdMembers", "Household members")}: ${fmtInt(m.householdMembersTotal || 0)}`
              : t("survey.dashboard.householdSizeUnavailable", "Household-size statistics are not available from this HQ API yet.")}
            tooltip={t("survey.dashboard.householdAverageTip", "Average value of hh_size for the current questionnaire scope.")}
            loading={dashLoading}
          />
        </Box>
      </Box>
      <Box className={classes.rowMargin}>
        <PipelineStrip
          stages={stages}
          groupCounts={{ awaitingSupervisor: m.completed, awaitingHq: m.hqBacklog, approved: m.approvedByHq }}
          activeStatus={statusFilter}
          onStageClick={setStatusFilter}
          formatMessage={formatMessage}
        />
      </Box>
      <Box className={classes.rowMargin}>
        <SectionHead title={t("survey.dashboard.queuesTitle", "Review queues & throughput")} />
        <Box className={classes.kpiGrid}>
          <KpiTile
            label={t("survey.dashboard.rejectionRate", "Rejection rate")}
            value={m.rejectionRate != null ? `${m.rejectionRate}%` : "—"}
            severity={rejectionSeverity(m.rejectionRate)}
            onClick={() => setStatusFilter(isRejectedFilter(statusFilter) ? null : "rejected")}
            active={isRejectedFilter(statusFilter)}
            subtitle={`${fmtInt(rejected)} ${t("survey.dashboard.rejectedTotal", "rejected")} (${t("survey.dashboard.supShort", "sup")} ${fmtInt(m.rejectedBySupervisor || 0)} / ${t("survey.dashboard.hqShort", "HQ")} ${fmtInt(m.rejectedByHq || 0)})`}
            tooltip={t("survey.dashboard.rejectionRateTip", "Rejected interviews ÷ interviews that reached review. High values may signal data-quality or training issues.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.awaitingSupervisor", "Awaiting supervisor review")}
            value={m.completed}
            subtitle={t("survey.dashboard.awaitingSupervisorSub", "completed, not yet reviewed")}
            tooltip={t("survey.dashboard.awaitingSupervisorTip", "Interviews sitting in the supervisor's review queue right now.")}
            loading={dashLoading}
            onClick={() => setStatusFilter(statusFilter === "awaitingSupervisor" ? null : "awaitingSupervisor")}
            active={statusFilter === "awaitingSupervisor"}
          />
          <KpiTile
            label={t("survey.dashboard.awaitingHq", "Awaiting HQ approval")}
            value={m.hqBacklog}
            subtitle={t("survey.dashboard.awaitingHqSub", "approved by supervisor / sent to HQ")}
            tooltip={t("survey.dashboard.awaitingHqTip", "Interviews waiting for Headquarters approval — the main approval bottleneck.")}
            loading={dashLoading}
            onClick={() => setStatusFilter(statusFilter === "awaitingHq" ? null : "awaitingHq")}
            active={statusFilter === "awaitingHq"}
          />
          <KpiTile
            label={t("survey.dashboard.activeEnumerators", "Active enumerators (24h)")}
            value={m.activeEnumerators}
            subtitle={t("survey.dashboard.activeEnumeratorsSub", "synced recently (from sample)")}
            sparkline={dailySpark.length > 1 ? dailySpark : null}
            tooltip={t("survey.dashboard.activeEnumeratorsTip", "Enumerators whose interviews show a last-entry timestamp within the past 24 h (in the synced sample).")}
            loading={dashLoading}
          />
        </Box>
      </Box>
      <div className={classes.tabsBar}>
        <Tabs
          value={analyticsTab}
          onChange={(e, v) => setAnalyticsTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab disableRipple className={classes.tab} label={t("survey.dashboard.operationalTitle", "Operational monitoring")} />
          <Tab disableRipple className={classes.tab} label={t("survey.dashboard.activityTitle", "Field activity & accountability")} />
          <Tab disableRipple className={classes.tab} label={t("survey.dashboard.trendsTitle", "Trends & activity patterns")} />
        </Tabs>
        {m.sampleSize && m.totalInterviews && m.sampleSize < m.totalInterviews ? (
          <Tooltip title={t("survey.dashboard.sampleTip", "Pipeline and KPIs are exact. The feed, leaderboards and heatmap use the interviews synced so far; the sample grows with every poll.")}>
            <span className={classes.sampleNote}>
              <InfoOutlinedIcon style={{ fontSize: 16 }} />
              {t("survey.dashboard.sampleShort", "Sample")}: {fmtInt(m.sampleSize)} / {fmtInt(m.totalInterviews)}
            </span>
          </Tooltip>
        ) : null}
      </div>
      {analyticsTab === 0 && (
        <Box className={classes.rowMargin}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.liveFeed", "Live interview activity")}
                </Typography>
                <Box className={classes.panelBody}>
                  <InterviewFeed
                    interviews={interviews}
                    loading={fetchingInterviews}
                    statusFilter={statusFilter}
                    onStatusFilter={setStatusFilter}
                    responsibleFilter={responsibleFilter}
                    onClearResponsible={() => setResponsibleFilter(null)}
                    supervisorFilter={supervisorFilter}
                    onClearSupervisor={() => setSupervisorFilter(null)}
                    fromDate={fromDate || null}
                    onClearFromDate={() => setFromDate("")}
                    hqBaseUrl={m.hqBaseUrl}
                    listMaxHeight={500}
                    view={feedView}
                    onViewChange={setFeedView}
                    formatMessage={formatMessage}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.supervisorLeaderboard", "Supervisor leaderboard")}
                </Typography>
                <Box className={classes.panelBody}>
                  <SupervisorLeaderboard
                    rows={m.supervisorLeaderboard || []}
                    selected={supervisorFilter}
                    onSelect={(value) => {
                      setResponsibleFilter(null);
                      setSupervisorFilter(value);
                    }}
                    formatMessage={formatMessage}
                    maxHeight={500}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
      {analyticsTab === 1 && (
        <Box className={classes.rowMargin}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.heatmapTitle", "Field activity by day and hour")}
                </Typography>
                <Box className={classes.panelBody}>
                  <ActivityHeatmap cells={m.activityHeatmap || []} formatMessage={formatMessage} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.leaderboard", "Enumerator leaderboard")}
                </Typography>
                <Box className={classes.panelBody}>
                  <EnumeratorLeaderboard
                    rows={m.enumeratorLeaderboard || []}
                    selected={responsibleFilter}
                    onSelect={(value) => {
                      setSupervisorFilter(null);
                      setResponsibleFilter(value);
                    }}
                    formatMessage={formatMessage}
                    maxHeight={500}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
      {analyticsTab === 2 && (
        <Box className={classes.rowMargin}>
          <div className={classes.trendBar}>
            <span className={classes.trendHeadline}>
              {trend ? (
                <>
                  {{
                    stale: t("survey.dashboard.noSnapshotSince", "No snapshot since"),
                    idle: t("survey.dashboard.noMovementSince", "No movement since"),
                    moving: t("survey.dashboard.lastMovement", "Last movement:"),
                  }[trend.kind]}
                  {" "}
                  {fmtDay(trend.t, true)}
                  {trend.kind !== "moving" ? ` (${trend.days} ${t("survey.dashboard.daysWord", "days")})` : ""}
                </>
              ) : null}
            </span>
            <div className={classes.periodRow}>
              {[
                { days: 30, label: t("survey.dashboard.last30", "Last 30 days") },
                { days: 90, label: t("survey.dashboard.last90", "Last 90 days") },
                { days: 0, label: t("survey.dashboard.allTime", "All") },
              ].map((p) => (
                <Button
                  key={p.days}
                  variant="outlined"
                  className={`${classes.quickBtn} ${trendPeriod === p.days ? classes.quickBtnActive : ""}`.trim()}
                  onClick={() => setTrendPeriod(p.days)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.pipelineHistory", "Pipeline over time")}
                </Typography>
                <Box className={classes.panelBody}>
                  <Box className={classes.chartBody}>
                    <PipelineHistoryChart history={inPeriod(history, trendPeriod)} height={480} formatMessage={formatMessage} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.movement", "Movement between snapshots")}
                </Typography>
                <Box className={classes.panelBody}>
                  <Box className={classes.chartBody}>
                    <StageMovementChart rows={movements(history, trendPeriod)} height={480} formatMessage={formatMessage} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </div>
  );
}

export default SurveyMonitoringDashboardPage;
