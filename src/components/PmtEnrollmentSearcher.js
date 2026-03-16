import React, { useEffect, useState, useRef } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  withHistory,
  graphql,
  formatQuery,
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
  fetchPmtEnrollmentListForExport,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
} from '../constants';
import PmtEnrollmentSearcherFilter from './PmtEnrollmentSearcherFilter';
import { exportPmtEnrollmentPdf } from '../util/pmt-export';

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

/**
 * PMT Enrollment Searcher Component
 *
 * Provides a data search interface for PMT (Proxy Means Test) household enrollment records.
 * Supports filtering by district, status, and search criteria. Includes PDF export functionality
 * that automatically fetches and exports all matching records regardless of pagination settings.
 *
 * @component
 * @param {Object} props - Component props from Redux and OpenIMIS
 * @param {Object} props.intl - Internationalization object from react-intl
 * @param {Object} props.modulesManager - OpenIMIS modules manager for module access
 * @param {Object} props.history - React Router history object for navigation
 * @param {Function} props.fetchPmtEnrollmentList - Redux action to fetch paginated PMT data
 * @param {Function} props.fetchPmtEnrollmentListForExport - Redux action to fetch all PMT data for export
 * @param {boolean} props.fetchingPmtEnrollmentList - Loading state for PMT data
 * @param {boolean} props.fetchedPmtEnrollmentList - Success state for PMT data fetch
 * @param {string|null} props.errorPmtEnrollmentList - Error message if fetch failed
 * @param {Array} props.pmtEnrollmentList - Array of household objects matching current filters
 * @param {Object} props.pmtEnrollmentListPageInfo - Pagination info (pageSize, page, hasNext, hasPrevious)
 * @param {number} props.pmtEnrollmentListTotalCount - Total count of households matching filters
 * @param {Object} props.classes - CSS classes from Material-UI withStyles HOC
 * @param {Object} props.theme - Material-UI theme object
 * @returns {JSX.Element} Searcher component with filter pane, results table, and export button
 */
function PmtEnrollmentSearcher({
  intl,
  modulesManager,
  history,
  fetchPmtEnrollmentList,
  fetchPmtEnrollmentListForExport,
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
  const [isExporting, setIsExporting] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [districtName, setDistrictName] = useState(null);

  const fetch = (params) => {
    setCurrentFilters(params);
    return fetchPmtEnrollmentList(modulesManager, params);
  };

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

  const pmtEnrollmentFilterPane = (props) => {
    // Wrap the onChangeFilters to intercept and extract location name
    const wrappedOnChangeFilters = (newFilters) => {
      // Extract location name from filter objects BEFORE they're converted to strings
      if (Array.isArray(newFilters)) {
        newFilters.forEach((filter) => {
          // Check if this is a location filter with metadata
          if ((filter.id === 'parentLocation' || filter.id === 'location') && filter.value) {
            // The value might be an object with location details
            if (typeof filter.value === 'object') {
              const locName = filter.value.name || filter.value.displayName;
              if (locName) {
                setDistrictName(locName);
              }
            }
          }
        });
      }

      // Call the original callback
      props.onChangeFilters(newFilters);
    };

    return (
      <PmtEnrollmentSearcherFilter
        intl={props.intl}
        classes={props.classes}
        filters={props.filters}
        onChangeFilters={wrappedOnChangeFilters}
      />
    );
  };

  const handlePdfExport = async () => {
    if (!pmtEnrollmentList || pmtEnrollmentList.length === 0) {
      setExportError(formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults'));
      return;
    }

    try {
      setIsExporting(true);

      // Use the export action with the SAME params structure as regular fetch
      // This ensures all active filters (pmtClass, location, search, etc.) are applied
      const response = await fetchPmtEnrollmentListForExport(modulesManager, currentFilters);

      // Extract households from response
      const responseData = response?.payload?.data?.pmtEnrollmentList;
      const allHouseholds = responseData?.households || [];
      const exportedCount = allHouseholds.length;

      if (allHouseholds.length === 0) {
        throw new Error('No records to export');
      }

      // Generate PDF with ALL fetched data
      await exportPmtEnrollmentPdf({
        households: allHouseholds,
        generatedDate: new Date(),
        districtCode: districtName,
        pmtCutoff: 11.01,
        totalCount: exportedCount,
      });

      setExportError(null);
      setIsExporting(false);
    } catch (error) {
      setExportError(error.message || 'Error exporting PDF');
      setIsExporting(false);
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
    fetchPmtEnrollmentListForExport,
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
