import React, { useEffect, useState } from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  withHistory,
  historyPush,
  downloadExport,
  decodeId,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  IconButton, Tooltip, Button,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import EditIcon from '@material-ui/icons/Edit';
import {
  downloadGroups, fetchGroups, clearGroupExport,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  RIGHT_GROUP_UPDATE, INDIVIDUAL_MODULE_NAME, INDIVIDUAL_LABEL,
  INDIVIDUAL_GROUP_MENU_CONTRIBUTION_KEY,
} from '../constants';
import GroupFilter from './GroupFilter';
import {
  applyNumberCircle,
  LOC_LEVELS,
  locationAtLevel,
} from '../util/searcher-utils';

const useStyles = makeStyles(() => ({
  searcher: {
    '& table': { tableLayout: 'fixed', minWidth: '100%' },
    '& table th, & table td': { whiteSpace: 'nowrap' },
    '& table th:nth-child(-n+7), & table td:nth-child(-n+7)': { overflow: 'hidden', textOverflow: 'ellipsis' },
    '& table th:nth-child(1), & table td:nth-child(1)': { width: 200 },
    '& table th:nth-child(2), & table td:nth-child(2)': { width: 200 },
    '& table th:nth-child(3), & table td:nth-child(3)': { width: 90 },
    '& table th:nth-child(4), & table td:nth-child(4)': { width: 140 },
    '& table th:nth-child(5), & table td:nth-child(5)': { width: 140 },
    '& table th:nth-child(6), & table td:nth-child(6)': { width: 140 },
    '& table th:nth-child(7), & table td:nth-child(7)': { width: 150 },
    '& table th:nth-child(8), & table td:nth-child(8)': { width: 56 },
  },
}));

function GroupSearcher({
  intl,
  modulesManager,
  history,
  rights,
  fetchGroups,
  fetchingGroups,
  fetchedGroups,
  errorGroups,
  groups,
  groupsPageInfo,
  groupsTotalCount,
  downloadGroups,
  groupExport,
  errorGroupExport,
  clearGroupExport,
  isModalEnrollment,
  CLEARED_STATE_FILTER,
  benefitPlanToEnroll,
  advancedCriteria,
}) {
  const classes = useStyles();
  const [appliedCustomFilters, setAppliedCustomFilters] = useState([CLEARED_STATE_FILTER]);
  const [appliedFiltersRowStructure, setAppliedFiltersRowStructure] = useState([CLEARED_STATE_FILTER]);

  function groupUpdatePageUrl(group) {
    return `${modulesManager.getRef('individual.route.group')}/${group?.id}`;
  }

  const onDoubleClick = (group, newTab = false) => rights.includes(RIGHT_GROUP_UPDATE)
  && historyPush(modulesManager, history, 'individual.route.group', [group?.id], newTab);

  const fetch = (params) => fetchGroups(modulesManager, params);

  const headers = () => {
    const headers = [
      'group.code',
      'group.head',
      'group.hhSize',
    ];

    headers.push(...Array.from({ length: LOC_LEVELS }, (_, i) => `location.locationType.${i}`));

    if (rights.includes(RIGHT_GROUP_UPDATE)) {
      headers.push('emptyLabel');
    }
    return headers;
  };

  const itemFormatters = () => {
    const formatters = [
      (group) => group.code,
      (group) => (group?.head
        ? `${group?.head?.firstName} ${group?.head?.lastName}`
        : formatMessage(intl, 'group', 'noHeadSpecified')),
      (group) => group?.groupindividuals?.edges?.length ?? 0,
    ];

    const locations = Array.from({ length: LOC_LEVELS }, (_, i) => (group) => (
      locationAtLevel(group.location, LOC_LEVELS - i - 1)
    ));
    formatters.push(...locations);

    if (rights.includes(RIGHT_GROUP_UPDATE) && isModalEnrollment === false) {
      formatters.push((group) => (
        <Tooltip title={formatMessage(intl, 'individual', 'editButtonTooltip')}>
          <IconButton
            href={groupUpdatePageUrl(group)}
            onClick={(e) => e.stopPropagation() && onDoubleClick(group)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }
    return formatters;
  };

  const rowIdentifier = (group) => group.id;

  const sorts = () => [
    ['id', false],
  ];

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter: 'isDeleted: false',
      },
    };
    if (isModalEnrollment && advancedCriteria !== null && advancedCriteria !== undefined) {
      filters.customFilters = {
        value: advancedCriteria,
        filter: `customFilters: [${advancedCriteria}]`,
      };
      filters.benefitPlanToEnroll = {
        value: benefitPlanToEnroll,
        filter: `benefitPlanToEnroll: "${decodeId(benefitPlanToEnroll)}"`,
      };
    }
    return filters;
  };

  const [failedExport, setFailedExport] = useState(false);

  useEffect(() => {
    if (errorGroupExport) {
      setFailedExport(true);
    }
  }, [errorGroupExport]);

  useEffect(() => {
    if (groupExport) {
      downloadExport(groupExport, `${formatMessage(intl, 'individual', 'export.filename.groups')}.csv`)();
      clearGroupExport();
    }

    return setFailedExport(false);
  }, [groupExport]);

  const groupFilter = (props) => (
    <GroupFilter
      intl={props.intl}
      classes={props.classes}
      filters={props.filters}
      onChangeFilters={props.onChangeFilters}
    />
  );

  return (
    <div className={classes.searcher}>
      <Searcher
        module="individual"
        FilterPane={groupFilter}
        fetch={fetch}
        items={groups}
        itemsPageInfo={groupsPageInfo}
        fetchingItems={fetchingGroups}
        fetchedItems={fetchedGroups}
        errorItems={errorGroups}
        tableTitle={formatMessageWithValues(intl, 'individual', 'groups.searcherResultsTitle', {
          groupsTotalCount,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        sorts={sorts}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="id"
        rowIdentifier={rowIdentifier}
        onDoubleClick={onDoubleClick}
        defaultFilters={defaultFilters()}
        exportable
        exportFetch={downloadGroups}
        exportFields={[
          'id',
          'json_ext', // Unfolded by backend and removed from csv
        ]}
        exportFieldsColumns={{
          id: 'ID',
        }}
        exportFieldLabel={formatMessage(intl, 'individual', 'export.label')}
        cacheFiltersKey="groupsFilterCache"
        resetFiltersOnUnmount
        isCustomFiltering
        moduleName={INDIVIDUAL_MODULE_NAME}
        objectType={INDIVIDUAL_LABEL}
        additionalCustomFilterParams={{ type: 'GROUP' }}
        appliedCustomFilters={appliedCustomFilters}
        setAppliedCustomFilters={setAppliedCustomFilters}
        appliedFiltersRowStructure={appliedFiltersRowStructure}
        setAppliedFiltersRowStructure={setAppliedFiltersRowStructure}
        applyNumberCircle={applyNumberCircle}
        // eslint-disable-next-line react/jsx-props-no-spreading, max-len
        {...(isModalEnrollment === false ? {
          actionsContributionKey: INDIVIDUAL_GROUP_MENU_CONTRIBUTION_KEY, isCustomFiltering: true,
        } : { isCustomFiltering: false })}
      />
      {failedExport && (
        <Dialog open={failedExport} fullWidth maxWidth="sm">
          <DialogTitle>{errorGroupExport?.message}</DialogTitle>
          <DialogContent>
            <strong>{`${errorGroupExport?.code}: `}</strong>
            {errorGroupExport?.detail}
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
  fetchingGroups: state.individual.fetchingGroups,
  fetchedGroups: state.individual.fetchedGroups,
  errorGroups: state.individual.errorGroups,
  groups: state.individual.groups,
  groupsPageInfo: state.individual.groupsPageInfo,
  groupsTotalCount: state.individual.groupsTotalCount,
  selectedFilters: state.core.filtersCache.groupsFilterCache,
  fetchingGroupExport: state.individual.fetchingGroupExport,
  fetchedGroupExport: state.individual.fetchedGroupExport,
  groupExport: state.individual.groupExport,
  groupExportPageInfo: state.individual.groupExportPageInfo,
  errorGroupExport: state.individual.errorGroupExport,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchGroups,
    downloadGroups,
    clearGroupExport,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(GroupSearcher))),
);
