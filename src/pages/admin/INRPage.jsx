import { useEffect, useState } from 'react';
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
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  Button
} from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../lib/api.js';

export default function INRPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNotes, setEditingNotes] = useState({});
  const [notesValues, setNotesValues] = useState({});
  const [dateFilter, setDateFilter] = useState({
    mode: 'all',
    single: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchINROrders();
  }, [dateFilter]);

  const fetchINROrders = async () => {
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
      
      const { data } = await api.get('/ebay/stored-orders', { params });
      const allOrders = data.orders || [];
      // Filter orders with itemStatus = 'INR'
      const inrOrders = allOrders.filter(order => order.itemStatus === 'INR');
      setOrders(inrOrders);
    } catch (err) {
      console.error('Failed to fetch INR orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (orderId) => {
    const order = orders.find(o => o._id === orderId);
    const currentNotes = notesValues[orderId] ?? order?.notes ?? '';
    
    if (!currentNotes || currentNotes.trim() === '') {
      alert('Please fill in the notes before resolving the order.');
      return;
    }
    
    try {
      // Save notes first, then update status to Resolved with resolvedFrom
      await api.patch(`/ebay/orders/${orderId}/notes`, { notes: currentNotes });
      await api.patch(`/ebay/orders/${orderId}/item-status`, { 
        itemStatus: 'Resolved',
        resolvedFrom: 'INR'
      });
      // Remove order from list when resolved
      setOrders(prevOrders => prevOrders.filter(o => o._id !== orderId));
      setNotesValues(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
      setEditingNotes(prev => {
        const updated = { ...prev };
        delete updated[orderId];
        return updated;
      });
    } catch (err) {
      console.error('Failed to resolve order:', err);
      alert('Failed to resolve order');
    }
  };

  const handleItemStatusChange = async (orderId, newStatus) => {
    try {
      // If changing to 'Resolved', validate that notes are filled
      if (newStatus === 'Resolved') {
        const order = orders.find(o => o._id === orderId);
        const currentNotes = notesValues[orderId] ?? order?.notes ?? '';
        
        if (!currentNotes || currentNotes.trim() === '') {
          alert('Please fill in the notes before resolving the order.');
          return;
        }
        
        // If notes were being edited, save them first
        if (editingNotes[orderId]) {
          await api.patch(`/ebay/orders/${orderId}/notes`, { notes: currentNotes });
        }
      }
      
      await api.patch(`/ebay/orders/${orderId}/item-status`, { itemStatus: newStatus });
      // Remove order from list when status changes away from 'INR'
      if (newStatus !== 'INR') {
        setOrders(prevOrders => prevOrders.filter(o => o._id !== orderId));
      }
    } catch (err) {
      console.error('Failed to update item status:', err);
      alert('Failed to update item status');
    }
  };

  const handleNotesChange = (orderId, value) => {
    setNotesValues(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  const handleNotesSave = async (orderId) => {
    try {
      const notes = notesValues[orderId] || '';
      await api.patch(`/ebay/orders/${orderId}/notes`, { notes });
      
      // Update local state
      setOrders(prev => prev.map(order => 
        order._id === orderId ? { ...order, notes } : order
      ));
      
      setEditingNotes(prev => ({
        ...prev,
        [orderId]: false
      }));
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save notes: ' + (err.response?.data?.error || err.message));
    }
  };

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
      const date = new Date(dateStr);
      if (isNaN(date)) return '-';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ReportProblemIcon color="error" />
            <Typography variant="h5" fontWeight="bold">INR Orders (Item Not Received)</Typography>
          </Stack>
          {orders.length > 0 && (
            <Chip
              icon={<ReportProblemIcon />}
              label={`${orders.length} INR order(s)`}
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

      {orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ReportProblemIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No orders with INR status found
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
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Marketplace</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Notes</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order, idx) => {
                const isEditing = editingNotes[order._id];
                const currentNotes = notesValues[order._id] ?? order.notes ?? '';
                return (
                  <TableRow 
                    key={order._id}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.seller?.user?.username || order.seller?.user?.email || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(order.dateSold)}</TableCell>
                    <TableCell sx={{ maxWidth: 250, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.productName || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.productName || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.productName || '-')} aria-label="copy product name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.buyer?.username || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.buyer?.username || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.buyer?.username || '-')} aria-label="copy buyer name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.purchaseMarketplaceId || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatCurrency(order.pricingSummary?.total?.value)}</Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            rows={2}
                            value={currentNotes}
                            onChange={(e) => handleNotesChange(order._id, e.target.value)}
                            placeholder="Add notes..."
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleNotesSave(order._id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setEditingNotes(prev => ({ ...prev, [order._id]: false }));
                              setNotesValues(prev => ({ ...prev, [order._id]: order.notes ?? '' }));
                            }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {currentNotes || '-'}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              setNotesValues(prev => ({ ...prev, [order._id]: order.notes ?? '' }));
                              setEditingNotes(prev => ({ ...prev, [order._id]: true }));
                            }}
                          >
                            Edit
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleResolve(order._id)}
                      >
                        Resolve
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
