import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  TextField,
  Chip,
  Grid,
  Dialog,
  IconButton,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { parse, format } from 'date-fns';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../lib/api';
import { downloadCSV, prepareCSVData } from '../../utils/csvExport';
import {
  tableHeaderCellSx,
  tableBodyRowSx,
  tableContainerSx,
  tableBodyCellSx,
  yellowFilledButtonSx,
  yellowOutlinedButtonSx,
} from '../../theme/tableStyles.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const ANALYTICS_COLUMNS = [
  { id: 'period', label: 'Period' },
  { id: 'totalOrders', label: 'Orders' },
  { id: 'totalSubtotal', label: 'Subtotal' },
  { id: 'totalShipping', label: 'Shipping' },
  { id: 'totalSalesTax', label: 'Sales Tax' },
  { id: 'totalTransactionFees', label: 'Transaction Fees' },
  { id: 'totalAdFees', label: 'Ad Fees' },
  { id: 'totalEarnings', label: 'Earnings' },
  { id: 'totalPBalanceINR', label: 'P.Balance (INR)' },
  { id: 'totalAmazonCosts', label: 'A_total-inr' },
  { id: 'totalCreditCardFees', label: 'Credit Card Fees' },
  { id: 'totalAmazonAndCreditCardFees', label: 'A_total-inr + CC Fees' },
  { id: 'totalProfit', label: 'Profit (INR)' },
];

export default function SellerAnalyticsPage() {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [groupBy, setGroupBy] = useState('day'); // day, week, month
  const [searchMarketplace, setSearchMarketplace] = useState(''); // marketplace filter

  // Date filter state - similar to FulfillmentDashboard
  const [dateFilter, setDateFilter] = useState(() => {
    // Default to last 30 days range
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      mode: 'range',
      single: '',
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  });

  // Month/Year selector for monthly grouping
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7); // YYYY-MM format
  });

  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState(() => ANALYTICS_COLUMNS.map((column) => column.id));

  useEffect(() => {
    fetchSellers();
  }, []);

  // Auto-load analytics when filters change
  useEffect(() => {
    // For monthly grouping, use selectedMonth
    if (groupBy === 'month') {
      if (!selectedMonth) return;
      loadAnalytics();
      return;
    }

    // For day/week grouping, use date filter
    if (dateFilter.mode === 'none') {
      setAnalytics([]);
      setSummary(null);
      return;
    }
    if (dateFilter.mode === 'single' && !dateFilter.single) {
      return;
    }
    if (dateFilter.mode === 'range' && (!dateFilter.from || !dateFilter.to)) {
      return;
    }

    loadAnalytics();
  }, [selectedSeller, groupBy, dateFilter, selectedMonth, searchMarketplace]);

  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      console.error('Failed to load sellers:', e);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setError('');

    try {
      // Prepare date parameters based on groupBy
      let startDate, endDate;

      if (groupBy === 'month') {
        // For monthly grouping, use selected month
        if (!selectedMonth) {
          setError('Please select a month');
          setLoading(false);
          return;
        }
        // Get first and last day of selected month
        const [year, month] = selectedMonth.split('-');
        startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
      } else {
        // For day/week grouping, use date filter
        if (dateFilter.mode === 'none') {
          setError('Please select a date range');
          setLoading(false);
          return;
        }
        if (dateFilter.mode === 'single' && !dateFilter.single) {
          setError('Please select a date');
          setLoading(false);
          return;
        }
        if (dateFilter.mode === 'range' && (!dateFilter.from || !dateFilter.to)) {
          setError('Please select start and end dates');
          setLoading(false);
          return;
        }

        if (dateFilter.mode === 'single') {
          startDate = dateFilter.single;
          endDate = dateFilter.single;
        } else if (dateFilter.mode === 'range') {
          startDate = dateFilter.from;
          endDate = dateFilter.to;
        }
      }

      const params = {
        groupBy,
        startDate,
        endDate
      };

      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchMarketplace) params.marketplace = searchMarketplace;

      const { data } = await api.get('/ebay/seller-analytics', { params });
      setAnalytics(data.analytics || []);
      setSummary(data.summary || null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load analytics');
      setAnalytics([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    if (value == null || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  const formatINR = (value) => {
    if (value == null || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `₹${num.toFixed(2)}`;
  };

  const getGroupLabel = (period) => {
    if (groupBy === 'day') {
      return new Date(period).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } else if (groupBy === 'week') {
      return `Week ${period}`;
    } else if (groupBy === 'month') {
      return new Date(period + '-01').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
    return period;
  };

  const totals = analytics.reduce((acc, row) => ({
    totalOrders: acc.totalOrders + (row.totalOrders || 0),
    totalSubtotal: acc.totalSubtotal + (row.totalSubtotal || 0),
    totalShipping: acc.totalShipping + (row.totalShipping || 0),
    totalSalesTax: acc.totalSalesTax + (row.totalSalesTax || 0),
    totalTransactionFees: acc.totalTransactionFees + (row.totalTransactionFees || 0),
    totalAdFees: acc.totalAdFees + (row.totalAdFees || 0),
    totalEarnings: acc.totalEarnings + (row.totalEarnings || 0),
    totalPBalanceINR: acc.totalPBalanceINR + (row.totalPBalanceINR || 0),
    totalAmazonCosts: acc.totalAmazonCosts + (row.totalAmazonCosts || 0),
    totalCreditCardFees: acc.totalCreditCardFees + (row.totalCreditCardFees || 0),
    totalAmazonAndCreditCardFees: acc.totalAmazonAndCreditCardFees + ((row.totalAmazonCosts || 0) + (row.totalCreditCardFees || 0)),
    totalProfit: acc.totalProfit + (row.totalProfit || 0),
  }), {
    totalOrders: 0,
    totalSubtotal: 0,
    totalShipping: 0,
    totalSalesTax: 0,
    totalTransactionFees: 0,
    totalAdFees: 0,
    totalEarnings: 0,
    totalPBalanceINR: 0,
    totalAmazonCosts: 0,
    totalCreditCardFees: 0,
    totalAmazonAndCreditCardFees: 0,
    totalProfit: 0,
  });

  const handleOpenExportDialog = () => {
    setSelectedExportColumns(ANALYTICS_COLUMNS.map((column) => column.id));
    setExportDialogOpen(true);
  };

  const handleToggleExportColumn = (columnId) => {
    setSelectedExportColumns((prev) => (
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    ));
  };

  const handleExecuteExport = async () => {
    if (analytics.length === 0) {
      setError('No analytics rows available to export');
      return;
    }

    if (selectedExportColumns.length === 0) {
      setError('Select at least one column to export');
      return;
    }

    setExportingCsv(true);

    try {
      const exportColumnDefs = {
        period: {
          header: groupBy === 'day' ? 'Date' : groupBy === 'week' ? 'Week' : 'Month',
          accessor: (row) => row.period === 'TOTAL' ? 'TOTAL' : getGroupLabel(row.period),
        },
        totalOrders: { header: 'Orders', accessor: 'totalOrders' },
        totalSubtotal: { header: 'Subtotal', accessor: (row) => Number(row.totalSubtotal || 0).toFixed(2) },
        totalShipping: { header: 'Shipping', accessor: (row) => Number(row.totalShipping || 0).toFixed(2) },
        totalSalesTax: { header: 'Sales Tax', accessor: (row) => Number(row.totalSalesTax || 0).toFixed(2) },
        totalTransactionFees: { header: 'Transaction Fees', accessor: (row) => Number(row.totalTransactionFees || 0).toFixed(2) },
        totalAdFees: { header: 'Ad Fees', accessor: (row) => Number(row.totalAdFees || 0).toFixed(2) },
        totalEarnings: { header: 'Earnings', accessor: (row) => Number(row.totalEarnings || 0).toFixed(2) },
        totalPBalanceINR: { header: 'P.Balance (INR)', accessor: (row) => Number(row.totalPBalanceINR || 0).toFixed(2) },
        totalAmazonCosts: { header: 'A_total-inr', accessor: (row) => Number(row.totalAmazonCosts || 0).toFixed(2) },
        totalCreditCardFees: { header: 'Credit Card Fees', accessor: (row) => Number(row.totalCreditCardFees || 0).toFixed(2) },
        totalAmazonAndCreditCardFees: { header: 'A_total-inr + CC Fees', accessor: (row) => Number((row.totalAmazonCosts || 0) + (row.totalCreditCardFees || 0)).toFixed(2) },
        totalProfit: { header: 'Profit (INR)', accessor: (row) => Number(row.totalProfit || 0).toFixed(2) },
      };

      const dynamicCsvColumns = {};
      ANALYTICS_COLUMNS.forEach((column) => {
        if (!selectedExportColumns.includes(column.id)) return;
        const exportDef = exportColumnDefs[column.id];
        if (!exportDef) return;
        dynamicCsvColumns[exportDef.header] = exportDef.accessor;
      });

      const csvRows = [
        ...analytics,
        { period: 'TOTAL', ...totals },
      ];

      const csvData = prepareCSVData(csvRows, dynamicCsvColumns);
      downloadCSV(csvData, 'Seller_Analytics');
      setExportDialogOpen(false);
      setError('');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <AdminPageShell>
      <PageHeader
        title="Seller Analytics"
        subtitle="Track seller performance by day, week, or month with marketplace and date filters."
        actions={(
          <>
            {loading && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mr: 0.5 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Loading...</Typography>
              </Stack>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={loadAnalytics}
              disabled={loading}
              sx={yellowOutlinedButtonSx}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleOpenExportDialog}
              disabled={loading || analytics.length === 0}
              sx={yellowOutlinedButtonSx}
            >
              Download CSV
            </Button>
          </>
        )}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <SectionCard
        emphasized
        sx={{
          p: 2.5,
          mb: 3,
          background: dashboardSignatureTokens.surfaces.pageCard,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 1.8, fontWeight: 700, letterSpacing: 0.25, color: BRAND_DARK }}
        >
          Filters
        </Typography>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 210 } }}>
            <InputLabel>Select Seller</InputLabel>
            <Select
              value={selectedSeller}
              label="Select Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || seller._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 140 } }}>
            <InputLabel>Group By</InputLabel>
            <Select
              value={groupBy}
              label="Group By"
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <MenuItem value="day">Daily</MenuItem>
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={searchMarketplace}
              label="Marketplace"
              onChange={(e) => setSearchMarketplace(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="EBAY_US">US</MenuItem>
              <MenuItem value="EBAY_ENCA">Canada</MenuItem>
              <MenuItem value="EBAY_AU">Australia</MenuItem>
            </Select>
          </FormControl>

          {groupBy === 'month' ? (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Month"
                views={['year', 'month']}
                value={selectedMonth ? parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date()) : null}
                onChange={(date) => {
                  if (date) {
                    setSelectedMonth(format(date, 'yyyy-MM'));
                  }
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: { minWidth: { xs: '100%', sm: 170 } }
                  }
                }}
              />
            </LocalizationProvider>
          ) : (
            <>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 135 } }}>
                <InputLabel>Date Mode</InputLabel>
                <Select
                  value={dateFilter.mode}
                  label="Date Mode"
                  onChange={(e) => setDateFilter((prev) => ({ ...prev, mode: e.target.value }))}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">Single Day</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>

              {dateFilter.mode === 'single' && (
                <TextField
                  size="small"
                  label="Date"
                  type="date"
                  value={dateFilter.single}
                  onChange={(e) => setDateFilter((prev) => ({ ...prev, single: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: { xs: '100%', sm: 140 } }}
                />
              )}

              {dateFilter.mode === 'range' && (
                <>
                  <TextField
                    size="small"
                    label="From"
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, from: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: { xs: '100%', sm: 150 } }}
                  />
                  <TextField
                    size="small"
                    label="To"
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter((prev) => ({ ...prev, to: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: { xs: '100%', sm: 150 } }}
                  />
                </>
              )}
            </>
          )}

          <Button
            variant="outlined"
            onClick={() => {
              setSelectedSeller('');
              setSearchMarketplace('');
              setGroupBy('day');
              const today = new Date();
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              setDateFilter({
                mode: 'range',
                single: '',
                from: thirtyDaysAgo.toISOString().split('T')[0],
                to: today.toISOString().split('T')[0]
              });
              setSelectedMonth(today.toISOString().slice(0, 7));
            }}
            sx={yellowOutlinedButtonSx}
          >
            Reset
          </Button>
        </Stack>
      </SectionCard>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <SectionCard
              sx={{
                p: 2.1,
                height: '100%',
                background: dashboardSignatureTokens.surfaces.metricCard,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Orders</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>{summary.totalOrders}</Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha('#1976d2', 0.14) }}>
                  <ShoppingCartIcon sx={{ fontSize: 26, color: '#1976d2' }} />
                </Box>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SectionCard
              sx={{
                p: 2.1,
                height: '100%',
                background: dashboardSignatureTokens.surfaces.metricCard,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Earnings</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, color: 'success.dark' }}>
                    {formatCurrency(summary.totalEarnings)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha('#15803d', 0.14) }}>
                  <AttachMoneyIcon sx={{ fontSize: 26, color: '#15803d' }} />
                </Box>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SectionCard
              sx={{
                p: 2.1,
                height: '100%',
                background: dashboardSignatureTokens.surfaces.metricCard,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Profit (INR)</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700, color: summary.totalProfit >= 0 ? 'success.dark' : 'error.main' }}>
                    {formatINR(summary.totalProfit)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha(summary.totalProfit >= 0 ? '#15803d' : '#b91c1c', 0.14) }}>
                  <TrendingUpIcon sx={{ fontSize: 26, color: summary.totalProfit >= 0 ? '#15803d' : '#b91c1c' }} />
                </Box>
              </Stack>
            </SectionCard>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <SectionCard
              sx={{
                p: 2.1,
                height: '100%',
                background: dashboardSignatureTokens.surfaces.metricCard,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Avg Order Value</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 700 }}>
                    {formatCurrency(summary.avgOrderValue)}
                  </Typography>
                </Box>
                <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: alpha('#0369a1', 0.14) }}>
                  <AccountBalanceIcon sx={{ fontSize: 26, color: '#0369a1' }} />
                </Box>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      )}

      {loading ? (
        <SectionCard sx={{ p: 5, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </SectionCard>
      ) : analytics.length === 0 ? (
        <SectionCard sx={{ p: 2.5 }}>
          <Alert severity="info" sx={{ mb: 0 }}>
            {dateFilter.mode !== 'none'
              ? 'No data found for the selected filters.'
              : 'Select a date range to view analytics.'}
          </Alert>
        </SectionCard>
      ) : (
        <SectionCard sx={{ p: 0, ...tableContainerSx }}>
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>
                    {groupBy === 'day' ? 'Date' : groupBy === 'week' ? 'Week' : 'Month'}
                  </TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Orders</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Subtotal</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Shipping</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Sales Tax</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Transaction Fees</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Ad Fees</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Earnings</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>P.Balance (INR)</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>A_total-inr</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Credit Card Fees</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>A_total-inr + CC Fees</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Profit (INR)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.map((row, index) => (
                  <TableRow key={index} sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx}>
                      <Chip
                        label={getGroupLabel(row.period)}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          color: BRAND_DARK,
                          backgroundColor: alpha(BRAND_DARK, 0.08),
                          border: `1px solid ${alpha(BRAND_DARK, 0.12)}`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, fontWeight: 700 }}>{row.totalOrders}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(row.totalSubtotal)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(row.totalShipping)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(row.totalSalesTax)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(row.totalTransactionFees)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(row.totalAdFees)}</TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, fontWeight: 700, color: 'success.dark' }}>
                      {formatCurrency(row.totalEarnings)}
                    </TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, fontWeight: 700, color: 'info.dark' }}>
                      {formatINR(row.totalPBalanceINR)}
                    </TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR(row.totalAmazonCosts)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR(row.totalCreditCardFees)}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR((row.totalAmazonCosts || 0) + (row.totalCreditCardFees || 0))}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ ...tableBodyCellSx, fontWeight: 700, color: row.totalProfit >= 0 ? 'success.dark' : 'error.main' }}
                    >
                      {formatINR(row.totalProfit)}
                    </TableCell>
                  </TableRow>
                ))}

                {analytics.length > 0 && (
                  <TableRow
                    sx={{
                      '& td': {
                        fontWeight: 700,
                        backgroundColor: alpha(BRAND_DARK, 0.045),
                        borderTop: `2px solid ${alpha(BRAND_DARK, 0.14)}`,
                      }
                    }}
                  >
                    <TableCell sx={{ ...tableBodyCellSx, color: 'text.secondary' }}>TOTAL</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{totals.totalOrders}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(parseFloat(totals.totalSubtotal.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(parseFloat(totals.totalShipping.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(parseFloat(totals.totalSalesTax.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(parseFloat(totals.totalTransactionFees.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatCurrency(parseFloat(totals.totalAdFees.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, color: 'success.dark' }}>
                      {formatCurrency(parseFloat(totals.totalEarnings.toFixed(2)))}
                    </TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, color: 'info.dark' }}>
                      {formatINR(parseFloat(totals.totalPBalanceINR.toFixed(2)))}
                    </TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR(parseFloat(totals.totalAmazonCosts.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR(parseFloat(totals.totalCreditCardFees.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={tableBodyCellSx}>{formatINR(parseFloat(totals.totalAmazonAndCreditCardFees.toFixed(2)))}</TableCell>
                    <TableCell align="right" sx={{ ...tableBodyCellSx, color: totals.totalProfit >= 0 ? 'success.dark' : 'error.main' }}>
                      {formatINR(parseFloat(totals.totalProfit.toFixed(2)))}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      )}

      <Dialog
        open={exportDialogOpen}
        onClose={() => !exportingCsv && setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: `${dashboardSignatureTokens.radius.card}px`,
            overflow: 'hidden',
            boxShadow: dashboardSignatureTokens.shadows.card,
            background: dashboardSignatureTokens.surfaces.pageCard,
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              mx: -3,
              mt: -3,
              mb: 2.5,
              px: 3,
              py: 2,
              bgcolor: BRAND_DARK,
              color: '#fff'
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Export CSV
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                Download the current seller analytics rows with selected columns.
              </Typography>
            </Box>
            <IconButton onClick={() => setExportDialogOpen(false)} disabled={exportingCsv} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} mb={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedExportColumns(ANALYTICS_COLUMNS.map((column) => column.id))}
              disabled={exportingCsv}
              sx={yellowOutlinedButtonSx}
            >
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedExportColumns([])}
              disabled={exportingCsv}
              sx={yellowOutlinedButtonSx}
            >
              Clear All
            </Button>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              maxHeight: 320,
              overflowY: 'auto',
              borderRadius: 2,
              borderColor: dashboardSignatureTokens.table.rowBorder,
              background: dashboardSignatureTokens.surfaces.metricCard,
            }}
          >
            <Stack>
              {ANALYTICS_COLUMNS.map((column) => (
                <FormControlLabel
                  key={column.id}
                  sx={{
                    mx: 0,
                    px: 1,
                    borderRadius: 1.5,
                    '&:hover': {
                      backgroundColor: dashboardSignatureTokens.table.rowHover,
                    }
                  }}
                  control={
                    <Checkbox
                      checked={selectedExportColumns.includes(column.id)}
                      onChange={() => handleToggleExportColumn(column.id)}
                      disabled={exportingCsv}
                      sx={{
                        color: BRAND_DARK,
                        '&.Mui-checked': {
                          color: BRAND_DARK,
                        }
                      }}
                    />
                  }
                  label={column.label}
                />
              ))}
            </Stack>
          </Paper>

          {selectedExportColumns.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Select at least one column to export.
            </Alert>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Exporting all currently loaded analytics rows plus the totals row.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setExportDialogOpen(false)} disabled={exportingCsv} sx={yellowOutlinedButtonSx}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleExecuteExport}
                disabled={exportingCsv || selectedExportColumns.length === 0 || analytics.length === 0}
                sx={yellowFilledButtonSx}
              >
                {exportingCsv ? 'Exporting...' : 'Download'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Dialog>
    </AdminPageShell>
  );
}
