import React from 'react';
import { Grid } from '@material-ui/core';
import {
	PublishedComponent,
	useModulesManager,
	useTranslations,
} from '@openimis/fe-core';
import PmtClassPicker from '../pickers/PmtClassPicker';

export default function EligibleIndividualsReport({ values, setValues }) {
	const modulesManager = useModulesManager();
	const { formatMessage } = useTranslations('core', modulesManager);

	return (
		<Grid container direction='column' spacing={1}>
			<Grid item>
				<PmtClassPicker
					value={null}
					onChange={(pmtClass) => setValues({ ...values, pmtClass })}
				/>
			</Grid>

			<Grid item>
				<PublishedComponent
					pubRef='location.LocationPicker'
					onChange={(region) =>
						setValues({ ...values, region, district: null })
					}
					value={values.region}
					locationLevel={0}
					label={formatMessage('RegistersStatusReport.region')}
				/>
			</Grid>

			<Grid item>
				<PublishedComponent
					pubRef='location.LocationPicker'
					onChange={(district) => setValues({ ...values, district })}
					value={values.district}
					parentLocation={values.region}
					locationLevel={1}
					label={formatMessage('RegistersStatusReport.district')}
				/>
			</Grid>

			<Grid item>
				<PublishedComponent
					pubRef='location.LocationPicker'
					onChange={(ward) => setValues({ ...values, ward })}
					value={values.ward}
					parentLocation={values.district}
					locationLevel={2}
					label={formatMessage('location.locationType.2')}
				/>
			</Grid>

			<Grid item>
				<PublishedComponent
					pubRef='location.LocationPicker'
					onChange={(village) => setValues({ ...values, village })}
					value={values.village}
					parentLocation={values.ward}
					locationLevel={3}
					label={formatMessage('location.locationType.3')}
				/>
			</Grid>
		</Grid>
	);
}
