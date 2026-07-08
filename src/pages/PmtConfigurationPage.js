import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Paper, Grid, Typography, Divider, Card, CardContent,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import {
  Helmet,
  withModulesManager,
  withHistory,
  formatMessage,
  Contributions,
} from '@openimis/fe-core';
import { connect } from 'react-redux';

import PmtAuditSummaryTable from '../components/PmtAuditSummaryTable';
import {
  RIGHT_PMT_RERUN,
  INDIVIDUAL_MODULE_NAME,
  PMT_RERUN_TAB_VALUE,
  PMT_CONFIG_TABS_LABEL_CONTRIBUTION_KEY,
  PMT_CONFIG_TABS_PANEL_CONTRIBUTION_KEY,
} from '../constants';

// Canonical openIMIS tab styling — mirrors payroll/PayrollTab so the tab bar
// looks identical to the rest of openIMIS (light-green title band + teal
// selected tab driven by the core theme's MuiTab overrides).
const styles = (theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  tablePaper: { ...theme.paper.paper, padding: 0, overflow: 'hidden' },
  tableTitle: theme.table.title,
  tableHeaderBar: { padding: theme.spacing(2) },
  sectionTitle: { fontWeight: 600 },
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
});

function PmtConfigurationPage({
  classes, theme, history, intl, rights,
}) {
  const [activeTab, setActiveTab] = useState(PMT_RERUN_TAB_VALUE);

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const handleChange = (_, tab) => setActiveTab(tab);

  if (!rights || !rights.includes(RIGHT_PMT_RERUN)) {
    return (
      <div className={classes.page}>
        <Helmet title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.page.title')} />
        <Card>
          <CardContent>
            <Alert severity="error" variant="outlined">
              {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.permissionDenied')}
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.page.title')} />
      <div className={classes.page}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
                <Contributions
                  contributionKey={PMT_CONFIG_TABS_LABEL_CONTRIBUTION_KEY}
                  intl={intl}
                  rights={rights}
                  value={activeTab}
                  onChange={handleChange}
                  isSelected={isSelected}
                  tabStyle={tabStyle}
                />
              </Grid>
              <Contributions
                contributionKey={PMT_CONFIG_TABS_PANEL_CONTRIBUTION_KEY}
                rights={rights}
                value={activeTab}
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.title')}
                </Typography>
              </div>
              <Divider style={{ marginBottom: theme.spacing(2) }} />
              <PmtAuditSummaryTable
                onViewDistrict={(districtCode, pmtCutoffValue) => {
                  const qs = new URLSearchParams();
                  if (districtCode) qs.set('district', districtCode);
                  if (pmtCutoffValue !== undefined && pmtCutoffValue !== null) {
                    qs.set('cutoff', pmtCutoffValue);
                  }
                  history.push(`/pmt/enrollment-list?${qs.toString()}`);
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </div>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
});

export default withHistory(
  withModulesManager(
    injectIntl(withTheme(withStyles(styles)(connect(mapStateToProps)(PmtConfigurationPage)))),
  ),
);
