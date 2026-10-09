import React from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Grid, IconButton, Tooltip } from '@material-ui/core';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  formatMessage, formatMessageWithValues, PublishedComponent, Searcher, withModulesManager,
} from '@openimis/fe-core';

import { fetchPmtAuditSummary } from '../actions';
import {
  INDIVIDUAL_MODULE_NAME, DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { useSearcherTable } from '../util/searcher-table';
import { defaultFilterStyles } from '../util/styles';

const PmtResultsFilter = withStyles(defaultFilterStyles)(({
  intl, classes, filters, onChangeFilters,
}) => {
  const region = filters?.regionCode?.value ?? null;
  const district = filters?.districtCode?.value ?? null;
  return (
    <Grid container className={classes.form}>
      <Grid item xs={3} className={classes.item}>
        <PublishedComponent
          pubRef="location.LocationPicker"
          locationLevel={0}
          value={region}
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.region')}
          onChange={(v) => onChangeFilters([
            { id: 'regionCode', value: v, filter: v?.code ? `regionCode: "${v.code}"` : null },
            { id: 'districtCode', value: null, filter: null },
          ])}
        />
      </Grid>
      <Grid item xs={3} className={classes.item}>
        <PublishedComponent
          pubRef="location.LocationPicker"
          locationLevel={1}
          parentLocation={region}
          value={district}
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.paaName')}
          onChange={(v) => onChangeFilters([
            { id: 'districtCode', value: v, filter: v?.code ? `districtCode: "${v.code}"` : null },
          ])}
        />
      </Grid>
    </Grid>
  );
});

function PmtAuditSummaryTable({
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
    'pmt.auditSummary.total',
    'pmt.auditSummary.poorShare',
    'pmt.auditSummary.action',
  ];

  const total = (d) => (d?.poorCount ?? 0) + (d?.nonPoorCount ?? 0);

  const itemFormatters = () => [
    (d) => d?.districtName || d?.districtCode || '-',
    (d) => (d?.pmtCutoff != null ? d.pmtCutoff.toFixed(2) : '-'),
    (d) => d?.poorCount ?? 0,
    (d) => d?.nonPoorCount ?? 0,
    (d) => total(d),
    (d) => (total(d) ? `${((100 * (d.poorCount ?? 0)) / total(d)).toFixed(1)}%` : '-'),
    (d) => (
      <Tooltip title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.viewTooltip')}>
        <IconButton onClick={() => onViewDistrict && onViewDistrict(d.districtCode, d.pmtCutoff)}>
          <VisibilityIcon />
        </IconButton>
      </Tooltip>
    ),
  ];

  // fe-core Searcher passes its state (incl. page/pageSize) here; map to the endpoint's offset/limit.
  const filtersToQueryParams = ({ filters, page, pageSize }) => [
    ...Object.values(filters || {}).map((f) => f.filter).filter(Boolean),
    `offset: ${page * pageSize}`,
    `limit: ${pageSize}`,
  ];

  const fetch = (params) => fetchAction(modulesManager, params);

  const resultsFilter = (props) => (
    <PmtResultsFilter intl={intl} filters={props.filters} onChangeFilters={props.onChangeFilters} />
  );

  const tableClasses = useSearcherTable({ actionColumns: 1 });

  return (
    <div className={tableClasses.root}>
      <Searcher
        module="individual"
        FilterPane={resultsFilter}
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
        cacheFiltersKey="pmtResultsFilterCache"
        resetFiltersOnUnmount
      />
    </div>
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
)(withModulesManager(injectIntl(withTheme(PmtAuditSummaryTable))));
