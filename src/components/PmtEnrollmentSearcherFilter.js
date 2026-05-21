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

const LOCATION_FILTER_IDS = ['parentLocation', 'location', 'districtLocation', 'regionLocation', 'parentLocationLevel'];

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
    const nonLocationFilters = Object.entries(filters || {})
      .filter(([id]) => !LOCATION_FILTER_IDS.includes(id) && !['districtCode', 'regionCode'].includes(id))
      .map(([id, filter]) => ({
        id,
        value: filter?.value,
        filter: filter?.filter,
      }));

    if (!Array.isArray(newFilters) || newFilters.length === 0) {
      onLocationNameChange?.(null);
      onChangeFilters([
        ...nonLocationFilters,
        { id: 'districtCode', value: null },
        { id: 'regionCode', value: null },
      ]);
      return;
    }

    const locationFilter = newFilters.find((filter) => ['parentLocation', 'location', 'districtLocation', 'regionLocation'].includes(filter?.id));
    const levelFilter = newFilters.find((filter) => filter?.id === 'parentLocationLevel');
    const locationValue = locationFilter?.value;
    const locationIdentifier = locationValue?.uuid || locationValue?.id || locationValue?.code || locationValue;

    if (!locationIdentifier) {
      onLocationNameChange?.(null);
      onChangeFilters([
        ...nonLocationFilters,
        { id: 'districtCode', value: null },
        { id: 'regionCode', value: null },
      ]);
      return;
    }

    const locationLevel = Number(levelFilter?.value);
    const backendFilterId = locationFilter?.id === 'regionLocation' || locationLevel === 0
      ? 'regionCode'
      : 'districtCode';

    onLocationNameChange?.(locationValue?.name || locationValue?.displayName || null);
    onChangeFilters([
      ...nonLocationFilters,
      { id: 'districtCode', value: null },
      { id: 'regionCode', value: null },
      {
        id: backendFilterId,
        value: locationIdentifier,
        filter: `${backendFilterId}: "${locationIdentifier}"`,
      },
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
