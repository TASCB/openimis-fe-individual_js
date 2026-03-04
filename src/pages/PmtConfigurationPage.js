import React, { useState, useEffect, useMemo } from "react";
import { injectIntl } from "react-intl";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  Paper,
  Grid,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Divider,
  Card,
  CardContent,
} from "@material-ui/core";
import {
  Helmet,
  withModulesManager,
  formatMessage,
  PublishedComponent,
} from "@openimis/fe-core";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import { rerunPmt, fetchPmtAuditSummary } from "../actions";
import PmtAuditSummaryTable from "../components/PmtAuditSummaryTable";
import PmtConfirmationDialog from "../components/dialogs/PmtConfirmationDialog";
import PmtProgressDialog from "../components/dialogs/PmtProgressDialog";
import {
  RIGHT_PMT_RERUN,
  PMT_DEFAULT_CUTOFF,
  INDIVIDUAL_MODULE_NAME,
} from "../constants";
import { validatePmtConfiguration } from "../util/pmt-validation";

const styles = (theme) => {
  const headerBG =
    theme?.table?.header?.backgroundColor ??
    theme.palette?.action?.hover ??
    "#e0f2f1";

  const headerColor =
    theme?.table?.header?.color ?? theme.palette?.text?.primary;

  const bodyBG =
    theme?.table?.backgroundColor ??
    theme?.paper?.background ??
    theme.palette?.background?.paper;

  return {
    page: theme.page,
    paper: { ...theme.paper, padding: theme.spacing(2) },
    tablePaper: { ...theme.paper, padding: 0, overflow: "hidden" },

    headerBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing(1),
    },

    tableHeaderBar: { padding: theme.spacing(2) },
    sectionTitle: { fontWeight: 600 },

    header: theme.table?.header,
    headerTitle: theme.table?.title,

    tealHead: {
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-root": {
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

    tableContainerBg: { backgroundColor: bodyBG },

    loadingBox: { textAlign: "center", padding: theme.spacing(3) },

    errorBox: {
      backgroundColor: "#ffebee",
      color: "#c62828",
      padding: theme.spacing(2),
      marginTop: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
    },

    infoBox: {
      backgroundColor: "#e3f2fd",
      color: "#1565c0",
      padding: theme.spacing(2),
      marginTop: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
      fontSize: "0.875rem",
    },

    gridContainer: { marginBottom: theme.spacing(2) },

    buttonContainer: {
      marginTop: theme.spacing(2),
      display: "flex",
      gap: theme.spacing(1),
      justifyContent: "flex-start",
    },
  };
};

function PmtConfigurationPage({
  classes,
  theme,
  modulesManager,
  intl,
  rights,
  submittingPmtRerun,
  pmtRerunMutation,
  errorPmtRerun,
  rerunPmt: rerunPmtAction,
  fetchPmtAuditSummary: fetchPmtAuditSummaryAction,
}) {
  // Permission check
  if (!rights || !rights.includes(RIGHT_PMT_RERUN)) {
    return (
      <div className={classes.page}>
        <Helmet
          title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.page.title")}
        />
        <Card>
          <CardContent>
            <Typography color="error">
              {formatMessage(
                intl,
                INDIVIDUAL_MODULE_NAME,
                "pmt.message.permissionDenied"
              )}
            </Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Local state
  const [pmtCutoff, setPmtCutoff] = useState(PMT_DEFAULT_CUTOFF.toString());
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openProgressDialog, setOpenProgressDialog] = useState(false);

  const [configError, setConfigError] = useState(null);

  // This ID is passed to progress dialog polling (pmtRunProgress)
  const [progressMutationId, setProgressMutationId] = useState(null);
  // Store the district code from the current rerun
  const [rerunDistrictCode, setRerunDistrictCode] = useState(null);

  const validation = useMemo(
    () =>
      validatePmtConfiguration({
        pmtCutoff,
        selectedDistrict,
      }),
    [pmtCutoff, selectedDistrict]
  );

  const handleApplyConfiguration = () => {
    setConfigError(null);

    const { isValid: configIsValid, errors } = validatePmtConfiguration({
      pmtCutoff,
      selectedDistrict,
    });

    if (!configIsValid) {
      setConfigError(errors.cutoff || errors.district || "Validation failed");
      return;
    }

    setOpenConfirmDialog(true);
  };

  const handleConfirmApply = () => {
    setOpenConfirmDialog(false);

    // Reset any previous run so we don't show stale progress
    setProgressMutationId(null);
    setOpenProgressDialog(false);

    const districtCode = selectedDistrict?.code || selectedDistrict;
    const regionCode = selectedRegion?.code || selectedRegion;

    // Store the district code so we can refetch audit summary after rerun
    setRerunDistrictCode(districtCode);

    // Trigger PMT rerun mutation
    rerunPmtAction(
      modulesManager,
      districtCode,
      regionCode,
      parseFloat(pmtCutoff)
    );

    // Do NOT open progress dialog yet.
    // We open it once we actually extract mutationId from the mutation response.
  };

  /**
   * Extract mutationId from rerunPmt response.
   *
   * Backend must expose `mutation_id` field on the mutation output.
   * In GraphQL it becomes `mutationId`.
   */
  useEffect(() => {
    console.log('DEBUG: pmtRerunMutation =', pmtRerunMutation);
    console.log('DEBUG: pmtRerunMutation?.data =', pmtRerunMutation?.data);
    console.log('DEBUG: pmtRerunMutation?.rerunPmt =', pmtRerunMutation?.rerunPmt);

    const mutationId =
      pmtRerunMutation?.data?.rerunPmt?.mutationId ||
      pmtRerunMutation?.rerunPmt?.mutationId ||
      null;

    console.log('DEBUG: extracted mutationId =', mutationId);

    if (mutationId && mutationId !== progressMutationId) {
      console.log('DEBUG: Opening progress dialog with mutationId:', mutationId);
      setProgressMutationId(mutationId);
      setOpenProgressDialog(true);
    }
  }, [pmtRerunMutation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Helmet
        title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.page.title")}
      />

      <div className={classes.page}>
        <Grid container spacing={2}>
          {/* Configuration Section */}
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <div className={classes.headerBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    INDIVIDUAL_MODULE_NAME,
                    "pmt.configuration.title"
                  )}
                </Typography>
              </div>

              <Divider style={{ marginBottom: theme.spacing(2) }} />

              <Grid container spacing={2} className={classes.gridContainer}>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    label={formatMessage(
                      intl,
                      INDIVIDUAL_MODULE_NAME,
                      "pmt.configuration.cutoff"
                    )}
                    type="number"
                    value={pmtCutoff}
                    onChange={(e) => setPmtCutoff(e.target.value)}
                    disabled={submittingPmtRerun}
                    inputProps={{ step: "0.01", min: "0", max: "50" }}
                    helperText={formatMessage(
                      intl,
                      INDIVIDUAL_MODULE_NAME,
                      "pmt.configuration.cutoffHint"
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(region) => {
                      setSelectedRegion(region);
                      setSelectedDistrict(null);
                    }}
                    value={selectedRegion}
                    locationLevel={0}
                    label={formatMessage(
                      intl,
                      INDIVIDUAL_MODULE_NAME,
                      "pmt.configuration.region"
                    )}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(district) => setSelectedDistrict(district)}
                    value={selectedDistrict}
                    parentLocation={selectedRegion}
                    locationLevel={1}
                    label={formatMessage(
                      intl,
                      INDIVIDUAL_MODULE_NAME,
                      "pmt.configuration.district"
                    )}
                    required
                  />
                </Grid>
              </Grid>

              <div className={classes.infoBox}>
                {formatMessage(
                  intl,
                  INDIVIDUAL_MODULE_NAME,
                  "pmt.configuration.info"
                )}
              </div>

              {configError && (
                <div className={classes.errorBox}>{configError}</div>
              )}

              {errorPmtRerun && (
                <div className={classes.errorBox}>
                  {typeof errorPmtRerun === "string"
                    ? errorPmtRerun
                    : "Error applying PMT configuration"}
                </div>
              )}

              <div className={classes.buttonContainer}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleApplyConfiguration}
                  disabled={!validation.isValid || submittingPmtRerun}
                  startIcon={
                    submittingPmtRerun ? <CircularProgress size={20} /> : null
                  }
                >
                  {submittingPmtRerun
                    ? formatMessage(
                        intl,
                        INDIVIDUAL_MODULE_NAME,
                        "pmt.message.loading"
                      )
                    : formatMessage(
                        intl,
                        INDIVIDUAL_MODULE_NAME,
                        "pmt.configuration.button"
                      )}
                </Button>
              </div>
            </Paper>
          </Grid>

          {/* PMT Audit Summary Section */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    INDIVIDUAL_MODULE_NAME,
                    "pmt.auditSummary.title"
                  )}
                </Typography>
              </div>

              <Divider style={{ marginBottom: theme.spacing(2) }} />

              <PmtAuditSummaryTable
                onViewDistrict={(districtCode, pmtCutoffValue) => {
                  window.location.href = `/pmt/enrollment-list?district=${districtCode}&cutoff=${pmtCutoffValue}`;
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </div>

      <PmtConfirmationDialog
        open={openConfirmDialog}
        onConfirm={handleConfirmApply}
        onCancel={() => setOpenConfirmDialog(false)}
        config={{
          districtName: selectedDistrict?.name,
          pmtCutoff,
        }}
        disabled={submittingPmtRerun}
      />

      <PmtProgressDialog
        open={openProgressDialog}
        mutationId={progressMutationId}
        onClose={() => {
          setOpenProgressDialog(false);
          setProgressMutationId(null);
          // Refetch audit summary to show all recently rerun districts
          // sorted by most recent first (backend handles sorting)
          if (rerunDistrictCode) {
            fetchPmtAuditSummaryAction(modulesManager, {
              offset: 0,
              limit: 50,  // Show up to 50 most recent reruns
            });
          }
        }}
      />
    </>
  );
}

const mapStateToProps = (state) => ({
  submittingPmtRerun: state.individual.submittingPmtRerun,
  pmtRerunMutation: state.individual.pmtRerunMutation,
  errorPmtRerun: state.individual.errorPmtRerun,
  rights: state.core?.user?.i_user?.rights || [],
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      rerunPmt,
      fetchPmtAuditSummary,
    },
    dispatch
  );

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(PmtConfigurationPage)
      )
    )
  )
);