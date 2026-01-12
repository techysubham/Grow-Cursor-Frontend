import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, TextField, Grid, Chip, Divider, FormControl, 
  InputLabel, Select, MenuItem, Snackbar, Alert, Pagination, OutlinedInput, Checkbox, ListItemText,
  Autocomplete, InputAdornment, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../../lib/api';

// --- YOUR PREFERRED HELPERS (Strict Matching) ---

// Helper: Group raw rows into readable text
const groupFitmentData = (compatibilityList) => {
  if (!compatibilityList || compatibilityList.length === 0) return [];
  const groups = {};
  
  compatibilityList.forEach(item => {
    const year = item.nameValueList.find(x => x.name === 'Year')?.value;
    const make = item.nameValueList.find(x => x.name === 'Make')?.value;
    const model = item.nameValueList.find(x => x.name === 'Model')?.value;
    
    if (year && make && model) {
      const key = `${make} ${model}`;
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(year);
    }
  });

  return Object.entries(groups).map(([key, yearSet]) => {
    const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
    return { title: key, years: sortedYears.join(', ') };
  });
};

// Helper: Format vehicle string for Modal List
const getVehicleString = (nameValueList) => {
    const year = nameValueList.find(x => x.name === 'Year')?.value || '';
    const make = nameValueList.find(x => x.name === 'Make')?.value || '';
    const model = nameValueList.find(x => x.name === 'Model')?.value || '';
    const extras = nameValueList.filter(x => !['Year', 'Make', 'Model'].includes(x.name)).map(x => `${x.name}: ${x.value}`).join(' | ');
    let mainString = `${year} ${make} ${model}`;
    if (extras) mainString += ` (${extras})`;
    return mainString.trim();
};

// Helper: Date to IST
const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(new Date(dateString));
};

export default function CompatibilityDashboard() {
  const [sellers, setSellers] = useState([]);
  const [currentSellerId, setCurrentSellerId] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // SEARCH STATE
  const [searchTerm, setSearchTerm] = useState('');

  // API USAGE STATE
  const [apiUsage, setApiUsage] = useState(null);

  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentListingIndex, setCurrentListingIndex] = useState(-1);
  const [editCompatList, setEditCompatList] = useState([]);

  // Dropdown Data
  const [makeOptions, setMakeOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [yearOptions, setYearOptions] = useState([]); // Dynamic Years
  
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);

  // Selection
  const [selectedMake, setSelectedMake] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedYears, setSelectedYears] = useState([]);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data);
        if (data.length > 0) setCurrentSellerId(data[0]._id);
      } catch (adminError) {
        try {
            const { data } = await api.get('/sellers/me');
            setSellers([data]);
            setCurrentSellerId(data._id);
        } catch (e) { console.error(e); }
      }
    };
    initDashboard();
  }, []);

  useEffect(() => {
    if (currentSellerId) loadListings();
  }, [currentSellerId, page]);

  useEffect(() => {
    if (currentSellerId) fetchApiUsage();
  }, [currentSellerId]);

  const fetchApiUsage = async () => {
    try {
      const { data } = await api.get('/ebay/api-usage-stats', {
        params: { sellerId: currentSellerId }
      });
      setApiUsage(data);
    } catch (e) {
      // Silent fail - not critical
      console.error('Failed to fetch API usage:', e);
    }
  };

  const loadListings = async (customSearch = null) => {
    setLoading(true);
    try {
      const searchToSend = customSearch !== null ? customSearch : searchTerm;
      const { data } = await api.get('/ebay/listings', { 
        params: { 
            sellerId: currentSellerId, 
            page, 
            limit: 50, 
            search: searchToSend 
        } 
      }); 
      setListings(data.listings);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (e) { showSnackbar('Failed to load listings', 'error'); } 
    finally { setLoading(false); }
  };

  const handleSearch = () => {
      setPage(1); 
      loadListings(searchTerm); 
  };

  const handleKeyPress = (e) => {
      if (e.key === 'Enter') handleSearch();
  };

  const handleSync = async () => {
    if (!currentSellerId) return;
    setSyncing(true);
    try {
      const { data } = await api.post('/ebay/sync-listings', { sellerId: currentSellerId });
      showSnackbar(data.message, 'success');
      setPage(1); 
      await loadListings();
    } catch (e) { showSnackbar('Sync Failed: ' + (e.response?.data?.error || e.message), 'error'); } 
    finally { setSyncing(false); }
  };

  // --- API FETCHING ---

  const fetchMakes = async () => {
    if (makeOptions.length > 0) return;
    setLoadingMakes(true);
    try {
        const { data } = await api.post('/ebay/compatibility/values', { sellerId: currentSellerId, propertyName: 'Make' });
        setMakeOptions(data.values);
    } catch (e) { console.error(e); } 
    finally { setLoadingMakes(false); }
  };

  const fetchModels = async (makeVal) => {
    setLoadingModels(true);
    setModelOptions([]); 
    setSelectedModel(null);
    setYearOptions([]);
    setSelectedYears([]);
    try {
        const { data } = await api.post('/ebay/compatibility/values', { 
            sellerId: currentSellerId, 
            propertyName: 'Model',
            constraints: [{ name: 'Make', value: makeVal }]
        });
        setModelOptions(data.values);
    } catch (e) { console.error(e); } 
    finally { setLoadingModels(false); }
  };

  const fetchYears = async (makeVal, modelVal) => {
    setLoadingYears(true);
    setYearOptions([]);
    setSelectedYears([]);
    try {
        const { data } = await api.post('/ebay/compatibility/values', { 
            sellerId: currentSellerId, 
            propertyName: 'Year',
            constraints: [
                { name: 'Make', value: makeVal },
                { name: 'Model', value: modelVal }
            ]
        });
        // Normalize year values to strings for consistent Select behavior
        setYearOptions(
          (data.values || [])
            .map((y) => String(y))
            .sort((a, b) => Number(b) - Number(a))
        );
    } catch (e) { console.error(e); } 
    finally { setLoadingYears(false); }
  };

  // --- HANDLERS ---

  const handleEditClick = (item, index) => {
    setSelectedItem(item);
    setCurrentListingIndex(index);
    setEditCompatList(JSON.parse(JSON.stringify(item.compatibility || [])));
    setOpenModal(true);
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedYears([]);
    setNewNotes('');
    fetchMakes();
  };

  const handleAddVehicle = () => {
    if(!selectedMake || !selectedModel || selectedYears.length === 0) return;
    const newEntries = selectedYears.map(year => ({
      notes: newNotes,
      nameValueList: [
        { name: 'Year', value: year },
        { name: 'Make', value: selectedMake },
        { name: 'Model', value: selectedModel }
      ]
    }));
    setEditCompatList([...newEntries, ...editCompatList]);
    setSelectedYears([]); 
    setNewNotes('');
  };

  // Toggle a single year selection reliably when clicking its checkbox
  const toggleYear = (year) => {
    const y = String(year);
    setSelectedYears((prev) =>
      prev.includes(y) ? prev.filter((v) => v !== y) : [...prev, y]
    );
  };

  const handleRemoveVehicle = (index) => {
    const updated = [...editCompatList];
    updated.splice(index, 1);
    setEditCompatList(updated);
  };

  const handleSaveCompatibility = async (closeModal = true) => {
    if (!selectedItem || !currentSellerId) return;
    try {
      const { data } = await api.post('/ebay/update-compatibility', {
        sellerId: currentSellerId,
        itemId: selectedItem.itemId,
        compatibilityList: editCompatList
      });

      if (closeModal) {
        setOpenModal(false);
      }

      if (data.warning) {
          showSnackbar(`Saved with eBay Warning: ${data.warning}`, 'warning');
      } else {
          showSnackbar('Changes saved to eBay successfully!', 'success');
      }

      setListings(prevListings => 
        prevListings.map(item => 
          item.itemId === selectedItem.itemId 
            ? { ...item, compatibility: editCompatList } 
            : item
        )
      );

      // Refresh API usage after successful save
      fetchApiUsage();

    } catch (e) {
      const errorMsg = e.response?.data?.error || e.message;
      const rateLimitInfo = e.response?.data?.rateLimitInfo;
      
      if (rateLimitInfo) {
        // Show rate limit specific message with stats
        const detailedMsg = `eBay API Limit Reached
Used: ${rateLimitInfo.used.toLocaleString()} / ${rateLimitInfo.limit.toLocaleString()} calls today
Remaining: ${rateLimitInfo.remaining.toLocaleString()} calls
Resets in: ${rateLimitInfo.hoursUntilReset} hour${rateLimitInfo.hoursUntilReset !== 1 ? 's' : ''}`;
        
        showSnackbar(detailedMsg, 'error');
        // Refresh usage stats to show updated count
        fetchApiUsage();
      } else {
        // Standard error handling
        showSnackbar(`Update failed: ${errorMsg}`, 'error');
      }
      throw e;
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Select All years toggle
  const toggleSelectAllYears = () => {
    setSelectedYears((prev) => (
      prev.length === yearOptions.length ? [] : [...yearOptions]
    ));
  };

  const handleSaveAndNext = async () => {
    try {
      // Save current item first without closing modal
      await handleSaveCompatibility(false);
      
      // Check if there's a next item
      if (currentListingIndex < listings.length - 1) {
        const nextItem = listings[currentListingIndex + 1];
        setSelectedItem(nextItem);
        setCurrentListingIndex(currentListingIndex + 1);
        setEditCompatList(JSON.parse(JSON.stringify(nextItem.compatibility || [])));
        setSelectedMake(null);
        setSelectedModel(null);
        setSelectedYears([]);
        setNewNotes('');
        // Makes are already loaded, no need to refetch
      } else {
        // No more items, close modal
        showSnackbar('No more listings to edit', 'info');
        setOpenModal(false);
      }
    } catch (e) {
      // Error already shown by handleSaveCompatibility
      console.error('Save and next failed:', e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER WITH SEARCH */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
            <Box>
              <Typography variant="h5">Compatibility Dashboard</Typography>
              <Typography variant="caption" color="textSecondary">Showing {listings.length} of {totalItems} Active Listings</Typography>
            </Box>
            
            {/* API USAGE BADGE */}
            {apiUsage && apiUsage.success && (
              <Tooltip 
                title={`${apiUsage.used.toLocaleString()} / ${apiUsage.limit.toLocaleString()} calls used today. Resets in ${apiUsage.hoursUntilReset}h`}
                arrow
              >
                <Chip 
                  size="small"
                  label={`API: ${Math.round((apiUsage.used / apiUsage.limit) * 100)}%`}
                  color={
                    apiUsage.used / apiUsage.limit > 0.9 ? 'error' :
                    apiUsage.used / apiUsage.limit > 0.7 ? 'warning' : 
                    'success'
                  }
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              </Tooltip>
            )}
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
            {/* SEARCH BOX */}
            <TextField 
                size="small" 
                placeholder="Search SKU, ID, Title..." 
                value={searchTerm}
                onChange={(e) => {
                    const newValue = e.target.value;
                    setSearchTerm(newValue);
                    
                    // FIX: If user deletes everything, reload the full list immediately
                    if (newValue === '') {
                        setPage(1);
                        loadListings(''); // Pass empty string to fetch all
                    }
                }}
                onKeyPress={handleKeyPress}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            {searchTerm && (
                                <IconButton 
                                    onClick={() => {
                                        setSearchTerm('');
                                        setPage(1);
                                        loadListings('');
                                    }} 
                                    edge="end" 
                                    size="small"
                                    sx={{ mr: 1 }}
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            )}
                            <IconButton onClick={handleSearch} edge="end">
                                <SearchIcon />
                            </IconButton>
                        </InputAdornment>
                    )
                }}
                sx={{ width: 300, bgcolor: 'white' }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Seller</InputLabel>
                <Select value={currentSellerId} label="Select Seller" onChange={(e) => setCurrentSellerId(e.target.value)}>
                    {sellers.map((s) => (<MenuItem key={s._id} value={s._id}>{s.user?.username || s.user?.email}</MenuItem>))}
                </Select>
            </FormControl>
            <Button variant="contained" startIcon={syncing ? <CircularProgress size={20} color="inherit"/> : <RefreshIcon />} onClick={handleSync} disabled={syncing || !currentSellerId}>
                {syncing ? 'Syncing...' : 'Poll eBay'}
            </Button>
        </Box>
      </Box>

      {/* TABLE */}
      {loading ? <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box> : (
        <>
        <TableContainer component={Paper}>
            <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                <TableCell width="80">Image</TableCell>
                <TableCell width="25%">Title & SKU</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Listed On</TableCell>
                <TableCell width="40%">Fitment Summary</TableCell>
                <TableCell>Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {listings.map((item, index) => {
                    const fitmentSummary = groupFitmentData(item.compatibility);
                    return (
                    <TableRow key={item.itemId}>
                        <TableCell>{item.mainImageUrl && <img src={item.mainImageUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />}</TableCell>
                        <TableCell>
                            <Typography variant="subtitle2" sx={{lineHeight: 1.2, mb: 0.5}}>{item.title}</Typography>
                            <Chip label={item.sku || 'No SKU'} size="small" variant="outlined" sx={{fontSize: '0.7rem'}}/>
                            <Typography variant="caption" display="block" color="textSecondary" mt={0.5}>ID: {item.itemId}</Typography>
                        </TableCell>
                        <TableCell>{item.currency} {item.currentPrice}</TableCell>
                        <TableCell><Typography variant="body2" sx={{whiteSpace:'nowrap'}}>{formatDate(item.startTime)}</Typography></TableCell>
                        
                        <TableCell>
                            {fitmentSummary.length > 0 ? (
                                <Box sx={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1, bgcolor: '#fafafa' }}>
                                    {fitmentSummary.map((grp, i) => (
                                        <Typography key={i} variant="caption" display="block" sx={{mb: 0.5, lineHeight: 1.3}}>
                                            <b>{grp.title}</b>: {grp.years}
                                        </Typography>
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>No compatibility data</Typography>
                            )}
                        </TableCell>

                        <TableCell>
                            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => handleEditClick(item, index)}>Edit</Button>
                        </TableCell>
                    </TableRow>
                    );
                })}
            </TableBody>
            </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" showFirstButton showLastButton />
        </Box>
        </>
      )}

      {/* EDIT MODAL */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>Edit Compatibility: {selectedItem?.itemId}</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', height: '75vh' }}>
          
          <Box sx={{ flex: 1, borderRight: '1px solid #eee', p: 2, overflowY: 'auto', bgcolor: '#fafafa' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Item Description Preview</Typography>
            {selectedItem?.descriptionPreview ? (
                <div style={{ padding: 15, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }} dangerouslySetInnerHTML={{ __html: selectedItem.descriptionPreview }} />
            ) : <Typography variant="body2" color="textSecondary">No preview available.</Typography>}
          </Box>

          <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Compatible Vehicles ({editCompatList.length})
            </Typography>
            
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {/* MAKE */}
              <Grid item xs={3}>
                <Autocomplete
                    options={makeOptions}
                    value={selectedMake}
                    onChange={(e, val) => { setSelectedMake(val); if(val) fetchModels(val); }}
                    loading={loadingMakes}
                    renderInput={(params) => <TextField {...params} label="Make" size="small" />}
                />
              </Grid>
              {/* MODEL */}
              <Grid item xs={3}>
                <Autocomplete
                    options={modelOptions}
                    value={selectedModel}
                    onChange={(e, val) => { setSelectedModel(val); if(val) fetchYears(selectedMake, val); }}
                    loading={loadingModels}
                    disabled={!selectedMake}
                    renderInput={(params) => <TextField {...params} label="Model" size="small" />}
                />
              </Grid>
              {/* YEAR */}
              <Grid item xs={3}>
                <FormControl size="small" fullWidth disabled={!selectedModel}>
                    <InputLabel>Years</InputLabel>
                    <Select
                        multiple
                        value={selectedYears}
                        onChange={(e) => {
                          const value = e.target.value;
                          const valuesArray = Array.isArray(value)
                            ? value
                            : (typeof value === 'string' ? value.split(',') : []);
                          if (valuesArray.includes('SELECT_ALL')) {
                            // Toggle select all
                            setSelectedYears(
                              selectedYears.length === yearOptions.length ? [] : [...yearOptions]
                            );
                          } else {
                            // Regular selection
                            setSelectedYears(valuesArray);
                          }
                        }}
                        input={<OutlinedInput label="Years" />}
                        renderValue={(selected) => {
                          if (selected.length === 0) return '';
                          if (selected.length === 1) return selected[0];
                          if (selected.length <= 3) return selected.join(', ');
                          return `${selected.length} years selected`;
                        }}
                        MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                    >
                        {loadingYears ? <MenuItem disabled>Loading...</MenuItem> : (
                          <>
                            <MenuItem
                              value="SELECT_ALL"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSelectAllYears();
                              }}
                            >
                              <Checkbox 
                                checked={yearOptions.length > 0 && selectedYears.length === yearOptions.length}
                                indeterminate={selectedYears.length > 0 && selectedYears.length < yearOptions.length}
                                size="small" 
                              />
                              <ListItemText primary="Select All" sx={{ fontWeight: 'bold' }} />
                            </MenuItem>
                            <Divider />
                             {yearOptions.map((year) => (
                               <MenuItem
                                 key={year}
                                 value={year}
                                 onClick={(e) => {
                                   // Prevent default Select onChange from conflicting
                                   e.preventDefault();
                                   e.stopPropagation();
                                   toggleYear(year);
                                 }}
                               >
                                 <Checkbox checked={selectedYears.includes(year)} size="small" />
                                 <ListItemText primary={year} />
                               </MenuItem>
                             ))}
                          </>
                        )}
                    </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}><TextField label="Notes" size="small" value={newNotes} onChange={e => setNewNotes(e.target.value)} fullWidth/></Grid>
              <Grid item xs={1}><Button variant="contained" onClick={handleAddVehicle} sx={{height: 40}}><AddIcon /></Button></Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>Vehicle Details</TableCell><TableCell>Notes</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {editCompatList.map((compat, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{getVehicleString(compat.nameValueList)}</TableCell>
                      <TableCell>{compat.notes}</TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => handleRemoveVehicle(idx)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={() => handleSaveCompatibility(true)} variant="outlined" color="primary">Save</Button>
          <Button 
            onClick={handleSaveAndNext} 
            variant="contained" 
            color="primary"
            disabled={currentListingIndex >= listings.length - 1}
          >
            Save and Go to Next
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={snackbar.severity === 'error' ? 10000 : 6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ 
            width: '100%',
            whiteSpace: 'pre-line' // Allow multi-line text
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}