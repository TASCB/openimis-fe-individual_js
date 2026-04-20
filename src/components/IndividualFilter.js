import React, { useState } from 'react';
import { Button } from '@material-ui/core';
import { injectIntl } from 'react-intl';
import { formatMessage } from '@openimis/fe-core';
import Filter from './Filter';
import IndividualDeduplicationDialog from './dialogs/IndividualDeduplicationDialog';
import { CONTAINS_LOOKUP } from '../constants';

function IndividualFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const [deduplicationDialogOpen, setDeduplicationDialogOpen] = useState(false);

  const filterFields = [
    { name: 'firstName', label: 'individual.firstName', lookup: CONTAINS_LOOKUP },
    { name: 'lastName', label: 'individual.lastName', lookup: CONTAINS_LOOKUP },
  ];

  const checkboxFields = [
    { name: 'isDeleted', label: 'isDeleted' },
    { name: 'location_Isnull', label: 'hasNoLocation' },
  ];

  const handleDeduplicationOpen = () => {
    setDeduplicationDialogOpen(true);
  };

  const handleDeduplicationClose = () => {
    setDeduplicationDialogOpen(false);
  };

  const handleMergeComplete = () => {
    handleDeduplicationClose();
  };

  const dedupButton = (
    <Button
      onClick={handleDeduplicationOpen}
      variant="outlined"
      style={{
        border: '0px',
        marginTop: '6px',
      }}
    >
      {formatMessage(intl, 'deduplication', 'deduplicate')}
    </Button>
  );

  return (
    <>
      <Filter
        intl={intl}
        classes={classes}
        filters={filters}
        onChangeFilters={onChangeFilters}
        filterFields={filterFields}
        checkboxFields={checkboxFields}
        dedupButton={dedupButton}
      />

      <IndividualDeduplicationDialog
        intl={intl}
        open={deduplicationDialogOpen}
        onClose={handleDeduplicationClose}
        onMergeComplete={handleMergeComplete}
      />
    </>
  );
}

export default injectIntl(IndividualFilter);
