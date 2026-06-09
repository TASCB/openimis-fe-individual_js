import React from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button,
} from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';
import { INDIVIDUAL_MODULE_NAME } from '../../constants';

/**
 * Confirmation dialog for PMT configuration changes
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is open
 * @param {Function} props.onConfirm - Called when user confirms
 * @param {Function} props.onCancel - Called when user cancels
 * @param {Object} props.config - Configuration being confirmed
 * @param {string} props.config.districtName - Name of selected district
 * @param {string|number} props.config.pmtCutoff - PMT cutoff value
 * @param {boolean} props.disabled - Whether buttons should be disabled
 */
function PmtConfirmationDialog({
  open,
  onConfirm,
  onCancel,
  config,
  disabled = false,
  titleKey = 'pmt.confirm.title',
  messageKey = 'pmt.confirm.message',
  confirmLabelKey = 'pmt.confirm.yes',
  cancelLabelKey = 'pmt.confirm.no',
}) {
  const intl = useIntl();

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {formatMessage(intl, INDIVIDUAL_MODULE_NAME, titleKey)}
      </DialogTitle>
      <DialogContent>
        <Typography>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, messageKey)
            .replace('{districtName}', config?.districtName || 'selected')
            .replace('{cutoff}', config?.pmtCutoff || 'N/A')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="default" disabled={disabled}>
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, cancelLabelKey)}
        </Button>
        <Button
          onClick={onConfirm}
          color="primary"
          variant="contained"
          disabled={disabled}
        >
          {formatMessage(intl, INDIVIDUAL_MODULE_NAME, confirmLabelKey)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PmtConfirmationDialog;
