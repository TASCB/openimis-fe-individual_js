import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Grid, TextField, Select, MenuItem, FormControl, InputLabel, Collapse,
  IconButton, Typography,
} from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';
import { injectIntl } from 'react-intl';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { debounce } from 'lodash';

import { INDIVIDUAL_MODULE_NAME, PMT_CLASS } from '../constants';

const styles = (theme) => ({
  container: {
    padding: theme.spacing(2),
    backgroundColor: '#fafafa',
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    marginBottom: theme.spacing(1),
  },
  filterTitle: {
    fontWeight: 600,
  },
  gridContainer: {
    marginTop: theme.spacing(1),
  },
  formControl: {
    minWidth: 120,
  },
});

function PmtHouseholdFilter({
  classes,
  intl,
  filters,
  onChangeFilters,
  disabled,
}) {
  const [expanded, setExpanded] = useState(true);

  // Debounce search text changes
  const debouncedSearch = React.useRef(
    debounce((value) => {
      onChangeFilters({
        ...filters,
        searchText: value,
      });
    }, 300)
  ).current;

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handlePmtClassChange = (e) => {
    onChangeFilters({
      ...filters,
      pmtClass: e.target.value,
    });
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <div className={classes.container}>
      {/* Filter Header */}
      <div className={classes.filterHeader} onClick={handleToggleExpand}>
        <Typography className={classes.filterTitle}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.title')}
        </Typography>
        <IconButton size="small" disabled={disabled}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </div>

      {/* Filter Content */}
      <Collapse in={expanded}>
        <Grid container spacing={2} className={classes.gridContainer}>
          {/* Search */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.searchPlaceholder')}
              placeholder={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.searchPlaceholder')}
              variant="outlined"
              size="small"
              onChange={handleSearchChange}
              disabled={disabled}
              defaultValue={filters.searchText || ''}
            />
          </Grid>

          {/* PMT Class Filter */}
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small" variant="outlined">
              <InputLabel>
                {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.status')}
              </InputLabel>
              <Select
                value={filters.pmtClass || 'ALL'}
                onChange={handlePmtClassChange}
                label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.filter.status')}
                disabled={disabled}
              >
                <MenuItem value="ALL">
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.all')}
                </MenuItem>
                <MenuItem value={PMT_CLASS.POOR}>
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.poor')}
                </MenuItem>
                <MenuItem value={PMT_CLASS.NON_POOR}>
                  {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.nonPoor')}
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Collapse>
    </div>
  );
}

export default injectIntl(withTheme(withStyles(styles)(PmtHouseholdFilter)));
