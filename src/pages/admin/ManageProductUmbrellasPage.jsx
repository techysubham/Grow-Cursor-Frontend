import { useEffect, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../../lib/api.js';

export default function ManageProductUmbrellasPage() {
  const [name, setName] = useState('');
  const [umbrellas, setUmbrellas] = useState([]);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editingUmbrella, setEditingUmbrella] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchUmbrellas();
  }, []);

  const fetchUmbrellas = async () => {
    try {
      const { data } = await api.get('/product-umbrellas');
      setUmbrellas(data || []);
    } catch (error) {
      console.error('Error fetching umbrellas:', error);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!name) return;
    
    try {
      await api.post('/product-umbrellas', { name });
      setName('');
      fetchUmbrellas();
    } catch (error) {
      console.error('Error creating umbrella:', error);
      alert('Failed to create product umbrella');
    }
  };

  const handleEdit = (umbrella) => {
    setEditingUmbrella(umbrella);
    setEditName(umbrella.name);
    setEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingUmbrella || !editName) return;
    
    try {
      await api.put(`/product-umbrellas/${editingUmbrella._id}`, {
        name: editName
      });
      setEditDialog(false);
      setEditingUmbrella(null);
      setEditName('');
      fetchUmbrellas();
    } catch (error) {
      console.error('Error updating umbrella:', error);
      alert('Failed to update product umbrella');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    try {
      await api.delete(`/product-umbrellas/${id}`);
      fetchUmbrellas();
    } catch (error) {
      console.error('Error deleting umbrella:', error);
      alert('Failed to delete product umbrella');
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Product Umbrellas</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} component="form" onSubmit={add}>
          <TextField 
            label="Product Umbrella Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            fullWidth
          />
          
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!name}
          >
            Add Product Umbrella
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product Umbrella</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {umbrellas.map((umbrella) => (
              <TableRow key={umbrella._id}>
                <TableCell>{umbrella.name}</TableCell>
                <TableCell>{new Date(umbrella.createdAt).toLocaleDateString()}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleEdit(umbrella)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDelete(umbrella._id, umbrella.name)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {umbrellas.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No product umbrellas found. Add one above!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product Umbrella</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField 
              label="Product Umbrella Name" 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)} 
              required 
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={!editName}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
