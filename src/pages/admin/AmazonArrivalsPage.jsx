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
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Stack,
  Button,
  Snackbar,
  Alert,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '../../lib/api';

export default function AmazonArrivalsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Sort State
  const [arrivalSort, setArrivalSort] = useState('asc'); // 'asc' or 'desc'

  // Filter State
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');
  const [amazonAccounts, setAmazonAccounts] = useState([]);
  const [selectedAmazonAccount, setSelectedAmazonAccount] = useState('');

  // Debounced Values
  const [debouncedOrderId, setDebouncedOrderId] = useState('');

  // REF: To prevent unnecessary re-fetches
  const lastFetchedParams = useRef('');

  // 1. Fetch Sellers and Amazon Accounts on Mount
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data || []);
      } catch (e) {
        console.error("Failed to load sellers", e);
      }
    };
    const loadAmazonAccounts = async () => {
      try {
        const { data } = await api.get('/amazon-accounts');
        setAmazonAccounts(data || []);
      } catch (e) {
        console.error("Failed to load Amazon accounts", e);
      }
    };
    loadSellers();
    loadAmazonAccounts();
  }, []);

  // 2. Debounce Order ID Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderId(searchOrderId);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchOrderId]);

  // 3. Reset to Page 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [selectedSeller, debouncedOrderId, searchMarketplace, selectedAmazonAccount, arrivalSort]);

  // 4. Fetch Orders
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedSeller, debouncedOrderId, searchMarketplace, selectedAmazonAccount, arrivalSort]);

  async function fetchOrders() {
    try {
      // Build Params Object
      const params = {
        amazonArriving: true,
        arrivalSort: arrivalSort,
        page: page,
        limit: 50
      };

      if (debouncedOrderId) params.searchOrderId = debouncedOrderId;
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;
      if (selectedAmazonAccount) params.amazonAccount = selectedAmazonAccount;

      // SMART CHECK: If params haven't changed since last fetch, STOP.
      const paramsString = JSON.stringify(params);
      if (paramsString === lastFetchedParams.current) {
        return; // Skip fetch, prevent loading spinner
      }

      // Update ref and proceed
      lastFetchedParams.current = paramsString;
      setLoading(true);
      setError('');

      const { data } = await api.get('/ebay/stored-orders', { params });

      setOrders(data?.orders || []);

      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load Amazon arrivals');
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text) => {
    if (!text || text === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      showSnack('success', '✅ Copied to clipboard');
    }
  };

  const showSnack = (severity, message) => {
    setSnack({ open: true, severity, message });
    setTimeout(() => setSnack(prev => ({ ...prev, open: false })), 2500);
  };

  const toggleSort = () => {
    setArrivalSort(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleDismissOrder = async (orderId, orderName) => {
    const confirmed = window.confirm(
      `Remove "${orderName}" from Amazon Arrivals?\n\n` +
      'The order will be hidden from this page but remains in All Orders. ' +
      'You can bring it back by setting a new arriving date.'
    );
    
    if (!confirmed) return;
    
    try {
      const { data } = await api.patch(`/ebay/orders/${orderId}/dismiss-arrival`);
      
      if (data?.success) {
        // Remove order from local state immediately (optimistic update)
        setOrders(prev => prev.filter(o => o._id !== orderId));
        setTotalOrders(prev => prev - 1);
        
        showSnack('success', '✅ Order dismissed from Amazon Arrivals');
        
        // Optionally refresh to get accurate pagination
        setTimeout(() => fetchOrders(), 500);
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || 'Failed to dismiss order';
      showSnack('error', errorMsg);
    }
  };

  const formatArrivingDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getDateColor = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return 'default';
    try {
      const arrivalDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      arrivalDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.ceil((arrivalDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'error'; // Overdue
      if (diffDays <= 3) return 'warning'; // Arriving soon
      return 'success'; // Future
    } catch {
      return 'default';
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      p: 3,
      overflow: 'hidden'
    }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Amazon Arrivals
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel>Seller</InputLabel>
            <Select
              value={selectedSeller}
              label="Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map(s => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s.user?.email}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Search Order ID"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            placeholder="Search by order ID..."
            sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 } }}
          />

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

          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 200 } }}>
            <InputLabel>Amazon Account</InputLabel>
            <Select
              value={selectedAmazonAccount}
              label="Amazon Account"
              onChange={(e) => setSelectedAmazonAccount(e.target.value)}
            >
              <MenuItem value="">All Accounts</MenuItem>
              {amazonAccounts.map(acc => (
                <MenuItem key={acc._id} value={acc.name}>
                  {acc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort Toggle Button */}
          <Button
            variant="outlined"
            onClick={toggleSort}
            startIcon={arrivalSort === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            sx={{ minWidth: { xs: '100%', sm: 140 }, textTransform: 'none' }}
          >
            {arrivalSort === 'asc' ? 'Oldest First' : 'Newest First'}
          </Button>

          <Button
            variant="outlined"
            onClick={fetchOrders}
            startIcon={<RefreshIcon />}
            sx={{ minWidth: { xs: '100%', sm: 100 } }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Loading & Error States */}
      {loading && !orders.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : !orders.length ? (
        <Paper sx={{ p: 4, textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No orders with arrival dates found
          </Typography>
        </Paper>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              width: '100%',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '10px',
                '&:hover': {
                  backgroundColor: '#555',
                },
              },
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Seller</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Order ID</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Marketplace</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <span>Arriving Date</span>
                      <Tooltip title={arrivalSort === 'asc' ? 'Sorted: Oldest First' : 'Sorted: Newest First'}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {arrivalSort === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                        </Box>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Amazon Account</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Product Name</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Amazon Order ID</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Notes</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, idx) => (
                  <TableRow key={order._id || idx} hover>
                    <TableCell>
                      {order.seller?.user?.username || order.seller?.user?.email || order.sellerId || '-'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                          {order.orderId || order.legacyOrderId || '-'}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(order.orderId || order.legacyOrderId)}
                          sx={{ p: 0.5 }}
                        >
                          <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.purchaseMarketplaceId || 'Unknown'}
                        size="small"
                        variant="outlined"
                        color={
                          order.purchaseMarketplaceId === 'EBAY_US' ? 'primary' :
                            order.purchaseMarketplaceId === 'EBAY_CA' || order.purchaseMarketplaceId === 'EBAY_ENCA' ? 'secondary' :
                              order.purchaseMarketplaceId === 'EBAY_AU' ? 'success' :
                                'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatArrivingDate(order.arrivingDate)}
                        size="small"
                        color={getDateColor(order.arrivingDate)}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {order.amazonAccount || '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Tooltip title={order.productName || order.lineItems?.[0]?.title || '-'}>
                        <Typography variant="body2" sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: 300
                        }}>
                          {order.productName || order.lineItems?.[0]?.title || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {order.azOrderId || '-'}
                        </Typography>
                        {order.azOrderId && (
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(order.azOrderId)}
                            sx={{ p: 0.5 }}
                          >
                            <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={order.notes || '-'}>
                        <Typography variant="body2" sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                          fontSize: '0.85rem'
                        }}>
                          {order.notes || '-'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Remove from Arrivals">
                        <IconButton
                          size="small"
                          onClick={() => handleDismissOrder(order._id, order.orderId || order.productName?.substring(0, 30))}
                          color="error"
                          sx={{ p: 0.5 }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{
            py: 1,
            px: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
            mt: 2
          }}>
            <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
              Showing {orders.length} orders (Page {page} of {totalPages})
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
            />
          </Paper>
        </>
      )}

      <Snackbar open={snack.open} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
