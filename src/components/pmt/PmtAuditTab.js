import React from 'react';
import { Tab } from '@material-ui/core';
import { formatMessage, PublishedComponent } from '@openimis/fe-core';
import PmtRunHistorySearcher from './PmtRunHistorySearcher';
import PmtFormulaHistorySearcher from './PmtFormulaHistorySearcher';
import { INDIVIDUAL_MODULE_NAME, PMT_AUDIT_TAB_VALUE } from '../../constants';

function PmtAuditTabLabel({
  intl, onChange, tabStyle, isSelected,
}) {
  return (
    <Tab
      onChange={onChange}
      className={tabStyle(PMT_AUDIT_TAB_VALUE)}
      selected={isSelected(PMT_AUDIT_TAB_VALUE)}
      value={PMT_AUDIT_TAB_VALUE}
      style={{ fontWeight: 'bold' }}
      label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.audit.tab')}
    />
  );
}

function PmtAuditTabPanel({ value }) {
  if (value !== PMT_AUDIT_TAB_VALUE) return null;
  return (
    <PublishedComponent
      pubRef="policyHolder.TabPanel"
      module="individual"
      index={PMT_AUDIT_TAB_VALUE}
      value={value}
    >
      <PmtRunHistorySearcher />
      <PmtFormulaHistorySearcher />
    </PublishedComponent>
  );
}

export { PmtAuditTabLabel, PmtAuditTabPanel };
