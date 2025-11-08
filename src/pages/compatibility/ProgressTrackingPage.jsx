import { useEffect, useState, useMemo } from 'react';
import {
  Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, Chip, Stack,
  LinearProgress, TextField, FormControl, InputLabel, Select, MenuItem, Grid, Button,
  Collapse, IconButton, Badge
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import api from '../../lib/api.js';

export default function ProgressTrackingPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    date: { mode: 'none', single: '', from: '', to: '' }, // 'none' | 'single' | 'range'
    subcategory: '',
    listingPlatform: '',
    store: '',
    editor: '',
    pending: { mode: 'none', value: '' }, // 'none' | 'equal' | 'greater' | 'less'
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/compatibility/progress');
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pendingQty = (item) => {
    const q = item.quantity || 0;
    const c = item.completedQuantity || 0;
    return Math.max(0, q - c);
  };

  const progressPct = (item) => {
    const q = item.quantity || 0;
    if (!q || q <= 0) return 0;
    const c = Math.min(item.completedQuantity || 0, q);
    return Math.round((c / q) * 100);
  };

  // Date conversion to YYYY-MM-DD (IST-safe)
  const toISTYMD = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const utc = dt.getTime() + dt.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 330 * 60000); // +05:30
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get unique values for filter dropdowns
  const uniqueSubcategories = useMemo(() => {
    const subcats = items.map(item => item.task?.subcategory?.name).filter(Boolean);
    return Array.from(new Set(subcats)).sort();
  }, [items]);

  const uniqueEditors = useMemo(() => {
    const editors = items.map(item => item.editor?.username).filter(Boolean);
    return Array.from(new Set(editors)).sort();
  }, [items]);

  const uniqueListingPlatforms = useMemo(() => {
    const list = items.map(item => item.sourceAssignment?.listingPlatform?.name).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [items]);

  const uniqueStores = useMemo(() => {
    const list = items.map(item => item.sourceAssignment?.store?.name).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [items]);

  // Filter logic
  const matchesDate = (createdAt, dateFilter) => {
    const ymd = toISTYMD(createdAt);
    if (dateFilter.mode === 'none') return true;
    if (dateFilter.mode === 'single') return dateFilter.single ? ymd === dateFilter.single : true;
    // range
    const { from, to } = dateFilter;
    if (!from && !to) return true;
    if (from && ymd < from) return false;
    if (to && ymd > to) return false;
    return true;
  };

  const matchesSubcategory = (item) => {
    if (!filters.subcategory) return true;
    return item.task?.subcategory?.name === filters.subcategory;
  };

  const matchesEditor = (item) => {
    if (!filters.editor) return true;
    return item.editor?.username === filters.editor;
  };

  const matchesListingPlatform = (item) => {
    if (!filters.listingPlatform) return true;
    return item.sourceAssignment?.listingPlatform?.name === filters.listingPlatform;
  };

  const matchesStore = (item) => {
    if (!filters.store) return true;
    return item.sourceAssignment?.store?.name === filters.store;
  };

  const matchesPending = (item) => {
    if (filters.pending.mode === 'none' || !filters.pending.value) return true;
    const pending = pendingQty(item);
    const value = Number(filters.pending.value);
    if (filters.pending.mode === 'equal') return pending === value;
    if (filters.pending.mode === 'greater') return pending > value;
    if (filters.pending.mode === 'less') return pending < value;
    return true;
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item =>
      matchesDate(item.createdAt, filters.date) &&
      matchesSubcategory(item) &&
      matchesListingPlatform(item) &&
      matchesStore(item) &&
      matchesEditor(item) &&
      matchesPending(item)
    );
  }, [items, filters]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.date.mode === 'single' && filters.date.single) count++;
    if (filters.date.mode === 'range' && (filters.date.from || filters.date.to)) count++;
    if (filters.subcategory) count++;
    if (filters.listingPlatform) count++;
    if (filters.store) count++;
    if (filters.editor) count++;
    if (filters.pending.mode !== 'none' && filters.pending.value) count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      date: { mode: 'none', single: '', from: '', to: '' },
      subcategory: '',
      listingPlatform: '',
      store: '',
      editor: '',
      pending: { mode: 'none', value: '' },
    });
  };

  // Calculate totals for summary row
  const totals = useMemo(() => {
    return {
      count: filteredItems.length,
      totalQty: filteredItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
      completed: filteredItems.reduce((sum, item) => sum + (item.completedQuantity || 0), 0),
      pending: filteredItems.reduce((sum, item) => sum + pendingQty(item), 0),
    };
  }, [filteredItems]);

  return (
    <Box>
      
        <Typography variant="h6">Compatibility Progress Tracking</Typography>
        <Stack direction="row" spacing={1}>
          <Badge badgeContent={activeFilterCount} color="primary">
            <IconButton 
              size="small" 
              onClick={() => setOpenFilters(!openFilters)}
              color={openFilters ? 'primary' : 'default'}
            >
              <FilterListIcon />
            </IconButton>
          </Badge>
          {activeFilterCount > 0 && (
            <IconButton size="small" onClick={clearFilters} title="Clear all filters">
              <ClearAllIcon />
            </IconButton>
          )}
        </Stack>
      

      {/* Filters Section */}
      <Collapse in={openFilters}>
        
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Filters</Typography>
          <Grid container spacing={2}>
            {/* Date Filter */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Filter</InputLabel>
                <Select
                  label="Date Filter"
                  value={filters.date.mode}
                  onChange={(e) => setFilters(f => ({ ...f, date: { ...f.date, mode: e.target.value } }))}
                >
                  <MenuItem value="none">No Date Filter</MenuItem>
                  <MenuItem value="single">Single Date</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {filters.date.mode === 'single' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Select Date"
                  InputLabelProps={{ shrink: true }}
                  value={filters.date.single}
                  onChange={(e) => setFilters(f => ({ ...f, date: { ...f.date, single: e.target.value } }))}
                />
              </Grid>
            )}

            {filters.date.mode === 'range' && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date.from}
                    onChange={(e) => setFilters(f => ({ ...f, date: { ...f.date, from: e.target.value } }))}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date.to}
                    onChange={(e) => setFilters(f => ({ ...f, date: { ...f.date, to: e.target.value } }))}
                  />
                </Grid>
              </>
            )}

            {/* Subcategory Filter */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Subcategory</InputLabel>
                <Select
                  label="Subcategory"
                  value={filters.subcategory}
                  onChange={(e) => setFilters(f => ({ ...f, subcategory: e.target.value }))}
                >
                  <MenuItem value="">All Subcategories</MenuItem>
                  {uniqueSubcategories.map(subcat => (
                    <MenuItem key={subcat} value={subcat}>{subcat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Listing Platform Filter */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Listing Platform</InputLabel>
                <Select
                  label="Listing Platform"
                  value={filters.listingPlatform}
                  onChange={(e) => setFilters(f => ({ ...f, listingPlatform: e.target.value }))}
                >
                  <MenuItem value="">All Platforms</MenuItem>
                  {uniqueListingPlatforms.map(lp => (
                    <MenuItem key={lp} value={lp}>{lp}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Store Filter */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Store</InputLabel>
                <Select
                  label="Store"
                  value={filters.store}
                  onChange={(e) => setFilters(f => ({ ...f, store: e.target.value }))}
                >
                  <MenuItem value="">All Stores</MenuItem>
                  {uniqueStores.map(st => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Editor Filter */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Editor</InputLabel>
                <Select
                  label="Editor"
                  value={filters.editor}
                  onChange={(e) => setFilters(f => ({ ...f, editor: e.target.value }))}
                >
                  <MenuItem value="">All Editors</MenuItem>
                  {uniqueEditors.map(editor => (
                    <MenuItem key={editor} value={editor}>{editor}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Pending Filter */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Pending Filter</InputLabel>
                <Select
                  label="Pending Filter"
                  value={filters.pending.mode}
                  onChange={(e) => setFilters(f => ({ ...f, pending: { ...f.pending, mode: e.target.value } }))}
                >
                  <MenuItem value="none">No Pending Filter</MenuItem>
                  <MenuItem value="equal">Equal to</MenuItem>
                  <MenuItem value="greater">Greater than</MenuItem>
                  <MenuItem value="less">Less than</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {filters.pending.mode !== 'none' && (
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Pending Value"
                  value={filters.pending.value}
                  onChange={(e) => setFilters(f => ({ ...f, pending: { ...f.pending, value: e.target.value } }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            )}
          </Grid>
        
      </Collapse>

      
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              
              <TableCell>Category</TableCell>
              <TableCell>Subcategory</TableCell>
              <TableCell>Listing Platform</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Editor</TableCell>
              <TableCell>Assigned Ranges</TableCell>
              <TableCell>Completed Ranges</TableCell>
              <TableCell>Total Qty</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Pending</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map(item => (
              <TableRow key={item._id}>
                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                
                <TableCell>{item.task?.category?.name || '-'}</TableCell>
                <TableCell>{item.task?.subcategory?.name || '-'}</TableCell>
                <TableCell>{item.sourceAssignment?.listingPlatform?.name || '-'}</TableCell>
                <TableCell>{item.sourceAssignment?.store?.name || '-'}</TableCell>
                <TableCell>{item.editor?.username || '-'}</TableCell>
                <TableCell>
                  <Stack direction="column" spacing={0.5}>
                    {(item.assignedRangeQuantities || []).map((rq, i) => (
                      <Chip key={i} label={`${rq.range?.name || '-'}: ${rq.quantity || 0}`} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="column" spacing={0.5}>
                    {(item.completedRangeQuantities || []).filter(rq => rq.quantity > 0).map((rq, i) => (
                      <Chip key={i} label={`${rq.range?.name || '-'}: ${rq.quantity || 0}`} size="small"  />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>{item.quantity || 0}</TableCell>
                <TableCell>{item.completedQuantity || 0}</TableCell>
                <TableCell>{pendingQty(item)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={progressPct(item)} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption">{progressPct(item)}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {item.completedAt ? (
                    <Chip label="Completed" color="success" size="small" />
                  ) : (
                    <Chip label="In Progress" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>{item.notes || '-'}</TableCell>
              </TableRow>
            ))}

            {/* Summary Row */}
            {filteredItems.length > 0 && (
              <TableRow sx={{ backgroundColor: 'action.hover', fontWeight: 'bold' }}>
                <TableCell colSpan={6} sx={{ fontWeight: 'bold' }}>
                  <Typography variant="body2" fontWeight="bold">
                    Total ({totals.count} items)
                  </Typography>
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{totals.totalQty}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{totals.completed}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{totals.pending}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            )}

            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={15} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      
    </Box>
  );
}
