import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import InventoryIcon from '@mui/icons-material/Inventory';
import EditIcon from '@mui/icons-material/Edit';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import { BRAND_DARK } from '../../constants/brandTheme';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'United States', credits: 1 },
  { value: 'AUD', label: 'Australia', credits: 5 },
  { value: 'CAD', label: 'Canada', credits: 5 },
  { value: 'GBP', label: 'United Kingdom', credits: 5 }
];

const STATUS_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  no_asin: 'No ASIN',
  error: 'Error',
  queued: 'Queued'
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function KpiCard({ label, value, tone = 'default', active = false, onClick }) {
  const colors = {
    default: { bg: '#fff', border: '#e5e7eb', color: BRAND_DARK },
    good: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
    warn: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
    bad: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' }
  };
  const palette = colors[tone] || colors.default;
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        borderColor: active ? BRAND_DARK : palette.border,
        background: palette.bg,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: active ? `0 0 0 2px ${BRAND_DARK}` : 'none'
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>{label}</Typography>
        <Typography variant="h5" sx={{ color: palette.color, fontWeight: 900 }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function statusColor(status) {
  if (status === 'in_stock') return 'success';
  if (status === 'low_stock') return 'warning';
  if (status === 'out_of_stock' || status === 'error') return 'error';
  return 'default';
}

function getOrderCount(item) {
  return (item.sellerItems || []).reduce((sum, row) => sum + (row.orderCount || 0), 0);
}

export default function AmazonStockCheckPage() {
  const [mode, setMode] = useState('pilot_option_b');
  const [currencies, setCurrencies] = useState(['USD']);
  const [threshold, setThreshold] = useState(10);
  const [autoZeroQuantity, setAutoZeroQuantity] = useState(true);
  const [estimate, setEstimate] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [starting, setStarting] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [activeFilter, setActiveFilter] = useState('actionable');
  const [reviseTarget, setReviseTarget] = useState(null);
  const [reviseForm, setReviseForm] = useState({ title: '', price: '' });

  const isRunning = activeRun && ['queued', 'running'].includes(activeRun.status);

  const selectedCurrencyList = useMemo(() => (
    mode === 'pilot_option_b' ? ['USD', 'AUD', 'CAD', 'GBP'] : currencies
  ), [mode, currencies]);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const { data } = await api.get('/amazon-stock-checks/runs');
      setRuns(data.runs || []);
      if (!activeRun && data.runs?.[0]) setActiveRun(data.runs[0]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load runs');
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchRun = async (runId) => {
    if (!runId) return;
    try {
      const [{ data: runData }, { data: itemsData }] = await Promise.all([
        api.get(`/amazon-stock-checks/runs/${runId}`),
        api.get(`/amazon-stock-checks/runs/${runId}/items`)
      ]);
      setActiveRun(runData.run);
      setItems(itemsData.items || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load run details');
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    if (!activeRun?._id) return undefined;
    fetchRun(activeRun._id);
    if (!['queued', 'running'].includes(activeRun.status)) return undefined;
    const timer = setInterval(() => fetchRun(activeRun._id), 5000);
    return () => clearInterval(timer);
  }, [activeRun?._id, activeRun?.status]);

  const handleEstimate = async () => {
    setError('');
    setSuccess('');
    setLoadingEstimate(true);
    try {
      const params = mode === 'pilot_option_b'
        ? { mode }
        : { mode, currencies: currencies.join(',') };
      const { data } = await api.get('/amazon-stock-checks/estimate', { params });
      setEstimate(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to estimate run');
    } finally {
      setLoadingEstimate(false);
    }
  };

  const handleStart = async () => {
    setError('');
    setSuccess('');
    setStarting(true);
    try {
      const payload = {
        mode,
        currencies: selectedCurrencyList,
        threshold,
        autoZeroQuantity
      };
      const { data } = await api.post('/amazon-stock-checks/runs', payload);
      setActiveRun(data.run);
      setItems([]);
      setExpandedRows(new Set());
      setActiveFilter('actionable');
      await fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to start run');
    } finally {
      setStarting(false);
    }
  };

  const handleManualZero = async (item, sellerItem) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/amazon-stock-checks/items/${item._id}/set-quantity-zero`, {
        itemId: sellerItem.itemId
      });
      setSuccess(data.message || `Quantity set to zero for item ${sellerItem.itemId}`);
      await fetchRun(activeRun._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to set quantity to zero');
    }
  };

  const handleManualOne = async (item, sellerItem) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/amazon-stock-checks/items/${item._id}/set-quantity-one`, {
        itemId: sellerItem.itemId
      });
      setSuccess(data.message || `Quantity set to one for item ${sellerItem.itemId}`);
      await fetchRun(activeRun._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to set quantity to one');
    }
  };

  const handleEndItem = async (sellerItem) => {
    setError('');
    setSuccess('');
    try {
      await api.post('/ebay/end-item', {
        sellerId: sellerItem.sellerId,
        itemId: sellerItem.itemId,
        source: 'amazon_stock_check'
      });
      setSuccess(`Ended item ${sellerItem.itemId}`);
      await fetchRun(activeRun._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to end item');
    }
  };

  const openReviseDialog = (item, sellerItem) => {
    setReviseTarget({ item, sellerItem });
    setReviseForm({
      title: sellerItem.title || '',
      price: sellerItem.price ?? ''
    });
  };

  const handleReviseListing = async () => {
    if (!reviseTarget) return;
    setError('');
    setSuccess('');
    try {
      await api.post('/ebay/update-listing', {
        sellerId: reviseTarget.sellerItem.sellerId,
        itemId: reviseTarget.sellerItem.itemId,
        title: reviseForm.title,
        price: reviseForm.price
      });
      setReviseTarget(null);
      setSuccess(`Revised item ${reviseTarget.sellerItem.itemId}`);
      await fetchRun(activeRun._id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to revise listing');
    }
  };

  const actionableItems = items.filter((item) => ['low_stock', 'out_of_stock'].includes(item.status));
  const restockedItems = items.filter((item) => item.becameAvailable);
  const issueItems = [...actionableItems, ...restockedItems.filter((item) => !actionableItems.some((x) => x._id === item._id))];
  const qtyZeroItems = items.filter((item) => (item.sellerItems || []).some((row) => row.quantityZeroStatus === 'success'));
  const qtyZeroFailedItems = items.filter((item) => (item.sellerItems || []).some((row) => row.quantityZeroStatus === 'failed'));

  const displayItems = useMemo(() => {
    if (activeFilter === 'low_stock') return items.filter((item) => item.status === 'low_stock');
    if (activeFilter === 'out_of_stock') return items.filter((item) => item.status === 'out_of_stock');
    if (activeFilter === 'errors') return items.filter((item) => item.status === 'error');
    if (activeFilter === 'no_asin') return items.filter((item) => item.status === 'no_asin');
    if (activeFilter === 'restocked') return restockedItems;
    if (activeFilter === 'qty_zero_success') return qtyZeroItems;
    if (activeFilter === 'qty_zero_failed') return qtyZeroFailedItems;
    if (activeFilter === 'has_orders') return items.filter((item) => getOrderCount(item) > 0);
    if (activeFilter === 'checked') return items.filter((item) => !['queued', 'no_asin'].includes(item.status));
    if (activeFilter === 'all') return items;
    return issueItems;
  }, [activeFilter, items, issueItems, qtyZeroFailedItems, qtyZeroItems, restockedItems]);

  const toggleExpanded = (itemId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const getQtyZeroSummary = (sellerItems = []) => {
    const successCount = sellerItems.filter((row) => row.quantityZeroStatus === 'success').length;
    const failedCount = sellerItems.filter((row) => row.quantityZeroStatus === 'failed').length;
    const pendingCount = sellerItems.filter((row) => row.quantityZeroStatus === 'pending').length;
    return { successCount, failedCount, pendingCount };
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Amazon Stock Check"
        subtitle="Run SKU-to-ASIN stock checks on demand and zero eBay quantity when Amazon stock is low or unavailable."
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Run Mode</Typography>
            <Select fullWidth size="small" value={mode} onChange={(event) => setMode(event.target.value)}>
              <MenuItem value="pilot_option_b">Pilot Option B - 195 credits</MenuItem>
              <MenuItem value="custom">Custom country run</MenuItem>
              <MenuItem value="full">Full selected countries</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Countries</Typography>
            <Select
              fullWidth
              multiple
              size="small"
              value={selectedCurrencyList}
              disabled={mode === 'pilot_option_b'}
              onChange={(event) => setCurrencies(event.target.value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label} ({option.value}, {option.credits} credit{option.credits > 1 ? 's' : ''})
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={6} md={2}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Low Stock Threshold</Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControlLabel
              sx={{ mt: 2 }}
              control={<Checkbox checked={autoZeroQuantity} onChange={(event) => setAutoZeroQuantity(event.target.checked)} />}
              label="Auto zero quantity"
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Stack direction="row" spacing={1} sx={{ mt: { md: 2 } }}>
              <Button
                variant="outlined"
                startIcon={loadingEstimate ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={handleEstimate}
                disabled={loadingEstimate || starting || isRunning}
              >
                Estimate
              </Button>
              <Button
                variant="contained"
                startIcon={starting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleStart}
                disabled={starting || isRunning}
                sx={{ backgroundColor: BRAND_DARK }}
              >
                Start
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {estimate && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Estimate: {formatNumber(estimate.totalSkus)} non-empty SKUs selected from the SKU index, {formatNumber(estimate.asinFoundCount)} base SKUs mapped to ASINs and ready to check,
            {' '}{formatNumber(estimate.noAsinCount)} with no ASIN found for base SKU, estimated {formatNumber(estimate.creditsEstimated)} credits.
          </Alert>
        )}
      </Paper>

      {activeRun && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={6} md={2}><KpiCard label="Status" value={activeRun.status} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Total SKUs" value={activeRun.totalSkus} active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Checked" value={activeRun.checkedCount} active={activeFilter === 'checked'} onClick={() => setActiveFilter('checked')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Low Stock" value={activeRun.lowStockCount} tone="warn" active={activeFilter === 'low_stock'} onClick={() => setActiveFilter('low_stock')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Out of Stock" value={activeRun.outOfStockCount} tone="bad" active={activeFilter === 'out_of_stock'} onClick={() => setActiveFilter('out_of_stock')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Qty Zero Success" value={activeRun.quantityZeroSuccessCount} tone="good" active={activeFilter === 'qty_zero_success'} onClick={() => setActiveFilter('qty_zero_success')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Credits Used" value={activeRun.creditsUsed} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="No ASIN" value={activeRun.noAsinCount} active={activeFilter === 'no_asin'} onClick={() => setActiveFilter('no_asin')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Became Available" value={activeRun.becameAvailableCount} tone="good" active={activeFilter === 'restocked'} onClick={() => setActiveFilter('restocked')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Errors" value={activeRun.errorCount} tone="bad" active={activeFilter === 'errors'} onClick={() => setActiveFilter('errors')} /></Grid>
          <Grid item xs={6} md={2}><KpiCard label="Has Orders" value={items.filter((item) => getOrderCount(item) > 0).length} active={activeFilter === 'has_orders'} onClick={() => setActiveFilter('has_orders')} /></Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={9}>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ background: BRAND_DARK }}>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>SKU</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>ASIN</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Country</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Amazon Status</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Stock</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Qty Zero</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Seller Items</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Orders</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayItems.map((item) => {
                  const orderCount = getOrderCount(item);
                  const expanded = expandedRows.has(item._id);
                  const qtySummary = getQtyZeroSummary(item.sellerItems || []);
                  const groupBg = expanded ? '#f8fbff' : 'inherit';
                  const groupBorder = expanded ? '3px solid #2563eb' : '3px solid transparent';
                  return (
                    <Fragment key={item._id}>
                      <TableRow
                        key={item._id}
                        hover
                        onClick={() => toggleExpanded(item._id)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: groupBg,
                          '& > td:first-of-type': { borderLeft: groupBorder },
                          '& > td': { borderTop: expanded ? '1px solid #bfdbfe' : undefined }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 900 }}>{item.sku}</TableCell>
                        <TableCell>{item.asin || '-'}</TableCell>
                        <TableCell>{item.country}</TableCell>
                        <TableCell>
                          <Chip size="small" color={statusColor(item.status)} label={STATUS_LABELS[item.status] || item.status} />
                          {item.becameAvailable && <Chip size="small" color="success" label="Became available" sx={{ ml: 1 }} />}
                        </TableCell>
                        <TableCell>{item.stockQuantity ?? (item.availabilityText || '-')}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {qtySummary.successCount > 0 && <Chip size="small" color="success" label={`${qtySummary.successCount} success`} />}
                            {qtySummary.failedCount > 0 && <Chip size="small" color="error" label={`${qtySummary.failedCount} failed`} />}
                            {qtySummary.pendingCount > 0 && <Chip size="small" label={`${qtySummary.pendingCount} pending`} />}
                            {!qtySummary.successCount && !qtySummary.failedCount && !qtySummary.pendingCount && <Typography variant="body2" color="text.secondary">-</Typography>}
                          </Stack>
                        </TableCell>
                        <TableCell>{formatNumber(item.sellerItems?.length || 0)}</TableCell>
                        <TableCell>{formatNumber(orderCount)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          sx={{
                            p: 0,
                            border: 0,
                            borderLeft: expanded ? '3px solid #2563eb' : '3px solid transparent',
                            backgroundColor: expanded ? '#eff6ff' : 'transparent'
                          }}
                        >
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, background: '#eff6ff' }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>Seller item breakdown</Typography>
                                <Chip size="small" label={item.sku} sx={{ fontWeight: 900 }} />
                                <Chip size="small" label={`${item.sellerItems?.length || 0} item IDs`} />
                              </Stack>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Seller</TableCell>
                                    <TableCell>Item ID</TableCell>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Orders</TableCell>
                                    <TableCell>Qty Zero</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(item.sellerItems || []).map((sellerItem) => (
                                    <TableRow key={`${sellerItem.sellerId}-${sellerItem.itemId}`}>
                                      <TableCell>{sellerItem.sellerName}</TableCell>
                                      <TableCell>
                                        <Button
                                          size="small"
                                          variant="text"
                                          endIcon={<OpenInNewIcon fontSize="inherit" />}
                                          href={`https://www.ebay.com/itm/${sellerItem.itemId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {sellerItem.itemId}
                                        </Button>
                                      </TableCell>
                                      <TableCell sx={{ maxWidth: 360 }}>
                                        <Typography variant="body2" noWrap title={sellerItem.title}>{sellerItem.title || '-'}</Typography>
                                      </TableCell>
                                      <TableCell>{sellerItem.price ?? '-'}</TableCell>
                                      <TableCell>{formatNumber(sellerItem.orderCount)}</TableCell>
                                      <TableCell>
                                        <Chip
                                          size="small"
                                          label={sellerItem.quantityZeroStatus || 'not_needed'}
                                          color={sellerItem.quantityZeroStatus === 'success' ? 'success' : sellerItem.quantityZeroStatus === 'failed' ? 'error' : 'default'}
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<InventoryIcon />}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleManualZero(item, sellerItem);
                                            }}
                                          >
                                            Qty 0
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                            startIcon={<InventoryIcon />}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleManualOne(item, sellerItem);
                                            }}
                                          >
                                            Qty 1
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openReviseDialog(item, sellerItem);
                                            }}
                                          >
                                            Revise
                                          </Button>
                                          <Button
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            startIcon={<StopCircleIcon />}
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handleEndItem(sellerItem);
                                            }}
                                          >
                                            End
                                          </Button>
                                        </Stack>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
                {!displayItems.length && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      {activeRun ? 'No rows match the selected card/filter yet.' : 'Start a run to see results.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} lg={3}>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Recent Runs</Typography>
              {loadingRuns && <CircularProgress size={16} />}
            </Stack>
            <Stack spacing={1}>
              {runs.map((run) => (
                <Button
                  key={run._id}
                  variant={activeRun?._id === run._id ? 'contained' : 'outlined'}
                  onClick={() => setActiveRun(run)}
                  sx={{ justifyContent: 'space-between', textTransform: 'none', backgroundColor: activeRun?._id === run._id ? BRAND_DARK : undefined }}
                >
                  <span>{run.mode} - {run.status}</span>
                  <span>{formatNumber(run.checkedCount)}/{formatNumber(run.totalSkus)}</span>
                </Button>
              ))}
              {!runs.length && <Typography variant="body2" color="text.secondary">No runs yet.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={!!reviseTarget} onClose={() => setReviseTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Revise Listing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={reviseForm.title}
              onChange={(event) => setReviseForm((prev) => ({ ...prev, title: event.target.value }))}
              inputProps={{ maxLength: 80 }}
              helperText={`${reviseForm.title.length}/80 characters`}
              fullWidth
            />
            <TextField
              label="Price"
              type="number"
              value={reviseForm.price}
              onChange={(event) => setReviseForm((prev) => ({ ...prev, price: event.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviseTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleReviseListing} sx={{ backgroundColor: BRAND_DARK }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
