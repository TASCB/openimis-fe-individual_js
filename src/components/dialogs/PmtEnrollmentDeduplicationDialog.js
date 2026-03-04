import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useModulesManager, Contributions, formatMessage } from '@openimis/fe-core';
import { Button } from '@material-ui/core';
import { INDIVIDUAL_MODULE_NAME } from '../../constants';

/**
 * Component for triggering deduplication of PMT enrollments
 * Renders deduplication contributions if they are available
 */
function PmtEnrollmentDeduplicationDialog({
  households = [],
  onDeduplicationComplete,
}) {
  const intl = useIntl();
  const modulesManager = useModulesManager();
  const [open, setOpen] = useState(false);

  // Create a mock benefit plan object for deduplication
  // PMT enrollments don't have a traditional benefit plan, but deduplication
  // expects one, so we create a minimal one with household data schema
  const mockBenefitPlan = {
    id: 'pmt-enrollment',
    name: 'PMT Enrollment Deduplication',
    beneficiaryDataSchema: JSON.stringify({
      properties: {
        groupCode: { type: 'string' },
        headName: { type: 'string' },
        locationName: { type: 'string' },
        pmtScore: { type: 'number' },
        pmtClass: { type: 'string' },
      },
    }),
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => setOpen(true)}
        disabled={!households || households.length === 0}
        style={{ marginRight: '8px' }}
      >
        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, 'pmt.button.deduplicate')}
      </Button>
      {open && (
        <Contributions
          contributionKey="deduplication.deduplicationFieldSelectionDialog"
          intl={intl}
          benefitPlan={mockBenefitPlan}
        />
      )}
    </>
  );
}

export default PmtEnrollmentDeduplicationDialog;
