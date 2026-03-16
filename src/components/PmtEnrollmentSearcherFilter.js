import React from 'react';
import {
  withTheme, withStyles, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@material-ui/core';
import {
  formatMessage, TextInput, PublishedComponent,
} from '@openimis/fe-core';
import _debounce from 'lodash/debounce';
import { injectIntl } from 'react-intl';
import { INDIVIDUAL_MODULE_NAME, CONTAINS_LOOKUP, DEFAULT_DEBOUNCE_TIME } from '../constants';
import { defaultFilterStyles } from '../util/styles';

function PmtEnrollmentSearcherFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const debouncedOnChangeFilters = _debounce(onChangeFilters, DEFAULT_DEBOUNCE_TIME);

  const filterValue = (filterName) => {
    if (!filters) return null;
    if (Array.isArray(filters)) {
      const filter = filters.find((f) => f.id === filterName);
      return filter?.value;
    }
    return filters?.[filterName]?.value;
  };

  const filterTextFieldValue = (filterName) => {
    const value = filterValue(filterName);
    return value ?? '';
  };

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

  /**
   * Handle location filter change from DetailedLocationFilter
   * Converts location object to filter format
   */
  const handleLocationFilterChange = (newFilters) => {
    if (newFilters && Array.isArray(newFilters)) {
      // Merge with existing filters, replacing location-related ones
      let nonLocationFilters = [];

      if (filters && Array.isArray(filters)) {
        // Filters is an array - filter out location filters
        nonLocationFilters = filters.filter(
          (f) => !['parentLocation', 'location', 'districtLocation', 'regionLocation'].includes(f.id),
        );
      } else if (filters && typeof filters === 'object') {
        // Filters is an object - convert to array format but exclude location filters
        nonLocationFilters = Object.values(filters).filter(
          (f) => f && f.id && !['parentLocation', 'location', 'districtLocation', 'regionLocation'].includes(f.id),
        );
      }

      onChangeFilters([...nonLocationFilters, ...newFilters]);
    } else {
      onChangeFilters(newFilters);
    }
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

      {/* Row 2: Location Filter - District Required */}
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
