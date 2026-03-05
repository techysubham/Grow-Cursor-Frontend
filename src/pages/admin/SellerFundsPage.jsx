import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  Button,
  Divider,
  Stack
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../../lib/api';

const formatCurrency = (amountObj) => {
  if (!amountObj) return '$0.00';
  const val = parseFloat(amountObj.value || 0);
  const currency = amountObj.currency || 'USD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const FundsCard = ({ label, icon, amount, color, onClick, expandable, expanded }) => (
  <Card
    sx={{
      flex: 1,
      minWidth: 180,
      cursor: expandable ? 'pointer' : 'default',
      border: expanded ? `2px solid ${color}` : '1px solid #e0e0e0',
      transition: 'all 0.2s',
      '&:hover': expandable ? { boxShadow: 3, borderColor: color } : {}
    }}
    onClick={onClick}
  >
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 1 }}>
        {icon}
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        {expandable && (
          expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />
        )}
      </Box>
      <Typography variant="h5" fontWeight={700} sx={{ color }}>
        {amount}
      </Typography>
    </CardContent>
  </Card>
);

const SellerFundsRow = ({ seller }) => {
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [txnError, setTxnError] = useState(null);

  const processingValue = parseFloat(seller.processingFunds?.value || 0);
  const hasProcessing = processingValue > 0;

  const fetchProcessingTransactions = useCallback(async () => {
    if (!hasProcessing) return;
    setLoadingTxns(true);
    setTxnError(null);
    try {
      const res = await api.get(`/ebay/processing-transactions/${seller.sellerId}`);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      setTxnError(err.response?.data?.error || 'Failed to load processing transactions');
    } finally {
      setLoadingTxns(false);
    }
  }, [seller.sellerId, hasProcessing]);

  const handleToggle = () => {
    if (!hasProcessing) return;
    const willExpand = !expanded;
    setExpanded(willExpand);
    if (willExpand && transactions.length === 0 && !loadingTxns) {
      fetchProcessingTransactions();
    }
  };

  if (seller.error) {
    return (
      <Paper sx={{ p: 3, mb: 2, borderLeft: '4px solid #f44336' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineIcon color="error" />
          <Typography variant="h6">{seller.sellerName}</Typography>
          <Chip label="Error" color="error" size="small" />
        </Box>
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {seller.error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Total Funds Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {seller.sellerName}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {formatCurrency(seller.totalFunds)}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Total Funds
          </Typography>
        </Box>
        <AccountBalanceWalletIcon sx={{ fontSize: 48, opacity: 0.3 }} />
      </Box>

      {/* Fund Breakdown Cards */}
      <Box sx={{ px: 3, py: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FundsCard
            label="Available Funds"
            icon={<AttachMoneyIcon sx={{ color: '#22c55e', fontSize: 20 }} />}
            amount={formatCurrency(seller.availableFunds)}
            color="#22c55e"
          />
          <FundsCard
            label="Processing"
            icon={<HourglassEmptyIcon sx={{ color: '#f59e0b', fontSize: 20 }} />}
            amount={formatCurrency(seller.processingFunds)}
            color="#f59e0b"
            expandable={hasProcessing}
            expanded={expanded}
            onClick={handleToggle}
          />
          <FundsCard
            label="On Hold"
            icon={<PauseCircleOutlineIcon sx={{ color: '#ef4444', fontSize: 20 }} />}
            amount={formatCurrency(seller.fundsOnHold)}
            color="#ef4444"
          />
        </Stack>
      </Box>

      {/* Expandable Processing Transactions */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            Processing Orders
          </Typography>

          {loadingTxns && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {txnError && (
            <Alert severity="error" sx={{ mb: 1 }}>{txnError}</Alert>
          )}

          {!loadingTxns && !txnError && transactions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No processing transactions found.
            </Typography>
          )}

          {!loadingTxns && transactions.length > 0 && (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Order ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Buyer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Transaction Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ship By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expected Delivery</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((txn, idx) => (
                    <TableRow key={txn.orderId || idx} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize={13}>
                          {txn.orderId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: txn.currency || 'USD'
                          }).format(txn.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{txn.buyer}</TableCell>
                      <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                      <TableCell>
                        {txn.shipByDate ? (
                          <Chip
                            label={formatDate(txn.shipByDate)}
                            size="small"
                            color={new Date(txn.shipByDate) < new Date() ? 'error' : 'default'}
                            variant="outlined"
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {txn.expectedDeliveryDate ? (
                          <Chip
                            label={formatDate(txn.expectedDeliveryDate)}
                            size="small"
                            color={new Date(txn.expectedDeliveryDate) < new Date() ? 'warning' : 'success'}
                            variant="outlined"
                          />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

const SellerFundsPage = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchFundsSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ebay/seller-funds-summary');
      setSellers(res.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch seller funds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFundsSummary();
  }, [fetchFundsSummary]);

  // Aggregate totals
  const totals = sellers.reduce((acc, s) => {
    if (!s.error) {
      acc.total += parseFloat(s.totalFunds?.value || 0);
      acc.available += parseFloat(s.availableFunds?.value || 0);
      acc.processing += parseFloat(s.processingFunds?.value || 0);
      acc.onHold += parseFloat(s.fundsOnHold?.value || 0);
    }
    return acc;
  }, { total: 0, available: 0, processing: 0, onHold: 0 });

  const fmtTotal = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Seller Funds Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live funds summary from eBay Finances API
            {lastRefresh && ` • Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchFundsSummary}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Aggregated Totals */}
          {sellers.length > 1 && (
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                All Sellers Combined
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total Funds</Typography>
                  <Typography variant="h5" fontWeight={700} color="#3b82f6">{fmtTotal(totals.total)}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Available</Typography>
                  <Typography variant="h5" fontWeight={700} color="#22c55e">{fmtTotal(totals.available)}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Processing</Typography>
                  <Typography variant="h5" fontWeight={700} color="#f59e0b">{fmtTotal(totals.processing)}</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">On Hold</Typography>
                  <Typography variant="h5" fontWeight={700} color="#ef4444">{fmtTotal(totals.onHold)}</Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Per-Seller Cards */}
          {sellers.length === 0 ? (
            <Alert severity="info">No sellers with eBay connections found.</Alert>
          ) : (
            sellers.map((seller) => (
              <SellerFundsRow key={seller.sellerId} seller={seller} />
            ))
          )}
        </>
      )}
    </Box>
  );
};

export default SellerFundsPage;
