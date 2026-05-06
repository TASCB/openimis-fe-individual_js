import React, { useState, useEffect } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  formatDateFromISO,
  withHistory,
  historyPush,
  downloadExport,
  CLEARED_STATE_FILTER,
  decodeId,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect, useDispatch } from 'react-redux';
import {
  IconButton, Tooltip, Button,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import {
  fetchIndividuals,
  downloadIndividuals,
  clearIndividualExport,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  EMPTY_STRING,
  RIGHT_INDIVIDUAL_UPDATE,
  RIGHT_SCHEMA_SEARCH,
  FETCH_BENEFIT_PLAN_SCHEMA_FIELDS_REF,
  INDIVIDUAL_MODULE_NAME,
  INDIVIDUAL_LABEL,
  INDIVIDUALS_UPLOAD_FORM_CONTRIBUTION_KEY,
} from '../constants';
import IndividualFilter from './IndividualFilter';
import {
  applyNumberCircle,
  LOC_LEVELS,
  locationAtLevel,
} from '../util/searcher-utils';

function IndividualSearcher({
  intl,
  modulesManager,
  history,
  rights,
  fetchIndividuals,
  fetchingIndividuals,
  fetchedIndividuals,
  errorIndividuals,
  individuals,
  individualsPageInfo,
  individualsTotalCount,
  clearIndividualExport,
  groupId,
  downloadIndividuals,
  individualExport,
  errorIndividualExport,
  fieldsFromBfSchema,
  fetchingFieldsFromBfSchema,
  fetchedFieldsFromBfSchema,
  isModalEnrollment,
  advancedCriteria,
  benefitPlanToEnroll,
}) {
  const dispatch = useDispatch();
  const [appliedCustomFilters, setAppliedCustomFilters] = useState([CLEARED_STATE_FILTER]);
  const [appliedFiltersRowStructure, setAppliedFiltersRowStructure] = useState([CLEARED_STATE_FILTER]);
  const [exportFields, setExportFields] = useState([
    'id',
    'first_name',
    'last_name',
    'dob',
  ]);
  const exportFieldsColumns = {
    id: 'ID',
    first_name: formatMessage(intl, 'individual', 'export.firstName'),
    last_name: formatMessage(intl, 'individual', 'export.lastName'),
    dob: formatMessage(intl, 'individual', 'export.dob'),
  };

  useEffect(() => {
    const canFetchBenefitPlanSchemaFields = !fetchedFieldsFromBfSchema
        && !fetchingFieldsFromBfSchema
        && rights.includes(RIGHT_SCHEMA_SEARCH);

    if (canFetchBenefitPlanSchemaFields) {
      const fetchBenefitPlanSchemaFields = modulesManager.getRef(FETCH_BENEFIT_PLAN_SCHEMA_FIELDS_REF);
      if (fetchBenefitPlanSchemaFields) {
        dispatch(fetchBenefitPlanSchemaFields(['bfType: INDIVIDUAL']));
      }
    }

    if (!canFetchBenefitPlanSchemaFields) {
      setExportFields([...exportFields, ...fieldsFromBfSchema]);
    }
  }, [fetchedFieldsFromBfSchema, fetchingFieldsFromBfSchema, rights, modulesManager]);

  function individualUpdatePageUrl(individual) {
    return `${modulesManager.getRef('individual.route.individual')}/${individual?.id}`;
  }

  const onDoubleClick = (individual, newTab = false) => rights.includes(RIGHT_INDIVIDUAL_UPDATE)
  && historyPush(modulesManager, history, 'individual.route.individual', [individual?.id], newTab);

  const fetch = (params) => fetchIndividuals(modulesManager, params);

  const headers = () => {
    const headers = [
      'individual.firstName',
      'individual.lastName',
      'individual.dob',
    ];

    headers.push(...Array.from({ length: LOC_LEVELS }, (_, i) => `location.locationType.${i}`));

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE)) {
      headers.push('emptyLabel');
    }
    return headers;
  };

  const itemFormatters = () => {
    const formatters = [
      (individual) => individual.firstName,
      (individual) => individual.lastName,
      (individual) => (individual.dob ? formatDateFromISO(modulesManager, intl, individual.dob) : EMPTY_STRING),
    ];

    const locations = Array.from({ length: LOC_LEVELS }, (_, i) => (group) => (
      locationAtLevel(group.location, LOC_LEVELS - i - 1)
    ));
    formatters.push(...locations);

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE) && isModalEnrollment === false) {
      formatters.push((individual) => (
        <Tooltip title={formatMessage(intl, 'individual', 'editButtonTooltip')}>
          <IconButton
            href={individualUpdatePageUrl(individual)}
            onClick={(e) => e.stopPropagation() && onDoubleClick(individual)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }
    return formatters;
  };

  const rowIdentifier = (individual) => individual.id;

  const sorts = () => [
    ['firstName', true],
    ['lastName', true],
    ['dob', true],
  ];

  const [failedExport, setFailedExport] = useState(false);

  useEffect(() => {
    if (errorIndividualExport) {
      setFailedExport(true);
    }
  }, [errorIndividualExport]);

  useEffect(() => {
    if (individualExport) {
      downloadExport(individualExport, `${formatMessage(intl, 'individual', 'export.filename.individuals')}.csv`)();
      clearIndividualExport();
    }

    return setFailedExport(false);
  }, [individualExport]);

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter: 'isDeleted: false',
      },
    };
    if (groupId !== null && groupId !== undefined) {
      filters.groupId = {
        value: groupId,
        filter: `groupId: "${groupId}"`,
      };
    }
    if (isModalEnrollment && advancedCriteria !== null && advancedCriteria !== undefined) {
      filters.customFilters = {
        value: advancedCriteria,
        filter: `customFilters: [${advancedCriteria}]`,
      };
      filters.benefitPlanToEnroll = {
        value: benefitPlanToEnroll,
        filter: `benefitPlanToEnroll: "${decodeId(benefitPlanToEnroll)}"`,
      };
      filters.filterNotAttachedToGroup = {
        value: true,
        filter: `filterNotAttachedToGroup: true`,
      };
    }
    return filters;
  };

  useEffect(() => {
    // refresh when appliedCustomFilters is changed
  }, [appliedCustomFilters]);

  return (
    <div>
      <Searcher
        module="individual"
        FilterPane={IndividualFilter}
        fetch={fetch}
        items={individuals}
        itemsPageInfo={individualsPageInfo}
        fetchingItems={fetchingIndividuals}
        fetchedItems={fetchedIndividuals}
        errorItems={errorIndividuals}
        tableTitle={formatMessageWithValues(intl, 'individual', 'individuals.searcherResultsTitle', {
          individualsTotalCount,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="lastName"
        rowIdentifier={rowIdentifier}
        onDoubleClick={onDoubleClick}
        defaultFilters={defaultFilters()}
        exportable
        exportFetch={downloadIndividuals}
        isCustomFiltering
        moduleName={INDIVIDUAL_MODULE_NAME}
        objectType={INDIVIDUAL_LABEL}
        additionalCustomFilterParams={{ type: 'INDIVIDUAL' }}
        appliedCustomFilters={appliedCustomFilters}
        setAppliedCustomFilters={setAppliedCustomFilters}
        appliedFiltersRowStructure={appliedFiltersRowStructure}
        setAppliedFiltersRowStructure={setAppliedFiltersRowStructure}
        applyNumberCircle={applyNumberCircle}
        exportFields={exportFields}
        exportFieldsColumns={exportFieldsColumns}
        exportFieldLabel={formatMessage(intl, 'individual', 'export.label')}
        chooseExportableColumns
        cacheFiltersKey="individualsFilterCache"
        resetFiltersOnUnmount
        // eslint-disable-next-line react/jsx-props-no-spreading, max-len
        {...(isModalEnrollment === false ? {
          actionsContributionKey: INDIVIDUALS_UPLOAD_FORM_CONTRIBUTION_KEY, isCustomFiltering: true,
        } : { isCustomFiltering: false })}
      />
      {failedExport && (
        <Dialog open={failedExport} fullWidth maxWidth="sm">
          <DialogTitle>{errorIndividualExport?.message}</DialogTitle>
          <DialogContent>
            <strong>{`${errorIndividualExport?.code}: `}</strong>
            {errorIndividualExport?.detail}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFailedExport(false)} color="primary" variant="contained">
              {formatMessage(intl, 'individual', 'ok')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingIndividuals: state.individual.fetchingIndividuals,
  fetchedIndividuals: state.individual.fetchedIndividuals,
  errorIndividuals: state.individual.errorIndividuals,
  individuals: state.individual.individuals,
  individualsPageInfo: state.individual.individualsPageInfo,
  individualsTotalCount: state.individual.individualsTotalCount,
  selectedFilters: state.core.filtersCache.individualsFilterCache,
  fetchingIndividualExport: state.individual.fetchingIndividualsExport,
  fetchedIndividualExport: state.individual.fetchedIndividualExport,
  individualExport: state.individual.individualExport,
  individualExportPageInfo: state.individual.individualExportPageInfo,
  errorIndividualExport: state.individual.errorIndividualExport,
  fieldsFromBfSchema: state?.socialProtection?.fieldsFromBfSchema,
  fetchingFieldsFromBfSchema: state?.socialProtection?.fetchingFieldsFromBfSchema,
  fetchedFieldsFromBfSchema: state?.socialProtection?.fetchedFieldsFromBfSchema,
  errorFieldsFromBfSchema: state?.socialProtection?.errorFieldsFromBfSchema,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchIndividuals,
    downloadIndividuals,
    clearIndividualExport,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(IndividualSearcher))),
);
