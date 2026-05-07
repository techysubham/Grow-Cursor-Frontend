import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Breadcrumbs,
  Chip,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Stack,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  LinearProgress,
  Fade,
  Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CloseIcon from '@mui/icons-material/Close';
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
  Label,
  LabelList,
} from 'recharts';
import api from '../../lib/api';
import CRPAnalyticsSkeleton from '../../components/skeletons/CRPAnalyticsSkeleton';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { yellowOutlinedButtonSx } from '../../theme/tableStyles.js';

const COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f',
  '#0288d1', '#388e3c', '#f57c00', '#7b1fa2', '#c62828',
  '#0097a7', '#558b2f', '#ff8f00', '#ad1457', '#37474f',
  '#4e342e', '#00695c', '#1565c0', '#e65100', '#4a148c',
];

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getDefaultSingleDay() {
  return formatInputDate(addDays(new Date(), -1));
}

// ── Donut centre label ────────────────────────────────────────────────────────
const DonutCenter = ({ viewBox, total }) => {
  const { cx, cy } = viewBox || {};
  if (cx == null) return null;
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 22, fontWeight: 700, fill: '#1a1a1a' }}>
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 11, fill: '#888' }}>
        orders
      </text>
    </g>
  );
};

// ── Custom bar tooltip ────────────────────────────────────────────────────────
const BarTooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Paper elevation={3} sx={{ p: 1.5, minWidth: 160 }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{d.name}</Typography>
      <Typography variant="body2" color="text.secondary">{d.count.toLocaleString()} orders</Typography>
      <Typography variant="body2" color="primary">{d.percentage}% of total</Typography>
    </Paper>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = '#1976d2' }) {
  return (
    <SectionCard
      sx={{
        flex: '1 1 0',
        minWidth: 150,
        p: 1.75,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          mt: 0.25,
          width: 36, height: 36, borderRadius: '10px',
          bgcolor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          opacity: 0.9,
          color: '#fff',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>{label}</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.3, fontSize: '1.1rem' }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.2, display: 'block' }}>{sub}</Typography>}
      </Box>
    </SectionCard>
  );
}

export default function CRPAnalyticsPage() {
  const [data, setData] = useState([]);
  const [ticketTiers, setTicketTiers] = useState({ low: 0, mid: 0, high: 0, extra_high: 0 });
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drill-down state: array of { level:'category'|'range'|'product', id, name }
  const [drillPath, setDrillPath] = useState([]);
  const [drillData, setDrillData] = useState([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const drillRef = useRef(null);

  const [groupBy, setGroupBy] = useState('category');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedMarketplace, setSelectedMarketplace] = useState('');
  const [excludeClient, setExcludeClient] = useState(true);
  const [excludeLowValue, setExcludeLowValue] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => ({
    mode: 'single',
    single: getDefaultSingleDay(),
    from: '',
    to: '',
  }));

  useEffect(() => { fetchSellers(); }, []);
  useEffect(() => { fetchAnalytics(); }, [dateFilter, selectedSeller, selectedMarketplace, excludeClient, excludeLowValue, groupBy]);

  // Reset drill-down whenever top-level filters change
  useEffect(() => { setDrillPath([]); setDrillData([]); }, [dateFilter, selectedSeller, selectedMarketplace, excludeClient, excludeLowValue, groupBy]);

  const fetchSellers = async () => {
    try {
      const res = await api.get('/sellers/all');
      setSellers(res.data || []);
    } catch (e) {
      console.error('Error fetching sellers:', e);
    }
  };

  const buildCommonParams = useCallback(() => {
    const params = { excludeClient, excludeLowValue };
    if (dateFilter.mode === 'single' && dateFilter.single) {
      params.startDate = params.endDate = dateFilter.single;
    } else if (dateFilter.mode === 'range') {
      if (dateFilter.from) params.startDate = dateFilter.from;
      if (dateFilter.to) params.endDate = dateFilter.to;
    }
    if (selectedSeller) params.sellerId = selectedSeller;
    if (selectedMarketplace) params.marketplace = selectedMarketplace;
    return params;
  }, [dateFilter, selectedSeller, selectedMarketplace, excludeClient, excludeLowValue]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { ...buildCommonParams(), groupBy };
      const res = await api.get('/orders/crp-analytics', { params });
      const payload = res.data || {};
      const results = payload.items ?? [];
      const tiers = payload.ticketTiers ?? { low: 0, mid: 0, high: 0, extra_high: 0 };
      const total = results.reduce((s, r) => s + r.count, 0);
      setData(results.map(r => ({
        ...r,
        percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0',
      })));
      setTicketTiers(tiers);
    } catch (e) {
      console.error('Error fetching CRP analytics:', e);
      setError('Failed to load CRP analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Drill into a bar entry. nextLevel = what to group by next, item = the clicked entry.
  const handleBarClick = useCallback(async (item) => {
    if (!item || !item.id) return; // can't drill into Unassigned

    // Determine which level this click represents based on current groupBy
    const levelMap = { category: 'range', range: 'product' };
    const nextGroupBy = levelMap[groupBy];
    if (!nextGroupBy) return; // already at product level, nothing to drill

    const clickedLevel = groupBy; // 'category' or 'range'
    const newPath = [{ level: clickedLevel, id: item.id, name: item.name, groupBy: nextGroupBy }];

    // If we already have a drill path, replace the last entry if same level, otherwise append
    const existingCategoryStep = drillPath.find(s => s.level === 'category');
    if (clickedLevel === 'category') {
      setDrillPath(newPath);
    } else if (clickedLevel === 'range' && existingCategoryStep) {
      setDrillPath([existingCategoryStep, ...newPath]);
    } else {
      setDrillPath(newPath);
    }

    await fetchDrillData(newPath, nextGroupBy);
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }, [groupBy, drillPath, buildCommonParams]);

  const handleDrillRangeClick = useCallback(async (rangeItem) => {
    if (!rangeItem || !rangeItem.id) return;
    const categoryStep = drillPath.find(s => s.level === 'category');
    const rangeStep = { level: 'range', id: rangeItem.id, name: rangeItem.name, groupBy: 'product' };
    const newPath = categoryStep ? [categoryStep, rangeStep] : [rangeStep];
    setDrillPath(newPath);
    await fetchDrillData(newPath, 'product');
  }, [drillPath, buildCommonParams]);

  const fetchDrillData = async (path, nextGroupBy) => {
    try {
      setDrillLoading(true);
      const params = { ...buildCommonParams(), groupBy: nextGroupBy };
      // Apply all path filters
      for (const step of path) {
        if (step.level === 'category') params.categoryId = step.id;
        if (step.level === 'range') params.rangeId = step.id;
      }
      const res = await api.get('/orders/crp-analytics', { params });
      const results = res.data?.items ?? [];
      const total = results.reduce((s, r) => s + r.count, 0);
      setDrillData(results.map(r => ({
        ...r,
        percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0',
      })));
    } catch (e) {
      console.error('Error fetching drill-down data:', e);
    } finally {
      setDrillLoading(false);
    }
  };

  // Navigate breadcrumb: clicking a breadcrumb step trims the path and re-fetches
  const handleBreadcrumbClick = useCallback(async (stepIndex) => {
    if (stepIndex < 0) {
      setDrillPath([]);
      setDrillData([]);
      return;
    }
    const newPath = drillPath.slice(0, stepIndex + 1);
    setDrillPath(newPath);
    const lastStep = newPath[newPath.length - 1];
    await fetchDrillData(newPath, lastStep.groupBy);
  }, [drillPath, buildCommonParams]);

  // Derived stats
  const totalOrders = data.reduce((s, r) => s + r.count, 0);
  const unassigned = data.find(d => d.name === 'Unassigned');
  const unassignedCount = unassigned?.count ?? 0;
  const assignedCount = totalOrders - unassignedCount;
  const assignedPct = totalOrders > 0 ? ((assignedCount / totalOrders) * 100).toFixed(1) : '0.0';
  const unassignedPct = totalOrders > 0 ? ((unassignedCount / totalOrders) * 100).toFixed(1) : '0.0';
  const topAssigned = data.filter(d => d.name !== 'Unassigned')[0];
  const groupByLabel = { category: 'Category', range: 'Range', product: 'Product' }[groupBy];
  const barHeight = Math.max(240, data.length * 34);

  // Drill-down derived
  const drillTotalOrders = drillData.reduce((s, r) => s + r.count, 0);
  const drillBarHeight = Math.max(180, drillData.length * 34);
  const drillLevelLabel = drillPath.length > 0
    ? { range: 'Range', product: 'Product' }[drillPath[drillPath.length - 1].groupBy] ?? ''
    : '';

  // Clickable only when groupBy is category or range and we can drill further
  const canDrillDown = groupBy === 'category' || groupBy === 'range';

  if (loading && data.length === 0) return <CRPAnalyticsSkeleton />;

  return (
    <Fade in timeout={600}>
    <AdminPageShell>
      {/* ── Page header + inline filters ────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', xl: 'row' }} alignItems={{ xl: 'flex-start' }}
        justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <PageHeader
          title="Categorized Order Analytics"
          subtitle={`Orders grouped by ${groupByLabel.toLowerCase()} assignment · PST timezone`}
          sx={{ pt: 0, pb: 0, flexShrink: 0 }}
        />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Date Mode</InputLabel>
            <Select value={dateFilter.mode} label="Date Mode"
              onChange={(e) => setDateFilter((prev) => ({
                ...prev,
                mode: e.target.value,
                single: e.target.value === 'single' && !prev.single ? getDefaultSingleDay() : prev.single,
              }))}>
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="single">Single Day</MenuItem>
              <MenuItem value="range">Date Range</MenuItem>
            </Select>
          </FormControl>

          {dateFilter.mode === 'single' && (
            <TextField label="Date" type="date" size="small"
              value={dateFilter.single}
              onChange={(e) => setDateFilter(p => ({ ...p, single: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 158 }} />
          )}
          {dateFilter.mode === 'range' && (
            <>
              <TextField label="From" type="date" size="small"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(p => ({ ...p, from: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ width: 152 }} />
              <TextField label="To" type="date" size="small"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(p => ({ ...p, to: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ width: 152 }} />
            </>
          )}

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Seller</InputLabel>
            <Select value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)} label="Seller">
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map(s => (
                <MenuItem key={s._id} value={s._id}>{s.user?.username || 'Unknown'}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              label="Marketplace"
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value="EBAY_US">EBAY_US</MenuItem>
              <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
              <MenuItem value="EBAY_ENCA">EBAY_CA</MenuItem>
              <MenuItem value="EBAY_GB">EBAY_GB</MenuItem>
            </Select>
          </FormControl>

          <ToggleButtonGroup value={groupBy} exclusive size="small"
            onChange={(_, v) => { if (v) setGroupBy(v); }}
            sx={{
              '& .MuiToggleButton-root': {
                '&:hover': { backgroundColor: 'rgba(245,200,66,0.12)', borderColor: '#f0b800' },
              },
              '& .MuiToggleButton-root.Mui-selected': {
                backgroundColor: '#f5c842',
                color: '#1a1a2e',
                fontWeight: 700,
                '&:hover': { backgroundColor: '#f0b800' },
              },
            }}
          >
            <ToggleButton value="category">Category</ToggleButton>
            <ToggleButton value="range">Range</ToggleButton>
            <ToggleButton value="product">Product</ToggleButton>
          </ToggleButtonGroup>

          <FormControlLabel
            control={<Switch checked={excludeClient} color="primary"
              onChange={(e) => setExcludeClient(e.target.checked)} />}
            label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Exclude Client</Typography>}
            sx={{ m: 0, px: 1.5, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxSizing: 'border-box' }}
          />

          <FormControlLabel
            control={<Switch checked={excludeLowValue} color="primary"
              onChange={(e) => setExcludeLowValue(e.target.checked)} />}
            label={<Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>Excl. &lt;$3</Typography>}
            sx={{ m: 0, px: 1.5, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxSizing: 'border-box' }}
          />

          <Button variant="outlined" size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchAnalytics} disabled={loading} sx={{ ...yellowOutlinedButtonSx, height: 40 }}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data.length === 0 && !error && (
        <Alert severity="info">No orders found for the selected filters.</Alert>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* ── Stat cards ────────────────────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <StatCard
              icon={<TrendingUpIcon sx={{ fontSize: 19 }} />}
              label="Total Orders"
              value={totalOrders.toLocaleString()}
              color="#1976d2"
            />
            <StatCard
              icon={<CheckCircleOutlineIcon sx={{ fontSize: 19 }} />}
              label="Assigned"
              value={`${assignedPct}%`}
              sub={`${assignedCount.toLocaleString()} orders`}
              color="#2e7d32"
            />
            <StatCard
              icon={<HelpOutlineIcon sx={{ fontSize: 19 }} />}
              label="Unassigned"
              value={`${unassignedPct}%`}
              sub={`${unassignedCount.toLocaleString()} orders`}
              color="#d32f2f"
            />
            <StatCard
              icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 19 }} />}
              label={`Top ${groupByLabel}`}
              value={topAssigned?.name ?? '—'}
              sub={topAssigned ? `${topAssigned.count.toLocaleString()} orders · ${topAssigned.percentage}%` : ''}
              color="#ed6c02"
            />
          </Stack>

          {/* ── Ticket tier breakdown ─────────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <StatCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>$0–30</Typography>}
              label="Low Ticket"
              value={ticketTiers.low.toLocaleString()}
              sub="subtotal < $30"
              color="#0288d1"
            />
            <StatCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>$30–60</Typography>}
              label="Mid Ticket"
              value={ticketTiers.mid.toLocaleString()}
              sub="$30 – $59"
              color="#388e3c"
            />
            <StatCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>$60–100</Typography>}
              label="High Ticket"
              value={ticketTiers.high.toLocaleString()}
              sub="$60 – $99"
              color="#f57c00"
            />
            <StatCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>$100+</Typography>}
              label="Extra High Ticket"
              value={ticketTiers.extra_high.toLocaleString()}
              sub="subtotal ≥ $100"
              color="#7b1fa2"
            />
          </Stack>

          {/* ── Charts ────────────────────────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>

            {/* Left: Horizontal bar chart */}
            <SectionCard sx={{ flex: '3 1 0', minWidth: 0, p: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.25 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Orders by {groupByLabel}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sorted by volume · hover for details
                    {canDrillDown && ' · click a bar to drill down'}
                  </Typography>
                </Box>
              </Stack>
              <Box sx={{ mt: 2 }}>
                <ResponsiveContainer width="100%" height={barHeight}>
                  <BarChart
                    layout="vertical"
                    data={data}
                    margin={{ top: 2, right: 52, left: 8, bottom: 2 }}
                    onClick={(chartData) => {
                      if (canDrillDown && chartData?.activePayload?.[0]?.payload) {
                        handleBarClick(chartData.activePayload[0].payload);
                      }
                    }}
                    style={canDrillDown ? { cursor: 'pointer' } : undefined}
                  >
                    <XAxis type="number" allowDecimals={false}
                      tick={{ fontSize: 11, fill: '#999' }}
                      axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={155}
                      tick={{ fontSize: 11, fill: '#555' }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => v.length > 22 ? v.slice(0, 21) + '…' : v}
                    />
                    <Tooltip content={<BarTooltipContent />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {data.map((entry, i) => (
                        <Cell key={entry.id ?? i} fill={COLORS[i % COLORS.length]}
                          opacity={drillPath.length > 0 && drillPath[0].id === entry.id ? 1 : drillPath.length > 0 ? 0.45 : 1}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fontSize: 11, fill: '#555', fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </SectionCard>

            {/* Right: Donut + legend table */}
            <SectionCard sx={{
              flex: '2 1 0', minWidth: 280,
              p: 2,
              display: 'flex', flexDirection: 'column',
            }}>
              <Typography variant="subtitle1" fontWeight={700}>Share by {groupByLabel}</Typography>
              <Typography variant="caption" color="text.secondary">Proportional breakdown</Typography>

              {/* Donut */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                <PieChart width={200} height={200}>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    cx={100} cy={100}
                    innerRadius={58}
                    outerRadius={92}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={data.length > 1 ? 1.5 : 0}
                    onClick={canDrillDown ? (sliceData) => handleBarClick(sliceData) : undefined}
                    style={canDrillDown ? { cursor: 'pointer' } : undefined}
                  >
                    <Label content={<DonutCenter total={totalOrders} />} position="center" />
                    {data.map((entry, i) => (
                      <Cell key={entry.id ?? i} fill={COLORS[i % COLORS.length]}
                        opacity={drillPath.length > 0 && drillPath[0].id === entry.id ? 1 : drillPath.length > 0 ? 0.45 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, _n, p) => [
                      `${v.toLocaleString()} orders (${p.payload.percentage}%)`,
                      p.payload.name,
                    ]}
                  />
                </PieChart>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              {/* Scrollable legend table */}
              <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {data.map((entry, i) => (
                  <Box key={entry.id ?? i}
                    onClick={canDrillDown && entry.id ? () => handleBarClick(entry) : undefined}
                    sx={{
                      mb: 1.2,
                      cursor: canDrillDown && entry.id ? 'pointer' : 'default',
                      opacity: drillPath.length > 0 && drillPath[0].id === entry.id ? 1 : drillPath.length > 0 ? 0.45 : 1,
                      borderRadius: 1,
                      px: 0.5,
                      '&:hover': canDrillDown && entry.id ? { bgcolor: 'action.hover' } : {},
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.35 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: COLORS[i % COLORS.length], flexShrink: 0,
                      }} />
                      <Typography variant="caption" sx={{
                        flex: 1, fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.name}
                      </Typography>
                      <Typography variant="caption" fontWeight={700} sx={{ flexShrink: 0, minWidth: 33, textAlign: 'right' }}>
                        {entry.count.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
                        {entry.percentage}%
                      </Typography>
                      {canDrillDown && entry.id && (
                        <ArrowForwardIosIcon sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }} />
                      )}
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(parseFloat(entry.percentage), 100)}
                      sx={{
                        height: 3, borderRadius: 2,
                        bgcolor: 'grey.100',
                        ml: '14px',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: COLORS[i % COLORS.length],
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </SectionCard>

          </Stack>

          {/* ── Drill-down panel ─────────────────────────────────────────────── */}
          {drillPath.length > 0 && (
            <Box ref={drillRef} sx={{ mt: 3 }}>
              {/* Breadcrumb */}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Breadcrumbs separator="›" sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}>
                  <Link
                    component="button"
                    variant="body2"
                    underline="hover"
                    color="text.secondary"
                    onClick={() => handleBreadcrumbClick(-1)}
                    sx={{ cursor: 'pointer' }}
                  >
                    All {groupByLabel}s
                  </Link>
                  {drillPath.map((step, idx) => {
                    const isLast = idx === drillPath.length - 1;
                    return isLast ? (
                      <Typography key={idx} variant="body2" fontWeight={700} color="text.primary">
                        {step.name}
                      </Typography>
                    ) : (
                      <Link
                        key={idx}
                        component="button"
                        variant="body2"
                        underline="hover"
                        color="text.secondary"
                        onClick={() => handleBreadcrumbClick(idx)}
                        sx={{ cursor: 'pointer' }}
                      >
                        {step.name}
                      </Link>
                    );
                  })}
                </Breadcrumbs>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                  onClick={() => { setDrillPath([]); setDrillData([]); }}
                  sx={{ ...yellowOutlinedButtonSx, height: 32, fontSize: 12 }}
                >
                  Clear Drill-down
                </Button>
              </Stack>

              {drillLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : drillData.length === 0 ? (
                <Alert severity="info">No {drillLevelLabel.toLowerCase()} data found within this selection.</Alert>
              ) : (
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                  {/* Drill bar chart */}
                  <SectionCard sx={{ flex: '3 1 0', minWidth: 0, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {drillLevelLabel}s within "{drillPath[drillPath.length - 1].name}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {drillTotalOrders.toLocaleString()} orders
                      {drillPath[drillPath.length - 1].groupBy === 'range' && ' · click a bar to drill down to products'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <ResponsiveContainer width="100%" height={drillBarHeight}>
                        <BarChart
                          layout="vertical"
                          data={drillData}
                          margin={{ top: 2, right: 52, left: 8, bottom: 2 }}
                          onClick={(chartData) => {
                            if (drillPath[drillPath.length - 1].groupBy === 'range' && chartData?.activePayload?.[0]?.payload) {
                              handleDrillRangeClick(chartData.activePayload[0].payload);
                            }
                          }}
                          style={drillPath[drillPath.length - 1].groupBy === 'range' ? { cursor: 'pointer' } : undefined}
                        >
                          <XAxis type="number" allowDecimals={false}
                            tick={{ fontSize: 11, fill: '#999' }}
                            axisLine={false} tickLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={155}
                            tick={{ fontSize: 11, fill: '#555' }}
                            axisLine={false} tickLine={false}
                            tickFormatter={(v) => v.length > 22 ? v.slice(0, 21) + '…' : v}
                          />
                          <Tooltip content={<BarTooltipContent />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                            {drillData.map((entry, i) => (
                              <Cell key={entry.id ?? i} fill={COLORS[(i + 5) % COLORS.length]} />
                            ))}
                            <LabelList
                              dataKey="count"
                              position="right"
                              style={{ fontSize: 11, fill: '#555', fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </SectionCard>

                  {/* Drill legend / share panel */}
                  <SectionCard sx={{ flex: '2 1 0', minWidth: 260, p: 2, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Share by {drillLevelLabel}</Typography>
                    <Typography variant="caption" color="text.secondary">Proportional breakdown</Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                      <PieChart width={190} height={190}>
                        <Pie
                          data={drillData}
                          dataKey="count"
                          nameKey="name"
                          cx={95} cy={95}
                          innerRadius={52}
                          outerRadius={85}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={drillData.length > 1 ? 1.5 : 0}
                          onClick={drillPath[drillPath.length - 1].groupBy === 'range'
                            ? (sliceData) => handleDrillRangeClick(sliceData)
                            : undefined}
                          style={drillPath[drillPath.length - 1].groupBy === 'range' ? { cursor: 'pointer' } : undefined}
                        >
                          <Label content={<DonutCenter total={drillTotalOrders} />} position="center" />
                          {drillData.map((entry, i) => (
                            <Cell key={entry.id ?? i} fill={COLORS[(i + 5) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v, _n, p) => [
                            `${v.toLocaleString()} orders (${p.payload.percentage}%)`,
                            p.payload.name,
                          ]}
                        />
                      </PieChart>
                    </Box>

                    <Divider sx={{ mb: 1.5 }} />

                    <Box sx={{ overflowY: 'auto', flex: 1 }}>
                      {drillData.map((entry, i) => {
                        const isRange = drillPath[drillPath.length - 1].groupBy === 'range';
                        return (
                          <Box key={entry.id ?? i}
                            onClick={isRange && entry.id ? () => handleDrillRangeClick(entry) : undefined}
                            sx={{
                              mb: 1.2,
                              cursor: isRange && entry.id ? 'pointer' : 'default',
                              borderRadius: 1,
                              px: 0.5,
                              '&:hover': isRange && entry.id ? { bgcolor: 'action.hover' } : {},
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.35 }}>
                              <Box sx={{
                                width: 8, height: 8, borderRadius: '50%',
                                bgcolor: COLORS[(i + 5) % COLORS.length], flexShrink: 0,
                              }} />
                              <Typography variant="caption" sx={{
                                flex: 1, fontWeight: 500,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {entry.name}
                              </Typography>
                              <Typography variant="caption" fontWeight={700} sx={{ flexShrink: 0, minWidth: 33, textAlign: 'right' }}>
                                {entry.count.toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, minWidth: 38, textAlign: 'right' }}>
                                {entry.percentage}%
                              </Typography>
                              {isRange && entry.id && (
                                <ArrowForwardIosIcon sx={{ fontSize: 10, color: 'text.disabled', flexShrink: 0 }} />
                              )}
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(parseFloat(entry.percentage), 100)}
                              sx={{
                                height: 3, borderRadius: 2,
                                bgcolor: 'grey.100',
                                ml: '14px',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: COLORS[(i + 5) % COLORS.length],
                                  borderRadius: 2,
                                },
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </SectionCard>
                </Stack>
              )}
            </Box>
          )}
        </>
      )}
    </AdminPageShell>
    </Fade>
  );
}
