// src/components/NonConsentedHouseholdsSearcher.js
import React, { Component } from 'react';
import { injectIntl } from 'react-intl';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { withTheme, withStyles } from '@material-ui/core/styles';
import {
  Searcher,
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
} from '@openimis/fe-core';

import { fetchNonConsentedHouseholds } from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  INDIVIDUAL_MODULE_NAME,
} from '../constants';

import NonConsentedHouseholdsFilter from './NonConsentedHouseholdsFilter';

const styles = (theme) => ({
  // optional custom styling
});

class NonConsentedHouseholdsSearcher extends Component {
  constructor(props) {
    super(props);
    this.rowsPerPageOptions = ROWS_PER_PAGE_OPTIONS;
    this.defaultPageSize = DEFAULT_PAGE_SIZE;
  }

  /**
   * jsonExt may contain:
   * - jsonExt.raw (object)  ✅ ideal
   * OR
   * - jsonExt.json_ext (stringified JSON) ✅ current ETL structure
   *
   * This helper normalizes it into a usable object.
   */
  getRaw = (individual) => {
    const je = individual?.jsonExt;
    if (!je) return {};

    // Preferred structure
    if (je.raw && typeof je.raw === 'object') return je.raw;

    // Current structure: nested string
    const nested = je.json_ext || je.jsonExt || je['json_ext'];
    if (typeof nested === 'string') {
      try {
        const parsed = JSON.parse(nested);
        // parsed might be { raw: {...}, ... } or directly raw-like
        if (parsed?.raw && typeof parsed.raw === 'object') return parsed.raw;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (e) {
        return {};
      }
    }

    return {};
  };

  /**
   * Helper: build a parent chain for a location (village -> ward -> district -> region).
   * This depends on Location.FlatProjection including `parent { ... }`.
   */
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
    if (!loc) return '-';
    return loc?.name ?? loc?.code ?? '-';
  };

  getDistrictName = (individual) => {
    const chain = this.getLocationChain(individual?.location);
    if (!chain.length) return '-';

    // Common chain: [village, ward, district, region]
    return (
      (chain[2] && (chain[2].name || chain[2].code))
      || (chain[1] && (chain[1].name || chain[1].code))
      || '-'
    );
  };

  /**
   * Searcher calls fetch(params) with:
   * - pageSize, after, before (cursor pagination)
   * - any filters returned by FilterPane
   *
   * We forward these to the dedicated action.
   *
   * NOTE: backend must understand:
   * - isNonConsented (we hardcode in action)
   * - filters mapping (we keep minimal & safe)
   */
  fetch = (params) => {
    const { fetchNonConsentedHouseholds, modulesManager } = this.props;

    // Keep it minimal: pass through pagination always.
    // Optional filters (tf4No, interviewKey, firstName, lastName, locationId)
    // will be used later once backend supports them.
    fetchNonConsentedHouseholds(modulesManager, {
      ...params,
      pageSize: params?.pageSize ?? this.defaultPageSize,
    });
  };

  headers = () => {
    const { intl } = this.props;
    return [
      // Prefer module-based translations; if missing, openIMIS will show key
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.tf4No'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.headName'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.district'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.village'),
      formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'individual.interviewKey'),
    ];
  };

  itemFormatters = () => [
    // TF4 Number (from raw payload)
    (individual) => {
      const raw = this.getRaw(individual);
      return raw?.TF4_NO || raw?.tf4_no || raw?.tf4No || '-';
    },

    // Head Name (stub person first/last)
    (individual) => `${individual?.firstName || ''} ${individual?.lastName || ''}`.trim() || '-',

    // District (from location chain)
    (individual) => this.getDistrictName(individual),

    // Village (location itself)
    (individual) => this.getVillageName(individual),

    // Interview Key (from raw payload)
    (individual) => {
      const raw = this.getRaw(individual);
      return raw?.interview__key || raw?.interviewKey || raw?.interview_key || '-';
    },
  ];

  rowIdentifier = (individual) => individual.id;

  render() {
    const {
      intl,
      nonConsentedHouseholds,
      nonConsentedHouseholdsTotalCount,
      fetchingNonConsentedHouseholds,
      fetchedNonConsentedHouseholds,
      errorNonConsentedHouseholds,
    } = this.props;

    return (
      <Searcher
        module="individual"
        items={nonConsentedHouseholds}
        itemsPageInfo={{ totalCount: nonConsentedHouseholdsTotalCount }}
        fetchingItems={fetchingNonConsentedHouseholds}
        fetchedItems={fetchedNonConsentedHouseholds}
        errorItems={errorNonConsentedHouseholds}
        tableTitle={formatMessageWithValues(
          intl,
          INDIVIDUAL_MODULE_NAME,
          'nonConsentedHouseholds.searcherTitle',
          { count: nonConsentedHouseholdsTotalCount || 0 },
        )}
        headers={this.headers}
        itemFormatters={this.itemFormatters}
        fetch={this.fetch}
        rowsPerPageOptions={this.rowsPerPageOptions}
        defaultPageSize={this.defaultPageSize}
        rowIdentifier={this.rowIdentifier}
        // ✅ show filter/search UI above the table
        FilterPane={NonConsentedHouseholdsFilter}
      />
    );
  }
}

const mapStateToProps = (state) => ({
  nonConsentedHouseholds: state.individual.nonConsentedHouseholds,
  nonConsentedHouseholdsTotalCount: state.individual.nonConsentedHouseholdsTotalCount,
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
