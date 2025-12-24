import React, { useEffect, useState, useRef } from 'react';
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
  Chip,
  TextField,
  IconButton,
  Pagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../lib/api';

export default function AllOrdersSheetPage() {
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Exchange rate management
  const [currentExchangeRate, setCurrentExchangeRate] = useState(null);
  const [amazonExchangeRate, setAmazonExchangeRate] = useState(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState('EBAY');
  const [newRate, setNewRate] = useState('');
  const [newRateDate, setNewRateDate] = useState('');
  const [rateHistory, setRateHistory] = useState([]);
  const [showRateHistory, setShowRateHistory] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  
  // CSV Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');
  const [csvFileName, setCsvFileName] = useState('');

  // Session storage key for persisting state
  const STORAGE_KEY = 'all_orders_sheet_state';

  // Helper to get initial state from sessionStorage
  const getInitialState = (key, defaultValue) => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (e) {
      console.error('Error reading sessionStorage:', e);
    }
    return defaultValue;
  };

  // Search filters
  const [selectedSeller, setSelectedSeller] = useState(() => getInitialState('selectedSeller', ''));
  const [searchOrderId, setSearchOrderId] = useState(() => getInitialState('searchOrderId', ''));
  const [searchBuyerName, setSearchBuyerName] = useState(() => getInitialState('searchBuyerName', ''));
  const [searchMarketplace, setSearchMarketplace] = useState(() => getInitialState('searchMarketplace', ''));
  const [filtersExpanded, setFiltersExpanded] = useState(() => getInitialState('filtersExpanded', false));

  // Pagination state
  const [currentPage, setCurrentPage] = useState(() => getInitialState('currentPage', 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(50);

  // Date filter
  const [dateFilter, setDateFilter] = useState(() => getInitialState('dateFilter', {
    mode: 'none',
    single: '',
    from: '',
    to: ''
  }));

  const isInitialMount = useRef(true);
  const hasFetchedInitialData = useRef(false);
  
  const prevFilters = useRef({
    selectedSeller,
    searchOrderId,
    searchBuyerName,
    searchMarketplace,
    dateFilter
  });

  // Persist filter state to sessionStorage
  useEffect(() => {
    const stateToSave = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchMarketplace,
      filtersExpanded,
      currentPage,
      dateFilter
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedSeller, searchOrderId, searchBuyerName, searchMarketplace, filtersExpanded, currentPage, dateFilter]);

  // Initial load
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      fetchCurrentExchangeRate('EBAY');
      fetchCurrentExchangeRate('AMAZON');
      fetchRateHistory();
      loadOrders();
    }
  }, []);

  // Refetch rate history when marketplace or showRateHistory changes
  useEffect(() => {
    if (showRateHistory) {
      fetchRateHistory(selectedMarketplace);
    }
  }, [showRateHistory, selectedMarketplace]);

  // Reload when page changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadOrders();
  }, [currentPage]);

  // When filters change, reset to page 1
  useEffect(() => {
    const filtersChanged = 
      prevFilters.current.selectedSeller !== selectedSeller ||
      prevFilters.current.searchOrderId !== searchOrderId ||
      prevFilters.current.searchBuyerName !== searchBuyerName ||
      prevFilters.current.searchMarketplace !== searchMarketplace ||
      JSON.stringify(prevFilters.current.dateFilter) !== JSON.stringify(dateFilter);
    
    prevFilters.current = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchMarketplace,
      dateFilter
    };

    if (!hasFetchedInitialData.current) return;

    if (filtersChanged) {
      if (currentPage === 1) {
        loadOrders();
      } else {
        setCurrentPage(1);
      }
    }
  }, [selectedSeller, searchOrderId, searchBuyerName, searchMarketplace, dateFilter]);

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function fetchCurrentExchangeRate(marketplace = 'EBAY') {
    try {
      const { data } = await api.get('/exchange-rates/current', { params: { marketplace } });
      if (marketplace === 'EBAY') {
        setCurrentExchangeRate(data);
      } else if (marketplace === 'AMAZON') {
        setAmazonExchangeRate(data);
      }
    } catch (e) {
      console.error(`Failed to fetch ${marketplace} exchange rate:`, e);
    }
  }

  async function fetchRateHistory(marketplace = 'EBAY') {
    try {
      const { data } = await api.get('/exchange-rates/history', { params: { marketplace, limit: 20 } });
      setRateHistory(data || []);
    } catch (e) {
      console.error(`Failed to fetch ${marketplace} rate history:`, e);
    }
  }

  async function handleSetExchangeRate() {
    if (!newRate || !newRateDate) {
      alert('Please enter both rate and effective date');
      return;
    }

    try {
      await api.post('/exchange-rates', {
        rate: parseFloat(newRate),
        effectiveDate: newRateDate,
        marketplace: selectedMarketplace,
        notes: `Set via All Orders Sheet for ${selectedMarketplace}`
      });
      
      setNewRate('');
      setNewRateDate('');
      await fetchCurrentExchangeRate('EBAY');
      await fetchCurrentExchangeRate('AMAZON');
      await fetchRateHistory(selectedMarketplace);
      alert(`${selectedMarketplace} exchange rate set successfully`);
    } catch (e) {
      alert('Failed to set exchange rate: ' + (e?.response?.data?.error || e.message));
    }
  }

  async function exportToCSV(useCustomRange = false) {
    setExportingCSV(true);

    try {
      let ordersToExport = orders;
      
      // If custom date range is selected, fetch all orders in that range
      if (useCustomRange && csvStartDate && csvEndDate) {
        const params = {
          page: 1,
          limit: 10000, // Large limit to get all orders
          startDate: csvStartDate,
          endDate: csvEndDate
        };
        
        if (selectedSeller) params.sellerId = selectedSeller;
        if (searchMarketplace) params.searchMarketplace = searchMarketplace;
        
        const { data } = await api.get('/ebay/all-orders-usd', { params });
        ordersToExport = data.orders || [];
        
        if (ordersToExport.length === 0) {
          alert('No orders found in the selected date range');
          setExportingCSV(false);
          setShowExportModal(false);
          return;
        }
      } else if (orders.length === 0) {
        alert('No orders to export');
        setExportingCSV(false);
        return;
      }
      // Define CSV headers matching table structure
      const headers = [
        'Seller',
        'Date Sold',
        'Product Name',
        'Marketplace',
        // eBay Side (12 columns - removed Refunds)
        'Subtotal',
        'Shipping',
        'Sales Tax',
        'Discount',
        'Transaction Fees',
        'Ad Fee',
        'Earnings',
        'TDS',
        'T.ID',
        'NET',
        'Exchange Rate',
        'P.Balance (INR)',
        // Amazon Side (5 columns)
        'Before Tax',
        'Estimated Tax',
        'Amazon_total',
        'Amazon Exch Rate',
        'A_total-inr',
        // Credit Card (3 columns)
        'Marketplace Fee',
        'IGST',
        'Total_CC',
        // Final columns
        'PROFIT (INR)',
        'Amazon Acc',
        'Order ID',
        'Buyer Name',
        'Arriving'
      ];

      // Generate CSV rows
      const rows = ordersToExport.map(order => {
        const isCancelled = order.cancelState === 'CANCELED' || 
                           order.cancelState === 'CANCELLED' || 
                           order.cancelStatus?.cancelState === 'CANCELED' ||
                           order.cancelStatus?.cancelState === 'CANCELLED';
        const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
        const showZero = isCancelled || isPartiallyRefunded;
        
        const subtotal = showZero ? 0 : (parseFloat(order.subtotalUSD) || 0);
        const salesTax = showZero ? 0 : (parseFloat(order.salesTaxUSD) || 0);
        const transactionFees = showZero ? 0 : (parseFloat(order.transactionFeesUSD) || 0);
        const adFeeGeneral = showZero ? 0 : (parseFloat(order.adFeeGeneral) || 0);
        const discount = showZero ? 0 : (parseFloat(order.discountUSD) || 0);
        const shipping = showZero ? 0 : (parseFloat(order.shippingUSD) || 0);
        
        // Use DB fields for financial calculations
        const earnings = parseFloat(order.orderEarnings) || 0;
        const tds = parseFloat(order.tds) || 0;
        const tid = parseFloat(order.tid) || 0;
        const net = parseFloat(order.net) || 0;

        const exchangeRate = order.ebayExchangeRate || 85;
        const pBalanceINR = parseFloat(order.pBalanceINR) || 0;

        // Use DB fields for Amazon financial calculations
        const beforeTax = isCancelled ? 0 : (parseFloat(order.beforeTaxUSD) || 0);
        const estimatedTax = isCancelled ? 0 : (parseFloat(order.estimatedTaxUSD) || 0);
        const amazonTotal = parseFloat(order.amazonTotal) || 0;
        const amazonExchangeRate = order.amazonExchangeRate || 87;
        const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
        const marketplaceFee = parseFloat(order.marketplaceFee) || 0;
        const igst = parseFloat(order.igst) || 0;
        const totalCC = parseFloat(order.totalCC) || 0;
        const profit = pBalanceINR - aTotalInr - totalCC;

        return [
          order.seller?.user?.username || '-',
          formatDate(order.dateSold, order.purchaseMarketplaceId).replace('\n', ' '),
          (order.lineItems && order.lineItems.length > 0 
            ? order.lineItems.map(item => `x${item.quantity} ${item.title}`).join(' | ')
            : order.productName || '-'
          ).replace(/"/g, '""'), // Escape quotes
          order.purchaseMarketplaceId?.replace('EBAY_', '') || '-',
          subtotal.toFixed(2),
          shipping.toFixed(2),
          salesTax.toFixed(2),
          discount.toFixed(2),
          transactionFees.toFixed(2),
          adFeeGeneral.toFixed(2),
          earnings.toFixed(2),
          tds.toFixed(2),
          tid.toFixed(2),
          net.toFixed(2),
          exchangeRate.toFixed(5),
          pBalanceINR.toFixed(2),
          beforeTax.toFixed(2),
          estimatedTax.toFixed(2),
          amazonTotal.toFixed(2),
          amazonExchangeRate,
          aTotalInr.toFixed(2),
          marketplaceFee.toFixed(2),
          igst.toFixed(2),
          totalCC.toFixed(2),
          profit.toFixed(2),
          order.amazonAccount || '-',
          order.orderId || '-',
          order.buyer?.buyerRegistrationAddress?.fullName || '-',
          order.arrivingDate || '-'
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = csvFileName.trim() 
        ? `${csvFileName.trim()}.csv` 
        : `all_orders_sheet_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (useCustomRange) {
        setShowExportModal(false);
        setCsvStartDate('');
        setCsvEndDate('');
        setCsvFileName('');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  }

  async function loadOrders() {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: currentPage,
        limit: ordersPerPage,
        excludeCancelled: true // Exclude cancelled orders
      };
      
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
      if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;

      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      const { data } = await api.get('/ebay/all-orders-usd', { params });
      setOrders(data?.orders || []);
      
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
      }
    } catch (e) {
      setOrders([]);
      setError(e?.response?.data?.error || 'Failed to load orders');
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

  const formatDate = (dateStr, marketplaceId) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      
      // Determine timezone based on marketplace
      let timezone = 'America/Los_Angeles'; // Default PT
      if (marketplaceId === 'EBAY_AU') timezone = 'Australia/Sydney';
      else if (marketplaceId === 'EBAY_CA') timezone = 'America/Toronto';
      else if (marketplaceId === 'EBAY_GB') timezone = 'Europe/London';
      
      // Format date only (no time for All Orders Sheet)
      const dateOptions = { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        timeZone: timezone
      };
      
      const formattedDate = date.toLocaleDateString('en-US', dateOptions);
      
      return formattedDate;
    } catch {
      return '-';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* CSV Export Modal */}
      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Orders by Date Range</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Select a date range to download all orders within that period.
            </Typography>
            <TextField
              label="Start Date"
              type="date"
              value={csvStartDate}
              onChange={(e) => setCsvStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={csvEndDate}
              onChange={(e) => setCsvEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="CSV File Name (optional)"
              type="text"
              value={csvFileName}
              onChange={(e) => setCsvFileName(e.target.value)}
              placeholder="e.g. my_orders_december"
              helperText="Leave empty for default name with date"
              fullWidth
            />
            {csvStartDate && csvEndDate && (
              <Alert severity="info">
                Will export all orders from {new Date(csvStartDate).toLocaleDateString()} to {new Date(csvEndDate).toLocaleDateString()}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => exportToCSV(true)}
            disabled={!csvStartDate || !csvEndDate || exportingCSV}
          >
            {exportingCSV ? 'Exporting...' : 'Download CSV'}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">All Orders Sheet (USD)</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={() => exportToCSV(false)}
            disabled={exportingCSV || orders.length === 0}
          >
            {exportingCSV ? 'Exporting...' : 'Download Current Page'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setShowExportModal(true)}
            disabled={exportingCSV}
          >
            Download by Date Range
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            onClick={loadOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Top Controls: Seller & Marketplace */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
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

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={searchMarketplace}
              label="Marketplace"
              onChange={(e) => setSearchMarketplace(e.target.value)}
            >
              <MenuItem value="">All Marketplaces</MenuItem>
              <MenuItem value="EBAY_US">eBay US</MenuItem>
              <MenuItem value="EBAY_AU">eBay Australia</MenuItem>
              <MenuItem value="EBAY_CA">eBay Canada</MenuItem>
              <MenuItem value="EBAY_GB">eBay UK</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Search Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Box 
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Search Filters
            </Typography>
            <IconButton size="small">
              {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          {filtersExpanded && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
              <TextField
                size="small"
                label="Order ID"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Search by order ID..."
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Buyer Name"
                value={searchBuyerName}
                onChange={(e) => setSearchBuyerName(e.target.value)}
                placeholder="Search by buyer name..."
                sx={{ flex: 1 }}
              />
              
              {/* Date Mode Selector */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="date-mode-label">Date Mode</InputLabel>
                <Select
                  labelId="date-mode-label"
                  value={dateFilter.mode}
                  label="Date Mode"
                  onChange={(e) => setDateFilter(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">Single Day</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>

              {/* Single Date Input */}
              {dateFilter.mode === 'single' && (
                <TextField
                  size="small"
                  label="Date"
                  type="date"
                  value={dateFilter.single}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
              )}

              {/* Range Inputs */}
              {dateFilter.mode === 'range' && (
                <>
                  <TextField
                    size="small"
                    label="From"
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150 }}
                  />
                  <TextField
                    size="small"
                    label="To"
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150 }}
                  />
                </>
              )}

              {/* Clear Button */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearchOrderId('');
                  setSearchBuyerName('');
                  setDateFilter({ mode: 'none', single: '', from: '', to: '' });
                }}
                sx={{ minWidth: 80 }}
              >
                CLEAR
              </Button>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Exchange Rate Management */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Exchange Rate (USD to INR)
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowRateHistory(!showRateHistory)}
              endIcon={showRateHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showRateHistory ? 'Hide' : 'Show'} History
            </Button>
          </Stack>

          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
            <Box>
              <Typography variant="body2" color="text.secondary">eBay Rate</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {currentExchangeRate?.rate || 82} INR
              </Typography>
              {currentExchangeRate?.effectiveDate && (
                <Typography variant="caption" color="text.secondary">
                  Effective: {new Date(currentExchangeRate.effectiveDate).toLocaleDateString()}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Amazon Rate</Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {amazonExchangeRate?.rate || 87} INR
              </Typography>
              {amazonExchangeRate?.effectiveDate && (
                <Typography variant="caption" color="text.secondary">
                  Effective: {new Date(amazonExchangeRate.effectiveDate).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Marketplace</InputLabel>
              <Select
                value={selectedMarketplace}
                label="Marketplace"
                onChange={(e) => setSelectedMarketplace(e.target.value)}
              >
                <MenuItem value="EBAY">eBay</MenuItem>
                <MenuItem value="AMAZON">Amazon</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="New Rate"
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              sx={{ width: 150 }}
              placeholder="e.g. 84"
            />
            <TextField
              size="small"
              label="Effective Date"
              type="date"
              value={newRateDate}
              onChange={(e) => setNewRateDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 180 }}
            />
            <Button
              variant="contained"
              onClick={handleSetExchangeRate}
              disabled={!newRate || !newRateDate}
            >
              Set {selectedMarketplace} Rate
            </Button>
          </Stack>

          {showRateHistory && rateHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{selectedMarketplace} Rate History</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Effective Date</TableCell>
                      <TableCell>Rate (INR)</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rateHistory.map((rate) => (
                      <TableRow key={rate._id}>
                        <TableCell>{new Date(rate.effectiveDate).toLocaleDateString()}</TableCell>
                        <TableCell><strong>{rate.rate}</strong></TableCell>
                        <TableCell>{new Date(rate.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{rate.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Orders Count & Pagination */}
      {!loading && orders.length > 0 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {orders.length} of {totalOrders} orders
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
          />
        </Stack>
      )}

      {/* Orders Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Alert severity="info">No orders found</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" stickyHeader>
            <TableHead>
              {/* First row: Section headers */}
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Seller</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Date Sold</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Product Name</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Marketplace</TableCell>
                <TableCell colSpan={12} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', borderBottom: '2px solid #ffb74d', borderRight: '2px solid #90caf9' }}>eBay Side</TableCell>
                <TableCell colSpan={5} align="center" sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', borderBottom: '2px solid #81c784', borderRight: '2px solid #90caf9' }}>Amazon Side</TableCell>
                <TableCell colSpan={3} align="center" sx={{ fontWeight: 'bold', bgcolor: '#fce4ec', borderBottom: '2px solid #f48fb1', borderRight: '2px solid #90caf9' }}>Credit Card</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#fff9c4', borderRight: '2px solid #90caf9' }} align="right">PROFIT<br />(INR)</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Amazon<br />Acc</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Order ID</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd', borderRight: '2px solid #90caf9' }}>Buyer<br />Name</TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 'bold', bgcolor: '#e3f2fd' }}>Arriving</TableCell>
              </TableRow>
              {/* Second row: eBay Side and Amazon Side column headers */}
              <TableRow>
                <Tooltip title="Product price (excluding tax and shipping)" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Subtotal</TableCell>
                </Tooltip>
                <Tooltip title="Shipping cost" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Shipping</TableCell>
                </Tooltip>
                <Tooltip title="Sales tax collected" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Sales Tax</TableCell>
                </Tooltip>
                <Tooltip title="Discount applied" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Discount</TableCell>
                </Tooltip>
                <Tooltip title="eBay marketplace transaction fees" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Transaction Fees</TableCell>
                </Tooltip>
                <Tooltip title="eBay advertising fees" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Ad Fee</TableCell>
                </Tooltip>
                <Tooltip title="Earnings = Subtotal + Discount - Sales Tax - Transaction Fees - Ad Fee - Shipping" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Earnings</TableCell>
                </Tooltip>
                <Tooltip title="TDS = Earnings × 1%" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">TDS</TableCell>
                </Tooltip>
                <Tooltip title="T.ID = $0.24 (fixed transaction ID fee)" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">T.ID</TableCell>
                </Tooltip>
                <Tooltip title="NET = Earnings - TDS - T.ID" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">NET</TableCell>
                </Tooltip>
                <Tooltip title="Exchange Rate (USD to INR) based on order date" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', cursor: 'help' }} align="right">Exchange Rate</TableCell>
                </Tooltip>
                <Tooltip title="P.Balance = NET × Exchange Rate (in INR)" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fff3e0', borderRight: '2px solid #90caf9', cursor: 'help' }} align="right">P.Balance (INR)</TableCell>
                </Tooltip>
                <Tooltip title="Amazon order cost before tax" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', cursor: 'help' }} align="right">Before Tax</TableCell>
                </Tooltip>
                <Tooltip title="Amazon estimated tax" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', cursor: 'help' }} align="right">Estimated Tax</TableCell>
                </Tooltip>
                <Tooltip title="Amazon Total = Before Tax + Estimated Tax" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', cursor: 'help' }} align="right">Amazon_total</TableCell>
                </Tooltip>
                <Tooltip title="Amazon Exchange Rate (USD to INR)" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', cursor: 'help' }} align="right">Amazon Exch Rate</TableCell>
                </Tooltip>
                <Tooltip title="A_total-inr = Amazon_total × Amazon Exchange Rate" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e8f5e9', borderRight: '2px solid #90caf9', cursor: 'help' }} align="right">A_total-inr</TableCell>
                </Tooltip>
                <Tooltip title="Marketplace Fee = 4% of A_total-inr" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fce4ec', cursor: 'help' }} align="right">Marketplace Fee</TableCell>
                </Tooltip>
                <Tooltip title="IGST = 18% of Marketplace Fee" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fce4ec', cursor: 'help' }} align="right">IGST</TableCell>
                </Tooltip>
                <Tooltip title="Total_CC = Marketplace Fee + IGST" arrow placement="top">
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: '#fce4ec', borderRight: '2px solid #90caf9', cursor: 'help' }} align="right">Total_CC</TableCell>
                </Tooltip>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id} hover>
                  <TableCell>{order.seller?.user?.username || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.4, fontSize: '0.8rem' }}>
                      {formatDate(order.dateSold, order.purchaseMarketplaceId)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 250, maxWidth: 350 }}>
                    <Stack spacing={0.5}>
                      {order.lineItems && order.lineItems.length > 0 ? (
                        order.lineItems.map((item, i) => (
                          <Box 
                            key={i}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 0.5,
                              borderBottom: i < order.lineItems.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                              pb: i < order.lineItems.length - 1 ? 0.5 : 0
                            }}
                          >
                            <Chip
                              label={`x${item.quantity}`}
                              size="small"
                              sx={{
                                height: 20,
                                minWidth: 30,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                bgcolor: item.quantity > 1 ? '#ed6c02' : '#e0e0e0',
                                color: item.quantity > 1 ? '#fff' : 'rgba(0,0,0,0.87)'
                              }}
                            />
                            <Typography 
                              variant="body2" 
                              sx={{
                                flex: 1,
                                fontSize: '0.85rem',
                                lineHeight: 1.3,
                                fontWeight: item.quantity > 1 ? 500 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}
                              title={item.title}
                            >
                              {item.title}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2">{order.productName || '-'}</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.purchaseMarketplaceId?.replace('EBAY_', '') || '-'} 
                      size="small"
                      color={order.purchaseMarketplaceId === 'EBAY_US' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  {/* eBay Side Columns - Show $0.00 for cancelled or partially refunded orders */}
                  {(() => {
                    const isCancelled = order.cancelState === 'CANCELED' || 
                                       order.cancelState === 'CANCELLED' || 
                                       order.cancelStatus?.cancelState === 'CANCELED' ||
                                       order.cancelStatus?.cancelState === 'CANCELLED';
                    const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                    const showZero = isCancelled || isPartiallyRefunded;
                    
                    return (
                      <>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.subtotalUSD)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.shippingUSD)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.salesTaxUSD)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.discountUSD)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.transactionFeesUSD)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.adFeeGeneral)}</TableCell>
                      </>
                    );
                  })()}
                  {/* Earnings (from DB), TDS, T.ID, NET, Exchange Rate, P.Balance */}
                  <TableCell align="right">
                    {formatCurrency(order.orderEarnings)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.tds)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.tid)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.net)}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '-';
                      
                      // Show manually set eBay exchange rate from DB
                      const rate = order.ebayExchangeRate || 85;
                      
                      return (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {rate}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      
                      if (isCancelled) return '₹0.00';
                      
                      // Use pBalanceINR from DB
                      const pBalance = order.pBalanceINR;
                      if (pBalance == null) return '-';
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: pBalance < 0 ? 'error.main' : 'success.main'
                          }}
                        >
                          ₹{parseFloat(pBalance).toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Amazon Side Columns */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      return isCancelled ? '$0.00' : formatCurrency(order.beforeTaxUSD);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      return isCancelled ? '$0.00' : formatCurrency(order.estimatedTaxUSD);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '$0.00';
                      
                      // Use amazonTotal from DB
                      return formatCurrency(order.amazonTotal);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '-';
                      
                      return (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {order.amazonExchangeRate || 87}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use amazonTotalINR from DB
                      const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: aTotalInr < 0 ? 'error.main' : 'primary.main'
                          }}
                        >
                          ₹{aTotalInr.toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Credit Card Columns */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use marketplaceFee from DB
                      const marketplaceFee = parseFloat(order.marketplaceFee) || 0;
                      return '₹' + marketplaceFee.toFixed(2);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use igst from DB
                      const igst = parseFloat(order.igst) || 0;
                      return '₹' + igst.toFixed(2);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use totalCC from DB
                      const totalCC = parseFloat(order.totalCC) || 0;
                      return '₹' + totalCC.toFixed(2);
                    })()}
                  </TableCell>
                  {/* PROFIT Column */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                      
                      // Use all values from DB
                      const pBalance = parseFloat(order.pBalanceINR) || 0;
                      const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
                      const totalCC = parseFloat(order.totalCC) || 0;
                      const profit = pBalance - aTotalInr - totalCC;
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '0.95rem',
                            color: profit < 0 ? 'error.main' : 'success.main'
                          }}
                        >
                          ₹{profit.toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Moved columns to end */}
                  <TableCell>{order.amazonAccount || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {order.orderId}
                    </Typography>
                  </TableCell>
                  <TableCell>{order.buyer?.buyerRegistrationAddress?.fullName || '-'}</TableCell>
                  <TableCell>{order.arrivingDate || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Bottom Pagination */}
      {!loading && orders.length > 0 && (
        <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
