import { useState, useEffect } from 'react';
import {
  Box, Typography, Container, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField,
} from '@mui/material';
import api from '../../lib/api';

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = String(new Date(y, m, 0).getDate()).padStart(2, '0');
  return { first: `${ym}-01`, last: `${ym}-${last}` };
}

// Sellers with a higher monthly quota
const HIGH_QUOTA_SELLERS = ['truxi', 'raveoli_cart'];
const getQuota = (sellerName) =>
  HIGH_QUOTA_SELLERS.includes((sellerName || '').toLowerCase()) ? 25000 : 9000;

export default function FeedUploadStatsPage() {
  const [dayDate, setDayDate] = useState(todayStr);
  const [dayStats, setDayStats] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState(null);

  const [monthPicker, setMonthPicker] = useState(currentMonthStr);
  const [monthStats, setMonthStats] = useState([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState(null);

  const fetchDay = async (date) => {
    try {
      setDayLoading(true);
      setDayError(null);
      const { data } = await api.get('/ebay/feed/upload-stats', {
        params: { startDate: date, endDate: date },
      });
      setDayStats([...data].sort((a, b) => (b.totalSuccess || 0) - (a.totalSuccess || 0)));
    } catch (err) {
      setDayError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setDayLoading(false);
    }
  };

  const fetchMonth = async (ym) => {
    try {
      setMonthLoading(true);
      setMonthError(null);
      const { first, last } = monthBounds(ym);
      const { data } = await api.get('/ebay/feed/upload-stats', {
        params: { startDate: first, endDate: last },
      });
      const map = {};
      data.forEach((r) => {
        if (!map[r.sellerId])
          map[r.sellerId] = { sellerName: r.sellerName, totalSuccess: 0 };
        map[r.sellerId].totalSuccess += r.totalSuccess || 0;
      });
      setMonthStats(
        Object.entries(map)
          .map(([id, v]) => ({ sellerId: id, ...v }))
          .sort((a, b) => b.totalSuccess - a.totalSuccess)
      );
    } catch (err) {
      setMonthError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setMonthLoading(false);
    }
  };

  useEffect(() => { fetchDay(todayStr()); }, []);
  useEffect(() => { fetchMonth(currentMonthStr()); }, []);

  const dayTotal = dayStats.reduce((s, r) => s + (r.totalSuccess || 0), 0);
  const monthTotal = monthStats.reduce((s, r) => s + (r.totalSuccess || 0), 0);

  const headSx = { fontWeight: 700, bgcolor: '#f5f5f5' };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Feed Upload Success Stats
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* ── Day-wise ─────────────────────────────────────────────────── */}
        <Paper sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Day-wise</Typography>
            <TextField
              type="date"
              size="small"
              value={dayDate}
              onChange={(e) => { setDayDate(e.target.value); fetchDay(e.target.value); }}
              InputLabelProps={{ shrink: true }}
              sx={{ ml: 'auto', width: 170 }}
            />
          </Box>

          {dayLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : dayError ? (
            <Alert severity="error" sx={{ m: 2 }}>{dayError}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>#</TableCell>
                    <TableCell sx={headSx}>Seller</TableCell>
                    <TableCell sx={headSx} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        No data for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dayStats.map((row, idx) => (
                        <TableRow key={`d-${row.sellerId}-${idx}`} hover>
                          <TableCell sx={{ color: 'text.secondary', width: 40 }}>{idx + 1}</TableCell>
                          <TableCell>{row.sellerName}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {row.totalSuccess.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {dayTotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* ── Month-wise ───────────────────────────────────────────────── */}
        <Paper sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>Month-wise</Typography>
            <TextField
              type="month"
              size="small"
              value={monthPicker}
              onChange={(e) => { setMonthPicker(e.target.value); fetchMonth(e.target.value); }}
              InputLabelProps={{ shrink: true }}
              sx={{ ml: 'auto', width: 190 }}
            />
          </Box>

          {monthLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : monthError ? (
            <Alert severity="error" sx={{ m: 2 }}>{monthError}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>#</TableCell>
                    <TableCell sx={headSx}>Seller</TableCell>
                    <TableCell sx={headSx} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        No data for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {monthStats.map((row, idx) => {
                        const quota = getQuota(row.sellerName);
                        return (
                          <TableRow key={`m-${row.sellerId}-${idx}`} hover>
                            <TableCell sx={{ color: 'text.secondary', width: 40 }}>{idx + 1}</TableCell>
                            <TableCell>{row.sellerName}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {row.totalSuccess.toLocaleString()}
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                / {quota.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ bgcolor: '#fafafa' }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {monthTotal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Container>
  );
}