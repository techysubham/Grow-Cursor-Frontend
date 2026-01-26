import React, { useEffect, useMemo, useState } from 'react';
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
import ChatIcon from '@mui/icons-material/Chat';
import DownloadIcon from '@mui/icons-material/Download';
import { Button } from '@mui/material';
import api from '../../lib/api';
import { downloadCSV, prepareCSVData } from '../../utils/csvExport';
import ChatModal from '../../components/ChatModal';

export default function CancelledStatusPage({
  dateFilter: dateFilterProp,
  hideDateFilter = false
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [internalDateFilter, setInternalDateFilter] = useState({
    mode: 'all',
    single: '',
    from: '',
    to: ''
  });
  const dateFilter = useMemo(
    () => dateFilterProp ?? internalDateFilter,
    [dateFilterProp, internalDateFilter]
  );

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

  // Handler for saving order logs
  const handleSaveOrderLogs = async (orderId, logs) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/logs`, { logs });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.orderId === orderId ? { ...order, logs } : order
        )
      );
    } catch (err) {
      console.error('Failed to save order logs:', err);
      throw err;
    }
  };

  // LogsCell component for editable logs field with save functionality
  const LogsCell = ({ value, onSave, id }) => {
    const [localValue, setLocalValue] = React.useState(value || '');
    const [saving, setSaving] = React.useState(false);
    const [saved, setSaved] = React.useState(false);

    React.useEffect(() => {
      setLocalValue(value || '');
    }, [value]);

    const handleSave = async () => {
      if (localValue === (value || '')) return; // No changes
      setSaving(true);
      try {
        await onSave(id, localValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error('Failed to save logs:', err);
      } finally {
        setSaving(false);
      }
    };

    return (
      <TextField
        size="small"
        multiline
        maxRows={3}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleSave}
        disabled={saving}
        placeholder="Add logs..."
        sx={{
          minWidth: 120,
          '& .MuiInputBase-input': { fontSize: '0.75rem' },
          '& .MuiOutlinedInput-root': {
            backgroundColor: saved ? '#e8f5e9' : 'transparent',
            transition: 'background-color 0.3s'
          }
        }}
      />
    );
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
          
          <Button
            variant="outlined"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={() => {
              const csvData = prepareCSVData(orders, {
                'Order ID': 'orderId',
                'Seller': (o) => o.seller?.user?.username || '',
                'Buyer Name': 'shippingFullName',
                'Product': 'productName',
                'Cancel State': 'cancelState',
                'Date Sold': (o) => o.dateSold ? new Date(o.dateSold).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : '',
                'Marketplace': 'purchaseMarketplaceId',
                'Total': (o) => o.pricingSummary?.total?.value || '',
                'Worksheet Status': 'worksheetStatus',
                'Logs': 'logs',
              });
              downloadCSV(csvData, 'Cancelled_Orders');
            }}
            disabled={orders.length === 0}
            size="small"
          >
            Download CSV ({orders.length})
          </Button>
        </Stack>

        {!hideDateFilter && (
          <>
            {/* Date Filter */}
            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Date</InputLabel>
                <Select
                  value={dateFilter.mode}
                  onChange={(e) => setInternalDateFilter({ ...dateFilter, mode: e.target.value })}
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
                  onChange={(e) => setInternalDateFilter({ ...dateFilter, single: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              )}

              {dateFilter.mode === 'range' && (
                <>
                  <TextField
                    type="date"
                    size="small"
                    value={dateFilter.from}
                    onChange={(e) => setInternalDateFilter({ ...dateFilter, from: e.target.value })}
                    label="From"
                    InputLabelProps={{ shrink: true }}
                  />
                  <Typography variant="body2">to</Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={dateFilter.to}
                    onChange={(e) => setInternalDateFilter({ ...dateFilter, to: e.target.value })}
                    label="To"
                    InputLabelProps={{ shrink: true }}
                  />
                </>
              )}
            </Stack>
          </>
        )}

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
        <TableContainer 
          component={Paper}
          sx={{ 
            maxHeight: 'calc(100vh - 300px)',
            overflow: 'auto',
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
          <Table size="small" stickyHeader sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>SL No</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Seller</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Order ID</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Date Sold</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Product Name</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Buyer Name</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Marketplace</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }} align="right">
                  Total
                </TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Cancel Status</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Refunds</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Worksheet Status</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }}>Logs</TableCell>
                <TableCell sx={{ backgroundColor: 'error.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1 }} align="center">Chat</TableCell>
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
                    <TableCell>
                      <LogsCell
                        value={order.logs}
                        id={order.orderId}
                        onSave={handleSaveOrderLogs}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Chat with buyer">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <ChatIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Chat Modal */}
      {selectedOrder && (
        <ChatModal
          open={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          orderId={selectedOrder.orderId || selectedOrder.legacyOrderId}
          buyerUsername={selectedOrder.buyer?.username || selectedOrder.buyer?.buyerRegistrationAddress?.fullName}
          buyerName={selectedOrder.buyer?.buyerRegistrationAddress?.fullName || selectedOrder.buyer?.username}
          title="Cancellation Chat"
        />
      )}
    </Box>
  );
}
