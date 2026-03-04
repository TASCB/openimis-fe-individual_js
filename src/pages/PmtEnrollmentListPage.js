import React from 'react';
import {
  Helmet, withModulesManager, formatMessage,
} from '@openimis/fe-core';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { RIGHT_PMT_RERUN, INDIVIDUAL_MODULE_NAME } from '../constants';
import PmtEnrollmentSearcher from '../components/PmtEnrollmentSearcher';

const styles = (theme) => ({
  page: theme.page,
});

function PmtEnrollmentListPage(props) {
  const {
    intl, classes, rights,
  } = props;

  return (
    rights.includes(RIGHT_PMT_RERUN) && (
      <div className={classes.page}>
        <Helmet title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.enrollment.page.title')} />
        <PmtEnrollmentSearcher {...props} />
      </div>
    )
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
});

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps)(PmtEnrollmentListPage),
      ),
    ),
  ),
);
