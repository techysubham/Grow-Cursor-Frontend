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
  const [ranges, setRanges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ productTitle: '', supplierLink: '', sourcePrice: '', sellingPrice: '', sourcePlatformId: '', range: '', category: '' });
  const [errors, setErrors] = useState({});
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  const load = async () => {
    const [{ data: tasks }, { data: sp }, { data: r }, { data: c }] = await Promise.all([
      api.get('/tasks'),
      api.get('/platforms', { params: { type: 'source' } }),
      api.get('/ranges'),
      api.get('/categories')
    ]);
    setRows(tasks);
    setSourcePlatforms(sp);
    setRanges(r);
    setCategories(c);
  };

  useEffect(() => { load(); }, []);

  const validate = () => {
    const errs = {};
    if (!form.productTitle) errs.productTitle = 'Required';
    if (!form.supplierLink) errs.supplierLink = 'Required';
    if (!form.sourcePrice || form.sourcePrice <= 0) errs.sourcePrice = 'Required and must be > 0';
    if (!form.sellingPrice || form.sellingPrice <= 0) errs.sellingPrice = 'Required and must be > 0';
    if (!form.sourcePlatformId) errs.sourcePlatformId = 'Required';
    if (!form.range) errs.range = 'Required';
    if (!form.category) errs.category = 'Required';
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
      range: form.range,
      category: form.category
    };
    await api.post('/tasks', payload);
    setOpen(false);
    setForm({ productTitle: '', supplierLink: '', sourcePrice: '', sellingPrice: '', sourcePlatformId: '', range: '', category: '' });
    setErrors({});
    await load();
  };

  const openEdit = (row) => {
    setEditing({ ...row, date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '' });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing.date || !editing.productTitle || !editing.supplierLink || !editing.sourcePrice || !editing.sellingPrice || !editing.sourcePlatform || !editing.range || !editing.category) {
      alert('All fields are required');
      return;
    }
    const payload = {
      date: editing.date,
      productTitle: editing.productTitle,
      supplierLink: editing.supplierLink,
      sourcePrice: Number(editing.sourcePrice),
      sellingPrice: Number(editing.sellingPrice),
      sourcePlatform: editing.sourcePlatform?._id || editing.sourcePlatform,
      range: editing.range,
      category: editing.category
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
              <TableCell>Range</TableCell>
              <TableCell>Category</TableCell>
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
                <TableCell>{r.range}</TableCell>
                <TableCell>{r.category}</TableCell>
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
            <FormControl fullWidth error={!!errors.range}>
              <InputLabel>Range</InputLabel>
              <Select label="Range" value={form.range} onChange={(e) => setForm({ ...form, range: e.target.value })} required>
                {ranges.map((r) => (<MenuItem key={r._id} value={r.name}>{r.name}</MenuItem>))}
              </Select>
              {errors.range ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.range}</Alert> : null}
            </FormControl>
            <FormControl fullWidth error={!!errors.category}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                {categories.map((c) => (<MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>))}
              </Select>
              {errors.category ? <Alert severity="error" sx={{ mt: 0.5 }}>{errors.category}</Alert> : null}
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
                <Select label="Source Platform" value={editing.sourcePlatform?._id || editing.sourcePlatform} onChange={(e) => setEditing({ ...editing, sourcePlatform: e.target.value })} required>
                  {sourcePlatforms.map((p) => (<MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Range</InputLabel>
                <Select label="Range" value={editing.range} onChange={(e) => setEditing({ ...editing, range: e.target.value })} required>
                  {ranges.map((r) => (<MenuItem key={r._id} value={r.name}>{r.name}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} required>
                  {categories.map((c) => (<MenuItem key={c._id} value={c.name}>{c.name}</MenuItem>))}
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
