import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';

/**
 * Shared chart vocabulary for the Order Analytics charts.
 *
 * The categorical palette is fixed-order and validated for colour-vision
 * deficiency separation against a white chart surface (worst adjacent pair
 * ΔE 9.1 simulated / 19.6 normal vision). Series colours are assigned by slot
 * order and never cycled, so a marketplace keeps its colour when a filter
 * changes the series count. Do not re-order without re-validating.
 */

export const SURFACE = '#ffffff';

export const SERIES_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];

export const MARKETPLACES = [
  { key: 'EBAY_US', label: 'United States', short: 'US', color: SERIES_PALETTE[0] },
  { key: 'EBAY_AU', label: 'Australia', short: 'AU', color: SERIES_PALETTE[1] },
  { key: 'EBAY_CA', label: 'Canada', short: 'CA', color: SERIES_PALETTE[2] },
  { key: 'EBAY_GB', label: 'England', short: 'GB', color: SERIES_PALETTE[3] },
];

// Chart chrome — recessive grid and axes, brand ink.
export const gridStroke = alpha(BRAND_DARK, 0.1);
export const axisInk = alpha(BRAND_DARK, 0.62);
export const labelInk = alpha(BRAND_DARK, 0.72);
// Near-primary ink for category names and values that should read as text
// rather than as chrome.
export const nameInk = alpha(BRAND_DARK, 0.92);
export const axisTick = { fill: axisInk, fontSize: 12 };

export const chartToggleSx = {
  backgroundColor: SURFACE,
  borderRadius: `${dashboardSignatureTokens.radius.control}px`,
  '& .MuiToggleButton-root': {
    px: 1.5,
    py: 0.75,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.8125rem',
    color: 'text.secondary',
    borderColor: alpha(BRAND_DARK, 0.12),
    '&.Mui-selected': {
      backgroundColor: alpha(SERIES_PALETTE[0], 0.1),
      borderColor: alpha(SERIES_PALETTE[0], 0.35),
      color: SERIES_PALETTE[0],
      '&:hover': { backgroundColor: alpha(SERIES_PALETTE[0], 0.16) },
    },
  },
};

export function formatAxisDate(dateString, extra) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...extra,
  }).format(date);
}

export function formatFullDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Shared hover card. `seriesLabels` maps dataKey -> display name. */
export function ChartTooltip({ active, payload, seriesLabels, showTotal = true, titleFor }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};

  const entries = payload
    .filter((entry) => Number(entry.value) > 0)
    .map((entry) => ({
      key: entry.dataKey,
      name: seriesLabels?.[entry.dataKey] || entry.name,
      value: entry.value,
      color: entry.color || entry.fill || entry.payload?.color,
      note: titleFor ? titleFor(entry.dataKey, row) : null,
    }))
    .sort((a, b) => b.value - a.value);

  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  const heading = row.date ? formatFullDate(row.date) : row.label;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.75,
        py: 1.25,
        minWidth: 168,
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
        border: '1px solid',
        borderColor: alpha(BRAND_DARK, 0.08),
        boxShadow: '0 18px 34px rgba(15, 23, 42, 0.14)',
        backgroundColor: SURFACE,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {heading}
      </Typography>

      <Stack spacing={0.5} sx={{ mt: 1 }}>
        {entries.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No orders
          </Typography>
        )}
        {entries.map((entry) => (
          <Box key={entry.key}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '3px',
                  backgroundColor: entry.color,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1, pr: 1.5 }}>
                {entry.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.value}
              </Typography>
            </Stack>
            {entry.note && (
              <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2.5, fontSize: 10 }}>
                {entry.note}
              </Typography>
            )}
          </Box>
        ))}
      </Stack>

      {showTotal && entries.length > 1 && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: alpha(BRAND_DARK, 0.08) }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Total
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
          >
            {total}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
