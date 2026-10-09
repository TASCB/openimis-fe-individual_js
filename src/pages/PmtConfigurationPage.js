import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Paper, Grid, Card, CardContent,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import {
  Helmet,
  withModulesManager,
  formatMessage,
  Contributions,
} from '@openimis/fe-core';
import { connect } from 'react-redux';

import {
  RIGHT_PMT_RERUN,
  INDIVIDUAL_MODULE_NAME,
  PMT_ADJUSTMENT_TAB_VALUE,
  PMT_CONFIG_TABS_LABEL_CONTRIBUTION_KEY,
  PMT_CONFIG_TABS_PANEL_CONTRIBUTION_KEY,
} from '../constants';

const styles = (theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
});

function PmtConfigurationPage({
  classes, intl, rights,
}) {
  const [activeTab, setActiveTab] = useState(PMT_ADJUSTMENT_TAB_VALUE);

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const handleChange = (_, tab) => setActiveTab(tab);

  if (!rights || !rights.includes(RIGHT_PMT_RERUN)) {
    return (
      <div className={classes.page}>
        <Helmet title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.page.title')} />
        <Card>
          <CardContent>
            <Alert severity="error">
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
        </Grid>
      </div>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
});

export default withModulesManager(
  injectIntl(withTheme(withStyles(styles)(connect(mapStateToProps)(PmtConfigurationPage)))),
);
