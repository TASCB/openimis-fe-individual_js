import React, { useEffect, useRef, useState } from 'react';
import { injectIntl } from 'react-intl';
import {
  clearConfirm,
  coreConfirm,
  downloadExport,
  formatDateFromISO,
  formatMessage,
  formatMessageWithValues,
  historyPush,
  journalize,
  Searcher,
  withHistory,
  withModulesManager,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  Button, Dialog, DialogActions, DialogTitle, IconButton, Tooltip, DialogContent,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import GroupIcon from '@material-ui/icons/Group';
import DeleteIcon from '@material-ui/icons/Delete';
import {
  clearGroupIndividualExport,
  clearGroupIndividuals,
  deleteGroupIndividual,
  downloadGroupIndividuals,
  fetchGroupIndividuals,
  updateGroupIndividual,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  EMPTY_STRING,
  GROUP_INDIVIDUAL_ROLES,
  RIGHT_GROUP_INDIVIDUAL_DELETE,
  RIGHT_GROUP_INDIVIDUAL_UPDATE,
  ROWS_PER_PAGE_OPTIONS,
  GROUP_INDIVIDUAL_ROW_ACTION_CONTRIBUTION_KEY,
} from '../constants';
import GroupIndividualFilter from './GroupIndividualFilter';
import GroupIndividualRolePicker from '../pickers/GroupIndividualRolePicker';
import GroupChangeDialog from './GroupChangeDialog';
import GroupIndividualRecipientTypePicker from '../pickers/GroupIndividualRecipientTypePicker';
import { useSearcherTable } from '../util/searcher-table';

function GroupIndividualSearcher({
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
  fetchGroupIndividuals,
  deleteGroupIndividual,
  fetchingGroupIndividuals,
  fetchedGroupIndividuals,
  errorGroupIndividuals,
  groupIndividuals,
  updateGroupIndividual,
  groupIndividualsPageInfo,
  groupIndividualsTotalCount,
  clearGroupIndividualExport,
  groupId,
  downloadGroupIndividuals,
  groupIndividualExport,
  errorGroupIndividualExport,
  clearGroupIndividuals,
  setEditedGroupIndividual,
  editedGroupIndividual,
  setConfirmedAction,

}) {
  const [groupIndividualToDelete, setGroupIndividualToDelete] = useState(null);
  const [deletedGroupIndividualUuids, setDeletedGroupIndividualUuids] = useState([]);
  const prevSubmittingMutationRef = useRef();
  const [updatedGroupIndividuals, setUpdatedGroupIndividuals] = useState([]);
  const [refetch, setRefetch] = useState(null);
  const [isChangeGroupModalOpen, setIsChangeGroupModalOpen] = useState(false);

  function groupIndividualUpdatePageUrl(groupIndividual) {
    return `${modulesManager.getRef('individual.route.individual')}/${groupIndividual.individual?.id}`;
  }

  const openDeleteGroupIndividualConfirmDialog = () => coreConfirm(
    formatMessageWithValues(intl, 'individual', 'individual.delete.confirm.title', {
      firstName: groupIndividualToDelete.individual.firstName,
      lastName: groupIndividualToDelete.individual.lastName,
    }),
    formatMessage(intl, 'individual', 'individual.delete.confirm.message'),
  );

  const onDoubleClick = (groupIndividual, newTab = false) => rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE)
        && !deletedGroupIndividualUuids.includes(groupIndividual.id)
        // eslint-disable-next-line max-len
        && historyPush(modulesManager, history, 'individual.route.individual', [groupIndividual?.individual?.id], newTab);

  const onDelete = (groupIndividual) => setGroupIndividualToDelete(groupIndividual);

  useEffect(() => groupIndividualToDelete && openDeleteGroupIndividualConfirmDialog(), [groupIndividualToDelete]);

  useEffect(() => {
    if (groupIndividualToDelete && confirmed) {
      deleteGroupIndividual(
        groupIndividualToDelete,
        formatMessageWithValues(intl, 'individual', 'individual.delete.mutationLabel', {
          firstName: groupIndividualToDelete.individual.firstName,
          lastName: groupIndividualToDelete.individual.lastName,
        }),
      );
      setDeletedGroupIndividualUuids([...deletedGroupIndividualUuids, groupIndividualToDelete.id]);
    }
    if (groupIndividualToDelete && confirmed !== null) {
      setGroupIndividualToDelete(null);
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

  useEffect(() => () => (editedGroupIndividual ? clearGroupIndividuals() : null), [groupId]);

  // One extra column per contributed row action (case_management adds deactivate-with-reason).
  // Declared before the styles hook, which needs the count to pin the action columns.
  const rowActions = modulesManager.getContribs(GROUP_INDIVIDUAL_ROW_ACTION_CONTRIBUTION_KEY) || [];
  const actionColumns = 1
    + (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE) ? 1 : 0)
    + rowActions.length;

  const fetch = (params) => fetchGroupIndividuals(params);

  const headers = () => {
    const headers = [
      'individual.firstName',
      'individual.lastName',
      'individual.dob',
      'groupIndividual.individual.role',
      'groupIndividual.individual.recipientType',
      'emptyLabel',
    ];
    if (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE)) {
      headers.push('emptyLabel');
    }
    rowActions.forEach(() => headers.push('emptyLabel'));
    return headers;
  };

  const addUpdatedGroupIndividual = (groupIndividual, role) => {
    setUpdatedGroupIndividuals((prevState) => {
      const updatedBeneficiaryExists = prevState.some(
        (item) => item.id === groupIndividual.id && (item.role === role || item.recipient_type),
      );

      if (!updatedBeneficiaryExists) {
        return [...prevState, groupIndividual];
      }

      return prevState.filter(
        (item) => !(item.id === groupIndividual.id && (item.role === role || item.recipient_type)),
      );
    });
  };

  const handleRoleOnChange = (groupIndividual, role) => {
    if (groupIndividual && role) {
      addUpdatedGroupIndividual(groupIndividual, role);
      const editedGroupIndividual = { ...groupIndividual, role };
      updateGroupIndividual(
        editedGroupIndividual,
        formatMessageWithValues(intl, 'individual', 'groupIndividual.update.mutationLabel', {
          id: editedGroupIndividual?.individual?.id,
        }),
      );
      setRefetch(editedGroupIndividual?.individual?.id);
    }
  };

  const handleRecipientTypeOnChange = (groupIndividual, recipientType) => {
    if (groupIndividual && recipientType) {
      addUpdatedGroupIndividual(groupIndividual, recipientType);
      const editedGroupIndividual = { ...groupIndividual, recipientType };
      updateGroupIndividual(
        editedGroupIndividual,
        formatMessageWithValues(intl, 'individual', 'groupIndividual.update.mutationLabel', {
          id: editedGroupIndividual?.individual?.id,
        }),
      );
      setRefetch(editedGroupIndividual?.individual?.id);
    }
  };

  const handleGroupChange = (groupIndividual) => {
    setIsChangeGroupModalOpen(true);
    setEditedGroupIndividual(groupIndividual);
  };

  const isRowUpdated = (groupIndividual) => (
    updatedGroupIndividuals.some((item) => item.id === groupIndividual.id));

  const isRowDeleted = (groupIndividual) => deletedGroupIndividualUuids.includes(groupIndividual.id);
  // Deactivated members stay in the list; every built-in action closes for them, and only the
  // contributed reactivate action stays live.
  const isRowDeactivated = (groupIndividual) => groupIndividual?.isActive === false;
  const isRowLocked = (groupIndividual) => isRowDeleted(groupIndividual)
    || isRowDeactivated(groupIndividual);

  const isRowDisabled = (_, groupIndividual) => isRowLocked(groupIndividual)
    || isRowUpdated(groupIndividual);

  const onChangeGroupConfirm = (groupToBeChanged) => {
    const updateIndividual = {
      ...editedGroupIndividual,
      group: groupToBeChanged,
      role: null,
      recipientType: null,
    };
    updateGroupIndividual(
      updateIndividual,
      formatMessageWithValues(intl, 'individual', 'individual.groupChange.confirm.message', {
        individualId: updateIndividual?.individual?.id,
        groupId: groupToBeChanged?.id,
      }),
    );
    setRefetch(groupToBeChanged?.id);
  };

  const itemFormatters = () => {
    const formatters = [
      (groupIndividual) => groupIndividual.individual.firstName,
      (groupIndividual) => groupIndividual.individual.lastName,
      (groupIndividual) => (
        groupIndividual.individual.dob
          ? formatDateFromISO(modulesManager, intl, groupIndividual.individual.dob)
          : EMPTY_STRING
      ),
      (groupIndividual) => (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE) && !isRowLocked(groupIndividual) ? (
        <GroupIndividualRolePicker
          withLabel={false}
          value={groupIndividual.role}
          onChange={(role) => handleRoleOnChange(groupIndividual, role)}
        />
      ) : groupIndividual.role),
      (groupIndividual) => (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE) && !isRowLocked(groupIndividual) ? (
        <GroupIndividualRecipientTypePicker
          withLabel={false}
          value={groupIndividual.recipientType}
          onChange={(recipientType) => handleRecipientTypeOnChange(groupIndividual, recipientType)}
        />
      ) : groupIndividual.recipientType),
      (groupIndividual) => (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE) ? (
        (
          <Tooltip title={formatMessage(intl, 'individual', 'changeGroupButtonTooltip')}>
            <IconButton
              onClick={() => handleGroupChange(groupIndividual)}
              disabled={isRowLocked(groupIndividual)}
            >
              <GroupIcon />
            </IconButton>
          </Tooltip>
        )
      ) : null),
    ];
    if (rights.includes(RIGHT_GROUP_INDIVIDUAL_UPDATE)) {
      formatters.push((groupIndividual) => (
        <Tooltip title={formatMessage(intl, 'individual', 'editButtonTooltip')}>
          <IconButton
            href={groupIndividualUpdatePageUrl(groupIndividual)}
            onClick={(e) => e.stopPropagation() && onDoubleClick(groupIndividual)}
            disabled={isRowLocked(groupIndividual)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }
    // The delete action is intentionally NOT rendered: a member leaving the household is
    // recorded as a deactivation with a reason. deleteGroupIndividual and
    // RIGHT_GROUP_INDIVIDUAL_DELETE are left untouched on the backend.
    rowActions.forEach((Action, idx) => {
      formatters.push((groupIndividual) => (
        <Action
          key={`row-action-${idx}`}
          groupIndividual={groupIndividual}
          groupId={groupId}
          rights={rights}
          setConfirmedAction={setConfirmedAction}
          disabled={isRowLocked(groupIndividual)}
          deactivated={isRowDeactivated(groupIndividual)}
        />
      ));
    });
    return formatters;
  };

  const rowIdentifier = (groupIndividual) => groupIndividual.id;

  const sorts = () => [
    ['individual__firstName', true],
    ['individual__lastName', true],
    ['individual__dob', true],
  ];

  const [failedExport, setFailedExport] = useState(false);

  useEffect(() => {
    if (errorGroupIndividualExport) {
      setFailedExport(true);
    }
  }, [errorGroupIndividualExport]);

  useEffect(() => {
    if (groupIndividualExport) {
      downloadExport(
        groupIndividualExport,
        `${formatMessage(intl, 'individual', 'export.filename.individuals')}.csv`,
      )();
      clearGroupIndividualExport();
    }

    return setFailedExport(false);
  }, [groupIndividualExport]);

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter: 'isDeleted: false',
      },
      // Active-only by default: deactivated members stay in the data but out of the working list,
      // so "N Household Members Found" counts active members.
      isActive: {
        value: 'ACTIVE',
        filter: 'isActive: true',
      },
      individual_IsDeleted: {
        value: false,
        filter: 'individual_IsDeleted: false',
      },
    };
    if (groupId) {
      filters.group_Id = {
        value: groupId,
        filter: `group_Id: "${groupId}"`,
      };
    }
    return filters;
  };

  const groupBeneficiaryFilter = (props) => (
    <GroupIndividualFilter
      intl={props.intl}
      classes={props.classes}
      filters={props.filters}
      onChangeFilters={props.onChangeFilters}
      groupId={groupId}
    />
  );

  const tableClasses = useSearcherTable({ actionColumns: actionColumns });

  return (
    <div className={tableClasses.root}>
      <GroupChangeDialog
        confirmState={isChangeGroupModalOpen}
        onClose={() => setIsChangeGroupModalOpen(false)}
        onConfirm={onChangeGroupConfirm}
        groupIndividual={editedGroupIndividual}
        setEditedGroupIndividual={setEditedGroupIndividual}
      />
      <Searcher
        key={refetch}
        module="individual"
        FilterPane={groupBeneficiaryFilter}
        fetch={fetch}
        items={groupIndividuals}
        itemsPageInfo={groupIndividualsPageInfo}
        fetchingItems={fetchingGroupIndividuals}
        fetchedItems={fetchedGroupIndividuals}
        errorItems={errorGroupIndividuals}
        tableTitle={formatMessageWithValues(intl, 'individual', 'individuals.searcherResultsTitle', {
          individualsTotalCount: groupIndividualsTotalCount,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowDisabled={isRowDisabled}
        rowLocked={(_, gi) => isRowDeactivated(gi)}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="individual__lastName"
        rowIdentifier={rowIdentifier}
        onDoubleClick={onDoubleClick}
        defaultFilters={defaultFilters()}
        rowDisabled={isRowDisabled}
        rowLocked={isRowDisabled}
        exportable
        exportFetch={downloadGroupIndividuals}
        exportFields={[
          'individual__id',
          'individual__first_name',
          'individual__last_name',
          'individual__dob',
          'role',
          'json_ext', // Unfolded by backend and removed from csv
        ]}
        exportFieldsColumns={{
          individual__id: 'ID',
          individual__first_name: formatMessage(intl, 'individual', 'export.firstName'),
          individual__last_name: formatMessage(intl, 'individual', 'export.lastName'),
          individual__dob: formatMessage(intl, 'individual', 'export.dob'),
          role: formatMessage(intl, 'individual', 'export.role'),
        }}
        exportFieldLabel={formatMessage(intl, 'individual', 'export.label')}
        cacheFiltersKey="groupIndividualsFilterCache"
        resetFiltersOnUnmount
      />
      {failedExport && (
        <Dialog open={failedExport} fullWidth maxWidth="sm">
          <DialogTitle>{errorGroupIndividualExport?.message}</DialogTitle>
          <DialogContent>
            <strong>{`${errorGroupIndividualExport?.code}: `}</strong>
            {errorGroupIndividualExport?.detail}
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
  fetchingGroupIndividuals: state.individual.fetchingGroupIndividuals,
  fetchedGroupIndividuals: state.individual.fetchedGroupIndividuals,
  errorGroupIndividuals: state.individual.errorGroupIndividuals,
  groupIndividuals: state.individual.groupIndividuals,
  groupIndividualsPageInfo: state.individual.groupIndividualsPageInfo,
  groupIndividualsTotalCount: state.individual.groupIndividualsTotalCount,
  confirmed: state.core.confirmed,
  submittingMutation: state.individual.submittingMutation,
  mutation: state.individual.mutation,
  selectedFilters: state.core.filtersCache.groupIndividualsFilterCache,
  fetchingGroupIndividualExport: state.individual.fetchingGroupIndividualExport,
  fetchedGroupIndividualExport: state.individual.fetchedGroupIndividualExport,
  groupIndividualExport: state.individual.groupIndividualExport,
  groupIndividualExportPageInfo: state.individual.groupIndividualExportPageInfo,
  errorGroupIndividualExport: state.individual.errorGroupIndividualExport,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchGroupIndividuals,
    updateGroupIndividual,
    deleteGroupIndividual,
    clearGroupIndividualExport,
    downloadGroupIndividuals,
    clearGroupIndividuals,
    coreConfirm,
    clearConfirm,
    journalize,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(GroupIndividualSearcher))),
);
