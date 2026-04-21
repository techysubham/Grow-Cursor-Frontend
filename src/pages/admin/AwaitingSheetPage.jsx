import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from '@mui/material';
import api from '../../lib/api';
import { dashboardSignatureTokens } from '../../theme/appTheme';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import StatMetricCard from '../../components/StatMetricCard.jsx';
import StatusChip from '../../components/StatusChip.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableBodyCellSx, tableBodyRowSx, tableContainerSx } from '../../theme/tableStyles.js';

function getMetricTone(value, type) {
    if (type === 'amazon') return value > 0 ? 'amazon' : 'neutral';
    if (type === 'upsUsps') return value > 0 ? 'shipping' : 'neutral';
    if (type === 'blank') return value > 0 ? 'danger' : 'success';
    if (type === 'trackingLeft') return value > 0 ? 'warning' : 'success';
    if (type === 'delivered') return value > 0 ? 'success' : 'neutral';
    if (type === 'inTransit') return value > 0 ? 'shipping' : 'neutral';
    if (type === 'notYetShipped') return value > 0 ? 'warning' : 'neutral';
    if (type === 'alreadyInUse') return value > 0 ? 'danger' : 'neutral';
    return value > 0 ? 'info' : 'neutral';
}

function getStatusMeta(row) {
    const isDone = row.blankCount === 0 && row.trackingIdCount > 0;
    return {
        isDone,
        label: isDone ? 'Done' : 'In Progress',
        color: isDone ? 'success' : 'warning',
        variant: isDone ? 'filled' : 'outlined'
    };
}

export default function AwaitingSheetPage() {
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [marketplace, setMarketplace] = useState('');
    const [excludeClient, setExcludeClient] = useState(true);

    useEffect(() => {
        if (date) {
            fetchSummary();
        }
    }, [date, marketplace, excludeClient]);

    async function fetchSummary() {
        setLoading(true);
        setError('');
        try {
            const params = { date };
            if (marketplace) params.marketplace = marketplace;
            params.excludeClient = excludeClient;
            const { data: result } = await api.get('/ebay/awaiting-sheet-summary', {
                params
            });
            setData(result);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to load summary');
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    const summaryCards = useMemo(() => {
        if (!data) return [];

        const totals = data.totals || {};
        return [
            { label: 'Upload Tracking', value: totals.uploadTracking || 0, tone: 'info' },
            { label: 'Tracking Left', value: totals.trackingId || 0, tone: (totals.trackingId || 0) > 0 ? 'warning' : 'success' },
            { label: 'Uploaded', value: (totals.uploadTracking || 0) - (totals.trackingId || 0), tone: 'success' },
            { label: 'Delivered', value: totals.delivered || 0, tone: 'success' },
            { label: 'In Transit', value: totals.inTransit || 0, tone: 'shipping' },
            { label: 'Not Yet Shipped', value: totals.notYetShipped || 0, tone: 'warning' },
            { label: 'Already in Use', value: totals.alreadyInUse || 0, tone: 'danger' },
            { label: 'Amazon', value: totals.amazon || 0, tone: 'amazon' },
            { label: 'UPS / USPS', value: totals.upsUsps || 0, tone: 'shipping' },
            { label: 'Blank', value: totals.blank || 0, tone: (totals.blank || 0) > 0 ? 'danger' : 'success' },
            { label: 'Sellers', value: data.totalSellers || 0, tone: 'neutral' }
        ];
    }, [data]);

    return (
        <AdminPageShell>
            <SectionCard
                sx={{
                    p: { xs: 2, md: 3 },
                    mb: 3,
                }}
            >
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2.5}>
                    <Box>
                        <PageHeader
                            title="Awaiting Sheet"
                            subtitle="Ship-by summary grouped by store, with cleaner status cues and easier scanability."
                            sx={{ pt: 0, pb: 0 }}
                        />
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ width: { xs: '100%', lg: 'auto' } }}>
                        <TextField
                            type="date"
                            label="Ship By Date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                            sx={{ minWidth: 180 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                            <InputLabel>Marketplace</InputLabel>
                            <Select
                                value={marketplace}
                                label="Marketplace"
                                onChange={(e) => setMarketplace(e.target.value)}
                            >
                                <MenuItem value=""><em>All</em></MenuItem>
                                <MenuItem value="EBAY_US">EBAY_US</MenuItem>
                                <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
                                <MenuItem value="EBAY_CA">EBAY_CA</MenuItem>
                                <MenuItem value="EBAY_GB">EBAY_GB</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={excludeClient}
                                    onChange={(e) => setExcludeClient(e.target.checked)}
                                    color="primary"
                                />
                            }
                            label="Exclude Client"
                            sx={{ m: 0, px: 1.5, minHeight: 40, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                        />
                    </Stack>
                </Stack>

                {summaryCards.length > 0 && (
                    <Box
                        sx={{
                            mt: 3,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: 1.5
                        }}
                    >
                        {summaryCards.map((card) => (
                            <StatMetricCard
                                key={card.label}
                                label={card.label}
                                value={card.value}
                                tone={card.tone}
                            />
                        ))}
                    </Box>
                )}
            </SectionCard>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : data && data.summary.length > 0 ? (
                <TableContainer
                    component={Paper}
                    sx={tableContainerSx}
                >
                    <Table stickyHeader size="small" sx={{ minWidth: 1280 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={tableHeaderCellSx} align="center">#</TableCell>
                                <TableCell sx={tableHeaderCellSx}>Store Name</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Upload Tracking</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Tracking Left</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Tracking Uploaded</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Delivered</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">In Transit</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Not Yet Shipped</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Already in Use</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Amazon</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">UPS / USPS</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Blank</TableCell>
                                <TableCell sx={tableHeaderCellSx} align="center">Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.summary.map((row, index) => {
                                const uploadedCount = row.uploadTrackingCount - row.trackingIdCount;
                                const statusMeta = getStatusMeta(row);

                                return (
                                    <TableRow
                                        key={row.sellerId}
                                        hover
                                        sx={tableBodyRowSx}
                                    >
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <Box
                                                component="span"
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    minWidth: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    backgroundColor: dashboardSignatureTokens.table.indexBadgeBackground,
                                                    color: dashboardSignatureTokens.table.indexBadgeForeground,
                                                    fontWeight: 700,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {index + 1}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                                {row.sellerName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {uploadedCount > 0 ? `${uploadedCount} tracking IDs uploaded` : 'No tracking uploaded yet'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.uploadTrackingCount} tone={getMetricTone(row.uploadTrackingCount, 'uploadTracking')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.trackingIdCount} tone={getMetricTone(row.trackingIdCount, 'trackingLeft')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={uploadedCount} tone={uploadedCount > 0 ? 'success' : 'neutral'} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.deliveredCount} tone={getMetricTone(row.deliveredCount, 'delivered')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.inTransitCount} tone={getMetricTone(row.inTransitCount, 'inTransit')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.notYetShippedCount} tone={getMetricTone(row.notYetShippedCount, 'notYetShipped')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.alreadyInUseCount} tone={getMetricTone(row.alreadyInUseCount, 'alreadyInUse')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.amazonCount} tone={getMetricTone(row.amazonCount, 'amazon')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.upsUspsCount} tone={getMetricTone(row.upsUspsCount, 'upsUsps')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <StatusChip label={row.blankCount} tone={getMetricTone(row.blankCount, 'blank')} />
                                        </TableCell>
                                        <TableCell sx={tableBodyCellSx} align="center">
                                            <Chip
                                                label={statusMeta.label}
                                                color={statusMeta.color}
                                                variant={statusMeta.variant}
                                                size="small"
                                                sx={{ minWidth: 94, fontWeight: 700 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : data && data.summary.length === 0 ? (
                <SectionCard sx={{ p: 5, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        No orders found
                    </Typography>
                    <Typography color="text.secondary">
                        There are no awaiting-sheet rows for the selected ship-by date and marketplace.
                    </Typography>
                </SectionCard>
            ) : null}
        </AdminPageShell>
    );
}
