import React from 'react';
import { Tab } from '@material-ui/core';
import { formatMessage, PublishedComponent, withHistory } from '@openimis/fe-core';
import PmtAuditSummaryTable from '../PmtAuditSummaryTable';
import { INDIVIDUAL_MODULE_NAME, PMT_RESULTS_TAB_VALUE } from '../../constants';

function PmtResultsTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_RESULTS_TAB_VALUE)}
      selected={isSelected(PMT_RESULTS_TAB_VALUE)}
      value={PMT_RESULTS_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.tab')}
    />
  );
}

function PmtResultsTabPanelComponent({ value, history }) {
  if (value !== PMT_RESULTS_TAB_VALUE) return null;

  const onViewDistrict = (districtCode, pmtCutoffValue) => {
    const qs = new URLSearchParams();
    if (districtCode) qs.set('district', districtCode);
    if (pmtCutoffValue !== undefined && pmtCutoffValue !== null) qs.set('cutoff', pmtCutoffValue);
    history.push(`/pmt/enrollment-list?${qs.toString()}`);
  };

  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_RESULTS_TAB_VALUE}
      value={value}
    >
      <PmtAuditSummaryTable onViewDistrict={onViewDistrict} />
    </PublishedComponent>
  );
}

const PmtResultsTabPanel = withHistory(PmtResultsTabPanelComponent);

export { PmtResultsTabLabel, PmtResultsTabPanel };
