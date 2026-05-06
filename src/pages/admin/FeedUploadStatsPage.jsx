import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Container, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, Stack
} from '@mui/material';
import { alpha, ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import BarChartIcon from '@mui/icons-material/BarChart';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx } from '../../theme/tableStyles.js';
import api from '../../lib/api';

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = String(new Date(y, m, 0).getDate()).padStart(2, '0');
  return { first: `${ym}-01`, last: `${ym}-${last}` };
}

// Sellers with a higher monthly quota (US only)
const HIGH_QUOTA_SELLERS = ['truxi', 'raveoli_cart', 'techmania'];

// Country-based quotas
const COUNTRY_QUOTAS = {
  US: { high: 25000, normal: 9000 },
  UK: { high: 100000, normal: 100000 },  // 1 lakh
  AU: { high: 250000, normal: 250000 },  // 2.5 lakh
  Canada: { high: null, normal: null },   // Not yet defined
};

const getQuota = (sellerName, country = 'US') => {
  const quotas = COUNTRY_QUOTAS[country] || COUNTRY_QUOTAS.US;
  const isHighQuota = HIGH_QUOTA_SELLERS.includes((sellerName || '').toLowerCase());
  return isHighQuota ? quotas.high : quotas.normal;
};

export default function FeedUploadStatsPage() {
  const theme = useTheme();

  const inputFocusSx = {
    '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '& fieldset': { transition: 'border-color 0.2s ease' },
      '&:hover fieldset': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
      '&.Mui-focused fieldset': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
    },
    '& input': { accentColor: BRAND_YELLOW }
  };
  const selectFocusSx = {
    borderRadius: 1.5,
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        '& .MuiMenuItem-root.Mui-selected': {
          backgroundColor: alpha(BRAND_YELLOW, 0.2),
          '&:hover': { backgroundColor: alpha(BRAND_YELLOW, 0.3) }
        }
      }
    }
  };

  const datePickerTheme = useMemo(() => createTheme({
    palette: {
      primary: { 
        main: BRAND_YELLOW,
        light: BRAND_YELLOW,
        dark: BRAND_YELLOW,
        contrastText: BRAND_DARK
      },
    },
    components: {
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12, // 1.5 * 8
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: BRAND_YELLOW,
            }
          }
        }
      }
    }
  }), []);

  const [dayDate, setDayDate] = useState(todayStr);
  const [dayStats, setDayStats] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState(null);
  const [dayCountry, setDayCountry] = useState('ALL');

  const [monthPicker, setMonthPicker] = useState(currentMonthStr);
  const [monthStats, setMonthStats] = useState([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [monthError, setMonthError] = useState(null);
  const [monthCountry, setMonthCountry] = useState('US');

  // Category / Range breakdown (uses day-wise date & country)
  const [catStats, setCatStats] = useState({ categories: [], ranges: [] });
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState(null);

  const fetchDay = async (date, country) => {
    try {
      setDayLoading(true);
      setDayError(null);
      const params = { startDate: date, endDate: date };
      if (country !== 'ALL') params.country = country;
      const { data } = await api.get('/ebay/feed/upload-stats', { params });
      setDayStats([...data].sort((a, b) => (b.totalSuccess || 0) - (a.totalSuccess || 0)));
    } catch (err) {
      setDayError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setDayLoading(false);
    }
  };

  const fetchCategoryStats = async (date, country) => {
    try {
      setCatLoading(true);
      setCatError(null);
      const params = { startDate: date, endDate: date };
      if (country !== 'ALL') params.country = country;
      const { data } = await api.get('/ebay/feed/category-stats', { params });
      setCatStats(data);
    } catch (err) {
      setCatError(err.response?.data?.error || 'Failed to fetch category stats');
    } finally {
      setCatLoading(false);
    }
  };

  const fetchMonth = async (ym, country) => {
    try {
      setMonthLoading(true);
      setMonthError(null);
      const { first, last } = monthBounds(ym);
      const params = { startDate: first, endDate: last };
      if (country !== 'ALL') params.country = country;
      const { data } = await api.get('/ebay/feed/upload-stats', { params });
      const map = {};
      data.forEach((r) => {
        // Group by sellerName + category + range to handle duplicate seller accounts
        const key = `${r.sellerName}||${r.categoryName || ''}||${r.rangeName || ''}`;
        if (!map[key])
          map[key] = { sellerId: r.sellerId, sellerName: r.sellerName, categoryName: r.categoryName || '', rangeName: r.rangeName || '', totalSuccess: 0 };
        map[key].totalSuccess += r.totalSuccess || 0;
      });
      setMonthStats(
        Object.values(map)
          .sort((a, b) => b.totalSuccess - a.totalSuccess)
      );
    } catch (err) {
      setMonthError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setMonthLoading(false);
    }
  };

  useEffect(() => { fetchDay(todayStr(), dayCountry); fetchCategoryStats(todayStr(), dayCountry); }, []);
  useEffect(() => { fetchMonth(currentMonthStr(), monthCountry); }, []);

  // Refetch when country filters change
  useEffect(() => {
    fetchDay(dayDate, dayCountry);
    fetchCategoryStats(dayDate, dayCountry);
  }, [dayCountry]);

  useEffect(() => {
    fetchMonth(monthPicker, monthCountry);
  }, [monthCountry]);

  const dayTotal = dayStats.reduce((s, r) => s + (r.totalSuccess || 0), 0);
  const monthTotal = monthStats.reduce((s, r) => s + (r.totalSuccess || 0), 0);

  const headSx = {
    fontWeight: 700,
    bgcolor: '#f0f0f0',
    fontSize: '0.85rem',
    py: 1.8,
    borderBottom: '2px solid #d0d0d0',
  };
  const cellSx = { py: 1.6, fontSize: '0.9rem' };
  const numCellSx = { py: 1.6, fontSize: '0.9rem', fontWeight: 600, minWidth: 140 };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', p: 1, borderRadius: 2, backgroundColor: alpha(BRAND_YELLOW, 0.2) }}>
          <BarChartIcon sx={{ color: BRAND_YELLOW_DARK, fontSize: 28 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND_DARK, letterSpacing: -0.5 }}>
          Feed Upload Success Stats
        </Typography>
      </Stack>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* ── Day-wise ─────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.12)}`, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
            <Typography variant="subtitle1" fontWeight={700} fontSize="1rem" sx={{ color: BRAND_DARK }}>Day-wise</Typography>
            <Select
              size="small"
              value={dayCountry}
              onChange={(e) => setDayCountry(e.target.value)}
              sx={{ minWidth: 140, ...selectFocusSx }}
              MenuProps={menuProps}
            >
              <MenuItem value="ALL">All Countries</MenuItem>
              <MenuItem value="US">US</MenuItem>
              <MenuItem value="UK">UK</MenuItem>
              <MenuItem value="AU">AU</MenuItem>
              <MenuItem value="Canada">Canada</MenuItem>
            </Select>
            <Box sx={{ ml: 'auto' }}>
              <ThemeProvider theme={datePickerTheme}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    value={dayDate ? new Date(dayDate) : null}
                    onChange={(date) => {
                      if (!date) {
                        setDayDate('');
                        return;
                      }
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      const isoDate = `${y}-${m}-${d}`;
                      setDayDate(isoDate);
                      fetchDay(isoDate, dayCountry);
                      fetchCategoryStats(isoDate, dayCountry);
                    }}
                    slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
                  />
                </LocalizationProvider>
              </ThemeProvider>
            </Box>
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
                <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderCellSx, width: 52, pl: 3 }}>#</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Seller</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Country</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Category</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Range</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx, pr: 3 }} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dayStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: '0.9rem' }}>
                        No data for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dayStats.map((row, idx) => (
                        <TableRow
                          key={`d-${row.sellerId}-${idx}`}
                          hover
                          sx={tableBodyRowSx}
                        >
                          <TableCell sx={{ ...cellSx, color: 'text.disabled', width: 52, pl: 3 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ ...cellSx, fontWeight: 500, color: BRAND_DARK }}>{row.sellerName}</TableCell>
                          <TableCell sx={cellSx}>{row.country || 'US'}</TableCell>
                          <TableCell sx={cellSx}>{row.categoryName || <Typography component="span" sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: '0.85rem' }}>—</Typography>}</TableCell>
                          <TableCell sx={cellSx}>{row.rangeName || <Typography component="span" sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: '0.85rem' }}>—</Typography>}</TableCell>
                          <TableCell align="right" sx={{ ...numCellSx, pr: 3, fontWeight: 700, color: BRAND_DARK }}>
                            {row.totalSuccess.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: alpha(BRAND_YELLOW, 0.15) }}>
                        <TableCell colSpan={5} sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pl: 3, py: 1.6, borderBottom: 'none' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pr: 3, py: 1.6, borderBottom: 'none' }}>
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
        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.12)}`, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
            <Typography variant="subtitle1" fontWeight={700} fontSize="1rem" sx={{ color: BRAND_DARK }}>Month-wise</Typography>
            <Select
              size="small"
              value={monthCountry}
              onChange={(e) => setMonthCountry(e.target.value)}
              sx={{ minWidth: 140, ...selectFocusSx }}
              MenuProps={menuProps}
            >
              <MenuItem value="US">US</MenuItem>
              <MenuItem value="UK">UK</MenuItem>
              <MenuItem value="AU">AU</MenuItem>
              <MenuItem value="Canada">Canada</MenuItem>
            </Select>
            <Box sx={{ ml: 'auto' }}>
              <ThemeProvider theme={datePickerTheme}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    views={['month', 'year']}
                    value={monthPicker ? new Date(`${monthPicker}-01T00:00:00`) : null}
                    onChange={(date) => {
                      if (!date) {
                        setMonthPicker('');
                        return;
                      }
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const ym = `${y}-${m}`;
                      setMonthPicker(ym);
                      fetchMonth(ym, monthCountry);
                    }}
                    slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
                  />
                </LocalizationProvider>
              </ThemeProvider>
            </Box>
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
                <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderCellSx, width: 52, pl: 3 }}>#</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Seller</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Category</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Range</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx, pr: 3 }} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: '0.9rem' }}>
                        No data for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {monthStats.map((row, idx) => {
                        const quota = getQuota(row.sellerName, monthCountry);
                        return (
                          <TableRow
                            key={`m-${row.sellerId}-${idx}`}
                            hover
                            sx={tableBodyRowSx}
                          >
                            <TableCell sx={{ ...cellSx, color: 'text.disabled', width: 52, pl: 3 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ ...cellSx, fontWeight: 500, color: BRAND_DARK }}>{row.sellerName}</TableCell>
                            <TableCell sx={cellSx}>{row.categoryName || <Typography component="span" sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: '0.85rem' }}>—</Typography>}</TableCell>
                            <TableCell sx={cellSx}>{row.rangeName || <Typography component="span" sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: '0.85rem' }}>—</Typography>}</TableCell>
                            <TableCell align="right" sx={{ ...numCellSx, pr: 3, fontWeight: 700, color: BRAND_DARK }}>
                              {row.totalSuccess.toLocaleString()}
                              {quota && (
                                <Typography component="span" sx={{ fontSize: '0.78rem', color: alpha(BRAND_DARK, 0.5), ml: 0.5, fontWeight: 500 }}>
                                  / {quota.toLocaleString()}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow sx={{ backgroundColor: alpha(BRAND_YELLOW, 0.15) }}>
                        <TableCell colSpan={4} sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pl: 3, py: 1.6, borderBottom: 'none' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pr: 3, py: 1.6, borderBottom: 'none' }}>
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

      {/* ── Category / Range Breakdown ────────────────────────────── */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Categories */}
        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.12)}`, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
            <Typography variant="subtitle1" fontWeight={700} fontSize="1rem" sx={{ color: BRAND_DARK }}>
              By Category <Typography component="span" variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), ml: 1 }}>(day-wise date)</Typography>
            </Typography>
          </Box>
          {catLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : catError ? (
            <Alert severity="error" sx={{ m: 2 }}>{catError}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderCellSx, width: 52, pl: 3 }}>#</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Category</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx, pr: 3 }} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catStats.categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: '0.9rem' }}>
                        No category data for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {catStats.categories.map((row, idx) => (
                        <TableRow key={`cat-${row.categoryId}`} hover sx={tableBodyRowSx}>
                          <TableCell sx={{ color: 'text.disabled', width: 52, pl: 3, py: 1.6 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ py: 1.6, fontWeight: 500, color: BRAND_DARK }}>{row.name}</TableCell>
                          <TableCell align="right" sx={{ py: 1.6, pr: 3, fontWeight: 700, color: BRAND_DARK }}>
                            {row.totalSuccess.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: alpha(BRAND_YELLOW, 0.15) }}>
                        <TableCell colSpan={2} sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pl: 3, py: 1.6, borderBottom: 'none' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pr: 3, py: 1.6, borderBottom: 'none' }}>
                          {catStats.categories.reduce((s, r) => s + r.totalSuccess, 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Ranges */}
        <Paper elevation={0} sx={{ flex: 1, minWidth: 0, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.12)}`, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
            <Typography variant="subtitle1" fontWeight={700} fontSize="1rem" sx={{ color: BRAND_DARK }}>
              By Range <Typography component="span" variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), ml: 1 }}>(day-wise date)</Typography>
            </Typography>
          </Box>
          {catLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
          ) : catError ? (
            <Alert severity="error" sx={{ m: 2 }}>{catError}</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                  <TableRow>
                    <TableCell sx={{ ...tableHeaderCellSx, width: 52, pl: 3 }}>#</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Range</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx }}>Category</TableCell>
                    <TableCell sx={{ ...tableHeaderCellSx, pr: 3 }} align="right">Successful Listings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catStats.ranges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary', fontSize: '0.9rem' }}>
                        No range data for this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {catStats.ranges.map((row, idx) => (
                        <TableRow key={`rng-${row.rangeId}`} hover sx={tableBodyRowSx}>
                          <TableCell sx={{ color: 'text.disabled', width: 52, pl: 3, py: 1.6 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ py: 1.6, fontWeight: 500, color: BRAND_DARK }}>{row.name}</TableCell>
                          <TableCell sx={{ py: 1.6, color: alpha(BRAND_DARK, 0.6) }}>{row.categoryName}</TableCell>
                          <TableCell align="right" sx={{ py: 1.6, pr: 3, fontWeight: 700, color: BRAND_DARK }}>
                            {row.totalSuccess.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: alpha(BRAND_YELLOW, 0.15) }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pl: 3, py: 1.6, borderBottom: 'none' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: BRAND_DARK, fontSize: '0.9rem', pr: 3, py: 1.6, borderBottom: 'none' }}>
                          {catStats.ranges.reduce((s, r) => s + r.totalSuccess, 0).toLocaleString()}
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