// pages/admin/QuantityUpdateExclusionsPage.jsx
import { useMemo, useState } from 'react';
import {
    Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
    Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../lib/api.js';
import useFetchTable from '../../hooks/useFetchTable';

/**
 * Manages the eBay ItemIDs whose listing quantity must NOT be reset to 1 when an
 * order comes in. Previously a hard-coded list in the server; now editable here
 * so new IDs take effect without a redeploy.
 */
export default function QuantityUpdateExclusionsPage() {
    const { rows: exclusions, loading, error: loadError, refetch } = useFetchTable('/quantity-update-exclusions');

    const [itemIdsInput, setItemIdsInput] = useState('');
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [result, setResult] = useState(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return exclusions;
        return exclusions.filter((row) =>
            String(row.itemId || '').includes(term)
            || String(row.note || '').toLowerCase().includes(term)
            || String(row.createdByName || '').toLowerCase().includes(term)
        );
    }, [exclusions, search]);

    // Count of what the user has typed, so they can sanity-check a big paste
    // before submitting it.
    const pendingCount = useMemo(
        () => itemIdsInput.split(/[\s,;]+/).filter(Boolean).length,
        [itemIdsInput]
    );

    const addExclusions = async (e) => {
        e.preventDefault();
        setFormError('');
        setResult(null);
        setSubmitting(true);
        try {
            const { data } = await api.post('/quantity-update-exclusions', {
                itemIds: itemIdsInput,
                note: note.trim()
            });
            setItemIdsInput('');
            setNote('');
            setResult(data);
            refetch();
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to add ItemIDs');
        } finally {
            setSubmitting(false);
        }
    };

    const removeExclusion = async (row) => {
        if (!window.confirm(`Remove ${row.itemId} from the exclusion list?\n\nIts quantity WILL be reset to 1 on future orders.`)) return;
        try {
            await api.delete(`/quantity-update-exclusions/${row._id}`);
            setResult(null);
            refetch();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to remove ItemID');
        }
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>Quantity Update Exclusions</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Listings on this list keep their quantity when an order arrives — every other ordered
                listing is automatically set back to a quantity of 1. Every order is checked against
                this list, so changes apply immediately; no redeploy needed.
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                {result && (
                    <Alert severity={result.added > 0 ? 'success' : 'info'} sx={{ mb: 2 }}>
                        Added {result.added} ItemID{result.added === 1 ? '' : 's'}
                        {result.skipped > 0 && ` · ${result.skipped} already on the list`}
                        {result.invalid?.length > 0 && ` · ignored (not a valid ItemID): ${result.invalid.join(', ')}`}
                    </Alert>
                )}

                <Stack spacing={2} component="form" onSubmit={addExclusions}>
                    <TextField
                        label="eBay ItemIDs"
                        placeholder={'128020622416\n128020636554\n128020645292'}
                        helperText={
                            pendingCount > 0
                                ? `${pendingCount} ItemID${pendingCount === 1 ? '' : 's'} ready to add`
                                : 'Paste one or many — separated by new lines, commas or spaces'
                        }
                        value={itemIdsInput}
                        onChange={(e) => setItemIdsInput(e.target.value)}
                        multiline
                        minRows={4}
                        required
                        fullWidth
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            label="Note (optional)"
                            placeholder="e.g. multi-quantity stock listing"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            sx={{ flex: 1 }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting || pendingCount === 0}
                            sx={{ alignSelf: { sm: 'center' }, minWidth: 160 }}
                        >
                            {submitting ? 'Adding…' : 'Add to exclusions'}
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <TextField
                    size="small"
                    placeholder="Search ItemID, note or user"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                        )
                    }}
                    sx={{ width: 320 }}
                />
                <Typography variant="body2" color="text.secondary">
                    {filtered.length} of {exclusions.length} excluded ItemID{exclusions.length === 1 ? '' : 's'}
                </Typography>
            </Stack>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ItemID</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Note</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Added by</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Added on</TableCell>
                                <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 60 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((row) => (
                                <TableRow key={row._id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>
                                        {row.itemId}
                                        {row.source === 'seed' && (
                                            <Tooltip title="Imported from the original hard-coded list">
                                                <Chip label="original" size="small" variant="outlined" sx={{ ml: 1 }} />
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell>{row.note || '—'}</TableCell>
                                    <TableCell>{row.createdByName || '—'}</TableCell>
                                    <TableCell>
                                        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => removeExclusion(row)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        {exclusions.length === 0 ? 'No excluded ItemIDs yet' : 'No ItemIDs match your search'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
