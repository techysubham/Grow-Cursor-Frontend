import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Pagination, Collapse, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../lib/api';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).format(new Date(dateString));
};

export default function CompatibilityBatchHistoryPage() {
  const [sellers, setSellers] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [detailDialog, setDetailDialog] = useState(null); // log object

  useEffect(() => {
    const loadSellers = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data);
      } catch {
        try {
          const { data } = await api.get('/sellers/me');
          setSellers([data]);
        } catch (e) { console.error(e); }
      }
    };
    loadSellers();

    // Default date range: last 7 days
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setEndDate(now.toISOString().slice(0, 10));
    setStartDate(weekAgo.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (startDate && endDate) fetchLogs();
  }, [page, selectedSellerId, startDate, endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (selectedSellerId) params.sellerId = selectedSellerId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const { data } = await api.get('/ebay/compatibility-batch-history', { params });
      setLogs(data.logs);
      setTotalPages(data.pages);
    } catch (e) {
      console.error('Failed to fetch batch history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Group logs by date for day-wise view
  const logsByDate = {};
  logs.forEach(log => {
    const d = log.date || 'Unknown';
    if (!logsByDate[d]) logsByDate[d] = [];
    logsByDate[d].push(log);
  });
  const sortedDates = Object.keys(logsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Compatibility Batch History</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Day-wise and seller-wise history of bulk compatibility sends to eBay
      </Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Seller</InputLabel>
          <Select value={selectedSellerId} label="Seller" onChange={(e) => { setSelectedSellerId(e.target.value); setPage(1); }}>
            <MenuItem value="">All Sellers</MenuItem>
            {sellers.map((s) => (
              <MenuItem key={s._id} value={s._id}>{s.user?.username || s.user?.email}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          type="date"
          label="Start Date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
        />
        <TextField
          type="date"
          label="End Date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>
      ) : logs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">No batch history found for selected filters</Typography>
        </Paper>
      ) : (
        <>
          {sortedDates.map(date => (
            <Box key={date} sx={{ mb: 3 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, cursor: 'pointer' }}
                onClick={() => setExpandedLogId(expandedLogId === date ? null : date)}
              >
                <IconButton size="small">
                  {expandedLogId === date ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <Typography variant="h6" fontWeight="bold">{date}</Typography>
                <Chip
                  label={`${logsByDate[date].length} batch${logsByDate[date].length > 1 ? 'es' : ''}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${logsByDate[date].reduce((s, l) => s + l.successCount, 0)} success`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`${logsByDate[date].reduce((s, l) => s + l.failureCount, 0)} failed`}
                  size="small"
                  color={logsByDate[date].reduce((s, l) => s + l.failureCount, 0) > 0 ? 'error' : 'default'}
                  variant="outlined"
                />
              </Box>

              <Collapse in={expandedLogId === date || expandedLogId === null}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell>Time</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Seller</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Correct</TableCell>
                        <TableCell align="center">Skipped</TableCell>
                        <TableCell align="center">Success</TableCell>
                        <TableCell align="center">Failed</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logsByDate[date].map((log) => (
                        <TableRow key={log._id} hover>
                          <TableCell><Typography variant="caption">{formatDate(log.createdAt)}</Typography></TableCell>
                          <TableCell>{log.user?.username || log.user?.name || 'Unknown'}</TableCell>
                          <TableCell>{log.sellerUsername || 'Unknown'}</TableCell>
                          <TableCell align="center">{log.totalItems}</TableCell>
                          <TableCell align="center">
                            <Chip label={log.correctCount} size="small" color="success" variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={log.skippedCount} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={log.successCount} size="small" color="success" />
                          </TableCell>
                          <TableCell align="center">
                            {log.failureCount > 0 ? (
                              <Chip label={log.failureCount} size="small" color="error" />
                            ) : (
                              <Chip label="0" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" onClick={() => setDetailDialog(log)}>
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Collapse>
            </Box>
          ))}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
          </Box>
        </>
      )}

      {/* DETAIL DIALOG */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>
          <Typography variant="h6" fontWeight="bold">Batch Details</Typography>
          <Typography variant="body2" color="textSecondary">
            {detailDialog && `${formatDate(detailDialog.createdAt)} • ${detailDialog.user?.username || 'Unknown'} • ${detailDialog.sellerUsername || 'Unknown Seller'}`}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {detailDialog && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
                <Chip label={`Total: ${detailDialog.totalItems}`} variant="outlined" />
                <Chip label={`Success: ${detailDialog.successCount}`} color="success" />
                <Chip label={`Failed: ${detailDialog.failureCount}`} color={detailDialog.failureCount > 0 ? 'error' : 'default'} />
                <Chip label={`Skipped: ${detailDialog.skippedCount}`} variant="outlined" />
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Item ID</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Vehicles</TableCell>
                      <TableCell>Error / Warning</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailDialog.items.map((item, idx) => (
                      <TableRow key={idx} sx={{ bgcolor: item.status === 'success' ? '#f0fdf4' : item.status === 'failure' ? '#fef2f2' : '#fafafa' }}>
                        <TableCell>
                          <Chip
                            label={item.status === 'success' ? '✓ Success' : item.status === 'failure' ? '✗ Failed' : '⊘ Skipped'}
                            size="small"
                            color={item.status === 'success' ? 'success' : item.status === 'failure' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </TableCell>
                        <TableCell><Typography variant="caption">{item.itemId}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{item.sku || '—'}</Typography></TableCell>
                        <TableCell align="right">{item.compatibilityCount}</TableCell>
                        <TableCell>
                          {item.error && (
                            <Typography variant="caption" color="error.main" sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.error}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(null)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
