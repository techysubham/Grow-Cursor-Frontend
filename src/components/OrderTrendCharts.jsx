import React, { useMemo, useState } from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CollapsibleSection from './CollapsibleSection.jsx';
import FilterScopeBadge from './charts/FilterScopeBadge.jsx';
import { BRAND_DARK } from '../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../theme/appTheme.js';
import {
  ChartTooltip,
  MARKETPLACES,
  SERIES_PALETTE,
  SURFACE,
  axisTick,
  chartToggleSx,
  formatAxisDate,
  gridStroke,
  labelInk,
  nameInk,
} from './charts/chartTokens.jsx';

/**
 * OrderTrendCharts
 * Visual layer for the Order Analytics page — turns the daily statistics table
 * into day-wise trend charts.
 *
 * Props:
 *   tableData    — [{ date, sellers: { [sellerId]: { sellerUsername, EBAY_US, EBAY_AU, EBAY_CA, EBAY_GB, total } } }]
 *   sellersList  — [[sellerId, sellerUsername]]
 *   onQuickRange — (days) => void; sets the page date filter to the last N days
 */

const TOTAL_COLOR = SERIES_PALETTE[0];

// Sequential blue ramp for the heatmap — one hue, light to dark. Zero gets a
// near-surface neutral so "none" never reads as "a little".
const HEAT_STEPS = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'];
const HEAT_ZERO = '#f2f2ef';
const HEAT_DARK_FROM = 3; // steps at/after this index need light text

function heatStepIndex(value, max) {
  if (!value || max <= 0) return -1;
  return Math.min(HEAT_STEPS.length - 1, Math.floor((value / max) * HEAT_STEPS.length));
}

/**
 * Sellers x days grid, shaded by order count. A sequential ramp has no
 * eight-hue cap, so every seller is shown however many there are.
 */
function SellerHeatmap({ rows, sellers, maxValue }) {
  const [hovered, setHovered] = useState(null);
  const showValues = rows.length <= 14;
  const cellMin = showValues ? 34 : 22;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', minHeight: 20 }}>
          {hovered ? (
            <>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {hovered.username}
              </Box>
              {' · '}
              {hovered.dateLabel}
              {' · '}
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {hovered.value}
              </Box>
              {hovered.value === 1 ? ' order' : ' orders'}
            </>
          ) : (
            'Hover a cell for the exact day and count.'
          )}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            0
          </Typography>
          <Box sx={{ display: 'flex', gap: '2px' }}>
            <Box sx={{ width: 14, height: 12, borderRadius: '2px', backgroundColor: HEAT_ZERO }} />
            {HEAT_STEPS.map((step) => (
              <Box key={step} sx={{ width: 14, height: 12, borderRadius: '2px', backgroundColor: step }} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {maxValue}
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{ overflowX: 'auto', pb: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `140px repeat(${rows.length}, minmax(${cellMin}px, 1fr))`,
            gap: '2px',
            minWidth: 140 + rows.length * cellMin,
          }}
        >
          {/* Header row — day of month; the full date lives in the hover readout */}
          <Box sx={{ position: 'sticky', left: 0, zIndex: 1, backgroundColor: SURFACE }} />
          {rows.map((row) => (
            <Typography
              key={`head-${row.date}`}
              variant="caption"
              align="center"
              sx={{ color: 'text.secondary', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
            >
              {row.dayOfMonth}
            </Typography>
          ))}

          {sellers.map(([sellerId, username]) => (
            <React.Fragment key={sellerId}>
              <Typography
                variant="caption"
                noWrap
                title={username}
                sx={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  backgroundColor: SURFACE,
                  pr: 1,
                  color: 'text.primary',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {username}
              </Typography>

              {rows.map((row) => {
                const value = row.sellerCounts[sellerId] || 0;
                const stepIndex = heatStepIndex(value, maxValue);
                const background = stepIndex < 0 ? HEAT_ZERO : HEAT_STEPS[stepIndex];
                const isDark = stepIndex >= HEAT_DARK_FROM;

                return (
                  <Box
                    key={`${sellerId}-${row.date}`}
                    title={`${username} · ${row.fullLabel} · ${value} orders`}
                    onMouseEnter={() => setHovered({ username, dateLabel: row.fullLabel, value })}
                    onMouseLeave={() => setHovered(null)}
                    sx={{
                      height: 26,
                      borderRadius: '3px',
                      backgroundColor: background,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'default',
                      transition: 'box-shadow 120ms ease',
                      '&:hover': {
                        boxShadow: `0 0 0 2px ${SURFACE}, 0 0 0 3px ${alpha(BRAND_DARK, 0.45)}`,
                      },
                    }}
                  >
                    {showValues && value > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          color: isDark ? SURFACE : alpha(BRAND_DARK, 0.85),
                        }}
                      >
                        {value}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ChartLegend({ series }) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ mt: 1.5, px: 0.5 }}>
      {series.map((item) => (
        <Stack key={item.key} direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: item.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {item.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function ChartEmptyState({ height = 280, message }) {
  return (
    <Box
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
        background: dashboardSignatureTokens.surfaces.emptyState,
        border: '1px dashed',
        borderColor: alpha(BRAND_DARK, 0.12),
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

export default function OrderTrendCharts({ tableData = [], sellersList = [], onQuickRange }) {
  const [breakdown, setBreakdown] = useState('total');
  const [chartType, setChartType] = useState('wave');

  const chartRows = useMemo(
    () =>
      tableData.map((row) => {
        const point = {
          date: row.date,
          label: formatAxisDate(row.date),
          fullLabel: formatAxisDate(row.date, { weekday: 'short' }),
          dayOfMonth: row.date.slice(8),
          total: 0,
          EBAY_US: 0,
          EBAY_AU: 0,
          EBAY_CA: 0,
          EBAY_GB: 0,
          sellerCounts: {},
        };

        Object.entries(row.sellers).forEach(([sellerId, data]) => {
          point.total += data.total || 0;
          MARKETPLACES.forEach(({ key }) => {
            point[key] += data[key] || 0;
          });
          point.sellerCounts[sellerId] = data.total || 0;
        });

        return point;
      }),
    [tableData]
  );

  // Sellers ordered by volume for the ranked chart. Every seller is shown — the
  // ranked bars are a single series, so no per-seller hue (and therefore no
  // eight-colour cap) is involved.
  const sellerTotals = useMemo(
    () =>
      sellersList
        .map(([sellerId, username]) => ({
          key: sellerId,
          label: username,
          total: tableData.reduce((sum, row) => sum + (row.sellers[sellerId]?.total || 0), 0),
        }))
        .sort((a, b) => b.total - a.total),
    [tableData, sellersList]
  );

  const marketplaceTotals = useMemo(
    () =>
      MARKETPLACES.map((marketplace) => ({
        ...marketplace,
        value: chartRows.reduce((sum, row) => sum + (row[marketplace.key] || 0), 0),
      })),
    [chartRows]
  );

  const heatMax = useMemo(
    () =>
      chartRows.reduce(
        (max, row) => Math.max(max, ...Object.values(row.sellerCounts).map((value) => value || 0)),
        0
      ),
    [chartRows]
  );

  const hasData = chartRows.length > 0;
  const isSingleDay = chartRows.length === 1;
  const isHeatmap = breakdown === 'seller';
  // A wave needs at least two points to connect; one day is always bars.
  const effectiveType = isSingleDay ? 'bar' : chartType;

  // Direct value labels collide once the points get dense, so they are
  // selective. Dots are not — they stay on, just smaller.
  const showPointLabels = chartRows.length > 0 && chartRows.length <= 14;
  const dotRadius = chartRows.length <= 14 ? 4 : chartRows.length <= 45 ? 3 : 0;

  const seriesLabels = useMemo(() => {
    const labels = { total: 'Orders' };
    MARKETPLACES.forEach(({ key, label }) => {
      labels[key] = label;
    });
    return labels;
  }, []);

  const renderDailyChart = () => {
    if (!hasData) {
      return <ChartEmptyState height={320} message="No orders in this period — adjust the filters above." />;
    }

    if (isHeatmap) {
      return <SellerHeatmap rows={chartRows} sellers={sellersList} maxValue={heatMax} />;
    }

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
    const barCursor = { fill: alpha(BRAND_DARK, 0.04) };
    const waveCursor = { stroke: alpha(BRAND_DARK, 0.28), strokeWidth: 1, strokeDasharray: '4 4' };

    if (breakdown === 'marketplace') {
      const stackTooltip = (
        <Tooltip
          cursor={effectiveType === 'bar' ? barCursor : waveCursor}
          content={<ChartTooltip seriesLabels={seriesLabels} />}
        />
      );

      if (effectiveType === 'wave') {
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
              {grid}
              {xAxis}
              {yAxis}
              {stackTooltip}
              {MARKETPLACES.map((series) => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stackId="orders"
                  stroke={series.color}
                  strokeWidth={2}
                  fill={series.color}
                  fillOpacity={0.28}
                  dot={false}
                  activeDot={{ r: 4, fill: series.color, stroke: SURFACE, strokeWidth: 2 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        );
      }

      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
            {grid}
            {xAxis}
            {yAxis}
            {stackTooltip}
            {MARKETPLACES.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.label}
                stackId="orders"
                fill={series.color}
                stroke={SURFACE}
                strokeWidth={2}
                maxBarSize={56}
                radius={index === MARKETPLACES.length - 1 ? [4, 4, 0, 0] : 0}
              >
                {index === MARKETPLACES.length - 1 && showPointLabels && (
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={8}
                    fill={labelInk}
                    fontSize={11}
                    fontWeight={700}
                    formatter={(value) => (value > 0 ? value : '')}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (effectiveType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip cursor={barCursor} content={<ChartTooltip seriesLabels={seriesLabels} showTotal={false} />} />
            <Bar dataKey="total" name="Orders" fill={TOTAL_COLOR} maxBarSize={72} radius={[4, 4, 0, 0]}>
              {showPointLabels && (
                <LabelList dataKey="total" position="top" offset={8} fill={labelInk} fontSize={12} fontWeight={700} />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartRows} margin={{ top: 20, right: 16, left: 0, bottom: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id="orderTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOTAL_COLOR} stopOpacity={0.24} />
              <stop offset="100%" stopColor={TOTAL_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {grid}
          {xAxis}
          {yAxis}
          <Tooltip cursor={waveCursor} content={<ChartTooltip seriesLabels={seriesLabels} showTotal={false} />} />
          <Area
            type="monotone"
            dataKey="total"
            name="Orders"
            stroke={TOTAL_COLOR}
            strokeWidth={2}
            fill="url(#orderTrendFill)"
            dot={dotRadius > 0 ? { r: dotRadius, fill: TOTAL_COLOR, stroke: SURFACE, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: TOTAL_COLOR, stroke: SURFACE, strokeWidth: 2 }}
          >
            {showPointLabels && (
              <LabelList dataKey="total" position="top" offset={10} fill={labelInk} fontSize={11} fontWeight={700} />
            )}
          </Area>
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Vertical (column) bars, ranked. `singleColor` is used when the categories
  // carry no colour identity of their own — sellers are one series, so every
  // bar is one hue and the axis label identifies it.
  const renderRankedChart = (rows, dataKey, height, singleColor) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rows}
        margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="16%"
        accessibilityLayer
      >
        <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: nameInk, fontSize: 12, fontWeight: 700 }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-40}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
        <Tooltip cursor={{ fill: alpha(BRAND_DARK, 0.04) }} content={<ChartTooltip showTotal={false} />} />
        <Bar dataKey={dataKey} name="Orders" radius={[4, 4, 0, 0]} maxBarSize={64} fill={singleColor}>
          {!singleColor && rows.map((row) => <Cell key={row.key} fill={row.color} />)}
          <LabelList dataKey={dataKey} position="top" offset={6} fill={nameInk} fontSize={12} fontWeight={700} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const headerActions = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', lg: 'auto' } }}>
      {onQuickRange && (
        <ToggleButtonGroup exclusive size="small" value={null} sx={chartToggleSx}>
          <ToggleButton value="7" onClick={() => onQuickRange(7)}>
            7D
          </ToggleButton>
          <ToggleButton value="14" onClick={() => onQuickRange(14)}>
            14D
          </ToggleButton>
          <ToggleButton value="30" onClick={() => onQuickRange(30)}>
            30D
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      <ToggleButtonGroup
        exclusive
        size="small"
        value={chartType}
        onChange={(event, value) => value && setChartType(value)}
        disabled={isHeatmap || isSingleDay}
        sx={chartToggleSx}
      >
        <ToggleButton value="wave">Wave</ToggleButton>
        <ToggleButton value="bar">Bars</ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={breakdown}
        onChange={(event, value) => value && setBreakdown(value)}
        sx={chartToggleSx}
      >
        <ToggleButton value="total">Total</ToggleButton>
        <ToggleButton value="marketplace">By marketplace</ToggleButton>
        <ToggleButton value="seller">By seller</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );

  return (
    <CollapsibleSection
      title="Orders per day"
      subtitle="Day-wise order counts for the selected filters, in PST."
      storageKey="trends"
      defaultOpen={false}
      badge={
        <FilterScopeBadge
          scope="page"
          help="Driven by the top filter bar. The controls on this card only change how the same data is drawn — except 7D / 14D / 30D, which set the page date filter."
        />
      }
      actions={headerActions}
    >
      <Box>{renderDailyChart()}</Box>

      {hasData && breakdown === 'marketplace' && <ChartLegend series={MARKETPLACES} />}

      {isSingleDay && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Only one day is in range — pick a date range above (or 7D / 14D / 30D) to see the day-wise trend.
        </Typography>
      )}

      <Box
        sx={{
          mt: 3,
          pt: 3,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 7fr' },
          gap: 3,
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Orders by marketplace
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Totals across the selected period
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            {hasData ? (
              renderRankedChart(marketplaceTotals, 'value', 300)
            ) : (
              <ChartEmptyState height={300} message="No marketplace data." />
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Orders by seller
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Totals across the selected period · {sellerTotals.length} sellers
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            {hasData && sellerTotals.length > 0 ? (
              renderRankedChart(sellerTotals, 'total', 300, TOTAL_COLOR)
            ) : (
              <ChartEmptyState height={300} message="No seller data." />
            )}
          </Box>
        </Box>
      </Box>
    </CollapsibleSection>
  );
}
