import React from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Button } from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  formatMessage, formatMessageWithValues, Searcher, withModulesManager,
} from '@openimis/fe-core';

import { fetchPmtAuditSummary } from '../actions';
import { INDIVIDUAL_MODULE_NAME, DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from '../constants';

const styles = (theme) => ({
  actionButton: { marginRight: theme.spacing(1) },
});


function PmtAuditSummaryTable({
  classes,
  modulesManager,
  intl,
  onViewDistrict,
  // Redux
  pmtAuditSummary,
  fetchingPmtAuditSummary,
  fetchedPmtAuditSummary,
  errorPmtAuditSummary,
  pmtAuditSummaryTotalCount,
  // Actions
  fetchPmtAuditSummary: fetchAction,
}) {
  const headers = () => [
    'pmt.auditSummary.paaName',
    'pmt.auditSummary.cutoff',
    'pmt.auditSummary.poor',
    'pmt.auditSummary.nonPoor',
    'pmt.auditSummary.action',
  ];

  const itemFormatters = () => [
    (d) => d?.districtName || d?.districtCode || '-',
    (d) => (d?.pmtCutoff != null ? d.pmtCutoff.toFixed(2) : '-'),
    (d) => d?.poorCount ?? 0,
    (d) => d?.nonPoorCount ?? 0,
    (d) => (
      <Button
        variant="outlined"
        color="primary"
        size="small"
        className={classes.actionButton}
        onClick={() => onViewDistrict && onViewDistrict(d.districtCode, d.pmtCutoff)}
      >
        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.view')}
      </Button>
    ),
  ];

  // fe-core Searcher passes its state (incl. page/pageSize) here; map to the endpoint's offset/limit.
  const filtersToQueryParams = ({ page, pageSize }) => [
    `offset: ${page * pageSize}`,
    `limit: ${pageSize}`,
  ];

  const fetch = (params) => fetchAction(modulesManager, params);

  return (
    <Searcher
      module="individual"
      fetch={fetch}
      items={pmtAuditSummary}
      itemsPageInfo={{ totalCount: pmtAuditSummaryTotalCount }}
      fetchingItems={fetchingPmtAuditSummary}
      fetchedItems={fetchedPmtAuditSummary}
      errorItems={errorPmtAuditSummary}
      tableTitle={formatMessageWithValues(
        intl,
        INDIVIDUAL_MODULE_NAME,
        'pmt.auditSummary.searcherResultsTitle',
        { count: pmtAuditSummaryTotalCount ?? 0 },
      )}
      filtersToQueryParams={filtersToQueryParams}
      headers={headers}
      itemFormatters={itemFormatters}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={(d) => d.districtCode}
    />
  );
}

const mapStateToProps = (state) => ({
  pmtAuditSummary: state.individual.pmtAuditSummary,
  fetchingPmtAuditSummary: state.individual.fetchingPmtAuditSummary,
  fetchedPmtAuditSummary: state.individual.fetchedPmtAuditSummary,
  errorPmtAuditSummary: state.individual.errorPmtAuditSummary,
  pmtAuditSummaryTotalCount: state.individual.pmtAuditSummaryTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPmtAuditSummary,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withModulesManager(injectIntl(withTheme(withStyles(styles)(PmtAuditSummaryTable)))));
