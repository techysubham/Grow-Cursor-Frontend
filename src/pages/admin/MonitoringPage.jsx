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
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../lib/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'];

export default function MonitoringPage() {
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for counts
  const [counts, setCounts] = useState({
    uniqueCategories: 0,
    uniqueRanges: 0,
    uniqueProducts: 0,
    categoryData: [],
    rangeData: [],
    productData: []
  });

  // Chart comparison data
  const [comparisonChartData, setComparisonChartData] = useState([]);
  const [chartType, setChartType] = useState('categories'); // 'categories', 'ranges', 'products'

  // Filters
  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  const [searchItemNumber, setSearchItemNumber] = useState('');
  const [searchProductName, setSearchProductName] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [excludeLowValue, setExcludeLowValue] = useState(false);
  const [excludeNoAmazonAccount, setExcludeNoAmazonAccount] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(25);

  // Date filter
  const [dateFilter, setDateFilter] = useState({
    mode: 'none',
    single: '',
    from: '',
    to: ''
  });

  // Profit filter
  const [profitFilter, setProfitFilter] = useState({
    mode: 'none',
    single: '',
    from: '',
    to: ''
  });

  // Modal for names
  const [namesModal, setNamesModal] = useState({
    open: false,
    type: '',
    title: '',
    items: []
  });

  // References
  const isInitialMount = useRef(true);
  const hasFetchedInitialData = useRef(false);
  const prevFilters = useRef({});

  // Session storage key
  const STORAGE_KEY = 'monitoring_page_state';

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

  // Persist filter state to sessionStorage
  useEffect(() => {
    const stateToSave = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchItemNumber,
      searchProductName,
      searchMarketplace,
      filtersExpanded,
      currentPage,
      dateFilter,
      profitFilter,
      excludeLowValue,
      excludeNoAmazonAccount,
      chartType
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedSeller, searchOrderId, searchBuyerName, searchItemNumber, searchProductName, searchMarketplace, filtersExpanded, currentPage, dateFilter, profitFilter, excludeLowValue, excludeNoAmazonAccount, chartType]);

  // Initial load
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      loadOrders();
    }
  }, []);

  // Reload when page changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadOrders();
  }, [currentPage]);

  // When search is triggered, reset to page 1 and fetch
  useEffect(() => {
    if (searchTriggered && hasFetchedInitialData.current) {
      if (currentPage === 1) {
        loadOrders();
      } else {
        setCurrentPage(1);
      }
      setSearchTriggered(false);
    }
  }, [searchTriggered, currentPage]);

  // Update chart data when counts or chart type changes
  useEffect(() => {
    if (counts) {
      let dataSource = [];
      if (chartType === 'categories') {
        dataSource = counts.categoryData || [];
      } else if (chartType === 'ranges') {
        dataSource = counts.rangeData || [];
      } else if (chartType === 'products') {
        dataSource = counts.productData || [];
      }
      
      // Format data for PieChart
      const chartData = dataSource.map(item => ({
        name: item.name || item._id || 'Unknown',
        value: item.count || 0
      })).slice(0, 10); // Limit to top 10

      setComparisonChartData(chartData);
    }
  }, [counts, chartType]);

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function loadOrders() {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: currentPage,
        limit: ordersPerPage,
        excludeCancelled: true
      };
      
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
      if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
      if (searchItemNumber.trim()) params.searchItemNumber = searchItemNumber.trim();
      if (searchProductName.trim()) params.productName = searchProductName.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;
      if (excludeLowValue) params.excludeLowValue = true;
      if (excludeNoAmazonAccount) params.excludeNoAmazonAccount = true;

      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      if (profitFilter.mode === 'single' && profitFilter.single !== '') {
        params.maxProfit = profitFilter.single;
      } else if (profitFilter.mode === 'range') {
        if (profitFilter.from !== '') params.minProfit = profitFilter.from;
        if (profitFilter.to !== '') params.maxProfit = profitFilter.to;
      }

      const { data } = await api.get('/ebay/all-orders-usd', { params });
      setOrders(data?.orders || []);
      
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
      }

      if (data?.counts) {
        setCounts(data.counts);
      }
    } catch (e) {
      setOrders([]);
      setCounts({ uniqueCategories: 0, uniqueRanges: 0, uniqueProducts: 0, categoryData: [], rangeData: [], productData: [] });
      setError(e?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    if (value == null || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  const getAsins = (order) => {
    if (!order.lineItems || order.lineItems.length === 0) return '-';
    return order.lineItems
      .filter(item => item.asin)
      .map(item => item.asin)
      .join(', ');
  };

  const getCategories = (order) => {
    if (!order.lineItems || order.lineItems.length === 0) return '-';
    return order.lineItems
      .filter(item => item.category)
      .map(item => item.category)
      .join(', ');
  };

  const getRanges = (order) => {
    if (!order.lineItems || order.lineItems.length === 0) return '-';
    return order.lineItems
      .filter(item => item.range)
      .map(item => item.range)
      .join(', ');
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Listing and Order Monitoring Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time view of all orders with category, range, and product information
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filters Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Filters
          </Typography>
          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {filtersExpanded ? 'Hide' : 'Show'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadOrders()}
              disabled={loading}
              sx={{ ml: 1 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {filtersExpanded && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Seller</InputLabel>
                <Select
                  value={selectedSeller}
                  label="Seller"
                  onChange={(e) => setSelectedSeller(e.target.value)}
                >
                  <MenuItem value="">All Sellers</MenuItem>
                  {sellers.map(seller => (
                    <MenuItem key={seller._id} value={seller._id}>
                      {seller.user?.username || seller.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Order ID"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Search by order ID..."
                sx={{ flex: 1, minWidth: 150 }}
              />

              <TextField
                size="small"
                label="Buyer Name"
                value={searchBuyerName}
                onChange={(e) => setSearchBuyerName(e.target.value)}
                placeholder="Search by buyer name..."
                sx={{ flex: 1, minWidth: 150 }}
              />

              <TextField
                size="small"
                label="Item Number"
                value={searchItemNumber}
                onChange={(e) => setSearchItemNumber(e.target.value)}
                placeholder="Search by item #..."
                sx={{ flex: 1, minWidth: 150 }}
              />

              <TextField
                size="small"
                label="Product Name"
                value={searchProductName}
                onChange={(e) => setSearchProductName(e.target.value)}
                placeholder="Search by product name..."
                sx={{ flex: 1, minWidth: 150 }}
              />

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Marketplace</InputLabel>
                <Select
                  value={searchMarketplace}
                  label="Marketplace"
                  onChange={(e) => setSearchMarketplace(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="EBAY_US">eBay US</MenuItem>
                  <MenuItem value="EBAY_IN">eBay IN</MenuItem>
                  <MenuItem value="AMAZON">Amazon</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Date Range Filter */}
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Date Mode</InputLabel>
                <Select
                  value={dateFilter.mode}
                  label="Date Mode"
                  onChange={(e) => setDateFilter(prev => ({ ...prev, mode: e.target.value }))}
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
                  onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
              )}

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

              {/* Profit Filter */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Profit Filter</InputLabel>
                <Select
                  value={profitFilter.mode}
                  label="Profit Filter"
                  onChange={(e) => setProfitFilter(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">≤ Value</MenuItem>
                  <MenuItem value="range">Range</MenuItem>
                </Select>
              </FormControl>

              {profitFilter.mode === 'single' && (
                <TextField
                  size="small"
                  label="Max Profit (INR)"
                  type="number"
                  value={profitFilter.single}
                  onChange={(e) => setProfitFilter(prev => ({ ...prev, single: e.target.value }))}
                  placeholder="e.g. 100"
                  sx={{ width: 150 }}
                />
              )}

              {profitFilter.mode === 'range' && (
                <>
                  <TextField
                    size="small"
                    label="Min Profit (INR)"
                    type="number"
                    value={profitFilter.from}
                    onChange={(e) => setProfitFilter(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="e.g. 100"
                    sx={{ width: 150 }}
                  />
                  <TextField
                    size="small"
                    label="Max Profit (INR)"
                    type="number"
                    value={profitFilter.to}
                    onChange={(e) => setProfitFilter(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="e.g. 500"
                    sx={{ width: 150 }}
                  />
                </>
              )}

              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => setSearchTriggered(true)}
                sx={{ minWidth: 100 }}
              >
                SEARCH
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearchOrderId('');
                  setSearchBuyerName('');
                  setSearchItemNumber('');
                  setSearchProductName('');
                  setDateFilter({ mode: 'none', single: '', from: '', to: '' });
                  setProfitFilter({ mode: 'none', single: '', from: '', to: '' });
                  setExcludeLowValue(false);
                  setExcludeNoAmazonAccount(false);
                }}
                sx={{ minWidth: 80 }}
              >
                CLEAR
              </Button>
            </Stack>

            {/* Checkbox Filters */}
            <Stack direction="row" spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={excludeLowValue}
                    onChange={(e) => setExcludeLowValue(e.target.checked)}
                  />
                }
                label="Exclude < $3 Orders"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={excludeNoAmazonAccount}
                    onChange={(e) => setExcludeNoAmazonAccount(e.target.checked)}
                  />
                }
                label="Exclude No Amazon Account"
              />
            </Stack>
          </Stack>
        )}
      </Paper>

      {/* Orders Count & Info Section */}
      {!loading && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Showing {orders.length > 0 ? `${(currentPage - 1) * ordersPerPage + 1}-${(currentPage - 1) * ordersPerPage + orders.length}` : '0'} of {totalOrders} order{totalOrders !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Categories: <strong>{counts.uniqueCategories}</strong> | Ranges: <strong>{counts.uniqueRanges}</strong> | Products: <strong>{counts.uniqueProducts}</strong>
              </Typography>
            </Box>
            
            {orders.length > 0 && (
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
              />
            )}
          </Stack>
        </Paper>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Orders Table */}
      {!loading && orders.length === 0 && (
        <Alert severity="info">
          No orders found{
            (selectedSeller || searchMarketplace || dateFilter.mode !== 'none' || profitFilter.mode !== 'none' || excludeLowValue || excludeNoAmazonAccount || searchOrderId || searchBuyerName)
              ? ' with current filters'
              : ''
          }
        </Alert>
      )}

      {!loading && orders.length > 0 && (
        <>
          {/* Orders Table */}
          <TableContainer component={Paper} sx={{ overflowX: 'auto', mb: 3, maxHeight: '600px' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#e3f2fd' }}>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Seller</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 110 }}>Date Sold</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Range</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>ASIN</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Marketplace</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">Subtotal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">Profit (INR)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, index) => {
                  const profit = parseFloat(order.pBalanceINR || 0) - parseFloat(order.amazonTotalINR || 0) - parseFloat(order.totalCC || 0);
                  return (
                    <TableRow key={index} hover>
                      <TableCell>{order.seller?.user?.username || '-'}</TableCell>
                      <TableCell>{formatDate(order.dateSold)}</TableCell>
                      <TableCell>
                        {order.lineItems && order.lineItems.length > 0
                          ? order.lineItems.map(item => item.title).join(' | ')
                          : order.productName || '-'
                        }
                      </TableCell>
                      <TableCell>{getCategories(order)}</TableCell>
                      <TableCell>{getRanges(order)}</TableCell>
                      <TableCell>{getAsins(order)}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.purchaseMarketplaceId?.replace('EBAY_', '') || 'UNKNOWN'}
                          size="small"
                          color={order.purchaseMarketplaceId?.includes('AMAZON') ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(order.subtotal)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: profit >= 0 ? 'success.main' : 'error.main' }}>
                        ₹{profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pie Chart Comparison Section */}
          <Paper sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Order Distribution Comparison
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={chartType}
                    label="Chart Type"
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <MenuItem value="categories">By Categories</MenuItem>
                    <MenuItem value="ranges">By Ranges</MenuItem>
                    <MenuItem value="products">By Products</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {comparisonChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={comparisonChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value})`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {comparisonChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">No data available for chart</Alert>
              )}

              {/* Chart Statistics */}
              {chartType === 'categories' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Top Categories ({counts.uniqueCategories} total)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {counts.categoryData?.slice(0, 5).map((item, idx) => (
                      <Chip
                        key={idx}
                        label={`${item.name || 'Unknown'}: ${item.count}`}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {chartType === 'ranges' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Top Ranges ({counts.uniqueRanges} total)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {counts.rangeData?.slice(0, 5).map((item, idx) => (
                      <Chip
                        key={idx}
                        label={`${item.name || 'Unknown'}: ${item.count}`}
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {chartType === 'products' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Top Products ({counts.uniqueProducts} total)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {counts.productData?.slice(0, 5).map((item, idx) => (
                      <Chip
                        key={idx}
                        label={`${item.name || 'Unknown'}: ${item.count}`}
                        color="warning"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}
