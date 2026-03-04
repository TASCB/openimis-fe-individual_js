import React from 'react';
import {
  withTheme, withStyles, Grid, TextField, MenuItem,
} from '@material-ui/core';
import {
  formatMessage, TextInput, PublishedComponent, Contributions,
} from '@openimis/fe-core';
import _debounce from 'lodash/debounce';
import { injectIntl } from 'react-intl';
import { INDIVIDUAL_MODULE_NAME, CONTAINS_LOOKUP, DEFAULT_DEBOUNCE_TIME } from '../constants';
import { defaultFilterStyles } from '../util/styles';

function PmtEnrollmentSearcherFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);

  const filterValue = (filterName) => filters?.[filterName]?.value;

  const filterTextFieldValue = (filterName) => filters?.[filterName]?.value ?? '';

  const onChangeStringFilter = (filterName, lookup = null) => (value) => {
    if (lookup) {
      debouncedOnChangeFilters([
        {
          id: filterName,
          value,
          filter: `${filterName}_${lookup}: "${value}"`,
        },
      ]);
    } else {
      onChangeFilters([
        {
          id: filterName,
          value,
          filter: `${filterName}: "${value}"`,
        },
      ]);
    }
  };

  const onChangeFilter = (k, v) => {
    onChangeFilters([{ id: k, value: v, filter: `${k}: ${v}` }]);
  };

  return (
    <Grid container className={classes.form}>
      {/* Row 1: Search Code, Search Head Name, PMT Status, and Deduplicate */}
      <Grid item xs={12} sm={3}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label="pmt.household.searchCode"
          value={filterTextFieldValue('code')}
          onChange={onChangeStringFilter('code', CONTAINS_LOOKUP)}
        />
      </Grid>

      <Grid item xs={12} sm={3}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label="pmt.household.searchHeadName"
          value={filterTextFieldValue('headName')}
          onChange={onChangeStringFilter('headName', CONTAINS_LOOKUP)}
        />
      </Grid>

      <Grid item xs={12} sm={3}>
        <TextField
          select
          fullWidth
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.pmtStatus')}
          value={filterValue('pmtClass') ?? ''}
          onChange={(e) => onChangeFilter('pmtClass', e.target.value)}
          variant="outlined"
          size="small"
        >
          <MenuItem value="">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'any')}</MenuItem>
          <MenuItem value="POOR">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.poor')}</MenuItem>
          <MenuItem value="NON_POOR">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.nonPoor')}</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} sm={3} style={{ display: 'flex', alignItems: 'flex-end', paddingLeft: '8px' }}>
        <Contributions
          contributionKey="deduplication.deduplicationFieldSelectionDialog"
          intl={intl}
          benefitPlan={{
            id: 'pmt-enrollment',
            name: 'PMT Enrollment Deduplication',
            beneficiaryDataSchema: JSON.stringify({
              properties: {
                groupCode: { type: 'string' },
                headName: { type: 'string' },
                locationName: { type: 'string' },
                pmtScore: { type: 'number' },
                pmtClass: { type: 'string' },
              },
            }),
          }}
        />
      </Grid>

      {/* Row 2: Location Filter - Full Width */}
      <Grid item xs={12}>
        <PublishedComponent
          pubRef="location.DetailedLocationFilter"
          withNull
          filters={filters}
          onChangeFilters={onChangeFilters}
          anchor="parentLocation"
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(PmtEnrollmentSearcherFilter)));
