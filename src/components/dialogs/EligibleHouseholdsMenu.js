import React from 'react';
import {
  MenuItem,
} from '@material-ui/core';
import { injectIntl } from 'react-intl';
import {
  useModulesManager,
  formatMessage,
  historyPush,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

const styles = (theme) => ({
  item: theme.paper.item,
});

function EligibleHouseholdsMenu({
  intl,
  eligibleHouseholds,
  fetchingEligibleHouseholds,
}) {
  const modulesManager = useModulesManager();

  const enrollmentPageUrl = () => {
    return `${modulesManager.getRef('individual.route.groupEnrollment')}`;
  };

  const handleDownload = (e) => {
    e.preventDefault();
    if (eligibleHouseholds && eligibleHouseholds.length > 0 && !fetchingEligibleHouseholds) {
      // Prepare CSV data
      const headers = [
        'Code',
        'Head Name',
        'PMT Score',
        'PMT Class',
        ...Array.from({ length: 4 }, (_, i) => `Location ${i}`),
      ];
      const rows = eligibleHouseholds.map((group) => [
        group?.code || '',
        group?.head ? `${group?.head?.firstName || ''} ${group?.head?.lastName || ''}`.trim() : '',
        group?.pmtScoreHousehold ?? '',
        group?.pmtClassHousehold || '',
        ...Array.from({ length: 4 }, (_, i) => ''),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'eligible-households.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <MenuItem onClick={handleDownload} disabled={!eligibleHouseholds || eligibleHouseholds.length === 0 || fetchingEligibleHouseholds}>
        <a href="#" style={{ color: 'inherit', textDecoration: 'none', width: '100%', display: 'block' }} onClick={(e) => e.preventDefault()}>
          {formatMessage(intl, 'individual', 'button.download')}
        </a>
      </MenuItem>
      <MenuItem>
        <a href={enrollmentPageUrl()} style={{ color: 'inherit', textDecoration: 'none', width: '100%', display: 'block' }}>
          {formatMessage(intl, 'individual', 'button.enrollment')}
        </a>
      </MenuItem>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  eligibleHouseholds: state.individual.eligibleHouseholds,
  fetchingEligibleHouseholds: state.individual.fetchingEligibleHouseholds,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({}, dispatch);

export default injectIntl(
  withTheme(
    withStyles(styles)(
      connect(mapStateToProps, mapDispatchToProps)(EligibleHouseholdsMenu),
    ),
  ),
);
