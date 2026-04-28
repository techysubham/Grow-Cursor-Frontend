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
  TextField,
  Snackbar,
  Tabs,
  Tab,
  Fade,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GavelIcon from '@mui/icons-material/Gavel';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { tableHeaderCellSx, tableBodyRowSx, tableContainerSx, yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ClearIcon from '@mui/icons-material/Clear';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import CancelIcon from '@mui/icons-material/Cancel';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ChatIcon from '@mui/icons-material/Chat';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../lib/api';
import { downloadCSV, prepareCSVData } from '../../utils/csvExport';
import ReturnRequestedPage from './ReturnRequestedPage.jsx';
import CancelledStatusPage from './CancelledStatusPage.jsx';
import WorksheetPage from './WorksheetPage.jsx';
import ColumnSelector from '../../components/ColumnSelector';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import ChatModal from '../../components/ChatModal';


function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// LogsCell component for editable logs field with save functionality
function LogsCell({ value, onSave, id }) {
  const [localValue, setLocalValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
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
}

export default function DisputesPage({ initialTab = 0 }) {
  const [tabValue, setTabValue] = useState(initialTab);
  useEffect(() => {
    setTabValue(initialTab);
  }, [initialTab]);
  
  // INR Cases state
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesFetching, setCasesFetching] = useState(false);
  
  // Payment Disputes state
  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesFetching, setDisputesFetching] = useState(false);
  
  // Shared state
  const [sellers, setSellers] = useState([]);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  
  // INR Filters
  const [inrStatusFilter, setInrStatusFilter] = useState('');
  const [inrSellerFilter, setInrSellerFilter] = useState('');
  const [inrTypeFilter, setInrTypeFilter] = useState('');
  
  // Payment Dispute Filters
  const [pdStatusFilter, setPdStatusFilter] = useState('');
  const [pdSellerFilter, setPdSellerFilter] = useState('');

  const [pdReasonFilter, setPdReasonFilter] = useState('');
  const [pdDateFilter, setPdDateFilter] = useState({ mode: 'all', single: '', from: '', to: '' });

  // Column Selectors
  const ALL_INR_COLUMNS = [
    { id: 'caseId', label: 'Case ID' },
    { id: 'type', label: 'Type' },
    { id: 'seller', label: 'Seller' },
    { id: 'buyer', label: 'Buyer' },
    { id: 'item', label: 'Item' },
    { id: 'status', label: 'Status' },
    { id: 'claimAmount', label: 'Claim Amount' },
    { id: 'created', label: 'Created (PST)' },
    { id: 'responseDue', label: 'Response Due (PST)' },
    { id: 'logs', label: 'Logs' },
    { id: 'chat', label: 'Chat' },
  ];
  const [inrVisibleColumns, setInrVisibleColumns] = useState(ALL_INR_COLUMNS.map(c => c.id));

  const ALL_DISPUTE_COLUMNS = [
    { id: 'disputeId', label: 'Dispute ID' },
    { id: 'reason', label: 'Reason' },
    { id: 'seller', label: 'Seller' },
    { id: 'buyer', label: 'Buyer' },
    { id: 'amount', label: 'Amount' },
    { id: 'status', label: 'Status' },
    { id: 'openedDate', label: 'Created (PST)' },
    { id: 'closedDate', label: 'Closed Date (PST)' },
    { id: 'logs', label: 'Logs' },
    { id: 'chat', label: 'Chat' },
  ];
  const [disputeVisibleColumns, setDisputeVisibleColumns] = useState(ALL_DISPUTE_COLUMNS.map(c => c.id));
  
  // Selected items for chat and order details modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  
  // Date Filter
  const [dateFilter, setDateFilter] = useState({
    mode: 'all',
    single: '',
    from: '',
    to: ''
  });
  
  const hasFetchedCases = useRef(false);
  const hasFetchedDisputes = useRef(false);

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

  // Load INR cases when filters change
  useEffect(() => {
    if (!hasFetchedCases.current) {
      hasFetchedCases.current = true;
      loadStoredCases();
      return;
    }
    loadStoredCases();
  }, [inrStatusFilter, inrSellerFilter, inrTypeFilter, dateFilter]);

  // Load Payment Disputes when filters change
  useEffect(() => {
    if (!hasFetchedDisputes.current) {
      hasFetchedDisputes.current = true;
      loadStoredDisputes();
      return;
    }
    loadStoredDisputes();
  }, [pdStatusFilter, pdSellerFilter, pdReasonFilter, pdDateFilter]);

  async function loadStoredCases() {
    setCasesLoading(true);
    setError('');
    try {
      const params = {};
      if (inrStatusFilter) params.status = inrStatusFilter;
      if (inrSellerFilter) params.sellerId = inrSellerFilter;
      if (inrTypeFilter) params.caseType = inrTypeFilter;
      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      // mode 'all' = no date params, shows all cases
      
      const res = await api.get('/ebay/stored-inr-cases', { params });
      const caseData = res.data.cases || [];
      console.log(`Loaded ${caseData.length} INR cases from database`);
      setCases(caseData);
    } catch (e) {
      console.error('Failed to load INR cases:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setCasesLoading(false);
    }
  }

  async function loadStoredDisputes() {
    setDisputesLoading(true);
    setError('');
    try {
      const params = {};
      if (pdStatusFilter) params.status = pdStatusFilter;
      if (pdSellerFilter) params.sellerId = pdSellerFilter;
      if (pdReasonFilter) params.reason = pdReasonFilter;
      params.dateField = 'openDate';
      if (pdDateFilter.mode === 'single' && pdDateFilter.single) {
        params.startDate = pdDateFilter.single;
        params.endDate = pdDateFilter.single;
      } else if (pdDateFilter.mode === 'range') {
        if (pdDateFilter.from) params.startDate = pdDateFilter.from;
        if (pdDateFilter.to) params.endDate = pdDateFilter.to;
      }
      // mode 'all' = no date params, shows all disputes
      
      const res = await api.get('/ebay/stored-payment-disputes', { params });
      const disputeData = res.data.disputes || [];
      console.log(`Loaded ${disputeData.length} payment disputes from database`);
      setDisputes(disputeData);
    } catch (e) {
      console.error('Failed to load payment disputes:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setDisputesLoading(false);
    }
  }

  async function fetchCasesFromEbay() {
    setCasesFetching(true);
    setError('');
    try {
      const res = await api.post('/ebay/fetch-inr-cases');
      const { totalNewCases, totalUpdatedCases, results, errors } = res.data;
      
      let msgParts = [];
      let updateDetailsParts = [];
      
      if (results && results.length > 0) {
        results.forEach(r => {
          if (r.newCases > 0 || r.updatedCases > 0) {
            let parts = [];
            if (r.newCases > 0) parts.push(`${r.newCases} new`);
            if (r.updatedCases > 0) parts.push(`${r.updatedCases} updated`);
            msgParts.push(`${r.sellerName}: ${parts.join(', ')}`);
            
            if (r.updateDetails && r.updateDetails.length > 0) {
              r.updateDetails.forEach(ud => {
                let changeDesc = [];
                if (ud.changes?.status) {
                  changeDesc.push(`Status: ${ud.changes.status.from} → ${ud.changes.status.to}`);
                }
                if (changeDesc.length > 0) {
                  updateDetailsParts.push(`• ${r.sellerName} | Case ${ud.caseId} | Order ${ud.orderId}: ${changeDesc.join(', ')}`);
                }
              });
            }
          }
        });
      }
      
      let finalMsg = '';
      if (msgParts.length > 0) {
        finalMsg = `✅ INR Cases: ${msgParts.join(' | ')}`;
        if (updateDetailsParts.length > 0) {
          finalMsg += `\n\n📝 Updates:\n${updateDetailsParts.join('\n')}`;
        }
      } else if (totalNewCases === 0 && totalUpdatedCases === 0) {
        finalMsg = '✅ No new or updated INR cases found';
      } else {
        finalMsg = `✅ ${totalNewCases} new, ${totalUpdatedCases} updated INR cases`;
      }
      
      setSnackbarMsg(finalMsg);
      setSnackbarOpen(true);
      
      if (errors && errors.length > 0) {
        setError(`⚠️ Errors: ${errors.join(', ')}`);
      }
      
      await loadStoredCases();
    } catch (e) {
      console.error('Failed to fetch INR cases:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setCasesFetching(false);
    }
  }

  async function fetchDisputesFromEbay() {
    setDisputesFetching(true);
    setError('');
    try {
      const res = await api.post('/ebay/fetch-payment-disputes');
      const { totalNewDisputes, totalUpdatedDisputes, results, errors } = res.data;
      
      let msgParts = [];
      let updateDetailsParts = [];
      
      if (results && results.length > 0) {
        results.forEach(r => {
          if (r.newDisputes > 0 || r.updatedDisputes > 0) {
            let parts = [];
            if (r.newDisputes > 0) parts.push(`${r.newDisputes} new`);
            if (r.updatedDisputes > 0) parts.push(`${r.updatedDisputes} updated`);
            msgParts.push(`${r.sellerName}: ${parts.join(', ')}`);
            
            if (r.updateDetails && r.updateDetails.length > 0) {
              r.updateDetails.forEach(ud => {
                let changeDesc = [];
                if (ud.changes?.status) {
                  changeDesc.push(`Status: ${ud.changes.status.from} → ${ud.changes.status.to}`);
                }
                if (changeDesc.length > 0) {
                  updateDetailsParts.push(`• ${r.sellerName} | Dispute ${ud.paymentDisputeId} | Order ${ud.orderId}: ${changeDesc.join(', ')}`);
                }
              });
            }
          }
        });
      }
      
      let finalMsg = '';
      if (msgParts.length > 0) {
        finalMsg = `✅ Payment Disputes: ${msgParts.join(' | ')}`;
        if (updateDetailsParts.length > 0) {
          finalMsg += `\n\n📝 Updates:\n${updateDetailsParts.join('\n')}`;
        }
      } else if (totalNewDisputes === 0 && totalUpdatedDisputes === 0) {
        finalMsg = '✅ No new or updated payment disputes found';
      } else {
        finalMsg = `✅ ${totalNewDisputes} new, ${totalUpdatedDisputes} updated payment disputes`;
      }
      
      setSnackbarMsg(finalMsg);
      setSnackbarOpen(true);
      
      if (errors && errors.length > 0) {
        setError(`⚠️ Errors: ${errors.join(', ')}`);
      }
      
      await loadStoredDisputes();
    } catch (e) {
      console.error('Failed to fetch payment disputes:', e);
      setError(e.response?.data?.error || e.message);
    } finally {
      setDisputesFetching(false);
    }
  }

  const handleClearInrFilters = () => {
    setInrStatusFilter('');
    setInrSellerFilter('');
    setInrTypeFilter('');
  };

  const handleClearPdFilters = () => {
    setPdStatusFilter('');
    setPdSellerFilter('');
    setPdReasonFilter('');
    setPdDateFilter({ mode: 'all', single: '', from: '', to: '' });
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

  const getCaseStatusColor = (status) => {
    if (!status) return 'default';
    const s = status.toUpperCase();
    // Open/Waiting statuses - warning (yellow/orange)
    if (s === 'OPEN' || s === 'WAITING_FOR_SELLER' || s === 'WAITING_SELLER_RESPONSE') return 'warning';
    // Waiting for buyer - info (blue) - we're good, waiting on them
    if (s === 'WAITING_BUYER_RESPONSE' || s === 'ON_HOLD' || s === 'UNDER_REVIEW') return 'info';
    // Closed - success (green)
    if (s === 'CLOSED') return 'success';
    return 'default';
  };

  const getDisputeStatusColor = (status) => {
    if (!status) return 'default';
    const s = status.toUpperCase();
    if (s === 'OPEN' || s === 'WAITING_FOR_SELLER_RESPONSE') return 'warning';
    if (s === 'UNDER_REVIEW' || s === 'ACTION_NEEDED') return 'info';
    if (s === 'RESOLVED_SELLER_FAVOUR' || s === 'CLOSED') return 'success';
    if (s === 'RESOLVED_BUYER_FAVOUR') return 'error';
    return 'default';
  };

  const getCaseTypeColor = (type) => {
    if (!type) return 'default';
    if (type === 'INR') return 'primary';
    if (type === 'SNAD') return 'secondary';
    return 'default';
  };

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

  const hasActiveInrFilters = inrStatusFilter || inrSellerFilter || inrTypeFilter;
  const hasActivePdFilters = pdStatusFilter || pdSellerFilter || pdReasonFilter || pdDateFilter.mode !== 'all';

  // Compute filtered INR cases
  const filteredCases = cases.filter(c => {
    if (inrSellerFilter && c.seller?._id !== inrSellerFilter) return false;
    if (inrStatusFilter && c.status !== inrStatusFilter) return false;
    if (inrTypeFilter && c.caseType !== inrTypeFilter) return false;
    
    // Date filter
    if (dateFilter.mode !== 'all') {
      const caseDate = c.creationDate ? new Date(c.creationDate) : null;
      if (!caseDate) return false;
      
      if (dateFilter.mode === 'single' && dateFilter.single) {
        const filterDate = new Date(dateFilter.single);
        // Compare only the date portion
        if (caseDate.toDateString() !== filterDate.toDateString()) return false;
      }
      
      if (dateFilter.mode === 'range') {
        if (dateFilter.from) {
          const fromDate = new Date(dateFilter.from);
          fromDate.setHours(0, 0, 0, 0);
          if (caseDate < fromDate) return false;
        }
        if (dateFilter.to) {
          const toDate = new Date(dateFilter.to);
          toDate.setHours(23, 59, 59, 999);
          if (caseDate > toDate) return false;
        }
      }
    }
    
    return true;
  });

  // Compute filtered payment disputes
  const filteredDisputes = disputes.filter(d => {
    if (pdSellerFilter && d.seller?._id !== pdSellerFilter) return false;
    if (pdStatusFilter && d.paymentDisputeStatus !== pdStatusFilter) return false;
    if (pdReasonFilter && d.reason !== pdReasonFilter) return false;
    
    // Open Date filter
    if (pdDateFilter.mode !== 'all') {
      const disputeDate = d.openDate ? new Date(d.openDate) : null;
      if (!disputeDate) return false;
      
      if (pdDateFilter.mode === 'single' && pdDateFilter.single) {
        const filterDate = new Date(pdDateFilter.single);
        if (disputeDate.toDateString() !== filterDate.toDateString()) return false;
      }
      
      if (pdDateFilter.mode === 'range') {
        if (pdDateFilter.from) {
          const fromDate = new Date(pdDateFilter.from);
          fromDate.setHours(0, 0, 0, 0);
          if (disputeDate < fromDate) return false;
        }
        if (pdDateFilter.to) {
          const toDate = new Date(pdDateFilter.to);
          toDate.setHours(23, 59, 59, 999);
          if (disputeDate > toDate) return false;
        }
      }
    }
    
    return true;
  });

  // CSV Export Handlers
  const handleExportINRCases = () => {
    const csvData = prepareCSVData(filteredCases, {
      'Case ID': 'caseId',
      'Order ID': 'orderId',
      'Type': 'caseType',
      'Seller': (c) => c.seller?.user?.username || '',
      'Buyer': 'buyerUsername',
      'Item': 'itemTitle',
      'Status': 'status',
      'Claim Amount': (c) => c.claimAmount?.value ? `${c.claimAmount.currency || 'USD'} ${c.claimAmount.value}` : '',
      'Created Date': (c) => formatDate(c.creationDate),
      'Response Due': (c) => formatDate(c.sellerResponseDueDate),
      'Logs': 'logs',
    });
    downloadCSV(csvData, 'INR_Cases');
  };

  const handleExportPaymentDisputes = () => {
    const csvData = prepareCSVData(filteredDisputes, {
      'Dispute ID': 'paymentDisputeId',
      'Order ID': 'orderId',
      'Seller': (d) => d.seller?.user?.username || '',
      'Buyer': 'buyerUsername',
      'Reason': 'reason',
      'Status': 'paymentDisputeStatus',
      'Opened Date': (d) => formatDate(d.openDate),
      'Closed Date': (d) => formatDate(d.closedDate),
    });
    downloadCSV(csvData, 'Payment_Disputes');
  };

  // Handler for saving case logs
  const handleSaveCaseLogs = async (caseId, logs) => {
    try {
      await api.patch(`/ebay/cases/${caseId}/logs`, { logs });
      // Update local state
      setCases(prevCases =>
        prevCases.map(c =>
          c.caseId === caseId ? { ...c, logs } : c
        )
      );
    } catch (err) {
      console.error('Failed to save case logs:', err);
      throw err;
    }
  };

  return (
    <Fade in timeout={600}>
    <AdminPageShell>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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

      <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3, background: dashboardSignatureTokens.surfaces.pageCard }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2.5}>
          <Box>
            <PageHeader
              title="Issues and Resolutions"
              subtitle="Track and manage INR cases, payment disputes, and return requests across all sellers."
              sx={{ pt: 0, pb: 0 }}
            />
          </Box>
        </Stack>

        {/* DATE FILTER SECTION */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
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
        </Box>
      </SectionCard>

      {/* Tabs */}
      <SectionCard sx={{ mb: 3, overflow: 'hidden' }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<LocalShippingIcon />} 
            label={`INR Cases (${cases.length})`}
            iconPosition="start"
          />
          <Tab 
            icon={<PaymentIcon />} 
            label={`Payment Disputes (${disputes.length})`}
            iconPosition="start"
          />
          <Tab
            icon={<AssignmentReturnIcon />}
            label="Return Requests"
            iconPosition="start"
          />
          <Tab
            icon={<CancelIcon />}
            label="Cancelled Status"
            iconPosition="start"
          />
          <Tab
            icon={<ListAltIcon />}
            label="Worksheet"
            iconPosition="start"
          />
        </Tabs>
      </SectionCard>

      {/* INR Cases Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Controls Row 1: Fetch Button & Info */}
        <Stack direction="row" spacing={2} mb={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              sx={yellowFilledButtonSx}
              startIcon={casesFetching ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
              onClick={fetchCasesFromEbay}
              disabled={casesFetching}
            >
              {casesFetching ? 'Fetching...' : 'Fetch INR Cases from eBay'}
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              📅 Polls INR/SNAD cases from <strong>last 30 days</strong> via Post-Order API
            </Typography>
          </Stack>
          
          <Button
            variant="outlined"
            sx={yellowOutlinedButtonSx}
            startIcon={<DownloadIcon />}
            onClick={handleExportINRCases}
            disabled={filteredCases.length === 0}
          >
            Download CSV ({filteredCases.length})
          </Button>
           <ColumnSelector
              allColumns={ALL_INR_COLUMNS}
              visibleColumns={inrVisibleColumns}
              onColumnChange={setInrVisibleColumns}
              onReset={() => setInrVisibleColumns(ALL_INR_COLUMNS.map(c => c.id))}
              page="disputes-inr"
          />
        </Stack>

        {/* Filters */}
        <SectionCard sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Seller</InputLabel>
              <Select
                value={inrSellerFilter}
                onChange={(e) => setInrSellerFilter(e.target.value)}
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

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={inrStatusFilter}
                onChange={(e) => setInrStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="ON_HOLD">On Hold</MenuItem>
                <MenuItem value="WAITING_FOR_SELLER">Waiting for Seller</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Case Type</InputLabel>
              <Select
                value={inrTypeFilter}
                onChange={(e) => setInrTypeFilter(e.target.value)}
                label="Case Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="INR">INR (Item Not Received)</MenuItem>
                <MenuItem value="SNAD">SNAD (Not as Described)</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            {hasActiveInrFilters && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearInrFilters}
                color="inherit"
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        </SectionCard>

        {/* INR Cases Table */}
        {casesLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer 
            component={Paper}
            sx={{ 
              ...tableContainerSx,
              maxWidth: '100%',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '8px', width: '8px' },
              '&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1', borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: '10px', '&:hover': { backgroundColor: '#555' } },
            }}
          >
            <Table size="small" sx={{ minWidth: 1200 }} stickyHeader>
              <TableHead>
                <TableRow>
            {inrVisibleColumns.includes('caseId') && <TableCell sx={tableHeaderCellSx}>Case ID</TableCell>}
            {inrVisibleColumns.includes('type') && <TableCell sx={tableHeaderCellSx}>Type</TableCell>}
            {inrVisibleColumns.includes('seller') && <TableCell sx={tableHeaderCellSx}>Seller</TableCell>}
            {inrVisibleColumns.includes('buyer') && <TableCell sx={tableHeaderCellSx}>Buyer</TableCell>}
            {inrVisibleColumns.includes('item') && <TableCell sx={tableHeaderCellSx}>Item</TableCell>}
            {inrVisibleColumns.includes('status') && <TableCell sx={tableHeaderCellSx}>Status</TableCell>}
            {inrVisibleColumns.includes('claimAmount') && <TableCell sx={tableHeaderCellSx}>Claim Amount</TableCell>}
            {inrVisibleColumns.includes('created') && <TableCell sx={tableHeaderCellSx}>Created (PST)</TableCell>}
            {inrVisibleColumns.includes('responseDue') && <TableCell sx={tableHeaderCellSx}>Response Due (PST)</TableCell>}
            {inrVisibleColumns.includes('logs') && <TableCell sx={tableHeaderCellSx}>Logs</TableCell>}
            {inrVisibleColumns.includes('chat') && <TableCell align="center" sx={tableHeaderCellSx}>Chat</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        No INR cases found. Click "Fetch INR Cases from eBay" to load data.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((c) => (
                    <TableRow 
                      key={c._id} 
                      hover
                      sx={tableBodyRowSx}
                    >
                      {inrVisibleColumns.includes('caseId') && <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {c.caseId || '-'}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(c.caseId)}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>}
                      {inrVisibleColumns.includes('type') && <TableCell>
                        <Chip 
                          label={c.caseType || 'INR'} 
                          color={getCaseTypeColor(c.caseType)}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>}
                      {inrVisibleColumns.includes('seller') && <TableCell>
                        <Typography variant="body2">{c.seller?.user?.username || '-'}</Typography>
                      </TableCell>}
                      {inrVisibleColumns.includes('buyer') && <TableCell>
                        <Typography variant="body2">{c.buyerUsername || '-'}</Typography>
                      </TableCell>}
                      {inrVisibleColumns.includes('item') && <TableCell>
                        <Tooltip title={c.itemTitle || 'N/A'}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              maxWidth: 150, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {c.itemTitle || c.itemId || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>}
                      {inrVisibleColumns.includes('status') && <TableCell>
                        <Chip 
                          label={c.status || 'Unknown'} 
                          color={getCaseStatusColor(c.status)}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </TableCell>}
                      {inrVisibleColumns.includes('claimAmount') && <TableCell>
                        <Typography variant="body2">
                          {c.claimAmount?.value 
                            ? `${c.claimAmount.currency || 'USD'} ${c.claimAmount.value}` 
                            : '-'}
                        </Typography>
                      </TableCell>}
                      {inrVisibleColumns.includes('created') && <TableCell>
                        <Typography variant="body2" fontSize="0.75rem">
                          {formatDate(c.creationDate)}
                        </Typography>
                      </TableCell>}
                      {inrVisibleColumns.includes('responseDue') && <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography 
                            variant="body2" 
                            fontSize="0.75rem"
                            color={c.status !== 'CLOSED' && isResponseUrgent(c.sellerResponseDueDate) ? 'error' : 'inherit'}
                            fontWeight={c.status !== 'CLOSED' && isResponseUrgent(c.sellerResponseDueDate) ? 'bold' : 'normal'}
                          >
                            {formatDate(c.sellerResponseDueDate)}
                          </Typography>
                          {/* Only show urgent badge if case is NOT closed */}
                          {c.status !== 'CLOSED' && !isResponseOverdue(c.sellerResponseDueDate) && isResponseUrgent(c.sellerResponseDueDate) && (
                            <Chip 
                              label="URGENT" 
                              color="error" 
                              size="small" 
                              sx={{ fontSize: '0.6rem', height: 18 }} 
                            />
                          )}
                        </Stack>
                      </TableCell>}
                      {inrVisibleColumns.includes('logs') && <TableCell>
                        <LogsCell
                          value={c.logs}
                          id={c.caseId}
                          onSave={handleSaveCaseLogs}
                        />
                      </TableCell>}
                      {inrVisibleColumns.includes('chat') && <TableCell align="center">
                        <Tooltip title="Chat with buyer">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => setSelectedCase(c)}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Payment Disputes Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Info Alert about OAuth scope */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Payment Disputes require the <code>sell.payment.dispute</code> OAuth scope. 
            If you're seeing errors, each seller needs to disconnect and reconnect their eBay account, 
            then revoke your app from <strong>eBay → Account Settings → Third-party app access</strong> before reconnecting.
          </Typography>
        </Alert>

        {/* Controls Row 1: Fetch Button & Info */}
        <Stack direction="row" spacing={2} mb={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              sx={yellowFilledButtonSx}
              startIcon={disputesFetching ? <CircularProgress size={20} color="inherit" />: <RefreshIcon />}
              onClick={fetchDisputesFromEbay}
              disabled={disputesFetching}
            >
              {disputesFetching ? 'Fetching...' : 'Fetch Payment Disputes from eBay'}
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              📅 Polls payment disputes via Fulfillment API
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">

            <Button
              variant="outlined"
              sx={yellowOutlinedButtonSx}
              startIcon={<DownloadIcon />}
              onClick={handleExportPaymentDisputes}
              disabled={filteredDisputes.length === 0}
            >
              Download CSV ({filteredDisputes.length})
            </Button>
            <ColumnSelector
                allColumns={ALL_DISPUTE_COLUMNS}
                visibleColumns={disputeVisibleColumns}
                onColumnChange={setDisputeVisibleColumns}
                onReset={() => setDisputeVisibleColumns(ALL_DISPUTE_COLUMNS.map(c => c.id))}
                page="disputes-pd"
            />
          </Stack>
        </Stack>

        {/* Filters */}
        <SectionCard sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Seller</InputLabel>
              <Select
                value={pdSellerFilter}
                onChange={(e) => setPdSellerFilter(e.target.value)}
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

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={pdStatusFilter}
                onChange={(e) => setPdStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="OPEN">Open</MenuItem>
                <MenuItem value="WAITING_FOR_SELLER_RESPONSE">Waiting for Seller Response</MenuItem>
                <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                <MenuItem value="RESOLVED_BUYER_FAVOUR">Resolved - Buyer Favour</MenuItem>
                <MenuItem value="RESOLVED_SELLER_FAVOUR">Resolved - Seller Favour</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Reason</InputLabel>
              <Select
                value={pdReasonFilter}
                onChange={(e) => setPdReasonFilter(e.target.value)}
                label="Reason"
              >
                <MenuItem value="">All Reasons</MenuItem>
                <MenuItem value="ITEM_NOT_RECEIVED">Item Not Received</MenuItem>
                <MenuItem value="UNAUTHORIZED">Unauthorized</MenuItem>
                <MenuItem value="UNAUTHORIZED_PAYMENT">Unauthorized Payment</MenuItem>
                <MenuItem value="ITEM_NOT_AS_DESCRIBED">Item Not as Described</MenuItem>
                <MenuItem value="NOT_AS_DESCRIBED">Not as Described</MenuItem>
                <MenuItem value="SIGNIFICANTLY_NOT_AS_DESCRIBED">Significantly Not as Described</MenuItem>
                <MenuItem value="DUPLICATE_CHARGE">Duplicate Charge</MenuItem>
                <MenuItem value="MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED">Merch. Not as Described</MenuItem>
                <MenuItem value="MERCHANDISE_OR_SERVICE_NOT_RECEIVED">Merch. Not Received</MenuItem>
                <MenuItem value="CREDIT_NOT_PROCESSED">Credit Not Processed</MenuItem>
                <MenuItem value="CANCELLATION">Cancellation</MenuItem>
                <MenuItem value="FRAUD">Fraud</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Open Date</InputLabel>
              <Select
                value={pdDateFilter.mode}
                onChange={(e) => setPdDateFilter({ mode: e.target.value, single: '', from: '', to: '' })}
                label="Open Date"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="single">Single Date</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>

            {pdDateFilter.mode === 'single' && (
              <TextField
                type="date"
                size="small"
                label="Date"
                value={pdDateFilter.single}
                onChange={(e) => setPdDateFilter({ ...pdDateFilter, single: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />
            )}

            {pdDateFilter.mode === 'range' && (
              <>
                <TextField
                  type="date"
                  size="small"
                  label="From"
                  value={pdDateFilter.from}
                  onChange={(e) => setPdDateFilter({ ...pdDateFilter, from: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
                <Typography variant="body2" color="text.secondary">to</Typography>
                <TextField
                  type="date"
                  size="small"
                  label="To"
                  value={pdDateFilter.to}
                  onChange={(e) => setPdDateFilter({ ...pdDateFilter, to: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
              </>
            )}

            {hasActivePdFilters && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearPdFilters}
                color="inherit"
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        </SectionCard>

        {/* Payment Disputes Table */}
        {disputesLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer 
            component={Paper}
            sx={{
              ...tableContainerSx,
              maxWidth: '100%',
              overflowX: 'auto',
              '&::-webkit-scrollbar': { height: '8px', width: '8px' },
              '&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1', borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: '10px', '&:hover': { backgroundColor: '#555' } },
            }}
          >
            <Table size="small" sx={{ minWidth: 1200 }} stickyHeader>
              <TableHead>
                <TableRow>
                  {disputeVisibleColumns.includes('disputeId') && <TableCell sx={tableHeaderCellSx}>Dispute ID</TableCell>}
                  {disputeVisibleColumns.includes('orderId') && <TableCell sx={tableHeaderCellSx}>Order ID</TableCell>}
                  {disputeVisibleColumns.includes('seller') && <TableCell sx={tableHeaderCellSx}>Seller</TableCell>}
                  {disputeVisibleColumns.includes('buyer') && <TableCell sx={tableHeaderCellSx}>Buyer</TableCell>}
                  {disputeVisibleColumns.includes('reason') && <TableCell sx={tableHeaderCellSx}>Reason</TableCell>}
                  {disputeVisibleColumns.includes('status') && <TableCell sx={tableHeaderCellSx}>Status</TableCell>}
                  {disputeVisibleColumns.includes('amount') && <TableCell sx={tableHeaderCellSx}>Amount</TableCell>}
                  {disputeVisibleColumns.includes('openedDate') && <TableCell sx={tableHeaderCellSx}>Open Date (PST)</TableCell>}
                  {disputeVisibleColumns.includes('closedDate') && <TableCell sx={tableHeaderCellSx}>Closed Date (PST)</TableCell>}
                  {disputeVisibleColumns.includes('outcome') && <TableCell sx={tableHeaderCellSx}>Resolution</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        No payment disputes found. Click "Fetch Payment Disputes from eBay" to load data.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDisputes.map((d) => (
                    <TableRow 
                      key={d._id} 
                      hover
                      sx={tableBodyRowSx}
                    >
                      {disputeVisibleColumns.includes('disputeId') && <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {d.paymentDisputeId || '-'}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(d.paymentDisputeId)}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>}
                      {disputeVisibleColumns.includes('orderId') && <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {d.orderId || '-'}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(d.orderId)}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>}
                      {disputeVisibleColumns.includes('seller') && <TableCell>
                        <Typography variant="body2">{d.seller?.user?.username || '-'}</Typography>
                      </TableCell>}
                      {disputeVisibleColumns.includes('buyer') && <TableCell>
                        <Typography variant="body2">{d.buyerUsername || '-'}</Typography>
                      </TableCell>}
                      {disputeVisibleColumns.includes('reason') && <TableCell>
                        <Tooltip title={d.reason || 'N/A'}>
                          <Typography 
                            variant="body2" 
                            fontSize="0.7rem"
                            sx={{ 
                              maxWidth: 120, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {d.reason?.replace(/_/g, ' ') || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>}
                      {disputeVisibleColumns.includes('status') && <TableCell>
                        <Chip 
                          label={d.paymentDisputeStatus?.replace(/_/g, ' ') || 'Unknown'} 
                          color={getDisputeStatusColor(d.paymentDisputeStatus)}
                          size="small"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </TableCell>}
                      {disputeVisibleColumns.includes('amount') && <TableCell>
                        <Typography variant="body2">
                          {d.amount?.value 
                            ? `${d.amount.currency || 'USD'} ${d.amount.value}` 
                            : '-'}
                        </Typography>
                      </TableCell>}
                      {disputeVisibleColumns.includes('openedDate') && <TableCell>
                        <Typography variant="body2" fontSize="0.75rem">
                          {formatDate(d.openDate)}
                        </Typography>
                      </TableCell>}
                      {disputeVisibleColumns.includes('closedDate') && <TableCell>
                        <Typography variant="body2" fontSize="0.75rem">
                          {d.closedDate ? formatDate(d.closedDate) : '-'}
                        </Typography>
                      </TableCell>}
                      {disputeVisibleColumns.includes('outcome') && <TableCell>
                        <Typography variant="body2" fontSize="0.75rem">
                          {d.resolution || d.sellerProtectionDecision || '-'}
                        </Typography>
                      </TableCell>}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Return Requests Tab */}
      <TabPanel value={tabValue} index={2}>
        <ReturnRequestedPage dateFilter={dateFilter} hideDateFilter embedded />
      </TabPanel>

      {/* Cancelled Status Tab */}
      <TabPanel value={tabValue} index={3}>
        <CancelledStatusPage dateFilter={dateFilter} hideDateFilter />
      </TabPanel>

      {/* Worksheet Tab */}
      <TabPanel value={tabValue} index={4}>
        <WorksheetPage dateFilter={dateFilter} hideDateFilter embedded />
      </TabPanel>

      {/* Chat Modal for INR Cases */}
      {selectedCase && (
        <ChatModal
          open={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          orderId={selectedCase.orderId}
          buyerUsername={selectedCase.buyerUsername}
          buyerName={selectedCase.buyerUsername}
          itemId={selectedCase.itemId}
          title="INR Case Chat"
          category={selectedCase.caseType || 'INR'}
          caseStatus={selectedCase.status || 'Open'}
        />
      )}

      {/* Chat Modal for Payment Disputes */}
      {selectedDispute && (
        <ChatModal
          open={Boolean(selectedDispute)}
          onClose={() => setSelectedDispute(null)}
          orderId={selectedDispute.orderId}
          buyerUsername={selectedDispute.buyerUsername}
          buyerName={selectedDispute.buyerUsername}
          title="Payment Dispute Chat"
          category="Payment Dispute"
          caseStatus={selectedDispute.paymentDisputeStatus || 'Open'}
        />
      )}

      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          open={Boolean(selectedOrderId)}
          onClose={() => setSelectedOrderId(null)}
          orderId={selectedOrderId}
        />
      )}
    </AdminPageShell>
    </Fade>
  );
}
