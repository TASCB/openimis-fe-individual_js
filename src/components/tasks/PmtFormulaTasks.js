import React from 'react';
import { FormattedMessage } from '@openimis/fe-core';

const coef = (data, key) => {
  const f = data?.formula || {};
  const v = f[key];
  return v === undefined || v === null ? '-' : String(v);
};

const PmtFormulaTaskTableHeaders = () => [
  <FormattedMessage module="individual" id="pmt.formula.field.cutoff" />,
  <FormattedMessage module="individual" id="pmt.formula.field.intercept" />,
  <FormattedMessage module="individual" id="pmt.formula.field.household_size_coef" />,
  <FormattedMessage module="individual" id="pmt.formula.field.working_age_coef" />,
  <FormattedMessage module="individual" id="pmt.formula.field.urban_coef" />,
  <FormattedMessage module="individual" id="pmt.formula.assets.count" />,
];

const PmtFormulaTaskItemFormatters = () => [
  (data) => coef(data, 'cutoff'),
  (data) => coef(data, 'intercept'),
  (data) => coef(data, 'household_size_coef'),
  (data) => coef(data, 'working_age_coef'),
  (data) => coef(data, 'urban_coef'),
  (data) => Object.keys(data?.formula?.assets || {}).length,
];

export { PmtFormulaTaskTableHeaders, PmtFormulaTaskItemFormatters };
