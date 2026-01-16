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
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Pagination,
  TextField,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../../lib/api';

export default function ReturnRequestedPage() {
  const [returns, setReturns] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);
  const limit = 50; // Items per page
  
  // Snackbar state for sync results
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({
    mode: 'all',
    single: '',
    from: '',
    to: ''
  });
  
  const hasFetchedInitialData = useRef(false);

  // Fetch sellers on mount
  useEffect(() => {
    async function fetchSellers() {
      try {
        const res = await api.get('/sellers/all');
        setSellers(res.data || []);
      } catch (e) {
        console.error('Failed to fetch sellers:', e);
      }
    }
    fetchSellers();
  }, []);

  // Load returns when filters or page changes
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      loadStoredReturns();
      return;
    }
    loadStoredReturns();
  }, [statusFilter, sellerFilter, reasonFilter, dateFilter, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (hasFetchedInitialData.current) {
      setPage(1);
    }
  }, [statusFilter, sellerFilter, reasonFilter, dateFilter]);

  async function loadStoredReturns() {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: page,
        limit: limit
      };
      if (statusFilter) params.status = statusFilter;
      if (sellerFilter) params.sellerId = sellerFilter;
      if (reasonFilter) params.reason = reasonFilter;
      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      
      const res = await api.get('/ebay/stored-returns', { params });
      const returnData = res.data.returns || [];
      const pagination = res.data.pagination || {};
      
      console.log(`Loaded ${returnData.length} returns from database (Page ${pagination.currentPage}/${pagination.totalPages})`);
      
      setReturns(returnData);
      setTotalPages(pagination.totalPages || 1);
      setTotalReturns(pagination.totalReturns || 0);
    } catch (e) {
      console.error('Failed to load returns:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReturnsFromEbay() {
    setFetching(true);
    setError('');
    try {
      const res = await api.post('/ebay/fetch-returns');
      const { totalNewReturns, totalUpdatedReturns, results, errors } = res.data;
      
      // Build snackbar message with per-seller breakdown and update details
      let msgParts = [];
      let updateDetailsParts = [];
      
      if (results && results.length > 0) {
        results.forEach(r => {
          if (r.newReturns > 0 || r.updatedReturns > 0) {
            let parts = [];
            if (r.newReturns > 0) parts.push(`${r.newReturns} new`);
            if (r.updatedReturns > 0) parts.push(`${r.updatedReturns} updated`);
            msgParts.push(`${r.sellerName}: ${parts.join(', ')}`);
            
            // Collect update details for snackbar
            if (r.updateDetails && r.updateDetails.length > 0) {
              r.updateDetails.forEach(ud => {
                let changeDesc = [];
                if (ud.changes?.status) {
                  changeDesc.push(`Status: ${ud.changes.status.from} → ${ud.changes.status.to}`);
                }
                if (ud.changes?.refund) {
                  changeDesc.push(`Refund: $${ud.changes.refund.from} → $${ud.changes.refund.to}`);
                }
                if (changeDesc.length > 0) {
                  updateDetailsParts.push(`• ${r.sellerName} | Return ${ud.returnId} | Order ${ud.orderId}: ${changeDesc.join(', ')}`);
                }
              });
            }
          }
        });
      }
      
      // Build final snackbar message
      let finalMsg = '';
      if (msgParts.length > 0) {
        finalMsg = `✅ ${msgParts.join(' | ')}`;
        if (updateDetailsParts.length > 0) {
          finalMsg += `\n\n📝 Updates:\n${updateDetailsParts.join('\n')}`;
        }
      } else if (totalNewReturns === 0 && totalUpdatedReturns === 0) {
        finalMsg = '✅ No new or updated returns found';
      } else {
        finalMsg = `✅ ${totalNewReturns} new, ${totalUpdatedReturns} updated`;
      }
      
      setSnackbarMsg(finalMsg);
      setSnackbarOpen(true);
      
      if (errors && errors.length > 0) {
        setError(`⚠️ Errors: ${errors.join(', ')}`);
      }
      
      // Reload returns from database
      await loadStoredReturns();
    } catch (e) {
      console.error('Failed to fetch returns:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setFetching(false);
    }
  }

  const handleClearFilters = () => {
    setStatusFilter('');
    setSellerFilter('');
    setReasonFilter('');
    setDateFilter({ mode: 'all', single: '', from: '', to: '' });
  };

  const handleWorksheetStatusChange = async (returnId, newStatus) => {
    try {
      await api.patch(`/ebay/returns/${returnId}/worksheet-status`, { worksheetStatus: newStatus });
      // Update local state
      setReturns(prevReturns => 
        prevReturns.map(ret => 
          ret.returnId === returnId ? { ...ret, worksheetStatus: newStatus } : ret
        )
      );
    } catch (err) {
      console.error('Failed to update worksheet status:', err);
      alert('Failed to update worksheet status: ' + (err.response?.data?.error || err.message));
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
      const d = new Date(dateStr);
      // Convert to PST (America/Los_Angeles)
      return d.toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'RETURN_REQUESTED') return 'error';
    if (s === 'ITEM_SHIPPED') return 'warning';
    if (s === 'ITEM_READY_TO_SHIP' || s === 'RETURN_SHIPPED') return 'info';
    if (s === 'CLOSED' || s === 'REFUND_ISSUED') return 'success';
    if (s === 'CANCELLED' || s === 'DENIED') return 'error';
    return 'default';
  };

  const hasActiveFilters =
    statusFilter ||
    sellerFilter ||
    reasonFilter ||
    dateFilter.mode !== 'all' ||
    dateFilter.single ||
    dateFilter.from ||
    dateFilter.to;

  // Check if response due date is within next 2 days (urgent)
  const isResponseUrgent = (responseDate) => {
    if (!responseDate) return false;
    const now = new Date();
    const dueDate = new Date(responseDate);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    return dueDate <= twoDaysFromNow && dueDate >= now;
  };

  // Check if response due date has already passed
  const isResponseOverdue = (responseDate) => {
    if (!responseDate) return false;
    return new Date(responseDate) < new Date();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 100px)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%',
      p: 3
    }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3} sx={{ flexShrink: 0 }}>
        <AssignmentReturnIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">Return Requests</Typography>
        <Chip 
          label={`${totalReturns} total returns`} 
          color="info" 
          variant="outlined"
          sx={{ ml: 'auto' }}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Snackbar for sync results */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          sx={{ whiteSpace: 'pre-line', maxWidth: 600 }}
        >
          {snackbarMsg}
        </Alert>
      </Snackbar>

      {/* Controls Row 1: Fetch Button & Info */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Button
          variant="contained"
          color="primary"
          startIcon={fetching ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
          onClick={fetchReturnsFromEbay}
          disabled={fetching}
        >
          {fetching ? 'Fetching...' : 'Fetch Returns from eBay'}
        </Button>
        
        <Typography variant="caption" color="text.secondary">
          📅 Polls returns from <strong>last 30 days</strong> from eBay
        </Typography>
      </Stack>

      {/* Controls Row 2: Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Seller Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Seller</InputLabel>
            <Select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              label="Seller"
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status Filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="RETURN_REQUESTED">Return Requested</MenuItem>
              <MenuItem value="ITEM_READY_TO_SHIP">Item Ready to Ship</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </Select>
          </FormControl>

          {/* Reason Filter */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Reason</InputLabel>
            <Select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              label="Reason"
            >
              <MenuItem value="">All Reasons</MenuItem>
              <MenuItem value="WRONG_SIZE">Wrong Size</MenuItem>
              <MenuItem value="NOT_AS_DESCRIBED">Not As Described</MenuItem>
              <MenuItem value="DEFECTIVE_ITEM">Defective Item</MenuItem>
              <MenuItem value="NO_LONGER_NEED_ITEM">No Longer Needed</MenuItem>
              <MenuItem value="ORDERED_ACCIDENTALLY">Ordered Accidentally</MenuItem>
              <MenuItem value="ARRIVED_DAMAGED">Arrived Damaged</MenuItem>
              <MenuItem value="MISSING_PARTS">Missing Parts</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>

          {/* Date Filter */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Date</InputLabel>
            <Select
              value={dateFilter.mode}
              label="Date"
              onChange={(e) => {
                const mode = e.target.value;
                if (mode === 'all') {
                  setDateFilter({ mode: 'all', single: '', from: '', to: '' });
                } else if (mode === 'single') {
                  setDateFilter((prev) => ({
                    mode: 'single',
                    single: prev.single || new Date().toISOString().split('T')[0],
                    from: '',
                    to: ''
                  }));
                } else {
                  setDateFilter((prev) => ({
                    mode: 'range',
                    single: '',
                    from: prev.from || '',
                    to: prev.to || ''
                  }));
                }
              }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="single">Single date</MenuItem>
              <MenuItem value="range">Date range</MenuItem>
            </Select>
          </FormControl>

          {dateFilter.mode === 'single' && (
            <TextField
              size="small"
              type="date"
              label="On"
              value={dateFilter.single}
              onChange={(e) => setDateFilter({ ...dateFilter, single: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          )}

          {dateFilter.mode === 'range' && (
            <>
              <TextField
                size="small"
                type="date"
                label="From"
                value={dateFilter.from}
                onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                size="small"
                type="date"
                label="To"
                value={dateFilter.to}
                onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              color="inherit"
            >
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer 
          component={Paper}
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            maxHeight: 'calc(100% - 50px)',
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
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Return ID</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Created Date (PST)</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Response Due (PST)</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Order ID</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Seller</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Buyer</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Item</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Reason</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Status</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Refund Amount</strong></TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 100 }}><strong>Worksheet Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No return requests found. Click "Fetch Returns from eBay" to load data.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret) => (
                  <TableRow key={ret._id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {ret.returnId || '-'}
                        </Typography>
                        <IconButton size="small" onClick={() => handleCopy(ret.returnId)}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontSize="0.75rem">
                        {formatDate(ret.creationDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography 
                          variant="body2" 
                          fontSize="0.75rem"
                          color={isResponseOverdue(ret.responseDate) ? 'error' : 'inherit'}
                          fontWeight={isResponseOverdue(ret.responseDate) || isResponseUrgent(ret.responseDate) ? 'bold' : 'normal'}
                        >
                          {formatDate(ret.responseDate)}
                        </Typography>
                        {isResponseOverdue(ret.responseDate) && (
                          <Chip 
                            label="OVERDUE" 
                            size="small" 
                            sx={{ 
                              fontSize: '0.6rem', 
                              height: 18,
                              backgroundColor: '#fbdbc4ff',
                              color: 'black',
                              fontWeight: 'bold'
                            }} 
                          />
                        )}
                        {!isResponseOverdue(ret.responseDate) && isResponseUrgent(ret.responseDate) && (
                          <Chip 
                            label="URGENT" 
                            size="small" 
                            sx={{ 
                              fontSize: '0.6rem', 
                              height: 18,
                              backgroundColor: '#dc3545',
                              color: 'white',
                              fontWeight: 'bold'
                            }} 
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {ret.orderId || '-'}
                        </Typography>
                        <IconButton size="small" onClick={() => handleCopy(ret.orderId)}>
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{ret.seller?.user?.username || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{ret.buyerUsername || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={ret.itemTitle || 'N/A'}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            maxWidth: 150, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {ret.itemTitle || ret.itemId || '-'}
                        </Typography>
                      </Tooltip>
                      {ret.returnQuantity && (
                        <Typography variant="caption" color="text.secondary">
                          Qty: {ret.returnQuantity}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontSize="0.7rem">
                        {ret.returnReason || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ret.returnStatus || 'Unknown'} 
                        color={getStatusColor(ret.returnStatus)}
                        size="small"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {ret.refundAmount?.value 
                          ? `${ret.refundAmount.currency} ${ret.refundAmount.value}` 
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={ret.worksheetStatus || 'open'}
                          onChange={(e) => handleWorksheetStatusChange(ret.returnId, e.target.value)}
                          sx={{ fontSize: '0.75rem' }}
                        >
                          <MenuItem value="open">Open</MenuItem>
                          <MenuItem value="attended">Attended</MenuItem>
                          <MenuItem value="resolved">Resolved</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Pagination Controls */}
      {!loading && returns.length > 0 && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mt: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, totalReturns)} of {totalReturns} returns
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
