import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Checkbox,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { injectIntl } from 'react-intl';
import { Autocomplete, ProgressOrError, formatMessage } from '@openimis/fe-core';
import { INDIVIDUAL_MODULE_NAME } from '../../constants';

const useStyles = makeStyles((theme) => ({
  item: theme.paper.item,
  footer: {
    marginInline: 16,
    marginBlock: 12,
  },
  headerTitle: theme.table.title,
  actionCell: {
    width: 60,
  },
  header: theme.table.header,
}));

const BASIC_FIELDS = [
  { id: 'first_name', name: 'first_name' },
  { id: 'last_name', name: 'last_name' },
  { id: 'dob', name: 'dob' },
];

/**
 * Individual Field Picker Component
 * Autocomplete for selecting deduplication fields
 */
function IndividualFieldPicker({
  value,
  onChange,
  readOnly,
  required,
  placeholder,
  withLabel,
  withPlaceholder,
  label,
}) {
  const [searchString, setSearchString] = useState('');

  return (
    <Autocomplete
      multiple
      required={required}
      placeholder={placeholder || 'Select fields to match on'}
      label={label || 'Duplicate Detection Field Selection'}
      error={[]}
      withLabel={withLabel}
      withPlaceholder={withPlaceholder}
      readOnly={readOnly}
      options={BASIC_FIELDS}
      isLoading={false}
      value={value}
      getOptionLabel={(o) => o?.name}
      onChange={onChange}
      onInputChange={() => setSearchString(searchString)}
    />
  );
}

/**
 * Individual Deduplication Summary Table
 */
function IndividualDeduplicationSummaryTable({
  selectedValues,
  setSummary,
}) {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  const getCookie = (name) => {
    let cookieValue = '';
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === `${name}=`) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const executeGraphQLQuery = async (query, variables = {}) => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    return result.data;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedValues || selectedValues.length === 0) {
        setData([]);
        setSummary([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const columns = selectedValues.map((v) => v.id);
        const query = `
          query IndividualDeduplicationSummary($columns: [String!]!) {
            individualDeduplicationSummary(columns: $columns)
          }
        `;

        const result = await executeGraphQLQuery(query, { columns });
        const summaryStr = result.individualDeduplicationSummary;

        if (summaryStr) {
          const summary = typeof summaryStr === 'string' ? JSON.parse(summaryStr) : summaryStr;
          const rows = summary.rows || [];
          setData(rows);
          setSummary(rows);
        }
      } catch (err) {
        setError(err.message);
        setData([]);
        setSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedValues, setSummary]);

  const reshapeColumnValues = (input) => {
    const columnValues = typeof input === 'string' ? JSON.parse(input) : input;
    const formattedValues = Object.entries(columnValues).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const formattedValue = value !== null ? value : 'null';
      return `${formattedKey}: ${formattedValue}`;
    });
    return formattedValues.join(', ');
  };

  return (
    <>
      <ProgressOrError progress={loading} error={error} />
      {!loading && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead className={classes.header}>
              <TableRow className={classes.headerTitle}>
                <TableCell>Group</TableCell>
                <TableCell>Duplicates</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.ids[0]}>
                  <TableCell>{reshapeColumnValues(row.column_values)}</TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

/**
 * Individual Deduplication Summary Dialog (Step 2)
 */
function IndividualDeduplicationSummaryDialog({
  open,
  onClose,
  summary,
  onMergeComplete,
}) {
  const [primarySelected, setPrimarySelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCookie = (name) => {
    let cookieValue = '';
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i += 1) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === `${name}=`) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  const executeGraphQLQuery = async (query, variables = {}) => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    return result.data;
  };

  const handleCreateTasks = async () => {
    if (!summary || summary.length === 0) {
      setError('No duplicate groups to create tasks for');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summaryData = summary.map((group) => ({
        ...group,
        primary_id: primarySelected && group.ids.includes(primarySelected) ? primarySelected : group.ids[0],
      }));

      const mutation = `
        mutation CreateIndividualDeduplicationReview($summary: [JSONString!]!) {
          createIndividualDeduplicationReview(summary: $summary) {
            ok
            errors
          }
        }
      `;

      const result = await executeGraphQLQuery(mutation, {
        summary: summaryData.map((item) => JSON.stringify(item)),
      });

      if (result.createIndividualDeduplicationReview.ok) {
        onMergeComplete?.();
        onClose();
      } else {
        const errors = result.createIndividualDeduplicationReview.errors || [];
        setError(errors.join(', ') || 'Failed to create task');
      }
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          width: 900,
          maxWidth: 900,
        },
      }}
    >
      <DialogTitle style={{ marginTop: '10px' }}>
        Deduplication Summary
      </DialogTitle>

      <DialogContent>
        {error && (
          <Typography color="error" style={{ marginBottom: 16 }}>
            {error}
          </Typography>
        )}

        {summary && summary.length > 0 && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell padding="checkbox" width="60">
                    Select Primary
                  </TableCell>
                  <TableCell width="80">Group</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((group) => (
                  <TableRow key={group.ids.join('-')} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={primarySelected === group.ids[0]}
                        onChange={() => setPrimarySelected(group.ids[0])}
                        disabled={loading}
                      />
                    </TableCell>
                    <TableCell>{group.count}</TableCell>
                    <TableCell>
                      <div>
                        {Object.entries(group.column_values || {}).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: 4 }}>
                            <strong>
                              {key}
                              :
                            </strong>
                            {' '}
                            {String(value || '(empty)')}
                          </div>
                        ))}
                      </div>
                      <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: 'block' }}>
                        IDs:
                        {' '}
                        {group.ids.join(', ')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions
        style={{
          display: 'inline',
          paddingLeft: '10px',
          marginTop: '25px',
          marginBottom: '15px',
        }}
      >
        <div>
          <div style={{ float: 'left' }}>
            <Button
              onClick={handleCreateTasks}
              variant="outlined"
              autoFocus
              disabled={!summary || loading}
              style={{ margin: '0 16px' }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} style={{ marginRight: 8 }} />
                  Creating...
                </>
              ) : (
                'Create Deduplication Review Tasks'
              )}
            </Button>
          </div>
          <div style={{ float: 'right', paddingRight: '16px' }}>
            <Button
              onClick={onClose}
              variant="outlined"
              autoFocus
              style={{ margin: '0 16px' }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Individual Field Selection Dialog (Step 1)
 */
function IndividualDeduplicationDialog({
  intl,
  open,
  onClose,
  onMergeComplete,
}) {
  const [selectedValues, setSelectedValues] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const handlePickerChange = (selectedOptions) => {
    setSelectedValues(selectedOptions || []);
  };

  const handleShowSummary = () => {
    if (selectedValues.length === 0) {
      return;
    }
    setShowSummaryDialog(true);
  };

  const handleSummaryClose = () => {
    setShowSummaryDialog(false);
  };

  const handleMergeComplete = () => {
    setShowSummaryDialog(false);
    onClose();
    onMergeComplete?.();
  };

  return (
    <>
      <Dialog
        open={open && !showSummaryDialog}
        onClose={onClose}
        PaperProps={{
          style: {
            width: 900,
            maxWidth: 900,
          },
        }}
      >
        <DialogTitle style={{ marginTop: '10px' }}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.deduplication.title')}
        </DialogTitle>

        <DialogContent>
          <IndividualFieldPicker
            required
            value={selectedValues}
            onChange={handlePickerChange}
            withLabel
            withPlaceholder
          />
          <div style={{ marginTop: 20 }}>
            {selectedValues.length > 0 && (
              <IndividualDeduplicationSummaryTable
                columnParam={JSON.stringify(selectedValues.map((v) => v.id))}
                selectedValues={selectedValues}
                setSummary={setSummary}
              />
            )}
          </div>
        </DialogContent>

        <DialogActions
          style={{
            display: 'inline',
            paddingLeft: '10px',
            marginTop: '25px',
            marginBottom: '15px',
          }}
        >
          <div>
            <div style={{ float: 'left' }}>
              <Button
                onClick={handleShowSummary}
                variant="outlined"
                autoFocus
                disabled={!selectedValues.length}
                style={{ margin: '0 16px' }}
              >
                Show Duplicate Summary
              </Button>
            </div>
            <div style={{ float: 'right', paddingRight: '16px' }}>
              <Button
                onClick={onClose}
                variant="outlined"
                autoFocus
                style={{ margin: '0 16px' }}
              >
                {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'dialog.cancel')}
              </Button>
            </div>
          </div>
        </DialogActions>
      </Dialog>

      {/* Summary Dialog */}
      {showSummaryDialog && (
        <IndividualDeduplicationSummaryDialog
          open={showSummaryDialog}
          onClose={handleSummaryClose}
          summary={summary}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </>
  );
}

export default injectIntl(IndividualDeduplicationDialog);
