import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TuneIcon from '@mui/icons-material/Tune';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';

/**
 * FilterScopeBadge
 * Says where a card's data comes from, so it is never a guess whether the top
 * filter bar drives a card or the card drives itself.
 *
 *   scope="page" — the card renders the page-level query
 *   scope="own"  — the card queries independently, from its own controls
 */

const SCOPES = {
  page: {
    label: 'Top filters',
    Icon: FilterAltIcon,
    help: 'This card shows the date, seller, marketplace and exclusion filters set at the top of the page.',
  },
  own: {
    label: 'Own filters',
    Icon: TuneIcon,
    help: 'This card has its own date, seller and marketplace controls and ignores the ones at the top of the page.',
  },
};

export default function FilterScopeBadge({ scope = 'page', help }) {
  const config = SCOPES[scope] || SCOPES.page;
  const { Icon } = config;

  return (
    <Tooltip title={help || config.help} arrow>
      <Chip
        size="small"
        icon={<Icon sx={{ fontSize: 14 }} />}
        label={config.label}
        sx={{
          height: 22,
          fontSize: '0.6875rem',
          fontWeight: 700,
          borderRadius: `${dashboardSignatureTokens.radius.pill}px`,
          border: '1px solid',
          borderColor: alpha(BRAND_DARK, 0.12),
          backgroundColor: alpha(BRAND_DARK, 0.04),
          color: 'text.secondary',
          '& .MuiChip-icon': { color: 'text.secondary', ml: 0.75 },
        }}
      />
    </Tooltip>
  );
}
