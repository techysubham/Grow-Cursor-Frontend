import React, { useEffect, useState, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../../lib/api';
import { downloadCSV, prepareCSVData } from '../../utils/csvExport';
import OrderDetailsModal from '../../components/OrderDetailsModal';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function AccountHealthReportPage() {
  const [tabValue, setTabValue] = useState(0);
  
  // SNAD Details state
  const [details, setDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Evaluation Windows state
  const [windows, setWindows] = useState([]);
  const [windowsLoading, setWindowsLoading] = useState(false);
  
  // Shared state
  const [sellers, setSellers] = useState([]);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  // Filters
  const [sellerFilter, setSellerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState({
    mode: 'all',
    from: '',
    to: ''
  });
  
  // Selected order for modal
  const [selectedOrderId, setSelectedOrderId] = useState(null);

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

  // Load SNAD details
  useEffect(() => {
    loadDetails();
  }, [sellerFilter, dateFilter]);

  // Load evaluation windows
  useEffect(() => {
    loadEvaluationWindows();
  }, [sellerFilter]);

  async function loadDetails() {
    setDetailsLoading(true);
    setError('');
    try {
      const params = {};
      if (sellerFilter) params.sellerId = sellerFilter;
      if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      
      const res = await api.get('/account-health/details', { params });
      setDetails(res.data.details || []);
    } catch (e) {
      console.error('Failed to load SNAD details:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function loadEvaluationWindows() {
    setWindowsLoading(true);
    try {
      const params = {};
      if (sellerFilter) params.sellerId = sellerFilter;
      
      const res = await api.get('/account-health/evaluation-windows', { params });
      setWindows(res.data.windows || []);
    } catch (e) {
      console.error('Failed to load evaluation windows:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setWindowsLoading(false);
    }
  }

  async function handleSellerFaultChange(orderId, newValue) {
    try {
      await api.patch(`/account-health/details/${orderId}`, { sellerFault: newValue });
      setDetails(prev => prev.map(d => 
        d._id === orderId ? { ...d, sellerFault: newValue } : d
      ));
      setSnackbarMsg('Seller Fault updated successfully');
      setSnackbarOpen(true);
    } catch (e) {
      console.error('Failed to update seller fault:', e);
      setError(e.response?.data?.error || e.message);
    }
  }

  const handleClearFilters = () => {
    setSellerFilter('');
    setDateFilter({ mode: 'all', from: '', to: '' });
  };

  const handleCopy = (text) => {
    if (!text || text === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setSnackbarMsg('Copied to clipboard');
      setSnackbarOpen(true);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
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

  const formatWindowDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const hasActiveFilters = sellerFilter || dateFilter.mode !== 'all';

  // CSV Export for SNAD Details
  const handleExportDetails = () => {
    const csvData = prepareCSVData(details, {
      'Order Date': (d) => formatDate(d.orderDate),
      'Order ID': 'orderId',
      'Item ID': 'itemId',
      'SNAD Count': 'snadCount',
      'Seller Fault': 'sellerFault',
      'INR': 'hasInr',
      'Remark (Expiry Date)': (d) => formatDate(d.remarkDate),
      'Seller': (d) => d.seller?.username || '',
    });
    downloadCSV(csvData, 'Account_Health_SNAD_Details');
  };

  // CSV Export for Evaluation Windows
  const handleExportWindows = () => {
    const csvData = prepareCSVData(windows, {
      'Evaluation Window': (w) => formatWindowDate(w.windowEnd),
      'Total Sales': 'totalSales',
      'BBE Rate (%)': 'bbeRate',
      'Market Avg': 'marketAvg',
      'Evaluation Date': (w) => formatDate(w.evaluationDate),
      'SNAD Count': 'snadCount',
    });
    downloadCSV(csvData, 'Account_Health_Evaluation_Windows');
  };

  // Get BBE Rate color based on value
  const getBbeRateColor = (rate, marketAvg) => {
    const rateNum = parseFloat(rate);
    if (rateNum > marketAvg * 1.5) return 'error.main';
    if (rateNum > marketAvg) return 'warning.main';
    return 'success.main';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <HealthAndSafetyIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">Account Health Report</Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success">
          {snackbarMsg}
        </Alert>
      </Snackbar>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
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

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Date</InputLabel>
            <Select
              value={dateFilter.mode}
              onChange={(e) => setDateFilter({...dateFilter, mode: e.target.value})}
              label="Date"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="range">Date Range</MenuItem>
            </Select>
          </FormControl>

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

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { loadDetails(); loadEvaluationWindows(); }}
            disabled={detailsLoading || windowsLoading}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`SNAD Details (${details.length})`} />
          <Tab label={`Evaluation Windows (${windows.length})`} />
        </Tabs>
      </Paper>

      {/* SNAD Details Tab */}
      <TabPanel value={tabValue} index={0}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          <Button
            variant="outlined"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleExportDetails}
            disabled={details.length === 0}
          >
            Download CSV ({details.length})
          </Button>
        </Stack>

        {detailsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer 
            component={Paper}
            sx={{ 
              maxWidth: '100%',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '8px' },
              '&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1' },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: '#888', 
                borderRadius: '4px',
                '&:hover': { backgroundColor: '#555' }
              },
            }}
          >
            <Table size="small" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Order Date</strong></TableCell>
                  <TableCell><strong>Order ID</strong></TableCell>
                  <TableCell><strong>Item ID</strong></TableCell>
                  <TableCell><strong>SNAD Count</strong></TableCell>
                  <TableCell><strong>Seller Fault</strong></TableCell>
                  <TableCell><strong>INR</strong></TableCell>
                  <TableCell><strong>Remark (Expiry)</strong></TableCell>
                  <TableCell><strong>Seller</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        No SNAD records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((d) => (
                    <TableRow key={d._id} hover>
                      <TableCell>{formatDate(d.orderDate)}</TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace', 
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              color: 'primary.main',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                            onClick={() => setSelectedOrderId(d.orderId)}
                          >
                            {d.orderId || d.legacyOrderId || '-'}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(d.orderId || d.legacyOrderId)}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {d.itemId || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: d.snadCount > 0 ? 'error.main' : 'text.primary'
                          }}
                        >
                          {d.snadCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={d.sellerFault || 'No'}
                            onChange={(e) => handleSellerFaultChange(d._id, e.target.value)}
                            sx={{ fontSize: '0.8rem' }}
                          >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ color: d.hasInr ? 'warning.main' : 'text.secondary' }}
                        >
                          {d.hasInr || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Data expires from calculation on this date">
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {formatDate(d.remarkDate)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{d.seller?.username || '-'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Evaluation Windows Tab */}
      <TabPanel value={tabValue} index={1}>
        <Stack direction="row" justifyContent="flex-end" mb={2}>
          <Button
            variant="outlined"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleExportWindows}
            disabled={windows.length === 0}
          >
            Download CSV ({windows.length})
          </Button>
        </Stack>

        {windowsLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Evaluation Window</strong></TableCell>
                  <TableCell><strong>Total Sales</strong></TableCell>
                  <TableCell><strong>BBE Rate (%)</strong></TableCell>
                  <TableCell><strong>Market Avg</strong></TableCell>
                  <TableCell><strong>Evaluation Date</strong></TableCell>
                  <TableCell><strong>Total SNAD Count</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {windows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        No evaluation windows found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  windows.map((w, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {formatWindowDate(w.windowEnd)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{w.totalSales}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: getBbeRateColor(w.bbeRate, w.marketAvg)
                          }}
                        >
                          {w.bbeRate}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{w.marketAvg}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(w.evaluationDate)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{w.snadCount}</Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Order Details Modal */}
      <OrderDetailsModal
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </Box>
  );
}
