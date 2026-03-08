import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCING_STATUSES = ['Not Yet', 'Done', 'Added to cart', 'Cancelled order'];
const PURCHASERS = ['Ayushman', 'Debabrata', 'CEO Sir', 'Sakchi Ma\'am', 'Dev sir'];
const MESSAGE_STATUSES = [
    'Being Processed',
    'Late Message',
    'Cancellation Message',
    'Alternative Message',
    'Confirmation Message',
];

const SOURCING_STATUS_COLORS = {
    'Done': 'success',
    'Not Yet': 'default',
    'Added to cart': 'warning',
    'Cancelled order': 'error',
};

const MSG_STATUS_COLORS = {
    'Being Processed': '#ff9800',
    'Late Message': '#f4d03f',
    'Cancellation Message': '#42a5f5',
    'Alternative Message': '#ab47bc',
    'Confirmation Message': '#bdbdbd',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayStr() {
    return new Date().toISOString().slice(0, 10);
}

function fmt(val, digits = 2) {
    if (val == null || val === '') return '—';
    return Number(val).toFixed(digits);
}

// ─── Inline Select Cell ───────────────────────────────────────────────────────

function InlineSelect({ value, options, onChange, size = 'small', sx = {} }) {
    return (
        <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            size={size}
            displayEmpty
            sx={{ minWidth: 140, fontSize: '0.8rem', ...sx }}
        >
            <MenuItem value=""><em>—</em></MenuItem>
            {options.map((o) => (
                <MenuItem key={o} value={o} sx={{ fontSize: '0.8rem' }}>{o}</MenuItem>
            ))}
        </Select>
    );
}

// ─── Inline Text Cell (click-to-edit with save) ───────────────────────────────

function InlineText({ value, onSave, placeholder = '—', multiline = false }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!editing) setDraft(value || '');
    }, [value, editing]);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        if (draft !== (value || '')) onSave(draft);
    };

    if (editing) {
        return (
            <TextField
                inputRef={inputRef}
                value={draft}
                size="small"
                multiline={multiline}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } if (e.key === 'Escape') { setEditing(false); setDraft(value || ''); } }}
                sx={{ minWidth: 180, fontSize: '0.8rem' }}
            />
        );
    }

    return (
        <Box
            onClick={() => setEditing(true)}
            sx={{
                cursor: 'text',
                minWidth: 120,
                minHeight: 24,
                px: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: '0.8rem',
                color: value ? 'text.primary' : 'text.disabled',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        >
            {value || placeholder}
        </Box>
    );
}

// ─── Tab Panel Helper ─────────────────────────────────────────────────────────

function TabPanel({ children, value, index }) {
    return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AffiliateOrdersPage() {
    const [date, setDate] = useState(getTodayStr());
    const [tab, setTab] = useState(0);
    const [excludeLowValue, setExcludeLowValue] = useState(false);

    // Tab 1 state
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');
    const [amazonAccounts, setAmazonAccounts] = useState([]);

    // Tab 2 state
    const [balances, setBalances] = useState([]);
    const [balancesLoading, setBalancesLoading] = useState(false);
    const [balancesError, setBalancesError] = useState('');

    // Tab 3 state
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    // Snackbar
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const notify = (severity, msg) => setSnack({ open: true, msg, severity });

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchOrders = useCallback(async () => {
        setOrdersLoading(true);
        setOrdersError('');
        try {
            const { data } = await api.get('/affiliate-orders/daily', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setOrders(data);
        } catch (err) {
            setOrdersError(err?.response?.data?.error || 'Failed to load orders');
        } finally {
            setOrdersLoading(false);
        }
    }, [date, excludeLowValue]);

    const fetchAmazonAccounts = useCallback(async () => {
        try {
            const { data } = await api.get('/amazon-accounts');
            setAmazonAccounts(data.map((a) => a.name));
        } catch { /* silent */ }
    }, []);

    const fetchBalances = useCallback(async () => {
        setBalancesLoading(true);
        setBalancesError('');
        try {
            const { data } = await api.get('/affiliate-orders/balances', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setBalances(data);
        } catch (err) {
            setBalancesError(err?.response?.data?.error || 'Failed to load balances');
        } finally {
            setBalancesLoading(false);
        }
    }, [date, excludeLowValue]);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError('');
        try {
            const { data } = await api.get('/affiliate-orders/summary', { params: { date, excludeLowValue: excludeLowValue ? 'true' : 'false' } });
            setSummary(data);
        } catch (err) {
            setSummaryError(err?.response?.data?.error || 'Failed to load summary');
        } finally {
            setSummaryLoading(false);
        }
    }, [date, excludeLowValue]);

    useEffect(() => {
        fetchOrders();
        fetchAmazonAccounts();
        fetchBalances();
        fetchSummary();
    }, [date, excludeLowValue, fetchOrders, fetchAmazonAccounts, fetchBalances, fetchSummary]);

    // ── Order field patch ──────────────────────────────────────────────────────

    const patchOrder = useCallback(async (orderId, field, value) => {
        try {
            const { data } = await api.patch(`/affiliate-orders/${orderId}/sourcing`, { [field]: value });
            setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, ...data } : o)));
            // refresh balances & summary since expense may have changed
            fetchBalances();
            fetchSummary();
        } catch (err) {
            notify('error', err?.response?.data?.error || `Failed to update ${field}`);
        }
    }, [fetchBalances, fetchSummary]);

    // ── Balance field patch ────────────────────────────────────────────────────

    const patchBalance = useCallback(async (accountName, field, value) => {
        try {
            // Get current row to send full payload
            const current = balances.find((b) => b.amazonAccountName === accountName) || {};
            const payload = {
                amazonAccountName: accountName,
                date,
                availableBalance: current.availableBalance ?? 0,
                addedBalance: current.addedBalance ?? 0,
                giftCardStatus: current.giftCardStatus ?? false,
                note: current.note ?? '',
                [field]: value,
            };
            const { data: updated } = await api.put('/affiliate-orders/balances', payload);
            setBalances((prev) =>
                prev.map((b) => {
                    if (b.amazonAccountName !== accountName) return b;
                    const avail = field === 'availableBalance' ? value : b.availableBalance;
                    const added = field === 'addedBalance' ? value : b.addedBalance;
                    return {
                        ...b,
                        ...updated,
                        availableBalance: avail,
                        addedBalance: added,
                        difference: avail + added - b.totalExpense,
                    };
                })
            );
            fetchSummary();
        } catch (err) {
            notify('error', err?.response?.data?.error || `Failed to update ${field}`);
        }
    }, [balances, date, fetchSummary]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 1: Daily Orders
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab1 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {ordersLoading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''} for ${date}`}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchOrders}>Refresh</Button>
            </Stack>

            {ordersError && <Alert severity="error" sx={{ mb: 1 }}>{ordersError}</Alert>}

            {ordersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 1100 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#fce4ec' }}>
                                {[
                                    '#', 'Order ID', 'Product', 'Seller',
                                    'Affiliate Link', 'Price (USD)',
                                    'Amazon Account', 'Status', 'Purchaser',
                                    'Message Status', 'Note',
                                ].map((h) => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No orders found for this date.
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.map((order, idx) => {
                                const sellerName = order.seller?.user?.username || '—';
                                return (
                                    <TableRow key={order._id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' } }}>
                                        {/* # */}
                                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{idx + 1}</TableCell>

                                        {/* Order ID */}
                                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <span>{order.orderId}</span>
                                                <Tooltip title="Copy">
                                                    <IconButton size="small" onClick={() => { navigator.clipboard.writeText(order.orderId); notify('info', 'Copied'); }}>
                                                        <ContentCopyIcon sx={{ fontSize: 12 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>

                                        {/* Product Name */}
                                        <TableCell sx={{ fontSize: '0.78rem', maxWidth: 200 }}>
                                            <Tooltip title={order.productName || ''}>
                                                <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                                    {order.productName || '—'}
                                                </Box>
                                            </Tooltip>
                                        </TableCell>

                                        {/* Seller */}
                                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{sellerName}</TableCell>

                                        {/* Affiliate Link */}
                                        <TableCell sx={{ minWidth: 220 }}>
                                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                                <InlineText
                                                    value={order.affiliateLink}
                                                    placeholder="Paste link…"
                                                    onSave={(v) => patchOrder(order._id, 'affiliateLink', v)}
                                                />
                                                {order.affiliateLink && (
                                                    <Tooltip title="Open link">
                                                        <IconButton size="small" component="a" href={order.affiliateLink} target="_blank" rel="noopener noreferrer">
                                                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>

                                        {/* Price */}
                                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                            ${fmt(order.beforeTaxUSD)}
                                        </TableCell>

                                        {/* Amazon Account */}
                                        <TableCell>
                                            <InlineSelect
                                                value={order.amazonAccount}
                                                options={amazonAccounts}
                                                onChange={(v) => patchOrder(order._id, 'amazonAccount', v)}
                                            />
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell>
                                            <FormControl size="small">
                                                <Select
                                                    value={order.sourcingStatus || 'Not Yet'}
                                                    onChange={(e) => patchOrder(order._id, 'sourcingStatus', e.target.value)}
                                                    size="small"
                                                    sx={{ minWidth: 130, fontSize: '0.8rem' }}
                                                    renderValue={(v) => (
                                                        <Chip
                                                            label={v}
                                                            size="small"
                                                            color={SOURCING_STATUS_COLORS[v] || 'default'}
                                                            sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                                                        />
                                                    )}
                                                >
                                                    {SOURCING_STATUSES.map((s) => (
                                                        <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                                                            <Chip label={s} size="small" color={SOURCING_STATUS_COLORS[s] || 'default'} sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        {/* Purchaser */}
                                        <TableCell>
                                            <InlineSelect
                                                value={order.purchaser}
                                                options={PURCHASERS}
                                                onChange={(v) => patchOrder(order._id, 'purchaser', v)}
                                            />
                                        </TableCell>

                                        {/* Message Status */}
                                        <TableCell>
                                            <FormControl size="small">
                                                <Select
                                                    value={order.sourcingMessageStatus || 'Being Processed'}
                                                    onChange={(e) => patchOrder(order._id, 'sourcingMessageStatus', e.target.value)}
                                                    size="small"
                                                    sx={{ minWidth: 160, fontSize: '0.8rem' }}
                                                    renderValue={(v) => (
                                                        <Chip
                                                            label={v}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 'bold',
                                                                fontSize: '0.72rem',
                                                                bgcolor: MSG_STATUS_COLORS[v] || '#e0e0e0',
                                                                color: '#fff',
                                                            }}
                                                        />
                                                    )}
                                                >
                                                    {MESSAGE_STATUSES.map((s) => (
                                                        <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                                                            <Chip
                                                                label={s}
                                                                size="small"
                                                                sx={{ bgcolor: MSG_STATUS_COLORS[s] || '#e0e0e0', color: '#fff', fontSize: '0.72rem' }}
                                                            />
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>

                                        {/* Note */}
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <InlineText
                                                value={order.notes}
                                                placeholder="Add note…"
                                                multiline
                                                onSave={(v) => patchOrder(order._id, 'notes', v)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 2: Gift Card Balances
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab2 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {balancesLoading ? 'Loading…' : `${balances.length} Amazon account${balances.length !== 1 ? 's' : ''}`}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchBalances}>Refresh</Button>
            </Stack>

            {balancesError && <Alert severity="error" sx={{ mb: 1 }}>{balancesError}</Alert>}

            {balancesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                                {[
                                    'Account Name', 'Total Expense ($)', 'Gift Cards ✓',
                                    'Available Balance ($)', 'Difference ($)', 'Added Balance ($)', 'Note',
                                ].map((h) => (
                                    <TableCell key={h} sx={{ fontWeight: 'bold', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balances.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                                        No Amazon accounts found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {balances.map((row) => {
                                const diff = (row.availableBalance || 0) + (row.addedBalance || 0) - (row.totalExpense || 0);
                                return (
                                    <TableRow key={row.amazonAccountName} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#f9fbe7' } }}>
                                        {/* Account Name */}
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#1565c0' }}>
                                            {row.amazonAccountName}
                                        </TableCell>

                                        {/* Total Expense — read-only, calculated from orders */}
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                                            {fmt(row.totalExpense)}
                                            {row.orderCount > 0 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                                    ({row.orderCount} order{row.orderCount !== 1 ? 's' : ''})
                                                </Typography>
                                            )}
                                        </TableCell>

                                        {/* Gift Card Status — checkbox */}
                                        <TableCell align="center">
                                            <Checkbox
                                                checked={!!row.giftCardStatus}
                                                onChange={(e) => patchBalance(row.amazonAccountName, 'giftCardStatus', e.target.checked)}
                                                size="small"
                                                color="success"
                                            />
                                        </TableCell>

                                        {/* Available Balance — editable number */}
                                        <TableCell>
                                            <BalanceNumberCell
                                                value={row.availableBalance}
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'availableBalance', v)}
                                            />
                                        </TableCell>

                                        {/* Difference — auto-calculated */}
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600, color: diff < 0 ? 'error.main' : 'success.dark' }}>
                                            {diff >= 0 ? '+' : ''}{fmt(diff)}
                                        </TableCell>

                                        {/* Added Balance — editable number */}
                                        <TableCell>
                                            <BalanceNumberCell
                                                value={row.addedBalance}
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'addedBalance', v)}
                                            />
                                        </TableCell>

                                        {/* Note */}
                                        <TableCell sx={{ minWidth: 160 }}>
                                            <InlineText
                                                value={row.note}
                                                placeholder="Add note…"
                                                onSave={(v) => patchBalance(row.amazonAccountName, 'note', v)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER — Tab 3: Summary
    // ─────────────────────────────────────────────────────────────────────────

    const renderTab3 = () => (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Summary for {date}
                </Typography>
                <Button size="small" startIcon={<RefreshIcon />} onClick={fetchSummary}>Refresh</Button>
            </Stack>

            {summaryError && <Alert severity="error" sx={{ mb: 1 }}>{summaryError}</Alert>}

            {summaryLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : summary ? (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">

                    {/* Left: Per-Purchaser */}
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 260 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Assigned Orders by Purchaser
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#fff9c4' }}>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.78rem' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.78rem' }}>Assigned</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summary.byPurchaser.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center" sx={{ color: 'text.secondary' }}>No assignments yet</TableCell>
                                    </TableRow>
                                )}
                                {summary.byPurchaser.map((row) => (
                                    <TableRow key={row.name} hover>
                                        <TableCell sx={{ fontSize: '0.82rem', color: '#1565c0', fontWeight: 500 }}>{row.name}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{row.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>

                    {/* Right: Overall Totals */}
                    <Paper variant="outlined" sx={{ p: 2, minWidth: 320 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Day Totals
                        </Typography>
                        <Table size="small">
                            <TableBody>
                                {[
                                    { label: 'Orders →', value: summary.totalOrders, color: '#e65100' },
                                    { label: 'Total Order Amount (USD) →', value: `$${fmt(summary.totalUSD)}`, color: '#1b5e20' },
                                    { label: 'INR Amount →', value: `₹${fmt(summary.totalINR, 3)}`, color: '#b71c1c' },
                                    { label: 'Total Amount Added →', value: fmt(summary.totalAmountAdded), color: 'text.primary' },
                                    { label: 'Orders Done →', value: summary.ordersDone, color: '#2e7d32' },
                                    { label: 'Orders Not Done →', value: summary.ordersNotDone, color: '#c62828' },
                                ].map(({ label, value, color }) => (
                                    <TableRow key={label}>
                                        <TableCell sx={{ fontSize: '0.82rem', fontWeight: 500, border: 'none', py: 0.5 }}>{label}</TableCell>
                                        <TableCell sx={{ fontSize: '0.88rem', fontWeight: 700, color, border: 'none', py: 0.5 }}>{value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Stack>
            ) : (
                <Typography color="text.secondary">No data available.</Typography>
            )}
        </>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, gap: 2 }}>
                <Typography variant="h5" fontWeight="bold">Affiliate Orders</Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <FormControlLabel
                        control={<Switch checked={excludeLowValue} onChange={(e) => setExcludeLowValue(e.target.checked)} />}
                        label="Exclude < $3"
                        sx={{ m: 0 }}
                    />
                    <TextField
                        type="date"
                        size="small"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        label="Date"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 170 }}
                    />
                </Stack>
            </Stack>

            {/* Tabs */}
            <Paper variant="outlined" sx={{ mb: 0 }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Tab label="Daily Orders" />
                    <Tab label="Gift Card Balances" />
                    <Tab label="Summary" />
                </Tabs>
            </Paper>

            <Box sx={{ mt: 0 }}>
                <TabPanel value={tab} index={0}>{renderTab1()}</TabPanel>
                <TabPanel value={tab} index={1}>{renderTab2()}</TabPanel>
                <TabPanel value={tab} index={2}>{renderTab3()}</TabPanel>
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snack.open}
                autoHideDuration={2500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

// ─── Editable Number Cell ─────────────────────────────────────────────────────

function BalanceNumberCell({ value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? 0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!editing) setDraft(value ?? 0);
    }, [value, editing]);

    useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        const num = parseFloat(draft);
        if (!isNaN(num) && num !== (value ?? 0)) onSave(num);
    };

    if (editing) {
        return (
            <TextField
                inputRef={inputRef}
                value={draft}
                type="number"
                size="small"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value ?? 0); } }}
                sx={{ width: 100, fontSize: '0.8rem' }}
                inputProps={{ step: 'any' }}
            />
        );
    }

    return (
        <Box
            onClick={() => setEditing(true)}
            sx={{
                cursor: 'text',
                minWidth: 80,
                px: 0.5,
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                fontSize: '0.82rem',
                fontWeight: 500,
            }}
        >
            {value != null ? value : 0}
        </Box>
    );
}
