import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import InsightsIcon from '@mui/icons-material/Insights';
import RefreshIcon from '@mui/icons-material/Refresh';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { yellowFilledButtonSx } from '../../theme/tableStyles.js';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';

const getPTDate = (offsetDays = 0) => {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(date);
};

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today', days: 0 },
  { value: '7', label: '7 Days', days: 6 },
  { value: '30', label: '30 Days', days: 29 },
  { value: 'custom', label: 'Custom' },
];

const MARKETPLACES = ['US', 'UK', 'AU', 'Canada'];

const statusMeta = {
  onTrack: { label: 'On Track', color: '#1b7f3a', bg: '#e8f5e9', Icon: TaskAltIcon },
  behind: { label: 'Behind', color: '#a05a00', bg: '#fff4de', Icon: WarningAmberIcon },
  critical: { label: 'Critical', color: '#b3261e', bg: '#fde8e8', Icon: ErrorOutlineIcon },
};

function QuotaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <Paper elevation={6} sx={{ p: 1.5, borderRadius: 1.5, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, maxWidth: 420 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: BRAND_DARK }}>
        {row.userName}
      </Typography>
      <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.58), fontWeight: 700 }}>
        {row.successfulListings.toLocaleString()} / {row.targetQuantity.toLocaleString()} listings • {row.completionPercent}%
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 1 }}>
        {row.assignments.map((assignment) => (
          <Box key={assignment.targetId} sx={{ borderTop: `1px solid ${alpha(BRAND_DARK, 0.08)}`, pt: 0.75 }}>
            <Typography variant="caption" fontWeight={800} sx={{ color: BRAND_DARK, display: 'block' }}>
              {assignment.sellerName} / {assignment.marketplace} / {assignment.categoryName}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.58), display: 'block' }}>
              {assignment.rangeName} • {assignment.successfulListings.toLocaleString()} / {assignment.targetQuantity.toLocaleString()} • {assignment.completionPercent}%
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default function UserListingPerformancePage() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRange, setSelectedRange] = useState(null);
  const [rangeMode, setRangeMode] = useState('today');
  const [startDate, setStartDate] = useState(() => getPTDate());
  const [endDate, setEndDate] = useState(() => getPTDate());
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const inputSx = {
    '& label.Mui-focused': { color: `${BRAND_YELLOW_DARK} !important` },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '&:hover fieldset': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
      '&.Mui-focused fieldset': { borderColor: `${BRAND_YELLOW_DARK} !important` },
    },
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    const option = RANGE_OPTIONS.find((item) => item.value === rangeMode);
    if (!option || option.value === 'custom') return;
    setStartDate(getPTDate(-option.days));
    setEndDate(getPTDate());
  }, [rangeMode]);

  useEffect(() => {
    fetchPerformance();
  }, [selectedUser, selectedSeller, selectedMarketplace, selectedCategory, selectedRange, startDate, endDate]);

  const loadOptions = async () => {
    try {
      const [usersRes, sellersRes, categoriesRes, rangesRes] = await Promise.all([
        api.get('/users'),
        api.get('/sellers/all'),
        api.get('/asin-list-categories'),
        api.get('/asin-list-ranges', { params: { all: true } }),
      ]);
      setUsers((usersRes.data || []).filter((user) => user.role !== 'seller'));
      setSellers(sellersRes.data || []);
      setCategories(categoriesRes.data || []);
      setRanges(rangesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load filters.');
    }
  };

  const fetchPerformance = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        startDate,
        endDate,
      };
      if (selectedUser?._id) params.userId = selectedUser._id;
      if (selectedSeller?._id) params.sellerId = selectedSeller._id;
      if (selectedMarketplace) params.marketplace = selectedMarketplace;
      if (selectedCategory?._id) params.categoryId = selectedCategory._id;
      if (selectedRange?._id) params.rangeId = selectedRange._id;

      const { data } = await api.get('/user-category-targets/performance', { params });
      setPerformance(data);
    } catch (err) {
      setPerformance(null);
      setError(err.response?.data?.error || 'Failed to load listing performance.');
    } finally {
      setLoading(false);
    }
  };

  const getUserLabel = (user) => {
    if (!user) return '';
    return user.email ? `${user.username} (${user.email})` : user.username;
  };

  const getSellerLabel = (seller) => seller?.user?.username || seller?.user?.email || seller?.storeName || seller?._id || '';
  const getCategoryLabel = (category) => category?.name || '';
  const getRangeLabel = (range) => range?.name || '';

  const filteredRanges = selectedCategory
    ? ranges.filter((range) => String(range.categoryId?._id || range.categoryId) === selectedCategory._id)
    : ranges;

  const summary = performance?.summary || {};
  const cards = performance?.cards || [];

  const metricCards = useMemo(() => ([
    { label: 'Total Successful Listings', value: summary.totalSuccessfulListings || 0, helper: `${summary.totalTargetQuantity || 0} target listings` },
    { label: 'Average Quota Fill', value: `${summary.averageCompletionPercent || 0}%`, helper: 'Across selected targets' },
    { label: 'On Track', value: summary.onTrack || 0, helper: '95% or above', tone: 'success' },
    { label: 'Behind', value: summary.behind || 0, helper: '60% to 94%', tone: 'warning' },
    { label: 'Critical', value: summary.critical || 0, helper: 'Less than 60%', tone: 'error' },
    { label: 'Total Missed', value: summary.totalMissedListings || 0, helper: 'Items not listed' },
  ]), [summary]);

  const userQuotaRows = useMemo(() => {
    const userMap = new Map();

    cards.forEach((card) => {
      const userId = card.user?._id || card.user?.username || 'unknown';
      const userName = card.user?.username || 'Unknown User';
      const existing = userMap.get(userId) || {
        userId,
        userName,
        targetQuantity: 0,
        successfulListings: 0,
        assignments: [],
      };

      existing.targetQuantity += card.targetQuantity || 0;
      existing.successfulListings += card.successfulListings || 0;
      existing.assignments.push({
        targetId: card.targetId,
        sellerName: getSellerLabel(card.seller) || 'Unknown Seller',
        marketplace: card.marketplace || '-',
        categoryName: card.category?.name || 'Unknown Category',
        rangeName: card.range?.name ? `Range: ${card.range.name}` : 'Range: All ranges',
        targetQuantity: card.targetQuantity || 0,
        successfulListings: card.successfulListings || 0,
        completionPercent: card.completionPercent || 0,
      });

      userMap.set(userId, existing);
    });

    return Array.from(userMap.values())
      .map((row) => ({
        ...row,
        completionPercent: row.targetQuantity > 0
          ? Math.round((row.successfulListings / row.targetQuantity) * 100)
          : 0,
      }))
      .sort((a, b) => b.completionPercent - a.completionPercent || b.successfulListings - a.successfulListings);
  }, [cards]);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 5, backgroundColor: theme.palette.background.paper, minHeight: '100vh' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ pt: 2.5, mb: 3, flexWrap: 'wrap' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: BRAND_DARK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${alpha(BRAND_DARK, 0.24)}`,
            }}
          >
            <InsightsIcon sx={{ color: BRAND_YELLOW, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK }}>
              Listing Performance
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 500 }}>
              PDT target comparison by user, seller, and category
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
          disabled={loading}
          onClick={fetchPerformance}
          sx={yellowFilledButtonSx}
        >
          Refresh
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }}>
        <Stack spacing={2}>
          <ToggleButtonGroup
            value={rangeMode}
            exclusive
            onChange={(_, value) => value && setRangeMode(value)}
            size="small"
            sx={{ flexWrap: 'wrap' }}
          >
            {RANGE_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            <TextField
              label="Start Date (PDT)"
              type="date"
              value={startDate}
              onChange={(event) => {
                setRangeMode('custom');
                setStartDate(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 190, ...inputSx }}
            />
            <TextField
              label="End Date (PDT)"
              type="date"
              value={endDate}
              onChange={(event) => {
                setRangeMode('custom');
                setEndDate(event.target.value);
              }}
              InputLabelProps={{ shrink: true }}
              InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 190, ...inputSx }}
            />
            <Autocomplete
              options={users}
              getOptionLabel={getUserLabel}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              sx={{ minWidth: 240, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="All User Names" sx={inputSx} />}
            />
            <Autocomplete
              options={sellers}
              getOptionLabel={getSellerLabel}
              value={selectedSeller}
              onChange={(_, value) => setSelectedSeller(value)}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              sx={{ minWidth: 220, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="All Sellers" sx={inputSx} />}
            />
            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel sx={{ '&.Mui-focused': { color: BRAND_YELLOW_DARK } }}>All Marketplaces</InputLabel>
              <Select
                value={selectedMarketplace}
                label="All Marketplaces"
                onChange={(event) => setSelectedMarketplace(event.target.value)}
                sx={{
                  borderRadius: 1.5,
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND_YELLOW_DARK} !important` },
                }}
              >
                <MenuItem value="">All Marketplaces</MenuItem>
                {MARKETPLACES.map((marketplace) => (
                  <MenuItem key={marketplace} value={marketplace}>{marketplace}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              options={categories}
              getOptionLabel={getCategoryLabel}
              value={selectedCategory}
              onChange={(_, value) => {
                setSelectedCategory(value);
                setSelectedRange(null);
              }}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              sx={{ minWidth: 240, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="All Categories" sx={inputSx} />}
            />
            <Autocomplete
              options={filteredRanges}
              getOptionLabel={(range) => {
                const categoryName = range.categoryName ? `${range.categoryName} / ` : '';
                return `${categoryName}${getRangeLabel(range)}`;
              }}
              value={selectedRange}
              onChange={(_, value) => setSelectedRange(value)}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              sx={{ minWidth: 240, flex: 1 }}
              renderInput={(params) => <TextField {...params} label="All Ranges" sx={inputSx} />}
            />
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metricCards.map((metric) => (
          <Grid item xs={12} sm={6} md={4} xl={2} key={metric.label}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }}>
              <CardContent>
                <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.55), fontWeight: 700, textTransform: 'uppercase' }}>
                  {metric.label}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: metric.tone === 'error' ? '#b3261e' : metric.tone === 'warning' ? '#a05a00' : BRAND_DARK, mt: 0.5 }}>
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5), mt: 0.5 }}>
                  {metric.helper}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!loading && userQuotaRows.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: BRAND_DARK }}>
                Quota Utilization per Lister
              </Typography>
              <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.52), fontWeight: 600 }}>
                Total successful listings against desired quantity across selected marketplaces, sellers, categories, and ranges
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ width: '100%', height: Math.max(220, userQuotaRows.length * 54 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={userQuotaRows}
                layout="vertical"
                margin={{ top: 8, right: 76, bottom: 8, left: 24 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="userName"
                  width={120}
                  tick={{ fill: BRAND_DARK, fontSize: 13, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip content={<QuotaTooltip />} cursor={{ fill: alpha(BRAND_YELLOW, 0.08) }} />
                <Bar dataKey="completionPercent" radius={[0, 7, 7, 0]} barSize={18} background={{ fill: alpha(BRAND_DARK, 0.08), radius: 7 }}>
                  {userQuotaRows.map((row) => {
                    const color = row.completionPercent >= 95
                      ? statusMeta.onTrack.color
                      : row.completionPercent >= 60
                        ? statusMeta.behind.color
                        : statusMeta.critical.color;
                    return <Cell key={row.userId} fill={color} />;
                  })}
                  <LabelList
                    dataKey={(row) => `${row.completionPercent}%  ${row.successfulListings.toLocaleString()}/${row.targetQuantity.toLocaleString()}`}
                    position="right"
                    fill={BRAND_DARK}
                    fontSize={12}
                    fontWeight={800}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={30} sx={{ color: BRAND_YELLOW_DARK }} />
        </Box>
      ) : cards.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }}>
          <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.55) }}>
            No saved targets match the selected filters.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {cards.map((card) => {
            const meta = statusMeta[card.status] || statusMeta.critical;
            const Icon = meta.Icon;
            const progress = Math.min(card.completionPercent || 0, 100);
            return (
              <Grid item xs={12} md={6} xl={4} key={card.targetId}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: `1px solid ${alpha(meta.color, 0.28)}`, overflow: 'hidden' }}>
                  <Box sx={{ height: 5, backgroundColor: meta.color }} />
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ color: BRAND_DARK }}>
                          {card.user?.username || 'Unknown User'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.62) }}>
                          {getSellerLabel(card.seller)} / {card.marketplace || '-'} / {card.category?.name || 'Unknown Category'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 600 }}>
                          {card.range?.name ? `Range: ${card.range.name}` : 'Range: All ranges'}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 0.5, borderRadius: 1.5, backgroundColor: meta.bg, color: meta.color }}>
                        <Icon sx={{ fontSize: 17 }} />
                        <Typography variant="caption" fontWeight={800}>{meta.label}</Typography>
                      </Stack>
                    </Stack>

                    <Stack direction="row" spacing={3} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 700 }}>Successful</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK }}>{card.successfulListings.toLocaleString()}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 700 }}>Target</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK }}>{card.targetQuantity.toLocaleString()}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 700 }}>Missed</Typography>
                        <Typography variant="h5" fontWeight={800} sx={{ color: card.missedListings > 0 ? '#b3261e' : BRAND_DARK }}>{card.missedListings.toLocaleString()}</Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>
                          {card.completionPercent}% complete
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.55), fontWeight: 600 }}>
                          Daily target: {card.dailyDesiredQuantity.toLocaleString()}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 8,
                          backgroundColor: alpha(BRAND_DARK, 0.1),
                          '& .MuiLinearProgress-bar': { backgroundColor: meta.color },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
