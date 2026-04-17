import React from 'react';
import { injectIntl } from 'react-intl';
import Filter from './Filter';
import { CONTAINS_LOOKUP } from '../constants';

function EligibleMembersFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const filterFields = [
    { name: 'firstName', label: 'individual.firstName', lookup: CONTAINS_LOOKUP },
    { name: 'lastName', label: 'individual.lastName', lookup: CONTAINS_LOOKUP },
  ];

  const checkboxFields = [
    { name: 'location_Isnull', label: 'individual.hasNoLocation' },
  ];

  return (
    <Filter
      intl={intl}
      classes={classes}
      filters={filters}
      onChangeFilters={onChangeFilters}
      filterFields={filterFields}
      checkboxFields={checkboxFields}
    />
  );
}

export default injectIntl(EligibleMembersFilter);
