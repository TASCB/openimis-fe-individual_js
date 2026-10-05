import React from 'react';
import {
  withTheme, withStyles, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@material-ui/core';
import {
  formatMessage, TextInput, PublishedComponent,
} from '@openimis/fe-core';
import _debounce from 'lodash/debounce';
import { injectIntl } from 'react-intl';
import { INDIVIDUAL_MODULE_NAME, DEFAULT_DEBOUNCE_TIME } from '../constants';
import { defaultFilterStyles } from '../util/styles';

function PmtEnrollmentSearcherFilter({
  intl, classes, filters, onChangeFilters, onLocationNameChange,
}) {
  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);

  const filterValue = (filterName) => {
    return filters?.[filterName]?.value;
  };

  const filterTextFieldValue = (filterName) => {
    const value = filterValue(filterName);
    return value ?? '';
  };

  const onChangeStringFilter = (filterName, lookup = null) => (value) => {
    if (!value) {
      debouncedOnChangeFilters([{ id: filterName, value: null }]);
      return;
    }

    if (lookup) {
      debouncedOnChangeFilters([{ id: filterName, value, filter: `${filterName}_${lookup}: "${value}"` }]);
    } else {
      debouncedOnChangeFilters([{ id: filterName, value, filter: `${filterName}: "${value}"` }]);
    }
  };

  const onChangeFilter = (k, v) => {
    if (v === '' || v === null || v === undefined) {
      onChangeFilters([{ id: k, value: null }]);
      return;
    }

    onChangeFilters([{ id: k, value: v, filter: `${k}: "${v}"` }]);
  };

  const handleLocationFilterChange = (newFilters) => {
    const anchor = (newFilters || []).find((f) => f?.id === 'parentLocation');
    const selected = anchor?.value || null;
    const level = Number((anchor?.filter || '').match(/Level:\s*(\d+)/)?.[1]);
    const codeFilter = (id, active) => (active
      ? { id, value: selected.uuid, filter: `${id}: "${selected.uuid}"` }
      : { id, value: null });

    onLocationNameChange?.(selected?.name || null);
    onChangeFilters([
      ...(newFilters || []).map((f) => ({ ...f, filter: null })),
      codeFilter('regionCode', !!selected && level === 0),
      codeFilter('districtCode', !!selected && level !== 0),
    ]);
  };

  return (
    <Grid container className={classes.form}>
      <Grid item xs={12} sm={3}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label="pmt.household.search"
          value={filterTextFieldValue('searchText')}
          onChange={onChangeStringFilter('searchText')}
        />
      </Grid>

      <Grid item xs={12} sm={3}>
        <FormControl fullWidth variant="standard">
          <InputLabel>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.pmtStatus')}</InputLabel>
          <Select
            value={filterValue('pmtClass') ?? ''}
            onChange={(e) => onChangeFilter('pmtClass', e.target.value)}
          >
            <MenuItem value="">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'any')}</MenuItem>
            <MenuItem value="POOR">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.poor')}</MenuItem>
            <MenuItem value="NON_POOR">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.nonPoor')}</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <PublishedComponent
          pubRef="location.DetailedLocationFilter"
          filters={filters}
          onChangeFilters={handleLocationFilterChange}
          anchor="parentLocation"
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(PmtEnrollmentSearcherFilter)));
