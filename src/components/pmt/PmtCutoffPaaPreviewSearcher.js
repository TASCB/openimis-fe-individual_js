import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { injectIntl } from 'react-intl';
import Alert from '@material-ui/lab/Alert';
import {
  formatMessage, formatMessageWithValues, Searcher,
} from '@openimis/fe-core';
import { fetchPmtCutoffPaaPreview } from '../../actions';
import { DEFAULT_PAGE_SIZE, INDIVIDUAL_MODULE_NAME, ROWS_PER_PAGE_OPTIONS } from '../../constants';
import { useSearcherTable } from '../../util/searcher-table';

const LABEL = 'pmt.checkEligible.paaPreview';

const count = (n) => (n == null ? '-' : Number(n).toLocaleString());
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function PmtCutoffPaaPreviewSearcher({
  intl, cutoff, districtCode, regionCode, scopeName,
  items, totalCount, fetching, fetched, error,
  fetchPmtCutoffPaaPreview: fetchAction,
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const t = (key) => formatMessage(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.${key}`);
  const tableClasses = useSearcherTable();

  const headers = () => [
    `${LABEL}.paa`,
    `${LABEL}.previousCutoff`,
    `${LABEL}.previousEligible`,
    `${LABEL}.newCutoff`,
    `${LABEL}.newEligible`,
  ];

  const itemFormatters = () => [
    (r) => r.districtName || r.districtCode || '-',
    (r) => (r.previousCutoff == null ? '-' : r.previousCutoff),
    (r) => count(r.previousEligible),
    (r) => r.newCutoff,
    (r) => count(r.newEligible),
  ];

  const filtersToQueryParams = ({ page, pageSize }) => [`offset: ${page * pageSize}`, `limit: ${pageSize}`];

  const fetch = (queryParams) => fetchAction({
    cutoff, districtCode, regionCode, queryParams,
  });

  const downloadCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetchAction({
        cutoff, districtCode, regionCode, exportAll: true,
      });
      const rows = response?.payload?.data?.pmtCutoffPaaPreview?.items;
      if (!rows) throw new Error(t('exportFailed'));
      const lines = [
        headers().map((h) => csvCell(formatMessage(intl, INDIVIDUAL_MODULE_NAME, h))).join(','),
        ...rows.map((r) => [
          r.districtName || r.districtCode, r.previousCutoff, r.previousEligible, r.newCutoff, r.newEligible,
        ].map(csvCell).join(',')),
      ];
      const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pmt_cutoff_${cutoff}_${(scopeName || 'all').replace(/[^A-Za-z0-9]+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e.message || t('exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const actions = [{
    label: `${LABEL}.downloadCsv`,
    action: downloadCsv,
    enabled: () => !!totalCount && !fetching && !exporting,
  }];

  return (
    <div className={tableClasses.root}>
      {exportError && <Alert severity="error">{exportError}</Alert>}
      <Searcher
        module={INDIVIDUAL_MODULE_NAME}
        fetch={fetch}
        items={items}
        itemsPageInfo={{ totalCount }}
        fetchingItems={fetching}
        fetchedItems={fetched}
        errorItems={error}
        tableTitle={formatMessageWithValues(intl, INDIVIDUAL_MODULE_NAME, `${LABEL}.searcherResultsTitle`, {
          count: totalCount ?? 0,
        })}
        filtersToQueryParams={filtersToQueryParams}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        rowIdentifier={(r) => r.districtCode}
        actions={actions}
        resetFiltersOnUnmount
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  items: state.individual.pmtCutoffPaaPreview,
  totalCount: state.individual.pmtCutoffPaaPreviewTotalCount,
  fetching: state.individual.fetchingPmtCutoffPaaPreview,
  fetched: state.individual.fetchedPmtCutoffPaaPreview,
  error: state.individual.errorPmtCutoffPaaPreview,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPmtCutoffPaaPreview }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(PmtCutoffPaaPreviewSearcher));
