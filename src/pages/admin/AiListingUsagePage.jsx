import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RefreshIcon from '@mui/icons-material/Refresh';
import StoreIcon from '@mui/icons-material/Store';
import TokenIcon from '@mui/icons-material/Token';
import api from '../../lib/api';

const numberFmt = new Intl.NumberFormat('en-US');
const knownIpLabels = {
  '103.75.43.140': 'GROWMENTALITY',
  '122.172.171.84': 'Airtel_Table 3',
  '122.177.190.139': 'Airtel_sach_2412'
};

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function toDateTimeLocal(dateValue, timeValue = '00:00') {
  return `${dateValue}T${timeValue}`;
}

function toIsoDateTime(value) {
  return value ? new Date(value).toISOString() : undefined;
}

function formatNumber(value) {
  return numberFmt.format(value || 0);
}

function formatCallsPerAsin(aiCalls, successfulAsinCount) {
  if (!successfulAsinCount) return '-';
  return (Number(aiCalls || 0) / Number(successfulAsinCount)).toFixed(2);
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function getDuplicateAsinSummary(runs = [], expectedAiFieldCount = 0) {
  const expectedCount = Math.max(0, Number(expectedAiFieldCount || 0));
  const counts = getAsinRunCounts(runs);
  const duplicateAsins = counts
    .filter((item) => item.count > expectedCount)
    .map(({ asin, count }) => ({
      asin,
      count,
      expectedCount,
      extraCount: count - expectedCount
    }))
    .sort((a, b) => b.extraCount - a.extraCount || b.count - a.count);
  return {
    duplicateAsins,
    duplicateRunCount: duplicateAsins.reduce((sum, item) => sum + item.count, 0),
    extraRunCount: duplicateAsins.reduce((sum, item) => sum + item.extraCount, 0)
  };
}

function getDuplicateAsinCount(row) {
  return getDuplicateAsinSummary(row?.successfulAsinRuns, row?.expectedAiFieldCount).duplicateAsins.length;
}

function getAsinRunCounts(runs = []) {
  const counts = runs.reduce((acc, run) => {
    if (run.asin) acc[run.asin] = (acc[run.asin] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([asin, count]) => ({ asin, count }))
    .sort((a, b) => a.asin.localeCompare(b.asin));
}

function getAsinRunGroups(runs = [], expectedAiFieldCount = 0) {
  const expectedCount = Math.max(0, Number(expectedAiFieldCount || 0));
  const counts = getAsinRunCounts(runs);
  return {
    withinExpected: counts.filter((item) => item.count <= expectedCount),
    overExpected: counts
      .filter((item) => item.count > expectedCount)
      .map((item) => ({ ...item, extraCount: item.count - expectedCount }))
  };
}

function formatIpAddress(value) {
  if (!value) return 'Unknown IP';
  const label = knownIpLabels[value];
  return label ? `${value} (${label})` : value;
}

function findSelectedOption(options, id, allLabel) {
  if (!id || id === 'all') return { id: 'all', label: allLabel };
  return options.find((option) => option.id === id) || { id, label: id };
}

function UsageFilter({ label, allLabel, value, options, onChange, minWidth = 190 }) {
  const fullOptions = useMemo(() => [{ id: 'all', label: allLabel }, ...options], [allLabel, options]);
  return (
    <Autocomplete
      size="small"
      options={fullOptions}
      value={findSelectedOption(fullOptions, value, allLabel)}
      onChange={(_, option) => onChange(option?.id || 'all')}
      getOptionLabel={(option) => option?.label || ''}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Typography variant="body2">{option.label}</Typography>
            {option.id !== 'all' && (
              <Typography variant="caption" color="text.secondary">
                {option.secondary ? `${option.secondary} - ` : ''}{formatNumber(option.count)} calls
              </Typography>
            )}
          </Box>
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ minWidth }}
    />
  );
}

export default function AiListingUsagePage() {
  const [rows, setRows] = useState([]);
  const [fieldBreakdown, setFieldBreakdown] = useState([]);
  const [ipBreakdown, setIpBreakdown] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ users: [], sellers: [], templates: [], ips: [] });
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [singleDate, setSingleDate] = useState(getDefaultEndDate);
  const [startDateTime, setStartDateTime] = useState(() => toDateTimeLocal(getDefaultStartDate()));
  const [endDateTime, setEndDateTime] = useState(() => toDateTimeLocal(getDefaultEndDate(), '23:59'));
  const [singleDateTime, setSingleDateTime] = useState(() => toDateTimeLocal(getDefaultEndDate()));
  const [dateMode, setDateMode] = useState('single');
  const [timeFilterEnabled, setTimeFilterEnabled] = useState(false);
  const [userFilter, setUserFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');
  const [asinDialogRow, setAsinDialogRow] = useState(null);
  const [copiedAsinGroup, setCopiedAsinGroup] = useState('');

  const fetchUsage = async (overrides = {}) => {
    try {
      setLoading(true);
      setError('');
      const activeDateMode = overrides.dateMode ?? dateMode;
      const activeStartDate = overrides.startDate ?? startDate;
      const activeEndDate = overrides.endDate ?? endDate;
      const activeSingleDate = overrides.singleDate ?? singleDate;
      const activeStartDateTime = overrides.startDateTime ?? startDateTime;
      const activeEndDateTime = overrides.endDateTime ?? endDateTime;
      const activeSingleDateTime = overrides.singleDateTime ?? singleDateTime;
      const activeTimeFilterEnabled = overrides.timeFilterEnabled ?? timeFilterEnabled;
      const selectedStartDate = activeDateMode === 'single' ? activeSingleDate : activeStartDate;
      const selectedEndDate = activeDateMode === 'single' ? activeSingleDate : activeEndDate;
      const params = {
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        userId: overrides.userFilter ?? userFilter,
        sellerId: overrides.sellerFilter ?? sellerFilter,
        templateId: overrides.templateFilter ?? templateFilter,
        ipAddress: overrides.ipFilter ?? ipFilter
      };
      if (activeTimeFilterEnabled) {
        params.startDate = undefined;
        params.endDate = undefined;
        params.startDateTime = activeDateMode === 'single'
          ? toIsoDateTime(activeSingleDateTime)
          : toIsoDateTime(activeStartDateTime);
        params.endDateTime = activeDateMode === 'single'
          ? undefined
          : toIsoDateTime(activeEndDateTime);
      }
      const { data } = await api.get('/template-listings/api/openai-usage-summary', { params });
      setRows(data.rows || []);
      setFieldBreakdown(data.fieldBreakdown || []);
      setIpBreakdown(data.ipBreakdown || []);
      setFilterOptions(data.filterOptions || { users: [], sellers: [], templates: [], ips: [] });
      setTotals(data.totals || {});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch AI listing usage');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    const defaultStartDate = getDefaultStartDate();
    const defaultEndDate = getDefaultEndDate();
    setDateMode('single');
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSingleDate(defaultEndDate);
    setStartDateTime(toDateTimeLocal(defaultStartDate));
    setEndDateTime(toDateTimeLocal(defaultEndDate, '23:59'));
    setSingleDateTime(toDateTimeLocal(defaultEndDate));
    setTimeFilterEnabled(false);
    setUserFilter('all');
    setSellerFilter('all');
    setTemplateFilter('all');
    setIpFilter('all');
    fetchUsage({
      dateMode: 'single',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      singleDate: defaultEndDate,
      startDateTime: toDateTimeLocal(defaultStartDate),
      endDateTime: toDateTimeLocal(defaultEndDate, '23:59'),
      singleDateTime: toDateTimeLocal(defaultEndDate),
      timeFilterEnabled: false,
      userFilter: 'all',
      sellerFilter: 'all',
      templateFilter: 'all',
      ipFilter: 'all'
    });
  };

  useEffect(() => {
    fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCopiedAsinGroup('');
  }, [asinDialogRow]);

  const repeatedIpCount = useMemo(
    () => ipBreakdown.filter((row) => (row.userCount || 0) > 1).length,
    [ipBreakdown]
  );
  const visibleSuccessfulAsinTotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.successfulAsinCount || 0), 0),
    [rows]
  );
  const visibleOverExpectedTotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.overExpectedCalls || 0), 0),
    [rows]
  );
  const asinDialogRuns = asinDialogRow?.successfulAsinRuns || [];
  const asinDialogDuplicateSummary = useMemo(
    () => getDuplicateAsinSummary(asinDialogRuns, asinDialogRow?.expectedAiFieldCount),
    [asinDialogRuns, asinDialogRow?.expectedAiFieldCount]
  );
  const asinDialogGroups = useMemo(
    () => getAsinRunGroups(asinDialogRuns, asinDialogRow?.expectedAiFieldCount),
    [asinDialogRuns, asinDialogRow?.expectedAiFieldCount]
  );

  const copyAsins = async (items, groupName) => {
    const text = items.map((item) => item.asin).join('\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedAsinGroup(groupName);
    setTimeout(() => setCopiedAsinGroup(''), 1600);
  };

  const tableContainerSx = {
    mb: 3,
    maxHeight: 620,
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: 2,
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)'
  };
  const tableSx = {
    '& th': {
      bgcolor: '#f8fafc',
      color: '#334155',
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 0,
      whiteSpace: 'nowrap',
      px: 1,
      borderBottom: '1px solid #dbe3ef'
    },
    '& td': {
      px: 1,
      py: 1.1,
      whiteSpace: 'nowrap',
      borderBottom: '1px solid #edf2f7',
      fontSize: 13
    },
    '& tbody tr:hover td': {
      bgcolor: '#f8fafc'
    }
  };
  const metricCardSx = {
    flex: 1,
    minWidth: 190,
    border: '1px solid #e5e7eb',
    borderRadius: 2,
    boxShadow: '0 10px 22px rgba(15, 23, 42, 0.05)'
  };

  return (
    <Container maxWidth={false} sx={{ py: 2.5, px: { xs: 2, lg: 3 }, bgcolor: '#f6f8fb', minHeight: '100vh' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" /> AI Listing Usage
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsage} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)' }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={dateMode}
            onChange={(_, value) => {
              if (value) setDateMode(value);
            }}
            aria-label="Date filter mode"
          >
            <ToggleButton value="single">Single Date</ToggleButton>
            <ToggleButton value="range">Date Range</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={timeFilterEnabled ? 'time' : 'date'}
            onChange={(_, value) => {
              if (value) setTimeFilterEnabled(value === 'time');
            }}
            aria-label="Time filter mode"
          >
            <ToggleButton value="date">Date Only</ToggleButton>
            <ToggleButton value="time">Date + Time</ToggleButton>
          </ToggleButtonGroup>
          {dateMode === 'single' ? (
            timeFilterEnabled ? (
              <TextField
                label="Show After"
                type="datetime-local"
                size="small"
                value={singleDateTime}
                onChange={(e) => setSingleDateTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 220 }}
              />
            ) : (
              <TextField
                label="Date"
                type="date"
                size="small"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
            )
          ) : (
            <>
              {timeFilterEnabled ? (
                <>
                  <TextField
                    label="Start Date & Time"
                    type="datetime-local"
                    size="small"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 220 }}
                  />
                  <TextField
                    label="End Date & Time"
                    type="datetime-local"
                    size="small"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 220 }}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    size="small"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 160 }}
                  />
                </>
              )}
            </>
          )}
          <UsageFilter label="User" allLabel="All Users" value={userFilter} options={filterOptions.users || []} onChange={setUserFilter} />
          <UsageFilter label="Seller" allLabel="All Sellers" value={sellerFilter} options={filterOptions.sellers || []} onChange={setSellerFilter} />
          <UsageFilter label="Template" allLabel="All Templates" value={templateFilter} options={filterOptions.templates || []} onChange={setTemplateFilter} minWidth={220} />
          <UsageFilter
            label="IP Address"
            allLabel="All IPs"
            value={ipFilter}
            options={(filterOptions.ips || []).map((option) => ({
              ...option,
              label: formatIpAddress(option.label || option.id)
            }))}
            onChange={setIpFilter}
          />
          <Button variant="contained" onClick={fetchUsage} disabled={loading} startIcon={<CalendarMonthIcon />}>
            Apply
          </Button>
          <Button variant="outlined" onClick={clearFilters} disabled={loading}>
            Clear
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 2 }}>
            <Card sx={{ ...metricCardSx, bgcolor: '#eff6ff' }}>
              <CardContent>
                <TokenIcon sx={{ color: '#2563eb', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.totalTokens)}</Typography>
                <Typography variant="body2" color="text.secondary">Total Tokens</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#f0fdf4' }}>
              <CardContent>
                <Inventory2Icon sx={{ color: '#16a34a', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.successfulAsinCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Distinct ASINs</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#ecfdf5' }}>
              <CardContent>
                <Inventory2Icon sx={{ color: '#059669', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(visibleSuccessfulAsinTotal)}</Typography>
                <Typography variant="body2" color="text.secondary">Successful ASINs</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#fffbeb' }}>
              <CardContent>
                <AutoAwesomeIcon sx={{ color: '#d97706', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.aiCalls)}</Typography>
                <Typography variant="body2" color="text.secondary">AI Field Calls</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#ffffff' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#374151', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(rows.length)}</Typography>
                <Typography variant="body2" color="text.secondary">User/Seller/Template/IP Rows</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#eef2ff' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#4f46e5', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.uniqueIpCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Unique IP Addresses</Typography>
              </CardContent>
            </Card>
            <Card sx={{ ...metricCardSx, bgcolor: '#fff1f2' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#e11d48', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(repeatedIpCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Repeated IPs</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25, color: '#0f172a' }}>Usage By User, Seller, Template, IP</Typography>
          <TableContainer component={Paper} sx={tableContainerSx}>
            <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 1680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 165 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Seller</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 190 }}>Template</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Expected AI Fields</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Over Expected Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls / Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Duplicate ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prompt</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Output</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Failed</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 165 }}>Last Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No OpenAI listing usage found for this date range.
                    </TableCell>
                  </TableRow>
                ) : rows.map((row, index) => (
                  <TableRow
                    key={`${row.userId || 'unknown'}-${row.sellerId || 'unknown'}-${row.templateId || 'unknown'}-${row.ipAddress || 'unknown'}`}
                    hover
                    sx={{ bgcolor: index % 2 === 0 ? '#ffffff' : '#fcfcfd' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{row.username}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.userRole || row.userEmail || ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.sellerName}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.sellerEmail || ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Source: ${row.ipSource || 'unknown'}\n${(row.userAgents || []).join('\n') || 'No user agent recorded'}`}>
                        <span>{formatIpAddress(row.ipAddress)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <Tooltip title={row.templateName || ''}>
                        <span>{row.templateName}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{formatNumber(row.expectedAiFieldCount)}</TableCell>
                    <TableCell align="right" sx={{ color: (row.overExpectedCalls || 0) > 0 ? 'error.main' : 'text.primary', fontWeight: (row.overExpectedCalls || 0) > 0 ? 700 : 400 }}>
                      {formatNumber(row.overExpectedCalls)}
                    </TableCell>
                    <TableCell align="right">{formatCallsPerAsin(row.aiCalls, row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setAsinDialogRow(row)}
                        disabled={!row.successfulAsinRunCount}
                        sx={{ minWidth: 0, px: 0.75, fontWeight: 800 }}
                      >
                        {formatNumber(row.successfulAsinCount)}
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={getDuplicateAsinCount(row) > 0 ? 'contained' : 'text'}
                        color={getDuplicateAsinCount(row) > 0 ? 'warning' : 'inherit'}
                        onClick={() => setAsinDialogRow(row)}
                        disabled={!row.successfulAsinRunCount}
                        sx={{ minWidth: 0, px: 0.75, fontWeight: 800 }}
                      >
                        {formatNumber(getDuplicateAsinCount(row))}
                      </Button>
                    </TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.promptTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.completionTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.failedCalls)}</TableCell>
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow sx={{ '& td': { bgcolor: '#f8fafc', borderTop: '2px solid #dbe3ef', fontWeight: 800 } }}>
                    <TableCell colSpan={5} align="right">Total</TableCell>
                    <TableCell align="right" sx={{ color: visibleOverExpectedTotal > 0 ? 'error.main' : 'text.primary' }}>
                      {formatNumber(visibleOverExpectedTotal)}
                    </TableCell>
                    <TableCell />
                    <TableCell align="right">{formatNumber(visibleSuccessfulAsinTotal)}</TableCell>
                    <TableCell />
                    <TableCell colSpan={6} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>

          <Dialog open={Boolean(asinDialogRow)} onClose={() => setAsinDialogRow(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: 3 }}>
              Successful ASIN Runs
              {asinDialogRow && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {asinDialogRow.username} - {asinDialogRow.sellerName} - {formatIpAddress(asinDialogRow.ipAddress)} - {asinDialogRow.templateName}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent dividers>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Chip label={`${formatNumber(asinDialogRow?.successfulAsinCount)} distinct ASINs`} color="success" variant="outlined" />
                <Chip label={`${formatNumber(asinDialogRow?.successfulAsinRunCount)} successful runs`} color="primary" variant="outlined" />
                <Chip
                  label={`${formatNumber(asinDialogDuplicateSummary.duplicateAsins.length)} ASINs over expected fields`}
                  color={asinDialogDuplicateSummary.duplicateAsins.length ? 'warning' : 'default'}
                  variant="outlined"
                />
                <Chip
                  label={`${formatNumber(asinDialogDuplicateSummary.extraRunCount)} extra runs`}
                  color={asinDialogDuplicateSummary.extraRunCount ? 'warning' : 'default'}
                  variant="outlined"
                />
              </Stack>

              <Stack spacing={2} sx={{ mb: 2 }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Distinct ASINs not over Expected AI Fields ({formatNumber(asinDialogGroups.withinExpected.length)})
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyIcon fontSize="small" />}
                      onClick={() => copyAsins(asinDialogGroups.withinExpected, 'within')}
                      disabled={asinDialogGroups.withinExpected.length === 0}
                    >
                      {copiedAsinGroup === 'within' ? 'Copied' : 'Copy ASINs'}
                    </Button>
                  </Stack>
                  {asinDialogGroups.withinExpected.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No ASINs stayed within the expected run count.</Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                      {asinDialogGroups.withinExpected.map((item) => (
                        <Chip key={item.asin} label={`${item.asin} x ${item.count}`} size="small" />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      ASINs over Expected AI Fields ({formatNumber(asinDialogGroups.overExpected.length)})
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<ContentCopyIcon fontSize="small" />}
                      onClick={() => copyAsins(asinDialogGroups.overExpected, 'over')}
                      disabled={asinDialogGroups.overExpected.length === 0}
                    >
                      {copiedAsinGroup === 'over' ? 'Copied' : 'Copy ASINs'}
                    </Button>
                  </Stack>
                  {asinDialogGroups.overExpected.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No ASINs ran more than Expected AI Fields.</Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                      {asinDialogGroups.overExpected.map((item) => (
                        <Chip
                          key={item.asin}
                          label={`${item.asin} x ${item.count} (${item.extraCount} extra)`}
                          color="warning"
                          size="small"
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </Stack>

              <TableContainer component={Paper} sx={{ maxHeight: 420, border: '1px solid #e5e7eb' }}>
                <Table stickyHeader size="small" sx={tableSx}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ASIN</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Run Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {asinDialogRuns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No successful ASIN runs recorded for this row.
                        </TableCell>
                      </TableRow>
                    ) : asinDialogRuns.map((run, index) => (
                      <TableRow key={`${run.asin}-${run.fieldName || 'field'}-${run.timestamp || index}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{run.asin}</TableCell>
                        <TableCell>{run.fieldName || 'Unknown field'}</TableCell>
                        <TableCell>{formatDateTime(run.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAsinDialogRow(null)}>Close</Button>
            </DialogActions>
          </Dialog>

          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25, color: '#0f172a' }}>IP Summary</Typography>
          <TableContainer component={Paper} sx={tableContainerSx}>
            <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 1480 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 210 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Repeated?</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Times Used</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls / Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Users</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Sellers</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Templates</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 190 }}>First Seen</TableCell>
                  <TableCell sx={{ fontWeight: 700, minWidth: 165 }}>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ipBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No IP usage found.
                    </TableCell>
                  </TableRow>
                ) : ipBreakdown.map((row, index) => (
                  <TableRow key={row.ipAddress} hover sx={{ bgcolor: index % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{formatIpAddress(row.ipAddress)}</TableCell>
                    <TableCell>{(row.ipSources || []).join(', ') || 'unknown'}</TableCell>
                    <TableCell>{(row.userCount || 0) > 1 ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right">{formatCallsPerAsin(row.aiCalls, row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.userCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.sellerCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.templateCount)}</TableCell>
                    <TableCell>{formatDateTime(row.firstUsedAt)}</TableCell>
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" fontWeight={800} sx={{ mb: 1.25, color: '#0f172a' }}>Token Usage By Field</Typography>
          <TableContainer component={Paper} sx={tableContainerSx}>
            <Table stickyHeader size="small" sx={{ ...tableSx, minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Field</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls / Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prompt Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Output Tokens</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fieldBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No field usage found.
                    </TableCell>
                  </TableRow>
                ) : fieldBreakdown.map((row, index) => (
                  <TableRow key={row.fieldName || `field-${index}`} hover sx={{ bgcolor: index % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                    <TableCell>{row.fieldName || 'Unknown field'}</TableCell>
                    <TableCell align="right">{formatCallsPerAsin(row.aiCalls, row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.promptTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.completionTokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

        </>
      )}
    </Container>
  );
}
