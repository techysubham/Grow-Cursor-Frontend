import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
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
  Divider,
  TextField,
  Tooltip,
  IconButton,
  Pagination,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../lib/api';

export default function FulfillmentDashboard() {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingAdFee, setEditingAdFee] = useState({});
  const [pollResults, setPollResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Search filters
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  const [searchSoldDate, setSearchSoldDate] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(50);

  // Expanded shipping addresses
  const [expandedShipping, setExpandedShipping] = useState({});

  // Editing messaging status
  const [editingMessagingStatus, setEditingMessagingStatus] = useState({});

  // Editing item status
  const [editingItemStatus, setEditingItemStatus] = useState({});

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [snackbarOrderIds, setSnackbarOrderIds] = useState([]); // Store order IDs for copying
  const [updatedOrderDetails, setUpdatedOrderDetails] = useState([]); // Store { orderId, changedFields }

  useEffect(() => {
    fetchSellers();
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when seller changes
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeller]);

  // Reload orders when page or filters change
  useEffect(() => {
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchOrderId, searchBuyerName, searchSoldDate, searchMarketplace]);

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function loadStoredOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    try {
      const params = {
        page: currentPage,
        limit: ordersPerPage
      };
      
      if (selectedSeller) {
        params.sellerId = selectedSeller;
      }
      
      // Add search filters to backend query
      if (searchOrderId.trim()) {
        params.searchOrderId = searchOrderId.trim();
      }
      if (searchBuyerName.trim()) {
        params.searchBuyerName = searchBuyerName.trim();
      }
      if (searchSoldDate.trim()) {
        params.searchSoldDate = searchSoldDate.trim();
      }
      if (searchMarketplace && searchMarketplace !== '') {
        params.searchMarketplace = searchMarketplace;
      }

      const { data } = await api.get('/ebay/stored-orders', { params });
      setOrders(data?.orders || []);
      
      // Update pagination metadata
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

  async function fetchOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-all-sellers');
      setPollResults(data || null);
      await loadStoredOrders();

      // Show snackbar if there are new or updated orders
      if (data && (data.totalNewOrders > 0 || data.totalUpdatedOrders > 0)) {
        // Extract new order IDs (simple strings)
        const newOrderIds = data.pollResults
          .filter(r => r.success && r.newOrders && r.newOrders.length > 0)
          .flatMap(r => r.newOrders);
        
        // Extract updated order details (objects with orderId + changedFields)
        const updatedDetails = data.pollResults
          .filter(r => r.success && r.updatedOrders && r.updatedOrders.length > 0)
          .flatMap(r => r.updatedOrders);
        
        const updatedOrderIds = updatedDetails.map(u => u.orderId);
        
        // Combine both lists (new orders first, then updated)
        setSnackbarOrderIds([...newOrderIds, ...updatedOrderIds]);
        setUpdatedOrderDetails(updatedDetails);
        
        setSnackbarMsg(
          `Polling Complete! New Orders: ${data.totalNewOrders}, Updated Orders: ${data.totalUpdatedOrders}`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('Polling Complete! No new or updated orders.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll orders');
    } finally {
      setLoading(false);
    }
  }

  // Poll for NEW orders only
  async function pollNewOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-new-orders');
      setPollResults(data || null);
      await loadStoredOrders();

      if (data && data.totalNewOrders > 0) {
        // Build summary by seller (don't show individual order IDs)
        const sellerSummary = data.pollResults
          .filter(r => r.success && r.newOrders && r.newOrders.length > 0)
          .map(r => `${r.sellerName}: ${r.newOrders.length} new order${r.newOrders.length > 1 ? 's' : ''}`)
          .join('\n');
        
        setSnackbarMsg(`Found ${data.totalNewOrders} new order${data.totalNewOrders > 1 ? 's' : ''}!\n\n${sellerSummary}`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('No new orders found.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll new orders');
    } finally {
      setLoading(false);
    }
  }

  // Poll for order UPDATES only
  async function pollOrderUpdates() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-order-updates');
      setPollResults(data || null);
      await loadStoredOrders();

      if (data && data.totalUpdatedOrders > 0) {
        // Collect all updated order details (orderId + changedFields)
        const updatedDetails = data.pollResults
          .filter(r => r.success && r.updatedOrders && r.updatedOrders.length > 0)
          .flatMap(r => r.updatedOrders); // Each is { orderId, changedFields }
        
        const orderIds = updatedDetails.map(u => u.orderId);
        setSnackbarOrderIds(orderIds);
        setUpdatedOrderDetails(updatedDetails); // Store full details
        setSnackbarMsg(
          `Updated ${data.totalUpdatedOrders} order${data.totalUpdatedOrders > 1 ? 's' : ''}!`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarOrderIds([]);
        setUpdatedOrderDetails([]);
        setSnackbarMsg('No order updates found.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll order updates');
    } finally {
      setLoading(false);
    }
  }

  // Update ad fee general in database
  const updateAdFeeGeneral = async (orderId, value) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/ad-fee-general`, { adFeeGeneral: value });
      setOrders(prev =>
        prev.map(order => (order._id === orderId ? { ...order, adFeeGeneral: value } : order)),
      );
    } catch (err) {
      // keep previous value in UI; just notify
      // eslint-disable-next-line no-alert
      alert('Failed to update ad fee general');
    }
  };

  const handleAdFeeChange = (orderId, value) => {
    setEditingAdFee(prev => ({ ...prev, [orderId]: value }));
  };

  const handleAdFeeBlur = (orderId) => {
    const value = editingAdFee[orderId];
    if (value !== undefined && value !== '') {
      const numValue = parseFloat(value);
      if (!Number.isNaN(numValue)) {
        updateAdFeeGeneral(orderId, numValue);
      }
    }
    setEditingAdFee(prev => {
      const n = { ...prev };
      delete n[orderId];
      return n;
    });
  };

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
    }
  };

  // Update messaging status in database
  const updateMessagingStatus = async (orderId, status) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/messaging-status`, { messagingStatus: status });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o => (o._id === orderId ? { ...o, messagingStatus: status } : o))
      );
      setSnackbarMsg('Messaging status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to update messaging status:', err);
      setSnackbarMsg('Failed to update messaging status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleMessagingStatusChange = (orderId, newStatus) => {
    updateMessagingStatus(orderId, newStatus);
  };

  // Update item status in database
  const updateItemStatus = async (orderId, status) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/item-status`, { itemStatus: status });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o => (o._id === orderId ? { ...o, itemStatus: status } : o))
      );
      setSnackbarMsg('Item status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to update item status:', err);
      setSnackbarMsg('Failed to update item status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleItemStatusChange = (orderId, newStatus) => {
    updateItemStatus(orderId, newStatus);
  };

  const toggleShippingExpanded = (orderId) => {
    setExpandedShipping(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Los_Angeles',
      });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  const formatFieldName = (fieldName) => {
    // Convert camelCase to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <Box>
      {/* HEADER SECTION */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">Fulfillment Dashboard</Typography>
          </Stack>
          {orders.length > 0 && (
            <Chip
              icon={<ShoppingCartIcon />}
              label={`${orders.length} orders`}
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* CONTROLS */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel id="seller-select-label">Select Seller</InputLabel>
            <Select
              labelId="seller-select-label"
              value={selectedSeller}
              label="Select Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Select Seller --</em>
              </MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s.user?.email || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <Button
            variant="contained"
            color="secondary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={pollOrderUpdates}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'Updating...' : 'Poll Order Updates'}
          </Button>

          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Polling...' : 'Poll All (New + Updates)'}
          </Button>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="marketplace-filter-label">Marketplace</InputLabel>
            <Select
              labelId="marketplace-filter-label"
              value={searchMarketplace}
              label="Marketplace"
              onChange={(e) => setSearchMarketplace(e.target.value)}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value="EBAY_US">EBAY_US</MenuItem>
              <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
              <MenuItem value="EBAY_ENCA">EBAY_Canada</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* SEARCH FILTERS */}
        {orders.length > 0 && (
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
                <TextField
                  size="small"
                  label="Sold Date"
                  type="date"
                  value={searchSoldDate}
                  onChange={(e) => setSearchSoldDate(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchOrderId('');
                    setSearchBuyerName('');
                    setSearchSoldDate('');
                  }}
                  sx={{ minWidth: 100 }}
                >
                  Clear
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {pollResults && (
          <Alert
            severity={
              (pollResults.totalNewOrders > 0 || pollResults.totalUpdatedOrders > 0) ? 'success' : 'info'
            }
            sx={{ mt: 2 }}
            onClose={() => setPollResults(null)}
          >
            {copiedText && (
              <Typography variant="caption" color="success.main" sx={{ mb: 1, display: 'block' }}>
                Copied!
              </Typography>
            )}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Polling Complete: {pollResults.totalPolled} seller account(s) polled
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • New Orders: <strong>{pollResults.totalNewOrders}</strong>
              <br />
              • Updated Orders: <strong>{pollResults.totalUpdatedOrders}</strong>
            </Typography>
            {pollResults.pollResults && pollResults.pollResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {pollResults.pollResults.map((result, idx) => (
                  <Box
                    key={idx}
                    sx={{ mb: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {result.sellerName}:
                    </Typography>
                    {result.success ? (
                      <Typography variant="caption" component="div">
                        {result.newOrders?.length > 0 && (
                          <div>✓ New: {result.newOrders.join(', ')}</div>
                        )}
                        {result.updatedOrders?.length > 0 && (
                          <div>↻ Updated: {result.updatedOrders.join(', ')}</div>
                        )}
                        {(!result.newOrders?.length && !result.updatedOrders?.length) && (
                          <div>No new or updated orders</div>
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error">
                        ✗ Error: {result.error}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Alert>
        )}
      </Paper>

      {/* TABLE SECTION */}
      {loading && !orders.length ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading orders...</Typography>
        </Paper>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No orders found. Click "Poll New Orders" to fetch orders from all sellers.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SL No</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Seller</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Sold</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ship By</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Shipping Address</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Marketplace</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Subtotal</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Shipping</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Sales Tax</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Discount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Transaction Fees</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ad Fee General</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cancel Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Refunds</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tracking Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Messaging Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Item Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order, idx) => {
                const currentAdFeeValue =
                  editingAdFee[order._id] !== undefined
                    ? editingAdFee[order._id]
                    : (order.adFeeGeneral ?? '');

                return (
                  <TableRow
                    key={order._id || idx}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{(currentPage - 1) * ordersPerPage + idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.seller?.user?.username ||
                          order.seller?.user?.email ||
                          order.sellerId ||
                          '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || order.legacyOrderId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(order.dateSold)}</TableCell>
                    <TableCell>{formatDate(order.shipByDate)}</TableCell>
                    <TableCell sx={{ maxWidth: 250, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.productName || order.lineItems?.[0]?.title || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.productName || order.lineItems?.[0]?.title || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.productName || order.lineItems?.[0]?.title || '-') } aria-label="copy product name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.buyer?.buyerRegistrationAddress?.fullName || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-') } aria-label="copy buyer name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      {expandedShipping[order._id] ? (
                        <Stack spacing={0.5}>
                          {/* Full Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingFullName || '-'} arrow>
                              <Typography variant="body2" fontWeight="medium" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingFullName || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingFullName)} aria-label="copy name">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 1 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine1 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine1 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine1)} aria-label="copy address">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 2 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine2 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine2 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine2)} aria-label="copy address line 2">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* City */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCity || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCity || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCity)} aria-label="copy city">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* State */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingState || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingState || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingState)} aria-label="copy state">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Postal Code */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPostalCode || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingPostalCode || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPostalCode)} aria-label="copy postal code">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Country */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCountry || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCountry || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCountry)} aria-label="copy country">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Phone */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPhone || '0000000000'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                📞 {order.shippingPhone || '0000000000'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPhone || '0000000000')} aria-label="copy phone">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Collapse Button */}
                          <Button 
                            size="small" 
                            onClick={() => toggleShippingExpanded(order._id)}
                            startIcon={<ExpandLessIcon />}
                            sx={{ mt: 0.5 }}
                          >
                            Collapse
                          </Button>
                        </Stack>
                      ) : (
                        <Button 
                          size="small" 
                          onClick={() => toggleShippingExpanded(order._id)}
                          endIcon={<ExpandMoreIcon />}
                          sx={{ textTransform: 'none' }}
                        >
                          {order.shippingFullName || 'View Address'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.purchaseMarketplaceId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.subtotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.shipping)}</TableCell>
                    <TableCell align="right">{formatCurrency(order.salesTax)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        
                      >
                        {formatCurrency(order.discount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.transactionFees)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={currentAdFeeValue}
                        onChange={(e) => handleAdFeeChange(order._id, e.target.value)}
                        onBlur={() => handleAdFeeBlur(order._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        inputProps={{
                          step: '0.01',
                          min: '0',
                          style: { textAlign: 'right' },
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.cancelState || 'NONE_REQUESTED'}
                        size="small"
                        color={
                          order.cancelState === 'CANCELED' ? 'error' :
                          order.cancelState === 'CANCEL_REQUESTED' ? 'warning' :
                          order.cancelState === 'IN_PROGRESS' ? 'warning' :
                          'success'
                        }
                        sx={{
                          fontSize: '0.7rem',
                          backgroundColor: order.cancelState === 'IN_PROGRESS' ? '#ffd700' : undefined,
                          color: order.cancelState === 'IN_PROGRESS' ? '#000' : undefined,
                          fontWeight: order.cancelState === 'IN_PROGRESS' ? 'bold' : 'normal'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {order.refunds && order.refunds.length > 0 ? (
                        <Tooltip
                          title={
                            <Box>
                              {order.refunds.map((refund, idx) => (
                                <Typography key={idx} variant="caption" display="block">
                                  {formatCurrency(refund.refundAmount?.value)} - {refund.refundStatus}
                                </Typography>
                              ))}
                            </Box>
                          }
                          arrow
                        >
                          <Chip
                            label={`${order.refunds.length} refund(s)`}
                            size="small"
                            color="warning"
                            sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      {order.trackingNumber ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                          <Tooltip title={order.trackingNumber} arrow>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.trackingNumber}
                            </Typography>
                          </Tooltip>
                          <IconButton size="small" onClick={() => handleCopy(order.trackingNumber)} aria-label="copy tracking number">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={order.messagingStatus || 'Not Yet Started'}
                          onChange={(e) => handleMessagingStatusChange(order._id, e.target.value)}
                          sx={{ fontSize: '0.875rem' }}
                        >
                          <MenuItem value="Not Yet Started">Not Yet Started</MenuItem>
                          <MenuItem value="Ongoing Conversation">Ongoing Conversation</MenuItem>
                          <MenuItem value="Resolved">Resolved</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Item Status Column */}
                    <TableCell sx={{ minWidth: 150 }}>
                      {order.itemStatus === 'Resolved' ? (
                        <Box>
                          <Chip 
                            label={`Resolved - ${order.resolvedFrom || 'Unknown'}`}
                            color="success" 
                            size="small"
                            sx={{ fontWeight: 'bold', mb: 0.5 }}
                          />
                          {order.notes && (
                            <Tooltip title={order.notes} arrow placement="top">
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'block',
                                  color: 'text.secondary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: 200,
                                  cursor: 'pointer',
                                  '&:hover': { color: 'primary.main' }
                                }}
                              >
                                📝 {order.notes}
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      ) : (
                        <FormControl size="small" fullWidth>
                          <Select
                            value={order.itemStatus || 'None'}
                            onChange={(e) => handleItemStatusChange(order._id, e.target.value)}
                            sx={{ fontSize: '0.875rem' }}
                          >
                            <MenuItem value="None" sx={{ color: 'text.secondary' }}>None</MenuItem>
                            <MenuItem value="Return" sx={{ color: 'error.main', fontWeight: 'medium' }}>Return</MenuItem>
                            <MenuItem value="Replace" sx={{ color: 'warning.main', fontWeight: 'medium' }}>Replace</MenuItem>
                            <MenuItem value="INR" sx={{ color: 'error.dark', fontWeight: 'medium' }}>INR</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Controls */}
      {!loading && orders.length > 0 && totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {orders.length > 0 ? (currentPage - 1) * ordersPerPage + 1 : 0} - {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
            size="large"
          />
        </Box>
      )}

      {/* Snackbar for polling results */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            fontSize: '1.1rem',
            py: 2,
            px: 4,
            minWidth: 400,
            maxWidth: 800,
          }}
          elevation={6}
          variant="filled"
          action={
            snackbarOrderIds.length > 0 ? (
              <IconButton
                size="small"
                aria-label="copy order IDs"
                color="inherit"
                onClick={() => {
                  const orderIdsList = snackbarOrderIds.join(', ');
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(orderIdsList);
                    // Show temporary feedback
                    const originalMsg = snackbarMsg;
                    setSnackbarMsg('Order IDs copied to clipboard!');
                    setTimeout(() => setSnackbarMsg(originalMsg), 1500);
                  }
                }}
                sx={{ ml: 2 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            ) : null
          }
        >
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: snackbarOrderIds.length > 0 ? 1 : 0 }}>
              {snackbarMsg}
            </Typography>
            {snackbarOrderIds.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontSize: '0.9rem' }}>
                Order IDs: {snackbarOrderIds.join(', ')}
              </Typography>
            )}
            {updatedOrderDetails.length > 0 && (
              <Box sx={{ mt: 1.5, maxHeight: 200, overflowY: 'auto', fontSize: '0.85rem' }}>
                {updatedOrderDetails.map((detail, idx) => {
                  const hasShippingChange = detail.changedFields.includes('shippingAddress');
                  return (
                    <Box 
                      key={idx} 
                      sx={{ 
                        mb: 0.5, 
                        opacity: 0.95,
                        backgroundColor: hasShippingChange ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        padding: hasShippingChange ? '4px 8px' : '0',
                        borderRadius: hasShippingChange ? '4px' : '0',
                        border: hasShippingChange ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                      }}
                    >
                      <Typography variant="caption" component="span" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {hasShippingChange && '🏠 '}{detail.orderId}:
                      </Typography>
                      {' '}
                      <Typography variant="caption" component="span" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                        {detail.changedFields.map(formatFieldName).join(', ')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
