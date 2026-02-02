import React from 'react';
import { Helmet, withModulesManager, formatMessage } from '@openimis/fe-core';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { RIGHT_INDIVIDUAL_SEARCH, INDIVIDUAL_MODULE_NAME } from '../constants';
import NonConsentedHouseholdsSearcher from '../components/NonConsentedHouseholdsSearcher';

const styles = (theme) => ({
  page: theme.page,
});

function NonConsentedHouseholdsPage(props) {
  const { intl, classes, rights } = props;

  return (
    rights.includes(RIGHT_INDIVIDUAL_SEARCH) && (
      <div className={classes.page}>
        <Helmet
          title={formatMessage(
            intl,
            INDIVIDUAL_MODULE_NAME,
            'nonConsentedHouseholds.pageTitle',
          )}
        />
        <NonConsentedHouseholdsSearcher rights={rights} />
      </div>
    )
  );
}

const mapStateToProps = (state) => ({
  rights:
    !!state.core && !!state.core.user && !!state.core.user.i_user
      ? state.core.user.i_user.rights
      : [],
});

export default withModulesManager(
  injectIntl(withTheme(withStyles(styles)(connect(mapStateToProps)(NonConsentedHouseholdsPage)))),
);
