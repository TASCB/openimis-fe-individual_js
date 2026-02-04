// src/components/NonConsentedHouseholdsSearcher.js
import React, { Component } from "react";
import { injectIntl } from "react-intl";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  Searcher,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
} from "@openimis/fe-core";

import { fetchNonConsentedHouseholds } from "../actions";
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
} from "../constants";

import NonConsentedHouseholdsFilter from "./NonConsentedHouseholdsFilter";

const styles = (theme) => ({
  tableWrapper: {
    // Make rows less "thin"
    "& .MuiTableCell-root": {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },

    // If Searcher uses sizeSmall cells, override them too
    "& .MuiTableCell-sizeSmall": {
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },

    // Increase row height
    "& .MuiTableRow-root": {
      height: 56,
    },

    // Stronger header like members table
    "& .MuiTableHead-root .MuiTableCell-root": {
      fontWeight: 600,
    },
  },
});

class NonConsentedHouseholdsSearcher extends Component {
  constructor(props) {
    super(props);
    this.rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
    this.defaultPageSize = DEFAULT_PAGE_SIZE;
  }

  /**
   * Parse jsonExt.json_ext into object (works whether it's object or string)
   */
  getNested = (individual) => {
    const je = individual?.jsonExt;
    if (!je) return {};

    const nested = je.json_ext || je.jsonExt || je["json_ext"];
    if (!nested) return {};

    if (typeof nested === "object") return nested;

    if (typeof nested === "string") {
      try {
        const parsed = JSON.parse(nested);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch (e) {
        return {};
      }
    }

    return {};
  };

  /**
   * Get raw payload (prefers jsonExt.json_ext.raw)
   */
  getRaw = (individual) => {
    const je = individual?.jsonExt;
    if (!je) return {};

    // If backend already provides raw directly
    if (je.raw && typeof je.raw === "object") return je.raw;

    const nested = je.json_ext || je.jsonExt || je["json_ext"];

    if (nested && typeof nested === "object") {
      if (nested.raw && typeof nested.raw === "object") return nested.raw;
      return nested;
    }

    if (typeof nested === "string") {
      try {
        const parsed = JSON.parse(nested);
        if (parsed?.raw && typeof parsed.raw === "object") return parsed.raw;
        if (parsed && typeof parsed === "object") return parsed;
      } catch (e) {
        return {};
      }
    }

    return {};
  };

  getLocationChain = (loc, maxDepth = 10) => {
    const chain = [];
    let cur = loc;
    let depth = 0;
    while (cur && depth < maxDepth) {
      chain.push(cur);
      cur = cur.parent;
      depth += 1;
    }
    return chain;
  };

  getVillageName = (individual) => {
    const loc = individual?.location;
    if (!loc) return "-";
    return loc?.name ?? loc?.code ?? "-";
  };

  getDistrictName = (individual) => {
    const chain = this.getLocationChain(individual?.location);
    if (!chain.length) return "-";
    return (
      (chain[2] && (chain[2].name || chain[2].code)) ||
      (chain[1] && (chain[1].name || chain[1].code)) ||
      "-"
    );
  };

  fetch = (params) => {
    const { fetchNonConsentedHouseholds, modulesManager } = this.props;
    fetchNonConsentedHouseholds(modulesManager, {
      ...params,
      pageSize: params?.pageSize ?? this.defaultPageSize,
    });
  };

  headers = () => {
    const { intl } = this.props;
    return [
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.tf4No"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.headName"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.district"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.village"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.interviewKey"),
    ];
  };

  itemFormatters = () => [
    // TF4 Number
    (individual) => {
      if (individual?.tf4No) return individual.tf4No;
      const raw = this.getRaw(individual);
      const v = raw?.TF4_NO || raw?.tf4_no || raw?.tf4No;
      return v != null ? String(v) : "-";
    },

    // Head Name
    (individual) =>
      `${individual?.firstName || ""} ${individual?.lastName || ""}`.trim() ||
      "-",

    // District
    (individual) => this.getDistrictName(individual),

    // Village
    (individual) => this.getVillageName(individual),

    // Interview Key (use interviewKey GraphQL field first; fallback to jsonExt external_id)
    (individual) => {
      if (individual?.interviewKey) return individual.interviewKey;

      const je = individual?.jsonExt || {};
      const v =
        je?.external_id ||
        je?.externalId ||
        je?.interview_key ||
        je?.interviewKey;

      return v != null ? String(v) : "-";
    },
  ];

  rowIdentifier = (individual) => individual.id;

  render() {
    const {
      intl,
      classes,
      nonConsentedHouseholds,
      nonConsentedHouseholdsTotalCount,
      nonConsentedHouseholdsPageInfo,
      fetchingNonConsentedHouseholds,
      fetchedNonConsentedHouseholds,
      errorNonConsentedHouseholds,
    } = this.props;

    return (
      <div className={classes.tableWrapper}>
        <Searcher
          module="individual"
          items={nonConsentedHouseholds}
          itemsPageInfo={{
            totalCount: nonConsentedHouseholdsTotalCount,
            ...(nonConsentedHouseholdsPageInfo || {}),
          }}
          fetchingItems={fetchingNonConsentedHouseholds}
          fetchedItems={fetchedNonConsentedHouseholds}
          errorItems={errorNonConsentedHouseholds}
          tableTitle={formatMessageWithValues(
            intl,
            INDIVIDUAL_MODULE_NAME,
            "nonConsentedHouseholds.searcherTitle",
            { count: nonConsentedHouseholdsTotalCount || 0 },
          )}
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          fetch={this.fetch}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          rowIdentifier={this.rowIdentifier}
          FilterPane={NonConsentedHouseholdsFilter}
          resetFiltersOnUnmount
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  nonConsentedHouseholds: state.individual.nonConsentedHouseholds,
  nonConsentedHouseholdsTotalCount: state.individual.nonConsentedHouseholdsTotalCount,
  nonConsentedHouseholdsPageInfo: state.individual.nonConsentedHouseholdsPageInfo,
  fetchingNonConsentedHouseholds: state.individual.fetchingNonConsentedHouseholds,
  fetchedNonConsentedHouseholds: state.individual.fetchedNonConsentedHouseholds,
  errorNonConsentedHouseholds: state.individual.errorNonConsentedHouseholds,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators({ fetchNonConsentedHouseholds }, dispatch);

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(NonConsentedHouseholdsSearcher),
      ),
    ),
  ),
);
