import React, { useEffect, useState } from 'react';
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
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../lib/api';

const COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f',
  '#0288d1', '#388e3c', '#f57c00', '#7b1fa2', '#c62828',
  '#0097a7', '#558b2f', '#ff8f00', '#ad1457', '#37474f',
];

export default function CRPAnalyticsPage() {
  const [data, setData] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [groupBy, setGroupBy] = useState('category');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [excludeLowValue, setExcludeLowValue] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    mode: 'single',
    single: new Date().toISOString().split('T')[0],
    from: '',
    to: '',
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter, selectedSeller, excludeLowValue, groupBy]);

  const fetchSellers = async () => {
    try {
      const response = await api.get('/sellers/all');
      setSellers(response.data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const params = { groupBy, excludeLowValue };

      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      if (selectedSeller) params.sellerId = selectedSeller;

      const response = await api.get('/orders/crp-analytics', { params });
      const results = response.data || [];

      const total = results.reduce((sum, r) => sum + r.count, 0);
      const enriched = results.map(r => ({
        ...r,
        percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0',
      }));

      setData(enriched);
    } catch (err) {
      console.error('Error fetching CRP analytics:', err);
      setError('Failed to load CRP analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalOrders = data.reduce((sum, r) => sum + r.count, 0);

  const groupByLabel = { category: 'Category', range: 'Range', product: 'Product' }[groupBy];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            CRP Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Orders grouped by Category, Range, or Product assignment (PST timezone).
          </Typography>
        </Box>
        <Chip
          icon={<BarChartIcon />}
          label={`${totalOrders} Total Orders`}
          color="primary"
          sx={{ fontSize: '1rem', px: 1, py: 2.5 }}
        />
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          {/* Date Mode */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Mode</InputLabel>
            <Select
              value={dateFilter.mode}
              label="Date Mode"
              onChange={(e) => setDateFilter(prev => ({ ...prev, mode: e.target.value }))}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="single">Single Day</MenuItem>
              <MenuItem value="range">Date Range</MenuItem>
            </Select>
          </FormControl>

          {dateFilter.mode === 'single' && (
            <TextField
              label="Date"
              type="date"
              value={dateFilter.single}
              onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
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
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="To"
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
              />
            </>
          )}

          {/* Seller */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Seller</InputLabel>
            <Select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              label="Seller"
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || 'Unknown'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Group By */}
          <ToggleButtonGroup
            value={groupBy}
            exclusive
            onChange={(_, val) => { if (val) setGroupBy(val); }}
            size="small"
          >
            <ToggleButton value="category">Category</ToggleButton>
            <ToggleButton value="range">Range</ToggleButton>
            <ToggleButton value="product">Product</ToggleButton>
          </ToggleButtonGroup>

          {/* Exclude Low Value */}
          <FormControlLabel
            control={
              <Switch
                checked={excludeLowValue}
                onChange={(e) => setExcludeLowValue(e.target.checked)}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                Exclude &lt; $3 Orders
              </Typography>
            }
            sx={{ mx: 1 }}
          />

          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={fetchAnalytics}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data.length === 0 && !error && (
        <Alert severity="info">No orders found for the selected filters.</Alert>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Bar Chart */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Orders by {groupByLabel}
            </Typography>
            <ResponsiveContainer width="100%" height={Math.max(300, data.length * 36)}>
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 5, right: 30, left: 24, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, name) => [value, 'Orders']}
                />
                <Bar dataKey="count" name="Orders" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={entry.id ?? index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* Pie Chart */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Share by {groupByLabel}
            </Typography>
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={140}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.id ?? index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Orders']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* Summary Table */}
          <Paper>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
              Summary
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>{groupByLabel}</strong></TableCell>
                    <TableCell align="right"><strong>Orders</strong></TableCell>
                    <TableCell align="right"><strong>Share %</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={row.id ?? index} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: COLORS[index % COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2">{row.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      <TableCell align="right">{row.percentage}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="right"><strong>{totalOrders}</strong></TableCell>
                    <TableCell align="right"><strong>100%</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
