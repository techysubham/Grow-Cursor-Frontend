import React, { useEffect, useMemo, useState } from 'react';
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
  Alert,
  TextField,
  Button,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ListAltIcon from '@mui/icons-material/ListAlt';
import api from '../../lib/api';

const CATEGORIES = [
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'returns', label: 'Returns' },
  { key: 'inrDisputes', label: 'INR & Disputes' },
  { key: 'inquiries', label: 'Inquiries' }
];

const STATUS_COLUMNS = [
  { key: 'open', label: 'Open' },
  { key: 'attended', label: 'Attended' },
  { key: 'resolved', label: 'Resolved' }
];

export default function WorksheetPage({
  dateFilter: dateFilterProp,
  hideDateFilter = false,
  embedded = false
}) {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [sellerFilter, setSellerFilter] = useState('');

  const [internalDateFilter, setInternalDateFilter] = useState({
    mode: 'single',
    single: new Date().toISOString().split('T')[0],
    from: '',
    to: ''
  });
  const dateFilter = useMemo(
    () => dateFilterProp ?? internalDateFilter,
    [dateFilterProp, internalDateFilter]
  );

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

  useEffect(() => {
    fetchStatistics();
  }, [dateFilter, sellerFilter]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if ((dateFilter.mode === 'single') && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      // mode 'all' or 'none' => no date params

      // Seller filter
      if (sellerFilter) {
        params.sellerId = sellerFilter;
      }

      const [statsResponse, summaryResponse] = await Promise.all([
        api.get('/orders/worksheet-statistics', { params }),
        api.get('/orders/worksheet-summary', { params })
      ]);

      setStatistics(statsResponse.data || []);
      setSummary(summaryResponse.data || null);
    } catch (err) {
      console.error('Error fetching worksheet statistics:', err);
      setError('Failed to load worksheet statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (numerator, denominator) => {
    const num = Number(numerator) || 0;
    const den = Number(denominator) || 0;
    if (den <= 0) return '0%';
    return `${((num / den) * 100).toFixed(1)}%`;
  };

  const tableData = useMemo(
    () => [...statistics].sort((a, b) => a.date.localeCompare(b.date)),
    [statistics]
  );

  const totalCount = useMemo(() => {
    return tableData.reduce((sum, row) => {
      let rowTotal = 0;
      CATEGORIES.forEach((category) => {
        const group = row[category.key] || {};
        if (category.key === 'inquiries') {
          rowTotal += group.total || 0;
        } else {
          rowTotal += (group.open || 0) + (group.attended || 0) + (group.resolved || 0);
        }
      });
      return sum + rowTotal;
    }, 0);
  }, [tableData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00'); // Parse as local date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    }).format(date);
  };

  const formatPstDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getCellValue = (row, categoryKey, statusKey) => {
    const value = row?.[categoryKey]?.[statusKey] || 0;
    return value > 0 ? value : '-';
  };

  const getTotalValue = (categoryKey, statusKey) => {
    const total = tableData.reduce((sum, row) => {
      return sum + (row?.[categoryKey]?.[statusKey] || 0);
    }, 0);
    return total > 0 ? total : '-';
  };

  const SummaryCard = ({ title, openCount, rate, leftColor, rightColor }) => {
    return (
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          minWidth: 260,
          p: '10px 12px',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          background: `linear-gradient(155deg, ${leftColor} 0%, ${leftColor} 48%, rgba(255,255,255,0.25) 49%, rgba(255,255,255,0.25) 51%, ${rightColor} 52%, ${rightColor} 100%)`
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, opacity: 0.95, mb: 0.25 }}>
          {title}
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch', pr: 2 }}>
          <Box sx={{ flex: 1, zIndex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {openCount}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, zIndex: 1, textAlign: 'right', pl: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', lineHeight: 1 }}>
              Rate
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
              {rate}
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={embedded ? {} : { p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Worksheet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Daily overview of cancellations, returns, INR & disputes, and inquiries. Dates shown in local time with PST reference.
          </Typography>
        </Box>
        <Chip
          icon={<ListAltIcon />}
          label={`${totalCount} Total Items`}
          color="primary"
          sx={{ fontSize: '1rem', px: 1, py: 2.5 }}
        />
      </Stack>

      {hideDateFilter && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          {/* Seller Filter */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="seller-filter-label-embedded">Seller</InputLabel>
            <Select
              labelId="seller-filter-label-embedded"
              value={sellerFilter}
              label="Seller"
              onChange={(e) => setSellerFilter(e.target.value)}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchStatistics}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      )}

      {!hideDateFilter && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="date-mode-label">Date Mode</InputLabel>
              <Select
                labelId="date-mode-label"
                value={dateFilter.mode}
                label="Date Mode"
                onChange={(e) => setInternalDateFilter(prev => ({ ...prev, mode: e.target.value }))}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="single">Single Day</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>

            {/* Seller Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="seller-filter-label">Seller</InputLabel>
              <Select
                labelId="seller-filter-label"
                value={sellerFilter}
                label="Seller"
                onChange={(e) => setSellerFilter(e.target.value)}
              >
                <MenuItem value="">All Sellers</MenuItem>
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.user?.username || s._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {dateFilter.mode === 'single' && (
              <TextField
                label="Date"
                type="date"
                value={dateFilter.single}
                onChange={(e) => setInternalDateFilter(prev => ({ ...prev, single: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            )}

            {dateFilter.mode === 'range' && (
              <>
                <TextField
                  label="From"
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setInternalDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="To"
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setInternalDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 200 }}
                />
              </>
            )}

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchStatistics}
              disabled={loading}
              size="small"
            >
              Refresh
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Summary Cards */}
      {summary && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <SummaryCard
            title="Cancellations"
            openCount={summary?.cancellations?.open ?? 0}
            rate={formatRate(summary?.cancellations?.total ?? 0, summary?.totalOrders ?? 0)}
            leftColor="#F57C00"
            rightColor="#E65100"
          />
          <SummaryCard
            title="Returns"
            openCount={summary?.returns?.open ?? 0}
            rate={formatRate(summary?.returns?.total ?? 0, summary?.totalOrders ?? 0)}
            leftColor="#1E88E5"
            rightColor="#0D47A1"
          />
          <SummaryCard
            title="INR"
            openCount={summary?.inr?.open ?? 0}
            rate={formatRate(summary?.inr?.total ?? 0, summary?.totalOrders ?? 0)}
            leftColor="#7B1FA2"
            rightColor="#4A148C"
          />
          <SummaryCard
            title="Disputes"
            openCount={summary?.disputes?.open ?? 0}
            rate={formatRate(summary?.disputes?.total ?? 0, summary?.totalOrders ?? 0)}
            leftColor="#C62828"
            rightColor="#6D1B1B"
          />
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 'bold',
                      bgcolor: 'primary.main',
                      color: 'white',
                      minWidth: 120,
                      position: 'sticky',
                      left: 0,
                      zIndex: 3
                    }}
                  >
                    Date
                  </TableCell>
                  {CATEGORIES.map((category) => (
                    <TableCell
                      key={category.key}
                      align="center"
                      colSpan={category.key === 'inquiries' ? 1 : STATUS_COLUMNS.length}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderLeft: '8px solid white'
                      }}
                    >
                      {category.label}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 'bold',
                      bgcolor: 'primary.dark',
                      color: 'white',
                      position: 'sticky',
                      left: 0,
                      zIndex: 3
                    }}
                  />
                  {CATEGORIES.map((category) => (
                    <React.Fragment key={category.key}>
                      {category.key === 'inquiries' ? (
                        <TableCell
                          key={`${category.key}-total`}
                          align="center"
                          sx={{
                            fontWeight: 'bold',
                            bgcolor: 'primary.dark',
                            color: 'white',
                            fontSize: '0.75rem',
                            borderLeft: '8px solid white'
                          }}
                        >
                          Total
                        </TableCell>
                      ) : (
                        STATUS_COLUMNS.map((status, index) => (
                          <TableCell
                            key={`${category.key}-${status.key}`}
                            align="center"
                            sx={{
                              fontWeight: 'bold',
                              bgcolor: 'primary.dark',
                              color: 'white',
                              fontSize: '0.75rem',
                              borderLeft: index === 0 ? '8px solid white' : 'none'
                            }}
                          >
                            {status.label}
                          </TableCell>
                        ))
                      )}
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={1 + (3 * 3) + 1} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No worksheet data found for the selected date range.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {tableData.map((row) => (
                      <TableRow key={row.date} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell
                          sx={{
                            fontWeight: 'medium',
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'background.paper',
                            zIndex: 1
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {formatDate(row.date)}
                            </Typography>
                            {row.pstDate && row.pstDate !== row.date && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                PST: {formatPstDate(row.pstDate)}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        {CATEGORIES.map((category) => (
                          <React.Fragment key={`${row.date}-${category.key}`}>
                            {category.key === 'inquiries' ? (
                              <TableCell
                                key={`${row.date}-${category.key}-total`}
                                align="center"
                                sx={{
                                  borderLeft: '8px solid grey.300',
                                  color: (row?.inquiries?.total || 0) > 0 ? 'text.primary' : 'text.secondary'
                                }}
                              >
                                {(row?.inquiries?.total || 0) > 0 ? row.inquiries.total : '-'}
                              </TableCell>
                            ) : (
                              STATUS_COLUMNS.map((status, index) => (
                                <TableCell
                                  key={`${row.date}-${category.key}-${status.key}`}
                                  align="center"
                                  sx={{
                                    borderLeft: index === 0 ? '8px solid' : 'none',
                                    borderColor: index === 0 ? 'grey.300' : 'transparent',
                                    color: getCellValue(row, category.key, status.key) === '-' ? 'text.secondary' : 'text.primary'
                                  }}
                                >
                                  {getCellValue(row, category.key, status.key)}
                                </TableCell>
                              ))
                            )}
                          </React.Fragment>
                        ))}
                      </TableRow>
                    ))}

                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell
                        sx={{
                          fontWeight: 'bold',
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'grey.100',
                          zIndex: 1
                        }}
                      >
                        TOTAL
                      </TableCell>
                      {CATEGORIES.map((category) => (
                        <React.Fragment key={`total-${category.key}`}>
                          {category.key === 'inquiries' ? (
                            <TableCell
                              key={`total-${category.key}-total`}
                              align="center"
                              sx={{
                                fontWeight: 'bold',
                                borderLeft: '8px solid grey.300',
                                bgcolor: 'grey.200'
                              }}
                            >
                              {(() => {
                                const total = tableData.reduce((sum, row) => sum + (row?.inquiries?.total || 0), 0);
                                return total > 0 ? total : '-';
                              })()}
                            </TableCell>
                          ) : (
                            STATUS_COLUMNS.map((status, index) => (
                              <TableCell
                                key={`total-${category.key}-${status.key}`}
                                align="center"
                                sx={{
                                  fontWeight: 'bold',
                                  borderLeft: index === 0 ? '8px solid' : 'none',
                                  borderColor: index === 0 ? 'grey.300' : 'transparent',
                                  bgcolor: 'grey.200'
                                }}
                              >
                                {getTotalValue(category.key, status.key)}
                              </TableCell>
                            ))
                          )}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
