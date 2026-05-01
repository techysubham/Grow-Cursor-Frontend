import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

import api from '../../lib/api';
import AdminPageShell from '../../components/AdminPageShell';
import SectionCard from '../../components/SectionCard';
import StatMetricCard from '../../components/StatMetricCard';
import PageHeader from '../../components/PageHeader';
import { tableHeaderCellSx } from '../../theme/tableStyles';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (val) =>
  val
    ? new Date(val).toLocaleDateString('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
      })
    : '—';

const fmtUSD = (val) =>
  val != null ? `$${Number(val).toFixed(2)}` : '—';

const fmtINR = (val) =>
  val != null ? `₹${Number(val).toFixed(2)}` : '—';

const fmtNum = (val) =>
  val != null ? Number(val).toFixed(4) : '—';

// Column definitions
const COLUMNS = [
  { id: 'orderId',         label: 'Order ID',          fmt: (v) => v ?? '—',     minWidth: 160 },
  { id: 'sellerName',      label: 'Seller',             fmt: (v) => v ?? '—',     minWidth: 130 },
  { id: 'dateSold',        label: 'Date Sold',          fmt: fmtDate,              minWidth: 110 },
  { id: 'productName',     label: 'Product Name',       fmt: (v) => v ?? '—',     minWidth: 200 },
  { id: 'subtotal',        label: 'Subtotal',           fmt: fmtUSD,               minWidth: 90  },
  { id: 'shipping',        label: 'Shipping',           fmt: fmtUSD,               minWidth: 90  },
  { id: 'salesTax',        label: 'Sales Tax',          fmt: fmtUSD,               minWidth: 90  },
  { id: 'discount',        label: 'Discount',           fmt: fmtUSD,               minWidth: 90  },
  { id: 'transactionFees', label: 'Transaction Fees',   fmt: fmtUSD,               minWidth: 130 },
  { id: 'adFee',           label: 'Ad Fee',             fmt: fmtUSD,               minWidth: 80  },
  { id: 'orderEarnings',   label: 'Earnings',           fmt: fmtUSD,               minWidth: 90  },
  { id: 'orderTotal',      label: 'Order Total',        fmt: fmtUSD,               minWidth: 100 },
  { id: 'tds',             label: 'TDS',                fmt: fmtUSD,               minWidth: 80  },
  { id: 'tid',             label: 'T.ID',               fmt: fmtNum,               minWidth: 70  },
  { id: 'net',             label: 'NET',                fmt: fmtUSD,               minWidth: 80  },
  { id: 'ebayExchangeRate',label: 'Exchange Rate',      fmt: fmtNum,               minWidth: 110 },
  { id: 'pBalanceINR',     label: 'P.Balance (INR)',    fmt: fmtINR,               minWidth: 120 },
  // Computed columns
  { id: 'sellerCost',      label: 'Seller Cost (INR)',   fmt: fmtINR,               minWidth: 120, computed: true },
  { id: 'sellerMarkupFee', label: 'Seller Markup Fee',  fmt: fmtINR,               minWidth: 140, computed: true },
  { id: 'sellerIGST',      label: 'Seller IGST',        fmt: fmtINR,               minWidth: 110, computed: true },
  { id: 'profitFake',      label: 'Profit (Fake)',      fmt: fmtINR,               minWidth: 110, computed: true },
];

const INITIAL_DRAFT = {
  seller:        '',
  dateMode:      'none',
  singleDate:    '',
  dateFrom:      '',
  dateTo:        '',
  excludeClient: true,
};

export default function MicroOrdersPage() {
  const [sellers,        setSellers]        = useState([]);
  const [orders,         setOrders]         = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [pageLoading,    setPageLoading]    = useState(true);

  // Totals (across ALL matching records, not just current page)
  const [totalCount,     setTotalCount]     = useState(0);
  const [totalProfitFake,setTotalProfitFake]= useState(0);

  // Draft vs applied filter state (apply-button pattern)
  const [draft,          setDraft]          = useState(INITIAL_DRAFT);
  const [applied,        setApplied]        = useState(INITIAL_DRAFT);

  const [pagination, setPagination] = useState({
    page:        1,
    limit:       50,
    totalPages:  1,
    totalRecords:0,
  });

  // ── Fetch sellers on mount ─────────────────────────────────────────────────
  useEffect(() => {
    api.get('/sellers/all').then((res) => {
      setSellers(res.data || []);
    }).catch(() => {});
  }, []);

  // ── Fetch orders when page or applied filters change ──────────────────────
  const fetchOrders = useCallback(async (page = 1, filters = applied) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.limit,
        dateMode: filters.dateMode,
      };
      if (filters.seller)    params.seller   = filters.seller;
      if (filters.dateMode === 'single' && filters.singleDate) params.date     = filters.singleDate;
      if (filters.dateMode === 'range'  && filters.dateFrom)   params.dateFrom = filters.dateFrom;
      if (filters.dateMode === 'range'  && filters.dateTo)     params.dateTo   = filters.dateTo;
      params.excludeClient = filters.excludeClient;

      const { data } = await api.get('/micro-orders', { params });
      setOrders(data.orders ?? []);
      setTotalCount(data.totalCount ?? 0);
      setTotalProfitFake(data.totalProfitFake ?? 0);
      setPagination((prev) => ({
        ...prev,
        page,
        totalPages:   data.totalPages   ?? 1,
        totalRecords: data.totalRecords ?? 0,
      }));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [applied, pagination.limit]);

  useEffect(() => {
    fetchOrders(pagination.page, applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, applied]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleApply = () => {
    setApplied({ ...draft });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleClear = () => {
    setDraft(INITIAL_DRAFT);
    setApplied(INITIAL_DRAFT);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (_, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // ── Metric cards ──────────────────────────────────────────────────────────
  const profitTone = totalProfitFake >= 0 ? 'success' : 'danger';

  if (pageLoading) {
    return (
      <AdminPageShell>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Micro Orders"
        subtitle="Orders with subtotal $0.01 – $3.00 · Seller markup &amp; IGST analysis"
        breadcrumbs={[{ label: 'Finance & Cash Flow' }, { label: 'Micro Orders' }]}
      />

      {/* ── Filters ── */}
      <SectionCard title="Filters" sx={{ mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} flexWrap="wrap">

          {/* Seller */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Seller</InputLabel>
            <Select
              value={draft.seller}
              label="Seller"
              onChange={(e) => setDraft((d) => ({ ...d, seller: e.target.value }))}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date mode toggle */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={draft.dateMode}
            onChange={(_, val) => val && setDraft((d) => ({ ...d, dateMode: val, singleDate: '', dateFrom: '', dateTo: '' }))}
          >
            <ToggleButton value="none">No Date Filter</ToggleButton>
            <ToggleButton value="single">Single Date</ToggleButton>
            <ToggleButton value="range">Date Range</ToggleButton>
          </ToggleButtonGroup>

          {/* Conditional date inputs */}
          {draft.dateMode === 'single' && (
            <TextField
              label="Date Sold"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={draft.singleDate}
              onChange={(e) => setDraft((d) => ({ ...d, singleDate: e.target.value }))}
              sx={{ width: 180 }}
            />
          )}

          {draft.dateMode === 'range' && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                label="From"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={draft.dateFrom}
                onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                sx={{ width: 165 }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={draft.dateTo}
                onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                sx={{ width: 165 }}
              />
            </Stack>
          )}

          {/* Exclude Client (Vergo) toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={draft.excludeClient}
                onChange={(e) => setDraft((d) => ({ ...d, excludeClient: e.target.checked }))}
                color="primary"
                size="small"
              />
            }
            label="Exclude Client"
            sx={{ ml: 0.5, whiteSpace: 'nowrap' }}
          />

          {/* Spacer pushes buttons to the right on wide screens */}
          <Box sx={{ flex: 1 }} />

          {/* Action buttons */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={<FilterListIcon />}
              onClick={handleApply}
            >
              Apply Filters
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClear}
            >
              Clear
            </Button>
          </Stack>

        </Stack>
      </SectionCard>

      {/* ── Summary Metric Cards ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1, maxWidth: { md: 320 } }}>
          <StatMetricCard
            label="Total Orders"
            value={totalCount.toLocaleString()}
            tone="info"
            icon={ShoppingCartIcon}
            subtext="matching current filters"
          />
        </Box>
        <Box sx={{ flex: 1, maxWidth: { md: 320 } }}>
          <StatMetricCard
            label="Total Profit (Fake)"
            value={`₹${Number(totalProfitFake).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            tone={profitTone}
            icon={CurrencyRupeeIcon}
            subtext="P.Balance − Markup − IGST"
          />
        </Box>
      </Stack>

      {/* ── Table ── */}
      <SectionCard
        title={`Orders (${totalCount.toLocaleString()} total)`}
        loading={loading}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, gap: 2 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Loading orders…</Typography>
          </Box>
        ) : orders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No orders found matching the current filters.
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', maxHeight: 600 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 2400 }}>
                <TableHead>
                  <TableRow>
                    {COLUMNS.map((col) => (
                      <TableCell
                        key={col.id}
                        sx={{
                          minWidth:        col.minWidth,
                          fontWeight:      700,
                          whiteSpace:      'nowrap',
                          backgroundColor: col.computed ? 'primary.50' : undefined,
                          color:           col.computed ? 'primary.main' : undefined,
                          ...(col.id === 'orderId' ? { position: 'sticky', left: 0, zIndex: 3, backgroundColor: col.computed ? 'primary.50' : 'background.paper' } : {}),
                        }}
                      >
                        {col.label}
                        {col.computed && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.7 }}>
                            ✦
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((row, idx) => (
                    <TableRow
                      key={row._id ?? idx}
                      hover
                      sx={{ '&:last-child td': { border: 0 } }}
                    >
                      {COLUMNS.map((col) => {
                        const raw = row[col.id];
                        const cell = col.fmt(raw);
                        const isProfit = col.id === 'profitFake';
                        return (
                          <TableCell
                            key={col.id}
                            sx={{
                              minWidth:   col.minWidth,
                              whiteSpace: col.id === 'productName' ? 'normal' : 'nowrap',
                              maxWidth:   col.id === 'productName' ? 260 : undefined,
                              color:      isProfit
                                ? raw >= 0 ? 'success.main' : 'error.main'
                                : undefined,
                              fontWeight: isProfit ? 600 : undefined,
                              backgroundColor: col.computed ? 'action.hover' : undefined,
                              ...(col.id === 'orderId' ? { position: 'sticky', left: 0, zIndex: 1, backgroundColor: 'background.paper' } : {}),
                            }}
                          >
                            {cell}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', pt: 1 }}>
              Showing {orders.length} of {pagination.totalRecords.toLocaleString()} records
              {pagination.totalPages > 1 && ` · Page ${pagination.page} of ${pagination.totalPages}`}
            </Typography>
          </>
        )}
      </SectionCard>

      {/* ── Legend ── */}
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          ✦ Computed columns — Seller Cost (INR) = Subtotal × 90 · Seller Markup Fee (INR) = Subtotal × 90 × 4% · Seller IGST (INR) = Markup × 18% · Profit Fake (INR) = P.Balance − Seller Cost − Markup − IGST.
          Summary totals reflect <strong>all matching records</strong> across all pages.
        </Typography>
      </Box>
    </AdminPageShell>
  );
}
