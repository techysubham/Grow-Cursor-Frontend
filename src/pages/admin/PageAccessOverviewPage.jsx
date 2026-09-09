import React, { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Alert, Box, CircularProgress, Chip,
  TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, IconButton, Stack, FormControlLabel, Switch, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import GroupIcon from '@mui/icons-material/Group';
import api from '../../lib/api';
import { PAGE_REGISTRY, PAGE_CATEGORIES } from '../../constants/pages';

// How a user ends up with access to a page. Mirrors buildPermissionSnapshot()
// in server/src/lib/pageAccessAudit.js and the usePageAccess hook.
const SOURCE_META = {
  superadmin: { label: 'Superadmin', color: 'error', help: 'Superadmins always have access to every page.' },
  custom: { label: 'Custom grant', color: 'warning', help: 'Granted explicitly in Page Access Management.' },
  role: { label: 'Role default', color: 'default', help: 'Inherited from the role, not granted individually.' },
};

// Pages a role gets by default — the same rule the management page applies.
const defaultPagesForRole = (role) =>
  PAGE_REGISTRY.filter((p) => p.defaultRoles.includes(role)).map((p) => p.id);

export default function PageAccessOverviewPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [showSuperadmins, setShowSuperadmins] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState(null); // { page, user }
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/users');
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Reverse index: page -> everyone who can currently reach it.
  const pageAccess = useMemo(() => {
    return PAGE_REGISTRY.map((page) => {
      const accessors = [];
      users.forEach((user) => {
        if (user.role === 'superadmin') {
          accessors.push({ ...user, source: 'superadmin' });
        } else if (user.useCustomPermissions) {
          if ((user.pagePermissions || []).includes(page.id)) {
            accessors.push({ ...user, source: 'custom' });
          }
        } else if (page.defaultRoles.includes(user.role)) {
          accessors.push({ ...user, source: 'role' });
        }
      });
      accessors.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
      return {
        page,
        accessors,
        customCount: accessors.filter((a) => a.source === 'custom').length,
        roleCount: accessors.filter((a) => a.source === 'role').length,
        // Superadmins reach everything, so they are never the interesting number.
        realCount: accessors.filter((a) => a.source !== 'superadmin').length,
      };
    });
  }, [users]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pageAccess.filter(({ page, accessors, realCount }) => {
      if (categoryFilter !== 'all' && page.category !== categoryFilter) return false;
      if (accessFilter === 'withUsers' && realCount === 0) return false;
      if (accessFilter === 'noUsers' && realCount > 0) return false;
      if (!q) return true;
      const pageHit =
        page.name.toLowerCase().includes(q) ||
        page.path.toLowerCase().includes(q) ||
        page.id.toLowerCase().includes(q);
      const userHit = accessors.some(
        (a) => a.username?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)
      );
      return pageHit || userHit;
    });
  }, [pageAccess, search, categoryFilter, accessFilter]);

  const stats = useMemo(() => ({
    pages: PAGE_REGISTRY.length,
    orphanPages: pageAccess.filter((row) => row.realCount === 0).length,
    activeUsers: users.filter((u) => u.role !== 'superadmin').length,
    customUsers: users.filter((u) => u.role !== 'superadmin' && u.useCustomPermissions).length,
  }), [pageAccess, users]);

  const confirmRemoval = async () => {
    if (!pendingRemoval) return;
    const { page, user } = pendingRemoval;
    setRemoving(true);
    setError('');
    setSuccess('');
    try {
      // A role-default user cannot lose a single page while still inheriting the
      // role, so removing one converts them to custom permissions seeded with
      // their current role defaults minus this page.
      const basePages = user.useCustomPermissions
        ? (user.pagePermissions || [])
        : defaultPagesForRole(user.role);
      const nextPages = basePages.filter((id) => id !== page.id);

      await api.put(`/users/${user._id}/page-permissions`, {
        pagePermissions: nextPages,
        useCustomPermissions: true,
      });

      setUsers((prev) => prev.map((u) => (
        u._id === user._id
          ? { ...u, pagePermissions: nextPages, useCustomPermissions: true }
          : u
      )));
      setSuccess(`Removed "${page.name}" from ${user.username}.`);
      setPendingRemoval(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove access.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon color="primary" />
            Page Access Overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 780 }}>
            Every page and who can currently reach it. Page Access Management answers what a single
            user can see; this answers the reverse — how many people hold each page, and how they got it.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<GroupIcon />}
            component={RouterLink}
            to="/admin/page-access-management"
          >
            Manage by User
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon />}
            component={RouterLink}
            to="/admin/page-access-audit-log"
          >
            Audit Log
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { label: 'Pages', value: stats.pages },
          {
            label: 'Pages nobody can reach',
            value: stats.orphanPages,
            color: stats.orphanPages > 0 ? 'warning.main' : 'text.primary',
          },
          { label: 'Active users (non-superadmin)', value: stats.activeUsers },
          { label: 'On custom permissions', value: stats.customUsers },
        ].map((card) => (
          <Paper key={card.label} sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">{card.label}</Typography>
            <Typography variant="h5" fontWeight={700} sx={{ color: card.color || 'text.primary' }}>
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            placeholder="Search page or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <MenuItem value="all">All categories</MenuItem>
              {Object.values(PAGE_CATEGORIES).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Access</InputLabel>
            <Select label="Access" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value)}>
              <MenuItem value="all">All pages</MenuItem>
              <MenuItem value="withUsers">Has users</MenuItem>
              <MenuItem value="noUsers">Nobody has access</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={showSuperadmins} onChange={(e) => setShowSuperadmins(e.target.checked)} />}
            label="Show superadmins"
          />
        </Stack>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Showing {visibleRows.length} of {PAGE_REGISTRY.length} pages
      </Typography>

      {/* Page list */}
      {visibleRows.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">No pages match these filters.</Typography>
        </Paper>
      ) : visibleRows.map(({ page, accessors, customCount, roleCount, realCount }) => {
        const listed = showSuperadmins ? accessors : accessors.filter((a) => a.source !== 'superadmin');
        return (
          <Accordion key={page.id} disableGutters sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%', pr: 2 }} flexWrap="wrap">
                <Typography sx={{ fontWeight: 600, flexGrow: 1, minWidth: 200 }}>
                  {page.name}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.disabled"
                    sx={{ ml: 1, fontFamily: 'monospace' }}
                  >
                    {page.path}
                  </Typography>
                </Typography>
                <Chip size="small" variant="outlined" label={PAGE_CATEGORIES[page.category]?.name || page.category} />
                {roleCount > 0 && <Chip size="small" variant="outlined" label={`${roleCount} by role`} />}
                {customCount > 0 && <Chip size="small" color="warning" variant="outlined" label={`${customCount} custom`} />}
                <Chip
                  size="small"
                  color={realCount === 0 ? 'default' : 'primary'}
                  label={realCount === 0 ? 'No users' : `${realCount} user${realCount !== 1 ? 's' : ''}`}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Divider />
              {listed.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Only superadmins can reach this page.
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Default roles: {page.defaultRoles.join(', ')}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                        <TableCell>User</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Access via</TableCell>
                        <TableCell align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {listed.map((user) => {
                        const meta = SOURCE_META[user.source];
                        return (
                          <TableRow key={`${page.id}-${user._id}`} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{user.email || '—'}</TableCell>
                            <TableCell>
                              <Chip size="small" variant="outlined" label={user.role} />
                            </TableCell>
                            <TableCell>
                              <Tooltip title={meta.help} arrow>
                                <Chip size="small" color={meta.color} variant="outlined" label={meta.label} />
                              </Tooltip>
                            </TableCell>
                            <TableCell align="right">
                              {user.source === 'superadmin' ? (
                                <Tooltip title="Superadmin access cannot be removed here" arrow>
                                  <span>
                                    <IconButton size="small" disabled><LockIcon fontSize="small" /></IconButton>
                                  </span>
                                </Tooltip>
                              ) : (
                                <Button
                                  size="small"
                                  color="error"
                                  startIcon={<PersonRemoveIcon />}
                                  onClick={() => setPendingRemoval({ page, user })}
                                >
                                  Remove
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Remove confirmation */}
      <Dialog
        open={Boolean(pendingRemoval)}
        onClose={() => !removing && setPendingRemoval(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove page access</DialogTitle>
        <DialogContent>
          {pendingRemoval && (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Remove <b>{pendingRemoval.page.name}</b> from <b>{pendingRemoval.user.username}</b>?
              </Typography>

              {pendingRemoval.user.useCustomPermissions ? (
                <Alert severity="info">
                  This user is already on custom permissions. Only this page is removed — everything
                  else they hold stays untouched.
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    This switches {pendingRemoval.user.username} to custom permissions.
                  </Typography>
                  They inherit pages from the <b>{pendingRemoval.user.role}</b> role today. A single
                  page cannot be dropped while inheriting, so they will be pinned to every page that
                  role currently has, minus this one. Nothing else changes now — but they will stop
                  picking up future changes to the {pendingRemoval.user.role} role.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRemoval(null)} disabled={removing}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmRemoval}
            disabled={removing}
            startIcon={removing ? <CircularProgress size={16} color="inherit" /> : <PersonRemoveIcon />}
          >
            Remove access
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
