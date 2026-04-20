import React, { useEffect, useState } from 'react';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { FormattedMessage } from '@openimis/fe-core';

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  table: theme.table,
  title: theme.paper.title,
  tableDisabledCell: theme.table.disabledCell,
  checkboxCell: {
    textAlign: 'center',
  },
  strikethrough: {
    textDecoration: 'line-through',
  },
}));

function normalizeIndividualRow(item) {
  const individual = item?.individual || {};
  return {
    ...item,
    ...individual,
    ...(item?.json_ext || {}),
    individual: individual.uuid || item?.uuid,
    individualId: item?.uuid || individual.uuid,
  };
}

function IndividualDeduplicationTaskDisplay({ businessData, setAdditionalData, jsonExt }) {
  const classes = useStyles();
  const [excludedRows, setExcludedRows] = useState([]);
  const completedData = jsonExt?.additional_resolve_data
    ? Object.values(jsonExt.additional_resolve_data)[0]
    : null;

  const rows = (businessData?.ids || []).map(normalizeIndividualRow);
  const headers = businessData?.headers || ['individual', 'first_name', 'last_name', 'dob', 'location'];

  useEffect(() => {
    const individualIds = rows
      .filter((_, index) => !excludedRows.includes(index))
      .map((row) => row.individualId);
    const escapedIndividualIds = JSON.stringify(individualIds).replace(/"/g, '\\"');
    const additionalDataString = `{\\"values\\": {},\\"individualIds\\": ${escapedIndividualIds}}`;
    setAdditionalData(additionalDataString);
  }, [excludedRows, rows.length]);

  const toggleExcluded = (rowIndex) => {
    if (rowIndex === 0 || completedData) return;
    setExcludedRows((current) => (
      current.includes(rowIndex)
        ? current.filter((idx) => idx !== rowIndex)
        : [...current, rowIndex]
    ));
  };

  const isExcluded = (rowIndex) => excludedRows.includes(rowIndex) || Boolean(completedData);

  if (!businessData) return null;

  return (
    <div>
      <Typography className={classes.title} style={{ textAlign: 'center' }}>
        {JSON.stringify(businessData.column_values)}
        {', count: '}
        {businessData.count}
      </Typography>
      <TableContainer className={classes.paper}>
        <Table size="small" className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell className={classes.checkboxCell}>
                <FormattedMessage module="deduplication" id="BeneficiaryDuplicatesTable.merge.header" />
              </TableCell>
              {headers.map((header) => (
                <TableCell key={header}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.individualId || rowIndex}>
                <TableCell className={classes.checkboxCell}>
                  {rowIndex === 0 ? (
                    <FormattedMessage module="deduplication" id="BeneficiaryDuplicatesTable.oldest" />
                  ) : (
                    <Checkbox
                      color="primary"
                      checked={isExcluded(rowIndex)}
                      disabled={Boolean(completedData)}
                      onChange={() => toggleExcluded(rowIndex)}
                    />
                  )}
                </TableCell>
                {headers.map((header) => (
                  <TableCell
                    key={header}
                    className={`${isExcluded(rowIndex) ? classes.tableDisabledCell : ''} ${
                      row.is_deleted ? classes.strikethrough : ''
                    }`}
                  >
                    {row[header] ?? ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

const IndividualDeduplicationTaskTableHeaders = () => [];

const IndividualDeduplicationTaskItemFormatters = () => [
  (businessData, jsonExt, formatterIndex, setAdditionalData) => (
    <IndividualDeduplicationTaskDisplay
      businessData={businessData}
      jsonExt={jsonExt}
      setAdditionalData={setAdditionalData}
    />
  ),
];

export { IndividualDeduplicationTaskTableHeaders, IndividualDeduplicationTaskItemFormatters };
