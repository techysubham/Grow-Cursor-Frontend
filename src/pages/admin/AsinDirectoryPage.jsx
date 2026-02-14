import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Alert,
  Checkbox,
  TextField,
  InputAdornment,
  Chip,
  TablePagination,
  Toolbar,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  FileUpload as UploadIcon,
  FileDownload as DownloadIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import api from '../../lib/api.js';
import AsinBulkAddDialog from '../../components/AsinBulkAddDialog.jsx';
import AsinCsvImportDialog from '../../components/AsinCsvImportDialog.jsx';
import { generateCsvContent, downloadCsv } from '../../utils/asinDirectoryUtils.js';

export default function AsinDirectoryPage() {
  const [asins, setAsins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState([]);
  const [stats, setStats] = useState(null);

  const [bulkAddDialog, setBulkAddDialog] = useState(false);
  const [csvImportDialog, setCsvImportDialog] = useState(false);

  useEffect(() => {
    fetchAsins();
    fetchStats();
  }, [page, rowsPerPage, search]);

  const fetchAsins = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/asin-directory', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined
        }
      });
      setAsins(data.asins || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to fetch ASINs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/asin-directory/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleBulkAdd = async (asins) => {
    try {
      const { data } = await api.post('/asin-directory/bulk-manual', { asins });
      setSuccess(
        `Added ${data.added} ASINs successfully! ` +
        (data.duplicates > 0 ? `(${data.duplicates} duplicates skipped)` : '') +
        (data.errors.length > 0 ? ` (${data.errors.length} errors)` : '')
      );
      fetchAsins();
      fetchStats();
      setSelected([]);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to add ASINs');
    }
  };

  const handleCsvImport = async (csvData) => {
    try {
      const { data } = await api.post('/asin-directory/bulk-csv', { csvData });
      setSuccess(
        `Imported ${data.added} ASINs successfully! ` +
        (data.duplicates > 0 ? `(${data.duplicates} duplicates skipped)` : '') +
        (data.errors.length > 0 ? ` (${data.errors.length} errors)` : '')
      );
      fetchAsins();
      fetchStats();
      setSelected([]);
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to import CSV');
    }
  };

  const handleDelete = async (id, asin) => {
    if (!window.confirm(`Delete ASIN ${asin}?`)) return;

    try {
      await api.delete(`/asin-directory/${id}`);
      setSuccess('ASIN deleted successfully');
      fetchAsins();
      fetchStats();
      setSelected(selected.filter(s => s !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete ASIN');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected ASINs?`)) return;

    try {
      await api.post('/asin-directory/bulk-delete', { ids: selected });
      setSuccess(`${selected.length} ASINs deleted successfully`);
      fetchAsins();
      fetchStats();
      setSelected([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete ASINs');
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/asin-directory', {
        params: { limit: 999999 }
      });
      const csv = generateCsvContent(data.asins);
      const date = new Date().toISOString().split('T')[0];
      downloadCsv(csv, `asin-directory-${date}.csv`);
      setSuccess('ASINs exported successfully');
    } catch (err) {
      setError('Failed to export ASINs');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(asins.map(a => a._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCopyAsin = (asin) => {
    navigator.clipboard.writeText(asin);
    setSuccess(`Copied ${asin} to clipboard`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">📁 ASIN Directory</Typography>
        {stats && (
          <Stack direction="row" spacing={1}>
            <Chip label={`Total: ${stats.total}`} color="primary" size="small" />
            <Chip label={`Today: ${stats.recentlyAdded.today}`} size="small" />
            <Chip label={`This Week: ${stats.recentlyAdded.thisWeek}`} size="small" />
          </Stack>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setBulkAddDialog(true)}
          >
            Add ASINs
          </Button>
          <Button
            startIcon={<UploadIcon />}
            variant="outlined"
            onClick={() => setCsvImportDialog(true)}
          >
            Import CSV
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={handleExport}
          >
            Export
          </Button>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            placeholder="Search ASIN..."
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 250 }}
          />
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={asins.length > 0 && selected.length === asins.length}
                    indeterminate={selected.length > 0 && selected.length < asins.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>ASIN</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Added Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : asins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No ASINs yet. Add some to get started!
                  </TableCell>
                </TableRow>
              ) : (
                asins.map((asin) => (
                  <TableRow key={asin._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(asin._id)}
                        onChange={() => handleSelectOne(asin._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontFamily="monospace">
                          {asin.asin}
                        </Typography>
                        <Tooltip title="Copy to clipboard">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyAsin(asin.asin)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {new Date(asin.addedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(asin._id, asin.asin)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />

        {selected.length > 0 && (
          <Toolbar
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.contrastText'
            }}
          >
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              {selected.length} selected
            </Typography>
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              sx={{ color: 'inherit' }}
            >
              Delete Selected
            </Button>
          </Toolbar>
        )}
      </Paper>

      <AsinBulkAddDialog
        open={bulkAddDialog}
        onClose={() => setBulkAddDialog(false)}
        onAdd={handleBulkAdd}
      />

      <AsinCsvImportDialog
        open={csvImportDialog}
        onClose={() => setCsvImportDialog(false)}
        onImport={handleCsvImport}
      />
    </Box>
  );
}
