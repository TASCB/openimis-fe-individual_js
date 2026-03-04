import React, { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Button, CircularProgress, Typography, FormControl, Select, MenuItem,
} from '@material-ui/core';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { formatMessage, withModulesManager } from '@openimis/fe-core';
import { injectIntl } from 'react-intl';

import { fetchPmtAuditSummary } from '../actions';
import { INDIVIDUAL_MODULE_NAME } from '../constants';

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

    // Action button styling
    actionButton: {
      marginRight: theme.spacing(1),
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

    // Centered text
    centeredCell: {
      textAlign: 'right',
    },
  };
};

function PmtAuditSummaryTable({
  classes,
  modulesManager,
  intl,
  onViewDistrict,
  // Redux
  pmtAuditSummary,
  fetchingPmtAuditSummary,
  errorPmtAuditSummary,
  pmtAuditSummaryPageInfo,
  pmtAuditSummaryTotalCount,
  // Actions
  fetchPmtAuditSummary: fetchPmtAuditSummaryAction,
}) {
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);

  // Calculate pagination state
  const hasNext = pmtAuditSummaryPageInfo?.hasNext === true;
  const hasPrev = offset > 0;

  const rangeText = useMemo(() => {
    const total = pmtAuditSummaryTotalCount ?? 0;
    const shown = Array.isArray(pmtAuditSummary) ? pmtAuditSummary.length : 0;
    if (!total && !shown) return "";
    return `Showing ${shown} of ${total}`;
  }, [pmtAuditSummaryTotalCount, pmtAuditSummary]);

  // Initial fetch on component mount
  React.useEffect(() => {
    if (!pmtAuditSummary || pmtAuditSummary.length === 0) {
      fetchPmtAuditSummaryAction(modulesManager, { offset: 0, limit: pageSize });
    }
  }, []);

  const handleNext = () => {
    if (!hasNext) return;
    const newOffset = offset + pageSize;
    setOffset(newOffset);
    fetchPmtAuditSummaryAction(modulesManager, { offset: newOffset, limit: pageSize });
  };

  const handlePrev = () => {
    if (!hasPrev) return;
    const newOffset = Math.max(0, offset - pageSize);
    setOffset(newOffset);
    fetchPmtAuditSummaryAction(modulesManager, { offset: newOffset, limit: pageSize });
  };

  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setPageSize(newSize);
    setOffset(0);
    fetchPmtAuditSummaryAction(modulesManager, { offset: 0, limit: newSize });
  };

  const handleViewClick = (district) => {
    if (onViewDistrict) {
      onViewDistrict(district.districtCode, district.pmtCutoff);
    }
  };

  return (
    <div className={classes.container}>
      {/* Error Message */}
      {errorPmtAuditSummary && (
        <div className={classes.errorContainer}>
          {typeof errorPmtAuditSummary === 'string'
            ? errorPmtAuditSummary
            : formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.error')}
        </div>
      )}

      {/* Loading State */}
      {fetchingPmtAuditSummary && (
        <div className={classes.loadingBox}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 8 }}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.loading')}
          </Typography>
        </div>
      )}

      {/* Table */}
      {!fetchingPmtAuditSummary && (
        <>
          <TableContainer component={Paper}>
            <Table stickyHeader className={`${classes.table} ${classes.tealHead}`}>
              <TableHead className={classes.header}>
                <TableRow className={classes.headerTitle}>
                  <TableCell>
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.paaName')}
                  </TableCell>
                  <TableCell align="right">
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.cutoff')}
                  </TableCell>
                  <TableCell align="right">
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.poor')}
                  </TableCell>
                  <TableCell align="right">
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.nonPoor')}
                  </TableCell>
                  <TableCell align="center">
                    {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.auditSummary.action')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pmtAuditSummary && pmtAuditSummary.length > 0 ? (
                  pmtAuditSummary.map((district) => (
                    <TableRow key={district.districtCode} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {district.districtName || district.districtCode || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {district.pmtCutoff?.toFixed(2) || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {district.poorCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {district.nonPoorCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => handleViewClick(district)}
                          className={classes.actionButton}
                        >
                          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="textSecondary">
                        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.noResults')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          <Paper style={{ marginTop: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
              }}
            >
              <Typography variant="body2" color="textSecondary">
                {rangeText}
              </Typography>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <FormControl size="small" style={{ minWidth: 90 }}>
                  <Select value={pageSize} onChange={handlePageSizeChange}>
                    {[5, 10, 20, 50].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  onClick={handlePrev}
                  disabled={!hasPrev || fetchingPmtAuditSummary}
                >
                  Prev
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleNext}
                  disabled={!hasNext || fetchingPmtAuditSummary}
                >
                  Next
                </Button>
              </div>
            </div>
          </Paper>
        </>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  pmtAuditSummary: state.individual.pmtAuditSummary,
  fetchingPmtAuditSummary: state.individual.fetchingPmtAuditSummary,
  errorPmtAuditSummary: state.individual.errorPmtAuditSummary,
  pmtAuditSummaryPageInfo: state.individual.pmtAuditSummaryPageInfo,
  pmtAuditSummaryTotalCount: state.individual.pmtAuditSummaryTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchPmtAuditSummary,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withModulesManager(injectIntl(withTheme(withStyles(styles)(PmtAuditSummaryTable)))));
