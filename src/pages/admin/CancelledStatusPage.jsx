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
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../lib/api';

export default function CancelledStatusPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState({
    mode: 'all',
    single: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchCancelledOrders();
  }, [dateFilter]);

  const handleWorksheetStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/worksheet-status`, { worksheetStatus: newStatus });
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.orderId === orderId ? { ...order, worksheetStatus: newStatus } : order
        )
      );
    } catch (err) {
      console.error('Failed to update worksheet status:', err);
      alert('Failed to update worksheet status: ' + (err.response?.data?.error || err.message));
    }
  };

  async function fetchCancelledOrders() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      // mode 'all' = no date params, shows all orders
      
      // NEW: Use the dedicated endpoint that filters server-side (30-day window)
      const res = await api.get('/ebay/cancelled-orders', { params });
      const cancelledOrders = res.data.orders || [];
      
      console.log(`Loaded ${cancelledOrders.length} IN_PROGRESS orders (filtered server-side)`);
      console.log(`Filter date: ${res.data.filterDate}`);
      
      setOrders(cancelledOrders);
    } catch (e) {
      console.error('Failed to fetch cancelled orders:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${day}/${year}`;
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

  return (
    <Box>
      {/* HEADER SECTION */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CancelIcon color="error" />
            <Typography variant="h5" fontWeight="bold">
              Cancelled Status
            </Typography>
          </Stack>
          {orders.length > 0 && (
            <Chip
              icon={<CancelIcon />}
              label={`${orders.length} order(s) with cancellation`}
              color="error"
              variant="outlined"
            />
          )}
        </Stack>

        {/* Date Filter */}
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Date</InputLabel>
            <Select
              value={dateFilter.mode}
              onChange={(e) => setDateFilter({...dateFilter, mode: e.target.value})}
              label="Date"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="single">Single Date</MenuItem>
              <MenuItem value="range">Date Range</MenuItem>
            </Select>
          </FormControl>

          {dateFilter.mode === 'single' && (
            <TextField
              type="date"
              size="small"
              value={dateFilter.single}
              onChange={(e) => setDateFilter({...dateFilter, single: e.target.value})}
              InputLabelProps={{ shrink: true }}
            />
          )}

          {dateFilter.mode === 'range' && (
            <>
              <TextField
                type="date"
                size="small"
                value={dateFilter.from}
                onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                label="From"
                InputLabelProps={{ shrink: true }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                type="date"
                size="small"
                value={dateFilter.to}
                onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                label="To"
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* TABLE SECTION */}
      {loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading cancelled orders...
          </Typography>
        </Paper>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CancelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No cancelled orders found.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'error.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SL No</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Seller</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Sold</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Marketplace</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">
                  Total
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cancel Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Refunds</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Worksheet Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order, idx) => (
                <TableRow
                  key={order._id || idx}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                    '&:hover': { backgroundColor: 'action.selected' },
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.seller?.user?.username ||
                        order.seller?.user?.email ||
                        order.sellerId ||
                        '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{ color: 'primary.main' }}
                    >
                      {order.orderId || order.legacyOrderId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(order.dateSold)}</TableCell>
                  <TableCell sx={{ maxWidth: 250, pr: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Tooltip
                        title={order.productName || order.lineItems?.[0]?.title || '-'}
                        arrow
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {order.productName || order.lineItems?.[0]?.title || '-'}
                        </Typography>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopy(order.productName || order.lineItems?.[0]?.title || '-')
                        }
                        aria-label="copy product name"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <Tooltip
                        title={order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                        arrow
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                        </Typography>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-')
                        }
                        aria-label="copy buyer name"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.purchaseMarketplaceId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(
                        (order.subtotal || 0) +
                          (order.shipping || 0) +
                          (order.salesTax || 0) -
                          (order.discount || 0)
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.cancelState || 'NONE_REQUESTED'}
                      size="small"
                      color={
                        order.cancelState === 'CANCELED'
                          ? 'error'
                          : order.cancelState === 'CANCEL_REQUESTED'
                          ? 'warning'
                          : 'success'
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
                            {order.refunds.map((refund, refIdx) => (
                              <Typography key={refIdx} variant="caption" display="block">
                                {formatCurrency(refund.refundAmount?.value)} -{' '}
                                {refund.refundStatus}
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
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={order.worksheetStatus || 'open'}
                        onChange={(e) => handleWorksheetStatusChange(order.orderId, e.target.value)}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="attended">Attended</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
