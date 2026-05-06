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
  parseData,
} from "@openimis/fe-core";
import {
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Button,
} from "@material-ui/core";
import GetAppIcon from "@material-ui/icons/GetApp";

import {
  fetchNonConsentedHouseholds,
  fetchNonConsentedHouseholdsForExport,
} from "../actions";
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
} from "../constants";

import NonConsentedHouseholdsFilter from "./NonConsentedHouseholdsFilter";
import { exportNonConsentedHouseholdsPdf } from "../util/pdf-export";

const styles = (theme) => ({
  tableWrapper: {
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

class NonConsentedHouseholdsSearcher extends Component {
  constructor(props) {
    super(props);
    this.rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
    this.defaultPageSize = DEFAULT_PAGE_SIZE;
    this.state = {
      currentFilters: {},
      exportError: null,
      isExporting: false,
    };
  }

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

  getRaw = (individual) => {
    const je = individual?.jsonExt;
    if (!je) return {};

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
    const districtByType = chain.find((loc) => loc?.type === "D");
    if (districtByType) {
      return districtByType.name || districtByType.code || "-";
    }
    return (
      (chain[2] && (chain[2].name || chain[2].code)) ||
      (chain[1] && (chain[1].name || chain[1].code)) ||
      "-"
    );
  };

  getInterviewResultNo = (individual) => {
    if (individual?.interviewResultsNo != null) {
      return String(individual.interviewResultsNo).trim().padStart(2, "0");
    }

    const raw = this.getRaw(individual);
    const nested = this.getNested(individual);
    const je = individual?.jsonExt || {};

    const value =
      raw?.interview_resultsNo ||
      raw?.interview_results_no ||
      raw?.interview_results ||
      raw?.INTERVIEW_RESULTSNO ||
      raw?.INTERVIEW_RESULTS_NO ||
      raw?.INTERVIEW_RESULTS ||
      nested?.interview_resultsNo ||
      nested?.interview_results_no ||
      nested?.interview_results ||
      je?.interview_resultsNo ||
      je?.interview_results_no ||
      je?.interview_results;

    return value != null ? String(value).trim().padStart(2, "0") : "";
  };

  getInterviewResultReason = (individual) => {
    const code = this.getInterviewResultNo(individual);
    const reasons = {
      "01": "Mwakilishi wa kaya hajahudhuria mahojiano",
      "02": "Mwakilishi wa kaya amekataa kuhojiwa",
    };
    return reasons[code] || "-";
  };

  fetch = (params) => {
    const { fetchNonConsentedHouseholds, modulesManager } = this.props;
    const nextParams = Array.isArray(params)
      ? params
      : {
        ...params,
        pageSize: params?.pageSize ?? this.defaultPageSize,
      };
    this.setState({ currentFilters: nextParams });
    fetchNonConsentedHouseholds(modulesManager, nextParams);
  };

  headers = () => {
    const { intl } = this.props;
    return [
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.headName"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.district"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.village"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.interviewKey"),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, "individual.interviewResultsNo"),
    ];
  };

  itemFormatters = () => [
    (individual) =>
      `${individual?.firstName || ""} ${individual?.lastName || ""}`.trim() ||
      "-",

    (individual) => this.getDistrictName(individual),

    (individual) => this.getVillageName(individual),

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

    (individual) => this.getInterviewResultReason(individual),
  ];

  rowIdentifier = (individual) => individual.id;

  getInterviewKey = (individual) => {
    if (individual?.interviewKey) return individual.interviewKey;

    const je = individual?.jsonExt || {};
    const v =
      je?.interview_key ||
      je?.interviewKey ||
      je?.external_id ||
      je?.externalId;

    return v != null ? String(v) : "-";
  };

  getDistrictLabel = (households) => {
    const districts = new Set(
      (households || []).map((individual) => this.getDistrictName(individual)).filter(Boolean).filter((v) => v !== "-")
    );
    if (districts.size === 1) return [...districts][0];
    if (districts.size > 1) return "Wilaya Mbalimbali";
    return null;
  };

  getVillageLabel = (households) => {
    const villages = new Set(
      (households || []).map((individual) => this.getVillageName(individual)).filter(Boolean).filter((v) => v !== "-")
    );
    if (villages.size === 1) return [...villages][0];
    if (villages.size > 1) return "Vijiji Mbalimbali";
    return null;
  };

  handlePdfExport = async () => {
    const {
      modulesManager,
      fetchNonConsentedHouseholdsForExport,
      nonConsentedHouseholds,
      intl,
    } = this.props;
    const { currentFilters } = this.state;

    if (!nonConsentedHouseholds || nonConsentedHouseholds.length === 0) {
      this.setState({
        exportError: formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.message.noResults"),
      });
      return;
    }

    try {
      this.setState({ isExporting: true });
      const response = await fetchNonConsentedHouseholdsForExport(modulesManager, currentFilters);
      const exportItems = response?.payload?.data?.individual
        ? parseData(response.payload.data.individual)
        : nonConsentedHouseholds;

      await exportNonConsentedHouseholdsPdf({
        households: exportItems.map((individual) => ({
          headName: `${individual?.firstName || ""} ${individual?.lastName || ""}`.trim() || "-",
          districtName: this.getDistrictName(individual),
          villageName: this.getVillageName(individual),
          interviewKey: this.getInterviewKey(individual),
          interviewReason: this.getInterviewResultReason(individual),
        })),
        districtName: this.getDistrictLabel(exportItems),
        villageName: this.getVillageLabel(exportItems),
        generatedDate: new Date(),
      });

      this.setState({ exportError: null, isExporting: false });
    } catch (error) {
      this.setState({
        exportError: error.message || "Error exporting PDF",
        isExporting: false,
      });
    }
  };

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
      fetchNonConsentedHouseholdsForExport,
    } = this.props;
    const { exportError, isExporting } = this.state;

    const searcherActions = [
      {
        icon: <GetAppIcon />,
        label: formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.button.downloadPdf"),
        onClick: this.handlePdfExport,
        authorized: !(!nonConsentedHouseholds || nonConsentedHouseholds.length === 0 || fetchingNonConsentedHouseholds || isExporting),
      },
    ];

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
          searcherActionsPosition="header-right"
          searcherActions={searcherActions}
          enableActionButtons
        />
        {exportError && (
          <Dialog open={!!exportError} fullWidth maxWidth="sm">
            <DialogTitle>{formatMessage(intl, INDIVIDUAL_MODULE_NAME, "pmt.message.error")}</DialogTitle>
            <DialogContent>
              {exportError}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => this.setState({ exportError: null })} color="primary" variant="contained">
                {formatMessage(intl, INDIVIDUAL_MODULE_NAME, "ok")}
              </Button>
            </DialogActions>
          </Dialog>
        )}
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
  bindActionCreators({ fetchNonConsentedHouseholds, fetchNonConsentedHouseholdsForExport }, dispatch);

export default withModulesManager(
  injectIntl(
    withTheme(
      withStyles(styles)(
        connect(mapStateToProps, mapDispatchToProps)(NonConsentedHouseholdsSearcher),
      ),
    ),
  ),
);
