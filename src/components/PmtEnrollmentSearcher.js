import React, { useEffect, useState, useRef } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
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
import { exportPmtEnrollmentPdf } from '../util/pdf-export';

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

const getQueryContext = () => {
  const search = window?.location?.search || '';
  const params = new URLSearchParams(search);
  const districtCode = params.get('district') || '';
  const cutoff = params.get('cutoff') || '';

  return {
    districtCode,
    pmtCutoff: cutoff ? Number(cutoff) : null,
  };
};

const getCurrentPmtClassFilter = (params) => {
  const queue = Array.isArray(params) ? [...params] : [params];

  while (queue.length) {
    const item = queue.shift();
    if (!item) continue;

    if (Array.isArray(item)) {
      queue.push(...item);
      continue;
    }

    if (typeof item === 'object') {
      if (item.id === 'pmtClass' && item.value) {
        return item.value;
      }

      if (typeof item.filter === 'string') {
        const match = item.filter.match(/pmtClass:\s*"?([A-Z_]+)"?/);
        if (match) return match[1];
      }

      queue.push(...Object.values(item));
    }
  }

  return null;
};

const getExportPmtClass = (params, households) => {
  const filterPmtClass = getCurrentPmtClassFilter(params);
  if (filterPmtClass) return filterPmtClass;

  const classes = new Set((households || []).map((household) => household?.pmtClass).filter(Boolean));
  return classes.size === 1 ? [...classes][0] : null;
};

function PmtEnrollmentSearcher({
  intl,
  modulesManager,
  fetchPmtEnrollmentList,
  fetchPmtEnrollmentListForExport,
  fetchingPmtEnrollmentList,
  fetchedPmtEnrollmentList,
  errorPmtEnrollmentList,
  pmtEnrollmentList,
  pmtEnrollmentListPageInfo,
  pmtEnrollmentListTotalCount,
  classes,
}) {
  const [exportError, setExportError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentFilters, setCurrentFilters] = useState([]);
  const [districtName, setDistrictName] = useState(null);
  const initialQueryContextRef = useRef(getQueryContext());
  const initialDistrictCode = initialQueryContextRef.current.districtCode;
  const initialPmtCutoff = initialQueryContextRef.current.pmtCutoff;
  const cacheFiltersKey = initialDistrictCode
    ? `pmtEnrollmentFilterCache-${initialDistrictCode}-${initialPmtCutoff ?? 'default'}`
    : 'pmtEnrollmentFilterCache';

  const filtersToQueryParams = ({ filters, page, pageSize }) => {
    const queryParams = Object.keys(filters)
      .filter((filterId) => !!filters[filterId]?.filter)
      .map((filterId) => filters[filterId].filter);

    queryParams.push(`offset: ${page * pageSize}`);
    queryParams.push(`limit: ${pageSize}`);
    queryParams.push(`pmtCutoff: ${initialPmtCutoff ?? 11.01}`);

    return queryParams;
  };

  const fetch = (params) => {
    setCurrentFilters(Array.isArray(params) ? params : []);
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

  const defaultFilters = () => {
    const filters = {};

    if (initialDistrictCode) {
      filters.districtCode = {
        id: 'districtCode',
        value: initialDistrictCode,
        filter: `districtCode: "${initialDistrictCode}"`,
      };
    }

    return filters;
  };

  useEffect(() => {
    if (initialDistrictCode && !districtName) {
      setDistrictName(initialDistrictCode);
    }
  }, [initialDistrictCode, districtName]);

  const pmtEnrollmentFilterPane = (props) => {
    return (
      <PmtEnrollmentSearcherFilter
        intl={props.intl}
        classes={props.classes}
        filters={props.filters}
        onChangeFilters={props.onChangeFilters}
        onLocationNameChange={setDistrictName}
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

      const response = await fetchPmtEnrollmentListForExport(modulesManager, currentFilters);
      const responseData = response?.payload?.data?.pmtEnrollmentList;
      const allHouseholds = responseData?.households?.length
        ? responseData.households
        : pmtEnrollmentList;
      const exportedCount = allHouseholds.length;

      if (allHouseholds.length === 0) {
        throw new Error('No records to export');
      }

      await exportPmtEnrollmentPdf({
        households: allHouseholds,
        generatedDate: new Date(),
        districtCode: districtName,
        pmtCutoff: initialPmtCutoff ?? 11.01,
        totalCount: exportedCount,
        pmtClass: getExportPmtClass(currentFilters, allHouseholds),
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
        filtersToQueryParams={filtersToQueryParams}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="code"
        rowIdentifier={rowIdentifier}
        defaultFilters={defaultFilters()}
        cacheFiltersKey={cacheFiltersKey}
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

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(PmtEnrollmentSearcher),
      ),
    ),
  ),
);
