import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  Searcher,
  withModulesManager,
  withHistory,
  formatMessage,
  formatMessageWithValues,
  historyPush,
} from "@openimis/fe-core";
import { IconButton, Tooltip } from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";

import { fetchEligibleHouseholds } from "../actions";
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
  RIGHT_GROUP_UPDATE,
} from "../constants";
import GroupFilter from "./GroupFilter";
import { LOC_LEVELS, locationAtLevel } from "../util/searcher-utils";

const styles = (theme) => ({
  tableWrapper: {
    "& table": { tableLayout: "fixed", minWidth: "100%" },
    "& table th, & table td": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    "& table th:first-child, & table td:first-child": { width: 200 },
    "& table th:nth-child(2), & table td:nth-child(2)": { width: 230 },
    "& .MuiTableCell-root": {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
    "& .MuiTableCell-sizeSmall": {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
    "& .MuiTableRow-root": {
      height: 56,
    },
    "& .MuiTableHead-root .MuiTableCell-root": {
      fontWeight: 600,
    },
  },
});

class EligibleHouseholdsSearcher extends Component {
  constructor(props) {
    super(props);
    this.rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
    this.defaultPageSize = DEFAULT_PAGE_SIZE;
  }

  fetch = (params) => {
    const { fetchEligibleHouseholds, modulesManager } = this.props;
    fetchEligibleHouseholds(modulesManager, params);
  };


  onDoubleClick = (group, newTab = false) => {
    const { rights, history, modulesManager } = this.props;
    if (!rights.includes(RIGHT_GROUP_UPDATE)) return;
    historyPush(modulesManager, history, "individual.route.group", [group?.id], newTab);
  };

  groupUpdatePageUrl = (group) => {
    const { modulesManager } = this.props;
    return `${modulesManager.getRef("individual.route.group")}/${group?.id}`;
  };

  headers = () => {
    const { intl, rights } = this.props;
    const result = [
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "group.code"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "group.head"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "group.pmtScoreHousehold"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "group.pmtClassHousehold"),
      ...Array.from({ length: LOC_LEVELS }, (_, i) =>
        formatMessage(intl, "location", `locationType.${i}`),
      ),
    ];

    if (rights.includes(RIGHT_GROUP_UPDATE)) {
      result.push("");
    }
    return result;
  };

  itemFormatters = () => {
    const { intl, rights } = this.props;
    const result = [
      (group) => group?.code || "-",
      (group) =>
        group?.head
          ? `${group?.head?.firstName || ""} ${group?.head?.lastName || ""}`.trim() || "-"
          : "-",
      (group) =>
        group?.pmtScoreHousehold !== null && group?.pmtScoreHousehold !== undefined
          ? group.pmtScoreHousehold
          : "-",
      (group) => group?.pmtClassHousehold || "-",
      ...Array.from({ length: LOC_LEVELS }, (_, i) => (group) =>
        locationAtLevel(group?.location, LOC_LEVELS - i - 1) || "-",
      ),
    ];

    if (rights.includes(RIGHT_GROUP_UPDATE)) {
      result.push((group) => (
        <Tooltip title={formatMessage(intl, INDIVIDUAL_MODULE_NAME, "editButtonTooltip")}>
          <IconButton
            href={this.groupUpdatePageUrl(group)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              this.onDoubleClick(group);
            }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }

    return result;
  };

  rowIdentifier = (group) => group.id;

  defaultFilters = () => ({
    isDeleted: {
      value: false,
      filter: "isDeleted: false",
    },
    isNonConsented: {
      value: false,
      filter: "isNonConsented: false",
    },
    pmtEligible: {
      value: true,
      filter: "pmtEligible: true",
    },
  });

  render() {
    const {
      intl,
      classes,
      eligibleHouseholds,
      eligibleHouseholdsTotalCount,
      eligibleHouseholdsPageInfo,
      fetchingEligibleHouseholds,
      fetchedEligibleHouseholds,
      errorEligibleHouseholds,
    } = this.props;

    return (
      <div className={classes.tableWrapper}>
        <Searcher
          module="individual"
          items={eligibleHouseholds}
          itemsPageInfo={{
            totalCount: eligibleHouseholdsTotalCount,
            ...(eligibleHouseholdsPageInfo || {}),
          }}
          fetchingItems={fetchingEligibleHouseholds}
          fetchedItems={fetchedEligibleHouseholds}
          errorItems={errorEligibleHouseholds}
          tableTitle={formatMessageWithValues(
            intl,
            INDIVIDUAL_MODULE_NAME,
            "eligibleHouseholds.searcherTitle",
            { count: eligibleHouseholdsTotalCount || 0 },
          )}
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          fetch={this.fetch}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          defaultFilters={this.defaultFilters()}
          defaultOrderBy="code"
          rowIdentifier={this.rowIdentifier}
          FilterPane={GroupFilter}
          onDoubleClick={this.onDoubleClick}
          actionsContributionKey="individual.eligibleHouseholds.Menu"
          resetFiltersOnUnmount
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  eligibleHouseholds: state.individual.eligibleHouseholds,
  eligibleHouseholdsTotalCount: state.individual.eligibleHouseholdsTotalCount,
  eligibleHouseholdsPageInfo: state.individual.eligibleHouseholdsPageInfo,
  fetchingEligibleHouseholds: state.individual.fetchingEligibleHouseholds,
  fetchedEligibleHouseholds: state.individual.fetchedEligibleHouseholds,
  errorEligibleHouseholds: state.individual.errorEligibleHouseholds,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ fetchEligibleHouseholds }, dispatch);

export default withModulesManager(
  withHistory(
    injectIntl(
      withTheme(
        withStyles(styles)(
          connect(mapStateToProps, mapDispatchToProps)(EligibleHouseholdsSearcher),
        ),
      ),
    ),
  ),
);