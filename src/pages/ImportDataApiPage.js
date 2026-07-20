import React, { useState, useEffect, useMemo } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

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

import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import {
  Helmet,
  PublishedComponent,
  withModulesManager,
  journalize,
  formatMessage,
  formatMessageWithValues,
  ProgressOrError,
  Searcher,
} from "@openimis/fe-core";
import { injectIntl } from "react-intl";

import {
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
} from "../actions";
import { DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from "../constants";

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

const ZANZIBAR_PAA_BY_CODE = {
  54: "PEMBA",
  55: "PEMBA",
  51: "UNGUJA",
  52: "UNGUJA",
  53: "UNGUJA",
};

const getZanzibarPaaScope = (...locations) => {
  for (const location of locations) {
    const code = location?.code ? String(location.code) : "";
    const exactScope = ZANZIBAR_PAA_BY_CODE[code];
    if (exactScope) return exactScope;

    const parentCode = Object.keys(ZANZIBAR_PAA_BY_CODE).find(
      (paaCode) => code.startsWith(paaCode) && code !== paaCode,
    );
    if (parentCode) return ZANZIBAR_PAA_BY_CODE[parentCode];
  }
  return null;
};

function ImportDataApiPage({
  intl,
  classes,
  modulesManager,
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
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
}) {
  
  const [historyReset, setHistoryReset] = useState(0);
  const refreshHistory = () => setHistoryReset((k) => k + 1);

  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [questionnaireSearchTerm, setQuestionnaireSearchTerm] = useState("");

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const [manualQuestionnaireId, setManualQuestionnaireId] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [serviceToPullData, setServiceToPullData] = useState(null);

  const [openPAAConfirmDialog, setOpenPAAConfirmDialog] = useState(false);

  const isSubmitting =
    submittingLegacyEtl || submittingPaaEtl || submittingMutation;

  const selectedPaaScope = useMemo(
    () => getZanzibarPaaScope(selectedDistrict, selectedRegion),
    [selectedDistrict, selectedRegion],
  );
  const selectedPaaName = selectedPaaScope || selectedDistrict?.name;

  const HISTORY_HEADERS = [
    "ImportDataApiPage.table.paaName",
    "ImportDataApiPage.table.numberOfHouseholds",
    "ImportDataApiPage.table.numberOfMembers",
    "ImportDataApiPage.table.questionnaireVersion",
    "ImportDataApiPage.table.datePulled",
    "ImportDataApiPage.table.status",
  ];
  const historyHeaders = () => HISTORY_HEADERS;
  const historyItemFormatters = () => [
    (item) => item.paaName,
    (item) => item.numberOfHouseholds || 0,
    (item) => item.numberOfMembers || 0,
    (item) => (item.questionnaireVersion ?? ""),
    (item) => (item.datePulled ? new Date(item.datePulled).toLocaleDateString() : ""),
    (item) => renderStatusBadge(item.status || "completed", item.errorMessage),
  ];
  
  const historyFiltersToQueryParams = ({ pageSize, afterCursor, beforeCursor }) => ({
    pageSize,
    after: afterCursor,
    before: beforeCursor,
    regionCode: selectedRegion?.code || null,
    districtCode: selectedDistrict?.code || null,
  });
  const historyFetch = (params) => fetchPulledQuestionnaires(modulesManager, params);

  useEffect(() => {
    fetchApiEtlServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion, selectedDistrict]);

  useEffect(() => {
    const label = mutation?.clientMutationLabel || "";
    const isEtl = label.startsWith("paa_etl_") || label.startsWith("etl_");

    if (
      isEtl &&
      mutation?.clientMutationId &&
      !submittingMutation &&
      !mutation?.error
    ) {
      refreshHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation, submittingMutation]);

  useEffect(() => {
    fetchMutationByLabel(
      formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData")
    );
  }, [serviceToPullData, fetchMutationByLabel, intl]);

  useEffect(() => {
    if (selectedDistrict && selectedRegion) {
      fetchAvailableQuestionnaires(
        selectedDistrict.code,
        selectedRegion.code,
        selectedPaaName,
        false
      );
      setSelectedQuestionnaire(null);
      setQuestionnaireSearchTerm("");
    }
  }, [selectedDistrict, selectedRegion, selectedPaaName, fetchAvailableQuestionnaires]);

  useEffect(() => {
    const hasRunningImports =
      pulledQ && pulledQ.some((item) => item.status === "running");

    if (!hasRunningImports) return undefined;

    const intervalId = setInterval(refreshHistory, 12000); 
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulledQ, selectedRegion, selectedDistrict]);

  const handleTriggerPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;
    setOpenPAAConfirmDialog(true);
  };

  const handleConfirmPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;

    if (submittingLegacyEtl || submittingPaaEtl || submittingMutation) return;

    const params = {
      paaName: selectedPaaName,
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
                                disabled={isSubmitting}
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
                  {selectedPaaScope && (
                    <Grid container spacing={3} className={classes.formRow}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                          Zanzibar PAA scope: <strong>{selectedPaaScope}</strong>
                        </Typography>
                      </Grid>
                    </Grid>
                  )}

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
                      isSubmitting
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

          <Grid item xs={12}>
            <Searcher
              key={historyReset}
              module="individual"
              fetch={historyFetch}
              items={pulledQ}
              itemsPageInfo={{ ...(pulledQPageInfo || {}), totalCount: pulledQTotalCount }}
              fetchingItems={fetchingPulledQ}
              fetchedItems={fetchedPulledQ}
              errorItems={errorPulledQ}
              tableTitle={formatMessageWithValues(
                intl,
                "individual",
                "ImportDataApiPage.pulledQuestionnaires.searcherResultsTitle",
                { count: pulledQTotalCount ?? 0 },
              )}
              filtersToQueryParams={historyFiltersToQueryParams}
              headers={historyHeaders}
              itemFormatters={historyItemFormatters}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              rowIdentifier={(item) => `${item.paaName}-${item.datePulled}-${item.questionnaireVersion}`}
            />
          </Grid>
        </Grid>
      </div>

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
              {selectedPaaScope ? ` (${selectedPaaScope})` : ""}
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
