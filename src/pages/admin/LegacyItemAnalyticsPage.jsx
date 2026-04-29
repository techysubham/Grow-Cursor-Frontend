import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Fade,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { alpha, useTheme } from '@mui/material/styles';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatMetricCard from '../../components/StatMetricCard.jsx';
import {
  tableBodyCellSx,
  tableBodyRowSx,
  tableContainerSx,
  tableHeaderCellSx,
  yellowFilledButtonSx,
  yellowOutlinedButtonSx,
} from '../../theme/tableStyles.js';

const PT_TIMEZONE = 'America/Los_Angeles';
const initialSummary = null;

function getPtDateInputValue(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

const initialDateFilter = {
  mode: 'single',
  single: getPtDateInputValue(),
  from: '',
  to: ''
};

export default function LegacyItemAnalyticsPage() {
  const theme = useTheme();
  const dt = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  const selectFocusSx = {
    '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
    '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: BRAND_YELLOW_DARK } },
  };
  const inputFocusSx = {
    '& .MuiOutlinedInput-root': {
      '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND_YELLOW_DARK, borderWidth: 2 },
    },
  };

  const [legacyItemIdInput, setLegacyItemIdInput] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [selectedCancelledFilter, setSelectedCancelledFilter] = useState('');
  const [ebayMotorsOnly, setEbayMotorsOnly] = useState(false);
  const [excludeClient, setExcludeClient] = useState(true);
  const [excludeLowValue, setExcludeLowValue] = useState(true);
  const [dateFilter, setDateFilter] = useState(initialDateFilter);
  const [sellers, setSellers] = useState([]);
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [sellerLoading, setSellerLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setSellerLoading(true);
        const response = await api.get('/sellers/all');
        setSellers(response.data || []);
      } catch (fetchError) {
        console.error('Error fetching sellers:', fetchError);
      } finally {
        setSellerLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        ebayMotors: ebayMotorsOnly,
        excludeClient,
        excludeLowValue,
      };

      if (dateFilter.mode === 'single') {
        if (!dateFilter.single) {
          setError('Select a date first.');
          setLoading(false);
          return;
        }
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (!dateFilter.from && !dateFilter.to) {
          setError('Select a start date or end date.');
          setLoading(false);
          return;
        }
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      if (legacyItemIdInput.trim()) {
        params.legacyItemId = legacyItemIdInput.trim();
      }

      if (selectedSeller) {
        params.sellerId = selectedSeller;
      }

      if (selectedPaymentStatus) {
        params.paymentStatus = selectedPaymentStatus;
      }

      if (selectedCancelledFilter) {
        params.cancelledFilter = selectedCancelledFilter;
      }

      const response = await api.get('/orders/legacy-item-seller-summary', { params });
      setSummary(response.data || initialSummary);
      setHasSearched(true);
    } catch (fetchError) {
      console.error('Error fetching legacy item analytics:', fetchError);
      setSummary(initialSummary);
      setHasSearched(true);
      setError(fetchError?.response?.data?.error || 'Failed to load legacy item analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchSummary();
  };

  const handleRefresh = () => {
    if (!hasSearched) {
      return;
    }

    fetchSummary();
  };

  const itemRows = summary?.items || [];
  const flattenedRows = useMemo(() => itemRows.flatMap((item) => item.sellers.map((sellerRow) => ({
    legacyItemId: item.legacyItemId,
    productTitle: item.productTitle,
    itemTotalOrders: item.totalOrders,
    itemCancelledOrders: item.cancelledOrders,
    itemPartiallyRefundedOrders: item.partiallyRefundedOrders,
    itemFullyRefundedOrders: item.fullyRefundedOrders,
    ...sellerRow,
  }))), [itemRows]);

  const summaryCards = [
    { label: 'Legacy Items', value: summary?.itemCount || 0, tone: 'neutral' },
    { label: 'Total Orders', value: summary?.totalOrders || 0, tone: 'info' },
    { label: 'Cancelled', value: summary?.cancelledOrders || 0, tone: 'warning' },
    { label: 'Partially Refunded', value: summary?.partiallyRefundedOrders || 0, tone: 'amazon' },
    { label: 'Fully Refunded', value: summary?.fullyRefundedOrders || 0, tone: 'danger' },
  ];

  const pageSubtitle = dateFilter.mode === 'single'
    ? 'See all legacy item IDs sold on a selected PT day, with seller-wise cancellation and refund counts.'
    : 'See all legacy item IDs sold in a selected PT date range, with seller-wise cancellation and refund counts.';

  return (
    <Fade in timeout={400}>
      <AdminPageShell>
        <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <PageHeader
            title="Legacy Item Analytics"
            subtitle={pageSubtitle}
            sx={{ pt: 0, pb: 0 }}
          />

          {/* ── Row 1: Date controls + filters ── */}
          <Stack direction="row" flexWrap="wrap" gap={1.5} useFlexGap sx={{ mt: 2.5 }}>
            <FormControl size="small" sx={{ minWidth: 150, ...selectFocusSx }}>
              <InputLabel>Date Mode</InputLabel>
              <Select
                label="Date Mode"
                value={dateFilter.mode}
                onChange={(event) => setDateFilter((previous) => ({
                  ...previous,
                  mode: event.target.value,
                  single: event.target.value === 'single' && !previous.single ? getPtDateInputValue() : previous.single,
                }))}
              >
                <MenuItem value="single">Single Day</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>

            {dateFilter.mode === 'single' ? (
              <TextField
                label="Date"
                type="date"
                size="small"
                value={dateFilter.single}
                onChange={(event) => setDateFilter((previous) => ({ ...previous, single: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180, ...inputFocusSx }}
                helperText="Uses PT day boundaries (America/Los_Angeles, PST/PDT)."
              />
            ) : (
              <>
                <TextField
                  label="From"
                  type="date"
                  size="small"
                  value={dateFilter.from}
                  onChange={(event) => setDateFilter((previous) => ({ ...previous, from: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 180, ...inputFocusSx }}
                  helperText="PT start day"
                />
                <TextField
                  label="To"
                  type="date"
                  size="small"
                  value={dateFilter.to}
                  onChange={(event) => setDateFilter((previous) => ({ ...previous, to: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 180, ...inputFocusSx }}
                  helperText="PT end day"
                />
              </>
            )}

            <TextField
              label="Legacy Item ID"
              size="small"
              value={legacyItemIdInput}
              onChange={(event) => setLegacyItemIdInput(event.target.value)}
              placeholder="Optional"
              sx={{ minWidth: 180, ...inputFocusSx }}
              onKeyDown={(event) => { if (event.key === 'Enter') handleSearch(); }}
            />

            <FormControl size="small" sx={{ minWidth: 200, ...selectFocusSx }}>
              <InputLabel>Seller</InputLabel>
              <Select
                label="Seller"
                value={selectedSeller}
                onChange={(event) => setSelectedSeller(event.target.value)}
                disabled={sellerLoading}
              >
                <MenuItem value="">All Sellers</MenuItem>
                {sellers.map((seller) => (
                  <MenuItem key={seller._id} value={seller._id}>
                    {seller.user?.username || 'Unknown Seller'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 190, ...selectFocusSx }}>
              <InputLabel>Payment Status</InputLabel>
              <Select
                label="Payment Status"
                value={selectedPaymentStatus}
                onChange={(event) => setSelectedPaymentStatus(event.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="FULLY_REFUNDED">FULLY_REFUNDED</MenuItem>
                <MenuItem value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180, ...selectFocusSx }}>
              <InputLabel>Cancel Filter</InputLabel>
              <Select
                label="Cancel Filter"
                value={selectedCancelledFilter}
                onChange={(event) => setSelectedCancelledFilter(event.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="cancelled">Cancelled Only</MenuItem>
                <MenuItem value="not_cancelled">Not Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* ── Row 2: Toggles + action buttons ── */}
          <Stack direction="row" flexWrap="wrap" gap={2} useFlexGap alignItems="center" sx={{ mt: 1.5 }}>
            {/* Toggles group */}
            <Stack direction="row" gap={3} useFlexGap alignItems="center" flexWrap="wrap">
              <FormControlLabel
                sx={{ gap: 0.75, mr: 0 }}
                control={<Switch checked={ebayMotorsOnly} onChange={(event) => setEbayMotorsOnly(event.target.checked)} size="small" />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>eBay Motors</Typography>}
              />
              <FormControlLabel
                sx={{ gap: 0.75, mr: 0 }}
                control={<Switch checked={excludeClient} onChange={(event) => setExcludeClient(event.target.checked)} size="small" />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Exclude Client</Typography>}
              />
              <FormControlLabel
                sx={{ gap: 0.75, mr: 0 }}
                control={<Switch checked={excludeLowValue} onChange={(event) => setExcludeLowValue(event.target.checked)} size="small" />}
                label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Exclude Low Value</Typography>}
              />
            </Stack>

            <Box sx={{ flex: 1 }} />

            {/* Action buttons group */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
                sx={{ ...yellowFilledButtonSx, minWidth: 110 }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading || !hasSearched}
                sx={{ ...yellowOutlinedButtonSx, minWidth: 110 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mt: 2.5 }}>
              {error}
            </Alert>
          )}
        </SectionCard>

        {summary && !error && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(5, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
            {summaryCards.map((card) => (
              <StatMetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone={card.tone}
              />
            ))}
          </Box>
        )}

        <SectionCard sx={{ p: 0 }}>
          <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Legacy Item Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Each row shows a legacy item ID found in the selected dates, the seller handling those orders, and the cancellation and refund counts.
            </Typography>
          </Box>

          <TableContainer sx={tableContainerSx}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Legacy Item ID</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Item Total</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Seller</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Product Title</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Seller Orders</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Cancelled</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Partially Refunded</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Fully Refunded</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading && (
                  <TableRow sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx} colSpan={8}>
                      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 3 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" color="text.secondary">
                          Loading legacy item summary...
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && flattenedRows.map((row) => (
                  <TableRow key={`${row.legacyItemId}-${row.sellerId || row.sellerUsername}`} sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx}>{row.legacyItemId}</TableCell>
                    <TableCell sx={tableBodyCellSx} align="right">{row.itemTotalOrders}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{row.sellerUsername}</TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, whiteSpace: 'normal', minWidth: 320 }}>
                      {row.productTitle || 'Title not found'}
                    </TableCell>
                    <TableCell sx={tableBodyCellSx} align="right">{row.totalOrders}</TableCell>
                    <TableCell sx={tableBodyCellSx} align="right">{row.cancelledOrders}</TableCell>
                    <TableCell sx={tableBodyCellSx} align="right">{row.partiallyRefundedOrders}</TableCell>
                    <TableCell sx={tableBodyCellSx} align="right">{row.fullyRefundedOrders}</TableCell>
                  </TableRow>
                ))}

                {!loading && !flattenedRows.length && (
                  <TableRow sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx} colSpan={8}>
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {hasSearched ? 'No matching legacy items found' : 'Select a date or date range'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {hasSearched
                            ? 'Try a different date selection or adjust the seller and filter options.'
                            : 'Choose a single day or date range to see which legacy item IDs were present.'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </AdminPageShell>
    </Fade>
  );
}