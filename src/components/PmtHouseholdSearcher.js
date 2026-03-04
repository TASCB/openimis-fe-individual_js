import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Button, CircularProgress, Typography, Box, Chip, Tooltip, Grid,
  TablePagination, TextField,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { formatMessage, withModulesManager } from '@openimis/fe-core';
import { injectIntl } from 'react-intl';
import GetAppIcon from '@material-ui/icons/GetApp';
import { debounce } from 'lodash';

import { fetchPmtHouseholds } from '../actions';
import PmtHouseholdFilter from './PmtHouseholdFilter';
import { PMT_CLASS, PMT_CLASS_COLORS, INDIVIDUAL_MODULE_NAME, DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from '../constants';
import { exportPmtResultsAsPdf } from '../util/pmt-export';

const styles = (theme) => {
  // Extract colors from theme with fallbacks
  const headerBG =
    theme?.table?.header?.backgroundColor ??
    theme.palette?.action?.hover ??
    "#e0f2f1";

  const headerColor =
    theme?.table?.header?.color ??
    theme.palette?.text?.primary;

  const bodyBG =
    theme?.table?.backgroundColor ??
    theme?.paper?.background ??
    theme.palette?.background?.paper;

  return {
    // Container and layout
    container: {
      marginTop: theme.spacing(2),
    },

    paper: {
      padding: theme.spacing(2),
    },

    table: {
      minWidth: 750,
    },

    // Table header styling - use tealHead class on Table element
    header: theme.table?.header,
    headerTitle: theme.table?.title,

    tealHead: {
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-root": {
        backgroundColor: `${headerBG} !important`,
        color: `${headerColor} !important`,
        fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
      },
      "& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-stickyHeader": {
        backgroundColor: `${headerBG} !important`,
        color: `${headerColor} !important`,
        fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
      },
    },

    tableContainerBg: {
      backgroundColor: bodyBG,
    },

    // Status indicators
    statusCell: {
      fontWeight: 'bold',
    },

    poorChip: {
      backgroundColor: '#d32f2f',
      color: 'white',
    },

    nonPoorChip: {
      backgroundColor: '#388e3c',
      color: 'white',
    },

    // Loading state
    loadingBox: { textAlign: "center", padding: theme.spacing(3) },

    // Error handling
    errorContainer: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      marginBottom: theme.spacing(2),
    },

    // Toolbar and controls
    toolbarContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(2),
      flexWrap: 'wrap',
      gap: theme.spacing(1),
    },

    filterContainer: {
      marginBottom: theme.spacing(2),
    },

    exportButton: {
      marginLeft: theme.spacing(1),
    },

    searchContainer: {
      marginBottom: theme.spacing(1),
    },

    // Cell styling
    scoreCell: {
      fontFamily: 'monospace',
      textAlign: 'right',
      paddingRight: theme.spacing(2),
    },
  };
};

function PmtHouseholdSearcher({
  classes,
  modulesManager,
  intl,
  districtCode,
  regionCode,
  pmtCutoff,
  refreshTrigger,
  // Redux
  pmtHouseholds,
  fetchingPmtHouseholds,
  errorPmtHouseholds,
  pmtHouseholdsPageInfo,
  pmtHouseholdsTotalCount,
  // Actions
  fetchPmtHouseholds: fetchPmtHouseholdsAction,
}) {
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    searchText: '',
    pmtClass: 'ALL',
  });

  const debouncedFetch = React.useRef(
    debounce((newOffset, newPageSize, newFilters) => {
      fetchPmtHouseholdsAction(modulesManager, {
        districtCode,
        regionCode,
        offset: newOffset,
        limit: newPageSize,
        searchText: newFilters.searchText,
        pmtClass: newFilters.pmtClass === 'ALL' ? '' : newFilters.pmtClass,
      });
    }, 500)
  ).current;

  // Initial fetch and refresh on changes
  useEffect(() => {
    if (!districtCode) return;

    setOffset(0);
    debouncedFetch(0, pageSize, filters);
  }, [districtCode, refreshTrigger]);

  // Fetch on pagination/filter changes
  useEffect(() => {
    if (!districtCode) return;
    debouncedFetch(offset, pageSize, filters);
  }, [offset, pageSize, filters, districtCode]);

  const handlePageSizeChange = (event) => {
    setPageSize(event.target.value);
    setOffset(0);
  };

  const handlePageChange = (event, newOffset) => {
    setOffset(newOffset * pageSize);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setOffset(0);
  };

  const handleExportPdf = () => {
    if (!pmtHouseholds || pmtHouseholds.length === 0) {
      alert(formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults'));
      return;
    }

    exportPmtResultsAsPdf({
      households: pmtHouseholds,
      districtCode,
      districtName: pmtHouseholds[0]?.locationName || 'Unknown',
      pmtCutoff,
      filters,
      generatedDate: new Date(),
    });
  };

  const getStatusChip = (pmtClass) => {
    if (pmtClass === PMT_CLASS.POOR) {
      return (
        <Chip
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.poor')}
          className={classes.poorChip}
          size="small"
        />
      );
    }
    if (pmtClass === PMT_CLASS.NON_POOR) {
      return (
        <Chip
          label={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.status.nonPoor')}
          className={classes.nonPoorChip}
          size="small"
        />
      );
    }
    return '-';
  };

  if (!districtCode) {
    return (
      <div className={classes.container}>
        <Typography color="textSecondary">
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.results.empty')}
        </Typography>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {/* Toolbar */}
      <div className={classes.toolbarContainer}>
        <Typography variant="body2">
          {pmtHouseholdsTotalCount > 0
            ? `${pmtHouseholdsTotalCount} ${formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.groupCode')}`
            : formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults')}
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<GetAppIcon />}
          onClick={handleExportPdf}
          disabled={!pmtHouseholds || pmtHouseholds.length === 0 || fetchingPmtHouseholds}
          className={classes.exportButton}
        >
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.downloadPdf')}
        </Button>
      </div>

      {/* Filter */}
      <div className={classes.filterContainer}>
        <PmtHouseholdFilter
          filters={filters}
          onChangeFilters={handleFilterChange}
          disabled={fetchingPmtHouseholds}
        />
      </div>

      {/* Error Message */}
      {errorPmtHouseholds && (
        <div className={classes.errorContainer}>
          {typeof errorPmtHouseholds === 'string'
            ? errorPmtHouseholds
            : formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.error')}
        </div>
      )}

      {/* Loading */}
      {fetchingPmtHouseholds && (
        <div className={classes.loadingBox}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 8 }}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.loading')}
          </Typography>
        </div>
      )}

      {/* Table */}
      {!fetchingPmtHouseholds && (
        <>
          <TableContainer component={Paper}>
            <Table stickyHeader className={`${classes.table} ${classes.tealHead}`}>
              <TableHead className={classes.header}>
                <TableRow className={classes.headerTitle}>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.groupCode')}</TableCell>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.headName')}</TableCell>
                  <TableCell align="right">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.pmtScore')}</TableCell>
                  <TableCell align="center">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.status')}</TableCell>
                  <TableCell align="center">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.numberOfMembers')}</TableCell>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.location')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pmtHouseholds && pmtHouseholds.length > 0 ? (
                  pmtHouseholds.map((household) => (
                    <TableRow key={household.groupUuid} hover>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {household.groupCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {household.headName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" className={classes.scoreCell}>
                        <Tooltip title={`Score: ${household.pmtScore?.toFixed(3)}`}>
                          <Typography variant="body2" component="div">
                            {household.pmtScore !== undefined && household.pmtScore !== null
                              ? household.pmtScore.toFixed(3)
                              : '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusChip(household.pmtClass)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {household.numberOfMembers || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {household.locationName || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="textSecondary">
                        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pmtHouseholdsTotalCount > pageSize && (
            <TablePagination
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              component="div"
              count={pmtHouseholdsTotalCount}
              rowsPerPage={pageSize}
              page={Math.floor(offset / pageSize)}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  pmtHouseholds: state.individual.pmtHouseholds,
  fetchingPmtHouseholds: state.individual.fetchingPmtHouseholds,
  errorPmtHouseholds: state.individual.errorPmtHouseholds,
  pmtHouseholdsPageInfo: state.individual.pmtHouseholdsPageInfo,
  pmtHouseholdsTotalCount: state.individual.pmtHouseholdsTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPmtHouseholds,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withModulesManager(injectIntl(withTheme(withStyles(styles)(PmtHouseholdSearcher)))));
