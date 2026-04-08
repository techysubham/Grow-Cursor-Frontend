import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import api from '../../lib/api';

const formatDateIST = (dateString) => {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(dateString));
};

export default function AutoCompatSellerHistoryPage() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellerSearch, setSellerSearch] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const loadSellers = async () => {
      setLoadingSellers(true);
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data || []);
      } catch {
        try {
          const { data } = await api.get('/sellers/me');
          setSellers(data ? [data] : []);
        } catch (e) {
          console.error(e);
          setSnackbar({ open: true, message: 'Failed to load sellers', severity: 'error' });
        }
      } finally {
        setLoadingSellers(false);
      }
    };

    loadSellers();
  }, []);

  const filteredSellers = useMemo(() => {
    const keyword = sellerSearch.trim().toLowerCase();
    if (!keyword) return sellers;
    return sellers.filter((seller) => {
      const username = seller.user?.username?.toLowerCase() || '';
      const email = seller.user?.email?.toLowerCase() || '';
      const storeName = seller.storeName?.toLowerCase() || '';
      return username.includes(keyword) || email.includes(keyword) || storeName.includes(keyword);
    });
  }, [sellerSearch, sellers]);

  const loadHistory = async (seller) => {
    setSelectedSeller(seller);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/ebay/auto-compatibility-batches', {
        params: { sellerId: seller._id, limit: 100 },
      });
      setHistory(data.batches || []);
    } catch (e) {
      console.error(e);
      setHistory([]);
      setSnackbar({ open: true, message: 'Failed to load auto-compatibility history', severity: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewBatch = (batchId) => {
    sessionStorage.setItem('autoCompat_loadBatchId', batchId);
    navigate('/admin/auto-compatibility');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Auto-Compatibility Seller History</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Open auto-compatibility history directly from a seller list without selecting the seller in the run page.
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Search Seller"
          placeholder="Search by username, email, or store name"
          value={sellerSearch}
          onChange={(e) => setSellerSearch(e.target.value)}
        />
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loadingSellers ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : filteredSellers.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="textSecondary">No sellers found.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Seller</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSellers.map((seller) => (
                  <TableRow key={seller._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {seller.user?.username || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={() => loadHistory(seller)}
                      >
                        View History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Auto-Compatibility History</Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Seller: ${selectedSeller?.user?.username || selectedSeller?.user?.email || '—'}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>
          ) : history.length === 0 ? (
            <Typography color="textSecondary" textAlign="center" p={3}>
              No batches found for {selectedSeller?.user?.username || selectedSeller?.user?.email || 'this seller'}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Listing Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Run On</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Seller</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>✅</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>🔧</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>❌</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Manual Review</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((batch) => (
                    <TableRow key={batch._id} hover>
                      <TableCell>{batch.targetDate}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDateIST(batch.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>{batch.seller?.user?.username || '—'}</TableCell>
                      <TableCell>{batch.triggeredBy?.username || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={batch.status}
                          size="small"
                          color={batch.status === 'completed' ? 'success' : batch.status === 'running' ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">{batch.totalListings}</TableCell>
                      <TableCell align="center">{batch.successCount + (batch.warningCount || 0)}</TableCell>
                      <TableCell align="center">{batch.needsManualCount || 0}</TableCell>
                      <TableCell align="center">{(batch.ebayErrorCount || 0) + (batch.aiFailedCount || 0)}</TableCell>
                      <TableCell>
                        {batch.manualReviewDone ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <Chip label={`✓${batch.manualCorrectCount}`} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                            <Chip label={`→${batch.manualSkippedCount}`} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />
                            <Chip label={`⨯${batch.manualEndedCount}`} size="small" color="error" sx={{ height: 20, fontSize: '0.65rem' }} />
                          </Box>
                        ) : (
                          <Typography variant="caption" color="textSecondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleViewBatch(batch._id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}