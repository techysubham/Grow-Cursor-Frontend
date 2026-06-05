import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  LinearProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RefreshIcon from '@mui/icons-material/Refresh';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../../lib/api';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatMetricCard from '../../components/StatMetricCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { dashboardSignatureTokens } from '../../theme/appTheme';
import { yellowFilledButtonSx } from '../../theme/tableStyles.js';

const getPTDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
};

const numberFmt = new Intl.NumberFormat('en-US');

const countryLabel = (country) => {
  if (country === 'US') return 'US';
  if (country === 'UK') return 'UK';
  if (country === 'AU') return 'AU';
  if (country === 'Canada') return 'CA';
  return country || 'Unknown';
};

const getDateLabel = (filter) => {
  if (filter.mode === 'range') {
    if (filter.from && filter.to) return `${filter.from} to ${filter.to}`;
    if (filter.from) return `${filter.from} onward`;
    if (filter.to) return `Through ${filter.to}`;
  }
  return filter.single;
};

function StatBlock({ icon, label, value, tone = 'default' }) {
  const color =
    tone === 'good' ? 'success.main' :
    tone === 'bad' ? 'error.main' :
    'text.primary';

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5, color: 'text.secondary' }}>
        {icon}
        <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
        {numberFmt.format(value || 0)}
      </Typography>
    </Box>
  );
}

export default function DailyListingComparisonPage() {
  const [draftDateFilter, setDraftDateFilter] = useState(() => ({
    mode: 'single',
    single: getPTDate(),
    from: getPTDate(-6),
    to: getPTDate()
  }));
  const [appliedDateFilter, setAppliedDateFilter] = useState(() => ({
    mode: 'single',
    single: getPTDate(),
    from: getPTDate(-6),
    to: getPTDate()
  }));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = appliedDateFilter.mode === 'range'
        ? {
            startDate: appliedDateFilter.from || undefined,
            endDate: appliedDateFilter.to || undefined
          }
        : { date: appliedDateFilter.single };
      const { data } = await api.get('/ebay/feed/daily-listing-comparison', {
        params
      });
      setRows(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load daily listing comparison');
    } finally {
      setLoading(false);
    }
  }, [appliedDateFilter]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const totals = useMemo(() => rows.reduce(
    (acc, row) => {
      acc.successfulListings += row.successfulListings || 0;
      acc.endedListings += row.endedListings || 0;
      acc.netListings += row.netListings || 0;
      return acc;
    },
    { successfulListings: 0, endedListings: 0, netListings: 0 }
  ), [rows]);

  const maxVolume = useMemo(() => rows.reduce((max, row) => {
    const total = (row.successfulListings || 0) + (row.endedListings || 0);
    return Math.max(max, total);
  }, 0), [rows]);

  const hasPendingFilterChanges = JSON.stringify(draftDateFilter) !== JSON.stringify(appliedDateFilter);

  const handleApplyFilters = () => {
    setAppliedDateFilter(draftDateFilter);
  };

  const handleResetToday = () => {
    const today = getPTDate();
    const next = { mode: 'single', single: today, from: getPTDate(-6), to: today };
    setDraftDateFilter(next);
    setAppliedDateFilter(next);
  };

  const summaryCards = [
    { label: 'Successful Listings', value: totals.successfulListings, tone: 'success' },
    { label: 'Ended Listings', value: totals.endedListings, tone: 'warning' },
    { label: 'Net Listings', value: totals.netListings, tone: totals.netListings >= 0 ? 'info' : 'amazon' },
    { label: 'Sellers', value: rows.length, tone: 'neutral' }
  ];

  return (
    <Fade in timeout={600}>
      <AdminPageShell>
        <SectionCard
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            background: dashboardSignatureTokens.surfaces.pageCard,
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2.5}>
            <PageHeader
              title="Daily Listing Comparison"
              subtitle="Pacific day seller comparison for successful feed uploads and ended listings."
              sx={{ pt: 0, pb: 0 }}
            />

            <Chip
              icon={<CompareArrowsIcon />}
              label={`${getDateLabel(appliedDateFilter)} PT`}
              sx={{
                height: 40,
                px: 1,
                borderRadius: `${dashboardSignatureTokens.radius.pill}px`,
                border: '1px solid',
                borderColor: dashboardSignatureTokens.tones.info.border,
                backgroundColor: dashboardSignatureTokens.tones.info.background,
                color: dashboardSignatureTokens.tones.info.color,
                '& .MuiChip-icon': {
                  color: dashboardSignatureTokens.tones.info.color
                }
              }}
            />
          </Stack>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} flexWrap="wrap">
              <ToggleButtonGroup
                size="small"
                exclusive
                value={draftDateFilter.mode}
                onChange={(_, mode) => {
                  if (!mode) return;
                  setDraftDateFilter(prev => ({ ...prev, mode }));
                }}
                sx={{
                  '& .MuiToggleButton-root': {
                    height: 40,
                    px: 2,
                    textTransform: 'none',
                    fontWeight: 700
                  }
                }}
              >
                <ToggleButton value="single">Single Day</ToggleButton>
                <ToggleButton value="range">Date Range</ToggleButton>
              </ToggleButtonGroup>

              {draftDateFilter.mode === 'single' ? (
                <TextField
                  label="Date"
                  type="date"
                  size="small"
                  value={draftDateFilter.single}
                  onChange={(e) => setDraftDateFilter(prev => ({ ...prev, single: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 200 }}
                />
              ) : (
                <>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    value={draftDateFilter.from}
                    onChange={(e) => setDraftDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    value={draftDateFilter.to}
                    onChange={(e) => setDraftDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 180 }}
                  />
                </>
              )}

              <Button
                variant="contained"
                size="small"
                onClick={handleApplyFilters}
                disabled={loading || !hasPendingFilterChanges}
                sx={{ ...yellowFilledButtonSx, height: 40 }}
              >
                Apply Filters
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                onClick={fetchComparison}
                disabled={loading}
                sx={{ ...yellowFilledButtonSx, height: 40 }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetToday}
                disabled={loading}
                sx={{ height: 40, textTransform: 'none', fontWeight: 700 }}
              >
                Today
              </Button>
            </Stack>

            <Box
              sx={{
                mt: 3,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 1.5
              }}
            >
              {summaryCards.map((card) => (
                <StatMetricCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
              ))}
            </Box>
          </Box>
        </SectionCard>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No successful feed uploads or end-listing stats found for this date.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5 }}>
          {rows.map((row, index) => {
            const isPositive = row.netListings >= 0;
            const totalVolume = (row.successfulListings || 0) + (row.endedListings || 0);
            const progress = maxVolume > 0 ? Math.max(4, Math.round((totalVolume / maxVolume) * 100)) : 0;
            const marketplaceBreakdown = [...(row.marketplaces || [])]
              .filter(marketplace => (marketplace.successfulListings || 0) > 0)
              .sort((a, b) => (b.successfulListings || 0) - (a.successfulListings || 0));
            return (
              <Card
                key={row.sellerId || row.sellerName}
                sx={{
                  borderRadius: `${dashboardSignatureTokens.radius.card}px`,
                  border: '1px solid',
                  borderColor: isPositive ? dashboardSignatureTokens.tones.success.border : dashboardSignatureTokens.tones.warning.border,
                  boxShadow: dashboardSignatureTokens.shadows.card,
                  minWidth: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '0 0 auto 0',
                    height: 4,
                    backgroundColor: isPositive ? dashboardSignatureTokens.tones.success.border : dashboardSignatureTokens.tones.warning.border
                  }
                }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        #{index + 1}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={800} noWrap title={row.sellerName} sx={{ minWidth: 0 }}>
                        {row.sellerName}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${isPositive ? '+' : ''}${numberFmt.format(row.netListings)} net`}
                      color={isPositive ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ height: 24, fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack direction="row" justifyContent="space-between" spacing={1.5}>
                    <StatBlock icon={<CloudUploadIcon fontSize="small" />} label="Successful" value={row.successfulListings} tone="good" />
                    <StatBlock icon={<RemoveCircleOutlineIcon fontSize="small" />} label="Ended" value={row.endedListings} tone="bad" />
                  </Stack>
                  {marketplaceBreakdown.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 0.75 }}>
                        Successful by marketplace
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {marketplaceBreakdown.map((marketplace) => (
                          <Chip
                            key={marketplace.country}
                            size="small"
                            label={`${countryLabel(marketplace.country)} ${numberFmt.format(marketplace.successfulListings || 0)}`}
                            sx={{
                              height: 24,
                              borderRadius: `${dashboardSignatureTokens.radius.pill}px`,
                              border: '1px solid',
                              borderColor: dashboardSignatureTokens.tones.success.border,
                              backgroundColor: dashboardSignatureTokens.tones.success.background,
                              color: dashboardSignatureTokens.tones.success.color,
                              fontWeight: 700,
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  <Box sx={{ mt: 1.75 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>Total activity vs busiest seller</Typography>
                      <Typography variant="caption" color="text.secondary">{numberFmt.format(totalVolume)}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          backgroundColor: isPositive ? dashboardSignatureTokens.tones.success.color : dashboardSignatureTokens.tones.warning.color
                        }
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
      </AdminPageShell>
    </Fade>
  );
}
