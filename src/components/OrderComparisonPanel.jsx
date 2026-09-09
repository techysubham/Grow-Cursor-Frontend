import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';
import CollapsibleSection from './CollapsibleSection.jsx';
import FilterScopeBadge from './charts/FilterScopeBadge.jsx';
import { BRAND_DARK } from '../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../theme/appTheme.js';
import { yellowFilledButtonSx } from '../theme/tableStyles.js';
import {
  MARKETPLACES,
  SERIES_PALETTE,
  SURFACE,
  axisTick,
  chartToggleSx,
  formatAxisDate,
  gridStroke,
} from './charts/chartTokens.jsx';

/**
 * OrderComparisonPanel
 * Side-by-side comparison of two (seller, date range) selections — the same
 * seller across two periods, or two different sellers, in the same or in
 * different periods.
 *
 * The two ranges can differ in length and in calendar position, so a shared
 * date axis would be meaningless. The chart is indexed by day-of-period
 * ("Day 1", "Day 2", …) and the tooltip names each side's real date.
 *
 * Props:
 *   sellers          — roster from /sellers/all ([{ _id, user: { username } }])
 *   marketplace      — applied marketplace filter from the page ('' for all)
 *   excludeClient    — page toggle; kept in sync so totals match the table
 *   excludeLowValue  — page toggle
 */

const SIDE_A = SERIES_PALETTE[0]; // blue
const SIDE_B = SERIES_PALETTE[1]; // orange
const MAX_RANGE_DAYS = 366;

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

// Date maths runs in UTC on the YYYY-MM-DD strings so a DST boundary inside a
// range can never add or drop a day. Exported for unit testing.
export function shiftDays(dateString, days) {
  const parsed = Date.parse(`${dateString}T00:00:00Z`);
  if (Number.isNaN(parsed)) return dateString;
  return toDateInput(new Date(parsed + days * 86400000));
}

export function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

/** Every date in the range, so a day with no orders is a zero and not a gap. */
export function eachDate(from, to) {
  const span = daysBetween(from, to);
  if (span < 1) return [];
  return Array.from({ length: Math.min(span, MAX_RANGE_DAYS) }, (_, index) => shiftDays(from, index));
}

/** Initial A/B state: A is the last 7 days, B the 7 days before it. Exported for unit testing. */
export function defaultSides(marketplace) {
  const today = toDateInput(new Date());
  const aFrom = shiftDays(today, -6);
  return {
    a: { sellerId: '', marketplace, from: aFrom, to: today },
    b: { sellerId: '', marketplace, from: shiftDays(aFrom, -7), to: shiftDays(aFrom, -1) },
  };
}

function ComparisonTooltip({ active, payload, labels }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};

  const lines = [
    { key: 'a', color: SIDE_A, label: labels.a, value: row.a, date: row.aDate },
    { key: 'b', color: SIDE_B, label: labels.b, value: row.b, date: row.bDate },
  ].filter((line) => line.value !== null && line.value !== undefined);

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.75,
        py: 1.25,
        minWidth: 200,
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
        border: '1px solid',
        borderColor: alpha(BRAND_DARK, 0.08),
        boxShadow: '0 18px 34px rgba(15, 23, 42, 0.14)',
        backgroundColor: SURFACE,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {row.label}
      </Typography>

      <Stack spacing={1} sx={{ mt: 1 }}>
        {lines.map((line) => (
          <Box key={line.key}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: line.color, flexShrink: 0 }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1, pr: 1.5 }}>
                {line.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
              >
                {line.value}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2.5, fontSize: 10 }}>
              {formatAxisDate(line.date, { weekday: 'short', year: 'numeric' })}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

function DeltaChip({ current, baseline }) {
  if (baseline === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        no baseline
      </Typography>
    );
  }

  const change = ((current - baseline) / baseline) * 100;
  const rounded = Math.round(change * 10) / 10;
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const Icon = isUp ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      {!isFlat && <Icon sx={{ fontSize: 14, color: 'text.secondary' }} />}
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {isFlat ? 'no change' : `${isUp ? '+' : ''}${rounded}%`}
      </Typography>
    </Stack>
  );
}

function SideControls({ title, color, side, sellers, onChange, extraAction }) {
  const span = daysBetween(side.from, side.to);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
        border: '1px solid',
        borderColor: alpha(BRAND_DARK, 0.1),
        borderLeft: '4px solid',
        borderLeftColor: color,
        background: dashboardSignatureTokens.surfaces.metricCard,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        flexWrap="wrap"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: color,
              color: SURFACE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {title}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {span > 0 ? `${span} ${span === 1 ? 'day' : 'days'}` : 'invalid range'}
          </Typography>
        </Stack>
        {extraAction}
      </Stack>

      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl size="small" fullWidth>
            <InputLabel>Seller</InputLabel>
            <Select
              value={side.sellerId}
              label="Seller"
              onChange={(event) => onChange({ ...side, sellerId: event.target.value })}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || 'Unknown'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={side.marketplace}
              label="Marketplace"
              onChange={(event) => onChange({ ...side, marketplace: event.target.value })}
            >
              <MenuItem value="">All Marketplaces</MenuItem>
              {MARKETPLACES.map((marketplace) => (
                <MenuItem key={marketplace.key} value={marketplace.key}>
                  {marketplace.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <TextField
            label="From"
            type="date"
            size="small"
            fullWidth
            value={side.from}
            onChange={(event) => onChange({ ...side, from: event.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            fullWidth
            value={side.to}
            onChange={(event) => onChange({ ...side, to: event.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            Last
          </Typography>
          {[7, 14, 30].map((days) => (
            <Button
              key={days}
              size="small"
              onClick={() => {
                const to = toDateInput(new Date());
                onChange({ ...side, from: shiftDays(to, -(days - 1)), to });
              }}
              sx={{
                minWidth: 0,
                px: 1,
                py: 0.25,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              {`${days}d`}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function MetricRow({ label, aValue, bValue, showDelta = true }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ flex: 1, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      >
        {aValue}
      </Typography>
      <Typography
        variant="body2"
        sx={{ flex: 1, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      >
        {bValue}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {showDelta ? <DeltaChip current={aValue} baseline={bValue} /> : null}
      </Box>
    </Stack>
  );
}

export default function OrderComparisonPanel({
  sellers = [],
  marketplace = '',
  excludeClient = true,
  excludeLowValue = true,
}) {
  // Seeded from the page's marketplace filter, then owned by this panel so each
  // side can target a different marketplace.
  const [sides, setSides] = useState(() => defaultSides(marketplace));
  const [chartType, setChartType] = useState('wave');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const sellerName = (sellerId) => {
    if (!sellerId) return 'All sellers';
    const match = sellers.find((seller) => seller._id === sellerId);
    return match?.user?.username || 'Unknown seller';
  };

  const marketplaceName = (key) =>
    MARKETPLACES.find((marketplaceOption) => marketplaceOption.key === key)?.label || 'All marketplaces';

  const sideLabel = (side) =>
    [sellerName(side.sellerId), marketplaceName(side.marketplace), `${formatAxisDate(side.from)} – ${formatAxisDate(side.to)}`].join(' · ');

  const isSideValid = (side) => Boolean(side.from && side.to && daysBetween(side.from, side.to) >= 1);
  const canCompare = isSideValid(sides.a) && isSideValid(sides.b);

  // Set B to the period immediately before A, with the same length.
  const usePreviousPeriod = () => {
    const span = daysBetween(sides.a.from, sides.a.to);
    if (span < 1) return;
    const to = shiftDays(sides.a.from, -1);
    setSides((prev) => ({
      ...prev,
      b: { ...prev.b, from: shiftDays(to, -(span - 1)), to },
    }));
  };

  const fetchSide = async (side) => {
    const params = {
      startDate: side.from,
      endDate: side.to,
      excludeClient,
      excludeLowValue,
    };
    if (side.sellerId) params.sellerId = side.sellerId;
    if (side.marketplace) params.marketplace = side.marketplace;

    const { data } = await api.get('/orders/daily-statistics', { params });

    const byDate = new Map();
    (data || []).forEach((stat) => {
      byDate.set(stat.date, (byDate.get(stat.date) || 0) + stat.totalOrders);
    });

    const dates = eachDate(side.from, side.to);
    return {
      dates,
      counts: dates.map((date) => byDate.get(date) || 0),
    };
  };

  const handleCompare = async () => {
    try {
      setLoading(true);
      setError('');

      const [a, b] = await Promise.all([fetchSide(sides.a), fetchSide(sides.b)]);

      setResult({
        a,
        b,
        labels: {
          a: sideLabel(sides.a),
          b: sideLabel(sides.b),
        },
      });
    } catch (err) {
      console.error('Error comparing order periods:', err);
      setError('Failed to load the comparison. Please try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const chartRows = useMemo(() => {
    if (!result) return [];
    const length = Math.max(result.a.dates.length, result.b.dates.length);

    return Array.from({ length }, (_, index) => ({
      label: `Day ${index + 1}`,
      a: index < result.a.counts.length ? result.a.counts[index] : null,
      b: index < result.b.counts.length ? result.b.counts[index] : null,
      aDate: result.a.dates[index],
      bDate: result.b.dates[index],
    }));
  }, [result]);

  const summary = useMemo(() => {
    if (!result) return null;

    const describe = (sideResult) => {
      const total = sideResult.counts.reduce((sum, count) => sum + count, 0);
      const days = sideResult.counts.length;
      const peakIndex = sideResult.counts.reduce(
        (best, count, index) => (count > sideResult.counts[best] ? index : best),
        0
      );

      return {
        total,
        days,
        average: days > 0 ? Math.round((total / days) * 10) / 10 : 0,
        peak: days > 0 ? sideResult.counts[peakIndex] : 0,
        peakDate: sideResult.dates[peakIndex],
      };
    };

    return { a: describe(result.a), b: describe(result.b) };
  }, [result]);

  const renderChart = () => {
    const grid = <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />;
    const xAxis = (
      <XAxis
        dataKey="label"
        tick={axisTick}
        axisLine={false}
        tickLine={false}
        minTickGap={16}
        interval="preserveStartEnd"
      />
    );
    const yAxis = <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />;
    const tooltip = (
      <Tooltip
        cursor={
          chartType === 'bar'
            ? { fill: alpha(BRAND_DARK, 0.04) }
            : { stroke: alpha(BRAND_DARK, 0.28), strokeWidth: 1, strokeDasharray: '4 4' }
        }
        content={<ComparisonTooltip labels={result.labels} />}
      />
    );

    // One point per side means a wave has nothing to connect.
    const singlePoint = chartRows.length === 1;

    if (chartType === 'bar' || singlePoint) {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            <Bar dataKey="a" name="A" fill={SIDE_A} maxBarSize={28} radius={[4, 4, 0, 0]} />
            <Bar dataKey="b" name="B" fill={SIDE_B} maxBarSize={28} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id="compareFillA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SIDE_A} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SIDE_A} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="compareFillB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SIDE_B} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SIDE_B} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          <Area
            type="monotone"
            dataKey="a"
            name="A"
            stroke={SIDE_A}
            strokeWidth={2}
            fill="url(#compareFillA)"
            dot={chartRows.length <= 14 ? { r: 4, fill: SIDE_A, stroke: SURFACE, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: SIDE_A, stroke: SURFACE, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="b"
            name="B"
            stroke={SIDE_B}
            strokeWidth={2}
            fill="url(#compareFillB)"
            dot={chartRows.length <= 14 ? { r: 4, fill: SIDE_B, stroke: SURFACE, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: SIDE_B, stroke: SURFACE, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  const headerActions = (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={chartType}
      onChange={(event, value) => value && setChartType(value)}
      sx={chartToggleSx}
    >
      <ToggleButton value="wave">Wave</ToggleButton>
      <ToggleButton value="bar">Bars</ToggleButton>
    </ToggleButtonGroup>
  );

  return (
    <CollapsibleSection
      title="Compare periods"
      subtitle="Put any two seller / marketplace / date-range selections side by side — the same seller across two periods, or two different sellers."
      storageKey="compare"
      defaultOpen={false}
      badge={
        <FilterScopeBadge
          scope="own"
          help="Date, seller and marketplace come from this card's own A/B controls, not the top filter bar. The Exclude Client and Exclude < $3 toggles at the top do still apply."
        />
      }
      actions={headerActions}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <SideControls
          title="A"
          color={SIDE_A}
          side={sides.a}
          sellers={sellers}
          onChange={(next) => setSides((prev) => ({ ...prev, a: next }))}
        />
        <SideControls
          title="B"
          color={SIDE_B}
          side={sides.b}
          sellers={sellers}
          onChange={(next) => setSides((prev) => ({ ...prev, b: next }))}
          extraAction={
            <Button
              size="small"
              startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
              onClick={usePreviousPeriod}
              disabled={!isSideValid(sides.a)}
              sx={{ textTransform: 'none' }}
            >
              Period before A
            </Button>
          }
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={1.5}
        sx={{ mt: 2 }}
      >
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CompareArrowsIcon />}
          onClick={handleCompare}
          disabled={loading || !canCompare}
          sx={{ ...yellowFilledButtonSx, height: 40, flexShrink: 0 }}
        >
          Compare
        </Button>

        <Button
          size="small"
          startIcon={<SwapHorizIcon sx={{ fontSize: 18 }} />}
          onClick={() => setSides((prev) => ({ a: prev.b, b: prev.a }))}
          disabled={loading}
          sx={{ textTransform: 'none', height: 40, flexShrink: 0 }}
        >
          Swap A / B
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {!canCompare ? (
          <Typography variant="caption" color="text.secondary">
            Set a valid From/To on both sides.
          </Typography>
        ) : (
          // These two come from the page and silently change the numbers, so
          // the card says so rather than leaving it to be discovered.
          <Typography variant="caption" color="text.secondary">
            Inherited from the top bar: {excludeClient ? 'excluding client' : 'including client'} ·{' '}
            {excludeLowValue ? 'excluding orders under $3' : 'including orders under $3'}
          </Typography>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {!result && !error && (
        <Box
          sx={{
            mt: 2,
            py: 4,
            px: 2,
            textAlign: 'center',
            borderRadius: `${dashboardSignatureTokens.radius.card}px`,
            border: '1px dashed',
            borderColor: alpha(BRAND_DARK, 0.12),
            background: dashboardSignatureTokens.surfaces.emptyState,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Pick two selections above and hit <strong>Compare</strong> to chart them against each other.
          </Typography>
        </Box>
      )}

      {result && summary && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2.5} sx={{ mb: 2 }}>
            {[
              { color: SIDE_A, label: result.labels.a },
              { color: SIDE_B, label: result.labels.b },
            ].map((item) => (
              <Stack key={item.label} direction="row" alignItems="center" spacing={0.75}>
                <Box
                  sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: item.color, flexShrink: 0 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {item.label}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {renderChart()}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Aligned by day of period, so ranges of different lengths or dates can be laid over each other. Hover a
            point for the real dates.
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Stack direction="row" sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, fontWeight: 700 }}>
                Metric
              </Typography>
              <Typography
                variant="caption"
                sx={{ flex: 1, fontWeight: 700, textAlign: 'right', color: SIDE_A }}
              >
                A
              </Typography>
              <Typography
                variant="caption"
                sx={{ flex: 1, fontWeight: 700, textAlign: 'right', color: SIDE_B }}
              >
                B
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1, fontWeight: 700, textAlign: 'right' }}
              >
                A vs B
              </Typography>
            </Stack>

            <MetricRow label="Total orders" aValue={summary.a.total} bValue={summary.b.total} />
            <MetricRow label="Average per day" aValue={summary.a.average} bValue={summary.b.average} />
            <MetricRow label="Best day" aValue={summary.a.peak} bValue={summary.b.peak} />
            <MetricRow label="Days in range" aValue={summary.a.days} bValue={summary.b.days} showDelta={false} />
          </Box>
        </Box>
      )}
    </CollapsibleSection>
  );
}
