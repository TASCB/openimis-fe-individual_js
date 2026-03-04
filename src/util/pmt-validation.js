/**
 * PMT Configuration Validation Utilities
 */

import { PMT_CUTOFF_MIN, PMT_CUTOFF_MAX } from '../constants';

/**
 * Validate PMT cutoff value
 * @param {number|string} cutoff - The cutoff value to validate
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export function validatePmtCutoff(cutoff) {
  if (cutoff === null || cutoff === undefined || cutoff === '') {
    return {
      isValid: false,
      error: 'PMT cutoff is required',
    };
  }

  const cutoffNum = parseFloat(cutoff);

  if (isNaN(cutoffNum)) {
    return {
      isValid: false,
      error: 'PMT cutoff must be a valid number',
    };
  }

  if (cutoffNum < PMT_CUTOFF_MIN || cutoffNum > PMT_CUTOFF_MAX) {
    return {
      isValid: false,
      error: `PMT cutoff must be between ${PMT_CUTOFF_MIN} and ${PMT_CUTOFF_MAX}`,
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Validate district selection
 * @param {Object} district - The selected district object
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export function validateDistrict(district) {
  if (!district) {
    return {
      isValid: false,
      error: 'Please select a district',
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Validate all PMT configuration fields
 * @param {Object} config - Configuration object
 * @param {number|string} config.pmtCutoff - The PMT cutoff value
 * @param {Object} config.selectedDistrict - The selected district
 * @returns {Object} { isValid: boolean, errors: { field: string | null } }
 */
export function validatePmtConfiguration(config) {
  const cutoffValidation = validatePmtCutoff(config.pmtCutoff);
  const districtValidation = validateDistrict(config.selectedDistrict);

  return {
    isValid: cutoffValidation.isValid && districtValidation.isValid,
    errors: {
      cutoff: cutoffValidation.error,
      district: districtValidation.error,
    },
  };
}
