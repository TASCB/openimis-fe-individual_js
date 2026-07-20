import React, { useEffect, useRef, useState } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatDateFromISO,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  coreConfirm,
  clearConfirm,
  journalize,
  withHistory,
  historyPush,
  CLEARED_STATE_FILTER,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  IconButton,
  Tooltip,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import UndoIcon from '@material-ui/icons/Undo';
import {
  fetchEnrolledIndividuals,
  deleteIndividual,
  undoDeleteIndividual,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  EMPTY_STRING,
  RIGHT_INDIVIDUAL_UPDATE,
  RIGHT_INDIVIDUAL_DELETE,
  INDIVIDUAL_MODULE_NAME,
  PMT_ENROLLMENT_CUTOFF,
  PMT_SCORE_FILTER_FIELD,
} from '../constants';
import IndividualFilter from './IndividualFilter';
import {
  applyNumberCircle,
  LOC_LEVELS,
  locationAtLevel,
  useFixedSearcherLayout,
} from '../util/searcher-utils';

function EnrolledMembersSearcher({
  intl,
  modulesManager,
  history,
  rights,
  coreConfirm,
  clearConfirm,
  confirmed,
  journalize,
  submittingMutation,
  mutation,
  fetchEnrolledIndividuals,
  deleteIndividual,
  undoDeleteIndividual,
  fetchingEnrolledIndividuals,
  fetchedEnrolledIndividuals,
  errorEnrolledIndividuals,
  enrolledIndividuals,
  enrolledIndividualsPageInfo,
  enrolledIndividualsTotalCount,
}) {
  const [individualToDelete, setIndividualToDelete] = useState(null);
  const [individualToUndo, setIndividualToUndo] = useState(null);
  const [deletedIndividualUuids, setDeletedIndividualUuids] = useState([]);
  const [undoIndividualUuids, setUndoIndividualUuids] = useState([]);
  const [appliedCustomFilters, setAppliedCustomFilters] = useState([CLEARED_STATE_FILTER]);
  const [appliedFiltersRowStructure, setAppliedFiltersRowStructure] = useState([CLEARED_STATE_FILTER]);
  const prevSubmittingMutationRef = useRef();

  function individualUpdatePageUrl(individual) {
    return `${modulesManager.getRef('individual.route.individual')}/${individual?.id}`;
  }

  const openDeleteIndividualConfirmDialog = () => coreConfirm(
    formatMessageWithValues(intl, 'individual', 'individual.delete.confirm.title', {
      firstName: individualToDelete.firstName,
      lastName: individualToDelete.lastName,
    }),
    formatMessage(intl, 'individual', 'individual.delete.confirm.message'),
  );

  const openUndoIndividualConfirmDialog = () => coreConfirm(
    formatMessageWithValues(intl, 'individual', 'individual.undo.confirm.title', {
      firstName: individualToUndo.firstName,
      lastName: individualToUndo.lastName,
    }),
    formatMessage(intl, 'individual', 'individual.undo.confirm.message'),
  );

  const onDoubleClick = (individual, newTab = false) => rights.includes(RIGHT_INDIVIDUAL_UPDATE)
    && !deletedIndividualUuids.includes(individual.id)
    && historyPush(modulesManager, history, 'individual.route.individual', [individual?.id], newTab);

  const onDelete = (individual) => setIndividualToDelete(individual);
  const onUndo = (individual) => setIndividualToUndo(individual);

  useEffect(() => individualToDelete && openDeleteIndividualConfirmDialog(), [individualToDelete]);
  useEffect(() => individualToUndo && openUndoIndividualConfirmDialog(), [individualToUndo]);

  useEffect(() => {
    if (individualToDelete && confirmed) {
      deleteIndividual(
        individualToDelete,
        formatMessageWithValues(intl, 'individual', 'individual.delete.mutationLabel', {
          id: individualToDelete?.id,
        }),
      );
      setDeletedIndividualUuids([...deletedIndividualUuids, individualToDelete.id]);
    }
    if (individualToUndo && confirmed) {
      undoDeleteIndividual(
        individualToUndo,
        formatMessageWithValues(intl, 'individual', 'individual.undo.mutationLabel', {
          id: individualToUndo?.id,
        }),
      );
      setUndoIndividualUuids([...undoIndividualUuids, individualToUndo.id]);
    }
    if (individualToDelete && confirmed !== null) {
      setIndividualToDelete(null);
    }
    if (individualToUndo && confirmed !== null) {
      setIndividualToUndo(null);
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const fixed = useFixedSearcherLayout();
  const fetch = (params) => fetchEnrolledIndividuals(modulesManager, params);

  const headers = () => {
    const result = [
      'individual.firstName',
      'individual.lastName',
      'individual.dob',
      'individual.pmtScore',
      'individual.pmtClass',
    ];

    result.push(...Array.from({ length: LOC_LEVELS }, (_, i) => `location.locationType.${i}`));

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE)) {
      result.push('emptyLabel');
    }
    if (rights.includes(RIGHT_INDIVIDUAL_DELETE)) {
      result.push('emptyLabel');
    }
    return result;
  };

  const itemFormatters = () => {
    const result = [
      (individual) => individual.firstName,
      (individual) => individual.lastName,
      (individual) => (individual.dob ? formatDateFromISO(modulesManager, intl, individual.dob) : EMPTY_STRING),
      (individual) => individual.pmtScore ?? EMPTY_STRING,
      (individual) => individual.pmtClass ?? EMPTY_STRING,
    ];

    const locations = Array.from({ length: LOC_LEVELS }, (_, i) => (individual) => (
      locationAtLevel(individual.location, LOC_LEVELS - i - 1)
    ));
    result.push(...locations);

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE)) {
      result.push((individual) => (
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

    if (rights.includes(RIGHT_INDIVIDUAL_DELETE)) {
      result.push((individual) => (
        individual.isDeleted ? (
          <Tooltip title={formatMessage(intl, 'individual', 'undoDeleteButtonTooltip')}>
            <IconButton
              onClick={() => onUndo(individual)}
              disabled={undoIndividualUuids.includes(individual.id)}
            >
              <UndoIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={formatMessage(intl, 'individual', 'deleteButtonTooltip')}>
            <IconButton
              onClick={() => onDelete(individual)}
              disabled={deletedIndividualUuids.includes(individual.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )
      ));
    }

    return result;
  };

  const rowIdentifier = (individual) => individual.id;

  const sorts = () => [
    ['lastName', true],
    ['firstName', true],
    ['dob', false],
    ['pmtScore', false],
    ['id', false],
  ];

  const isRowDisabled = (_, individual) => deletedIndividualUuids.includes(individual.id);

  const defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
    enrolledPmtCutoff: {
      value: PMT_ENROLLMENT_CUTOFF,
      filter: `${PMT_SCORE_FILTER_FIELD}: ${PMT_ENROLLMENT_CUTOFF}`,
    },
  });

  const individualFilter = (props) => (
    <IndividualFilter
      intl={props.intl}
      classes={props.classes}
      filters={props.filters}
      onChangeFilters={props.onChangeFilters}
    />
  );

  return (
    <div className={fixed.root}>
      <Searcher
      module="individual"
      FilterPane={individualFilter}
      fetch={fetch}
      items={enrolledIndividuals}
      itemsPageInfo={enrolledIndividualsPageInfo}
      fetchingItems={fetchingEnrolledIndividuals}
      fetchedItems={fetchedEnrolledIndividuals}
      errorItems={errorEnrolledIndividuals}
      tableTitle={formatMessageWithValues(intl, 'individual', 'enrolledMembers.searcherResultsTitle', {
        enrolledIndividualsTotalCount,
        cutoff: PMT_ENROLLMENT_CUTOFF,
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
      cacheFiltersKey="enrolledMembersFilterCache"
      resetFiltersOnUnmount
      isCustomFiltering
      moduleName={INDIVIDUAL_MODULE_NAME}
      objectType="Individual"
      appliedCustomFilters={appliedCustomFilters}
      setAppliedCustomFilters={setAppliedCustomFilters}
      appliedFiltersRowStructure={appliedFiltersRowStructure}
      setAppliedFiltersRowStructure={setAppliedFiltersRowStructure}
      applyNumberCircle={applyNumberCircle}
      rowDisabled={isRowDisabled}
      rowLocked={isRowDisabled}
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingEnrolledIndividuals: state.individual.fetchingEnrolledIndividuals,
  fetchedEnrolledIndividuals: state.individual.fetchedEnrolledIndividuals,
  errorEnrolledIndividuals: state.individual.errorEnrolledIndividuals,
  enrolledIndividuals: state.individual.enrolledIndividuals,
  enrolledIndividualsPageInfo: state.individual.enrolledIndividualsPageInfo,
  enrolledIndividualsTotalCount: state.individual.enrolledIndividualsTotalCount,
  confirmed: state.core.confirmed,
  submittingMutation: state.individual.submittingMutation,
  mutation: state.individual.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchEnrolledIndividuals,
    deleteIndividual,
    undoDeleteIndividual,
    coreConfirm,
    clearConfirm,
    journalize,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(EnrolledMembersSearcher))),
);