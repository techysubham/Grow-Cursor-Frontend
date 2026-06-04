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
  Stack,
  TextField,
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
  const [selectedDate, setSelectedDate] = useState(() => getPTDate());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/ebay/feed/daily-listing-comparison', {
        params: { date: selectedDate }
      });
      setRows(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load daily listing comparison');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

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
              label={`${numberFmt.format(totals.netListings)} Net Listings`}
              sx={{
                height: 40,
                px: 1,
                borderRadius: `${dashboardSignatureTokens.radius.pill}px`,
                border: '1px solid',
                borderColor: totals.netListings >= 0 ? dashboardSignatureTokens.tones.info.border : dashboardSignatureTokens.tones.amazon.border,
                backgroundColor: totals.netListings >= 0 ? dashboardSignatureTokens.tones.info.background : dashboardSignatureTokens.tones.amazon.background,
                color: totals.netListings >= 0 ? dashboardSignatureTokens.tones.info.color : dashboardSignatureTokens.tones.amazon.color,
                '& .MuiChip-icon': {
                  color: totals.netListings >= 0 ? dashboardSignatureTokens.tones.info.color : dashboardSignatureTokens.tones.amazon.color
                }
              }}
            />
          </Stack>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Date"
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
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
          {rows.map((row) => {
            const isPositive = row.netListings >= 0;
            return (
              <Card
                key={row.sellerId || row.sellerName}
                sx={{
                  borderRadius: `${dashboardSignatureTokens.radius.card}px`,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: dashboardSignatureTokens.shadows.card,
                  minWidth: 0
                }}
              >
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap title={row.sellerName} sx={{ minWidth: 0 }}>
                      {row.sellerName}
                    </Typography>
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
