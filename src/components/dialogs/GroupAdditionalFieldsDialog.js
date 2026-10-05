import React from 'react';
import ReadOnlyFieldsDialog from './ReadOnlyFieldsDialog';

const personName = (p) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : '');

export const groupJsonExt = (group) => {
  const raw = group?.jsonExt;
  if (!raw) return {};
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const groupHeadName = (group) => personName(group?.head) || groupJsonExt(group).head || '';
export const groupRepName = (group) => groupJsonExt(group).primary_recipient || '';

function GroupAdditionalFieldsDialog({ group }) {
  if (!group?.id) return null;
  const ext = groupJsonExt(group);
  const score = ext.pmt_score_household;
  return (
    <ReadOnlyFieldsDialog
      fields={[
        ['group.code', group.code],
        ['group.hhrep', groupRepName(group)],
        ['group.head', groupHeadName(group)],
        ['group.headPhone', group.head?.phoneNumber],
        ['group.pmtClassHousehold', ext.pmt_class_household],
        ['group.pmtScoreHousehold', score === null || score === undefined || score === '' ? '' : Number(score).toFixed(2)],
        ['group.interviewKey', ext.interview_key],
        ['group.locationName', group.location?.name || ext.location_name],
      ]}
    />
  );
}

export default GroupAdditionalFieldsDialog;
