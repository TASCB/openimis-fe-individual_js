import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Tab, Grid, Typography, Button, Divider, IconButton, CircularProgress,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { Add, Delete } from '@material-ui/icons';
import {
  formatMessage,
  PublishedComponent,
  TextInput,
  ProgressOrError,
  journalize,
  coreConfirm,
  clearConfirm,
  withModulesManager,
} from '@openimis/fe-core';
import {
  PMT_FORMULA_TAB_VALUE,
  INDIVIDUAL_MODULE_NAME,
  RIGHT_PMT_FORMULA_UPDATE,
  PMT_FORMULA_DEFAULTS,
} from '../../constants';
import { fetchPmtGlobalFormula, updatePmtGlobalFormula } from '../../actions';

const SCALAR_KEYS = ['cutoff', 'intercept', 'household_size_coef', 'working_age_coef', 'urban_coef'];

const styles = (theme) => ({
  paper: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  meta: { color: theme.palette.text.secondary, marginBottom: theme.spacing(1) },
  pendingAlert: { marginBottom: theme.spacing(2) },
  inlineAlert: { marginTop: theme.spacing(1) },
  assetRow: { display: 'flex', alignItems: 'center', gap: theme.spacing(1) },
  buttonContainer: { marginTop: theme.spacing(2), display: 'flex', gap: theme.spacing(1) },
});

function PmtFormulaTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_FORMULA_TAB_VALUE)}
      selected={isSelected(PMT_FORMULA_TAB_VALUE)}
      value={PMT_FORMULA_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.tab')}
    />
  );
}

const parseFormula = (record) => {
  if (!record || !record.formula) return { ...PMT_FORMULA_DEFAULTS };
  try {
    const parsed = typeof record.formula === 'string' ? JSON.parse(record.formula) : record.formula;
    return { ...PMT_FORMULA_DEFAULTS, ...parsed };
  } catch (e) {
    return { ...PMT_FORMULA_DEFAULTS };
  }
};

function PmtFormulaTabPanelComponent({
  intl,
  classes,
  value,
  rights,
  modulesManager,
  pmtGlobalFormula,
  fetchingPmtGlobalFormula,
  errorPmtGlobalFormula,
  submittingPmtFormulaUpdate,
  pmtFormulaUpdateMutation,
  confirmed,
  fetchPmtGlobalFormula: fetchAction,
  updatePmtGlobalFormula: updateAction,
  journalize: journalizeAction,
  coreConfirm: confirmAction,
  clearConfirm: clearConfirmAction,
}) {
  const canEdit = (rights || []).includes(RIGHT_PMT_FORMULA_UPDATE);
  const [scalars, setScalars] = useState({});
  const [assetRows, setAssetRows] = useState([]);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const prevSubmitRef = useRef();
  const isActiveTab = value === PMT_FORMULA_TAB_VALUE;

  // Fetch once when this tab becomes active.
  useEffect(() => {
    if (isActiveTab && !pmtGlobalFormula && !fetchingPmtGlobalFormula) {
      fetchAction();
    }
  }, [isActiveTab]);

  // Hydrate local form state from the loaded record.
  useEffect(() => {
    const f = parseFormula(pmtGlobalFormula);
    const nextScalars = {};
    SCALAR_KEYS.forEach((k) => { nextScalars[k] = f[k] === undefined || f[k] === null ? '' : String(f[k]); });
    setScalars(nextScalars);
    setAssetRows(
      Object.entries(f.assets || {}).map(([code, coef]) => ({ code: String(code), coef: String(coef) })),
    );
  }, [pmtGlobalFormula]);

  // Journalize mutation completion + refetch so the new pending state shows.
  useEffect(() => {
    if (prevSubmitRef.current && !submittingPmtFormulaUpdate) {
      journalizeAction(pmtFormulaUpdateMutation);
      fetchAction();
    }
  }, [submittingPmtFormulaUpdate]);
  useEffect(() => { prevSubmitRef.current = submittingPmtFormulaUpdate; });

  const hasPending = !!pmtGlobalFormula?.hasPendingTask;
  const readOnly = !canEdit || hasPending;

  const buildFormula = () => {
    const out = {};
    SCALAR_KEYS.forEach((k) => { out[k] = parseFloat(scalars[k]); });
    out.assets = assetRows.reduce((acc, { code, coef }) => {
      const c = String(code).trim();
      if (c !== '') acc[c] = parseFloat(coef);
      return acc;
    }, {});
    return out;
  };

  const validationError = useMemo(() => {
    for (let i = 0; i < SCALAR_KEYS.length; i += 1) {
      if (scalars[SCALAR_KEYS[i]] === '' || Number.isNaN(parseFloat(scalars[SCALAR_KEYS[i]]))) {
        return formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.validation.coefRequired');
      }
    }
    const cutoff = parseFloat(scalars.cutoff);
    if (cutoff <= 0 || cutoff > 50) {
      return formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.validation.cutoffRange');
    }
    const codes = assetRows.map((r) => String(r.code).trim()).filter((c) => c !== '');
    if (new Set(codes).size !== codes.length) {
      return formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.validation.duplicateAsset');
    }
    for (let i = 0; i < assetRows.length; i += 1) {
      if (String(assetRows[i].code).trim() !== '' && Number.isNaN(parseFloat(assetRows[i].coef))) {
        return formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.validation.assetCoefNumeric');
      }
    }
    return null;
  }, [scalars, assetRows]);

  // Confirmation flow (canonical coreConfirm pattern).
  useEffect(() => {
    if (pendingSubmit && confirmed) {
      updateAction(modulesManager, pmtGlobalFormula.id, buildFormula(), !!pmtGlobalFormula.isActive);
    }
    if (pendingSubmit && confirmed !== null) {
      setPendingSubmit(false);
    }
    return () => confirmed !== null && clearConfirmAction(false);
  }, [confirmed]);

  const onSubmit = () => {
    setPendingSubmit(true);
    confirmAction(
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.submit.confirm.title'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.submit.confirm.message'),
    );
  };

  if (!isActiveTab) return null;

  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_FORMULA_TAB_VALUE}
      value={value}
    >
      <div className={classes.paper}>
        <ProgressOrError progress={fetchingPmtGlobalFormula} error={errorPmtGlobalFormula} />

        {pmtGlobalFormula && (
          <Typography variant="body2" className={classes.meta}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.version')}
            {`: ${pmtGlobalFormula.version ?? '-'} `}
            {pmtGlobalFormula.updatedBy ? `· ${pmtGlobalFormula.updatedBy}` : ''}
          </Typography>
        )}

        {hasPending && (
          <Alert severity="warning" className={classes.pendingAlert}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.pendingNotice')}
          </Alert>
        )}

        <Typography variant="h6" className={classes.sectionTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.coefficients.title')}
        </Typography>
        <Grid container spacing={2}>
          {SCALAR_KEYS.map((key) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <TextInput
                module={INDIVIDUAL_MODULE_NAME}
                label={`pmt.formula.field.${key}`}
                value={scalars[key] ?? ''}
                readOnly={readOnly}
                onChange={(v) => setScalars((s) => ({ ...s, [key]: v }))}
              />
            </Grid>
          ))}
        </Grid>

        <Divider style={{ margin: '16px 0' }} />

        <Typography variant="h6" className={classes.sectionTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.assets.title')}
        </Typography>
        {assetRows.map((row, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <Grid container spacing={2} alignItems="center" key={idx}>
            <Grid item xs={5} sm={4} md={3}>
              <TextInput
                module={INDIVIDUAL_MODULE_NAME}
                label="pmt.formula.assets.code"
                value={row.code}
                readOnly={readOnly}
                onChange={(v) => setAssetRows((rows) => rows.map((r, i) => (i === idx ? { ...r, code: v } : r)))}
              />
            </Grid>
            <Grid item xs={5} sm={4} md={3}>
              <TextInput
                module={INDIVIDUAL_MODULE_NAME}
                label="pmt.formula.assets.coef"
                value={row.coef}
                readOnly={readOnly}
                onChange={(v) => setAssetRows((rows) => rows.map((r, i) => (i === idx ? { ...r, coef: v } : r)))}
              />
            </Grid>
            {!readOnly && (
              <Grid item>
                <IconButton onClick={() => setAssetRows((rows) => rows.filter((r, i) => i !== idx))} size="small">
                  <Delete />
                </IconButton>
              </Grid>
            )}
          </Grid>
        ))}
        {!readOnly && (
          <Button
            startIcon={<Add />}
            onClick={() => setAssetRows((rows) => [...rows, { code: '', coef: '' }])}
            size="small"
          >
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.assets.add')}
          </Button>
        )}

        {validationError && !readOnly && (
          <Alert severity="error" className={classes.inlineAlert}>
            {validationError}
          </Alert>
        )}

        <div className={classes.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            onClick={onSubmit}
            disabled={readOnly || !!validationError || submittingPmtFormulaUpdate || !pmtGlobalFormula}
            startIcon={submittingPmtFormulaUpdate ? <CircularProgress size={20} /> : null}
          >
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.formula.submit.button')}
          </Button>
        </div>
      </div>
    </PublishedComponent>
  );
}

const mapStateToProps = (state) => ({
  pmtGlobalFormula: state.individual.pmtGlobalFormula,
  fetchingPmtGlobalFormula: state.individual.fetchingPmtGlobalFormula,
  errorPmtGlobalFormula: state.individual.errorPmtGlobalFormula,
  submittingPmtFormulaUpdate: state.individual.submittingPmtFormulaUpdate,
  pmtFormulaUpdateMutation: state.individual.pmtFormulaUpdateMutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchPmtGlobalFormula,
    updatePmtGlobalFormula,
    journalize,
    coreConfirm,
    clearConfirm,
  },
  dispatch,
);

const PmtFormulaTabPanel = withModulesManager(
  injectIntl(withTheme(withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(PmtFormulaTabPanelComponent),
  ))),
);

export { PmtFormulaTabLabel, PmtFormulaTabPanel };
