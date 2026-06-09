import React, { useEffect, useMemo, useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Tab, Grid, Typography, Button, CircularProgress,
} from '@material-ui/core';
import {
  formatMessage, PublishedComponent, TextInput, withModulesManager,
} from '@openimis/fe-core';
import { rerunPmt, fetchPmtAuditSummary } from '../../actions';
import PmtConfirmationDialog from '../dialogs/PmtConfirmationDialog';
import PmtProgressDialog from '../dialogs/PmtProgressDialog';
import { validatePmtConfiguration } from '../../util/pmt-validation';
import {
  PMT_RERUN_TAB_VALUE, PMT_DEFAULT_CUTOFF, INDIVIDUAL_MODULE_NAME,
} from '../../constants';

const styles = (theme) => ({
  paper: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  infoBox: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
  },
  gridContainer: { marginBottom: theme.spacing(2) },
  buttonContainer: { marginTop: theme.spacing(2), display: 'flex', gap: theme.spacing(1) },
});

function PmtRerunTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_RERUN_TAB_VALUE)}
      selected={isSelected(PMT_RERUN_TAB_VALUE)}
      value={PMT_RERUN_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.tab')}
    />
  );
}

function PmtRerunTabPanelComponent({
  intl, classes, value, modulesManager,
  submittingPmtRerun, pmtRerunMutation, errorPmtRerun,
  rerunPmt: rerunPmtAction, fetchPmtAuditSummary: fetchAuditAction,
}) {
  const [pmtCutoff, setPmtCutoff] = useState(PMT_DEFAULT_CUTOFF.toString());
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openProgress, setOpenProgress] = useState(false);
  const [progressMutationId, setProgressMutationId] = useState(null);
  const [configError, setConfigError] = useState(null);

  const validation = useMemo(
    () => validatePmtConfiguration({ pmtCutoff, selectedDistrict }),
    [pmtCutoff, selectedDistrict],
  );

  const handleApply = () => {
    setConfigError(null);
    const { isValid, errors } = validatePmtConfiguration({ pmtCutoff, selectedDistrict });
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
    rerunPmtAction(
      modulesManager,
      selectedDistrict?.code || selectedDistrict,
      selectedRegion?.code || selectedRegion,
      parseFloat(pmtCutoff),
    );
  };

  useEffect(() => {
    const mutationId = pmtRerunMutation?.mutationId || pmtRerunMutation?.data?.rerunPmt?.mutationId || null;
    if (mutationId && mutationId !== progressMutationId) {
      setProgressMutationId(mutationId);
      setOpenProgress(true);
    }
  }, [pmtRerunMutation]);

  if (value !== PMT_RERUN_TAB_VALUE) return null;

  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_RERUN_TAB_VALUE}
      value={value}
    >
      <div className={classes.paper}>
        <Typography variant="h6" className={classes.sectionTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.title')}
        </Typography>

        <Grid container spacing={2} className={classes.gridContainer}>
          <Grid item xs={12} sm={6} md={3}>
            <TextInput
              module={INDIVIDUAL_MODULE_NAME}
              label="pmt.configuration.cutoff"
              value={pmtCutoff}
              readOnly={submittingPmtRerun}
              onChange={setPmtCutoff}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={(region) => { setSelectedRegion(region); setSelectedDistrict(null); }}
              value={selectedRegion}
              locationLevel={0}
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.region')}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={setSelectedDistrict}
              value={selectedDistrict}
              parentLocation={selectedRegion}
              locationLevel={1}
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.district')}
              required
            />
          </Grid>
        </Grid>

        <div className={classes.infoBox}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.info')}
        </div>

        {configError && <div className={classes.errorBox}>{configError}</div>}
        {errorPmtRerun && (
          <div className={classes.errorBox}>
            {typeof errorPmtRerun === 'string' ? errorPmtRerun : 'Error applying PMT configuration'}
          </div>
        )}

        <div className={classes.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApply}
            disabled={!validation.isValid || submittingPmtRerun}
            startIcon={submittingPmtRerun ? <CircularProgress size={20} /> : null}
          >
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.button')}
          </Button>
        </div>
      </div>

      <PmtConfirmationDialog
        open={openConfirm}
        onConfirm={handleConfirm}
        onCancel={() => setOpenConfirm(false)}
        config={{ districtName: selectedDistrict?.name, pmtCutoff }}
        disabled={submittingPmtRerun}
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
  submittingPmtRerun: state.individual.submittingPmtRerun,
  pmtRerunMutation: state.individual.pmtRerunMutation,
  errorPmtRerun: state.individual.errorPmtRerun,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ rerunPmt, fetchPmtAuditSummary }, dispatch);

const PmtRerunTabPanel = withModulesManager(
  injectIntl(withTheme(withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(PmtRerunTabPanelComponent),
  ))),
);

export { PmtRerunTabLabel, PmtRerunTabPanel };
