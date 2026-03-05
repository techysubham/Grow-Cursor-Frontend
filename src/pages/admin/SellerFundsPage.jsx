import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Stack,
  Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
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

const SellerRow = ({ seller }) => {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const processingValue = parseFloat(seller.processingFunds?.value || 0);
  const canExpand = processingValue > 0;

  const fetchTransactions = async () => {
    if (!canExpand || transactions.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/ebay/processing-transactions/${seller.sellerId}`);
      setTransactions(res.data.transactions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!canExpand) return;
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && transactions.length === 0) {
      fetchTransactions();
    }
  };

  if (seller.error) {
    return (
      <TableRow>
        <TableCell colSpan={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <ErrorOutlineIcon color="error" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>{seller.sellerName}</Typography>
            <Typography variant="body2" color="error">— {seller.error}</Typography>
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: open ? 'none !important' : undefined } }}>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {seller.sellerName}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={700} sx={{ color: '#3b82f6' }}>
            {formatCurrency(seller.totalFunds)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={600} sx={{ color: '#22c55e' }}>
            {formatCurrency(seller.availableFunds)}
          </Typography>
        </TableCell>
        <TableCell 
          align="right" 
          sx={{ 
            cursor: canExpand ? 'pointer' : 'default',
            backgroundColor: open ? '#fef3c7' : canExpand ? '#fffbeb' : 'transparent',
            '&:hover': canExpand ? { backgroundColor: '#fef3c7' } : {},
            transition: 'background-color 0.2s'
          }}
          onClick={handleToggle}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#f59e0b' }}>
              {formatCurrency(seller.processingFunds)}
            </Typography>
            {canExpand && (
              <IconButton size="small" sx={{ ml: 0.5 }}>
                {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
              </IconButton>
            )}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={600} sx={{ color: '#ef4444' }}>
            {formatCurrency(seller.fundsOnHold)}
          </Typography>
        </TableCell>
      </TableRow>

      {/* Expandable Processing Details */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 3, backgroundColor: '#fffbeb' }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: '#92400e' }}>
                Processing Orders - To be completed
              </Typography>

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

              {!loading && transactions.length === 0 && !error && (
                <Typography variant="body2" color="text.secondary">
                  No processing transactions found.
                </Typography>
              )}

              {!loading && transactions.length > 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #fbbf24' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#fef3c7' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Order ID</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Buyer</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Transaction Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>To Be Completed</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Ship By</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((txn, idx) => (
                        <TableRow key={txn.orderId || idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                              {txn.orderId}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} fontSize={12}>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: txn.currency || 'USD'
                              }).format(txn.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontSize={12}>{txn.buyer}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontSize={11} color="text.secondary">
                              {formatDate(txn.transactionDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {txn.payoutCompletionDate ? (
                              <Chip
                                label={new Date(txn.payoutCompletionDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                size="small"
                                sx={{ 
                                  fontWeight: 600,
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  fontSize: 11
                                }}
                              />
                            ) : (
                              <Typography variant="body2" fontSize={11} color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {txn.shipByDate ? (
                              <Chip
                                label={new Date(txn.shipByDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                                size="small"
                                color={new Date(txn.shipByDate) < new Date() ? 'error' : 'default'}
                                variant="outlined"
                                sx={{ fontSize: 11 }}
                              />
                            ) : (
                              <Typography variant="body2" fontSize={11} color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
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

  // Calculate totals
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
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Seller Funds Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live data from eBay Finances API
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
      ) : sellers.length === 0 ? (
        <Alert severity="info">No sellers with eBay connections found.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#3b82f6' }}>
                  Total Funds
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#22c55e' }}>
                  Available
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                  Processing
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#ef4444' }}>
                  On Hold
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellers.map((seller) => (
                <SellerRow key={seller.sellerId} seller={seller} />
              ))}

              {/* Totals Row */}
              {sellers.length > 1 && (
                <TableRow sx={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      TOTAL
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight={700} sx={{ color: '#3b82f6' }}>
                      {fmtTotal(totals.total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight={700} sx={{ color: '#22c55e' }}>
                      {fmtTotal(totals.available)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight={700} sx={{ color: '#f59e0b' }}>
                      {fmtTotal(totals.processing)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight={700} sx={{ color: '#ef4444' }}>
                      {fmtTotal(totals.onHold)}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default SellerFundsPage;
