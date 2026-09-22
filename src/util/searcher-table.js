import { makeStyles } from '@material-ui/core/styles';

// Equal-width columns: table-layout:fixed with no per-column width. Trailing icon columns are
// pinned so they don't take a data-column share. No overflow/ellipsis - long values wrap.
export const searcherTableRules = (actionColumns = 0) => ({
  '& table': { tableLayout: 'fixed' },
  '& table th': { whiteSpace: 'nowrap' },
  ...(actionColumns > 0 ? {
    [`& table th:nth-last-child(-n+${actionColumns}), `
    + `& table td:nth-last-child(-n+${actionColumns})`]: {
      width: 56, paddingLeft: 0, paddingRight: 0, textAlign: 'center',
    },
  } : {}),
});

// For function components, where the action-column count depends on rights.
export const useSearcherTable = makeStyles(() => ({
  root: ({ actionColumns = 0 } = {}) => searcherTableRules(actionColumns),
}));
