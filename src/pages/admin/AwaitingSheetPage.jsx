import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Stack
} from '@mui/material';
import api from '../../lib/api';

// Common cell style for spreadsheet look
const cellStyle = {
    border: '1px solid #e0e0e0',
    padding: '8px 12px',
    fontWeight: 500,
    fontSize: '0.875rem'
};

const headerStyle = {
    ...cellStyle,
    backgroundColor: '#1976d2',
    color: 'white',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
};

// Helper function to get cell background color based on value and type
const getCellBg = (value, type) => {
    if (type === 'amazon') return value > 0 ? '#fff3e0' : 'transparent'; // light orange
    if (type === 'upsUsps') return value > 0 ? '#e3f2fd' : 'transparent'; // light blue
    if (type === 'blank') return value > 0 ? '#ffebee' : '#e8f5e9'; // light red or light green
    if (type === 'status') return value ? '#c8e6c9' : 'transparent'; // green for done
    if (type === 'trackingLeft') return value > 0 ? '#fff3e0' : 'transparent'; // orange if pending
    if (type === 'delivered') return value > 0 ? '#c8e6c9' : 'transparent'; // green
    if (type === 'inTransit') return value > 0 ? '#e3f2fd' : 'transparent'; // blue
    if (type === 'alreadyInUse') return value > 0 ? '#ffebee' : 'transparent'; // red
    return 'transparent';
};

export default function AwaitingSheetPage() {
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (date) {
            fetchSummary();
        }
    }, [date]);

    async function fetchSummary() {
        setLoading(true);
        setError('');
        try {
            const { data: result } = await api.get('/ebay/awaiting-sheet-summary', {
                params: { date }
            });
            setData(result);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to load summary');
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Typography variant="h5" fontWeight="bold">
                        Awaiting Sheet
                    </Typography>
                    <TextField
                        type="date"
                        label="Ship By Date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                </Stack>

                {data && (
                    <Stack direction="row" spacing={3} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                        <Typography variant="body2"><strong>Upload Tracking:</strong> {data.totals?.uploadTracking || 0}</Typography>
                        <Typography variant="body2"><strong>Tracking Left:</strong> {data.totals?.trackingId || 0}</Typography>
                        <Typography variant="body2"><strong>Uploaded:</strong> {(data.totals?.uploadTracking || 0) - (data.totals?.trackingId || 0)}</Typography>
                        <Typography variant="body2"><strong>Delivered:</strong> {data.totals?.delivered || 0}</Typography>
                        <Typography variant="body2"><strong>In-transit:</strong> {data.totals?.inTransit || 0}</Typography>
                        <Typography variant="body2"><strong>Already in use:</strong> {data.totals?.alreadyInUse || 0}</Typography>
                        <Typography variant="body2"><strong>Amazon:</strong> {data.totals?.amazon || 0}</Typography>
                        <Typography variant="body2"><strong>UPS/USPS:</strong> {data.totals?.upsUsps || 0}</Typography>
                        <Typography variant="body2"><strong>Blank:</strong> {data.totals?.blank || 0}</Typography>
                        <Typography variant="body2"><strong>Sellers:</strong> {data.totalSellers}</Typography>
                    </Stack>
                )}
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : data && data.summary.length > 0 ? (
                <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
                    <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={headerStyle} align="center">#</TableCell>
                                <TableCell sx={headerStyle}>Store Name</TableCell>
                                <TableCell sx={headerStyle} align="center">Upload Tracking</TableCell>
                                <TableCell sx={headerStyle} align="center">Tracking Left</TableCell>
                                <TableCell sx={headerStyle} align="center">Tracking ID Uploaded</TableCell>
                                <TableCell sx={headerStyle} align="center">Delivered</TableCell>
                                <TableCell sx={headerStyle} align="center">In-transit</TableCell>
                                <TableCell sx={headerStyle} align="center">Already in use</TableCell>
                                <TableCell sx={headerStyle} align="center">Amazon</TableCell>
                                <TableCell sx={headerStyle} align="center">UPS/USPS</TableCell>
                                <TableCell sx={headerStyle} align="center">Blank</TableCell>
                                <TableCell sx={headerStyle} align="center">Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.summary.map((row, index) => {
                                const isDone = row.blankCount === 0 && row.trackingIdCount > 0;
                                return (
                                    <TableRow key={row.sellerId} sx={{ '&:nth-of-type(even)': { backgroundColor: '#fafafa' } }}>
                                        <TableCell sx={cellStyle} align="center">{index + 1}</TableCell>
                                        <TableCell sx={{ ...cellStyle, fontWeight: 600 }}>{row.sellerName}</TableCell>
                                        <TableCell sx={cellStyle} align="center">{row.uploadTrackingCount}</TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.trackingIdCount, 'trackingLeft') }} align="center">
                                            {row.trackingIdCount}
                                        </TableCell>
                                        <TableCell sx={cellStyle} align="center">{row.uploadTrackingCount - row.trackingIdCount}</TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.deliveredCount, 'delivered') }} align="center">
                                            {row.deliveredCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.inTransitCount, 'inTransit') }} align="center">
                                            {row.inTransitCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.alreadyInUseCount, 'alreadyInUse') }} align="center">
                                            {row.alreadyInUseCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.amazonCount, 'amazon') }} align="center">
                                            {row.amazonCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.upsUspsCount, 'upsUsps') }} align="center">
                                            {row.upsUspsCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(row.blankCount, 'blank') }} align="center">
                                            {row.blankCount}
                                        </TableCell>
                                        <TableCell sx={{ ...cellStyle, backgroundColor: getCellBg(isDone, 'status'), color: isDone ? '#2e7d32' : 'inherit', fontWeight: isDone ? 'bold' : 'normal' }} align="center">
                                            {isDone ? 'Done' : ''}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : data && data.summary.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No orders found for this ship-by date.
                    </Typography>
                </Paper>
            ) : null}
        </Box>
    );
}
