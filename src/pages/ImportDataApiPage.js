// src/pages/ImportDataApiPage.js (or wherever your ImportDataApiPage lives)

import React, { useState, useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

// Material-UI v4
import {
  Paper,
  Grid,
  Typography,
  Button,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@material-ui/core";
import { withStyles, withTheme } from "@material-ui/core/styles";

// Dialogs
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

// openIMIS core
import {
  Helmet,
  PublishedComponent,
  withModulesManager,
  journalize,
  formatMessage,
  ProgressOrError,
} from "@openimis/fe-core";
import { injectIntl } from "react-intl";

import {
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
} from "../actions";

const styles = (theme) => {
  const headerBG =
    theme?.table?.header?.backgroundColor ??
    theme.palette?.action?.hover ??
    "#e0f2f1";
  const headerColor = theme?.table?.header?.color ?? theme.palette?.text?.primary;
  const bodyBG =
    theme?.table?.backgroundColor ??
    theme?.paper?.background ??
    theme.palette?.background?.paper;

  return {
    page: theme.page,
    paper: { ...theme.paper, padding: theme.spacing(2) },
    headerBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing(1),
    },
    sectionTitle: { fontWeight: 600 },
    formRow: { marginTop: theme.spacing(1) },
    tablePaper: { ...theme.paper, padding: 0, overflow: "hidden" },
    tableHeaderBar: { padding: theme.spacing(2) },
    loadingBox: { textAlign: "center", padding: theme.spacing(3) },
    helperText: { color: theme.palette.text.secondary },

    header: theme.table?.header,
    headerTitle: theme.table?.title,

    tealHead: {
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-root": {
        backgroundColor: `${headerBG} !important`,
        color: `${headerColor} !important`,
        fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
      },
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-stickyHeader": {
        backgroundColor: `${headerBG} !important`,
        color: `${headerColor} !important`,
        fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
      },
    },

    tableContainerBg: {
      backgroundColor: bodyBG,
    },
  };
};

const API_WORKFLOW_HEADERS = [
  "ImportPageAPI.apiSelection",
  "ImportPageAPI.triggerImport",
];

function ImportDataApiPage({
  intl,
  classes,
  modulesManager,

  // state
  pulledQ,
  fetchingPulledQ,
  errorPulledQ,
  fetchedPulledQ,
  submittingMutation,
  mutation,
  mutations = [],

  fetchingApiEtlServices,
  apiEtlServices = [],
  submittingLegacyEtl,
  submittingPaaEtl,
  errorApiEtlServices,

  fetchingQuestionnaires,
  availableQuestionnaires = [],
  errorQuestionnaires,

  pulledQPageInfo,
  pulledQTotalCount,

  // actions
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
}) {
  // ------------------------------------------------------------
  // Pagination state for pulled questionnaires (cursor-based)
  // ------------------------------------------------------------
  const [pulledQPageSize, setPulledQPageSize] = useState(10);
  const [pulledQAfter, setPulledQAfter] = useState(null);
  const [pulledQBefore, setPulledQBefore] = useState(null);

  // Questionnaire selection for PAA-based import
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [questionnaireSearchTerm, setQuestionnaireSearchTerm] = useState("");

  // Region/District (ETL control)
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Advanced options
  const [manualQuestionnaireId, setManualQuestionnaireId] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // API services confirm dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [serviceToPullData, setServiceToPullData] = useState(null);

  // PAA Import confirm dialog
  const [openPAAConfirmDialog, setOpenPAAConfirmDialog] = useState(false);

  const isSubmitting =
    submittingLegacyEtl || submittingPaaEtl || submittingMutation;

  const hasNext = !!pulledQPageInfo?.hasNextPage;
  const hasPrev = !!pulledQPageInfo?.hasPreviousPage;

  const rangeText = useMemo(() => {
    const total = pulledQTotalCount ?? (Array.isArray(pulledQ) ? pulledQ.length : 0);
    const shown = Array.isArray(pulledQ) ? pulledQ.length : 0;
    if (!total && !shown) return "";
    // For cursor paging we don’t know exact start index reliably; show simple text.
    return `Showing ${shown} of ${total}`;
  }, [pulledQTotalCount, pulledQ]);

  const fetchHistory = (opts = {}) => {
    fetchPulledQuestionnaires(modulesManager, {
      pageSize: pulledQPageSize,
      after: pulledQAfter,
      before: pulledQBefore,
      regionCode: selectedRegion?.code || null,
      districtCode: selectedDistrict?.code || null,
      ...opts,
    });
  };

  // Initial loads
  useEffect(() => {
    if (!fetchedPulledQ && !fetchingPulledQ) {
      fetchPulledQuestionnaires(modulesManager, { pageSize: pulledQPageSize });
    }
    fetchApiEtlServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch history when filters change (reset cursors)
  useEffect(() => {
    setPulledQAfter(null);
    setPulledQBefore(null);

    fetchPulledQuestionnaires(modulesManager, {
      regionCode: selectedRegion?.code || null,
      districtCode: selectedDistrict?.code || null,
      pageSize: pulledQPageSize,
      after: null,
      before: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedDistrict]);

  // After mutation completes, refresh history (reset cursors)
  useEffect(() => {
    const label = mutation?.clientMutationLabel || "";
    const isEtl = label.startsWith("paa_etl_") || label.startsWith("etl_");

    if (
      isEtl &&
      mutation?.clientMutationId &&
      !submittingMutation &&
      !mutation?.error
    ) {
      setPulledQAfter(null);
      setPulledQBefore(null);
      fetchPulledQuestionnaires(modulesManager, {
        regionCode: selectedRegion?.code || null,
        districtCode: selectedDistrict?.code || null,
        pageSize: pulledQPageSize,
        after: null,
        before: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation, submittingMutation]);

  // Keep mutation-by-label in sync (used for disabling API “Send” button)
  useEffect(() => {
    fetchMutationByLabel(
      formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData")
    );
  }, [serviceToPullData, fetchMutationByLabel, intl]);

  // Fetch questionnaires when district is selected
  useEffect(() => {
    if (selectedDistrict && selectedRegion) {
      fetchAvailableQuestionnaires(
        selectedDistrict.code,
        selectedRegion.code,
        selectedDistrict.name,
        false
      );
      setSelectedQuestionnaire(null);
      setQuestionnaireSearchTerm("");
    }
  }, [selectedDistrict, selectedRegion, fetchAvailableQuestionnaires]);

  // Auto-refresh pulled questionnaires every 5 seconds if any import is running
  useEffect(() => {
    const hasRunningImports =
      pulledQ && pulledQ.some((item) => item.status === "running");

    if (!hasRunningImports) return undefined;

    const intervalId = setInterval(() => {
      fetchPulledQuestionnaires(modulesManager, {
        regionCode: selectedRegion?.code || null,
        districtCode: selectedDistrict?.code || null,
        pageSize: pulledQPageSize,
        after: null,
        before: null,
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [pulledQ, selectedRegion, selectedDistrict, pulledQPageSize, fetchPulledQuestionnaires, modulesManager]);

  // --- Handlers (pagination)
  const onNext = () => {
    if (!hasNext) return;
    setPulledQBefore(null);
    const nextAfter = pulledQPageInfo?.endCursor || null;
    setPulledQAfter(nextAfter);
    fetchPulledQuestionnaires(modulesManager, {
      pageSize: pulledQPageSize,
      after: nextAfter,
      before: null,
      regionCode: selectedRegion?.code || null,
      districtCode: selectedDistrict?.code || null,
    });
  };

  const onPrev = () => {
    if (!hasPrev) return;
    setPulledQAfter(null);
    const nextBefore = pulledQPageInfo?.startCursor || null;
    setPulledQBefore(nextBefore);
    fetchPulledQuestionnaires(modulesManager, {
      pageSize: pulledQPageSize,
      before: nextBefore,
      after: null,
      regionCode: selectedRegion?.code || null,
      districtCode: selectedDistrict?.code || null,
    });
  };

  const onPageSizeChange = (e) => {
    const nextSize = Number(e.target.value);
    setPulledQPageSize(nextSize);
    setPulledQAfter(null);
    setPulledQBefore(null);
    fetchPulledQuestionnaires(modulesManager, {
      pageSize: nextSize,
      after: null,
      before: null,
      regionCode: selectedRegion?.code || null,
      districtCode: selectedDistrict?.code || null,
    });
  };

  // --- Handlers (ETL PAA)
  const handleTriggerPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;
    setOpenPAAConfirmDialog(true);
  };

  const handleConfirmPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;

    if (submittingLegacyEtl || submittingPaaEtl || submittingMutation) return;

    const params = {
      paaName: selectedDistrict.name,
      regionCode: selectedRegion.code,
      districtCode: selectedDistrict.code,
      dryRun,
    };

    if (selectedQuestionnaire) {
      params.questionnaireId = selectedQuestionnaire;
    } else if (manualQuestionnaireId.trim()) {
      params.questionnaireId = manualQuestionnaireId.trim();
    }

    const mutationLabel = `paa_etl_${selectedDistrict.code}_${Date.now()}`;
    confirmPullingDataFromApiEtl("SurveySolutionService", mutationLabel, params);

    setOpenPAAConfirmDialog(false);
  };

  // --- Handlers (API services)
  const openServiceConfirm = (etlService) => {
    setServiceToPullData(etlService);
    setOpenConfirmDialog(true);
  };

  const handleConfirmServicePull = () => {
    if (!serviceToPullData) return;
    if (submittingLegacyEtl || submittingPaaEtl) return;

    const label = `etl_${serviceToPullData}_${Date.now()}`;
    confirmPullingDataFromApiEtl(serviceToPullData, label);

    setOpenConfirmDialog(false);
    setServiceToPullData(null);
  };

  // Helper: safe error to text
  const formatErr = (err) => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  const renderStatusBadge = (status, errorMessage) => {
    const statusConfig = {
      running: {
        color: "#2196f3",
        bgcolor: "#e3f2fd",
        icon: <CircularProgress size={16} style={{ marginRight: 4 }} />,
        label: formatMessage(intl, "individual", "ImportDataApiPage.status.running"),
      },
      completed: {
        color: "#4caf50",
        bgcolor: "#e8f5e9",
        icon: "✓",
        label: formatMessage(intl, "individual", "ImportDataApiPage.status.completed"),
      },
      failed: {
        color: "#f44336",
        bgcolor: "#ffebee",
        icon: "✗",
        label: formatMessage(intl, "individual", "ImportDataApiPage.status.failed"),
      },
      cancelled: {
        color: "#9e9e9e",
        bgcolor: "#f5f5f5",
        icon: "⊘",
        label: formatMessage(intl, "individual", "ImportDataApiPage.status.cancelled"),
      },
    };

    const config = statusConfig[status] || statusConfig.completed;

    return (
      <Tooltip
        title={status === "failed" && errorMessage ? errorMessage : config.label}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "0.75rem",
            fontWeight: 500,
            backgroundColor: config.bgcolor,
            color: config.color,
          }}
        >
          {typeof config.icon === "string" ? (
            <span style={{ marginRight: 4 }}>{config.icon}</span>
          ) : (
            config.icon
          )}
          {config.label}
        </span>
      </Tooltip>
    );
  };

  return (
    <>
      <Helmet title={formatMessage(intl, "individual", "ImportDataApiPage.title")} />

      <div className={classes.page}>
        <Grid container spacing={2}>
          {/* ====== SECTION 1: API Services ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(intl, "individual", "ImportPageAPI.ImportPage")}
                </Typography>
              </div>

              <TableContainer component={Paper} elevation={0} className={classes.tableContainerBg}>
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      {API_WORKFLOW_HEADERS.map((h) => (
                        <TableCell key={h}>{formatMessage(intl, "individual", h)}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} style={{ paddingTop: 0, paddingBottom: 0 }}>
                        <ProgressOrError progress={fetchingApiEtlServices} error={errorApiEtlServices} />
                      </TableCell>
                    </TableRow>

                    {apiEtlServices.map((etl) => (
                      <TableRow key={etl.nameOfService}>
                        <TableCell>{etl.nameOfService}</TableCell>
                        <TableCell>
                          <Tooltip title={formatMessage(intl, "individual", "ImportPageAPI.triggerImport")}>
                            <span>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => openServiceConfirm(etl.nameOfService)}
                                disabled={Array.isArray(mutations) && mutations.length > 0}
                              >
                                {formatMessage(intl, "individual", "ImportPageAPI.triggerImport")}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {(!apiEtlServices || apiEtlServices.length === 0) &&
                      !fetchingApiEtlServices &&
                      !errorApiEtlServices && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <Typography variant="body2" color="textSecondary" align="center" style={{ padding: 16 }}>
                              {formatMessage(intl, "individual", "ImportDataApiPage.noHistoryData")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* ====== SECTION 2: PAA-Based Import with Questionnaire Selection ====== */}
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <div className={classes.headerBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(intl, "individual", "ImportDataApiPage.importControls.title")}
                </Typography>
              </div>

              <Divider />

              <Grid container spacing={3} className={classes.formRow}>
                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(region) => {
                      setSelectedRegion(region);
                      setSelectedDistrict(null);
                      setSelectedQuestionnaire(null);
                    }}
                    value={selectedRegion}
                    locationLevel={0}
                    label={formatMessage(intl, "individual", "ImportDataApiPage.region")}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(district) => {
                      setSelectedDistrict(district);
                      setSelectedQuestionnaire(null);
                    }}
                    value={selectedDistrict}
                    parentLocation={selectedRegion}
                    locationLevel={1}
                    label={formatMessage(intl, "individual", "ImportDataApiPage.district")}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={4} />
              </Grid>

              {selectedDistrict && (
                <>
                  <Grid container spacing={3} className={classes.formRow}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" style={{ fontWeight: 500, marginTop: 16 }}>
                        {formatMessage(intl, "individual", "ImportDataApiPage.selectQuestionnaire.title")}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatMessage(intl, "individual", "ImportDataApiPage.selectQuestionnaire.subtitle")}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid container spacing={3} className={classes.formRow}>
                    <Grid item xs={12} md={8}>
                      <FormControl fullWidth>
                        <InputLabel id="questionnaire-select-label">
                          {formatMessage(intl, "individual", "ImportDataApiPage.questionnaire")}
                        </InputLabel>
                        <Select
                          labelId="questionnaire-select-label"
                          value={selectedQuestionnaire || ""}
                          onChange={(e) => setSelectedQuestionnaire(e.target.value)}
                          disabled={fetchingQuestionnaires}
                        >
                          <MenuItem value="">
                            <em>
                              {formatMessage(intl, "individual", "ImportDataApiPage.questionnaire.autoDetect")}
                            </em>
                          </MenuItem>

                          {availableQuestionnaires
                            .filter(
                              (q) =>
                                !questionnaireSearchTerm ||
                                q.title.toLowerCase().includes(questionnaireSearchTerm.toLowerCase())
                            )
                            .map((q) => (
                              <MenuItem key={q.identity} value={q.identity}>
                                <div style={{ width: "100%" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span style={{ fontWeight: 500 }}>{q.title}</span>
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: (q.matchingScore ?? q.matching_score) >= 2 ? "#4caf50" : "#ff9800",
                                        marginLeft: 8,
                                      }}
                                    >
                                      v{q.version}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#757575" }}>
                                    {q.identity}
                                    {(q.matchingScore ?? q.matching_score) > 0 && (
                                      <span style={{ marginLeft: 8 }}>
                                        • Score: {q.matchingScore ?? q.matching_score} (
                                        {q.matchingStrategy ?? q.matching_strategy})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </MenuItem>
                            ))}
                        </Select>

                        {fetchingQuestionnaires && (
                          <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                            <CircularProgress size={16} style={{ marginRight: 8 }} />
                            <Typography variant="caption" color="textSecondary">
                              {formatMessage(intl, "individual", "ImportDataApiPage.loadingQuestionnaires")}
                            </Typography>
                          </div>
                        )}

                        {errorQuestionnaires && !fetchingQuestionnaires && (
                          <Typography variant="caption" color="error" style={{ marginTop: 8 }}>
                            {formatMessage(intl, "individual", "ImportDataApiPage.errorLoadingQuestionnaires")}
                          </Typography>
                        )}

                        {!fetchingQuestionnaires && availableQuestionnaires.length === 0 && (
                          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                            {formatMessage(intl, "individual", "ImportDataApiPage.noQuestionnairesFound")}
                          </Typography>
                        )}

                        {selectedQuestionnaire && (
                          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                            {formatMessage(intl, "individual", "ImportDataApiPage.questionnaireSelected")}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label={formatMessage(intl, "individual", "ImportDataApiPage.searchQuestionnaires")}
                        value={questionnaireSearchTerm}
                        onChange={(e) => setQuestionnaireSearchTerm(e.target.value)}
                        placeholder={formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.searchQuestionnaires.placeholder"
                        )}
                        disabled={fetchingQuestionnaires || availableQuestionnaires.length === 0}
                      />
                    </Grid>
                  </Grid>
                </>
              )}

              <Grid container spacing={3} className={classes.formRow}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTriggerPAAImport}
                    disabled={
                      !selectedRegion ||
                      !selectedDistrict ||
                      (Array.isArray(mutations) && mutations.length > 0)
                    }
                    fullWidth
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                  >
                    {isSubmitting
                      ? formatMessage(intl, "individual", "ImportDataApiPage.importing")
                      : formatMessage(intl, "individual", "ImportDataApiPage.triggerImport")}
                  </Button>
                </Grid>
              </Grid>

              <Grid container spacing={2} className={classes.formRow}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAdvancedOptions}
                        onChange={(e) => setShowAdvancedOptions(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={formatMessage(intl, "individual", "ImportDataApiPage.showAdvancedOptions")}
                  />
                </Grid>

                {showAdvancedOptions && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={formatMessage(intl, "individual", "ImportDataApiPage.manualQuestionnaireId")}
                        value={manualQuestionnaireId}
                        onChange={(e) => setManualQuestionnaireId(e.target.value)}
                        placeholder="GUID$version (e.g., 123...$3)"
                        helperText={
                          <span className={classes.helperText}>
                            {formatMessage(intl, "individual", "ImportDataApiPage.manualQuestionnaireId.help")}
                          </span>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} color="primary" />
                        }
                        label={formatMessage(intl, "individual", "ImportDataApiPage.dryRun")}
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {!!mutation?.error && (
                <Typography color="error" style={{ marginTop: 16 }}>
                  {formatMessage(intl, "individual", "ImportDataApiPage.error")}:{" "}
                  {mutation.error?.message || JSON.stringify(mutation.error)}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* ====== SECTION 3: Pulled Questionnaires History ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              {/* Title ONLY in header */}
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(intl, "individual", "ImportDataApiPage.pulledQuestionnaires.title")}
                </Typography>
              </div>

              <TableContainer component={Paper} elevation={0} className={classes.tableContainerBg}>
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      <TableCell>
                        {formatMessage(intl, "individual", "ImportDataApiPage.table.paaName")}
                      </TableCell>
                      <TableCell>
                        {formatMessage(intl, "individual", "ImportDataApiPage.table.numberOfHouseholds")}
                      </TableCell>
                      <TableCell>
                        {formatMessage(intl, "individual", "ImportDataApiPage.table.numberOfMembers")}
                      </TableCell>
                      <TableCell>
                        {formatMessage(intl, "individual", "ImportDataApiPage.table.datePulled")}
                      </TableCell>
                      <TableCell>
                        {formatMessage(intl, "individual", "ImportDataApiPage.table.status")}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className={classes.loadingBox}>
                            <CircularProgress />
                            <Typography variant="body2" style={{ marginTop: 8 }}>
                              {formatMessage(intl, "individual", "ImportDataApiPage.loadingHistory")}
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {!!errorPulledQ && !fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography color="error">
                            {formatMessage(intl, "individual", "ImportDataApiPage.errorLoadingHistory")}:{" "}
                            {formatErr(errorPulledQ)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {!fetchingPulledQ &&
                      !errorPulledQ &&
                      Array.isArray(pulledQ) &&
                      pulledQ.length > 0 &&
                      pulledQ.map((item, idx) => (
                        <TableRow key={`${item.paaName || "row"}_${idx}`}>
                          <TableCell>{item.paaName}</TableCell>
                          <TableCell>{item.numberOfHouseholds || 0}</TableCell>
                          <TableCell>{item.numberOfMembers || 0}</TableCell>
                          <TableCell>
                            {item.datePulled ? new Date(item.datePulled).toLocaleDateString() : ""}
                          </TableCell>
                          <TableCell>{renderStatusBadge(item.status || "completed", item.errorMessage)}</TableCell>
                        </TableRow>
                      ))}

                    {!fetchingPulledQ && !errorPulledQ && (!pulledQ || pulledQ.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="textSecondary" align="center" style={{ padding: 20 }}>
                            {formatMessage(intl, "individual", "ImportDataApiPage.noHistoryData")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* ✅ Pagination controls at the BOTTOM (not in header) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  {rangeText}
                </Typography>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <FormControl size="small" style={{ minWidth: 90 }}>
                    <Select value={pulledQPageSize} onChange={onPageSizeChange}>
                      {[5, 10, 20, 50].map((n) => (
                        <MenuItem key={n} value={n}>
                          {n}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button variant="outlined" onClick={onPrev} disabled={!hasPrev || fetchingPulledQ}>
                    Prev
                  </Button>
                  <Button variant="outlined" onClick={onNext} disabled={!hasNext || fetchingPulledQ}>
                    Next
                  </Button>
                </div>
              </div>
            </Paper>
          </Grid>
        </Grid>
      </div>

      {/* Confirm dialog for API services trigger */}
      <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>
          {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.message")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="primary" disabled={isSubmitting}>
            {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.cancel")}
          </Button>

          <Button
            onClick={handleConfirmServicePull}
            color="primary"
            variant="contained"
            autoFocus
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
          >
            {isSubmitting
              ? formatMessage(intl, "individual", "ImportDataApiPage.importing")
              : formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm dialog for PAA Import trigger */}
      <Dialog open={openPAAConfirmDialog} onClose={() => setOpenPAAConfirmDialog(false)}>
        <DialogTitle>
          {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.message")}
          </DialogContentText>
          {selectedDistrict && (
            <Typography variant="body2" style={{ marginTop: 16 }}>
              <strong>District:</strong> {selectedDistrict.name}
            </Typography>
          )}
          {selectedQuestionnaire && (
            <Typography variant="body2">
              <strong>Questionnaire:</strong> {selectedQuestionnaire}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPAAConfirmDialog(false)} color="primary" disabled={isSubmitting}>
            {formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.cancel")}
          </Button>

          <Button
            onClick={handleConfirmPAAImport}
            color="primary"
            variant="contained"
            autoFocus
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
          >
            {isSubmitting
              ? formatMessage(intl, "individual", "ImportDataApiPage.importing")
              : formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  pulledQ: state.individual?.pulledQ,
  fetchingPulledQ: state.individual?.fetchingPulledQ,
  errorPulledQ: state.individual?.errorPulledQ,
  fetchedPulledQ: state.individual?.fetchedPulledQ,

  pulledQPageInfo: state.individual?.pulledQPageInfo,
  pulledQTotalCount: state.individual?.pulledQTotalCount,

  submittingMutation: state.individual?.submittingMutation,
  mutation: state.individual?.mutation,
  mutations: state.individual?.mutations,

  submittingLegacyEtl: state.individual?.submittingLegacyEtl,
  submittingPaaEtl: state.individual?.submittingPaaEtl,

  fetchingApiEtlServices: state.individual?.fetchingApiEtlServices,
  apiEtlServices: state.individual?.apiEtlServices,
  errorApiEtlServices: state.individual?.errorApiEtlServices,

  fetchingQuestionnaires: state.individual?.fetchingQuestionnaires,
  availableQuestionnaires: state.individual?.availableQuestionnaires || [],
  errorQuestionnaires: state.individual?.errorQuestionnaires,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      journalize,
      fetchPulledQuestionnaires,
      confirmPullingDataFromApiEtl,
      fetchApiEtlServices,
      fetchMutationByLabel,
      fetchAvailableQuestionnaires,
    },
    dispatch
  );

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(ImportDataApiPage)
      )
    )
  )
);
