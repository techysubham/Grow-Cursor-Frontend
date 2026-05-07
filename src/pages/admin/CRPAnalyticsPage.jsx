import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Fade,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
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
  Cell,
  LabelList,
} from 'recharts';
import api from '../../lib/api';
import CRPAnalyticsSkeleton from '../../components/skeletons/CRPAnalyticsSkeleton';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { yellowOutlinedButtonSx } from '../../theme/tableStyles.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';

const T = dashboardSignatureTokens;

const COLORS = [
  '#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#b71c1c',
  '#00695c', '#1976d2', '#558b2f', '#f57f17', '#ad1457',
  '#0277bd', '#37474f', '#4e342e', '#1a237e', '#880e4f',
  '#004d40', '#bf360c', '#4a148c', '#1b5e20', '#0d47a1',
];

function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function getDefaultSingleDay() {
  return formatInputDate(addDays(new Date(), -1));
}

// â”€â”€ Tooltip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BarTooltipContent = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <Paper elevation={4} sx={{ p: 1.5, minWidth: 160, border: `1px solid ${alpha(BRAND_DARK, 0.08)}` }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: BRAND_DARK }}>{d.name}</Typography>
      <Typography variant="body2" color="text.secondary">{d.count.toLocaleString()} orders</Typography>
      <Typography variant="body2" sx={{ color: BRAND_YELLOW_DARK, fontWeight: 600 }}>{d.percentage}% of total</Typography>
    </Paper>
  );
};

// â”€â”€ Metric card using theme tones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MetricCard({ icon, label, value, sub, tone = 'info' }) {
  const t = T.tones[tone] || T.tones.info;
  return (
    <Box sx={{
      flex: '1 1 0', minWidth: 138, maxWidth: 240,
      p: '11px 14px',
      borderRadius: `${T.radius.card}px`,
      background: t.background,
      border: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center', gap: 1.25,
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '9px',
        bgcolor: t.color, color: '#fff', opacity: 0.9,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: t.color, fontWeight: 600, display: 'block', lineHeight: 1.2, opacity: 0.8 }}>
          {label}
        </Typography>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: t.color, lineHeight: 1.35, fontSize: '0.98rem' }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: t.color, opacity: 0.58, lineHeight: 1.1, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// â”€â”€ Section divider label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SectionLabel({ children }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
      <Typography variant="overline" sx={{
        color: alpha(BRAND_DARK, 0.42), fontWeight: 700,
        letterSpacing: 1.2, lineHeight: 1, whiteSpace: 'nowrap', fontSize: '0.67rem',
      }}>
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: alpha(BRAND_DARK, 0.08) }} />
    </Stack>
  );
}

export default function CRPAnalyticsPage() {
  const [data, setData] = useState([]);
  const [ticketTiers, setTicketTiers] = useState({ low: 0, mid: 0, high: 0, extra_high: 0 });
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  useEffect(() => { setDrillPath([]); setDrillData([]); }, [dateFilter, selectedSeller, selectedMarketplace, excludeClient, excludeLowValue, groupBy]);

  const fetchSellers = async () => {
    try {
      const res = await api.get('/sellers/all');
      setSellers(res.data || []);
    } catch (e) { console.error('Error fetching sellers:', e); }
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
      setData(results.map(r => ({ ...r, percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0' })));
      setTicketTiers(tiers);
    } catch (e) {
      console.error('Error fetching CRP analytics:', e);
      setError('Failed to load CRP analytics. Please try again.');
    } finally { setLoading(false); }
  };

  const handleBarClick = useCallback(async (item) => {
    if (!item || !item.id) return;
    const levelMap = { category: 'range', range: 'product' };
    const nextGroupBy = levelMap[groupBy];
    if (!nextGroupBy) return;
    const clickedLevel = groupBy;
    const newPath = [{ level: clickedLevel, id: item.id, name: item.name, groupBy: nextGroupBy }];
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
      for (const step of path) {
        if (step.level === 'category') params.categoryId = step.id;
        if (step.level === 'range') params.rangeId = step.id;
      }
      const res = await api.get('/orders/crp-analytics', { params });
      const results = res.data?.items ?? [];
      const total = results.reduce((s, r) => s + r.count, 0);
      setDrillData(results.map(r => ({ ...r, percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : '0.0' })));
    } catch (e) { console.error('Error fetching drill-down data:', e); }
    finally { setDrillLoading(false); }
  };

  const handleBreadcrumbClick = useCallback(async (stepIndex) => {
    if (stepIndex < 0) { setDrillPath([]); setDrillData([]); return; }
    const newPath = drillPath.slice(0, stepIndex + 1);
    setDrillPath(newPath);
    await fetchDrillData(newPath, newPath[newPath.length - 1].groupBy);
  }, [drillPath, buildCommonParams]);

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalOrders = data.reduce((s, r) => s + r.count, 0);
  const unassigned = data.find(d => d.name === 'Unassigned');
  const unassignedCount = unassigned?.count ?? 0;
  const assignedCount = totalOrders - unassignedCount;
  const assignedPct = totalOrders > 0 ? ((assignedCount / totalOrders) * 100).toFixed(1) : '0.0';
  const unassignedPct = totalOrders > 0 ? ((unassignedCount / totalOrders) * 100).toFixed(1) : '0.0';
  const topAssigned = data.filter(d => d.name !== 'Unassigned')[0];
  const groupByLabel = { category: 'Category', range: 'Range', product: 'Product' }[groupBy];
  const barHeight = Math.max(240, data.length * 34);
  const drillTotalOrders = drillData.reduce((s, r) => s + r.count, 0);
  const drillBarHeight = Math.max(180, drillData.length * 34);
  const drillLevelLabel = drillPath.length > 0
    ? ({ range: 'Range', product: 'Product' }[drillPath[drillPath.length - 1].groupBy] ?? '')
    : '';
  const canDrillDown = groupBy === 'category' || groupBy === 'range';

  // â”€â”€ Ranked list renderer (shared between main + drill panels) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderRankedList = (items, onClickItem, isClickable, colorOffset = 0, activePath = []) => (
    <Box sx={{ overflowY: 'auto', flex: 1 }}>
      {/* Column headers */}
      <Stack direction="row" alignItems="center" sx={{ pb: 0.75, mb: 0.25, borderBottom: `2px solid ${alpha(BRAND_DARK, 0.07)}` }}>
        <Typography variant="caption" sx={{ minWidth: 26, color: alpha(BRAND_DARK, 0.3), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.63rem' }}>#</Typography>
        <Typography variant="caption" sx={{ flex: 1, color: alpha(BRAND_DARK, 0.3), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.63rem' }}>Name</Typography>
        <Typography variant="caption" sx={{ minWidth: 44, textAlign: 'right', color: alpha(BRAND_DARK, 0.3), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.63rem' }}>Orders</Typography>
        <Typography variant="caption" sx={{ minWidth: 38, textAlign: 'right', color: alpha(BRAND_DARK, 0.3), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.63rem', mr: isClickable ? 1.5 : 0 }}>Share</Typography>
      </Stack>
      {items.map((entry, i) => {
        const ci = (i + colorOffset) % COLORS.length;
        const isActive = activePath.length > 0 && activePath[0].id === entry.id;
        const isDimmed = activePath.length > 0 && colorOffset === 0 && !isActive;
        return (
          <Box key={entry.id ?? i}
            onClick={isClickable && entry.id ? () => onClickItem(entry) : undefined}
            sx={{
              py: 0.9,
              borderBottom: `1px solid ${alpha(BRAND_DARK, 0.04)}`,
              cursor: isClickable && entry.id ? 'pointer' : 'default',
              opacity: isDimmed ? 0.35 : 1,
              borderRadius: 1,
              px: 0.25,
              transition: 'background 0.15s, opacity 0.15s',
              '&:hover': isClickable && entry.id ? { bgcolor: alpha(BRAND_YELLOW, 0.08) } : {},
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.4 }}>
              <Typography variant="caption" sx={{ minWidth: 26, color: i < 3 ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.28), fontWeight: 700, fontSize: '0.72rem' }}>
                {i + 1}
              </Typography>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[ci], flexShrink: 0 }} />
              <Typography variant="caption" sx={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: BRAND_DARK }}>
                {entry.name}
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ flexShrink: 0, minWidth: 44, textAlign: 'right', color: BRAND_DARK }}>
                {entry.count.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ flexShrink: 0, minWidth: 38, textAlign: 'right', color: alpha(BRAND_DARK, 0.45) }}>
                {entry.percentage}%
              </Typography>
              {isClickable && entry.id && (
                <ArrowForwardIosIcon sx={{ fontSize: 9, color: alpha(BRAND_DARK, 0.22), flexShrink: 0 }} />
              )}
            </Stack>
            <Box sx={{ pl: '26px' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(parseFloat(entry.percentage), 100)}
                sx={{
                  height: 3, borderRadius: 2,
                  bgcolor: alpha(COLORS[ci], 0.14),
                  '& .MuiLinearProgress-bar': { bgcolor: COLORS[ci], borderRadius: 2 },
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  if (loading && data.length === 0) return <CRPAnalyticsSkeleton />;

  return (
    <Fade in timeout={600}>
      <AdminPageShell>

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <PageHeader
          title="Categorized Order Analytics"
          subtitle={`Orders grouped by ${groupByLabel.toLowerCase()} · PST timezone`}
          sx={{ pt: 0, pb: 1.5 }}
        />

        {/* â”€â”€ Filter bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Box sx={{
          mb: 2.5, p: '10px 14px',
          borderRadius: `${T.radius.card}px`,
          background: alpha(BRAND_DARK, 0.03),
          border: `1px solid ${alpha(BRAND_DARK, 0.08)}`,
        }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 128 }}>
              <InputLabel>Date Mode</InputLabel>
              <Select value={dateFilter.mode} label="Date Mode"
                onChange={(e) => setDateFilter(prev => ({
                  ...prev, mode: e.target.value,
                  single: e.target.value === 'single' && !prev.single ? getDefaultSingleDay() : prev.single,
                }))}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="single">Single Day</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>
            {dateFilter.mode === 'single' && (
              <TextField label="Date" type="date" size="small" value={dateFilter.single}
                onChange={(e) => setDateFilter(p => ({ ...p, single: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ width: 156 }} />
            )}
            {dateFilter.mode === 'range' && (<>
              <TextField label="From" type="date" size="small" value={dateFilter.from}
                onChange={(e) => setDateFilter(p => ({ ...p, from: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
              <TextField label="To" type="date" size="small" value={dateFilter.to}
                onChange={(e) => setDateFilter(p => ({ ...p, to: e.target.value }))}
                InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
            </>)}

            <FormControl size="small" sx={{ minWidth: 158 }}>
              <InputLabel>Seller</InputLabel>
              <Select value={selectedSeller} label="Seller"
                onChange={(e) => setSelectedSeller(e.target.value)}>
                <MenuItem value="">All Sellers</MenuItem>
                {sellers.map(s => <MenuItem key={s._id} value={s._id}>{s.user?.username || 'Unknown'}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 158 }}>
              <InputLabel>Marketplace</InputLabel>
              <Select value={selectedMarketplace} label="Marketplace"
                onChange={(e) => setSelectedMarketplace(e.target.value)}>
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value="EBAY_US">EBAY_US</MenuItem>
                <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
                <MenuItem value="EBAY_ENCA">EBAY_CA</MenuItem>
                <MenuItem value="EBAY_GB">EBAY_GB</MenuItem>
              </Select>
            </FormControl>

            {/* Divider */}
            <Box sx={{ width: '1px', height: 26, bgcolor: alpha(BRAND_DARK, 0.1) }} />

            <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.38), fontWeight: 700, fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Group by
            </Typography>
            <ToggleButtonGroup value={groupBy} exclusive size="small" onChange={(_, v) => { if (v) setGroupBy(v); }}
              sx={{
                '& .MuiToggleButton-root': { px: 1.5, fontSize: '0.78rem', fontWeight: 500 },
                '& .MuiToggleButton-root.Mui-selected': { backgroundColor: BRAND_YELLOW, color: BRAND_DARK, fontWeight: 700, '&:hover': { backgroundColor: BRAND_YELLOW_DARK } },
              }}>
              <ToggleButton value="category">Category</ToggleButton>
              <ToggleButton value="range">Range</ToggleButton>
              <ToggleButton value="product">Product</ToggleButton>
            </ToggleButtonGroup>

            {/* Divider */}
            <Box sx={{ width: '1px', height: 26, bgcolor: alpha(BRAND_DARK, 0.1) }} />

            <FormControlLabel
              control={<Switch checked={excludeClient} size="small" color="primary" onChange={(e) => setExcludeClient(e.target.checked)} />}
              label={<Typography variant="caption" sx={{ fontWeight: 500, color: alpha(BRAND_DARK, 0.65) }}>Excl. Client</Typography>}
              sx={{ m: 0 }}
            />
            <FormControlLabel
              control={<Switch checked={excludeLowValue} size="small" color="primary" onChange={(e) => setExcludeLowValue(e.target.checked)} />}
              label={<Typography variant="caption" sx={{ fontWeight: 500, color: alpha(BRAND_DARK, 0.65) }}>Excl. &lt;$3</Typography>}
              sx={{ m: 0 }}
            />
            <Button variant="outlined" size="small"
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 15 }} />}
              onClick={fetchAnalytics} disabled={loading}
              sx={{ ...yellowOutlinedButtonSx, height: 36, ml: 'auto !important' }}>
              Refresh
            </Button>
          </Stack>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}
        {!loading && data.length === 0 && !error && <Alert severity="info">No orders found for the selected filters.</Alert>}

        {!loading && data.length > 0 && (<>

          {/* â”€â”€ CRP Overview cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionLabel>CRP Overview</SectionLabel>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <MetricCard icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} label="Total Orders"
              value={totalOrders.toLocaleString()}
              sub={dateFilter.mode === 'single' && dateFilter.single ? dateFilter.single : undefined}
              tone="info" />
            <MetricCard icon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />} label="Assigned"
              value={`${assignedPct}%`} sub={`${assignedCount.toLocaleString()} orders`} tone="success" />
            <MetricCard icon={<HelpOutlineIcon sx={{ fontSize: 18 }} />} label="Unassigned"
              value={`${unassignedPct}%`} sub={`${unassignedCount.toLocaleString()} orders`} tone="danger" />
            <MetricCard icon={<EmojiEventsOutlinedIcon sx={{ fontSize: 18 }} />} label={`Top ${groupByLabel}`}
              value={topAssigned?.name ?? '-'}
              sub={topAssigned ? `${topAssigned.count.toLocaleString()} · ${topAssigned.percentage}%` : ''}
              tone="warning" />
          </Stack>

          {/* â”€â”€ Order value band cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionLabel>Order Value Bands</SectionLabel>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
            <MetricCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: '0.63rem', lineHeight: 1 }}>$0-30</Typography>}
              label="Low Ticket" value={ticketTiers.low.toLocaleString()} sub="subtotal < $30" tone="shipping" />
            <MetricCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: '0.63rem', lineHeight: 1 }}>$30-60</Typography>}
              label="Mid Ticket" value={ticketTiers.mid.toLocaleString()} sub="$30-$59" tone="success" />
            <MetricCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: '0.63rem', lineHeight: 1 }}>$60-100</Typography>}
              label="High Ticket" value={ticketTiers.high.toLocaleString()} sub="$60-$99" tone="amazon" />
            <MetricCard
              icon={<Typography variant="caption" fontWeight={900} sx={{ color: '#fff', fontSize: '0.63rem', lineHeight: 1 }}>$100+</Typography>}
              label="Extra High Ticket" value={ticketTiers.extra_high.toLocaleString()} sub="subtotal >= $100" tone="danger" />
          </Stack>

          {/* â”€â”€ Main chart + ranking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <SectionLabel>
            {`Distribution by ${groupByLabel}${canDrillDown ? ' · click a bar or row to drill in' : ''}`}
          </SectionLabel>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mb: drillPath.length > 0 ? 2.5 : 0 }}>

            {/* Bar chart */}
            <SectionCard sx={{ flex: '3 1 0', minWidth: 0, p: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND_DARK }}>Orders by {groupByLabel}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>Sorted by volume</Typography>
              <ResponsiveContainer width="100%" height={barHeight}>
                <BarChart layout="vertical" data={data} margin={{ top: 2, right: 52, left: 8, bottom: 2 }}
                  onClick={(chart) => { if (canDrillDown && chart?.activePayload?.[0]?.payload) handleBarClick(chart.activePayload[0].payload); }}
                  style={canDrillDown ? { cursor: 'pointer' } : undefined}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.38) }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={155} tick={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.58) }}
                    axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 22 ? v.slice(0, 21) + '...' : v} />
                  <Tooltip content={<BarTooltipContent />} cursor={{ fill: alpha(BRAND_DARK, 0.04) }} />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={18}>
                    {data.map((entry, i) => (
                      <Cell key={entry.id ?? i} fill={COLORS[i % COLORS.length]}
                        opacity={drillPath.length > 0 && drillPath[0].id === entry.id ? 1 : drillPath.length > 0 ? 0.28 : 1} />
                    ))}
                    <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.52), fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Ranked list - replaces donut chart */}
            <SectionCard sx={{ flex: '2 1 0', minWidth: 260, p: 2, display: 'flex', flexDirection: 'column', maxHeight: barHeight + 56 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND_DARK }}>Ranking</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {data.length} {groupByLabel.toLowerCase()}s{canDrillDown ? ' · click to drill down' : ''}
              </Typography>
              {renderRankedList(data, handleBarClick, canDrillDown, 0, drillPath)}
            </SectionCard>

          </Stack>

          {/* â”€â”€ Drill-down panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {drillPath.length > 0 && (
            <Box ref={drillRef}>
              {/* Header bar */}
              <Box sx={{
                px: 2, py: 1.25,
                borderRadius: `${T.radius.card}px ${T.radius.card}px 0 0`,
                background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.86)} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 3, height: 20, borderRadius: 1, bgcolor: BRAND_YELLOW, flexShrink: 0 }} />
                  <Breadcrumbs separator=">" sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.25, color: alpha('#fff', 0.38) } }}>
                    <Link component="button" variant="caption" underline="hover"
                      sx={{ cursor: 'pointer', color: alpha('#fff', 0.5), fontWeight: 500, background: 'none', border: 'none' }}
                      onClick={() => handleBreadcrumbClick(-1)}>
                      All {groupByLabel}s
                    </Link>
                    {drillPath.map((step, idx) => {
                      const isLast = idx === drillPath.length - 1;
                      return isLast
                        ? <Typography key={idx} variant="caption" fontWeight={700} sx={{ color: BRAND_YELLOW }}>{step.name}</Typography>
                        : <Link key={idx} component="button" variant="caption" underline="hover"
                            sx={{ cursor: 'pointer', color: alpha('#fff', 0.5), fontWeight: 500, background: 'none', border: 'none' }}
                            onClick={() => handleBreadcrumbClick(idx)}>{step.name}</Link>;
                    })}
                  </Breadcrumbs>
                </Stack>
                <Button size="small" startIcon={<CloseIcon sx={{ fontSize: 13 }} />}
                  onClick={() => { setDrillPath([]); setDrillData([]); }}
                  sx={{ color: alpha('#fff', 0.55), fontSize: '0.72rem', fontWeight: 500, minHeight: 28, px: 1, '&:hover': { bgcolor: alpha('#fff', 0.08), color: '#fff' } }}>
                  Clear
                </Button>
              </Box>

              {/* Drill content */}
              <Box sx={{
                border: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
                borderTop: 'none',
                borderRadius: `0 0 ${T.radius.card}px ${T.radius.card}px`,
                p: 2,
                bgcolor: alpha(BRAND_YELLOW, 0.022),
              }}>
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
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND_DARK }}>
                        {drillLevelLabel}s within "{drillPath[drillPath.length - 1].name}"
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {drillTotalOrders.toLocaleString()} orders
                        {drillPath[drillPath.length - 1].groupBy === 'range' && ' · click to drill into products'}
                      </Typography>
                      <ResponsiveContainer width="100%" height={drillBarHeight}>
                        <BarChart layout="vertical" data={drillData} margin={{ top: 2, right: 52, left: 8, bottom: 2 }}
                          onClick={(chart) => {
                            if (drillPath[drillPath.length - 1].groupBy === 'range' && chart?.activePayload?.[0]?.payload)
                              handleDrillRangeClick(chart.activePayload[0].payload);
                          }}
                          style={drillPath[drillPath.length - 1].groupBy === 'range' ? { cursor: 'pointer' } : undefined}>
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.38) }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={155} tick={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.58) }}
                            axisLine={false} tickLine={false} tickFormatter={(v) => v.length > 22 ? v.slice(0, 21) + '...' : v} />
                          <Tooltip content={<BarTooltipContent />} cursor={{ fill: alpha(BRAND_DARK, 0.04) }} />
                          <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={18}>
                            {drillData.map((entry, i) => <Cell key={entry.id ?? i} fill={COLORS[(i + 5) % COLORS.length]} />)}
                            <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: alpha(BRAND_DARK, 0.52), fontWeight: 600 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </SectionCard>

                    {/* Drill ranked list */}
                    <SectionCard sx={{ flex: '2 1 0', minWidth: 260, p: 2, display: 'flex', flexDirection: 'column', maxHeight: drillBarHeight + 56 }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: BRAND_DARK }}>Ranking</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {drillData.length} {drillLevelLabel.toLowerCase()}s
                        {drillPath[drillPath.length - 1].groupBy === 'range' ? ' · click to go deeper' : ''}
                      </Typography>
                      {renderRankedList(
                        drillData,
                        handleDrillRangeClick,
                        drillPath[drillPath.length - 1].groupBy === 'range',
                        5,
                        [],
                      )}
                    </SectionCard>
                  </Stack>
                )}
              </Box>
            </Box>
          )}

        </>)}
      </AdminPageShell>
    </Fade>
  );
}

