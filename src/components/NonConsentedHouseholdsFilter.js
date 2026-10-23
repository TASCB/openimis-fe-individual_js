import React from 'react';
import { injectIntl } from 'react-intl';
import {
  Checkbox, FormControlLabel, Grid, withStyles, withTheme,
} from '@material-ui/core';
import { formatMessage, PublishedComponent, TextInput } from '@openimis/fe-core';

import { useFilterChangeHandler } from './Filter';
import { INDIVIDUAL_MODULE_NAME } from '../constants';
import { defaultFilterStyles } from '../util/styles';

function NonConsentedHouseholdsFilter({
  intl, classes, filters = {}, onChangeFilters,
}) {
  const { onChangeStringFilter } = useFilterChangeHandler(onChangeFilters);

  return (
    <Grid container className={classes.form}>
      <Grid item xs={12}>
        <PublishedComponent
          pubRef="location.DetailedLocationFilter"
          withNull
          filters={filters}
          onChangeFilters={onChangeFilters}
          anchor="parentLocation"
        />
      </Grid>
      <Grid item xs={3} className={classes.item}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label="individual.headName"
          value={filters?.headName?.value ?? ''}
          onChange={onChangeStringFilter('headName')}
        />
      </Grid>
      <Grid item xs={3} className={classes.item}>
        <TextInput
          module={INDIVIDUAL_MODULE_NAME}
          label="individual.interviewKey"
          value={filters?.interviewKey?.value ?? ''}
          onChange={onChangeStringFilter('interviewKey')}
        />
      </Grid>
      <Grid item xs={3} className={classes.item}>
        <FormControlLabel
          control={(
            <Checkbox
              checked={filters?.isTasafBeneficiary?.value ?? false}
              onChange={(e) => onChangeFilters([{
                id: 'isTasafBeneficiary',
                value: e.target.checked,
                filter: e.target.checked ? 'isTasafBeneficiary: true' : null,
              }])}
              name="isTasafBeneficiary"
            />
          )}
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.isTasafBeneficiary')}
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(NonConsentedHouseholdsFilter)));
