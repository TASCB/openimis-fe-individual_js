import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

// Material-UI v4 (grouped)
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
} from "@material-ui/core";
import { withStyles, withTheme } from "@material-ui/core/styles";

// Dialogs (direct paths for MUI v4)
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
} from "../actions";

/** Styles aligned to openIMIS theme */
const styles = (theme) => {
  const headerBG =
    theme?.table?.header?.backgroundColor ??
    (theme.palette?.action?.hover || "#e0f2f1");
  const headerColor =
    theme?.table?.header?.color ?? theme.palette?.text?.primary;
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
    actionsRow: { display: "flex", alignItems: "flex-end" },
    tablePaper: { ...theme.paper, padding: 0, overflow: "hidden" },
    tableHeaderBar: { padding: theme.spacing(2) },
    tableWrapper: { padding: theme.spacing(2), paddingTop: 0 },
    loadingBox: { textAlign: "center", padding: theme.spacing(3) },
    helperText: { color: theme.palette.text.secondary },

    /** openIMIS table header styles (used by TableHead/TableRow) */
    header: theme.table?.header,
    headerTitle: theme.table?.title,

    /**
     * ✅ Hard override the header background for BOTH normal & sticky headers.
     * We use a high-specificity selector + !important to beat MUI defaults.
     */
    tealHead: {
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-root":
        {
          backgroundColor: `${headerBG} !important`,
          color: `${headerColor} !important`,
          fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
        },
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-stickyHeader":
        {
          backgroundColor: `${headerBG} !important`,
          color: `${headerColor} !important`,
          fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
        },
    },

    /** Match table body background to the section/paper */
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

  // actions
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
}) {
  // ---- Region/District (ETL control)
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Advanced options
  const [manualQuestionnaireId, setManualQuestionnaireId] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // API services confirm dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [serviceToPullData, setServiceToPullData] = useState(null);
  // lock UI while any ETL/mutation is running
  const isSubmitting =
    submittingLegacyEtl || submittingPaaEtl || submittingMutation;

  // Initial loads
  useEffect(() => {
    if (!fetchedPulledQ && !fetchingPulledQ) {
      fetchPulledQuestionnaires();
    }
    fetchApiEtlServices();
    // fetchMutationByLabel(
    //   formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData")
    // );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch history when filters change
  useEffect(() => {
    if (selectedRegion || selectedDistrict) {
      fetchPulledQuestionnaires(
        selectedRegion?.code || null,
        selectedDistrict?.code || null
      );
    }
  }, [selectedRegion, selectedDistrict, fetchPulledQuestionnaires]);

  // Refresh history after successful PAA import
  useEffect(() => {
    if (mutation?.clientMutationId && !submittingMutation && !mutation?.error) {
      fetchPulledQuestionnaires(
        selectedRegion?.code || null,
        selectedDistrict?.code || null
      );
    }
  }, [
    mutation,
    submittingMutation,
    fetchPulledQuestionnaires,
    selectedRegion,
    selectedDistrict,
  ]);

  // Keep mutation-by-label in sync (used for disabling API “Send” button)
  useEffect(() => {
    fetchMutationByLabel(
      formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData")
    );
  }, [serviceToPullData, fetchMutationByLabel, intl]);

  // --- Handlers (ETL PAA)
  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setSelectedDistrict(null);
  };
  const handleDistrictChange = (district) => setSelectedDistrict(district);

  const handleTriggerPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;

    const params = {
      paaName: selectedDistrict.name,
      regionCode: selectedRegion.code,
      districtCode: selectedDistrict.code,
      dryRun,
    };
    if (manualQuestionnaireId.trim()) {
      params.questionnaireId = manualQuestionnaireId.trim();
    }
    const mutationLabel = `paa_etl_${selectedDistrict.code}_${Date.now()}`;
    // nameOfService ignored for PAA-based ETL (kept for compatibility)
    confirmPullingDataFromApiEtl(
      "SurveySolutionService",
      mutationLabel,
      params
    );
  };

  const canTriggerPAAImport =
    !!selectedRegion && !!selectedDistrict && !submittingMutation;

  // --- Handlers (API services)
  const openServiceConfirm = (etlService) => {
    setServiceToPullData(etlService);
    setOpenConfirmDialog(true);
  };
  const handleConfirmServicePull = () => {
    if (!serviceToPullData) return;

    // Guard: don’t allow double submit
    if (submittingLegacyEtl || submittingPaaEtl) {
      console.warn("ETL already in progress, ignoring duplicate request");
      return;
    }

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

  return (
    <>
      <Helmet
        title={formatMessage(intl, "individual", "ImportDataApiPage.title")}
      />
      <div className={classes.page}>
        <Grid container spacing={2}>
          {/* ====== SECTION 1: API Services (Send button first) ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    "individual",
                    "ImportPageAPI.ImportPage"
                  )}
                </Typography>
              </div>

              <TableContainer
                component={Paper}
                elevation={0}
                className={classes.tableContainerBg}
              >
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      {API_WORKFLOW_HEADERS.map((h) => (
                        <TableCell key={h}>
                          {formatMessage(intl, "individual", h)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        style={{ paddingTop: 0, paddingBottom: 0 }}
                      >
                        <ProgressOrError
                          progress={fetchingApiEtlServices}
                          error={errorApiEtlServices}
                        />
                      </TableCell>
                    </TableRow>

                    {apiEtlServices.map((etl) => (
                      <TableRow key={etl.nameOfService}>
                        <TableCell>{etl.nameOfService}</TableCell>
                        <TableCell>
                          <Tooltip
                            title={formatMessage(
                              intl,
                              "individual",
                              "ImportPageAPI.triggerImport"
                            )}
                          >
                            <span>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() =>
                                  openServiceConfirm(etl.nameOfService)
                                }
                                disabled={
                                  Array.isArray(mutations) &&
                                  mutations.length > 0
                                }
                              >
                                {formatMessage(
                                  intl,
                                  "individual",
                                  "ImportPageAPI.triggerImport"
                                )}
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
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              align="center"
                              style={{ padding: 16 }}
                            >
                              {formatMessage(
                                intl,
                                "individual",
                                "ImportDataApiPage.noHistoryData"
                              )}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* ====== SECTION 2: ETL Controls (Region/District) ====== */}
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <div className={classes.headerBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    "individual",
                    "ImportDataApiPage.importControls.title"
                  )}
                </Typography>
              </div>

              <Divider />

              <Grid container spacing={3} className={classes.formRow}>
                {/* Region Picker */}
                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={handleRegionChange}
                    value={selectedRegion}
                    locationLevel={0}
                    label={formatMessage(
                      intl,
                      "individual",
                      "ImportDataApiPage.region"
                    )}
                    required
                  />
                </Grid>

                {/* District Picker */}
                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={handleDistrictChange}
                    value={selectedDistrict}
                    parentLocation={selectedRegion}
                    locationLevel={1}
                    label={formatMessage(
                      intl,
                      "individual",
                      "ImportDataApiPage.district"
                    )}
                    required
                  />
                </Grid>

                {/* Trigger PAA Import */}
                <Grid item xs={12} md={4} className={classes.actionsRow}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTriggerPAAImport}
                    disabled={!canTriggerPAAImport}
                    fullWidth
                    startIcon={
                      submittingMutation ? <CircularProgress size={20} /> : null
                    }
                  >
                    {submittingMutation
                      ? formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.importing"
                        )
                      : formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.triggerImport"
                        )}
                  </Button>
                </Grid>
              </Grid>

              {/* Advanced Options */}
              <Grid container spacing={2} className={classes.formRow}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showAdvancedOptions}
                        onChange={(e) =>
                          setShowAdvancedOptions(e.target.checked)
                        }
                        color="primary"
                      />
                    }
                    label={formatMessage(
                      intl,
                      "individual",
                      "ImportDataApiPage.showAdvancedOptions"
                    )}
                  />
                </Grid>

                {showAdvancedOptions && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.manualQuestionnaireId"
                        )}
                        value={manualQuestionnaireId}
                        onChange={(e) =>
                          setManualQuestionnaireId(e.target.value)
                        }
                        placeholder="GUID$version (e.g., 12345678-1234-1234-1234-123456789012$3)"
                        helperText={
                          <span className={classes.helperText}>
                            {formatMessage(
                              intl,
                              "individual",
                              "ImportDataApiPage.manualQuestionnaireId.help"
                            )}
                          </span>
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={dryRun}
                            onChange={(e) => setDryRun(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.dryRun"
                        )}
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Mutation error (safely rendered) */}
              {!!mutation?.error && (
                <Typography color="error" style={{ marginTop: 16 }}>
                  {formatMessage(intl, "individual", "ImportDataApiPage.error")}
                  : {formatErr(mutation.error)}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* ====== SECTION 3: Pulled Questionnaires History ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    "individual",
                    "ImportDataApiPage.pulledQuestionnaires.title"
                  )}
                </Typography>
              </div>

              <TableContainer
                component={Paper}
                elevation={0}
                className={classes.tableContainerBg}
              >
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      <TableCell>
                        {formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.table.paaName"
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.table.numberOfHouseholds"
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMessage(
                          intl,
                          "individual",
                          "ImportDataApiPage.table.datePulled"
                        )}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <div className={classes.loadingBox}>
                            <CircularProgress />
                            <Typography
                              variant="body2"
                              style={{ marginTop: 8 }}
                            >
                              {formatMessage(
                                intl,
                                "individual",
                                "ImportDataApiPage.loadingHistory"
                              )}
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {!!errorPulledQ && !fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography color="error">
                            {formatMessage(
                              intl,
                              "individual",
                              "ImportDataApiPage.errorLoadingHistory"
                            )}
                            : {formatErr(errorPulledQ)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {!fetchingPulledQ &&
                      Array.isArray(pulledQ) &&
                      pulledQ.length > 0 &&
                      pulledQ.map((item, idx) => (
                        <TableRow key={`${item.paaName || "row"}_${idx}`}>
                          <TableCell>{item.paaName}</TableCell>
                          <TableCell>{item.numberOfHouseholds || 0}</TableCell>
                          <TableCell>
                            {item.datePulled
                              ? new Date(item.datePulled).toLocaleDateString()
                              : ""}
                          </TableCell>
                        </TableRow>
                      ))}

                    {!fetchingPulledQ && (!pulledQ || pulledQ.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            align="center"
                            style={{ padding: 20 }}
                          >
                            {formatMessage(
                              intl,
                              "individual",
                              "ImportDataApiPage.noHistoryData"
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </div>

      {/* Confirm dialog for API services trigger */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
      >
        <DialogTitle>
          {formatMessage(
            intl,
            "individual",
            "ImportPageAPI.confirmPullingData.title"
          )}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {formatMessage(
              intl,
              "individual",
              "ImportPageAPI.confirmPullingData.message"
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenConfirmDialog(false)}
            color="primary"
            disabled={isSubmitting}
          >
            {formatMessage(
              intl,
              "individual",
              "ImportPageAPI.confirmPullingData.cancel"
            )}
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
              : formatMessage(
                  intl,
                  "individual",
                  "ImportPageAPI.confirmPullingData.confirm"
                )}
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

  submittingMutation: state.individual?.submittingMutation,
  mutation: state.individual?.mutation,
  mutations: state.individual?.mutations,

  submittingLegacyEtl: state.individual?.submittingLegacyEtl,
  submittingPaaEtl: state.individual?.submittingPaaEtl,

  fetchingApiEtlServices: state.individual?.fetchingApiEtlServices,
  apiEtlServices: state.individual?.apiEtlServices,
  errorApiEtlServices: state.individual?.errorApiEtlServices,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      journalize,
      fetchPulledQuestionnaires,
      confirmPullingDataFromApiEtl,
      fetchApiEtlServices,
      fetchMutationByLabel,
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
