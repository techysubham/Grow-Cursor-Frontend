import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { 
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import api from '../../lib/api';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#FF8C94', '#A8E6CF'];

// Custom label renderer to prevent overlapping
const renderCustomLabel = ({ name, value, x, y }) => {
  return (
    <text x={x} y={y} fill="#000" fontSize={12} textAnchor="middle" dominantBaseline="central">
      {`${value}`}
    </text>
  );
};

export default function MonitoringPage() {
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('pie'); // 'pie', 'bar', 'line'
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 50,
    totalOrders: 0,
  });
  const [filters, setFilters] = useState({
    searchOrderId: '',
    searchBuyerName: '',
    searchItemId: '',
    marketplace: '',
    excludeLowValue: false,
    dateMode: 'none', // 'none', 'single', 'range'
    singleDate: '',
    startDate: '',
    endDate: '',
    sellerId: '', // Account-wise filter
  });

  // Chart data states
  const [categoryData, setCategoryData] = useState([]);
  const [rangeData, setRangeData] = useState([]);
  const [productData, setProductData] = useState([]);

  // Fetch orders
  const fetchOrders = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum + 1,
        limit: pagination.limit,
        searchOrderId: filters.searchOrderId,
        searchBuyerName: filters.searchBuyerName,
        searchItemId: filters.searchItemId,
        searchMarketplace: filters.marketplace,
        excludeLowValue: filters.excludeLowValue ? 'true' : 'false',
        sellerId: filters.sellerId,
      };

      // Add date filters
      if (filters.dateMode === 'single' && filters.singleDate) {
        params.startDate = filters.singleDate;
        params.endDate = filters.singleDate;
      } else if (filters.dateMode === 'range') {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
      }

      const { data } = await api.get('/ebay/stored-orders', { params });

      setOrders(data.orders || []);
      setPagination(p => ({
        ...p,
        page: pageNum,
        totalOrders: data.pagination?.totalOrders || 0,
      }));

      // Process data for pie charts
      processChartData(data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, filters]);

  // Process orders data for pie charts
  const processChartData = (ordersList) => {
    // Category breakdown
    const categoryMap = new Map();
    const rangeMap = new Map();
    const productMap = new Map();

    ordersList.forEach(order => {
      // Category
      const categoryName = order.orderCategoryId?.name || 'Uncategorized';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);

      // Range
      const rangeName = order.orderRangeId?.name || 'No Range';
      rangeMap.set(rangeName, (rangeMap.get(rangeName) || 0) + 1);

      // Product
      const productName = order.orderProductId?.name || 'No Product';
      productMap.set(productName, (productMap.get(productName) || 0) + 1);
    });

    setCategoryData(
      Array.from(categoryMap).map(([name, value]) => ({
        name,
        value,
      }))
    );

    setRangeData(
      Array.from(rangeMap).map(([name, value]) => ({
        name,
        value,
      }))
    );

    setProductData(
      Array.from(productMap).map(([name, value]) => ({
        name,
        value,
      }))
    );
  };

  // Load sellers for account-wise filter (only on mount)
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const { data } = await api.get('/sellers/all-unfiltered');
        setSellers(data || []);
      } catch (err) {
        console.error('Failed to load sellers:', err);
      }
    };
    loadSellers();
  }, []);

  // Handle Search button click
  const handleSearch = () => {
    setPagination(p => ({ ...p, page: 0 }));
    fetchOrders(0);
  };

  const handlePageChange = (event, newPage) => {
    fetchOrders(newPage);
  };

  const handleLimitChange = (event) => {
    setPagination(p => ({ ...p, limit: parseInt(event.target.value, 10) }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(f => ({ ...f, [field]: value }));
  };

  // Universal Chart Component supporting multiple visualization types
  const ChartComponent = ({ data, title, type = 'pie' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom align="center">
          {title}
        </Typography>
        {data.length > 0 ? (
          <Box sx={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Pie Chart */}
            {type === 'pie' && (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="45%"
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={false}
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `Count: ${value}`} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend at bottom with wrapping */}
                <Box sx={{ mt: 1, width: '100%' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      justifyContent: 'center',
                      maxHeight: 80,
                      overflowY: 'auto',
                      fontSize: '0.75rem',
                    }}
                  >
                    {data.map((entry, index) => (
                      <Box
                        key={`legend-${index}`}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            backgroundColor: COLORS[index % COLORS.length],
                            borderRadius: '2px',
                          }}
                        />
                        <span>{entry.name}</span>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </>
            )}

            {/* Bar Chart */}
            {type === 'bar' && (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 70, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `Count: ${value}`} />
                  <Bar dataKey="value" fill="#4ECDC4">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart */}
            {type === 'line' && (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 70, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `Count: ${value}`} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#FF6B6B" 
                    dot={{ fill: '#FF6B6B', r: 5 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>
        ) : (
          <Typography align="center" color="textSecondary">
            No data available
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Orders Monitoring Dashboard
      </Typography>

      {/* Filters Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        
        {/* Row 1: Basic Search Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Search Order ID"
            value={filters.searchOrderId}
            onChange={(e) => handleFilterChange('searchOrderId', e.target.value)}
            sx={{ flexGrow: 1, minWidth: 150 }}
          />
          <TextField
            size="small"
            label="Search Buyer Name"
            value={filters.searchBuyerName}
            onChange={(e) => handleFilterChange('searchBuyerName', e.target.value)}
            sx={{ flexGrow: 1, minWidth: 150 }}
          />
          <TextField
            size="small"
            label="Search Item ID"
            value={filters.searchItemId}
            onChange={(e) => handleFilterChange('searchItemId', e.target.value)}
            sx={{ flexGrow: 1, minWidth: 150 }}
          />
        </Stack>

        {/* Row 2: Marketplace & Account Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ flexGrow: 1, minWidth: 150 }}>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={filters.marketplace}
              label="Marketplace"
              onChange={(e) => handleFilterChange('marketplace', e.target.value)}
            >
              <MenuItem value="">All Marketplaces</MenuItem>
              <MenuItem value="EBAY_US">eBay US</MenuItem>
              <MenuItem value="EBAY_AUS">eBay Australia</MenuItem>
              <MenuItem value="EBAY_CA">eBay Canada</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flexGrow: 1, minWidth: 150 }}>
            <InputLabel>Account (Seller)</InputLabel>
            <Select
              value={filters.sellerId}
              label="Account (Seller)"
              onChange={(e) => handleFilterChange('sellerId', e.target.value)}
            >
              <MenuItem value="">All Accounts</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || seller._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={filters.excludeLowValue}
                onChange={(e) => handleFilterChange('excludeLowValue', e.target.checked)}
              />
            }
            label="Exclude Low Value"
            sx={{ whiteSpace: 'nowrap' }}
          />
        </Stack>

        {/* Row 3: Date Filter Mode Selection */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Filter</InputLabel>
            <Select
              value={filters.dateMode}
              label="Date Filter"
              onChange={(e) => {
                handleFilterChange('dateMode', e.target.value);
                // Reset date fields when mode changes
                handleFilterChange('singleDate', '');
                handleFilterChange('startDate', '');
                handleFilterChange('endDate', '');
              }}
            >
              <MenuItem value="none">No Date Filter</MenuItem>
              <MenuItem value="single">Single Day</MenuItem>
              <MenuItem value="range">Date Range</MenuItem>
            </Select>
          </FormControl>

          {/* Single Date Picker */}
          {filters.dateMode === 'single' && (
            <TextField
              size="small"
              type="date"
              label="Select Date"
              value={filters.singleDate}
              onChange={(e) => handleFilterChange('singleDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flexGrow: 1, minWidth: 150 }}
            />
          )}

          {/* Date Range Picker */}
          {filters.dateMode === 'range' && (
            <>
              <TextField
                size="small"
                type="date"
                label="Start Date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flexGrow: 1, minWidth: 150 }}
              />
              <TextField
                size="small"
                type="date"
                label="End Date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ flexGrow: 1, minWidth: 150 }}
              />
            </>
          )}
        </Stack>

        {/* Row 4: Action Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearch}
            sx={{ fontWeight: 600 }}
          >
            Search
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters({
                searchOrderId: '',
                searchBuyerName: '',
                searchItemId: '',
                marketplace: '',
                excludeLowValue: false,
                dateMode: 'none',
                singleDate: '',
                startDate: '',
                endDate: '',
                sellerId: '',
              });
              setPagination({ page: 0, limit: 50, totalOrders: 0 });
              setOrders([]);
              setCategoryData([]);
              setRangeData([]);
              setProductData([]);
            }}
          >
            Reset Filters
          </Button>
        </Stack>
      </Paper>

      {/* Orders Table Section */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell align="left">Order ID</TableCell>
                <TableCell align="left">Buyer</TableCell>
                <TableCell align="left">Category</TableCell>
                <TableCell align="left">Range</TableCell>
                <TableCell align="left">Product</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="left">Marketplace</TableCell>
                <TableCell align="left">Date Sold</TableCell>
                <TableCell align="left">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell align="left" sx={{ fontWeight: 500 }}>
                      {order.orderId}
                    </TableCell>
                    <TableCell align="left">
                      {order.buyer?.username || 'N/A'}
                    </TableCell>
                    <TableCell align="left">
                      <Chip
                        label={order.orderCategoryId?.name || 'Uncategorized'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="left">
                      <Chip
                        label={order.orderRangeId?.name || 'No Range'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="left">
                      <Typography variant="body2">
                        {order.orderProductId?.name || 'No Product'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      ${(order.subtotal || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="left">
                      <Chip
                        label={order.purchaseMarketplaceId || 'Unknown'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="left">
                      {order.dateSold
                        ? new Date(order.dateSold).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell align="left">
                      <Chip
                        label={order.orderFulfillmentStatus || 'Unknown'}
                        size="small"
                        color={
                          order.orderFulfillmentStatus === 'FULFILLED'
                            ? 'success'
                            : 'warning'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">
                      No orders found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={pagination.totalOrders}
          rowsPerPage={pagination.limit}
          page={pagination.page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleLimitChange}
        />
      </Paper>

      {/* Charts Section with Type Selector */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Order Distribution Analysis
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Chart Type:</Typography>
            <ToggleButtonGroup
              value={chartType}
              exclusive
              onChange={(e, newChartType) => {
                if (newChartType) setChartType(newChartType);
              }}
              size="small"
            >
              <ToggleButton value="pie" aria-label="pie chart">
                Pie
              </ToggleButton>
              <ToggleButton value="bar" aria-label="bar chart">
                Bar
              </ToggleButton>
              <ToggleButton value="line" aria-label="line chart">
                Line
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6} lg={4}>
            <ChartComponent data={categoryData} title="Orders by Category" type={chartType} />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <ChartComponent data={rangeData} title="Orders by Range" type={chartType} />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <ChartComponent data={productData} title="Orders by Product" type={chartType} />
          </Grid>
        </Grid>
      </Box>

      {/* Comparison with Listings (Ready for Integration) */}
      <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', border: '2px dashed #ccc' }}>
        <Typography variant="h6" gutterBottom color="textSecondary">
          📊 Listings vs Orders Comparison (Coming Soon)
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Once listing data fetching is implemented, comparative analysis will appear here showing the difference between:
          <ul>
            <li>Orders received by category vs available listings</li>
            <li>Inventory distribution across ranges and products</li>
            <li>Stock status and reorder recommendations</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
}
