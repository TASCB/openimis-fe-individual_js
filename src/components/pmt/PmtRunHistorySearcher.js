import React from 'react';
import { injectIntl } from 'react-intl';
import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import _debounce from 'lodash/debounce';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  ConstantBasedPicker,
  formatDateTimeFromISO,
  formatMessage,
  formatMessageWithValues,
  PublishedComponent,
  Searcher,
  TextInput,
  withModulesManager,
} from '@openimis/fe-core';
import { fetchPmtRunHistory } from '../../actions';
import {
  CONTAINS_LOOKUP,
  DEFAULT_DEBOUNCE_TIME,
  DEFAULT_PAGE_SIZE,
  EMPTY_STRING,
  INDIVIDUAL_MODULE_NAME,
  PMT_RUN_OPERATIONS,
  PMT_RUN_STATUSES,
  ROWS_PER_PAGE_OPTIONS,
} from '../../constants';
import { defaultFilterStyles } from '../../util/styles';
import { useSearcherTable } from '../../util/searcher-table';

const LABEL = 'pmt.audit.runs';

const PmtRunHistoryFilter = withStyles(defaultFilterStyles)(({
  intl, classes, filters, onChangeFilters,
}) => {
  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);
  const filterValue = (name) => filters?.[name]?.value ?? null;
  // operation / status are graphene enums: the value must go unquoted.
  const onChangeEnum = (name) => (v) => onChangeFilters([
    { id: name, value: v, filter: v ? `${name}: ${v}` : null },
  ]);
  const onChangeDate = (name) => (v) => onChangeFilters([
    { id: name, value: v, filter: v ? `${name}: "${v}T00:00:00.000Z"` : null },
  ]);

  return (
    <Grid container className={classes.form}>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="location.LocationPicker"
          locationLevel={1}
          value={filterValue('districtCode')}
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.paa`)}
          onChange={(v) => onChangeFilters([
            { id: 'districtCode', value: v, filter: v?.code ? `districtCode: "${v.code}"` : null },
          ])}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <ConstantBasedPicker
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.operation`}
          constants={PMT_RUN_OPERATIONS}
          value={filterValue('operation')}
          onChange={onChangeEnum('operation')}
          withNull
          withLabel
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <ConstantBasedPicker
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.status`}
          constants={PMT_RUN_STATUSES}
          value={filterValue('status')}
          onChange={onChangeEnum('status')}
          withNull
          withLabel
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.dateFrom`}
          value={filterValue('startedAt_Gte')}
          onChange={onChangeDate('startedAt_Gte')}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.dateTo`}
          value={filterValue('startedAt_Lte')}
          onChange={onChangeDate('startedAt_Lte')}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.user`}
          value={filters?.user_Username?.value ?? EMPTY_STRING}
          onChange={(v) => debouncedOnChangeFilters([
            { id: 'user_Username', value: v, filter: `user_Username_${CONTAINS_LOOKUP}: "${v}"` },
          ])}
        />
      </Grid>
    </Grid>
  );
});

function PmtRunHistorySearcher({
  intl,
  modulesManager,
  fetchPmtRunHistory: fetchAction,
  pmtRunHistory,
  pmtRunHistoryPageInfo,
  fetchingPmtRunHistory,
  fetchedPmtRunHistory,
  errorPmtRunHistory,
  pmtRunHistoryTotalCount,
}) {
  const fetch = (params) => fetchAction(modulesManager, params);

  const headers = () => [
    `${LABEL}.paa`,
    `${LABEL}.operation`,
    `${LABEL}.cutoff`,
    `${LABEL}.poor`,
    `${LABEL}.nonPoor`,
    `${LABEL}.households`,
    `${LABEL}.status`,
    `${LABEL}.date`,
    `${LABEL}.user`,
  ];

  const itemFormatters = () => [
    (run) => run.districtName || run.districtCode || formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.allPaas`),
    (run) => (run.operation
      ? formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.operation.${run.operation}`) : EMPTY_STRING),
    (run) => (run.pmtCutoff != null ? Number(run.pmtCutoff).toFixed(2) : '-'),
    (run) => run.poorAfter ?? '-',
    (run) => run.nonPoorAfter ?? '-',
    (run) => run.totalGroups,
    (run) => formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.status.${run.status}`),
    (run) => formatDateTimeFromISO(modulesManager, intl, run.completedAt || run.startedAt),
    (run) => run?.userUpdated?.username,
  ];

  const sorts = () => [
    ['districtCode', true],
    ['operation', true],
    null,
    null,
    null,
    ['totalGroups', true],
    ['status', true],
    ['startedAt', true],
    null,
  ];

  const runHistoryFilter = (props) => (
    <PmtRunHistoryFilter intl={intl} filters={props.filters} onChangeFilters={props.onChangeFilters} />
  );

  const tableClasses = useSearcherTable({ actionColumns: 0 });

  return (
    <div className={tableClasses.root}>
      <Searcher
        module={INDIVIDUAL_MODULE_NAME}
        FilterPane={runHistoryFilter}
        fetch={fetch}
        items={pmtRunHistory}
        itemsPageInfo={pmtRunHistoryPageInfo}
        fetchingItems={fetchingPmtRunHistory}
        fetchedItems={fetchedPmtRunHistory}
        errorItems={errorPmtRunHistory}
        tableTitle={formatMessageWithValues(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.searcherResultsTitle`, {
          count: pmtRunHistoryTotalCount ?? 0,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="-startedAt"
        rowIdentifier={(run) => run.id}
        cacheFiltersKey="pmtRunHistoryFilterCache"
        resetFiltersOnUnmount
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPmtRunHistory: state.individual.fetchingPmtRunHistory,
  fetchedPmtRunHistory: state.individual.fetchedPmtRunHistory,
  errorPmtRunHistory: state.individual.errorPmtRunHistory,
  pmtRunHistory: state.individual.pmtRunHistory,
  pmtRunHistoryPageInfo: state.individual.pmtRunHistoryPageInfo,
  pmtRunHistoryTotalCount: state.individual.pmtRunHistoryTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPmtRunHistory }, dispatch);

export default withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(PmtRunHistorySearcher)));
