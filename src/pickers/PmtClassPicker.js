import React from 'react';
import { ConstantBasedPicker } from '@openimis/fe-core';

function PmtClassPicker(props) {
	return (
		<ConstantBasedPicker
			module='individual'
			label='pmtClassPicker'
			constants={['poor', 'not_poor']}
			withNull={true}
			onChange={props.onChange}
			value={props.value}
			nullLabel={'All'}
			withLabel={true}
		/>
	);
}

export default PmtClassPicker;
