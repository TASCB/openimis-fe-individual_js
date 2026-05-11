import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper, Grid, Typography, Box, Button, FormControlLabel, Switch, CircularProgress,
  Select, MenuItem, FormControl, TextField,
} from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import GavelIcon from "@material-ui/icons/Gavel";
import ThumbDownIcon from "@material-ui/icons/ThumbDown";
import GroupIcon from "@material-ui/icons/Group";
import {
  Helmet, useModulesManager, useTranslations, ProgressOrError, useToast,
} from "@openimis/fe-core";

import {
  fetchSurveyDashboard, fetchSurveyInterviews, refreshSurveyDashboard, fetchAvailableQuestionnaires,
} from "../actions";
import { INDIVIDUAL_MODULE_NAME } from "../constants";
import PipelineStrip from "../components/survey/PipelineStrip";
import KpiTile from "../components/survey/KpiTile";
import InterviewFeed from "../components/survey/InterviewFeed";
import EnumeratorLeaderboard from "../components/survey/EnumeratorLeaderboard";
import CompletionSCurveChart from "../components/survey/CompletionSCurveChart";
import DailyProductivityChart from "../components/survey/DailyProductivityChart";
import ActivityHeatmap from "../components/survey/ActivityHeatmap";
import { fmtInt, fmtDateTime, paaLabel } from "../components/survey/surveyUtils";

const POLL_SECONDS = 30;

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  block: { ...theme.paper, padding: theme.spacing(2), marginBottom: theme.spacing(3) },
  section: { ...theme.paper, padding: theme.spacing(2), height: "100%" },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  rowMargin: { marginBottom: theme.spacing(3) },
  headerRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: theme.spacing(1),
  },
  filtersRow: {
    display: "flex", alignItems: "center", flexWrap: "wrap", gap: theme.spacing(2),
  },
}));

function rejectionSeverity(rate) {
  if (rate == null) return "neutral";
  if (rate < 2) return "ok";
  if (rate < 8) return "warn";
  return "bad";
}

// Merge the questionnaire list the dashboard derives from the cache/pull-history
// with whatever the HQ "available questionnaires" call returned, de-duped by identity.
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

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [responsibleFilter, setResponsibleFilter] = useState(null);
  const [questionnaireFilter, setQuestionnaireFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [feedView, setFeedView] = useState("cards");
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
    questionnaireId: qid, status: statusFilter || undefined,
    responsibleName: responsibleFilter || undefined, fromDate: fromDateArg, first: 80,
  }));
  const reloadAll = () => {
    dispatch(fetchSurveyDashboard(qid));
    reloadFeed();
  };

  useEffect(() => {
    reloadAll();
    dispatch(fetchAvailableQuestionnaires(null, null, null, true));
    didMount.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didMount.current) reloadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, responsibleFilter, fromDate]);
  useEffect(() => {
    if (didMount.current) reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionnaireFilter]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(reloadAll, POLL_SECONDS * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, statusFilter, responsibleFilter, fromDate, questionnaireFilter]);

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
  };

  const dashLoading = fetchingDashboard && !dashboard;
  const rejected = (m.rejectedBySupervisor || 0) + (m.rejectedByHq || 0);
  const dailySpark = (m.dailyProductivity || []).map((d) => ({ count: d.count || 0 }));
  const stages = m.approvalFunnel || [];
  const anyFilter = !!questionnaireFilter || !!fromDate || !!statusFilter || !!responsibleFilter;
  const errorMsg = (() => {
    if (!errorDashboard) return null;
    if (typeof errorDashboard === "string") return errorDashboard;
    if (Array.isArray(errorDashboard)) return errorDashboard.map((e) => e?.message || e).join(" · ");
    return errorDashboard.message || errorDashboard.detail || JSON.stringify(errorDashboard);
  })();

  return (
    <div className={classes.page}>
      <Helmet title={t("survey.dashboard.title", "Survey Solutions — Field Monitoring")} />

      {/* ------- header ------- */}
      <Paper className={classes.block}>
        <div className={classes.headerRow}>
          <Box>
            <Typography variant="h6" style={{ fontWeight: 700 }}>{t("survey.dashboard.title", "Survey Solutions — Field Monitoring")}</Typography>
            <Typography variant="caption" color="textSecondary">
              {t("survey.dashboard.lastPolled", "Last synced from HQ")}: {fmtDateTime(m.lastPolledAt)}
              {fetchingDashboard ? <CircularProgress size={12} style={{ marginLeft: 8 }} /> : null}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" style={{ gap: 12, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch size="small" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
              label={t("survey.dashboard.autoRefresh", `Auto-refresh (${POLL_SECONDS}s)`)}
            />
            <Button
              variant="contained" color="primary" size="small"
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={onManualRefresh} disabled={refreshing}
            >
              {t("survey.dashboard.refreshNow", "Sync now")}
            </Button>
          </Box>
        </div>
      </Paper>

      {/* ------- filters ------- */}
      <Paper className={classes.block}>
        <div className={classes.filtersRow}>
          <Typography variant="subtitle2" color="textSecondary">{t("survey.dashboard.filters", "Filters")}:</Typography>
          {questionnaires.length ? (
            <FormControl size="small" variant="outlined" style={{ minWidth: 240, maxWidth: 380 }}>
              <Select
                value={questionnaireFilter}
                displayEmpty
                onChange={(e) => { setStatusFilter(null); setResponsibleFilter(null); setQuestionnaireFilter(e.target.value); }}
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
          <TextField
            size="small" variant="outlined" type="date"
            label={t("survey.dashboard.submittedSince", "Submitted since")}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            style={{ maxWidth: 180 }}
          />
          {anyFilter ? (
            <Button size="small" onClick={clearAllFilters}>{t("survey.dashboard.clearFilters", "Clear filters")}</Button>
          ) : null}
        </div>
      </Paper>

      {errorMsg ? (
        <MuiAlert severity="error" variant="outlined" className={classes.rowMargin}>
          {t("survey.dashboard.loadError", "Could not load the dashboard from the backend")}: {errorMsg}
        </MuiAlert>
      ) : null}
      <ProgressOrError progress={dashLoading} error={null} />

      {/* ------- pipeline hero ------- */}
      <Box className={classes.rowMargin}>
        <PipelineStrip stages={stages} activeStatus={statusFilter} onStageClick={setStatusFilter} formatMessage={formatMessage} />
      </Box>

      {/* ------- management KPI tiles ------- */}
      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiTile
              label={t("survey.dashboard.rejectionRate", "Rejection rate")}
              value={m.rejectionRate != null ? `${m.rejectionRate}%` : "—"}
              severity={rejectionSeverity(m.rejectionRate)}
              icon={<ThumbDownIcon />}
              subtitle={`${fmtInt(rejected)} ${t("survey.dashboard.rejectedTotal", "rejected")} (${t("survey.dashboard.supShort", "sup")} ${fmtInt(m.rejectedBySupervisor || 0)} / ${t("survey.dashboard.hqShort", "HQ")} ${fmtInt(m.rejectedByHq || 0)})`}
              tooltip={t("survey.dashboard.rejectionRateTip", "Rejected interviews ÷ interviews that reached review. High values may signal data-quality or training issues.")}
              loading={dashLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiTile
              label={t("survey.dashboard.activeEnumerators", "Active enumerators (24h)")}
              value={m.activeEnumerators}
              icon={<GroupIcon />}
              subtitle={t("survey.dashboard.activeEnumeratorsSub", "synced recently (from sample)")}
              sparkline={dailySpark.length > 1 ? dailySpark : null}
              tooltip={t("survey.dashboard.activeEnumeratorsTip", "Enumerators whose interviews show a last-entry timestamp within the past 24 h (in the synced sample).")}
              loading={dashLoading}
            />
          </Grid>
        </Grid>
      </Box>

      {/* ------- operational: live feed + leaderboard ------- */}
      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper className={classes.section}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.liveFeed", "Live interview activity")}
              </Typography>
              <InterviewFeed
                interviews={interviews}
                loading={fetchingInterviews}
                statusFilter={statusFilter}
                onStatusFilter={setStatusFilter}
                responsibleFilter={responsibleFilter}
                onClearResponsible={() => setResponsibleFilter(null)}
                fromDate={fromDate || null}
                onClearFromDate={() => setFromDate("")}
                hqBaseUrl={m.hqBaseUrl}
                view={feedView}
                onViewChange={setFeedView}
                formatMessage={formatMessage}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper className={classes.section}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.leaderboard", "Enumerator leaderboard")}
              </Typography>
              <EnumeratorLeaderboard
                rows={m.enumeratorLeaderboard || []}
                selected={responsibleFilter}
                onSelect={setResponsibleFilter}
                formatMessage={formatMessage}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ------- trends ------- */}
      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Paper className={classes.section}>
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  {t("survey.dashboard.sCurve", "Cumulative completion (S-curve)")}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {m.targetTotal ? `${t("survey.dashboard.target", "Target")}: ${fmtInt(m.targetTotal)}` : ""}
                </Typography>
              </Box>
              <CompletionSCurveChart series={m.completionSeries || []} target={m.targetTotal || 0} formatMessage={formatMessage} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper className={classes.section}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.dailyProductivity", "Daily productivity")}
              </Typography>
              <DailyProductivityChart data={m.dailyProductivity || []} formatMessage={formatMessage} />
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper className={classes.section}>
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  {t("survey.dashboard.heatmap", "Enumerator activity heatmap (day × hour)")}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {m.sampleSize ? `${t("survey.dashboard.sampleNote", "Based on a sample of")} ${fmtInt(m.sampleSize)}` : ""}
                </Typography>
              </Box>
              <ActivityHeatmap cells={m.activityHeatmap || []} formatMessage={formatMessage} />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
}

export default SurveyMonitoringDashboardPage;
