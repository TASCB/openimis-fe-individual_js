import React, { useState } from 'react';
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
import {
  Autocomplete,
  ProgressOrError,
  apiHeaders,
  baseApiUrl,
  formatMessage,
} from '@openimis/fe-core';
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
  { id: 'location__name', name: 'location' },
];

const FIELD_ALIASES = {
  firstName: 'first_name',
  'individual.firstName': 'first_name',
  individual_firstName: 'first_name',
  'Individual First Name': 'first_name',
  'First Name': 'first_name',
  firstname: 'first_name',
  lastName: 'last_name',
  'individual.lastName': 'last_name',
  individual_lastName: 'last_name',
  'Individual Last Name': 'last_name',
  'Last Name': 'last_name',
  lastname: 'last_name',
  dateOfBirth: 'dob',
  birthDate: 'dob',
  'individual.dob': 'dob',
  'Date Of Birth': 'dob',
  'Date of Birth': 'dob',
  'Birth Date': 'dob',
  location: 'location__name',
  Location: 'location__name',
  village: 'location__name',
  Village: 'location__name',
};

const normalizeSelectedField = (value) => {
  const field = typeof value === 'string' ? value : value?.id || value?.name || value?.label;
  const canonicalField = String(field || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['firstname', 'individualfirstname'].includes(canonicalField)) {
    return 'first_name';
  }
  if (['lastname', 'individuallastname'].includes(canonicalField)) {
    return 'last_name';
  }
  if (['dob', 'dateofbirth', 'birthdate', 'individualdob'].includes(canonicalField)) {
    return 'dob';
  }
  if (['location', 'locationname', 'village', 'villagename'].includes(canonicalField)) {
    return 'location__name';
  }
  return FIELD_ALIASES[field] || field;
};

const executeGraphQLQuery = async (query, variables = {}) => {
  const response = await fetch(`${baseApiUrl}/graphql`, {
    method: 'POST',
    headers: apiHeaders(),
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

const parseColumnValues = (input) => {
  if (!input) {
    return {};
  }
  if (typeof input === 'string') {
    return JSON.parse(input);
  }
  return input;
};

const formatColumnLabel = (key) => String(key)
  .replace(/__/g, ' ')
  .replace(/_/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, (c) => c.toUpperCase());

const fetchDeduplicationRows = async (selectedValues) => {
  const columns = selectedValues
    .map(normalizeSelectedField)
    .filter(Boolean);

  if (!columns.length) {
    return [];
  }

  const query = `
    query IndividualDeduplicationSummary($columns: [String!]!) {
      individualDeduplicationSummary(columns: $columns) {
        rows {
          count
          ids
          columnValues
        }
      }
    }
  `;

  const result = await executeGraphQLQuery(query, { columns });
  return result.individualDeduplicationSummary?.rows || [];
};

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
  data,
  loading,
  error,
  hasScanned,
}) {
  const classes = useStyles();

  const reshapeColumnValues = (input) => {
    const columnValues = parseColumnValues(input);
    const formattedValues = Object.entries(columnValues).map(([key, value]) => {
      const formattedKey = formatColumnLabel(key);
      const formattedValue = value !== null ? value : 'null';
      return `${formattedKey}: ${formattedValue}`;
    });
    return formattedValues.join(', ');
  };

  return (
    <>
      <ProgressOrError progress={loading} error={error} />
      {!loading && hasScanned && !error && data.length === 0 && (
        <Typography color="textSecondary">
          No duplicate groups found for the selected fields.
        </Typography>
      )}
      {!loading && !error && data.length > 0 && (
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
                  <TableCell>{reshapeColumnValues(row.columnValues || row.column_values)}</TableCell>
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

  const handleCreateTasks = async () => {
    if (!summary || summary.length === 0) {
      setError('No duplicate groups to create tasks for');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summaryData = summary.map((group) => {
        const columnValues = parseColumnValues(group.columnValues || group.column_values);
        return {
          count: group.count,
          ids: group.ids,
          column_values: columnValues,
          primary_id: primarySelected && group.ids.includes(primarySelected) ? primarySelected : group.ids[0],
        };
      });

      // createIndividualDeduplicationReview is an OpenIMISMutation (relay
      // ClientIDMutation), so every argument has to be wrapped in `input: {...}`.
      // Passing `summary` as a top-level arg fails GraphQL validation -> HTTP 400
      // and no task gets created.
      const mutation = `
        mutation CreateIndividualDeduplicationReview($summary: [JSONString]!) {
          createIndividualDeduplicationReview(input: { summary: $summary }) {
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
                        {Object.entries(
                          parseColumnValues(group.columnValues || group.column_values),
                        ).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: 4 }}>
                            <strong>
                              {formatColumnLabel(key)}
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
              disabled={!summary || summary.length === 0 || loading}
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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [scannedFields, setScannedFields] = useState([]);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const scanForDuplicates = async (values = selectedValues) => {
    const normalizedValues = Array.isArray(values) ? values : [values].filter(Boolean);

    if (!normalizedValues.length) {
      setSummary([]);
      return [];
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setHasScanned(false);
    setScannedFields(normalizedValues.map(normalizeSelectedField).filter(Boolean));

    try {
      const rows = await fetchDeduplicationRows(normalizedValues);
      setSummary(rows);
      setHasScanned(true);
      return rows;
    } catch (err) {
      setSummary([]);
      setSummaryError(err.message);
      setHasScanned(true);
      return [];
    } finally {
      setSummaryLoading(false);
    }
  };

  const handlePickerChange = (selectedOptions) => {
    const values = Array.isArray(selectedOptions)
      ? selectedOptions
      : [selectedOptions].filter(Boolean);
    setSelectedValues(values);
    setSummary([]);
    setSummaryError(null);
    setHasScanned(false);
    setScannedFields([]);
  };

  const handleShowSummary = async () => {
    if (selectedValues.length === 0) {
      return;
    }

    const rows = await scanForDuplicates();
    if (rows.length > 0) {
      setShowSummaryDialog(true);
    }
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
            {scannedFields.length > 0 && (
              <Typography variant="caption" color="textSecondary">
                Scanned fields:
                {' '}
                {scannedFields.join(', ')}
              </Typography>
            )}
            {selectedValues.length > 0 && (
              <IndividualDeduplicationSummaryTable
                data={summary}
                loading={summaryLoading}
                error={hasScanned ? summaryError : null}
                hasScanned={hasScanned}
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
                disabled={!selectedValues.length || summaryLoading}
                style={{ margin: '0 16px' }}
              >
                {summaryLoading ? 'Scanning...' : `Show Duplicate Summary${hasScanned ? ` (${summary.length})` : ''}`}
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
