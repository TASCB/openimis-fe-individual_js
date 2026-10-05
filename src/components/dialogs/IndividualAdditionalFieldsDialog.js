import React from 'react';
import { useIntl } from 'react-intl';
import { formatMessage } from '@openimis/fe-core';
import ReadOnlyFieldsDialog from './ReadOnlyFieldsDialog';
import { INDIVIDUAL_MODULE_NAME } from '../../constants';

function IndividualAdditionalFieldsDialog({ individual }) {
  const intl = useIntl();
  if (!individual?.id) return null;
  const t = (id) => formatMessage(intl, INDIVIDUAL_MODULE_NAME, id);
  const yesNo = (v) => (v === null || v === undefined ? '' : t(v ? 'individual.yes' : 'individual.no'));
  const status = individual.status && t(`individual.memberStatus.${individual.status}`);
  return (
    <ReadOnlyFieldsDialog
      fields={[
        ['individual.dob', individual.dob],
        ['individual.gender', individual.gender],
        ['individual.phoneNumber', individual.phoneNumber],
        ['individual.nin', individual.nin],
        ['individual.isHead', yesNo(individual.isHead)],
        ['individual.isHhrep', yesNo(individual.isHhrep)],
        ['individual.premNumber', individual.premNumber],
        ['individual.status', status],
      ]}
    />
  );
}

export default IndividualAdditionalFieldsDialog;
