import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

export const useFixedSearcherLayout = makeStyles(() => ({
  root: {
    '& table': { tableLayout: 'fixed', minWidth: '100%' },
    '& table th, & table td': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    '& table th:first-child, & table td:first-child': { width: 200 },
  },
}));

export const applyNumberCircle = (number) => (
  <div style={{
    color: '#ffffff',
    backgroundColor: '#006273',
    borderRadius: '50%',
    padding: '5px',
    minWidth: '40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    width: '20px',
    height: '45px',
    marginTop: '7px',
  }}
  >
    {number}
  </div>
);

export const LOC_LEVELS = 4;
export const locationAtLevel = (lowestLevelLoc, level) => {
  let location = lowestLevelLoc;
  let levelDiff = level;

  while (levelDiff > 0 && location) {
    location = location.parent;
    levelDiff -= 1;
  }

  return location ? location.name : '';
};
