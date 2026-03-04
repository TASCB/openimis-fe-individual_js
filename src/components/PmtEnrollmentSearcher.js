import React, { useEffect, useState, useRef } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  withHistory,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Button,
} from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';

import {
  fetchPmtEnrollmentList,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
} from '../constants';
import PmtEnrollmentSearcherFilter from './PmtEnrollmentSearcherFilter';
import { exportPmtEnrollmentListAsPdf } from '../util/pmt-export';

const styles = (theme) => ({
  root: {
    '& .MuiTableCell-root': {
      padding: '16px',
    },
    '& .MuiTableRow-root': {
      height: '56px',
    },
  },
});

function PmtEnrollmentSearcher({
  intl,
  modulesManager,
  history,
  fetchPmtEnrollmentList,
  fetchingPmtEnrollmentList,
  fetchedPmtEnrollmentList,
  errorPmtEnrollmentList,
  pmtEnrollmentList,
  pmtEnrollmentListPageInfo,
  pmtEnrollmentListTotalCount,
  classes,
  theme,
}) {
  const [exportError, setExportError] = useState(null);

  const fetch = (params) => fetchPmtEnrollmentList(modulesManager, params);

  const headers = () => [
    'pmt.household.groupCode',
    'pmt.household.headName',
    'pmt.household.location',
    'pmt.household.pmtScore',
    'pmt.household.status',
  ];

  const itemFormatters = () => [
    (household) => household.groupCode || '-',
    (household) => household.headName || '-',
    (household) => household.locationName || '-',
    (household) => (household.pmtScore !== undefined && household.pmtScore !== null
      ? household.pmtScore.toFixed(3)
      : '-'),
    (household) => household.pmtClass || '-',
  ];

  const rowIdentifier = (household) => household.groupUuid;

  const sorts = () => [
    ['code', true],
    ['headName', true],
    ['locationName', true],
    ['pmtScore', true],
  ];

  const defaultFilters = () => ({});

  const pmtEnrollmentFilterPane = (props) => (
    <PmtEnrollmentSearcherFilter
      intl={props.intl}
      classes={props.classes}
      filters={props.filters}
      onChangeFilters={props.onChangeFilters}
    />
  );

  const handlePdfExport = async () => {
    if (!pmtEnrollmentList || pmtEnrollmentList.length === 0) {
      setExportError(formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults'));
      return;
    }

    try {
      await exportPmtEnrollmentListAsPdf({
        households: pmtEnrollmentList,
        generatedDate: new Date(),
      });
      setExportError(null);
    } catch (error) {
      setExportError(error.message || 'Error exporting PDF');
    }
  };

  const searcherActions = [
    {
      icon: <GetAppIcon />,
      label: formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.downloadPdf'),
      onClick: handlePdfExport,
      authorized: !(!pmtEnrollmentList || pmtEnrollmentList.length === 0 || fetchingPmtEnrollmentList),
    },
  ];

  return (
    <div className={classes.root}>
      <Searcher
        module="individual"
        FilterPane={pmtEnrollmentFilterPane}
        fetch={fetch}
        items={pmtEnrollmentList}
        itemsPageInfo={pmtEnrollmentListPageInfo}
        fetchingItems={fetchingPmtEnrollmentList}
        fetchedItems={fetchedPmtEnrollmentList}
        errorItems={errorPmtEnrollmentList}
        tableTitle={formatMessageWithValues(
          intl,
          INDIVIDUAL_MODULE_NAME,
          'pmt.enrollment.searcherResultsTitle',
          { pmtEnrollmentTotalCount: pmtEnrollmentListTotalCount },
        )}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="code"
        rowIdentifier={rowIdentifier}
        defaultFilters={defaultFilters()}
        cacheFiltersKey="pmtEnrollmentFilterCache"
        resetFiltersOnUnmount
        searcherActionsPosition="header-right"
        searcherActions={searcherActions}
        enableActionButtons
      />
      {exportError && (
        <Dialog open={!!exportError} fullWidth maxWidth="sm">
          <DialogTitle>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.error')}</DialogTitle>
          <DialogContent>
            {exportError}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportError(null)} color="primary" variant="contained">
              {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'ok')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPmtEnrollmentList: state.individual.fetchingPmtEnrollmentList,
  fetchedPmtEnrollmentList: state.individual.fetchedPmtEnrollmentList,
  errorPmtEnrollmentList: state.individual.errorPmtEnrollmentList,
  pmtEnrollmentList: state.individual.pmtEnrollmentList,
  pmtEnrollmentListPageInfo: state.individual.pmtEnrollmentListPageInfo,
  pmtEnrollmentListTotalCount: state.individual.pmtEnrollmentListTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchPmtEnrollmentList,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(
    injectIntl(
      withTheme(
        withStyles(styles)(
          connect(mapStateToProps, mapDispatchToProps)(PmtEnrollmentSearcher),
        ),
      ),
    ),
  ),
);
