import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

// Material-UI v4 (grouped)
import {
  Paper,
  Grid,
  Typography,
  Button,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';

// Dialogs (direct paths for MUI v4)
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

// openIMIS core
import {
  Helmet,
  PublishedComponent,
  withModulesManager,
  journalize,
  formatMessage,
  ProgressOrError,
} from '@openimis/fe-core';
import { injectIntl } from 'react-intl';

import {
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
} from '../actions';

const styles = (theme) => {
  const headerBG = theme?.table?.header?.backgroundColor
    ?? (theme.palette?.action?.hover || '#e0f2f1');
  const headerColor = theme?.table?.header?.color ?? theme.palette?.text?.primary;
  const bodyBG = theme?.table?.backgroundColor
    ?? theme?.paper?.background
    ?? theme.palette?.background?.paper;

  return {
    page: theme.page,
    paper: { ...theme.paper, padding: theme.spacing(2) },
    headerBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(1),
    },
    sectionTitle: { fontWeight: 600 },
    formRow: { marginTop: theme.spacing(1) },
    actionsRow: { display: 'flex', alignItems: 'flex-end' },
    tablePaper: { ...theme.paper, padding: 0, overflow: 'hidden' },
    tableHeaderBar: { padding: theme.spacing(2) },
    tableWrapper: { padding: theme.spacing(2), paddingTop: 0 },
    loadingBox: { textAlign: 'center', padding: theme.spacing(3) },
    helperText: { color: theme.palette.text.secondary },

    /** table header styles (used by TableHead/TableRow) */
    header: theme.table?.header,
    headerTitle: theme.table?.title,

    /**
     * override the header background for BOTH normal & sticky headers.
     * We use a high-specificity selector.
     */
    tealHead: {
      '& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-root':
        {
          backgroundColor: `${headerBG} !important`,
          color: `${headerColor} !important`,
          fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
        },
      '& thead.MuiTableHead-root > tr.MuiTableRow-root > th.MuiTableCell-stickyHeader':
        {
          backgroundColor: `${headerBG} !important`,
          color: `${headerColor} !important`,
          fontWeight: `${theme?.table?.title?.fontWeight ?? 700} !important`,
        },
    },

    /** Match table body background to the section/paper */
    tableContainerBg: {
      backgroundColor: bodyBG,
    },
  };
};

const API_WORKFLOW_HEADERS = [
  'ImportPageAPI.apiSelection',
  'ImportPageAPI.triggerImport',
];

function ImportDataApiPage({
  intl,
  classes,

  // state
  pulledQ,
  fetchingPulledQ,
  errorPulledQ,
  fetchedPulledQ,
  submittingMutation,
  mutation,
  mutations = [],
  fetchingApiEtlServices,
  apiEtlServices = [],
  submittingLegacyEtl,
  submittingPaaEtl,
  errorApiEtlServices,
  fetchingQuestionnaires,
  availableQuestionnaires = [],
  errorQuestionnaires,

  // actions
  fetchPulledQuestionnaires,
  confirmPullingDataFromApiEtl,
  fetchApiEtlServices,
  fetchMutationByLabel,
  fetchAvailableQuestionnaires,
}) {
  // Questionnaire selection for PAA-based import
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [questionnaireSearchTerm, setQuestionnaireSearchTerm] = useState('');
  // ---- Region/District (ETL control)
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  // Advanced options
  const [manualQuestionnaireId, setManualQuestionnaireId] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // API services confirm dialog
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [serviceToPullData, setServiceToPullData] = useState(null);

  // PAA Import confirm dialog
  const [openPAAConfirmDialog, setOpenPAAConfirmDialog] = useState(false);

  // lock UI while any ETL/mutation is running
  const isSubmitting = submittingLegacyEtl || submittingPaaEtl || submittingMutation;

  // Initial loads
  useEffect(() => {
    if (!fetchedPulledQ && !fetchingPulledQ) {
      fetchPulledQuestionnaires();
    }
    fetchApiEtlServices();
    // fetchMutationByLabel(
    //   formatMessage(intl, "individual", "ImportPageAPI.confirmPullingData")
    // );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch history when filters change
  useEffect(() => {
    if (selectedRegion || selectedDistrict) {
      fetchPulledQuestionnaires(
        selectedRegion?.code || null,
        selectedDistrict?.code || null,
      );
    }
  }, [selectedRegion, selectedDistrict, fetchPulledQuestionnaires]);

  // Refresh history after successful PAA import
  useEffect(() => {
    if (mutation?.clientMutationId && !submittingMutation && !mutation?.error) {
      fetchPulledQuestionnaires(
        selectedRegion?.code || null,
        selectedDistrict?.code || null,
      );
    }
  }, [
    mutation,
    submittingMutation,
    fetchPulledQuestionnaires,
    selectedRegion,
    selectedDistrict,
  ]);

  // Keep mutation-by-label in sync (used for disabling API “Send” button)
  useEffect(() => {
    fetchMutationByLabel(
      formatMessage(intl, 'individual', 'ImportPageAPI.confirmPullingData'),
    );
  }, [serviceToPullData, fetchMutationByLabel, intl]);

  // Fetch questionnaires when district is selected
  useEffect(() => {
    if (selectedDistrict && selectedRegion) {
      fetchAvailableQuestionnaires(
        selectedDistrict.code,
        selectedRegion.code,
        selectedDistrict.name,
        false, // showAll = false (only show matching questionnaires)
      );
      // Reset selections when district changes
      setSelectedQuestionnaire(null);
      setQuestionnaireSearchTerm('');
    }
  }, [selectedDistrict, selectedRegion, fetchAvailableQuestionnaires]);

  // Auto-refresh pulled questionnaires every 5 seconds if any import is running
  useEffect(() => {
    const hasRunningImports = pulledQ && pulledQ.some((item) => item.status === 'running');

    if (!hasRunningImports) {
      return; // No polling needed
    }

    // Poll every 5 seconds
    const intervalId = setInterval(() => {
      fetchPulledQuestionnaires(
        selectedRegion?.code || null,
        selectedDistrict?.code || null,
      );
    }, 5000); // 5 seconds

    // Cleanup on unmount or when no more running imports
    return () => clearInterval(intervalId);
  }, [
    pulledQ,
    selectedRegion,
    selectedDistrict,
    fetchPulledQuestionnaires,
  ]);

  // --- Handlers (ETL PAA)
  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setSelectedDistrict(null);
  };
  const handleDistrictChange = (district) => setSelectedDistrict(district);

  const handleTriggerPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;

    // Open confirmation dialog instead of directly executing
    setOpenPAAConfirmDialog(true);
  };

  // Handler for confirmed PAA import
  const handleConfirmPAAImport = () => {
    if (!selectedRegion || !selectedDistrict) return;

    // Guard: don't allow double submit
    if (submittingLegacyEtl || submittingPaaEtl || submittingMutation) {
      console.warn('ETL already in progress, ignoring duplicate request');
      return;
    }

    const params = {
      paaName: selectedDistrict.name,
      regionCode: selectedRegion.code,
      districtCode: selectedDistrict.code,
      dryRun,
    };

    // Pass selected questionnaire if chosen
    if (selectedQuestionnaire) {
      params.questionnaireId = selectedQuestionnaire;
    } else if (manualQuestionnaireId.trim()) {
      // Fallback to manual entry
      params.questionnaireId = manualQuestionnaireId.trim();
    }
    // If neither, backend will auto-detect (existing behavior)

    const mutationLabel = `paa_etl_${selectedDistrict.code}_${Date.now()}`;
    confirmPullingDataFromApiEtl(
      'SurveySolutionService',
      mutationLabel,
      params,
    );

    // Close dialog
    setOpenPAAConfirmDialog(false);
  };
  const canTriggerPAAImport = !!selectedRegion && !!selectedDistrict && !submittingMutation;

  // --- Handlers (API services)
  const openServiceConfirm = (etlService) => {
    setServiceToPullData(etlService);
    setOpenConfirmDialog(true);
  };
  const handleConfirmServicePull = () => {
    if (!serviceToPullData) return;

    // Guard: don’t allow double submit
    if (submittingLegacyEtl || submittingPaaEtl) {
      console.warn('ETL already in progress, ignoring duplicate request');
      return;
    }

    const label = `etl_${serviceToPullData}_${Date.now()}`;
    confirmPullingDataFromApiEtl(serviceToPullData, label);

    setOpenConfirmDialog(false);
    setServiceToPullData(null);
  };

  // Helper: safe error to text
  const formatErr = (err) => {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };
  // Helper: render status badge with color
  const renderStatusBadge = (status, errorMessage) => {
    const statusConfig = {
      running: {
        color: '#2196f3', // Blue
        bgcolor: '#e3f2fd',
        icon: <CircularProgress size={16} style={{ marginRight: 4 }} />,
        label: formatMessage(intl, 'individual', 'ImportDataApiPage.status.running'),
      },
      completed: {
        color: '#4caf50', // Green
        bgcolor: '#e8f5e9',
        icon: '✓',
        label: formatMessage(intl, 'individual', 'ImportDataApiPage.status.completed'),
      },
      failed: {
        color: '#f44336', // Red
        bgcolor: '#ffebee',
        icon: '✗',
        label: formatMessage(intl, 'individual', 'ImportDataApiPage.status.failed'),
      },
      cancelled: {
        color: '#9e9e9e', // Gray
        bgcolor: '#f5f5f5',
        icon: '⊘',
        label: formatMessage(intl, 'individual', 'ImportDataApiPage.status.cancelled'),
      },
    };

    const config = statusConfig[status] || statusConfig.completed;

    return (
      <Tooltip
        title={
          status === 'failed' && errorMessage
            ? errorMessage
            : config.label
        }
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 500,
            backgroundColor: config.bgcolor,
            color: config.color,
          }}
        >
          {typeof config.icon === 'string' ? (
            <span style={{ marginRight: 4 }}>{config.icon}</span>
          ) : (
            config.icon
          )}
          {config.label}
        </span>
      </Tooltip>
    );
  };
  return (
    <>
      <Helmet
        title={formatMessage(intl, 'individual', 'ImportDataApiPage.title')}
      />
      <div className={classes.page}>
        <Grid container spacing={2}>
          {/* ====== SECTION 1: API Services (Send button first) ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    'individual',
                    'ImportPageAPI.ImportPage',
                  )}
                </Typography>
              </div>

              <TableContainer
                component={Paper}
                elevation={0}
                className={classes.tableContainerBg}
              >
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      {API_WORKFLOW_HEADERS.map((h) => (
                        <TableCell key={h}>
                          {formatMessage(intl, 'individual', h)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        style={{ paddingTop: 0, paddingBottom: 0 }}
                      >
                        <ProgressOrError
                          progress={fetchingApiEtlServices}
                          error={errorApiEtlServices}
                        />
                      </TableCell>
                    </TableRow>

                    {apiEtlServices.map((etl) => (
                      <TableRow key={etl.nameOfService}>
                        <TableCell>{etl.nameOfService}</TableCell>
                        <TableCell>
                          <Tooltip
                            title={formatMessage(
                              intl,
                              'individual',
                              'ImportPageAPI.triggerImport',
                            )}
                          >
                            <span>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => openServiceConfirm(etl.nameOfService)}
                                disabled={
                                  Array.isArray(mutations)
                                  && mutations.length > 0
                                }
                              >
                                {formatMessage(
                                  intl,
                                  'individual',
                                  'ImportPageAPI.triggerImport',
                                )}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {(!apiEtlServices || apiEtlServices.length === 0)
                      && !fetchingApiEtlServices
                      && !errorApiEtlServices && (
                        <TableRow>
                          <TableCell colSpan={2}>
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              align="center"
                              style={{ padding: 16 }}
                            >
                              {formatMessage(
                                intl,
                                'individual',
                                'ImportDataApiPage.noHistoryData',
                              )}
                            </Typography>
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>


          {/* ====== SECTION 2: PAA-Based Import with Questionnaire Selection ====== */}
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <div className={classes.headerBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    'individual',
                    'ImportDataApiPage.importControls.title',
                  )}
                </Typography>
              </div>

              <Divider />

              {/* Region and District Pickers */}
              <Grid container spacing={3} className={classes.formRow}>
                {/* Region Picker */}
                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(region) => {
                      setSelectedRegion(region);
                      setSelectedDistrict(null); // Reset district when region changes
                      setSelectedQuestionnaire(null); // Reset questionnaire
                    }}
                    value={selectedRegion}
                    locationLevel={0}
                    label={formatMessage(
                      intl,
                      'individual',
                      'ImportDataApiPage.region',
                    )}
                    required
                  />
                </Grid>

                {/* District Picker */}
                <Grid item xs={12} md={4}>
                  <PublishedComponent
                    pubRef="location.LocationPicker"
                    onChange={(district) => {
                      setSelectedDistrict(district);
                      setSelectedQuestionnaire(null); // Reset questionnaire when district changes
                    }}
                    value={selectedDistrict}
                    parentLocation={selectedRegion}
                    locationLevel={1}
                    label={formatMessage(
                      intl,
                      'individual',
                      'ImportDataApiPage.district',
                    )}
                    required
                  />
                </Grid>

                {/* Spacer for alignment */}
                <Grid item xs={12} md={4} />
              </Grid>

              {/* Questionnaire Selection Section */}
              {selectedDistrict && (
                <>
                  <Grid container spacing={3} className={classes.formRow}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" style={{ fontWeight: 500, marginTop: 16 }}>
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.selectQuestionnaire.title',
                        )}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.selectQuestionnaire.subtitle',
                        )}
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Questionnaire Dropdown */}
                  <Grid container spacing={3} className={classes.formRow}>
                    <Grid item xs={12} md={8}>
                      <FormControl fullWidth>
                        <InputLabel id="questionnaire-select-label">
                          {formatMessage(
                            intl,
                            'individual',
                            'ImportDataApiPage.questionnaire',
                          )}
                        </InputLabel>
                        <Select
                          labelId="questionnaire-select-label"
                          value={selectedQuestionnaire || ''}
                          onChange={(e) => setSelectedQuestionnaire(e.target.value)}
                          disabled={fetchingQuestionnaires}
                        >
                          <MenuItem value="">
                            <em>
                              {formatMessage(
                                intl,
                                'individual',
                                'ImportDataApiPage.questionnaire.autoDetect',
                              )}
                            </em>
                          </MenuItem>

                          {/* Filter questionnaires by search term */}
                          {availableQuestionnaires
                            .filter((q) => !questionnaireSearchTerm
                              || q.title.toLowerCase().includes(questionnaireSearchTerm.toLowerCase()))
                            .map((q) => (
                              <MenuItem key={q.identity} value={q.identity}>
                                <div style={{ width: '100%' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500 }}>
                                      {q.title}
                                    </span>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: q.matchingScore >= 2 ? '#4caf50' : '#ff9800',
                                      marginLeft: 8,
                                    }}
                                    >
                                      v
                                      {q.version}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#757575' }}>
                                    {q.identity}
                                    {q.matchingScore > 0 && (
                                      <span style={{ marginLeft: 8 }}>
                                        • Score:
                                        {' '}
                                        {q.matchingScore}
                                        /5 (
                                        {q.matchingStrategy}
                                        )
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </MenuItem>
                            ))}
                        </Select>

                        {/* Loading state */}
                        {fetchingQuestionnaires && (
                          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                            <CircularProgress size={16} style={{ marginRight: 8 }} />
                            <Typography variant="caption" color="textSecondary">
                              {formatMessage(
                                intl,
                                'individual',
                                'ImportDataApiPage.loadingQuestionnaires',
                              )}
                            </Typography>
                          </div>
                        )}

                        {/* Error state */}
                        {errorQuestionnaires && !fetchingQuestionnaires && (
                          <Typography variant="caption" color="error" style={{ marginTop: 8 }}>
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.errorLoadingQuestionnaires',
                            )}
                          </Typography>
                        )}

                        {/* No questionnaires found */}
                        {!fetchingQuestionnaires && availableQuestionnaires.length === 0 && (
                          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.noQuestionnairesFound',
                            )}
                          </Typography>
                        )}

                        {/* Helper text */}
                        {selectedQuestionnaire && (
                          <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.questionnaireSelected',
                            )}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>

                    {/* Search Box */}
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label={formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.searchQuestionnaires',
                        )}
                        value={questionnaireSearchTerm}
                        onChange={(e) => setQuestionnaireSearchTerm(e.target.value)}
                        placeholder={formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.searchQuestionnaires.placeholder',
                        )}
                        disabled={fetchingQuestionnaires || availableQuestionnaires.length === 0}
                      />
                    </Grid>
                  </Grid>
                </>
              )}

              {/* Trigger Import Button */}
              <Grid container spacing={3} className={classes.formRow}>
                <Grid item xs={12} md={4}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTriggerPAAImport}
                    disabled={
                      !selectedRegion
                      || !selectedDistrict
                      || (Array.isArray(mutations) && mutations.length > 0)
                    }
                    fullWidth
                    startIcon={
                      isSubmitting ? <CircularProgress size={20} /> : null
                    }
                  >
                    {isSubmitting
                      ? formatMessage(
                        intl,
                        'individual',
                        'ImportDataApiPage.importing',
                      )
                      : formatMessage(
                        intl,
                        'individual',
                        'ImportDataApiPage.triggerImport',
                      )}
                  </Button>
                </Grid>
              </Grid>

              {/* Advanced Options */}
              <Grid container spacing={2} className={classes.formRow}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={showAdvancedOptions}
                        onChange={(e) => setShowAdvancedOptions(e.target.checked)}
                        color="primary"
                      />
                    )}
                    label={formatMessage(
                      intl,
                      'individual',
                      'ImportDataApiPage.showAdvancedOptions',
                    )}
                  />
                </Grid>

                {showAdvancedOptions && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.manualQuestionnaireId',
                        )}
                        value={manualQuestionnaireId}
                        onChange={(e) => setManualQuestionnaireId(e.target.value)}
                        placeholder="GUID$version (e.g., 12345678-1234-1234-1234-123456789012$3)"
                        helperText={(
                          <span className={classes.helperText}>
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.manualQuestionnaireId.help',
                            )}
                          </span>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={(
                          <Checkbox
                            checked={dryRun}
                            onChange={(e) => setDryRun(e.target.checked)}
                            color="primary"
                          />
                        )}
                        label={formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.dryRun',
                        )}
                      />
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Mutation error */}
              {!!mutation?.error && (
                <Typography color="error" style={{ marginTop: 16 }}>
                  {formatMessage(intl, 'individual', 'ImportDataApiPage.error')}
                  :
                  {' '}
                  {mutation.error?.message || JSON.stringify(mutation.error)}
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* ====== SECTION 3: Pulled Questionnaires History ====== */}
          <Grid item xs={12}>
            <Paper className={classes.tablePaper}>
              <div className={classes.tableHeaderBar}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {formatMessage(
                    intl,
                    'individual',
                    'ImportDataApiPage.pulledQuestionnaires.title',
                  )}
                </Typography>
              </div>

              <TableContainer
                component={Paper}
                elevation={0}
                className={classes.tableContainerBg}
              >
                <Table size="small" stickyHeader className={classes.tealHead}>
                  <TableHead className={classes.header}>
                    <TableRow className={classes.headerTitle}>
                      <TableCell>
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.table.paaName',
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.table.numberOfHouseholds',
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.table.datePulled',
                        )}
                      </TableCell>
                      <TableCell>
                        {formatMessage(
                          intl,
                          'individual',
                          'ImportDataApiPage.table.status',
                        )}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <div className={classes.loadingBox}>
                            <CircularProgress />
                            <Typography
                              variant="body2"
                              style={{ marginTop: 8 }}
                            >
                              {formatMessage(
                                intl,
                                'individual',
                                'ImportDataApiPage.loadingHistory',
                              )}
                            </Typography>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {!!errorPulledQ && !fetchingPulledQ && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography color="error">
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.errorLoadingHistory',
                            )}
                            :
                            {' '}
                            {formatErr(errorPulledQ)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {!fetchingPulledQ
                      && Array.isArray(pulledQ)
                      && pulledQ.length > 0
                      && pulledQ.map((item, idx) => (
                        <TableRow key={`${item.paaName || 'row'}_${idx}`}>
                          <TableCell>{item.paaName}</TableCell>
                          <TableCell>{item.numberOfHouseholds || 0}</TableCell>
                          <TableCell>
                            {item.datePulled
                              ? new Date(item.datePulled).toLocaleDateString()
                              : ''}
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(item.status || 'completed', item.errorMessage)}
                          </TableCell>
                        </TableRow>
                      ))}

                    {!fetchingPulledQ && (!pulledQ || pulledQ.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            align="center"
                            style={{ padding: 20 }}
                          >
                            {formatMessage(
                              intl,
                              'individual',
                              'ImportDataApiPage.noHistoryData',
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </div>

      {/* Confirm dialog for API services trigger */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
      >
        <DialogTitle>
          {formatMessage(
            intl,
            'individual',
            'ImportPageAPI.confirmPullingData.title',
          )}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {formatMessage(
              intl,
              'individual',
              'ImportPageAPI.confirmPullingData.message',
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenConfirmDialog(false)}
            color="primary"
            disabled={isSubmitting}
          >
            {formatMessage(
              intl,
              'individual',
              'ImportPageAPI.confirmPullingData.cancel',
            )}
          </Button>

          <Button
            onClick={handleConfirmServicePull}
            color="primary"
            variant="contained"
            autoFocus
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
          >
            {isSubmitting
              ? formatMessage(intl, 'individual', 'ImportDataApiPage.importing')
              : formatMessage(
                intl,
                'individual',
                'ImportPageAPI.confirmPullingData.confirm',
              )}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Confirm dialog for PAA Import trigger */}
      <Dialog
        open={openPAAConfirmDialog}
        onClose={() => setOpenPAAConfirmDialog(false)}
      >
        <DialogTitle>
          {formatMessage(
            intl,
            'individual',
            'ImportPageAPI.confirmPullingData.title',
          )}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {formatMessage(
              intl,
              'individual',
              'ImportPageAPI.confirmPullingData.message',
            )}
          </DialogContentText>
          {selectedDistrict && (
            <Typography variant="body2" style={{ marginTop: 16 }}>
              <strong>District:</strong>
              {' '}
              {selectedDistrict.name}
            </Typography>
          )}
          {selectedQuestionnaire && (
            <Typography variant="body2">
              <strong>Questionnaire:</strong>
              {' '}
              {selectedQuestionnaire}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenPAAConfirmDialog(false)}
            color="primary"
            disabled={isSubmitting}
          >
            {formatMessage(
              intl,
              'individual',
              'ImportPageAPI.confirmPullingData.cancel',
            )}
          </Button>

          <Button
            onClick={handleConfirmPAAImport}
            color="primary"
            variant="contained"
            autoFocus
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={18} /> : null}
          >
            {isSubmitting
              ? formatMessage(intl, 'individual', 'ImportDataApiPage.importing')
              : formatMessage(
                intl,
                'individual',
                'ImportPageAPI.confirmPullingData.confirm',
              )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  pulledQ: state.individual?.pulledQ,
  fetchingPulledQ: state.individual?.fetchingPulledQ,
  errorPulledQ: state.individual?.errorPulledQ,
  fetchedPulledQ: state.individual?.fetchedPulledQ,

  submittingMutation: state.individual?.submittingMutation,
  mutation: state.individual?.mutation,
  mutations: state.individual?.mutations,

  submittingLegacyEtl: state.individual?.submittingLegacyEtl,
  submittingPaaEtl: state.individual?.submittingPaaEtl,

  fetchingApiEtlServices: state.individual?.fetchingApiEtlServices,
  apiEtlServices: state.individual?.apiEtlServices,
  errorApiEtlServices: state.individual?.errorApiEtlServices,

  fetchingQuestionnaires: state.individual?.fetchingQuestionnaires,
  availableQuestionnaires: state.individual?.availableQuestionnaires || [],
  errorQuestionnaires: state.individual?.errorQuestionnaires,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    journalize,
    fetchPulledQuestionnaires,
    confirmPullingDataFromApiEtl,
    fetchApiEtlServices,
    fetchMutationByLabel,
    fetchAvailableQuestionnaires,
  },
  dispatch,
);

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(ImportDataApiPage),
      ),
    ),
  ),
);
