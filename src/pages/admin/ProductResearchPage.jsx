import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Paper, Alert
} from '@mui/material';
import api from '../../lib/api.js';

export default function ProductResearchPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sourcePlatforms, setSourcePlatforms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [form, setForm] = useState({ productTitle: '', supplierLink: '', sourcePrice: '', sellingPrice: '', sourcePlatformId: '', categoryId: '', subcategoryId: '' });
  const [errors, setErrors] = useState({});
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  const load = async () => {
    const [{ data: tasks }, { data: sp }, { data: c }] = await Promise.all([
      api.get('/tasks'),
      api.get('/platforms', { params: { type: 'source' } }),
      api.get('/categories')
    ]);
    setRows(tasks.tasks || tasks);
    setSourcePlatforms(sp);
    setCategories(c);
  };

  useEffect(() => { load(); }, []);

  // Load subcategories when category is selected
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
    if (!form.sourcePrice || form.sourcePrice <= 0) errs.sourcePrice = 'Required and must be > 0';
    if (!form.sellingPrice || form.sellingPrice <= 0) errs.sellingPrice = 'Required and must be > 0';
    if (!form.sourcePlatformId) errs.sourcePlatformId = 'Required';
    if (!form.categoryId) errs.categoryId = 'Required';
    if (!form.subcategoryId) errs.subcategoryId = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    const payload = {
      productTitle: form.productTitle,
      supplierLink: form.supplierLink,
      sourcePrice: Number(form.sourcePrice),
      sellingPrice: Number(form.sellingPrice),
      sourcePlatformId: form.sourcePlatformId,
      categoryId: form.categoryId,
      subcategoryId: form.subcategoryId
    };
    await api.post('/tasks', payload);
    setOpen(false);
    setForm({ productTitle: '', supplierLink: '', sourcePrice: '', sellingPrice: '', sourcePlatformId: '', categoryId: '', subcategoryId: '' });
    setErrors({});
    await load();
  };

  const openEdit = (row) => {
    setEditing({ 
      ...row, 
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      categoryId: row.category?._id || row.category,
      subcategoryId: row.subcategory?._id || row.subcategory,
      sourcePlatformId: row.sourcePlatform?._id || row.sourcePlatform
    });
    setEditOpen(true);
  };

  // Load subcategories when editing category changes
  useEffect(() => {
    if (editing?.categoryId) {
      api.get('/subcategories', { params: { categoryId: editing.categoryId } })
        .then(({ data }) => setSubcategories(data));
    } else if (editing) {
      setSubcategories([]);
    }
  }, [editing?.categoryId]);

  const saveEdit = async () => {
    if (!editing.date || !editing.productTitle || !editing.supplierLink || !editing.sourcePrice || !editing.sellingPrice || !editing.sourcePlatformId || !editing.categoryId || !editing.subcategoryId) {
      alert('All fields are required');
      return;
    }
    const payload = {
      date: editing.date,
      productTitle: editing.productTitle,
      supplierLink: editing.supplierLink,
      sourcePrice: Number(editing.sourcePrice),
      sellingPrice: Number(editing.sellingPrice),
      sourcePlatformId: editing.sourcePlatformId,
      categoryId: editing.categoryId,
      subcategoryId: editing.subcategoryId
    };
    await api.put(`/tasks/${editing._id}`, payload);
    setEditOpen(false);
    setEditing(null);
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Create</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SL No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Product Title</TableCell>
              <TableCell>Supplier Link</TableCell>
              <TableCell>Source Price</TableCell>
              <TableCell>Selling Price</TableCell>
              <TableCell>Source Platform</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Subcategory</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r._id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                <TableCell>{r.productTitle}</TableCell>
                <TableCell><a href={r.supplierLink} target="_blank" rel="noreferrer">Link</a></TableCell>
                <TableCell>{r.sourcePrice}</TableCell>
                <TableCell>{r.sellingPrice}</TableCell>
                <TableCell>{r.sourcePlatform?.name}</TableCell>
                <TableCell>{r.category?.name || '-'}</TableCell>
                <TableCell>{r.subcategory?.name || '-'}</TableCell>
                <TableCell>{r.createdBy?.username || '-'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => { setOpen(false); setErrors({}); }} maxWidth="md" fullWidth>
        <DialogTitle>Create Product Research</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Date is set automatically by backend */}
            <TextField label="Product Title" value={form.productTitle} onChange={(e) => setForm({ ...form, productTitle: e.target.value })} error={!!errors.productTitle} helperText={errors.productTitle} required />
            <TextField label="Supplier Link" value={form.supplierLink} onChange={(e) => setForm({ ...form, supplierLink: e.target.value })} error={!!errors.supplierLink} helperText={errors.supplierLink} required />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Source Price" type="number" value={form.sourcePrice} onChange={(e) => setForm({ ...form, sourcePrice: Number(e.target.value) })} error={!!errors.sourcePrice} helperText={errors.sourcePrice} required />
              <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} error={!!errors.sellingPrice} helperText={errors.sellingPrice} required />
            </Stack>
            <FormControl fullWidth error={!!errors.sourcePlatformId}>
              <InputLabel>Source Platform</InputLabel>
              <Select label="Source Platform" value={form.sourcePlatformId} onChange={(e) => setForm({ ...form, sourcePlatformId: e.target.value })} required>
                {sourcePlatforms.map((p) => (<MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>))}
              </Select>
              {errors.sourcePlatformId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.sourcePlatformId}</Alert> : null}
            </FormControl>
            <FormControl fullWidth error={!!errors.categoryId}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subcategoryId: '' })} required>
                {categories.map((c) => (<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
              </Select>
              {errors.categoryId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.categoryId}</Alert> : null}
            </FormControl>
            <FormControl fullWidth error={!!errors.subcategoryId} disabled={!form.categoryId}>
              <InputLabel>Subcategory</InputLabel>
              <Select label="Subcategory" value={form.subcategoryId} onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })} required>
                {subcategories.map((s) => (<MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>))}
              </Select>
              {errors.subcategoryId ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.subcategoryId}</Alert> : null}
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setErrors({}); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Product Research</DialogTitle>
        <DialogContent>
          {editing ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Date is set automatically by backend on create; optional to edit */}
              <TextField label="Product Title" value={editing.productTitle} onChange={(e) => setEditing({ ...editing, productTitle: e.target.value })} required />
              <TextField label="Supplier Link" value={editing.supplierLink} onChange={(e) => setEditing({ ...editing, supplierLink: e.target.value })} required />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Source Price" type="number" value={editing.sourcePrice} onChange={(e) => setEditing({ ...editing, sourcePrice: Number(e.target.value) })} required />
                <TextField label="Selling Price" type="number" value={editing.sellingPrice} onChange={(e) => setEditing({ ...editing, sellingPrice: Number(e.target.value) })} required />
              </Stack>
              <FormControl fullWidth>
                <InputLabel>Source Platform</InputLabel>
                <Select label="Source Platform" value={editing.sourcePlatformId} onChange={(e) => setEditing({ ...editing, sourcePlatformId: e.target.value })} required>
                  {sourcePlatforms.map((p) => (<MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value, subcategoryId: '' })} required>
                  {categories.map((c) => (<MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!editing.categoryId}>
                <InputLabel>Subcategory</InputLabel>
                <Select label="Subcategory" value={editing.subcategoryId} onChange={(e) => setEditing({ ...editing, subcategoryId: e.target.value })} required>
                  {subcategories.map((s) => (<MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>))}
                </Select>
              </FormControl>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
