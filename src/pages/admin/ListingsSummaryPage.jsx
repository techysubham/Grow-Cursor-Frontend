import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, parseISO } from 'date-fns';
import api from '../../lib/api.js';

export default function ListingsSummaryPage() {
  const [rows, setRows] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [stores, setStores] = useState([]);
  const [platformId, setPlatformId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Get only listing-type platforms
  useEffect(() => {
    api.get('/platforms')
      .then((p) => {
        const listingPlatforms = p.data.filter(platform => platform.type === 'listing');
        setPlatforms(listingPlatforms);
      })
      .catch(() => setPlatforms([]));
  }, []);

  // Get stores for selected platform
  useEffect(() => {
    if (platformId) {
      api.get('/stores', { params: { platformId } })
        .then((s) => setStores(s.data))
        .catch(() => setStores([]));
    } else {
      setStores([]);
      setStoreId(''); // Reset store selection when platform changes
    }
  }, [platformId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = {};
      if (platformId) params.platformId = platformId;
      if (storeId) params.storeId = storeId;
      
      const res = await api.get('/tasks/analytics/listings-summary', { params });
      let filteredData = res.data || [];

      // Client-side date filtering since server endpoint doesn't support it
      if (selectedDate) {
        const targetDate = format(selectedDate, 'yyyy-MM-dd');
        filteredData = filteredData.filter(row => row.date === targetDate);
      }

      setRows(filteredData);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on initial load and when filters change
  useEffect(() => {
    fetchSummary();
  }, [platformId, storeId, selectedDate]);

  // Process the rows data
  const processedRows = useMemo(() =>
    rows.map(r => ({
      ...r,
      completedQty: r.completedQty ?? 0
    })),
    [rows]
  );

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Listings Summary (day-wise)</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="platform-select-label">Platform</InputLabel>
              <Select labelId="platform-select-label" value={platformId} label="Platform" onChange={(e) => setPlatformId(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {platforms.map((p) => (
                  <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="store-select-label">Store</InputLabel>
              <Select labelId="store-select-label" value={storeId} label="Store" onChange={(e) => setStoreId(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {stores.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Filter by Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                  }
                }}
                disabled={loading}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 400, maxWidth: '100%', overflow: 'auto', position: 'relative' }}>
        <Box sx={{ overflowX: 'auto', overflowY: 'auto', position: 'sticky', top: 0, left: 0 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date (assigned)</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Store</TableCell>
                <TableCell>Total Quantity</TableCell>
                <TableCell>Assignments Count</TableCell>
                <TableCell>Number of Listers</TableCell>
                <TableCell>Number of Ranges</TableCell>
                <TableCell>Number of Categories</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processedRows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {r.date ? format(parseISO(r.date), 'dd/MM/yyyy') : '\u2014'}
                  </TableCell>
                  <TableCell>{r.platform || '\u2014'}</TableCell>
                  <TableCell>{r.store || '\u2014'}</TableCell>
                  <TableCell>{r.totalQuantity ?? 0}</TableCell>
                  <TableCell>{r.assignmentsCount ?? 0}</TableCell>
                  <TableCell>{r.numListers ?? 0}</TableCell>
                  <TableCell>{r.numRanges ?? 0}</TableCell>
                  <TableCell>{r.numCategories ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>
    </Box>
  );
}
