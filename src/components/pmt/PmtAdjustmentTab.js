import React, { useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Tab, Grid, Typography, Button, CircularProgress, Checkbox, FormControlLabel,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import {
  formatMessage, PublishedComponent, TextInput, withHistory, withModulesManager,
} from '@openimis/fe-core';
import PmtAuditSummaryTable from '../PmtAuditSummaryTable';
import { adjustPmtCutoff, fetchPmtAuditSummary, fetchPmtGlobalFormula } from '../../actions';
import PmtConfirmationDialog from '../dialogs/PmtConfirmationDialog';
import PmtProgressDialog from '../dialogs/PmtProgressDialog';
import { validatePmtCutoff } from '../../util/pmt-validation';
import {
  PMT_ADJUSTMENT_TAB_VALUE, PMT_DEFAULT_CUTOFF, INDIVIDUAL_MODULE_NAME,
} from '../../constants';

const styles = (theme) => ({
  paper: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  inlineAlert: { marginTop: theme.spacing(1) },
  gridContainer: { marginBottom: theme.spacing(1) },
  applyCell: { marginLeft: 'auto' },
  advancedCell: { paddingTop: `${theme.spacing(1)}px !important`, paddingBottom: '0 !important' },
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
  intl, classes, value, modulesManager, history, cutoffSuggestion,
  submittingPmtCutoffAdjustment, pmtCutoffAdjustmentMutation, errorPmtCutoffAdjustment,
  pmtGlobalFormula, fetchingPmtGlobalFormula,
  adjustPmtCutoff: adjustAction, fetchPmtAuditSummary: fetchAuditAction, fetchPmtGlobalFormula: fetchFormula,
}) {
  const [adjustmentCutoff, setAdjustmentCutoff] = useState(PMT_DEFAULT_CUTOFF.toString());
  const [adjustmentRegion, setAdjustmentRegion] = useState(null);
  const [adjustmentDistrict, setAdjustmentDistrict] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openProgress, setOpenProgress] = useState(false);
  const [progressMutationId, setProgressMutationId] = useState(null);
  const [configError, setConfigError] = useState(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const validation = useMemo(() => validatePmtCutoff(adjustmentCutoff), [adjustmentCutoff]);
  const scopeName = adjustmentDistrict?.name || adjustmentRegion?.name || null;
  const infoKey = scopeName ? 'pmt.adjustment.infoScoped' : 'pmt.adjustment.infoAll';
  const [closedInfoKey, setClosedInfoKey] = useState(null);

  const formulaCutoff = useMemo(() => {
    try {
      const f = typeof pmtGlobalFormula?.formula === 'string'
        ? JSON.parse(pmtGlobalFormula.formula) : pmtGlobalFormula?.formula;
      return f?.cutoff != null ? Number(f.cutoff) : null;
    } catch (e) {
      return null;
    }
  }, [pmtGlobalFormula]);
  const differsFromFormula = formulaCutoff != null && validation.isValid
    && Math.abs(parseFloat(adjustmentCutoff) - formulaCutoff) > 1e-9;

  useEffect(() => {
    if (value === PMT_ADJUSTMENT_TAB_VALUE && !pmtGlobalFormula && !fetchingPmtGlobalFormula) fetchFormula();
  }, [value]);

  useEffect(() => {
    if (!cutoffSuggestion) return;
    setAdjustmentCutoff(String(cutoffSuggestion.cutoff));
    const scoped = !!(cutoffSuggestion.region || cutoffSuggestion.district);
    setShowAdvancedOptions(scoped);
    setAdjustmentRegion(cutoffSuggestion.region || null);
    setAdjustmentDistrict(cutoffSuggestion.district || null);
  }, [cutoffSuggestion]);

  const toggleAdvanced = (checked) => {
    setShowAdvancedOptions(checked);
    if (!checked) {
      setAdjustmentRegion(null);
      setAdjustmentDistrict(null);
    }
  };

  const handleApply = () => {
    setConfigError(null);
    if (!validation.isValid) {
      setConfigError(validation.error);
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
    const payload = pmtCutoffAdjustmentMutation?.data?.adjustPmtCutoff;
    if (payload && payload.ok === false) {
      setConfigError((payload.errors || []).join(' ') || 'The adjustment was not started');
      return;
    }
    const mutationId = pmtCutoffAdjustmentMutation?.mutationId
      || pmtCutoffAdjustmentMutation?.data?.adjustPmtCutoff?.mutationId || null;
    if (mutationId && mutationId !== progressMutationId) {
      setProgressMutationId(mutationId);
      setOpenProgress(true);
    }
  }, [pmtCutoffAdjustmentMutation]);

  const onViewDistrict = (districtCode, pmtCutoffValue) => {
    const qs = new URLSearchParams();
    if (districtCode) qs.set('district', districtCode);
    if (pmtCutoffValue !== undefined && pmtCutoffValue !== null) qs.set('cutoff', pmtCutoffValue);
    history.push(`/pmt/enrollment-list?${qs.toString()}`);
  };

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

        <Grid container spacing={2} alignItems="flex-end" justifyContent="space-between">
          <Grid item xs={12} sm={7} md={6}>
            <TextInput
              module={INDIVIDUAL_MODULE_NAME}
              label="pmt.adjustment.cutoff"
              value={adjustmentCutoff}
              readOnly={submittingPmtCutoffAdjustment}
              onChange={setAdjustmentCutoff}
            />
          </Grid>
          <Grid item className={classes.applyCell}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleApply}
              disabled={!validation.isValid || submittingPmtCutoffAdjustment}
              startIcon={submittingPmtCutoffAdjustment ? <CircularProgress size={20} /> : null}
            >
              {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.button')}
            </Button>
          </Grid>
        </Grid>

        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={12} className={classes.advancedCell}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={showAdvancedOptions}
                  onChange={(e) => toggleAdvanced(e.target.checked)}
                  color="primary"
                />
              )}
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.showAdvancedOptions')}
            />
          </Grid>
          {showAdvancedOptions && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <PublishedComponent
                  pubRef="location.LocationPicker"
                  onChange={(region) => { setAdjustmentRegion(region); setAdjustmentDistrict(null); }}
                  value={adjustmentRegion}
                  locationLevel={0}
                  label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.region')}
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
                />
              </Grid>
            </>
          )}
        </Grid>

        {closedInfoKey !== infoKey && (
          <Alert severity="info" className={classes.inlineAlert} onClose={() => setClosedInfoKey(infoKey)}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, infoKey)}
          </Alert>
        )}
        {differsFromFormula && (
          <Alert severity="warning" icon={<ErrorOutlineIcon />} className={classes.inlineAlert}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.adjustment.formulaWarning')
              .replace('{formulaCutoff}', formulaCutoff.toFixed(2))}
          </Alert>
        )}

        {configError && (
          <Alert severity="error" className={classes.inlineAlert}>
            {configError}
          </Alert>
        )}
        {errorPmtCutoffAdjustment && (
          <Alert severity="error" className={classes.inlineAlert}>
            {typeof errorPmtCutoffAdjustment === 'string' ? errorPmtCutoffAdjustment : 'Error adjusting PMT cutoff'}
          </Alert>
        )}

      </div>

      <div className={classes.paper}>
        <Typography variant="h6" className={classes.sectionTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.title')}
        </Typography>
        <PmtAuditSummaryTable onViewDistrict={onViewDistrict} />
      </div>

      <PmtConfirmationDialog
        open={openConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setOpenConfirm(false)}
        config={{ districtName: scopeName, pmtCutoff: adjustmentCutoff }}
        disabled={submittingPmtCutoffAdjustment}
        titleKey="pmt.adjustment.confirm.title"
        messageKey={scopeName ? 'pmt.adjustment.confirm.message' : 'pmt.adjustment.confirm.messageAll'}
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
  pmtGlobalFormula: state.individual.pmtGlobalFormula,
  fetchingPmtGlobalFormula: state.individual.fetchingPmtGlobalFormula,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { adjustPmtCutoff, fetchPmtAuditSummary, fetchPmtGlobalFormula },
  dispatch,
);

const PmtAdjustmentTabPanel = withHistory(withModulesManager(
  injectIntl(withTheme(withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(PmtAdjustmentTabPanelComponent),
  ))),
));

export { PmtAdjustmentTabLabel, PmtAdjustmentTabPanel };
