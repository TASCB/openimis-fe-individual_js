import React, { Component } from 'react';
import { injectIntl } from 'react-intl';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Searcher,
  withModulesManager,
  withHistory,
  formatMessage,
  formatMessageWithValues,
  historyPush,
} from '@openimis/fe-core';
import { IconButton, Tooltip } from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';

import { fetchEligibleMembers } from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
  RIGHT_INDIVIDUAL_UPDATE,
} from '../constants';
import { LOC_LEVELS, locationAtLevel } from '../util/searcher-utils';
import EligibleMembersFilter from './EligibleMembersFilter';

const styles = (theme) => ({
  tableWrapper: {
    // Fixed layout so the first column doesn't balloon; ellipsis truncates long values.
    '& table': { tableLayout: 'fixed', minWidth: '100%' },
    '& table th, & table td': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    '& table th:first-child, & table td:first-child': { width: 200 },
    '& .MuiTableCell-root': {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
    '& .MuiTableCell-sizeSmall': {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
    '& .MuiTableRow-root': {
      height: 56,
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      fontWeight: 600,
    },
  },
});

class EligibleMembersSearcher extends Component {
  constructor(props) {
    super(props);
    this.rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
    this.defaultPageSize = DEFAULT_PAGE_SIZE;
  }

  fetch = (params) => {
    const { fetchEligibleMembers, modulesManager } = this.props;
    fetchEligibleMembers(modulesManager, params);
  };

  onDoubleClick = (individual, newTab = false) => {
    const { rights, history, modulesManager } = this.props;
    if (!rights.includes(RIGHT_INDIVIDUAL_UPDATE)) return;
    historyPush(modulesManager, history, 'individual.route.individual', [individual?.id], newTab);
  };

  individualUpdatePageUrl = (individual) => {
    const { modulesManager } = this.props;
    return `${modulesManager.getRef('individual.route.individual')}/${individual?.id}`;
  };

  headers = () => {
    const { intl, rights } = this.props;
    const result = [
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.firstName'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.lastName'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.dob'),
      ...Array.from({ length: LOC_LEVELS }, (_, i) =>
        formatMessage(intl, 'location', `locationType.${i}`),
      ),
    ];

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE)) {
      result.push('');
    }
    return result;
  };

  itemFormatters = () => {
    const { intl, rights } = this.props;
    const result = [
      (individual) => individual?.firstName || '-',
      (individual) => individual?.lastName || '-',
      (individual) => individual?.dob || '-',
      ...Array.from({ length: LOC_LEVELS }, (_, i) => (individual) =>
        locationAtLevel(individual?.location, LOC_LEVELS - i - 1) || '-',
      ),
    ];

    if (rights.includes(RIGHT_INDIVIDUAL_UPDATE)) {
      result.push((individual) => (
        <Tooltip title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'editButtonTooltip')}>
          <IconButton
            href={this.individualUpdatePageUrl(individual)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              this.onDoubleClick(individual);
            }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }

    return result;
  };

  rowIdentifier = (individual) => individual.id;

  defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: 'isDeleted: false',
    },
    groupPmtEligible: {
      value: true,
      filter: 'groupPmtEligible: true',
    },
    groupIsNonConsented: {
      value: false,
      filter: 'groupIsNonConsented: false',
    },
  });

  render() {
    const {
      intl,
      classes,
      eligibleMembers,
      eligibleMembersTotalCount,
      eligibleMembersPageInfo,
      fetchingEligibleMembers,
      fetchedEligibleMembers,
      errorEligibleMembers,
    } = this.props;

    return (
      <div className={classes.tableWrapper}>
        <Searcher
          module="individual"
          items={eligibleMembers}
          itemsPageInfo={{
            totalCount: eligibleMembersTotalCount,
            ...(eligibleMembersPageInfo || {}),
          }}
          fetchingItems={fetchingEligibleMembers}
          fetchedItems={fetchedEligibleMembers}
          errorItems={errorEligibleMembers}
          tableTitle={formatMessageWithValues(
            intl,
            INDIVIDUAL_MODULE_NAME,
            'eligibleMembers.searcherTitle',
            { count: eligibleMembersTotalCount || 0 },
          )}
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          fetch={this.fetch}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          defaultFilters={this.defaultFilters()}
          defaultOrderBy="firstName"
          rowIdentifier={this.rowIdentifier}
          FilterPane={EligibleMembersFilter}
          onDoubleClick={this.onDoubleClick}
          resetFiltersOnUnmount
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  eligibleMembers: state.individual.eligibleMembers,
  eligibleMembersTotalCount: state.individual.eligibleMembersTotalCount,
  eligibleMembersPageInfo: state.individual.eligibleMembersPageInfo,
  fetchingEligibleMembers: state.individual.fetchingEligibleMembers,
  fetchedEligibleMembers: state.individual.fetchedEligibleMembers,
  errorEligibleMembers: state.individual.errorEligibleMembers,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ fetchEligibleMembers }, dispatch);

export default withModulesManager(
  withHistory(
    injectIntl(
      withTheme(
        withStyles(styles)(
          connect(mapStateToProps, mapDispatchToProps)(EligibleMembersSearcher),
        ),
      ),
    ),
  ),
);
