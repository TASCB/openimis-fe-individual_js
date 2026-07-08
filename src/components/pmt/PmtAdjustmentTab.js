import React, { useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Tab, Grid, Typography, Button, CircularProgress,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import {
  formatMessage, PublishedComponent, TextInput, withModulesManager,
} from '@openimis/fe-core';
import { adjustPmtCutoff, fetchPmtAuditSummary } from '../../actions';
import PmtConfirmationDialog from '../dialogs/PmtConfirmationDialog';
import PmtProgressDialog from '../dialogs/PmtProgressDialog';
import { validatePmtConfiguration } from '../../util/pmt-validation';
import {
  PMT_ADJUSTMENT_TAB_VALUE, PMT_DEFAULT_CUTOFF, INDIVIDUAL_MODULE_NAME,
} from '../../constants';

const styles = (theme) => ({
  paper: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  inlineAlert: { marginTop: theme.spacing(1) },
  gridContainer: { marginBottom: theme.spacing(2) },
  buttonContainer: { marginTop: theme.spacing(2), display: 'flex', gap: theme.spacing(1) },
});

function PmtAdjustmentTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_ADJUSTMENT_TAB_VALUE)}
      selected={isSelected(PMT_ADJUSTMENT_TAB_VALUE)}
      value={PMT_ADJUSTMENT_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.tab')}
    />
  );
}

function PmtAdjustmentTabPanelComponent({
  intl, classes, value, modulesManager,
  submittingPmtCutoffAdjustment, pmtCutoffAdjustmentMutation, errorPmtCutoffAdjustment,
  adjustPmtCutoff: adjustAction, fetchPmtAuditSummary: fetchAuditAction,
}) {
  const [adjustmentCutoff, setAdjustmentCutoff] = useState(PMT_DEFAULT_CUTOFF.toString());
  const [adjustmentRegion, setAdjustmentRegion] = useState(null);
  const [adjustmentDistrict, setAdjustmentDistrict] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openProgress, setOpenProgress] = useState(false);
  const [progressMutationId, setProgressMutationId] = useState(null);
  const [configError, setConfigError] = useState(null);

  const validation = useMemo(
    () => validatePmtConfiguration({ pmtCutoff: adjustmentCutoff, selectedDistrict: adjustmentDistrict }),
    [adjustmentCutoff, adjustmentDistrict],
  );

  const handleApply = () => {
    setConfigError(null);
    const { isValid, errors } = validatePmtConfiguration({
      pmtCutoff: adjustmentCutoff, selectedDistrict: adjustmentDistrict,
    });
    if (!isValid) {
      setConfigError(errors.cutoff || errors.district || 'Validation failed');
      return;
    }
    setOpenConfirm(true);
  };

  const handleConfirm = () => {
    setOpenConfirm(false);
    setProgressMutationId(null);
    setOpenProgress(false);
    adjustAction(
      modulesManager,
      adjustmentDistrict?.code || adjustmentDistrict,
      adjustmentRegion?.code || adjustmentRegion,
      parseFloat(adjustmentCutoff),
    );
  };

  useEffect(() => {
    const mutationId = pmtCutoffAdjustmentMutation?.mutationId
      || pmtCutoffAdjustmentMutation?.data?.adjustPmtCutoff?.mutationId || null;
    if (mutationId && mutationId !== progressMutationId) {
      setProgressMutationId(mutationId);
      setOpenProgress(true);
    }
  }, [pmtCutoffAdjustmentMutation]);

  if (value !== PMT_ADJUSTMENT_TAB_VALUE) return null;

  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_ADJUSTMENT_TAB_VALUE}
      value={value}
    >
      <div className={classes.paper}>
        <Typography variant="h6" className={classes.sectionTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.title')}
        </Typography>

        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={12} sm={6} md={3}>
            <TextInput
              module={INDIVIDUAL_MODULE_NAME}
              label="pmt.adjustment.cutoff"
              value={adjustmentCutoff}
              readOnly={submittingPmtCutoffAdjustment}
              onChange={setAdjustmentCutoff}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={(region) => { setAdjustmentRegion(region); setAdjustmentDistrict(null); }}
              value={adjustmentRegion}
              locationLevel={0}
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.region')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={setAdjustmentDistrict}
              value={adjustmentDistrict}
              parentLocation={adjustmentRegion}
              locationLevel={1}
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.district')}
              required
            />
          </Grid>
        </Grid>

        <Alert severity="info" variant="outlined" className={classes.inlineAlert}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.info')}
        </Alert>

        {configError && (
          <Alert severity="error" variant="outlined" className={classes.inlineAlert}>
            {configError}
          </Alert>
        )}
        {errorPmtCutoffAdjustment && (
          <Alert severity="error" variant="outlined" className={classes.inlineAlert}>
            {typeof errorPmtCutoffAdjustment === 'string' ? errorPmtCutoffAdjustment : 'Error adjusting PMT cutoff'}
          </Alert>
        )}

        <div className={classes.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApply}
            disabled={!validation.isValid || submittingPmtCutoffAdjustment}
            startIcon={submittingPmtCutoffAdjustment ? <CircularProgress size={20} /> : null}
          >
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.button')}
          </Button>
        </div>
      </div>

      <PmtConfirmationDialog
        open={openConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setOpenConfirm(false)}
        config={{ districtName: adjustmentDistrict?.name, pmtCutoff: adjustmentCutoff }}
        disabled={submittingPmtCutoffAdjustment}
        titleKey="pmt.adjustment.confirm.title"
        messageKey="pmt.adjustment.confirm.message"
        confirmLabelKey="pmt.adjustment.confirm.yes"
        cancelLabelKey="pmt.adjustment.confirm.no"
      />
      <PmtProgressDialog
        open={openProgress}
        mutationId={progressMutationId}
        onClose={({ completed } = {}) => {
          setOpenProgress(false);
          if (completed) {
            setProgressMutationId(null);
            fetchAuditAction(modulesManager, { offset: 0, limit: 50 });
          }
        }}
      />
    </PublishedComponent>
  );
}

const mapStateToProps = (state) => ({
  submittingPmtCutoffAdjustment: state.individual.submittingPmtCutoffAdjustment,
  pmtCutoffAdjustmentMutation: state.individual.pmtCutoffAdjustmentMutation,
  errorPmtCutoffAdjustment: state.individual.errorPmtCutoffAdjustment,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ adjustPmtCutoff, fetchPmtAuditSummary }, dispatch);

const PmtAdjustmentTabPanel = withModulesManager(
  injectIntl(withTheme(withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(PmtAdjustmentTabPanelComponent),
  ))),
);

export { PmtAdjustmentTabLabel, PmtAdjustmentTabPanel };
