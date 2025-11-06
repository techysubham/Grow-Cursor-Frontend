// src/pages/admin/ListingManagementPage.jsx
import { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Paper
} from '@mui/material';
import api from '../../lib/api.js';

export default function ListingManagementPage() {
  const [rows, setRows] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [listers, setListers] = useState([]);
  const [listingPlatforms, setListingPlatforms] = useState([]);
  const [stores, setStores] = useState([]);
  const [assignForm, setAssignForm] = useState({
    listerId: '',
    quantity: '',
    listingPlatformId: '',
    storeId: ''
  });

  // Load all tasks (no filter, because we want them always visible)
  const load = async () => {
    const [{ data: tasks }, { data: l }, { data: lp }] = await Promise.all([
      api.get('/tasks'),
      api.get('/users/listers'),
      api.get('/platforms', { params: { type: 'listing' } })
    ]);
    setRows(tasks.tasks ?? tasks);
    setListers(l);
    setListingPlatforms(lp);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (assignForm.listingPlatformId) {
      api
        .get('/stores', { params: { platformId: assignForm.listingPlatformId } })
        .then(({ data }) => setStores(data));
    } else {
      setStores([]);
    }
  }, [assignForm.listingPlatformId]);

  const openAssign = (row) => {
    setAssigning(row);
    setAssignForm({ listerId: '', quantity: '', listingPlatformId: '', storeId: '' });
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    const { listerId, quantity, listingPlatformId, storeId } = assignForm;
    if (!listerId || !quantity || !listingPlatformId || !storeId) {
      alert('All fields are required');
      return;
    }

    await api.post('/assignments', {
      taskId: assigning._id,
      listerId,
      quantity: Number(quantity),
      listingPlatformId,
      storeId
    });

    setAssignOpen(false);
    setAssigning(null);
    alert('Task shared successfully!');
  };

  return (
    <Box>
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
              <TableCell>Share</TableCell>
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
                <TableCell>{r.sourcePlatform?.name || '-'}</TableCell>
                <TableCell>{r.category?.name || '-'}</TableCell>
                <TableCell>{r.subcategory?.name || '-'}</TableCell>
                <TableCell>{r.createdBy?.username || '-'}</TableCell>
                <TableCell>
                  <Button size="small" variant="contained" onClick={() => openAssign(r)}>
                    Share
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Share dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Share Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Lister</InputLabel>
              <Select
                label="Lister"
                value={assignForm.listerId}
                onChange={(e) => setAssignForm({ ...assignForm, listerId: e.target.value })}
                required
              >
                {listers.map((l) => (
                  <MenuItem key={l._id} value={l._id}>{l.username}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={assignForm.quantity}
              onChange={(e) => setAssignForm({ ...assignForm, quantity: Number(e.target.value) })}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Listing Platform</InputLabel>
              <Select
                label="Listing Platform"
                value={assignForm.listingPlatformId}
                onChange={(e) => setAssignForm({ ...assignForm, listingPlatformId: e.target.value })}
                required
              >
                {listingPlatforms.map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!assignForm.listingPlatformId}>
              <InputLabel>Store</InputLabel>
              <Select
                label="Store"
                value={assignForm.storeId}
                onChange={(e) => setAssignForm({ ...assignForm, storeId: e.target.value })}
                required
              >
                {stores.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign}>Share</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
