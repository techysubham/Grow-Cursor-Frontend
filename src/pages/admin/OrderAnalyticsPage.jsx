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
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Collapse,
  Switch
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import api from '../../lib/api';

export default function OrderAnalyticsPage() {
  const [statistics, setStatistics] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollResults, setPollResults] = useState(null);
  
  // Filter states - Date filter defaults to single mode with today's date
  const [dateFilter, setDateFilter] = useState({
    mode: 'single', // Default to single date mode
    single: new Date().toISOString().split('T')[0], // Default to today
    from: '',
    to: ''
  });
  const [selectedSeller, setSelectedSeller] = useState('');
  const [excludeLowValue, setExcludeLowValue] = useState(false);

  // Summary statistics - only count
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    fetchSellers();
  }, []);

  // Auto-fetch when date filter or seller changes
  useEffect(() => {
    fetchStatistics();
  }, [dateFilter, selectedSeller, excludeLowValue]);

  const fetchSellers = async () => {
    try {
      const response = await api.get('/sellers/all');
      setSellers(response.data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      
      // Handle date filtering based on mode
      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      
      if (selectedSeller) params.sellerId = selectedSeller;
      params.excludeLowValue = excludeLowValue;

      const statsResponse = await api.get('/orders/daily-statistics', { params });

      setStatistics(statsResponse.data || []);
      
      // Calculate total orders from the statistics
      const total = (statsResponse.data || []).reduce((sum, stat) => sum + stat.totalOrders, 0);
      setTotalOrders(total);
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load order statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStatistics();
  };

  // Poll for NEW orders (like FulfillmentDashboard)
  const pollNewOrders = async () => {
    setLoading(true);
    setError('');
    setPollResults(null);
    try {
      const { data } = await api.post('/ebay/poll-all-sellers');
      setPollResults(data || null);
      
      // Refresh statistics after polling
      await fetchStatistics();

      if (data && data.totalNewOrders > 0) {
        console.log(`✅ Polled ${data.totalNewOrders} new orders`);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll orders');
    } finally {
      setLoading(false);
    }
  };

  // Transform statistics into table format
  // NOW: Dates in rows (left), Sellers in columns (top)
  const transformToTableFormat = () => {
    // Get all unique dates
    const dates = [...new Set(statistics.map(stat => stat.date))].sort();
    
    // Get all unique sellers
    const sellersMap = new Map();
    statistics.forEach(stat => {
      if (!sellersMap.has(stat.seller.id)) {
        sellersMap.set(stat.seller.id, stat.seller.username);
      }
    });

    // Build table data: for each DATE (row), show each seller's marketplace counts
    const tableData = dates.map(date => {
      const dateData = {
        date,
        sellers: {}
      };

      // For each seller, get marketplace breakdown for this date
      Array.from(sellersMap.entries()).forEach(([sellerId, sellerUsername]) => {
        const dateStats = statistics.find(
          s => s.seller.id === sellerId && s.date === date
        );

        if (dateStats) {
          const marketplaces = {
            EBAY_US: 0,
            EBAY_AU: 0,
            EBAY_CA: 0,
            total: dateStats.totalOrders
          };

          dateStats.marketplaceBreakdown.forEach(mp => {
            if (mp.marketplace === 'EBAY_US') {
              marketplaces.EBAY_US = mp.count;
            } else if (mp.marketplace === 'EBAY_AU') {
              marketplaces.EBAY_AU = mp.count;
            } else if (mp.marketplace === 'EBAY_CA' || mp.marketplace === 'EBAY_ENCA') {
              marketplaces.EBAY_CA = mp.count;
            }
          });

          dateData.sellers[sellerId] = {
            sellerUsername,
            ...marketplaces
          };
        } else {
          dateData.sellers[sellerId] = {
            sellerUsername,
            EBAY_US: 0,
            EBAY_AU: 0,
            EBAY_CA: 0,
            total: 0
          };
        }
      });

      return dateData;
    });

    return { sellers: Array.from(sellersMap.entries()), tableData, dates };
  };

  const { sellers: sellersList, tableData, dates } = transformToTableFormat();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  // Calculate seller totals across all dates
  const calculateSellerTotals = (sellerId) => {
    return tableData.reduce((total, dateRow) => {
      return total + (dateRow.sellers[sellerId]?.total || 0);
    }, 0);
  };

  // Calculate date totals across all sellers
  const calculateDateTotals = (date) => {
    const dateRow = tableData.find(row => row.date === date);
    if (!dateRow) return 0;
    
    return Object.values(dateRow.sellers).reduce((sum, seller) => {
      return sum + (seller.total || 0);
    }, 0);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Total Orders chip in top-right */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Order Analytics - Daily Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View order counts by seller, date (PST timezone), and marketplace. Includes all orders (even cancelled ones).
          </Typography>
        </Box>
        <Chip
          icon={<ShoppingCartIcon />}
          label={`${totalOrders} Total Orders`}
          color="primary"
          sx={{ fontSize: '1rem', px: 1, py: 2.5 }}
        />
      </Stack>

      {/* Filters and Poll Button */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          {/* Poll New Orders Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ShoppingCartIcon />}
            onClick={pollNewOrders}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'Polling...' : 'Poll New Orders'}
          </Button>

          {/* Date Mode Selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
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
              label="Date"
              type="date"
              value={dateFilter.single}
              onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 200 }}
            />
          )}

          {/* Date Range Inputs */}
          {dateFilter.mode === 'range' && (
            <>
              <TextField
                label="From"
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="To"
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Seller</InputLabel>
            <Select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              label="Seller"
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || 'Unknown'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={excludeLowValue}
                onChange={(e) => setExcludeLowValue(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                Exclude &lt; $3 Orders
              </Typography>
            }
            sx={{ mx: 1 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        /* Statistics Table - Sellers as Columns, Dates as Rows */
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                {/* First Header Row - Seller Names */}
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      minWidth: 120,
                      position: 'sticky',
                      left: 0,
                      zIndex: 3
                    }}
                  >
                    Date
                  </TableCell>
                  {sellersList.map(([sellerId, sellerUsername]) => (
                    <TableCell
                      key={sellerId}
                      align="center"
                      colSpan={4}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderLeft: '8px solid white'
                      }}
                    >
                      {sellerUsername}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Second Header Row - Marketplace Columns */}
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 'bold', 
                      bgcolor: 'primary.dark', 
                      color: 'white',
                      position: 'sticky',
                      left: 0,
                      zIndex: 3
                    }}
                  >
                    {/* Empty cell for date column */}
                  </TableCell>
                  {sellersList.map(([sellerId]) => (
                    <React.Fragment key={sellerId}>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'primary.dark',
                          color: 'white',
                          fontSize: '0.75rem',
                          borderLeft: '8px solid white'
                        }}
                      >
                        Total
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'primary.dark',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        US
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'primary.dark',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        AU
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 'bold',
                          bgcolor: 'primary.dark',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        CA
                      </TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1 + sellersList.length * 4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No orders found for the selected date range and filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Date Rows */}
                    {tableData.map((dateRow) => (
                      <TableRow 
                        key={dateRow.date}
                        sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 'medium',
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'background.paper',
                            zIndex: 1
                          }}
                        >
                          {formatDate(dateRow.date)}
                        </TableCell>
                        {sellersList.map(([sellerId]) => {
                          const data = dateRow.sellers[sellerId];
                          return (
                            <React.Fragment key={sellerId}>
                              <TableCell
                                align="center"
                                sx={{
                                  fontWeight: 'bold',
                                  borderLeft: '8px solid',
                                  borderColor: 'grey.400',
                                  bgcolor: data.total > 0 ? 'primary.light' : 'inherit',
                                  color: data.total > 0 ? 'primary.contrastText' : 'text.secondary'
                                }}
                              >
                                {data.total || '-'}
                              </TableCell>
                              <TableCell align="center" sx={{ color: data.EBAY_US > 0 ? 'text.primary' : 'text.secondary' }}>
                                {data.EBAY_US || '-'}
                              </TableCell>
                              <TableCell align="center" sx={{ color: data.EBAY_AU > 0 ? 'text.primary' : 'text.secondary' }}>
                                {data.EBAY_AU || '-'}
                              </TableCell>
                              <TableCell align="center" sx={{ color: data.EBAY_CA > 0 ? 'text.primary' : 'text.secondary' }}>
                                {data.EBAY_CA || '-'}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                    
                    {/* Totals Row */}
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'grey.100',
                          zIndex: 1
                        }}
                      >
                        TOTAL
                      </TableCell>
                      {sellersList.map(([sellerId]) => {
                        const sellerTotal = calculateSellerTotals(sellerId);
                        const usTotal = tableData.reduce((sum, row) => sum + (row.sellers[sellerId]?.EBAY_US || 0), 0);
                        const auTotal = tableData.reduce((sum, row) => sum + (row.sellers[sellerId]?.EBAY_AU || 0), 0);
                        const caTotal = tableData.reduce((sum, row) => sum + (row.sellers[sellerId]?.EBAY_CA || 0), 0);
                        
                        return (
                          <React.Fragment key={sellerId}>
                            <TableCell
                              align="center"
                              sx={{
                                fontWeight: 'bold',
                                borderLeft: '8px solid',
                                borderColor: 'grey.400',
                                bgcolor: 'grey.200'
                              }}
                            >
                              {sellerTotal}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {usTotal || '-'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {auTotal || '-'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              {caTotal || '-'}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Poll Results Display */}
      {pollResults && pollResults.totalNewOrders > 0 && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setPollResults(null)}>
          <Typography variant="subtitle2" fontWeight="bold">
            ✅ Successfully polled {pollResults.totalNewOrders} new order{pollResults.totalNewOrders !== 1 ? 's' : ''}!
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Statistics have been refreshed with the latest data.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
