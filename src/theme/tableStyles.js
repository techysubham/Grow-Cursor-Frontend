/**
 * Shared table style tokens — single source of truth for all admin data tables.
 *
 * Usage:
 *   import { tableHeaderCellSx, tableBodyRowSx, tableContainerSx, tableBodyCellSx } from '../../theme/tableStyles';
 */
import { alpha } from '@mui/material/styles';
import { BRAND_DARK, BRAND_YELLOW } from '../constants/brandTheme.js';
import { dashboardSignatureTokens } from './appTheme.js';

/** Applied to every <TableCell> inside <TableHead> */
export const tableHeaderCellSx = {
  fontWeight: 700,
  fontSize: '0.74rem',
  letterSpacing: 0.55,
  textTransform: 'uppercase',
  color: 'rgba(255, 255, 255, 0.96)',
  backgroundColor: BRAND_DARK,
  borderBottom: 'none',
  whiteSpace: 'nowrap',
  py: 1.75,
  // Ensure TableSortLabel inherits the white colour
  '& .MuiTableSortLabel-root': { color: 'inherit' },
  '& .MuiTableSortLabel-root:hover': { color: 'rgba(255,255,255,0.8)' },
  '& .MuiTableSortLabel-root.Mui-active': { color: 'inherit' },
  '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.55) !important' },
};

/** Applied to every <TableRow> inside <TableBody> */
export const tableBodyRowSx = {
  '& td': {
    borderBottomColor: dashboardSignatureTokens.table.rowBorder,
  },
  '&:nth-of-type(even) td': {
    backgroundColor: dashboardSignatureTokens.table.rowStripe,
  },
  '&:hover td': {
    backgroundColor: `${dashboardSignatureTokens.table.rowHover} !important`,
  },
  '&.Mui-selected td': {
    backgroundColor: `${alpha(BRAND_YELLOW, 0.16)} !important`,
  },
};

/** Applied to every <TableCell> inside <TableBody> */
export const tableBodyCellSx = {
  py: 1.4,
  px: 1.5,
  borderBottom: `1px solid ${dashboardSignatureTokens.table.rowBorder}`,
  whiteSpace: 'nowrap',
};

/** Applied to the <TableContainer> / outer <Paper> wrapping a data table */
export const tableContainerSx = {
  borderRadius: `${dashboardSignatureTokens.radius.card}px`,
  border: '1px solid',
  borderColor: alpha(BRAND_DARK, 0.1),
  boxShadow: dashboardSignatureTokens.shadows.table,
  overflow: 'hidden',
};

/** Row-number index badge used in the first column */
export const tableIndexBadgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: dashboardSignatureTokens.table.indexBadgeBackground,
  color: dashboardSignatureTokens.table.indexBadgeForeground,
  fontWeight: 700,
  fontSize: '0.875rem',
};
