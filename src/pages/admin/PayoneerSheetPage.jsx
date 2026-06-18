import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    MenuItem,
    Pagination,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import api from '../../lib/api';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatMetricCard from '../../components/StatMetricCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableBodyCellSx, tableBodyRowSx, tableContainerSx } from '../../theme/tableStyles.js';

// --- MOBILE PAYONEER CARD COMPONENT ---
function MobilePayoneerCard({ record, isEditing, renderCell, onEdit, onDelete, onSave, onCancel }) {
    return (
        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Stack spacing={1.5}>
                {/* Header Row: Store + Actions */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                            STORE
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
                            {isEditing ? 'Editing...' : (record.store?.user?.username || 'Unknown')}
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5}>
                        {isEditing ? (
                            <>
                                <Tooltip title="Save">
                                    <IconButton color="primary" onClick={onSave} size="small">
                                        <SaveIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                    <IconButton color="error" onClick={onCancel} size="small">
                                        <CancelIcon />
                                    </IconButton>
                                </Tooltip>
                            </>
                        ) : (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton color="primary" onClick={onEdit} size="small">
                                        <EditIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                    <IconButton color="error" onClick={onDelete} size="small">
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </Stack>
                </Stack>

                <Divider />

                {/* Details Grid */}
                <Stack spacing={1.25}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                            BANK ACCOUNT
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>{renderCell(record, 'bankAccount')}</Box>
                    </Box>

                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                            PAYMENT DATE
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>{renderCell(record, 'paymentDate', 'date')}</Box>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                                AMOUNT ($)
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>{renderCell(record, 'amount', 'number')}</Box>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                                EXCHANGE RATE (₹)
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>{renderCell(record, 'exchangeRate', 'number')}</Box>
                        </Box>
                    </Stack>

                    {!isEditing && (
                        <Paper variant="outlined" sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Stack direction="row" justifyContent="space-between" spacing={1}>
                                <Box>
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                        Actual (+2%)
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {record.actualExchangeRate?.toFixed(4) ?? '-'}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                        Deposit (₹)
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                        {record.bankDeposit?.toFixed(2) ?? '-'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    {/* Period & Profit */}
                    <Stack direction="row" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                                PERIOD
                            </Typography>
                            {isEditing ? (
                                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                    <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={editFormData?.periodStart || ''} onChange={(e) => handleEditChange('periodStart', e.target.value)} fullWidth />
                                    <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={editFormData?.periodEnd || ''} onChange={(e) => handleEditChange('periodEnd', e.target.value)} fullWidth />
                                </Stack>
                            ) : (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {record.periodStart ? new Date(record.periodStart).toLocaleDateString() : '-'} → {record.periodEnd ? new Date(record.periodEnd).toLocaleDateString() : '-'}
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                                PROFIT ($)
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>{renderCell(record, 'profit', 'number')}</Box>
                        </Box>
                    </Stack>
                </Stack>
            </Stack>
        </Paper>
    );
}

const PayoneerSheetPage = () => {
    // Responsive breakpoints
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [records, setRecords] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [totals, setTotals] = useState({ totalAmount: 0, totalBankDeposit: 0 });

    // Empty filter template
    const emptyFilters = {
        store: '',
        dateMode: 'none',
        singleDate: '',
        dateRange: { start: '', end: '' }
    };

    // draftFilters — bound to the UI inputs (not sent to server until Apply is clicked)
    const [draftFilters, setDraftFilters] = useState(emptyFilters);

    // appliedFilters — what's actually sent to the server
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

    // Pagination State
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        totalPages: 1,
        totalRecords: 0
    });

    // Returns today's date as YYYY-MM-DD in the browser's local timezone (correct for IST users)
    const todayLocal = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [formData, setFormData] = useState({
        bankAccount: '', // ObjectId of BankAccount
        paymentDate: todayLocal(),
        amount: '',
        exchangeRate: '',
        store: '',
        periodStart: '',
        periodEnd: '',
        profit: ''
    });

    // Calculated Preview for "Add New"
    const [preview, setPreview] = useState({
        actualExchangeRate: 0,
        bankDeposit: 0
    });

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    // Fetch Reference Data on Mount
    useEffect(() => {
        fetchSellers();
        fetchBankAccounts();
    }, []);

    // Fetch Records when appliedFilters or Page Changes (NOT on draftFilters change)
    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, appliedFilters]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.page,
                limit: pagination.limit
            };

            // Add Store Filter
            if (appliedFilters.store) params.store = appliedFilters.store;

            // Add Date Filter based on Mode
            if (appliedFilters.dateMode === 'single' && appliedFilters.singleDate) {
                params.startDate = appliedFilters.singleDate;
                params.endDate = appliedFilters.singleDate;
            } else if (appliedFilters.dateMode === 'range') {
                if (appliedFilters.dateRange.start) params.startDate = appliedFilters.dateRange.start;
                if (appliedFilters.dateRange.end) params.endDate = appliedFilters.dateRange.end;
            }

            const { data } = await api.get('/payoneer', { params });

            // Backend now returns { records, totalRecords, totalPages, currentPage }
            if (data.records) {
                setRecords(data.records);
                setPagination(prev => ({
                    ...prev,
                    totalPages: data.totalPages,
                    totalRecords: data.totalRecords
                }));
                setTotals({
                    totalAmount: data.totalAmount || 0,
                    totalBankDeposit: data.totalBankDeposit || 0
                });
            } else {
                // Fallback for old API response (array)
                setRecords(data);
            }
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setLoading(false);
            setPageLoading(false);
        }
    };

    const fetchSellers = async () => {
        try {
            const { data } = await api.get('/sellers/all');
            setSellers(data);
        } catch (error) {
            console.error('Failed to fetch sellers:', error);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const { data } = await api.get('/bank-accounts');
            setBankAccounts(data);
        } catch (error) {
            console.error('Failed to fetch bank accounts:', error);
        }
    };

    // Update calculations when Amount or Rate changes (for Add Dialog)
    useEffect(() => {
        const amount = parseFloat(formData.amount) || 0;
        const rate = parseFloat(formData.exchangeRate) || 0;
        const actualRate = rate + (rate * 0.02);
        const deposit = amount * rate;

        setPreview({
            actualExchangeRate: actualRate,
            bankDeposit: deposit
        });
    }, [formData.amount, formData.exchangeRate]);



    const handleCreate = async () => {
        try {
            setLoading(true);
            await api.post('/payoneer', formData);
            setOpenDialog(false);
            fetchRecords();
            // Reset form
            setFormData({
                bankAccount: '',
                paymentDate: todayLocal(),
                amount: '',
                exchangeRate: '',
                store: '',
                periodStart: '',
                periodEnd: '',
                profit: ''
            });
        } catch (error) {
            alert('Failed to create: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/payoneer/${id}`);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleApplyFilters = () => {
        setPagination(prev => ({ ...prev, page: 1 }));
        setAppliedFilters({ ...draftFilters });
    };

    const handleClearFilters = () => {
        setDraftFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // --- EDITING LOGIC ---

    const startEditing = (record) => {
        setEditingId(record._id);
        setEditFormData({
            bankAccount: record.bankAccount?._id,
            paymentDate: record.paymentDate ? record.paymentDate.split('T')[0] : '',
            amount: record.amount,
            exchangeRate: record.exchangeRate,
            store: record.store?._id,
            periodStart: record.periodStart ? record.periodStart.split('T')[0] : '',
            periodEnd: record.periodEnd ? record.periodEnd.split('T')[0] : '',
            profit: record.profit ?? ''
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleEditChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const saveEdit = async () => {
        try {
            await api.put(`/payoneer/${editingId}`, editFormData);
            setEditingId(null);
            fetchRecords();
        } catch (error) {
            alert('Failed to update: ' + (error.response?.data?.error || error.message));
        }
    };

    // Render a cell that is text normally, but an input when editing
    const renderCell = (record, field, type = 'text') => {
        const isEditing = editingId === record._id;
        let value = isEditing ? editFormData[field] : (field === 'store' ? (record.store?.user?.username || 'Unknown') : record[field]);

        if (!isEditing && field === 'bankAccount') {
            value = record.bankAccount?.name || 'Unknown';
        }

        if (!isEditing) {
            if (field === 'amount' || field === 'bankDeposit') return value?.toFixed(2);
            if (field === 'actualExchangeRate') return value?.toFixed(4);
            if (field === 'paymentDate') return new Date(value).toLocaleDateString();
            if (field === 'periodStart' || field === 'periodEnd') return value ? new Date(value).toLocaleDateString() : '-';
            if (field === 'profit') return value != null ? value.toFixed(2) : '-';
            return value;
        }

        if (field === 'bankAccount') {
            return (
                <TextField
                    select
                    size="small"
                    value={editFormData.bankAccount || ''}
                    onChange={(e) => handleEditChange('bankAccount', e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    {bankAccounts.map((acc) => (
                        <MenuItem key={acc._id} value={acc._id}>
                            {acc.name}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        if (field === 'store') {
            return (
                <TextField
                    select
                    size="small"
                    value={editFormData.store || ''}
                    onChange={(e) => handleEditChange('store', e.target.value)}
                    sx={{ minWidth: 120 }}
                >
                    {sellers.map((seller) => (
                        <MenuItem key={seller._id} value={seller._id}>
                            {seller.user?.username || seller.user?.email}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        return (
            <TextField
                type={type}
                size="small"
                value={value}
                onChange={(e) => handleEditChange(field, e.target.value)}
                sx={{ maxWidth: 100 }}
            />
        );
    };

    if (pageLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
        </Box>
    );

    const metricCards = [
        { label: 'Total Records', value: pagination.totalRecords, tone: 'info' },
        { label: 'Amount (USD)', value: `$${totals.totalAmount.toFixed(2)}`, tone: 'neutral' },
        { label: 'Bank Deposit (INR)', value: `₹${totals.totalBankDeposit.toFixed(2)}`, tone: 'success' },
    ];

    return (
        <AdminPageShell>
            {/* ── TOP CARD: header + filters + stat metrics ── */}
            <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', lg: 'center' }}
                    gap={2.5}
                >
                    <Box>
                        <PageHeader
                            title="Payoneer Sheet"
                            subtitle="Track Payoneer payments, exchange rates and INR deposits per store."
                            sx={{ pt: 0, pb: 0 }}
                        />
                    </Box>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        useFlexGap
                        flexWrap="wrap"
                        alignItems="center"
                        sx={{ width: { xs: '100%', lg: 'auto' } }}
                    >
                        {/* Store filter */}
                        <TextField
                            select
                            label="Store"
                            size="small"
                            value={draftFilters.store}
                            onChange={(e) => setDraftFilters(prev => ({ ...prev, store: e.target.value }))}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value=""><em>All Stores</em></MenuItem>
                            {sellers.map((s) => (
                                <MenuItem key={s._id} value={s._id}>
                                    {s.user?.username || s.user?.email || 'Unknown'}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Date mode */}
                        <TextField
                            select
                            label="Date Mode"
                            size="small"
                            value={draftFilters.dateMode}
                            onChange={(e) => setDraftFilters(prev => ({ ...prev, dateMode: e.target.value }))}
                            sx={{ minWidth: 130 }}
                        >
                            <MenuItem value="none">None</MenuItem>
                            <MenuItem value="single">Single Date</MenuItem>
                            <MenuItem value="range">Date Range</MenuItem>
                        </TextField>

                        {draftFilters.dateMode === 'single' && (
                            <TextField
                                label="Date"
                                type="date"
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                value={draftFilters.singleDate}
                                onChange={(e) => setDraftFilters(prev => ({ ...prev, singleDate: e.target.value }))}
                                sx={{ minWidth: 160 }}
                            />
                        )}
                        {draftFilters.dateMode === 'range' && (
                            <>
                                <TextField
                                    label="From"
                                    type="date"
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    value={draftFilters.dateRange.start}
                                    onChange={(e) => setDraftFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, start: e.target.value }
                                    }))}
                                    sx={{ minWidth: 160 }}
                                />
                                <TextField
                                    label="To"
                                    type="date"
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    value={draftFilters.dateRange.end}
                                    onChange={(e) => setDraftFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, end: e.target.value }
                                    }))}
                                    sx={{ minWidth: 160 }}
                                />
                            </>
                        )}

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<FilterListIcon />}
                            onClick={handleApplyFilters}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Apply Filters
                        </Button>

                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleClearFilters}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Clear
                        </Button>

                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenDialog(true)}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Add Record
                        </Button>
                    </Stack>
                </Stack>

                {/* Stat metric cards */}
                <Box
                    sx={{
                        mt: 3,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 1.5,
                    }}
                >
                    {metricCards.map((card) => (
                        <StatMetricCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            tone={card.tone}
                        />
                    ))}
                </Box>
            </SectionCard>

            {/* ── LOADING ── */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* ── MOBILE CARD VIEW ── */}
            {!loading && isMobile && (
                <Stack spacing={1.5}>
                    {records.map((record) => {
                        const isEditing = editingId === record._id;
                        return (
                            <MobilePayoneerCard
                                key={record._id}
                                record={record}
                                isEditing={isEditing}
                                renderCell={renderCell}
                                onEdit={() => startEditing(record)}
                                onDelete={() => handleDelete(record._id)}
                                onSave={saveEdit}
                                onCancel={cancelEditing}
                            />
                        );
                    })}
                    {records.length === 0 && (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">No records found.</Typography>
                        </Paper>
                    )}
                </Stack>
            )}

            {/* ── DESKTOP TABLE VIEW ── */}
            {!loading && !isMobile && (
                <TableContainer component={Paper} sx={tableContainerSx}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={tableHeaderCellSx}>Bank Account</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Payment Date</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Store</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Amount (USD)</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Exch. Rate</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Actual Rate (+2%)</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Bank Deposit (INR)</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Period</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Profit ($)</TableCell>
                                <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {records.map((record) => {
                                const isEditing = editingId === record._id;
                                return (
                                    <TableRow key={record._id} hover sx={tableBodyRowSx}>
                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'bankAccount')}</TableCell>
                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'paymentDate', 'date')}</TableCell>
                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'store')}</TableCell>
                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'amount', 'number')}</TableCell>
                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'exchangeRate', 'number')}</TableCell>

                                        {/* Calculated — read-only even in edit mode */}
                                        <TableCell sx={{ ...tableBodyCellSx, color: 'text.secondary', bgcolor: isEditing ? 'action.hover' : 'inherit' }}>
                                            {isEditing ? 'Auto-calc' : record.actualExchangeRate?.toFixed(4)}
                                        </TableCell>
                                        <TableCell sx={{ ...tableBodyCellSx, fontWeight: 700, color: 'success.main', bgcolor: isEditing ? 'action.hover' : 'inherit' }}>
                                            {isEditing ? 'Auto-calc' : record.bankDeposit?.toFixed(2)}
                                        </TableCell>

                                        {/* Period */}
                                        <TableCell sx={tableBodyCellSx}>
                                            {isEditing ? (
                                                <Stack spacing={0.5}>
                                                    <TextField
                                                        type="date"
                                                        size="small"
                                                        label="From"
                                                        InputLabelProps={{ shrink: true }}
                                                        value={editFormData.periodStart || ''}
                                                        onChange={(e) => handleEditChange('periodStart', e.target.value)}
                                                        sx={{ width: 150 }}
                                                    />
                                                    <TextField
                                                        type="date"
                                                        size="small"
                                                        label="To"
                                                        InputLabelProps={{ shrink: true }}
                                                        value={editFormData.periodEnd || ''}
                                                        onChange={(e) => handleEditChange('periodEnd', e.target.value)}
                                                        sx={{ width: 150 }}
                                                    />
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                                                    {record.periodStart ? new Date(record.periodStart).toLocaleDateString() : '-'}
                                                    {' → '}
                                                    {record.periodEnd ? new Date(record.periodEnd).toLocaleDateString() : '-'}
                                                </Typography>
                                            )}
                                        </TableCell>

                                        <TableCell sx={tableBodyCellSx}>{renderCell(record, 'profit', 'number')}</TableCell>

                                        <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                                            {isEditing ? (
                                                <>
                                                    <Tooltip title="Save">
                                                        <IconButton color="primary" size="small" onClick={saveEdit}>
                                                            <SaveIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Cancel">
                                                        <IconButton color="error" size="small" onClick={cancelEditing}>
                                                            <CancelIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <>
                                                    <Tooltip title="Edit">
                                                        <IconButton color="primary" size="small" onClick={() => startEditing(record)}>
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton color="error" size="small" onClick={() => handleDelete(record._id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {records.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No records found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* ── PAGINATION ── */}
            {!loading && pagination.totalPages > 1 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={pagination.totalPages}
                        page={pagination.page}
                        onChange={(e, value) => setPagination(prev => ({ ...prev, page: value }))}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {/* ── CREATE DIALOG ── */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                fullScreen={isSmallMobile}
            >
                <DialogTitle>Add Payoneer Record</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            select
                            label="Bank Account"
                            fullWidth
                            value={formData.bankAccount}
                            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        >
                            {bankAccounts.map((acc) => (
                                <MenuItem key={acc._id} value={acc._id}>
                                    {acc.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Store Name"
                            fullWidth
                            value={formData.store}
                            onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                        >
                            {sellers.map((seller) => (
                                <MenuItem key={seller._id} value={seller._id}>
                                    {seller.user?.username || seller.user?.email}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Payment Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                            <TextField
                                label="Amount ($)"
                                type="number"
                                fullWidth
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                            <TextField
                                label="Exchange Rate (₹)"
                                type="number"
                                fullWidth
                                value={formData.exchangeRate}
                                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                            />
                        </Stack>

                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                            <Typography variant="subtitle2" gutterBottom>Calculated Preview:</Typography>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">Actual Rate (+2%): <b>{preview.actualExchangeRate?.toFixed(4)}</b></Typography>
                                <Typography variant="body2">Bank Deposit: <b>{preview.bankDeposit?.toFixed(2)}</b></Typography>
                            </Box>
                        </Paper>

                        <Typography variant="subtitle2" sx={{ mb: -1 }}>Period (optional)</Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                            <TextField
                                label="From"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.periodStart}
                                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                            />
                            <TextField
                                label="To"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.periodEnd}
                                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                            />
                        </Stack>

                        <TextField
                            label="Profit ($)"
                            type="number"
                            fullWidth
                            placeholder="Enter profit amount (optional)"
                            value={formData.profit}
                            onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: { xs: 1, sm: 2 }, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
                    <Button onClick={() => setOpenDialog(false)} fullWidth={isSmallMobile}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        variant="contained"
                        disabled={loading}
                        fullWidth={isSmallMobile}
                    >
                        {loading ? 'Saving...' : 'Save Record'}
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminPageShell>
    );
};

export default PayoneerSheetPage;
