import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid,
} from '@material-ui/core';
import { injectIntl } from 'react-intl';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { formatMessage, TextInput } from '@openimis/fe-core';
import { INDIVIDUAL_MODULE_NAME } from '../../constants';

const styles = (theme) => ({
  item: theme.paper.item,
});

export const NO_VALUE = '—';

function ReadOnlyFieldsDialog({ intl, classes, fields }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = (id) => formatMessage(intl, INDIVIDUAL_MODULE_NAME, id);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outlined" style={{ border: '0px', marginTop: '6px' }}>
        {t('individual.additonalFields.showAdditionalFields')}
      </Button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{ style: { width: 1200, maxWidth: 1200, maxHeight: 900 } }}
      >
        <DialogTitle style={{ marginTop: '10px' }}>{t('individual.additonalFields.label')}</DialogTitle>
        <DialogContent>
          <div style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}>
            <Grid container className={classes.item}>
              {fields.map(([label, value]) => (
                <Grid item xs={6} className={classes.item} key={label}>
                  <TextInput
                    module={INDIVIDUAL_MODULE_NAME}
                    label={label}
                    value={value === null || value === undefined || value === '' ? NO_VALUE : String(value)}
                    readOnly
                  />
                </Grid>
              ))}
            </Grid>
          </div>
        </DialogContent>
        <DialogActions style={{ justifyContent: 'flex-start', padding: '16px 26px' }}>
          <Button onClick={() => setIsOpen(false)} variant="outlined" autoFocus>
            {t('individual.additonalFields.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default injectIntl(withTheme(withStyles(styles)(ReadOnlyFieldsDialog)));
