import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import api, { getAuthToken } from '../../lib/api.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { tableHeaderCellSx, tableContainerSx, yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles.js';
import { parseAsins, getParsingStats } from '../../utils/asinParser.js';

const MARKETPLACE_OPTIONS = [
  { value: 'US', label: 'Amazon.com (US)' },
  { value: 'UK', label: 'Amazon.co.uk (UK)' },
  { value: 'CA', label: 'Amazon.ca (Canada)' },
  { value: 'AU', label: 'Amazon.com.au (Australia)' }
];

const getSellerDisplayName = (seller) =>
  seller?.user?.username || seller?.user?.email || seller?.name || 'Unknown Seller';

export default function AsinPrecheckPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  const [setupOpen, setSetupOpen] = useState(true);
  const [sellers, setSellers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sellerId, setSellerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [asinInput, setAsinInput] = useState('');
  const [region, setRegion] = useState('US');
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [imagePreview, setImagePreview] = useState(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const surfaceSx = {
    borderRadius: `${dashboardTheme.radius.card}px`,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.08),
    backgroundColor: theme.palette.background.paper,
    boxShadow: dashboardTheme.shadows.card
  };

  useEffect(() => {
    let mounted = true;

    const loadSetupData = async () => {
      try {
        setLoadingSetup(true);
        const [sellerRes, templateRes] = await Promise.all([
          api.get('/sellers/all'),
          api.get('/listing-templates')
        ]);

        if (!mounted) return;
        const sellerList = sellerRes.data || [];
        const templateList = templateRes.data || [];
        setSellers(sellerList);
        setTemplates(templateList);
        if (sellerList.length > 0) setSellerId(sellerList[0]._id);
        if (templateList.length > 0) setTemplateId(templateList[0]._id);
      } catch (err) {
        console.error('Failed to load ASIN precheck setup data:', err);
        if (mounted) setError('Failed to load sellers or templates');
      } finally {
        if (mounted) setLoadingSetup(false);
      }
    };

    loadSetupData();

    return () => {
      mounted = false;
      if (window._asinPrecheckEventSource) {
        window._asinPrecheckEventSource.close();
        window._asinPrecheckEventSource = null;
      }
    };
  }, []);

  const selectedRows = useMemo(
    () => rows.filter(row => selectedIds.has(row.id)),
    [rows, selectedIds]
  );

  const completedRows = useMemo(
    () => rows.filter(row => row.status !== 'loading'),
    [rows]
  );

  const inactiveRows = useMemo(
    () => rows.filter(row => row.status !== 'loading' && !row.active),
    [rows]
  );

  const activeCount = useMemo(
    () => rows.filter(row => row.status !== 'loading' && row.active).length,
    [rows]
  );

  const parseSetupAsins = () => parseAsins(asinInput);

  const updateRow = (incomingRow) => {
    setRows(prev => prev.map(row => (
      row.asin === incomingRow.asin
        ? {
            ...row,
            ...incomingRow,
            image: incomingRow.image || incomingRow.sourceData?.images?.[0] || ''
          }
        : row
    )));
  };

  const runPrecheck = () => {
    const asins = parseSetupAsins();
    const stats = getParsingStats(asinInput);

    setError('');
    setSuccess('');

    if (!sellerId || !templateId) {
      setError('Seller and template are required');
      return;
    }

    if (asins.length === 0) {
      setError('Please enter valid ASINs');
      return;
    }

    if (asins.length > 100) {
      setError('Maximum 100 ASINs allowed per batch');
      return;
    }

    if (stats.invalid > 0) {
      console.warn(`ASIN Precheck ignored ${stats.invalid} invalid ASIN(s)`);
    }

    const existingAsins = new Set(rows.map(row => row.asin));
    const asinsToCheck = asins.filter(asin => !existingAsins.has(asin));
    const skippedCount = asins.length - asinsToCheck.length;

    if (asinsToCheck.length === 0) {
      setError('All entered ASINs are already in this precheck.');
      return;
    }

    if (window._asinPrecheckEventSource) {
      window._asinPrecheckEventSource.close();
      window._asinPrecheckEventSource = null;
    }

    const initialRows = asinsToCheck.map(asin => ({
      id: `asin-precheck-${asin}`,
      asin,
      sku: '',
      active: false,
      title: '',
      image: '',
      status: 'loading',
      progressStage: 'queued',
      errors: []
    }));

    setRows(prev => [...prev, ...initialRows]);
    setProgress({ current: 0, total: asinsToCheck.length });
    setRunning(true);
    setSetupOpen(false);
    setAsinInput('');
    if (skippedCount > 0) {
      setSuccess(`Skipped ${skippedCount} ASIN${skippedCount === 1 ? '' : 's'} already in this precheck.`);
    }

    const authToken = getAuthToken();
    const asinParam = asinsToCheck.join(',');
    const sseUrl = `/template-listings/asin-precheck-stream?templateId=${templateId}&sellerId=${sellerId}&asins=${encodeURIComponent(asinParam)}&region=${encodeURIComponent(region)}&token=${encodeURIComponent(authToken)}`;
    const eventSource = new EventSource(api.defaults.baseURL + sseUrl);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        if (window._asinPrecheckEventSource === eventSource) {
          window._asinPrecheckEventSource = null;
        }
        setRunning(false);
        return;
      }

      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'started':
            setProgress({ current: 0, total: message.total || asinsToCheck.length });
            break;
          case 'ping':
            break;
          case 'item_started':
            setRows(prev => prev.map(row => (
              row.asin === message.asin
                ? { ...row, progressStage: message.progressStage || 'fetching' }
                : row
            )));
            break;
          case 'item':
            updateRow(message.item);
            setProgress({ current: message.progress || 0, total: message.total || asinsToCheck.length });
            break;
          case 'complete':
            setProgress(prev => ({ ...prev, current: message.total || prev.current }));
            break;
          case 'error':
            setError(message.error || 'ASIN precheck failed');
            break;
          default:
            break;
        }
      } catch (parseError) {
        console.error('Failed to parse ASIN precheck stream event:', parseError);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (window._asinPrecheckEventSource === eventSource) {
        window._asinPrecheckEventSource = null;
      }
      setRunning(false);
      setError('Connection lost. Some ASINs may not have loaded.');
    };

    window._asinPrecheckEventSource = eventSource;
  };

  const toggleRow = (rowId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const selectRows = (nextRows) => {
    setSelectedIds(new Set(nextRows.map(row => row.id)));
  };

  const discardSelected = () => {
    if (selectedIds.size === 0) return;
    setRows(prev => prev.filter(row => !selectedIds.has(row.id)));
    setSelectedIds(new Set());
    setDiscardConfirmOpen(false);
  };

  const copySelectedAsins = async () => {
    const asins = selectedRows.map(row => row.asin);
    if (asins.length === 0) return;

    try {
      await navigator.clipboard.writeText(asins.join('\n'));
      setSuccess(`Copied ${asins.length} ASIN${asins.length === 1 ? '' : 's'}`);
    } catch {
      setError('Could not copy ASINs to clipboard');
    }
  };

  const continueToAddListings = () => {
    const asins = selectedRows.map(row => row.asin);
    if (asins.length === 0) {
      setError('Select at least one ASIN to continue');
      return;
    }

    const nonce = `${Date.now()}`;
    sessionStorage.setItem('asinPrecheckHandoff', JSON.stringify({
      sellerId,
      templateId,
      asins,
      region,
      nonce,
      createdAt: Date.now()
    }));

    setRows([]);
    setSelectedIds(new Set());
    setProgress({ current: 0, total: 0 });
    setAsinInput('');
    navigate(`/admin/template-listings?templateId=${templateId}&sellerId=${sellerId}&fromAsinPrecheck=${nonce}`);
  };

  const allCompletedSelected = completedRows.length > 0 && completedRows.every(row => selectedIds.has(row.id));

  return (
    <AdminPageShell
      title="ASIN Precheck"
      subtitle={rows.length > 0 ? `${completedRows.length}/${rows.length} checked` : undefined}
    >
      <Stack spacing={2}>
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

        <Paper sx={{ ...surfaceSx, p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                onClick={() => setSetupOpen(true)}
                startIcon={<SearchIcon />}
                sx={yellowOutlinedButtonSx}
              >
                New Precheck
              </Button>
              <Button
                variant="outlined"
                onClick={() => selectRows(completedRows)}
                disabled={completedRows.length === 0 || allCompletedSelected}
              >
                Select All
              </Button>
              <Button
                variant="outlined"
                onClick={() => selectRows(inactiveRows)}
                disabled={inactiveRows.length === 0}
              >
                Select All Inactive
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDiscardConfirmOpen(true)}
                disabled={selectedIds.size === 0}
                startIcon={<DeleteIcon />}
              >
                Discard
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
              <Chip label={`Active: ${activeCount}`} color="success" variant="outlined" />
              <Chip label={`Inactive: ${inactiveRows.length}`} color="error" variant="outlined" />
              <Chip label={`Selected: ${selectedIds.size}`} sx={{ bgcolor: alpha(BRAND_YELLOW, 0.24), fontWeight: 700 }} />
              <Button
                variant="outlined"
                onClick={copySelectedAsins}
                disabled={selectedIds.size === 0}
                startIcon={<CopyIcon />}
              >
                Copy ASINs
              </Button>
              <Button
                variant="contained"
                onClick={continueToAddListings}
                disabled={selectedIds.size === 0}
                startIcon={<PlayIcon />}
                sx={yellowFilledButtonSx}
              >
                Continue
              </Button>
            </Stack>
          </Stack>

          {running && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant={progress.total > 0 ? 'determinate' : 'indeterminate'}
                value={progress.total > 0 ? Math.min(100, (progress.current / progress.total) * 100) : undefined}
                sx={{ height: 8, borderRadius: 999 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {progress.current}/{progress.total} checked
              </Typography>
            </Box>
          )}
        </Paper>

        <TableContainer component={Paper} sx={tableContainerSx}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={tableHeaderCellSx}>
                  <Checkbox
                    checked={allCompletedSelected}
                    indeterminate={selectedIds.size > 0 && !allCompletedSelected}
                    onChange={(event) => selectRows(event.target.checked ? completedRows : [])}
                    disabled={completedRows.length === 0}
                  />
                </TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: 130 }}>ASIN</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: 132 }}>Amazon Image</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: '48%' }}>Title</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: 130 }}>SKU</TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: 110 }}>Active</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">Start a precheck to review ASINs.</Typography>
                  </TableCell>
                </TableRow>
              )}

              {rows.map(row => (
                <TableRow
                  key={row.id}
                  hover
                  selected={selectedIds.has(row.id)}
                  sx={{
                    '&.Mui-selected td': {
                      backgroundColor: `${alpha(BRAND_YELLOW, 0.16)} !important`
                    }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      disabled={row.status === 'loading'}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.asin}</TableCell>
                  <TableCell sx={{ width: 132 }}>
                    {row.status === 'loading' ? (
                      <CircularProgress size={22} />
                    ) : row.image ? (
                      <ButtonBase
                        onClick={() => setImagePreview({ src: row.image, asin: row.asin, title: row.title })}
                        sx={{
                          width: 96,
                          height: 96,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
                          bgcolor: '#fff',
                          overflow: 'hidden',
                          '&:hover': {
                            borderColor: BRAND_YELLOW_DARK,
                            boxShadow: `0 0 0 3px ${alpha(BRAND_YELLOW, 0.24)}`
                          }
                        }}
                      >
                        <Box
                          component="img"
                          src={row.image}
                          alt={row.asin}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </ButtonBase>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No image</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: '48%', minWidth: 260, maxWidth: 620 }}>
                    {row.status === 'loading' ? (
                      <Typography variant="body2" color="text.secondary">Fetching...</Typography>
                    ) : row.title ? (
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
                        {row.title}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="error">
                        {row.errors?.[0] || 'No title'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {row.sku || '...'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.status === 'loading' ? (
                      <Chip label="Checking" size="small" />
                    ) : row.active ? (
                      <Chip icon={<CheckCircleIcon />} label="Active" size="small" color="success" />
                    ) : (
                      <Chip label="Inactive" size="small" color="error" variant="outlined" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>

      <Dialog open={setupOpen} onClose={() => rows.length > 0 && !running && setSetupOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ASIN Precheck</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {loadingSetup ? (
              <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress />
              </Stack>
            ) : (
              <>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Seller</InputLabel>
                    <Select
                      value={sellerId}
                      label="Seller"
                      onChange={(event) => setSellerId(event.target.value)}
                    >
                      {sellers.map(seller => (
                        <MenuItem key={seller._id} value={seller._id}>
                          {getSellerDisplayName(seller)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Autocomplete
                    fullWidth
                    options={templates}
                    value={templates.find(template => template._id === templateId) || null}
                    getOptionLabel={(option) => option?.name || ''}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    onChange={(_, value) => setTemplateId(value?._id || '')}
                    renderInput={(params) => (
                      <TextField {...params} label="Template" placeholder="Search template" />
                    )}
                  />
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={region}
                      label="Region"
                      onChange={(event) => setRegion(event.target.value)}
                    >
                      {MARKETPLACE_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <TextField
                  label="ASINs"
                  value={asinInput}
                  onChange={(event) => setAsinInput(event.target.value)}
                  multiline
                  minRows={8}
                  fullWidth
                  placeholder="Paste ASINs here"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetupOpen(false)} disabled={rows.length === 0 || running}>
            Cancel
          </Button>
          <Button
            onClick={runPrecheck}
            variant="contained"
            disabled={loadingSetup || running}
            startIcon={running ? <CircularProgress size={16} /> : <SearchIcon />}
            sx={{
              bgcolor: BRAND_YELLOW,
              color: BRAND_DARK,
              fontWeight: 800,
              '&:hover': { bgcolor: BRAND_YELLOW_DARK }
            }}
          >
            Run Precheck
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>{imagePreview?.asin || 'Amazon Image'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} alignItems="center">
            {imagePreview?.src && (
              <Box
                component="img"
                src={imagePreview.src}
                alt={imagePreview.asin || 'Amazon product'}
                sx={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  bgcolor: '#fff',
                  borderRadius: 1,
                  border: `1px solid ${alpha(BRAND_DARK, 0.1)}`
                }}
              />
            )}
            {imagePreview?.title && (
              <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'stretch' }}>
                {imagePreview.title}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreview(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={discardConfirmOpen} onClose={() => setDiscardConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Discard Selected ASINs?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Discard {selectedIds.size} selected ASIN{selectedIds.size === 1 ? '' : 's'} from this precheck?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={discardSelected}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPageShell>
  );
}
