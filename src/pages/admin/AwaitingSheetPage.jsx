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
    Chip,
    Stack
} from '@mui/material';
import api from '../../lib/api';

export default function AwaitingSheetPage() {
    const [date, setDate] = useState(() => {
        // Default to today in YYYY-MM-DD format
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
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                        <Chip
                            label={`Upload Tracking: ${data.totals?.uploadTracking || 0}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Tracking Left: ${data.totals?.trackingId || 0}`}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Tracking ID Uploaded: ${(data.totals?.uploadTracking || 0) - (data.totals?.trackingId || 0)}`}
                            color="secondary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Delivered: ${data.totals?.delivered || 0}`}
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`In-transit: ${data.totals?.inTransit || 0}`}
                            color="info"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Already in use: ${data.totals?.alreadyInUse || 0}`}
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Amazon: ${data.totals?.amazon || 0}`}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`UPS/USPS: ${data.totals?.upsUsps || 0}`}
                            color="info"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Blank: ${data.totals?.blank || 0}`}
                            color="default"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />
                        <Chip
                            label={`Sellers: ${data.totalSellers}`}
                            color="default"
                            variant="outlined"
                        />
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
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>
                                    #
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>
                                    Store Name
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Upload Tracking
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Tracking Left
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Tracking ID Uploaded
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Delivered
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    In-transit
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Already in use
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Amazon
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    UPS/USPS
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Blank
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }} align="center">
                                    Status
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.summary.map((row, index) => (
                                <TableRow key={row.sellerId} hover>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {row.sellerName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.uploadTrackingCount}
                                            color="primary"
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.trackingIdCount}
                                            color={row.trackingIdCount > 10 ? 'error' : row.trackingIdCount > 5 ? 'warning' : 'default'}
                                            size="small"
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.uploadTrackingCount - row.trackingIdCount}
                                            color="secondary"
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.deliveredCount}
                                            color={row.deliveredCount > 0 ? 'success' : 'default'}
                                            size="small"
                                            variant={row.deliveredCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.inTransitCount}
                                            color={row.inTransitCount > 0 ? 'info' : 'default'}
                                            size="small"
                                            variant={row.inTransitCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.alreadyInUseCount}
                                            color={row.alreadyInUseCount > 0 ? 'error' : 'default'}
                                            size="small"
                                            variant={row.alreadyInUseCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.amazonCount}
                                            color={row.amazonCount > 0 ? 'warning' : 'default'}
                                            size="small"
                                            variant={row.amazonCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.upsUspsCount}
                                            color={row.upsUspsCount > 0 ? 'info' : 'default'}
                                            size="small"
                                            variant={row.upsUspsCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.blankCount}
                                            color={row.blankCount > 0 ? 'default' : 'default'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 'bold', minWidth: 40 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.blankCount === 0 && row.trackingIdCount > 0 ? 'Done' : ''}
                                            color={row.blankCount === 0 && row.trackingIdCount > 0 ? 'success' : 'default'}
                                            size="small"
                                            variant={row.blankCount === 0 && row.trackingIdCount > 0 ? 'filled' : 'outlined'}
                                            sx={{ fontWeight: 'bold', minWidth: 50 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
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
