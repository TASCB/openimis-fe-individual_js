import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Tab, Grid, Typography, Button, CircularProgress, Table, TableBody, TableRow, TableCell,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { formatMessage, PublishedComponent, TextInput } from '@openimis/fe-core';
import { fetchPmtCutoffForTarget } from '../../actions';
import PmtCutoffPaaPreviewSearcher from './PmtCutoffPaaPreviewSearcher';
import {
  PMT_CHECK_ELIGIBLE_TAB_VALUE, PMT_CUTOFF_MAX, INDIVIDUAL_MODULE_NAME,
} from '../../constants';

const LABEL = 'pmt.checkEligible';

const styles = (theme) => ({
  paper: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600, marginBottom: theme.spacing(1) },
  inlineAlert: { marginTop: theme.spacing(1) },
  actionCell: { marginLeft: 'auto' },
  result: { marginTop: theme.spacing(2), maxWidth: 640 },
  value: { fontWeight: 600, textAlign: 'right' },
  preview: { marginTop: theme.spacing(3) },
  useButton: { marginLeft: theme.spacing(1) },
});

const count = (n) => (n == null ? '-' : Number(n).toLocaleString());

function PmtCheckEligibleTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_CHECK_ELIGIBLE_TAB_VALUE)}
      selected={isSelected(PMT_CHECK_ELIGIBLE_TAB_VALUE)}
      value={PMT_CHECK_ELIGIBLE_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.tab`)}
    />
  );
}

function PmtCheckEligibleTabPanelComponent({
  intl, classes, value, onUseCutoff,
  result, fetching, error,
  fetchPmtCutoffForTarget: fetchAction,
}) {
  const [target, setTarget] = useState('');
  const [region, setRegion] = useState(null);
  const [district, setDistrict] = useState(null);
  const [checkedScope, setCheckedScope] = useState(null);
  const [infoClosed, setInfoClosed] = useState(false);

  if (value !== PMT_CHECK_ELIGIBLE_TAB_VALUE) return null;

  const t = (key) => formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.${key}`);
  const targetNumber = parseInt(String(target).replace(/[ ,]/g, ''), 10);
  const targetValid = Number.isInteger(targetNumber) && targetNumber > 0;

  const scopeName = (scope) => scope?.district?.name || scope?.region?.name || t('scopeAll');

  const onCheck = () => {
    if (!targetValid) return;
    setCheckedScope({ region, district });
    fetchAction({
      target: targetNumber,
      districtCode: district?.code || null,
      regionCode: district ? null : (region?.code || null),
    });
  };

  const hasResult = result && !result.error && result.cutoff != null && checkedScope;
  const overMax = hasResult && result.cutoff > PMT_CUTOFF_MAX;

  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_CHECK_ELIGIBLE_TAB_VALUE}
      value={value}
    >
      <div className={classes.paper}>
        <Typography variant="h6" className={classes.sectionTitle}>{t('title')}</Typography>

        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4} md={3}>
            <TextInput
              module={INDIVIDUAL_MODULE_NAME}
              label={`${LABEL}.target`}
              value={target}
              onChange={setTarget}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={(v) => { setRegion(v); setDistrict(null); }}
              value={region}
              locationLevel={0}
              label={t('region')}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <PublishedComponent
              pubRef="location.LocationPicker"
              onChange={setDistrict}
              value={district}
              parentLocation={region}
              locationLevel={1}
              label={t('paa')}
            />
          </Grid>
          <Grid item className={classes.actionCell}>
            <Button
              variant="contained"
              color="primary"
              onClick={onCheck}
              disabled={!targetValid || fetching}
              startIcon={fetching ? <CircularProgress size={20} /> : null}
            >
              {t('button')}
            </Button>
            {hasResult && (
              <Button
                variant="contained"
                color="primary"
                className={classes.useButton}
                disabled={overMax || !onUseCutoff}
                onClick={() => onUseCutoff({ cutoff: result.cutoff, ...checkedScope })}
              >
                {t('use')}
              </Button>
            )}
          </Grid>
        </Grid>

        {!infoClosed && (
          <Alert severity="info" className={classes.inlineAlert} onClose={() => setInfoClosed(true)}>
            {t('info')}
          </Alert>
        )}

        {(error || result?.error) && (
          <Alert severity="error" className={classes.inlineAlert}>
            {result?.error || (typeof error === 'string' ? error : t('failed'))}
          </Alert>
        )}

        {hasResult && (
          <div className={classes.result}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>{t('scope')}</TableCell>
                  <TableCell className={classes.value}>{scopeName(checkedScope)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('cutoff')}</TableCell>
                  <TableCell className={classes.value}>{result.cutoff}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('eligibleAtCutoff')}</TableCell>
                  <TableCell className={classes.value}>{count(result.eligibleAtCutoff)}</TableCell>
                </TableRow>
                {result.lowerCutoff != null && result.eligibleAtCutoff !== result.target && (
                  <TableRow>
                    <TableCell>
                      {t('lowerCutoff').replace('{cutoff}', String(result.lowerCutoff))}
                    </TableCell>
                    <TableCell className={classes.value}>{count(result.eligibleAtLowerCutoff)}</TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>{t('currentEligible')}</TableCell>
                  <TableCell className={classes.value}>{count(result.currentEligible)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('change')}</TableCell>
                  <TableCell className={classes.value}>
                    {`${result.eligibleAtCutoff - result.currentEligible >= 0 ? '+' : ''}${count(result.eligibleAtCutoff - result.currentEligible)}`}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('scored')}</TableCell>
                  <TableCell className={classes.value}>{count(result.scoredHouseholds)}</TableCell>
                </TableRow>
                {result.unscoredHouseholds > 0 && (
                  <TableRow>
                    <TableCell>{t('unscored')}</TableCell>
                    <TableCell className={classes.value}>{count(result.unscoredHouseholds)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {!result.targetReachable && (
              <Alert severity="warning" icon={<ErrorOutlineIcon />} className={classes.inlineAlert}>
                {t('notReachable').replace('{count}', count(result.scoredHouseholds))}
              </Alert>
            )}
            {overMax && (
              <Alert severity="warning" icon={<ErrorOutlineIcon />} className={classes.inlineAlert}>
                {t('overMax').replace('{max}', String(PMT_CUTOFF_MAX))}
              </Alert>
            )}
          </div>
        )}

        {hasResult && (
          <div className={classes.preview}>
            <PmtCutoffPaaPreviewSearcher
              key={`${result.cutoff}:${checkedScope.district?.code || ''}:${checkedScope.region?.code || ''}`}
              cutoff={result.cutoff}
              districtCode={checkedScope.district?.code || null}
              regionCode={checkedScope.district ? null : (checkedScope.region?.code || null)}
              scopeName={scopeName(checkedScope)}
            />
          </div>
        )}
      </div>
    </PublishedComponent>
  );
}

const mapStateToProps = (state) => ({
  result: state.individual.pmtCutoffForTarget,
  fetching: state.individual.fetchingPmtCutoffForTarget,
  error: state.individual.errorPmtCutoffForTarget,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPmtCutoffForTarget }, dispatch);

const PmtCheckEligibleTabPanel = injectIntl(withTheme(withStyles(styles)(
  connect(mapStateToProps, mapDispatchToProps)(PmtCheckEligibleTabPanelComponent),
)));

export { PmtCheckEligibleTabLabel, PmtCheckEligibleTabPanel };
