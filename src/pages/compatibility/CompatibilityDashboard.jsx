import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, TextField, Grid, Chip, Divider, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../lib/api';

const getVehicleString = (nameValueList) => {
  const year = nameValueList.find(x => x.name === 'Year')?.value || '';
  const make = nameValueList.find(x => x.name === 'Make')?.value || '';
  const model = nameValueList.find(x => x.name === 'Model')?.value || '';
  return `${year} ${make} ${model}`.trim();
};

export default function CompatibilityDashboard() {
  const [sellers, setSellers] = useState([]);
  const [currentSellerId, setCurrentSellerId] = useState(''); // Selected Seller
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editCompatList, setEditCompatList] = useState([]);
  
  // New Entry State
  const [newYear, setNewYear] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // 1. ON LOAD: DETERMINE WHO IS LOGGED IN & FETCH SELLERS
  useEffect(() => {
    const initDashboard = async () => {
      try {
        // Try to fetch ALL sellers (For Admins)
        const { data } = await api.get('/sellers/all');
        setSellers(data);
        if (data.length > 0) {
            setCurrentSellerId(data[0]._id); // Default to first seller
        }
      } catch (adminError) {
        // If 403, assume we are a SELLER and try /me
        try {
            const { data } = await api.get('/sellers/me');
            setSellers([data]); // Single seller in list
            setCurrentSellerId(data._id);
        } catch (sellerError) {
            setError('Could not load seller profile. Permissions check failed.');
        }
      }
    };
    initDashboard();
  }, []);

  // 2. LOAD LISTINGS WHEN SELLER CHANGES
  useEffect(() => {
    if (currentSellerId) {
      loadListings();
    }
  }, [currentSellerId]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ebay/listings', { 
        params: { sellerId: currentSellerId } 
      }); 
      setListings(data);
    } catch (e) {
      console.error(e);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentSellerId) return;
    setSyncing(true);
    setError('');
    try {
      await api.post('/ebay/sync-listings', { sellerId: currentSellerId });
      await loadListings();
    } catch (e) {
      setError('Sync Failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setEditCompatList(JSON.parse(JSON.stringify(item.compatibility || [])));
    setOpenModal(true);
  };

  const handleAddVehicle = () => {
    if(!newYear || !newMake || !newModel) return;
    const newEntry = {
      notes: newNotes,
      nameValueList: [
        { name: 'Year', value: newYear },
        { name: 'Make', value: newMake },
        { name: 'Model', value: newModel }
      ]
    };
    setEditCompatList([newEntry, ...editCompatList]);
    setNewYear(''); setNewMake(''); setNewModel(''); setNewNotes('');
  };

  const handleRemoveVehicle = (index) => {
    const updated = [...editCompatList];
    updated.splice(index, 1);
    setEditCompatList(updated);
  };

  const handleSaveCompatibility = async () => {
    if (!selectedItem || !currentSellerId) return;
    try {
      await api.post('/ebay/update-compatibility', {
        sellerId: currentSellerId,
        itemId: selectedItem.itemId,
        compatibilityList: editCompatList
      });
      setOpenModal(false);
      loadListings(); 
    } catch (e) {
      alert('Update failed: ' + (e.response?.data?.error || e.message));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER & CONTROLS */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
            <Typography variant="h5">Compatibility Dashboard</Typography>
            <Typography variant="caption" color="textSecondary">Active Listings & Fitment</Typography>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
            {/* SELLER SELECTOR */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Seller</InputLabel>
                <Select
                    value={currentSellerId}
                    label="Select Seller"
                    onChange={(e) => setCurrentSellerId(e.target.value)}
                >
                    {sellers.map((s) => (
                        <MenuItem key={s._id} value={s._id}>
                            {s.user?.username || s.user?.email || 'Unknown Seller'}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Button 
                variant="contained" 
                startIcon={syncing ? <CircularProgress size={20} color="inherit"/> : <RefreshIcon />}
                onClick={handleSync}
                disabled={syncing || !currentSellerId}
            >
                {syncing ? 'Syncing...' : 'Poll eBay'}
            </Button>
        </Box>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {/* TABLE */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
            <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Title & SKU</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Compatibility Count</TableCell>
                <TableCell>Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {listings.map((item) => (
                <TableRow key={item.itemId}>
                    <TableCell>
                    {item.mainImageUrl && (
                        <img src={item.mainImageUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    </TableCell>
                    <TableCell>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="caption" color="textSecondary">SKU: {item.sku} | ID: {item.itemId}</Typography>
                    </TableCell>
                    <TableCell>{item.currency} {item.currentPrice}</TableCell>
                    <TableCell>
                    <Chip label={`${item.compatibility?.length || 0} Vehicles`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                    <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(item)}>
                        Edit Compat
                    </Button>
                    </TableCell>
                </TableRow>
                ))}
                {listings.length === 0 && !loading && (
                    <TableRow>
                        <TableCell colSpan={5} align="center">
                            {currentSellerId ? 'No active listings found in DB. Try Poll eBay.' : 'Please select a seller.'}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </TableContainer>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>Edit Compatibility: {selectedItem?.itemId}</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', height: '70vh' }}>
          
          {/* LEFT SIDE: DESCRIPTION PREVIEW */}
          <Box sx={{ flex: 1, borderRight: '1px solid #eee', p: 2, overflowY: 'auto', bgcolor: '#fafafa' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Item Description Preview</Typography>
            {selectedItem?.descriptionPreview ? (
                <div 
                style={{ padding: 10, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }}
                dangerouslySetInnerHTML={{ __html: selectedItem.descriptionPreview }} 
                />
            ) : (
                <Typography variant="body2" color="textSecondary">No preview available.</Typography>
            )}
          </Box>

          {/* RIGHT SIDE: COMPATIBILITY FORM */}
          <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Add Compatible Vehicle</Typography>
            
            <Grid container spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={2}><TextField label="Year" size="small" value={newYear} onChange={e => setNewYear(e.target.value)} /></Grid>
              <Grid item xs={3}><TextField label="Make" size="small" value={newMake} onChange={e => setNewMake(e.target.value)} /></Grid>
              <Grid item xs={3}><TextField label="Model" size="small" value={newModel} onChange={e => setNewModel(e.target.value)} /></Grid>
              <Grid item xs={3}><TextField label="Notes (Optional)" size="small" value={newNotes} onChange={e => setNewNotes(e.target.value)} /></Grid>
              <Grid item xs={1}>
                <IconButton color="primary" onClick={handleAddVehicle}><AddIcon /></IconButton>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>Vehicle</TableCell><TableCell>Notes</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {editCompatList.map((compat, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{getVehicleString(compat.nameValueList)}</TableCell>
                      <TableCell>{compat.notes}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleRemoveVehicle(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={handleSaveCompatibility} variant="contained" color="primary">Save Changes to eBay</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}