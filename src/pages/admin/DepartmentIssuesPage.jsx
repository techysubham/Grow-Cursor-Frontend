import { useState, useEffect, useMemo } from 'react';
import {
    Box, Paper, Typography, Button, Stack, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, FormControl, InputLabel,
    Select, MenuItem, IconButton, CircularProgress, Alert, Divider,
    Card, CardContent, CardActionArea, Grid, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ReplayIcon from '@mui/icons-material/Replay';
import api from '../../lib/api.js';

// ─── Constants ─────────────────────────────────────────────────────────────
const ADMIN_ROLES = [
    'superadmin', 'productadmin', 'listingadmin', 'compatibilityadmin',
    'fulfillmentadmin', 'hradmin', 'operationhead', 'hoc', 'compliancemanager'
];
const SUPER_ROLES = ['superadmin', 'hradmin'];

const DEPARTMENTS = [
    'HR', 'Operations', 'Listing', 'Product Research', 'Compatibility', 'Compliance'
];

const STATUS_CONFIG = {
    open: { label: 'Open', color: 'warning', bgColor: '#fff3cd', textColor: '#856404' },
    'in-progress': { label: 'In Progress', color: 'info', bgColor: '#cfe2ff', textColor: '#084298' },
    completed: { label: 'Closed', color: 'success', bgColor: '#d1e7dd', textColor: '#0a3622' },
};

const PRIORITY_CONFIG = {
    low: { color: 'success' },
    medium: { color: 'warning' },
    high: { color: 'error' },
};

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, count, icon, bgColor, textColor }) {
    return (
        <Paper elevation={2} sx={{ flex: 1, minWidth: 130, p: 2, borderRadius: 2, bgcolor: bgColor }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ color: textColor }}>{icon}</Box>
                <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: textColor, lineHeight: 1 }}>{count}</Typography>
                    <Typography variant="caption" sx={{ color: textColor, opacity: 0.85 }}>{label}</Typography>
                </Box>
            </Stack>
        </Paper>
    );
}

// ─── Issue Card ────────────────────────────────────────────────────────────
function IssueCard({ issue, onSelect }) {
    const statusCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
    const truncated = issue.description?.length > 120
        ? issue.description.slice(0, 120) + '…'
        : issue.description;

    return (
        <Card elevation={1} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', transition: '0.15s', '&:hover': { boxShadow: 4, borderColor: 'primary.main' } }}>
            <CardActionArea onClick={() => onSelect(issue)} sx={{ p: 0 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>

                    {/* Top row: chips */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                        <Chip
                            label={statusCfg.label}
                            size="small"
                            sx={{ bgcolor: statusCfg.bgColor, color: statusCfg.textColor, fontWeight: 600, fontSize: '0.7rem' }}
                        />
                        <Chip
                            label={issue.priority?.toUpperCase()}
                            size="small"
                            color={PRIORITY_CONFIG[issue.priority]?.color || 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                        />
                        {issue.department && (
                            <Chip label={issue.department} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.7rem' }} />
                        )}
                    </Stack>

                    {/* Title */}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5, lineHeight: 1.3, color: 'text.primary' }}>
                        {issue.title}
                    </Typography>

                    {/* Truncated description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5, minHeight: 40 }}>
                        {truncated}
                    </Typography>

                    {/* Footer */}
                    <Divider sx={{ mb: 1 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                            By <strong>{issue.createdBy}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {formatDate(issue.createdAt)}
                        </Typography>
                    </Stack>

                </CardContent>
            </CardActionArea>
        </Card>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function DepartmentIssuesPage() {
    const currentUser = useMemo(() => {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    }, []);

    const isAdmin = ADMIN_ROLES.includes(currentUser?.role);
    const isSuperRole = SUPER_ROLES.includes(currentUser?.role);

    // ── State ──
    const [issues, setIssues] = useState([]);
    const [stats, setStats] = useState({ total: 0, byStatus: { open: 0, inProgress: 0, completed: 0 } });
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    // Resolve the user's default department (auto-detected from role or profile)
    const defaultDepartment = useMemo(() => {
        if (isSuperRole) return '';
        // Try to find their dept from the ROLE_DEPARTMENT_MAP
        const ROLE_DEPT_MAP = {
            operationhead: 'Operations', listingadmin: 'Listing', productadmin: 'Product Research',
            compatibilityadmin: 'Compatibility', fulfillmentadmin: 'Operations',
            hoc: 'Compliance', compliancemanager: 'Compliance'
        };
        return ROLE_DEPT_MAP[currentUser?.role] || currentUser?.department || '';
    }, [currentUser, isSuperRole]);

    const [form, setForm] = useState({ title: '', description: '', priority: 'medium', department: defaultDepartment });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── Fetch ──
    useEffect(() => {
        fetchIssues();
        fetchStats();
    }, [filterStatus, filterDepartment]);

    async function fetchIssues() {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            params.set('limit', '100');
            params.set('source', 'department');  // Only fetch Department Issues records
            params.set('sortBy', 'createdAt');
            params.set('sortOrder', 'desc');
            if (filterStatus) params.set('status', filterStatus);
            // Department filter only sent for super roles; server ignores it otherwise
            if (filterDepartment && isSuperRole) params.set('department', filterDepartment);

            const { data } = await api.get(`/ideas?${params}`);
            setIssues(data.ideas || []);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to load issues');
        } finally {
            setLoading(false);
        }
    }

    async function fetchStats() {
        try {
            const { data } = await api.get('/ideas/stats/summary');
            setStats(data);
        } catch {
            // non-critical
        }
    }

    // ── Create Issue ──
    async function handleCreate() {
        if (!form.title || !form.description) {
            setError('Title and description are required');
            return;
        }
        if (!form.department) {
            setError('Department is required. Please select a department.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                title: form.title,
                description: form.description,
                priority: form.priority,
                department: form.department,
                source: 'department',  // Tag this as a department issue
            };

            await api.post('/ideas', payload);
            setCreateOpen(false);
            setForm({ title: '', description: '', priority: 'medium', department: defaultDepartment });
            fetchIssues();
            fetchStats();
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to create issue');
        } finally {
            setSaving(false);
        }
    }

    // ── Status Change ──
    async function handleStatusChange(issueId, newStatus) {
        try {
            // Optimistic UI
            setIssues(prev => prev.map(i => i._id === issueId ? { ...i, status: newStatus } : i));
            if (selectedIssue?._id === issueId) setSelectedIssue(prev => ({ ...prev, status: newStatus }));
            setStats(prev => {
                const oldStatus = issues.find(i => i._id === issueId)?.status;
                const byStatus = { ...prev.byStatus };
                if (oldStatus === 'open') byStatus.open = Math.max(0, byStatus.open - 1);
                if (oldStatus === 'in-progress') byStatus.inProgress = Math.max(0, byStatus.inProgress - 1);
                if (oldStatus === 'completed') byStatus.completed = Math.max(0, byStatus.completed - 1);
                if (newStatus === 'open') byStatus.open += 1;
                if (newStatus === 'in-progress') byStatus.inProgress += 1;
                if (newStatus === 'completed') byStatus.completed += 1;
                return { ...prev, byStatus };
            });
            await api.patch(`/ideas/${issueId}`, { status: newStatus });
        } catch (err) {
            fetchIssues();
        }
    }

    // ── Delete ──
    async function handleDelete(issueId) {
        if (!window.confirm('Delete this issue?')) return;
        try {
            setIssues(prev => prev.filter(i => i._id !== issueId));
            setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            setSelectedIssue(null);
            await api.delete(`/ideas/${issueId}`);
            fetchStats();
        } catch (err) {
            fetchIssues();
            alert(err?.response?.data?.error || 'Delete failed');
        }
    }

    const selectedStatusCfg = selectedIssue ? STATUS_CONFIG[selectedIssue.status] || STATUS_CONFIG.open : null;

    return (
        <Box>
            {/* ── Header ── */}
            <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <BugReportIcon sx={{ color: 'white', fontSize: 32 }} />
                        <Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>
                                Department Issues
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                                {isSuperRole ? 'Tracking all department issues' : isAdmin ? `Tracking ${currentUser?.department || 'department'} issues` : 'Your submitted issues'}
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Refresh">
                            <IconButton onClick={() => { fetchIssues(); fetchStats(); }} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setCreateOpen(true)}
                            sx={{ bgcolor: 'white', color: 'primary.main', fontWeight: 700, '&:hover': { bgcolor: 'grey.100' } }}
                        >
                            New Issue
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {/* ── Stats Bar ── */}
            <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
                <StatCard
                    label="Open"
                    count={stats.byStatus?.open || 0}
                    icon={<HourglassEmptyIcon />}
                    bgColor="#fff3cd"
                    textColor="#856404"
                />
                <StatCard
                    label="In Progress"
                    count={stats.byStatus?.inProgress || 0}
                    icon={<BugReportIcon />}
                    bgColor="#cfe2ff"
                    textColor="#084298"
                />
                <StatCard
                    label="Closed"
                    count={stats.byStatus?.completed || 0}
                    icon={<CheckCircleIcon />}
                    bgColor="#d1e7dd"
                    textColor="#0a3622"
                />
                <StatCard
                    label="Total"
                    count={stats.total || 0}
                    icon={<BugReportIcon />}
                    bgColor="#e9ecef"
                    textColor="#495057"
                />
            </Stack>

            {/* ── Filters ── */}
            <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                    <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ minWidth: 60 }}>
                        Filters
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                            <MenuItem value="">All Statuses</MenuItem>
                            <MenuItem value="open">Open</MenuItem>
                            <MenuItem value="in-progress">In Progress</MenuItem>
                            <MenuItem value="completed">Closed</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Department filter – only visible to hradmin / superadmin */}
                    {isSuperRole && (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Department</InputLabel>
                            <Select value={filterDepartment} label="Department" onChange={e => setFilterDepartment(e.target.value)}>
                                <MenuItem value="">All Departments</MenuItem>
                                {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}

                    {(filterStatus || filterDepartment) && (
                        <Button size="small" variant="outlined" onClick={() => { setFilterStatus(''); setFilterDepartment(''); }}>
                            Clear
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* ── Error ── */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Issue Grid ── */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            ) : issues.length === 0 ? (
                <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
                    <BugReportIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="h6" color="text.secondary">No issues found</Typography>
                    <Typography variant="body2" color="text.disabled" mt={0.5}>
                        Create your first issue using the "New Issue" button above.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {issues.map(issue => (
                        <Grid item xs={12} sm={6} md={4} key={issue._id}>
                            <IssueCard issue={issue} onSelect={setSelectedIssue} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ─────────────────────────────────────────────
          Issue Detail Modal
      ───────────────────────────────────────────── */}
            <Dialog open={!!selectedIssue} onClose={() => setSelectedIssue(null)} maxWidth="sm" fullWidth>
                {selectedIssue && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Box flex={1} pr={2}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ wordBreak: 'break-word' }}>
                                        {selectedIssue.title}
                                    </Typography>
                                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                                        <Chip
                                            label={selectedStatusCfg.label}
                                            size="small"
                                            sx={{ bgcolor: selectedStatusCfg.bgColor, color: selectedStatusCfg.textColor, fontWeight: 700 }}
                                        />
                                        <Chip
                                            label={selectedIssue.priority?.toUpperCase()}
                                            size="small"
                                            color={PRIORITY_CONFIG[selectedIssue.priority]?.color || 'default'}
                                            variant="outlined"
                                        />
                                        {selectedIssue.department && (
                                            <Chip label={selectedIssue.department} size="small" variant="outlined" color="primary" />
                                        )}
                                    </Stack>
                                </Box>
                                {/* Delete — admin only */}
                                {isAdmin && (
                                    <Tooltip title="Delete issue">
                                        <IconButton color="error" onClick={() => handleDelete(selectedIssue._id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Stack>
                        </DialogTitle>

                        <DialogContent dividers>
                            <Stack spacing={2}>
                                {/* Description */}
                                <Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={0.5}>Description</Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                        {selectedIssue.description}
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* Meta */}
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Created By</Typography>
                                        <Typography variant="body2" fontWeight={600}>{selectedIssue.createdBy}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Department</Typography>
                                        <Typography variant="body2" fontWeight={600}>{selectedIssue.department || '—'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Created At</Typography>
                                        <Typography variant="body2">{formatDate(selectedIssue.createdAt)}</Typography>
                                    </Grid>
                                    {selectedIssue.resolvedAt && (
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary" display="block">Resolved At</Typography>
                                            <Typography variant="body2">{formatDate(selectedIssue.resolvedAt)}</Typography>
                                        </Grid>
                                    )}
                                </Grid>

                                {/* Admin Status Actions */}
                                {isAdmin && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" color="primary" mb={1}>
                                                Update Status
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                <Button
                                                    size="small"
                                                    variant={selectedIssue.status === 'in-progress' ? 'contained' : 'outlined'}
                                                    color="info"
                                                    startIcon={<BugReportIcon />}
                                                    onClick={() => handleStatusChange(selectedIssue._id, 'in-progress')}
                                                    disabled={selectedIssue.status === 'in-progress'}
                                                >
                                                    Mark In Progress
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant={selectedIssue.status === 'completed' ? 'contained' : 'outlined'}
                                                    color="success"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => handleStatusChange(selectedIssue._id, 'completed')}
                                                    disabled={selectedIssue.status === 'completed'}
                                                >
                                                    Close Issue
                                                </Button>
                                                {selectedIssue.status !== 'open' && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="warning"
                                                        startIcon={<ReplayIcon />}
                                                        onClick={() => handleStatusChange(selectedIssue._id, 'open')}
                                                    >
                                                        Reopen
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </DialogContent>

                        <DialogActions>
                            <Button onClick={() => setSelectedIssue(null)}>Close</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ─────────────────────────────────────────────
          Create Issue Dialog
      ───────────────────────────────────────────── */}
            <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setError(''); }} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <AddIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">New Department Issue</Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2} pt={1}>
                        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

                        <TextField
                            label="Title"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            fullWidth
                            required
                            placeholder="Brief summary of the issue"
                        />

                        <TextField
                            label="Description"
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            fullWidth
                            required
                            multiline
                            minRows={4}
                            placeholder="Describe the issue in detail…"
                        />

                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select value={form.priority} label="Priority" onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Department – required for ALL users, pre-selected from their role/profile */}
                        <FormControl fullWidth required>
                            <InputLabel>Department</InputLabel>
                            <Select
                                value={form.department}
                                label="Department"
                                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                                error={!form.department}
                            >
                                <MenuItem value="" disabled>Select a department</MenuItem>
                                {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => { setCreateOpen(false); setError(''); }}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : 'Submit Issue'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
