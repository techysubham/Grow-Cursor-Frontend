import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Paper, Alert,
  Checkbox, ListItemText, OutlinedInput, Chip, InputAdornment,
  Typography, useMediaQuery, useTheme, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import api from '../../lib/api.js';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx } from '../../theme/tableStyles.js';

export default function ProductResearchPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // ── Style tokens ──────────────────────────────────────────────────────────
  const inputFocusSx = {
    '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '& fieldset': { transition: 'border-color 0.2s ease' },
      '&:hover fieldset': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
      '&.Mui-focused fieldset': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
    },
    '& input': { accentColor: BRAND_YELLOW }
  };

  const selectFocusSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
    },
    '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
  };

  const menuProps = {
    PaperProps: {
      sx: {
        '& .MuiMenuItem-root.Mui-selected': {
          backgroundColor: alpha(BRAND_YELLOW, 0.2),
          '&:hover': { backgroundColor: alpha(BRAND_YELLOW, 0.3) }
        },
        '& .MuiMenuItem-root:hover': {
          backgroundColor: alpha(BRAND_YELLOW, 0.08),
        }
      }
    }
  };

  const darkButtonSx = {
    minHeight: 36, px: 2, borderRadius: 1.5,
    color: '#fff', backgroundColor: BRAND_DARK, fontWeight: 700,
    '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.82) },
    '&.Mui-disabled': { color: alpha('#fff', 0.35), backgroundColor: alpha(BRAND_DARK, 0.38) },
  };

  const outlinedButtonSx = {
    minHeight: 36, px: 2, borderRadius: 1.5,
    color: BRAND_DARK, borderColor: alpha(BRAND_DARK, 0.3), fontWeight: 600,
    '&:hover': { borderColor: BRAND_YELLOW, backgroundColor: alpha(BRAND_YELLOW, 0.08) },
    '&.Mui-disabled': { borderColor: alpha(BRAND_DARK, 0.15), color: alpha(BRAND_DARK, 0.3) },
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sourcePlatforms, setSourcePlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [form, setForm] = useState({ productTitle: '', supplierLink: '', sourcePlatformId: '', categoryId: '', subcategoryId: '', marketplace: '' });
  const [errors, setErrors] = useState({});

  // Filter states
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesTitle = !searchTitle ||
        row.productTitle?.toLowerCase().includes(searchTitle.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.includes(row.category?._id);
      return matchesTitle && matchesCategory;
    });
  }, [rows, searchTitle, selectedCategories]);

  const marketplaces = [
    { value: 'EBAY_US', label: 'eBay US' },
    { value: 'EBAY_AUS', label: 'eBay Australia' },
    { value: 'EBAY_CANADA', label: 'eBay Canada' }
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: tasks }, { data: sp }, { data: c }] = await Promise.all([
        api.get('/tasks'),
        api.get('/platforms', { params: { type: 'source' } }),
        api.get('/categories')
      ]);
      setRows(tasks.tasks || tasks);
      setSourcePlatforms(sp);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (form.categoryId) {
      api.get('/subcategories', { params: { categoryId: form.categoryId } })
        .then(({ data }) => setSubcategories(data));
    } else {
      setSubcategories([]);
      setForm({ ...form, subcategoryId: '' });
    }
  }, [form.categoryId]);

  const validate = () => {
    const errs = {};
    if (!form.productTitle) errs.productTitle = 'Required';
    if (!form.supplierLink) errs.supplierLink = 'Required';
    if (!form.sourcePlatformId) errs.sourcePlatformId = 'Required';
    if (!form.categoryId) errs.categoryId = 'Required';
    if (!form.subcategoryId) errs.subcategoryId = 'Required';
    if (!form.marketplace) errs.marketplace = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const payload = {
      productTitle: form.productTitle,
      supplierLink: form.supplierLink,
      sourcePlatformId: form.sourcePlatformId,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId,
      marketplace: form.marketplace
    };
    await api.post('/tasks', payload);
    setOpen(false);
    setForm({ productTitle: '', supplierLink: '', sourcePlatformId: '', categoryId: '', subcategoryId: '', marketplace: '' });
    setErrors({});
    await load();
  };

  const openDelete = (row) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ display: 'flex', p: 1, borderRadius: 2, backgroundColor: alpha(BRAND_YELLOW, 0.2) }}>
            <ScienceIcon sx={{ color: BRAND_YELLOW_DARK, fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND_DARK, letterSpacing: -0.5 }}>
            Product Research
          </Typography>
        </Stack>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          fullWidth={isMobile}
          sx={darkButtonSx}
        >
          Create
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND_YELLOW }} />
        </Box>
      ) : (
        <>
          {/* Filter Section */}
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ xs: 'stretch', lg: 'center' }}>
              {/* Product Title Search */}
              <TextField
                label="Search Product Title"
                size="small"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                fullWidth={isMobile}
                sx={{ minWidth: { xs: '100%', md: '100%', lg: 250 }, ...inputFocusSx }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: alpha(BRAND_DARK, 0.5) }} />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Category Multi-Select */}
              <FormControl
                size="small"
                fullWidth={isMobile}
                sx={{ minWidth: { xs: '100%', md: '100%', lg: 300 }, ...selectFocusSx }}
              >
                <InputLabel>Filter by Category</InputLabel>
                <Select
                  multiple
                  value={selectedCategories}
                  onChange={(e) => setSelectedCategories(e.target.value)}
                  input={<OutlinedInput label="Filter by Category" />}
                  MenuProps={menuProps}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: '100%' }}>
                      {selected.map((id) => {
                        const cat = categories.find(c => c._id === id);
                        return (
                          <Chip
                            key={id}
                            label={cat?.name || id}
                            size="small"
                            sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_YELLOW, 0.15), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.4)}` }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat._id}>
                      <Checkbox
                        checked={selectedCategories.includes(cat._id)}
                        sx={{
                          '&.Mui-checked': { color: BRAND_YELLOW_DARK },
                        }}
                      />
                      <ListItemText primary={cat.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Clear Filters Button */}
              {(searchTitle || selectedCategories.length > 0) && (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth={isMobile}
                  onClick={() => {
                    setSearchTitle('');
                    setSelectedCategories([]);
                  }}
                  sx={outlinedButtonSx}
                >
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Paper>

          {/* MOBILE: Card view */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={1.5}>
              {filteredRows.map((r, idx) => (
                <Paper key={r._id} elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          #{idx + 1} • {r.date ? new Date(r.date).toLocaleDateString() : '-'}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                          {r.productTitle || '-'}
                        </Typography>
                      </Box>
                      <Button size="small" sx={{ ...outlinedButtonSx, color: '#d32f2f', borderColor: alpha('#d32f2f', 0.4), '&:hover': { borderColor: '#d32f2f', backgroundColor: alpha('#d32f2f', 0.08) } }} onClick={() => openDelete(r)}>
                        Delete
                      </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={r.sourcePlatform?.name || 'Source: -'} sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.06), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.15)}` }} />
                      <Chip size="small" label={r.marketplace?.replace('EBAY_', 'eBay ').replace('_', ' ') || 'Marketplace: -'} sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_YELLOW, 0.12), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.35)}` }} />
                      <Chip size="small" label={r.category?.name || 'Category: -'} sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.06), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.15)}` }} />
                      <Chip size="small" label={r.subcategory?.name || 'Subcategory: -'} sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.06), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.15)}` }} />
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
                        Created by: {r.createdBy?.username || '-'}
                      </Typography>
                      {r.supplierLink ? (
                        <Button
                          size="small"
                          variant="outlined"
                          component="a"
                          href={r.supplierLink}
                          target="_blank"
                          rel="noreferrer"
                          sx={outlinedButtonSx}
                        >
                          Supplier Link
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* DESKTOP: Table view */}
          <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>SL No</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Date</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Product Title</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Supplier Link</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Source Platform</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Marketplace</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Category</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Subcategory</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Created By</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="center">Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((r, idx) => (
                  <TableRow key={r._id} sx={tableBodyRowSx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{r.productTitle}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        component="a"
                        href={r.supplierLink}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ ...outlinedButtonSx, minHeight: 28, px: 1.5, fontSize: '0.75rem' }}
                      >
                        Link
                      </Button>
                    </TableCell>
                    <TableCell>{r.sourcePlatform?.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.marketplace?.replace('EBAY_', 'eBay ').replace('_', ' ') || '-'}
                        size="small"
                        sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_YELLOW, 0.12), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.35)}` }}
                      />
                    </TableCell>
                    <TableCell>{r.category?.name || '-'}</TableCell>
                    <TableCell>{r.subcategory?.name || '-'}</TableCell>
                    <TableCell>{r.createdBy?.username || '-'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => openDelete(r)}
                          sx={{ color: alpha('#d32f2f', 0.7), '&:hover': { color: '#d32f2f', backgroundColor: alpha('#d32f2f', 0.08) } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Create Dialog */}
          <Dialog open={open} onClose={() => { setOpen(false); setErrors({}); }} maxWidth="md" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ fontWeight: 700, color: BRAND_DARK }}>Create Product Research</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Product Title"
                  value={form.productTitle}
                  onChange={(e) => setForm({ ...form, productTitle: e.target.value })}
                  error={!!errors.productTitle}
                  helperText={errors.productTitle}
                  required
                  sx={inputFocusSx}
                />
                <TextField
                  label="Supplier Link"
                  value={form.supplierLink}
                  onChange={(e) => setForm({ ...form, supplierLink: e.target.value })}
                  error={!!errors.supplierLink}
                  helperText={errors.supplierLink}
                  required
                  sx={inputFocusSx}
                />
                <FormControl fullWidth error={!!errors.sourcePlatformId} sx={selectFocusSx}>
                  <InputLabel>Source Platform</InputLabel>
                  <Select label="Source Platform" value={form.sourcePlatformId} onChange={(e) => setForm({ ...form, sourcePlatformId: e.target.value })} required MenuProps={menuProps}>
                    {sourcePlatforms.map((p) => (<MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>))}
                  </Select>
                  {errors.sourcePlatformId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.sourcePlatformId}</Alert> : null}
                </FormControl>
                <FormControl fullWidth error={!!errors.marketplace} sx={selectFocusSx}>
                  <InputLabel>Marketplace</InputLabel>
                  <Select label="Marketplace" value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} required MenuProps={menuProps}>
                    {marketplaces.map((m) => (<MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>))}
                  </Select>
                  {errors.marketplace ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.marketplace}</Alert> : null}
                </FormControl>
                <FormControl fullWidth error={!!errors.categoryId} sx={selectFocusSx}>
                  <InputLabel>Category</InputLabel>
                  <Select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })} required MenuProps={menuProps}>
                    {categories.map((c) => (<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
                  </Select>
                  {errors.categoryId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.categoryId}</Alert> : null}
                </FormControl>
                <FormControl fullWidth error={!!errors.subcategoryId} disabled={!form.categoryId} sx={selectFocusSx}>
                  <InputLabel>Subcategory</InputLabel>
                  <Select label="Subcategory" value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} required MenuProps={menuProps}>
                    {subcategories.map((s) => (<MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>))}
                  </Select>
                  {errors.subcategoryId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.subcategoryId}</Alert> : null}
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button onClick={() => { setOpen(false); setErrors({}); }} sx={outlinedButtonSx} variant="outlined">Cancel</Button>
              <Button variant="contained" onClick={handleCreate} sx={darkButtonSx}>Save</Button>
            </DialogActions>
          </Dialog>

          {/* Delete Confirm Dialog */}
          <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
            <DialogTitle sx={{ fontWeight: 700, color: BRAND_DARK }}>Confirm Delete</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mt: 1 }}>
                Are you sure you want to delete this task? This will also delete all related assignments and compatibility assignments. This action cannot be undone.
              </Alert>
              {deleteTarget && (
                <Box sx={{ mt: 2 }}>
                  <strong>Product:</strong> {deleteTarget.productTitle}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button onClick={() => setDeleteOpen(false)} sx={outlinedButtonSx} variant="outlined">Cancel</Button>
              <Button
                variant="contained"
                onClick={handleDelete}
                sx={{ ...darkButtonSx, backgroundColor: '#d32f2f', '&:hover': { backgroundColor: '#b71c1c' } }}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
