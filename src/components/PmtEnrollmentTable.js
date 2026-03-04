import React, { useMemo } from 'react';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, CircularProgress, Typography, Chip, Tooltip, Button, FormControl, Select, MenuItem,
} from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';

import { PMT_CLASS, INDIVIDUAL_MODULE_NAME } from '../constants';

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

    // Table header styling
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

    // Cell styling
    scoreCell: {
      fontFamily: 'monospace',
      textAlign: 'right',
      paddingRight: theme.spacing(2),
    },
  };
};

function PmtEnrollmentTable({
  classes,
  intl,
  households,
  pageInfo,
  totalCount,
  loading,
  currentOffset,
  currentPageSize,
  onPageChange,
}) {
  // Calculate pagination state
  const hasNext = pageInfo?.hasNext === true;
  const hasPrev = currentOffset > 0;

  const rangeText = useMemo(() => {
    const total = totalCount ?? 0;
    const shown = Array.isArray(households) ? households.length : 0;
    if (!total && !shown) return "";
    return `Showing ${shown} of ${total}`;
  }, [totalCount, households]);

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

  const handleNext = () => {
    if (!hasNext) return;
    const newOffset = currentOffset + currentPageSize;
    if (onPageChange) {
      onPageChange(newOffset, currentPageSize);
    }
  };

  const handlePrev = () => {
    if (!hasPrev) return;
    const newOffset = Math.max(0, currentOffset - currentPageSize);
    if (onPageChange) {
      onPageChange(newOffset, currentPageSize);
    }
  };

  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    if (onPageChange) {
      onPageChange(0, newSize);
    }
  };

  return (
    <div className={classes.container}>
      {loading && (
        <div className={classes.loadingBox}>
          <CircularProgress />
          <Typography variant="body2" style={{ marginTop: 8 }}>
            {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.message.loading')}
          </Typography>
        </div>
      )}

      {!loading && (
        <>
          <TableContainer component={Paper}>
            <Table stickyHeader className={`${classes.table} ${classes.tealHead}`}>
              <TableHead className={classes.header}>
                <TableRow className={classes.headerTitle}>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.groupCode')}</TableCell>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.headName')}</TableCell>
                  <TableCell>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.location')}</TableCell>
                  <TableCell align="right">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.pmtScore')}</TableCell>
                  <TableCell align="center">{formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.household.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {households && households.length > 0 ? (
                  households.map((household) => (
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
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {household.locationName || '-'}
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
                  <Select value={currentPageSize} onChange={handlePageSizeChange}>
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
                  disabled={!hasPrev || loading}
                >
                  Prev
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleNext}
                  disabled={!hasNext || loading}
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

export default withStyles(styles)(injectIntl(PmtEnrollmentTable));
