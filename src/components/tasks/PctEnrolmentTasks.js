import React from 'react';
import { FormattedMessage } from '@openimis/fe-core';

const PctEnrolmentTaskTableHeaders = () => [
  <FormattedMessage module="individual" id="pctEnrolment.task.import" />,
  <FormattedMessage module="individual" id="pctEnrolment.task.households" />,
  <FormattedMessage module="individual" id="pctEnrolment.task.members" />,
  <FormattedMessage module="individual" id="pctEnrolment.task.plan" />,
];

const PctEnrolmentTaskItemFormatters = () => [
  (data, jsonExt) => jsonExt?.source_name,
  (data, jsonExt) => jsonExt?.households,
  (data, jsonExt) => jsonExt?.members,
  (data, jsonExt) => jsonExt?.benefit_plan_code,
];

export { PctEnrolmentTaskTableHeaders, PctEnrolmentTaskItemFormatters };
