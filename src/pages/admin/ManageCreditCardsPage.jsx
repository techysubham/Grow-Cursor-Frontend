// pages/admin/ManageCreditCardsPage.jsx
import { useState } from 'react';
import {
  Box, Button, Paper, Stack, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Typography, 
  IconButton, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../lib/api.js';
import useFetchTable from '../../hooks/useFetchTable';

export default function ManageCreditCardsPage() {
  const { rows: cards, refetch } = useFetchTable('/credit-cards');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const addCard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/credit-cards', { name });
      setName('');
      refetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add credit card');
    }
  };

  const deleteCard = async (id) => {
    if(!window.confirm("Are you sure?")) return;
    try {
        await api.delete(`/credit-cards/${id}`);
        refetch();
    } catch (err) {
        alert("Failed to delete");
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Credit Cards</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={2} component="form" onSubmit={addCard}>
          <TextField 
            label="Credit Card Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            sx={{ minWidth: 300 }}
          />
          <Button type="submit" variant="contained">Add Card</Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Card Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card._id} hover>
                <TableCell>{card.name}</TableCell>
                <TableCell>
                    <IconButton size="small" color="error" onClick={() => deleteCard(card._id)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {cards.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} align="center">No credit cards found</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
