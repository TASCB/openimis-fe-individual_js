import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  TextField, MenuItem, Button, Grid, Box,
} from '@material-ui/core';
import { formatMessage, PublishedComponent } from '@openimis/fe-core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';

import { INDIVIDUAL_MODULE_NAME } from '../../constants';

const styles = (theme) => ({
  root: {
    backgroundColor: '#fafafa',
    border: '1px solid #e0e0e0',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  expandButton: {
    marginTop: theme.spacing(2),
  },
  filterGrid: {
    gap: theme.spacing(2),
  },
  buttonContainer: {
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'flex-end',
    marginTop: theme.spacing(2),
  },
});

function PmtEnrollmentFilter({
  classes,
  intl,
  filters,
  onChangeFilters,
  disabled,
  modulesManager,
}) {
  const [expanded, setExpanded] = useState(true);

  const handleSearchChange = (e) => {
    onChangeFilters({
      ...filters,
      searchText: e.target.value,
    });
  };

  const handleStatusChange = (e) => {
    onChangeFilters({
      ...filters,
      pmtClass: e.target.value,
    });
  };

  const handleRegionChange = (region) => {
    onChangeFilters({
      ...filters,
      regionCode: region?.code || null,
      districtCode: null, // Reset district when region changes
    });
  };

  const handleDistrictChange = (district) => {
    onChangeFilters({
      ...filters,
      districtCode: district?.code || null,
    });
  };

  const handleReset = () => {
    onChangeFilters({
      searchText: '',
      pmtClass: 'ALL',
      regionCode: null,
      districtCode: null,
    });
  };

  return (
    <div className={classes.root}>
      {expanded ? (
        <>
          <Grid container spacing={2} className={classes.filterGrid}>
            {/* District Picker - REQUIRED */}
            <Grid item xs={12} sm={6} md={4}>
              <PublishedComponent
                pubRef="location.LocationPicker"
                onChange={handleDistrictChange}
                value={filters.districtCode ? { code: filters.districtCode } : null}
                locationLevel={1}
                label={`${formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.configuration.district')} *`}
                disabled={disabled}
              />
              <small style={{ color: '#999', fontSize: '0.75rem' }}>
                {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.districtRequired')}
              </small>
            </Grid>

            {/* Search Code */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.searchCode')}
                type="text"
                value={filters.searchText || ''}
                onChange={handleSearchChange}
                disabled={disabled}
                placeholder={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.searchPlaceholder')}
                variant="outlined"
                size="small"
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                select
                label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.status')}
                value={filters.pmtClass || 'ALL'}
                onChange={handleStatusChange}
                disabled={disabled}
                variant="outlined"
                size="small"
              >
                <MenuItem value="ALL">
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.all')}
                </MenuItem>
                <MenuItem value="POOR">
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.poor')}
                </MenuItem>
                <MenuItem value="NON_POOR">
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.nonPoor')}
                </MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <div className={classes.buttonContainer}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleReset}
              disabled={disabled}
            >
              {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.reset')}
            </Button>
          </div>

          <Button
            fullWidth
            startIcon={<ExpandLessIcon />}
            onClick={() => setExpanded(false)}
            className={classes.expandButton}
          >
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.collapse')}
          </Button>
        </>
      ) : (
        <Button
          fullWidth
          startIcon={<ExpandMoreIcon />}
          onClick={() => setExpanded(true)}
          className={classes.expandButton}
        >
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.expand')}
        </Button>
      )}
    </div>
  );
}

export default withTheme(withStyles(styles)(injectIntl(PmtEnrollmentFilter)));
