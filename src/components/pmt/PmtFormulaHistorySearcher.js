import React from 'react';
import { injectIntl } from 'react-intl';
import { Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import _debounce from 'lodash/debounce';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  formatDateTimeFromISO,
  formatMessageWithValues,
  PublishedComponent,
  Searcher,
  TextInput,
  withModulesManager,
} from '@openimis/fe-core';
import { fetchPmtFormulaHistory } from '../../actions';
import {
  CONTAINS_LOOKUP,
  DEFAULT_DEBOUNCE_TIME,
  DEFAULT_PAGE_SIZE,
  EMPTY_STRING,
  INDIVIDUAL_MODULE_NAME,
  ROWS_PER_PAGE_OPTIONS,
} from '../../constants';
import AdditionalFieldsDialog from '../dialogs/AdditionalFieldsDialog';
import { defaultFilterStyles } from '../../util/styles';
import { useSearcherTable } from '../../util/searcher-table';

const LABEL = 'pmt.audit.formula';

const parseFormula = (formula) => {
  try {
    return typeof formula === 'string' ? JSON.parse(formula) : (formula || {});
  } catch (e) {
    return {};
  }
};

const flatFormulaJson = (formula) => {
  const { assets, ...rest } = parseFormula(formula);
  const flat = { ...rest };
  Object.entries(assets || {}).forEach(([code, coef]) => { flat[`asset_${code}`] = coef; });
  return JSON.stringify(flat);
};

const PmtFormulaHistoryFilter = withStyles(defaultFilterStyles)(({
  classes, filters, onChangeFilters,
}) => {
  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);
  const onChangeDate = (name) => (v) => onChangeFilters([
    { id: name, value: v, filter: v ? `${name}: "${v}T00:00:00.000Z"` : null },
  ]);

  return (
    <Grid container className={classes.form}>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.dateFrom`}
          value={filters?.dateUpdated_Gte?.value ?? null}
          onChange={onChangeDate('dateUpdated_Gte')}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <PublishedComponent
          pubRef="core.DatePicker"
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.dateTo`}
          value={filters?.dateUpdated_Lte?.value ?? null}
          onChange={onChangeDate('dateUpdated_Lte')}
        />
      </Grid>
      <Grid item xs={2} className={classes.item}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label={`${LABEL}.userUpdated`}
          value={filters?.userUpdated_Username?.value ?? EMPTY_STRING}
          onChange={(v) => debouncedOnChangeFilters([
            { id: 'userUpdated_Username', value: v, filter: `userUpdated_Username_${CONTAINS_LOOKUP}: "${v}"` },
          ])}
        />
      </Grid>
    </Grid>
  );
});

function PmtFormulaHistorySearcher({
  intl,
  modulesManager,
  fetchPmtFormulaHistory: fetchAction,
  pmtFormulaHistory,
  pmtFormulaHistoryPageInfo,
  fetchingPmtFormulaHistory,
  fetchedPmtFormulaHistory,
  errorPmtFormulaHistory,
  pmtFormulaHistoryTotalCount,
}) {
  const fetch = (params) => fetchAction(modulesManager, params);

  const headers = () => [
    `${LABEL}.version`,
    `${LABEL}.cutoff`,
    `${LABEL}.dateUpdated`,
    `${LABEL}.formula`,
    `${LABEL}.userUpdated`,
  ];

  const itemFormatters = () => [
    (version) => version.version,
    (version) => {
      const { cutoff } = parseFormula(version.formula);
      return cutoff != null ? Number(cutoff).toFixed(2) : EMPTY_STRING;
    },
    (version) => (version.dateUpdated
      ? formatDateTimeFromISO(modulesManager, intl, version.dateUpdated) : EMPTY_STRING),
    (version) => <AdditionalFieldsDialog individualJsonExt={flatFormulaJson(version.formula)} />,
    (version) => version?.userUpdated?.username,
  ];

  const sorts = () => [
    ['version', true],
    null,
    ['dateUpdated', true],
    null,
    null,
  ];

  const formulaHistoryFilter = (props) => (
    <PmtFormulaHistoryFilter filters={props.filters} onChangeFilters={props.onChangeFilters} />
  );

  const tableClasses = useSearcherTable({ actionColumns: 0 });

  return (
    <div className={tableClasses.root}>
      <Searcher
        module={INDIVIDUAL_MODULE_NAME}
        FilterPane={formulaHistoryFilter}
        fetch={fetch}
        items={pmtFormulaHistory}
        itemsPageInfo={pmtFormulaHistoryPageInfo}
        fetchingItems={fetchingPmtFormulaHistory}
        fetchedItems={fetchedPmtFormulaHistory}
        errorItems={errorPmtFormulaHistory}
        tableTitle={formatMessageWithValues(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.searcherResultsTitle`, {
          count: pmtFormulaHistoryTotalCount ?? 0,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="-dateUpdated"
        rowIdentifier={(version) => version.id}
        defaultFilters={{ isDeleted: { value: false, filter: 'isDeleted: false' } }}
        cacheFiltersKey="pmtFormulaHistoryFilterCache"
        resetFiltersOnUnmount
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPmtFormulaHistory: state.individual.fetchingPmtFormulaHistory,
  fetchedPmtFormulaHistory: state.individual.fetchedPmtFormulaHistory,
  errorPmtFormulaHistory: state.individual.errorPmtFormulaHistory,
  pmtFormulaHistory: state.individual.pmtFormulaHistory,
  pmtFormulaHistoryPageInfo: state.individual.pmtFormulaHistoryPageInfo,
  pmtFormulaHistoryTotalCount: state.individual.pmtFormulaHistoryTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPmtFormulaHistory }, dispatch);

export default withModulesManager(
  injectIntl(connect(mapStateToProps, mapDispatchToProps)(PmtFormulaHistorySearcher)),
);
