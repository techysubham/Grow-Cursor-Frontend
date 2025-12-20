import { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Typography,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Autocomplete,
    LinearProgress,
    Checkbox
} from '@mui/material';
import api from '../../lib/api.js';

// Helper for IST date string (YYYY-MM-DD)
const toISTYMD = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const utc = dt.getTime() + dt.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 330 * 60000); // +05:30
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export default function StoreDailyTasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    // Selection State
    const [selectedStore, setSelectedStore] = useState(null);
    const [selectedDate, setSelectedDate] = useState(toISTYMD(new Date())); // Default to today

    // Filter Options
    const [stores, setStores] = useState([]);
    const [listers, setListers] = useState([]);

    // Share Modal State
    const [shareOpen, setShareOpen] = useState(false);
    const [targetTask, setTargetTask] = useState(null); // The original assignment we are copying from
    const [shareForm, setShareForm] = useState({
        listerId: '', // Fresh assignment, user picks lister
        quantity: '',
        scheduledDate: '',
        listingPlatformId: '',
        storeId: '',
        notes: ''
    });

    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [bulkShareOpen, setBulkShareOpen] = useState(false);
    const [bulkItems, setBulkItems] = useState({}); // { [assignmentId]: { quantity: number, storeId: string } }

    // Load initial options
    useEffect(() => {
        api.get('/assignments/filter-options').then(({ data }) => {
            setStores(data.stores || []);
            setListers(data.listers || []);
        }).catch(console.error);
    }, []);

    // Fetch Tasks when Store/Date changes
    useEffect(() => {
        if (!selectedStore || !selectedDate) {
            setTasks([]);
            return;
        }

        const fetchTasks = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/assignments', {
                    params: {
                        storeId: selectedStore._id,
                        scheduledDateMode: 'single',
                        scheduledDateSingle: selectedDate,
                        limit: 1000 // Get all for the day
                    }
                });
                setTasks(data.items || data); // Handle paginated or list response
                setSelectedTaskIds([]); // Reset selection on fetch
            } catch (e) {
                console.error("Failed to fetch tasks", e);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [selectedStore, selectedDate]);

    // --- SELECTION HANDLERS ---
    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedTaskIds(tasks.map(t => t._id));
        } else {
            setSelectedTaskIds([]);
        }
    };

    const handleSelectRow = (id) => {
        const selectedIndex = selectedTaskIds.indexOf(id);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedTaskIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedTaskIds.slice(1));
        } else if (selectedIndex === selectedTaskIds.length - 1) {
            newSelected = newSelected.concat(selectedTaskIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedTaskIds.slice(0, selectedIndex),
                selectedTaskIds.slice(selectedIndex + 1),
            );
        }
        setSelectedTaskIds(newSelected);
    };

    const isSelected = (id) => selectedTaskIds.indexOf(id) !== -1;

    // --- SHARE HANDLERS (SINGLE) ---
    const openShare = (row) => {
        setTargetTask(row);
        // Pre-fill with existing details, but allow change
        setShareForm({
            listerId: '', // Fresh assignment, user picks lister
            quantity: row.quantity || '',
            scheduledDate: toISTYMD(new Date()), // Default to today for new task? Or keep existing? User said "diff scheduled date". Default to today/tomorrow seems safer.
            listingPlatformId: row.listingPlatform?._id || '',
            storeId: row.store?._id || '', // Default to same store
            notes: ''
        });
        setShareOpen(true);
    };

    // Submit Share (Create New Assignment)
    const handleShareSubmit = async () => {
        try {
            // Validate
            const { listerId, quantity, scheduledDate, listingPlatformId, storeId, notes } = shareForm;
            if (!listerId || !quantity || !scheduledDate || !listingPlatformId || !storeId) {
                alert('All fields are required');
                return;
            }

            await api.post('/assignments', {
                taskId: targetTask.task._id, // Use the underlying Task ID
                listerId,
                quantity: Number(quantity),
                listingPlatformId,
                storeId,
                scheduledDate,
                notes
            });

            alert('Task shared successfully!');
            setShareOpen(false);

            // We don't strictly need to refresh if the new task is for a different store/date,
            // but if it matches current filter, we should.
            // Let's refresh just in case.
            const { data } = await api.get('/assignments', {
                params: {
                    storeId: selectedStore._id,
                    scheduledDateMode: 'single',
                    scheduledDateSingle: selectedDate,
                    limit: 1000
                }
            });
            setTasks(data.items || data);
            setSelectedTaskIds([]);

        } catch (e) {
            console.error(e);
            alert('Failed to share task');
        }
    };

    // --- BULK SHARE HANDLERS ---
    const openBulkShare = () => {
        if (selectedTaskIds.length === 0) return;

        // Initialize per-item state
        const initialItems = {};
        selectedTaskIds.forEach(id => {
            const task = tasks.find(t => t._id === id);
            initialItems[id] = {
                quantity: task?.quantity || '',
                storeId: task?.store?._id || '' // Default to same store
            };
        });
        setBulkItems(initialItems);

        setShareForm({
            listerId: '',
            quantity: '', // Used as global helper
            scheduledDate: toISTYMD(new Date()),
            listingPlatformId: tasks[0]?.listingPlatform?._id || '', // Default to first item's platform
            storeId: tasks[0]?.store?._id || '', // Helper for "Set All Stores"
            notes: ''
        });
        setBulkShareOpen(true);
    };

    const handleBulkItemChange = (assignmentId, field, val) => {
        setBulkItems(prev => ({
            ...prev,
            [assignmentId]: { ...prev[assignmentId], [field]: val }
        }));
    };

    const applyToAll = (field, val) => {
        setBulkItems(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key] = { ...next[key], [field]: val };
            });
            return next;
        });
        // Update helper UI
        if (field === 'storeId' || field === 'quantity') {
            setShareForm(prev => ({ ...prev, [field]: val }));
        }
    };

    const handleBulkSubmit = async () => {
        const { listerId, listingPlatformId, notes, scheduledDate } = shareForm;

        if (!listerId || !listingPlatformId || !scheduledDate) {
            alert('Lister, Listing Platform and Date are required.');
            return;
        }

        const assignmentsPayload = [];
        for (const id of selectedTaskIds) {
            const item = bulkItems[id];
            const originalAssignment = tasks.find(t => t._id === id);

            if (!item.quantity || Number(item.quantity) <= 0) {
                alert('Ensure all quantities are valid (>0).');
                return;
            }
            if (!item.storeId) {
                alert('Ensure all tasks have a Store assigned.');
                return;
            }

            assignmentsPayload.push({
                taskId: originalAssignment.task._id, // Use underlying Task ID
                quantity: Number(item.quantity),
                storeId: item.storeId
            });
        }

        try {
            const res = await api.post('/assignments/bulk', {
                listerId,
                listingPlatformId,
                notes,
                scheduledDate,
                assignments: assignmentsPayload
            });

            if (res.data.success) {
                alert(`Successfully shared ${res.data.count} tasks!`);
                setBulkShareOpen(false);
                setSelectedTaskIds([]);
                // Refresh
                const { data } = await api.get('/assignments', {
                    params: {
                        storeId: selectedStore._id,
                        scheduledDateMode: 'single',
                        scheduledDateSingle: selectedDate,
                        limit: 1000
                    }
                });
                setTasks(data.items || data);
            }
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to process bulk share');
        }
    };

    const progressPct = (r) => {
        const q = r.quantity || 0;
        if (q <= 0) return 0;
        const c = Math.min(r.completedQuantity || 0, q);
        return Math.round((c / q) * 100);
    };

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">Store Daily Tasks</Typography>
                {selectedTaskIds.length > 0 && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={openBulkShare}
                    >
                        Share {selectedTaskIds.length} Selected
                    </Button>
                )}
            </Stack>

            <Paper sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Autocomplete
                        options={stores}
                        getOptionLabel={(option) => option.name}
                        value={selectedStore}
                        onChange={(e, v) => setSelectedStore(v)}
                        renderInput={(params) => <TextField {...params} label="Select Store" size="small" sx={{ width: 300 }} />}
                    />

                    <TextField
                        label="Date"
                        type="date"
                        size="small"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </Stack>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < tasks.length}
                                    checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell>SL No</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Lister</TableCell>
                            <TableCell>Qty</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} align="center">Loading...</TableCell></TableRow>
                        ) : tasks.length === 0 ? (
                            <TableRow><TableCell colSpan={8} align="center">No tasks found for this store and date.</TableCell></TableRow>
                        ) : (
                            tasks.map((row, idx) => {
                                const isItemSelected = isSelected(row._id);
                                return (
                                    <TableRow
                                        key={row._id}
                                        selected={isItemSelected}
                                        hover
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={isItemSelected}
                                                onChange={() => handleSelectRow(row._id)}
                                            />
                                        </TableCell>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>
                                            {row.task?.productTitle}
                                            <br />
                                            <Typography variant="caption" color="text.secondary">
                                                {row.task?.sourcePlatform?.name}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{row.task?.category?.name}</TableCell>
                                        <TableCell>{row.lister?.username}</TableCell>
                                        <TableCell>{row.quantity}</TableCell>
                                        <TableCell sx={{ width: 150 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box sx={{ width: '100%', mr: 1 }}>
                                                    <LinearProgress variant="determinate" value={progressPct(row)} />
                                                </Box>
                                                <Box sx={{ minWidth: 35 }}>
                                                    <Typography variant="body2" color="text.secondary">{`${Math.round(
                                                        progressPct(row),
                                                    )}%`}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outlined" size="small" onClick={() => openShare(row)}>
                                                Share
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Share Modal (Single) */}
            <Dialog open={shareOpen} onClose={() => setShareOpen(false)}>
                <DialogTitle>Share Task</DialogTitle>
                <DialogContent sx={{ minWidth: 400, pt: 2 }}>
                    {targetTask && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Sharing: {targetTask.task?.productTitle}
                        </Alert>
                    )}
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Lister</InputLabel>
                            <Select
                                value={shareForm.listerId}
                                label="Lister"
                                onChange={(e) => setShareForm({ ...shareForm, listerId: e.target.value })}
                            >
                                {listers.map((l) => (
                                    <MenuItem key={l._id} value={l._id}>{l.username}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Quantity"
                            type="number"
                            size="small"
                            value={shareForm.quantity}
                            onChange={(e) => setShareForm({ ...shareForm, quantity: e.target.value })}
                        />

                        <TextField
                            label="Scheduled Date"
                            type="date"
                            size="small"
                            value={shareForm.scheduledDate}
                            onChange={(e) => setShareForm({ ...shareForm, scheduledDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />

                        <FormControl fullWidth size="small">
                            <InputLabel>Store</InputLabel>
                            <Select
                                value={shareForm.storeId}
                                label="Store"
                                onChange={(e) => setShareForm({ ...shareForm, storeId: e.target.value })}
                            >
                                {stores.map((s) => (
                                    <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Notes"
                            multiline
                            rows={2}
                            size="small"
                            value={shareForm.notes}
                            onChange={(e) => setShareForm({ ...shareForm, notes: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShareOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleShareSubmit}>Share</Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Share Modal */}
            <Dialog open={bulkShareOpen} onClose={() => setBulkShareOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Bulk Share Tasks</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="info">
                            Sharing <strong>{selectedTaskIds.length}</strong> tasks. Set common details below, then verify individual quantities/stores.
                        </Alert>

                        {/* Common Fields */}
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Lister</InputLabel>
                                <Select
                                    value={shareForm.listerId}
                                    label="Lister"
                                    onChange={(e) => setShareForm({ ...shareForm, listerId: e.target.value })}
                                >
                                    {listers.map((l) => (
                                        <MenuItem key={l._id} value={l._id}>{l.username}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Scheduled Date"
                                type="date"
                                size="small"
                                value={shareForm.scheduledDate}
                                onChange={(e) => setShareForm({ ...shareForm, scheduledDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Set All Stores</InputLabel>
                                <Select
                                    label="Set All Stores"
                                    value={shareForm.storeId}
                                    onChange={(e) => applyToAll('storeId', e.target.value)}
                                >
                                    {stores.map((s) => (
                                        <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Box display="flex" gap={1} alignItems="center" sx={{ width: '100%' }}>
                                <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>Set all Qty:</Typography>
                                <TextField
                                    size="small"
                                    type="number"
                                    fullWidth
                                    onChange={(e) => applyToAll('quantity', e.target.value)}
                                    placeholder="0"
                                />
                            </Box>
                        </Stack>

                        <TextField
                            label="Notes (Optional)"
                            multiline
                            rows={2}
                            size="small"
                            value={shareForm.notes}
                            onChange={(e) => setShareForm({ ...shareForm, notes: e.target.value })}
                        />

                        {/* Task List Table */}
                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300, mt: 2 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Product Title</TableCell>
                                        <TableCell width={220}>Store</TableCell>
                                        <TableCell width={120}>Quantity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedTaskIds.map(id => {
                                        const task = tasks.find(r => r._id === id);
                                        const itemState = bulkItems[id] || {};

                                        if (!task) return null;
                                        return (
                                            <TableRow key={id}>
                                                <TableCell>{task.task?.productTitle}</TableCell>
                                                <TableCell>
                                                    <FormControl fullWidth size="small">
                                                        <Select
                                                            value={itemState.storeId || ''}
                                                            onChange={(e) => handleBulkItemChange(id, 'storeId', e.target.value)}
                                                            displayEmpty
                                                        >
                                                            <MenuItem value="" disabled><em>Select Store</em></MenuItem>
                                                            {stores.map((s) => (
                                                                <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                                                            ))}
                                                        </Select>
                                                    </FormControl>
                                                </TableCell>
                                                <TableCell>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={itemState.quantity || ''}
                                                        onChange={(e) => handleBulkItemChange(id, 'quantity', e.target.value)}
                                                        placeholder="Qty"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkShareOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleBulkSubmit}>Share All</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
