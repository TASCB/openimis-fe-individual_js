/// src/components/NonConsentedHouseholdsFilter.js
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { injectIntl } from 'react-intl';

import Filter from './Filter';
import { CONTAINS_LOOKUP } from '../constants';

const styles = (theme) => ({
  root: {
    padding: theme.spacing(1),
  },
  // Add breathing room between blocks
  filterBlock: {
    marginTop: theme.spacing(2), // ✅ increased spacing (was 1)
  },
});

function NonConsentedHouseholdsFilter({
  intl,
  classes,
  filters = {},
  onChangeFilters,
}) {
  const safeOnChangeFilters = (next) => {
    if (typeof onChangeFilters === 'function') {
      onChangeFilters(next);
    }
  };

  const filterFields = [
    { name: 'tf4No', label: 'individual.tf4No', lookup: CONTAINS_LOOKUP },
    { name: 'headName', label: 'individual.headName', lookup: CONTAINS_LOOKUP },
  ];

  const checkboxFields = [
    { name: 'isDeleted', label: 'isDeleted' },
  ];

  return (
    <div className={classes.root}>
      {/* ✅ Title removed, only spacing kept */}
      <div className={classes.filterBlock}>
        <Filter
          intl={intl}
          classes={classes}
          filters={filters}
          onChangeFilters={safeOnChangeFilters}
          filterFields={filterFields}
          checkboxFields={checkboxFields}
        />
      </div>
    </div>
  );
}

export default injectIntl(withStyles(styles)(NonConsentedHouseholdsFilter));
