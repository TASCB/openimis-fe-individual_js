import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper, Grid, Typography, Box, Button, FormControlLabel, Switch, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, TextField, Divider,
} from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";
import { makeStyles } from "@material-ui/core/styles";
import RefreshIcon from "@material-ui/icons/Refresh";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import GavelIcon from "@material-ui/icons/Gavel";
import ThumbDownIcon from "@material-ui/icons/ThumbDown";
import GroupIcon from "@material-ui/icons/Group";
import PeopleIcon from "@material-ui/icons/People";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
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
  hero: { ...theme.paper, padding: theme.spacing(2.5), marginBottom: theme.spacing(3) },
  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  heroIntro: { maxWidth: 760 },
  heroTitle: { fontWeight: 700, marginBottom: theme.spacing(0.5) },
  heroSubtitle: { maxWidth: 700 },
  heroMeta: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  divider: { margin: theme.spacing(2, 0) },
  filterRow: {
    display: "flex",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  filterField: { minWidth: 240, maxWidth: 380 },
  dateField: { maxWidth: 180 },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: theme.spacing(2),
  },
  section: {
    ...theme.paper,
    padding: theme.spacing(2),
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  uniformSection: { minHeight: 640 },
  sectionBody: {
    flex: 1,
    minHeight: 0,
    marginTop: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
  },
  scrollBody: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    paddingRight: theme.spacing(0.5),
  },
  chartBody: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "stretch",
  },
  sectionLead: { marginBottom: theme.spacing(1.5) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(0.5) },
  sectionSubtitle: { maxWidth: 760 },
  rowMargin: { marginBottom: theme.spacing(3) },
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

  if (!canView) {
    return (
      <div className={classes.page}>
        <Helmet title={t("survey.dashboard.title", "Survey Solutions — Field Monitoring")} />
        <Paper className={classes.hero}>
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

      <Paper className={classes.hero}>
        <div className={classes.heroTop}>
          <Box className={classes.heroIntro}>
            <Typography variant="h6" className={classes.heroTitle}>{t("survey.dashboard.title", "Survey Solutions — Field Monitoring")}</Typography>
            <Typography variant="body2" color="textSecondary" className={classes.heroSubtitle}>
              {t("survey.dashboard.subtitle", "A near-real-time operational view of interview progress, review backlogs, and field activity sourced from Survey Solutions HQ.")}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {t("survey.dashboard.lastPolled", "Last synced from HQ")}: {fmtDateTime(m.lastPolledAt)}
              {fetchingDashboard ? (
                <CircularProgress
                  size={12}
                  style={{ marginLeft: 8 }}
                  aria-label={t("survey.dashboard.syncing", "Syncing dashboard")}
                />
              ) : null}
            </Typography>
          </Box>
          <Box className={classes.heroMeta}>
            <FormControlLabel
              control={<Switch size="small" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
              label={t("survey.dashboard.autoRefresh", `Auto-refresh (${POLL_SECONDS}s)`)}
            />
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={refreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={onManualRefresh}
              disabled={refreshing}
            >
              {t("survey.dashboard.refreshNow", "Sync now")}
            </Button>
          </Box>
        </div>

        <Divider className={classes.divider} />

        <div className={classes.filterRow}>
          <Typography variant="subtitle2" color="textSecondary">{t("survey.dashboard.filters", "Filters")}</Typography>
          {questionnaires.length ? (
            <FormControl size="small" variant="outlined" className={classes.filterField}>
              <InputLabel id="survey-paa-filter-label" shrink>
                {t("survey.dashboard.questionnaire", "PAA / Questionnaire")}
              </InputLabel>
              <Select
                labelId="survey-paa-filter-label"
                label={t("survey.dashboard.questionnaire", "PAA / Questionnaire")}
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
          <TextField
            size="small"
            variant="outlined"
            type="date"
            label={t("survey.dashboard.submittedSince", "Submitted since")}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            className={classes.dateField}
          />
          {anyFilter ? (
            <Button size="small" onClick={clearAllFilters}>{t("survey.dashboard.clearFilters", "Clear filters")}</Button>
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

      <Box className={classes.sectionLead}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {t("survey.dashboard.householdSummaryTitle", "Household summary")}
        </Typography>
        <Typography variant="body2" color="textSecondary" className={classes.sectionSubtitle}>
          {t("survey.dashboard.householdSummarySubtitle", "Household coverage indicators for the current questionnaire scope.")}
        </Typography>
      </Box>

      <Box className={classes.rowMargin}>
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

      <Box className={classes.rowMargin}>
        <PipelineStrip stages={stages} activeStatus={statusFilter} onStageClick={setStatusFilter} formatMessage={formatMessage} />
      </Box>

      <Box className={classes.rowMargin}>
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

      <SampleBanner sampleSize={m.sampleSize} totalInterviews={m.totalInterviews} formatMessage={formatMessage} />

      <Box className={classes.sectionLead}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {t("survey.dashboard.operationalTitle", "Operational monitoring")}
        </Typography>
        <Typography variant="body2" color="textSecondary" className={classes.sectionSubtitle}>
          {t("survey.dashboard.operationalSubtitle", "Use the live feed and ranking panels together to identify where review queues are building and who is driving current throughput.")}
        </Typography>
      </Box>

      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.liveFeed", "Live interview activity")}
              </Typography>
              <Box className={classes.sectionBody}>
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
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.supervisorLeaderboard", "Supervisor leaderboard")}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t("survey.dashboard.supervisorLeaderboardNote", "Ranks supervisors by reviewed interviews and current queue volume in the synced sample.")}
              </Typography>
              <Box className={classes.sectionBody}>
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

      <Box className={classes.sectionLead}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {t("survey.dashboard.activityTitle", "Field activity and accountability")}
        </Typography>
        <Typography variant="body2" color="textSecondary" className={classes.sectionSubtitle}>
          {t("survey.dashboard.activitySubtitle", "Use the hourly activity pattern and enumerator ranking together to spot throughput gaps, uneven field effort, and follow-up needs.")}
        </Typography>
      </Box>

      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.heatmap", "Enumerator activity heatmap (day × hour)")}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {m.sampleSize ? `${t("survey.dashboard.sampleNote", "Based on a sample of")} ${fmtInt(m.sampleSize)}` : ""}
              </Typography>
              <Box className={classes.sectionBody}>
                <Box className={classes.scrollBody}>
                  <ActivityHeatmap cells={m.activityHeatmap || []} formatMessage={formatMessage} />
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={6}>
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.leaderboard", "Enumerator leaderboard")}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {t("survey.dashboard.enumeratorLeaderboardNote", "Ranks enumerators by completed interviews in the synced sample.")}
              </Typography>
              <Box className={classes.sectionBody}>
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

      <Box className={classes.sectionLead}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {t("survey.dashboard.trendsTitle", "Trends and activity patterns")}
        </Typography>
        <Typography variant="body2" color="textSecondary" className={classes.sectionSubtitle}>
          {t("survey.dashboard.trendsSubtitle", "These charts help separate short-term operational noise from sustained throughput and activity patterns over time.")}
        </Typography>
      </Box>

      <Box className={classes.rowMargin}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Box display="flex" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle1" className={classes.sectionTitle}>
                  {t("survey.dashboard.sCurve", "Cumulative completion (S-curve)")}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {m.targetTotal ? `${t("survey.dashboard.target", "Target")}: ${fmtInt(m.targetTotal)}` : ""}
                </Typography>
              </Box>
              <Box className={classes.sectionBody}>
                <Box className={classes.chartBody}>
                  <CompletionSCurveChart series={m.completionSeries || []} target={m.targetTotal || 0} height={460} formatMessage={formatMessage} />
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper className={`${classes.section} ${classes.uniformSection}`}>
              <Typography variant="subtitle1" className={classes.sectionTitle}>
                {t("survey.dashboard.dailyProductivity", "Daily productivity")}
              </Typography>
              <Box className={classes.sectionBody}>
                <Box className={classes.chartBody}>
                  <DailyProductivityChart data={m.dailyProductivity || []} height={460} formatMessage={formatMessage} />
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
}

export default SurveyMonitoringDashboardPage;
