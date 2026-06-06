import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RefreshIcon from '@mui/icons-material/Refresh';
import StoreIcon from '@mui/icons-material/Store';
import TokenIcon from '@mui/icons-material/Token';
import api from '../../lib/api';

const numberFmt = new Intl.NumberFormat('en-US');

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

function getDefaultEndDate() {
  return new Date().toISOString().slice(0, 10);
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
  const [fieldAsinBreakdown, setFieldAsinBreakdown] = useState([]);
  const [asinCallBreakdown, setAsinCallBreakdown] = useState([]);
  const [ipBreakdown, setIpBreakdown] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ users: [], sellers: [], templates: [], ips: [] });
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [singleDate, setSingleDate] = useState(getDefaultEndDate);
  const [dateMode, setDateMode] = useState('range');
  const [userFilter, setUserFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');

  const fetchUsage = async (overrides = {}) => {
    try {
      setLoading(true);
      setError('');
      const activeDateMode = overrides.dateMode ?? dateMode;
      const activeStartDate = overrides.startDate ?? startDate;
      const activeEndDate = overrides.endDate ?? endDate;
      const activeSingleDate = overrides.singleDate ?? singleDate;
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
      const { data } = await api.get('/template-listings/api/openai-usage-summary', { params });
      setRows(data.rows || []);
      setFieldBreakdown(data.fieldBreakdown || []);
      setFieldAsinBreakdown(data.fieldAsinBreakdown || []);
      setAsinCallBreakdown(data.asinCallBreakdown || []);
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
    setDateMode('range');
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSingleDate(defaultEndDate);
    setUserFilter('all');
    setSellerFilter('all');
    setTemplateFilter('all');
    setIpFilter('all');
    fetchUsage({
      dateMode: 'range',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      singleDate: defaultEndDate,
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

  const repeatedIpCount = useMemo(
    () => ipBreakdown.filter((row) => (row.userCount || 0) > 1).length,
    [ipBreakdown]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="primary" /> AI Listing Usage
        </Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchUsage} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
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
          {dateMode === 'single' ? (
            <TextField
              label="Date"
              type="date"
              size="small"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
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
          <UsageFilter label="User" allLabel="All Users" value={userFilter} options={filterOptions.users || []} onChange={setUserFilter} />
          <UsageFilter label="Seller" allLabel="All Sellers" value={sellerFilter} options={filterOptions.sellers || []} onChange={setSellerFilter} />
          <UsageFilter label="Template" allLabel="All Templates" value={templateFilter} options={filterOptions.templates || []} onChange={setTemplateFilter} minWidth={220} />
          <UsageFilter label="IP Address" allLabel="All IPs" value={ipFilter} options={filterOptions.ips || []} onChange={setIpFilter} />
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
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #dbeafe', bgcolor: '#eff6ff' }}>
              <CardContent>
                <TokenIcon sx={{ color: '#2563eb', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.totalTokens)}</Typography>
                <Typography variant="body2" color="text.secondary">Total Tokens</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #dcfce7', bgcolor: '#f0fdf4' }}>
              <CardContent>
                <Inventory2Icon sx={{ color: '#16a34a', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.successfulAsinCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Successful ASINs</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #fef3c7', bgcolor: '#fffbeb' }}>
              <CardContent>
                <AutoAwesomeIcon sx={{ color: '#d97706', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.aiCalls)}</Typography>
                <Typography variant="body2" color="text.secondary">AI Field Calls</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #e5e7eb', bgcolor: '#f9fafb' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#374151', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(rows.length)}</Typography>
                <Typography variant="body2" color="text.secondary">User/Seller/Template/IP Rows</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #e0e7ff', bgcolor: '#eef2ff' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#4f46e5', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(totals.uniqueIpCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Unique IP Addresses</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 190, border: '1px solid #fee2e2', bgcolor: '#fff1f2' }}>
              <CardContent>
                <StoreIcon sx={{ color: '#e11d48', mb: 1 }} />
                <Typography variant="h4" fontWeight={700}>{formatNumber(repeatedIpCount)}</Typography>
                <Typography variant="body2" color="text.secondary">Repeated IPs</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Usage By User, Seller, Template, IP</Typography>
          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Template</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Expected AI Fields</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Over Expected Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls / Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prompt</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Output</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Failed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No OpenAI listing usage found for this date range.
                    </TableCell>
                  </TableRow>
                ) : rows.map((row) => (
                  <TableRow key={`${row.userId || 'unknown'}-${row.sellerId || 'unknown'}-${row.templateId || 'unknown'}-${row.ipAddress || 'unknown'}`} hover>
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
                        <span>{row.ipAddress || '-'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.templateName}</TableCell>
                    <TableCell align="right">{formatNumber(row.expectedAiFieldCount)}</TableCell>
                    <TableCell align="right" sx={{ color: (row.overExpectedCalls || 0) > 0 ? 'error.main' : 'text.primary', fontWeight: (row.overExpectedCalls || 0) > 0 ? 700 : 400 }}>
                      {formatNumber(row.overExpectedCalls)}
                    </TableCell>
                    <TableCell align="right">{formatCallsPerAsin(row.aiCalls, row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.successfulAsinCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.promptTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.completionTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.failedCalls)}</TableCell>
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>IP Summary</Typography>
          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Repeated?</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Times Used</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls / Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful ASINs</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Users</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Sellers</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Templates</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>First Seen</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ipBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No IP usage found.
                    </TableCell>
                  </TableRow>
                ) : ipBreakdown.map((row) => (
                  <TableRow key={row.ipAddress} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.ipAddress || 'Unknown IP'}</TableCell>
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

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Token Usage By Field</Typography>
          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
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
                  <TableRow key={row.fieldName || `field-${index}`} hover>
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

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Repeated Field Calls By ASIN</Typography>
          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ASIN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Failed Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prompt Tokens</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Output Tokens</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>First Used</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fieldAsinBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No repeated field calls found for this filter.
                    </TableCell>
                  </TableRow>
                ) : fieldAsinBreakdown.map((row, index) => (
                  <TableRow key={`${row.fieldName || 'field'}-${row.asin || 'asin'}-${index}`} hover>
                    <TableCell>{row.fieldName || 'Unknown field'}</TableCell>
                    <TableCell>{row.asin || 'Unknown ASIN'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right">{formatNumber(row.successfulCalls)}</TableCell>
                    <TableCell align="right">{formatNumber(row.failedCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.promptTokens)}</TableCell>
                    <TableCell align="right">{formatNumber(row.completionTokens)}</TableCell>
                    <TableCell>{formatDateTime(row.firstUsedAt)}</TableCell>
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>ASINs Over Expected AI Calls</Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 520 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Template</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ASIN</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Expected AI Fields</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actual AI Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Over Expected</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Unique Fields</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Successful Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Failed Calls</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total Tokens</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asinCallBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No ASINs exceeded the expected AI field count for this filter.
                    </TableCell>
                  </TableRow>
                ) : asinCallBreakdown.map((row, index) => (
                  <TableRow key={`${row.sellerId || 'seller'}-${row.templateId || 'template'}-${row.asin || 'asin'}-${index}`} hover>
                    <TableCell>{row.sellerName || 'Unknown seller'}</TableCell>
                    <TableCell>{row.templateName || 'Unknown template'}</TableCell>
                    <TableCell>{row.asin || 'Unknown ASIN'}</TableCell>
                    <TableCell align="right">{formatNumber(row.expectedAiFieldCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.aiCalls)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{formatNumber(row.overExpectedCalls)}</TableCell>
                    <TableCell align="right">{formatNumber(row.fieldCount)}</TableCell>
                    <TableCell align="right">{formatNumber(row.successfulCalls)}</TableCell>
                    <TableCell align="right">{formatNumber(row.failedCalls)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(row.totalTokens)}</TableCell>
                    <TableCell>{formatDateTime(row.lastUsedAt)}</TableCell>
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
