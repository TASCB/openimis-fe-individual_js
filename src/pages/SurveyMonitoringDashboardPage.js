import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper, Grid, Typography, Box, Button, FormControlLabel, Switch, CircularProgress,
  Select, MenuItem, FormControl, TextField, Tabs, Tab,
} from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import { makeStyles, fade } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import GavelIcon from "@material-ui/icons/Gavel";
import ThumbDownIcon from "@material-ui/icons/ThumbDown";
import GroupIcon from "@material-ui/icons/Group";
import PeopleIcon from "@material-ui/icons/People";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import AssignmentTurnedInIcon from "@material-ui/icons/AssignmentTurnedIn";
import FilterListIcon from "@material-ui/icons/FilterList";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
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
import CompletionSCurveChart from "../components/survey/CompletionSCurveChart";
import DailyProductivityChart from "../components/survey/DailyProductivityChart";
import ActivityHeatmap from "../components/survey/ActivityHeatmap";
import SampleBanner from "../components/survey/SampleBanner";
import { fmtInt, fmtDateTime, paaLabel } from "../components/survey/surveyUtils";

const POLL_SECONDS = 30;

const useStyles = makeStyles((theme) => ({
  page: theme.page,

  // shared flat-card surface (matches the Payment Operations dashboard)
  surface: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 16,
    boxShadow: "none",
  },

  // ── hero ──
  hero: {
    position: "relative",
    overflow: "hidden",
    padding: theme.spacing(4, 4, 3.5, 0),
    marginBottom: theme.spacing(2),
  },
  heroAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 6,
    height: "100%",
    backgroundColor: theme.palette.primary.main,
  },
  heroTop: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(3),
    paddingLeft: theme.spacing(4),
  },
  brandBadge: {
    flexShrink: 0,
    width: 72,
    height: 72,
    borderRadius: "50%",
    backgroundColor: fade(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    [theme.breakpoints.down("xs")]: { display: "none" },
  },
  heroIntro: { flex: 1, minWidth: 0 },
  heroTitle: { fontWeight: 700, color: theme.palette.text.primary, marginBottom: theme.spacing(0.5) },
  heroSubtitle: { color: theme.palette.grey[600], maxWidth: 620 },
  heroStatusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(2),
    flexWrap: "wrap",
    marginTop: theme.spacing(2.5),
  },
  heroControls: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
  },
  syncedChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    fontSize: "0.82rem",
    color: theme.palette.grey[600],
    whiteSpace: "nowrap",
  },
  syncedIcon: { fontSize: 18, color: theme.palette.primary.main },

  // ── filter card ──
  filterCard: {
    padding: theme.spacing(2, 2.5),
    marginBottom: theme.spacing(3),
  },
  filterBar: {
    display: "flex",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  filterPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    height: 40,
    padding: theme.spacing(0, 1.75),
    borderRadius: 20,
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.grey[700],
    fontWeight: 700,
    fontSize: "0.72rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
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
    color: theme.palette.grey[600],
    fontSize: "0.72rem",
    fontWeight: 600,
  },
  filterField: { minWidth: 240, maxWidth: 360 },
  dateField: { maxWidth: 180 },
  quickRange: { display: "flex", gap: theme.spacing(1), flexWrap: "wrap" },
  quickBtn: {
    textTransform: "none",
    borderRadius: 10,
    minWidth: 0,
    padding: theme.spacing(0.75, 1.75),
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
    "&:hover": { borderColor: theme.palette.primary.main, backgroundColor: fade(theme.palette.primary.main, 0.04) },
  },
  quickBtnActive: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    backgroundColor: fade(theme.palette.primary.main, 0.08),
    fontWeight: 700,
  },
  clearBtn: { textTransform: "none", color: theme.palette.grey[600] },

  // ── kpi band ──
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: theme.spacing(2),
  },

  // ── section headers ──
  sectionHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    flexWrap: "wrap",
    marginBottom: theme.spacing(1.5),
  },
  sectionTitle: { fontWeight: 700, color: theme.palette.text.primary, fontSize: "1.05rem" },
  sectionHint: { color: theme.palette.grey[600], fontSize: "0.8rem" },

  // ── analytical tabs ──
  tabsBar: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2.5),
  },
  tab: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    minWidth: 0,
    minHeight: 48,
  },

  // ── analytical panels ──
  panel: {
    padding: theme.spacing(2.5),
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  uniformPanel: { minHeight: 600 },
  panelTitle: { fontWeight: 700, color: theme.palette.text.primary, fontSize: "1rem" },
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

  rowMargin: { marginBottom: theme.spacing(2.5) },
  sampleNote: { marginBottom: theme.spacing(2.5), borderRadius: 12 },
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

// Local YYYY-MM-DD for "n days ago" (used by the Quick range presets).
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
  const [feedView, setFeedView] = useState("cards");
  const [analyticsTab, setAnalyticsTab] = useState(0);
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
    status: statusFilter || undefined,
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

  // Fall back to the legacy HQ list only if the dashboard didn't supply questionnaires.
  // Avoids an extra slow HQ round-trip on every mount when the backend is up-to-date.
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
    setStatusFilter(null);
    setResponsibleFilter(null);
    setSupervisorFilter(null);
  };

  const dashLoading = fetchingDashboard && !dashboard;
  const rejected = (m.rejectedBySupervisor || 0) + (m.rejectedByHq || 0);
  const dailySpark = (m.dailyProductivity || []).map((d) => ({ count: d.count || 0 }));
  const stages = m.approvalFunnel || [];
  const anyFilter = !!questionnaireFilter || !!fromDate || !!statusFilter || !!responsibleFilter || !!supervisorFilter;
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
        <Paper className={`${classes.surface} ${classes.hero}`}>
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

      {/* ── Hero: brand badge, title, status row ── */}
      <Paper className={`${classes.surface} ${classes.hero}`}>
        <span className={classes.heroAccent} />
        <div className={classes.heroTop}>
          <div className={classes.brandBadge}>
            <AssignmentTurnedInIcon style={{ fontSize: 38 }} />
          </div>
          <Box className={classes.heroIntro}>
            <Typography variant="h4" className={classes.heroTitle}>
              {t("survey.dashboard.title", "Survey Solutions — Field Monitoring")}
            </Typography>
            <Typography variant="body1" className={classes.heroSubtitle}>
              {t("survey.dashboard.subtitle", "A near-real-time operational view of interview progress, review backlogs, and field activity sourced from Survey Solutions HQ.")}
            </Typography>
            <div className={classes.heroStatusRow}>
              <span className={classes.syncedChip}>
                <CheckCircleOutlineIcon className={classes.syncedIcon} />
                {t("survey.dashboard.lastPolled", "Last synced from HQ")}: {fmtDateTime(m.lastPolledAt)}
                {fetchingDashboard ? (
                  <CircularProgress size={12} style={{ marginLeft: 4 }} aria-label={t("survey.dashboard.syncing", "Syncing dashboard")} />
                ) : null}
              </span>
              <div className={classes.heroControls}>
                <FormControlLabel
                  control={<Switch size="small" color="primary" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
                  label={t("survey.dashboard.autoRefresh", `Auto-refresh (${POLL_SECONDS}s)`)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                  onClick={onManualRefresh}
                  disabled={refreshing}
                >
                  {t("survey.dashboard.refreshNow", "Sync now")}
                </Button>
              </div>
            </div>
          </Box>
        </div>
      </Paper>

      {/* ── Filter bar (own card) ── */}
      <Paper className={`${classes.surface} ${classes.filterCard}`}>
        <div className={classes.filterBar}>
          <span className={classes.filterPill}>
            <FilterListIcon style={{ fontSize: 18 }} />
            {t("survey.dashboard.filters", "Filters")}
          </span>

          <div className={classes.filterDivider} />

          <div className={classes.filterGroup}>
            <span className={classes.filterGroupLabel}>{t("survey.dashboard.questionnaire", "PAA / Questionnaire")}</span>
            {questionnaires.length ? (
              <FormControl size="small" variant="outlined" className={classes.filterField}>
                <Select
                  value={questionnaireFilter}
                  displayEmpty
                  onChange={(e) => {
                    // Resetting status/responsible/supervisor on scope change makes the
                    // numbers and feed unambiguous; the date filter is left in place
                    // because "submitted since" is usually a cross-PAA intent.
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
            <span className={classes.filterGroupLabel}>{t("survey.dashboard.submittedSince", "Submitted since")}</span>
            <TextField
              size="small"
              variant="outlined"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              className={classes.dateField}
            />
          </div>

          <div className={classes.filterDivider} />

          <div className={classes.filterGroup}>
            <span className={classes.filterGroupLabel}>{t("survey.dashboard.quickRange", "Quick range")}</span>
            <div className={classes.quickRange}>
              {[
                { key: "today", label: t("survey.dashboard.today", "Today"), days: 0 },
                { key: "yesterday", label: t("survey.dashboard.yesterday", "Yesterday"), days: 1 },
                { key: "last7", label: t("survey.dashboard.last7", "Last 7 days"), days: 7 },
                { key: "last30", label: t("survey.dashboard.last30", "Last 30 days"), days: 30 },
              ].map((r) => {
                const iso = isoDaysAgo(r.days);
                const active = fromDate === iso;
                return (
                  <Button
                    key={r.key}
                    variant="outlined"
                    size="small"
                    className={`${classes.quickBtn} ${active ? classes.quickBtnActive : ""}`.trim()}
                    onClick={() => setFromDate(active ? "" : iso)}
                  >
                    {r.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {anyFilter ? (
            <Button size="small" className={classes.clearBtn} onClick={clearAllFilters}>
              {t("survey.dashboard.clearFilters", "Clear filters")}
            </Button>
          ) : null}
        </div>
      </Paper>

      {errorMsg ? (
        <MuiAlert severity={isPermError ? "warning" : "error"} variant="outlined" className={classes.rowMargin}>
          {isPermError
            ? t("survey.dashboard.permissionDeniedBody", "Ask an administrator to grant the “Survey Dashboard” right (953001) to your role.")
            : `${t("survey.dashboard.loadError", "Could not load the dashboard from the backend")}: ${errorMsg}`}
        </MuiAlert>
      ) : null}

      {/* ── Coverage KPIs ── */}
      <Box className={classes.rowMargin}>
        <SectionHead title={t("survey.dashboard.householdSummaryTitle", "Household summary")} />
        <Box className={classes.kpiGrid}>
          <KpiTile
            label={t("survey.dashboard.totalHouseholds", "Total households")}
            value={m.totalInterviews}
            icon={<GroupIcon />}
            subtitle={t("survey.dashboard.totalHouseholdsSub", "exact interview count for the current scope")}
            tooltip={t("survey.dashboard.totalHouseholdsTip", "One household interview is treated as one household in the monitoring scope.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.totalMembers", "Total members")}
            value={m.householdMembersTotal}
            icon={<PeopleIcon />}
            subtitle={m.householdMembersTotal != null
              ? `${fmtInt(m.householdSizeInterviews || 0)} ${t("survey.dashboard.responsesWord", "responses")}`
              : t("survey.dashboard.householdSizeUnavailable", "Household-size statistics are not available from this HQ API yet.")}
            tooltip={t("survey.dashboard.totalMembersTip", "Running total of the hh_size numeric question for the selected questionnaire scope.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.householdAverage", "Average hh size")}
            value={m.householdSizeAverage}
            icon={<PeopleIcon />}
            subtitle={m.householdSizeAverage != null
              ? `${t("survey.dashboard.householdMembers", "Household members")}: ${fmtInt(m.householdMembersTotal || 0)}`
              : t("survey.dashboard.householdSizeUnavailable", "Household-size statistics are not available from this HQ API yet.")}
            tooltip={t("survey.dashboard.householdAverageTip", "Average value of hh_size for the current questionnaire scope.")}
            loading={dashLoading}
          />
        </Box>
      </Box>

      {/* ── Approval funnel ── */}
      <Box className={classes.rowMargin}>
        <PipelineStrip stages={stages} activeStatus={statusFilter} onStageClick={setStatusFilter} formatMessage={formatMessage} />
      </Box>

      {/* ── Review queues & throughput KPIs ── */}
      <Box className={classes.rowMargin}>
        <SectionHead title={t("survey.dashboard.queuesTitle", "Review queues & throughput")} />
        <Box className={classes.kpiGrid}>
          <KpiTile
            label={t("survey.dashboard.rejectionRate", "Rejection rate")}
            value={m.rejectionRate != null ? `${m.rejectionRate}%` : "—"}
            severity={rejectionSeverity(m.rejectionRate)}
            icon={<ThumbDownIcon />}
            subtitle={`${fmtInt(rejected)} ${t("survey.dashboard.rejectedTotal", "rejected")} (${t("survey.dashboard.supShort", "sup")} ${fmtInt(m.rejectedBySupervisor || 0)} / ${t("survey.dashboard.hqShort", "HQ")} ${fmtInt(m.rejectedByHq || 0)})`}
            tooltip={t("survey.dashboard.rejectionRateTip", "Rejected interviews ÷ interviews that reached review. High values may signal data-quality or training issues.")}
            loading={dashLoading}
          />
          <KpiTile
            label={t("survey.dashboard.awaitingSupervisor", "Awaiting supervisor review")}
            value={m.completed}
            icon={<HourglassEmptyIcon />}
            subtitle={t("survey.dashboard.awaitingSupervisorSub", "completed, not yet reviewed")}
            tooltip={t("survey.dashboard.awaitingSupervisorTip", "Interviews sitting in the supervisor's review queue right now.")}
            loading={dashLoading}
            onClick={() => setStatusFilter(statusFilter === "Completed" ? null : "Completed")}
            active={statusFilter === "Completed"}
          />
          <KpiTile
            label={t("survey.dashboard.awaitingHq", "Awaiting HQ approval")}
            value={m.hqBacklog}
            severity={m.totalInterviews && (m.hqBacklog || 0) / m.totalInterviews > 0.5 ? "bad" : "warn"}
            icon={<GavelIcon />}
            subtitle={t("survey.dashboard.awaitingHqSub", "approved by supervisor / sent to HQ")}
            tooltip={t("survey.dashboard.awaitingHqTip", "Interviews waiting for Headquarters approval — the main approval bottleneck.")}
            loading={dashLoading}
            onClick={() => setStatusFilter(statusFilter === "ApprovedBySupervisor" ? null : "ApprovedBySupervisor")}
            active={statusFilter === "ApprovedBySupervisor"}
          />
          <KpiTile
            label={t("survey.dashboard.activeEnumerators", "Active enumerators (24h)")}
            value={m.activeEnumerators}
            icon={<GroupIcon />}
            subtitle={t("survey.dashboard.activeEnumeratorsSub", "synced recently (from sample)")}
            sparkline={dailySpark.length > 1 ? dailySpark : null}
            tooltip={t("survey.dashboard.activeEnumeratorsTip", "Enumerators whose interviews show a last-entry timestamp within the past 24 h (in the synced sample).")}
            loading={dashLoading}
          />
        </Box>
      </Box>

      <SampleBanner sampleSize={m.sampleSize} totalInterviews={m.totalInterviews} formatMessage={formatMessage} className={classes.sampleNote} />

      {/* ── Analytical zones — tabbed so only one shows at a time ── */}
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
      </div>

      {/* Operational monitoring: live feed + supervisor ranking */}
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
                <Typography className={classes.panelNote}>
                  {t("survey.dashboard.supervisorLeaderboardNote", "Ranks supervisors by reviewed interviews and current queue volume in the synced sample.")}
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

      {/* Field activity: heatmap + enumerator ranking */}
      {analyticsTab === 1 && (
        <Box className={classes.rowMargin}>
          <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.heatmap", "Enumerator activity heatmap (day × hour)")}
                </Typography>
                <Typography className={classes.panelNote}>
                  {m.sampleSize ? `${t("survey.dashboard.sampleNote", "Based on a sample of")} ${fmtInt(m.sampleSize)}` : ""}
                </Typography>
                <Box className={classes.panelBody}>
                  <Box className={classes.scrollBody}>
                    <ActivityHeatmap cells={m.activityHeatmap || []} formatMessage={formatMessage} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.leaderboard", "Enumerator leaderboard")}
                </Typography>
                <Typography className={classes.panelNote}>
                  {t("survey.dashboard.enumeratorLeaderboardNote", "Ranks enumerators by completed interviews in the synced sample.")}
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

      {/* Trends */}
      {analyticsTab === 2 && (
        <Box className={classes.rowMargin}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Box display="flex" justifyContent="space-between" alignItems="baseline">
                  <Typography className={classes.panelTitle}>
                    {t("survey.dashboard.sCurve", "Cumulative completion (S-curve)")}
                  </Typography>
                  <Typography className={classes.panelNote}>
                    {m.targetTotal ? `${t("survey.dashboard.target", "Target")}: ${fmtInt(m.targetTotal)}` : ""}
                  </Typography>
                </Box>
                <Box className={classes.panelBody}>
                  <Box className={classes.chartBody}>
                    <CompletionSCurveChart series={m.completionSeries || []} target={m.targetTotal || 0} height={460} formatMessage={formatMessage} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper className={`${classes.surface} ${classes.panel} ${classes.uniformPanel}`}>
                <Typography className={classes.panelTitle}>
                  {t("survey.dashboard.dailyProductivity", "Daily productivity")}
                </Typography>
                <Box className={classes.panelBody}>
                  <Box className={classes.chartBody}>
                    <DailyProductivityChart data={m.dailyProductivity || []} height={460} formatMessage={formatMessage} />
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
