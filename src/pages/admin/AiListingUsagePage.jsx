import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
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

function formatNumber(value) {
  return numberFmt.format(value || 0);
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function uniqueOptions(rows, idKey, labelKey, fallback) {
  const map = new Map();
  rows.forEach((row) => {
    const id = row[idKey];
    if (!id) return;
    map.set(String(id), row[labelKey] || fallback);
  });
  return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
}

export default function AiListingUsagePage() {
  const [rows, setRows] = useState([]);
  const [fieldBreakdown, setFieldBreakdown] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [userFilter, setUserFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [ipFilter, setIpFilter] = useState('all');

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        startDate,
        endDate,
        userId: userFilter,
        sellerId: sellerFilter,
        templateId: templateFilter,
        ipAddress: ipFilter
      };
      const { data } = await api.get('/template-listings/api/openai-usage-summary', { params });
      setRows(data.rows || []);
      setFieldBreakdown(data.fieldBreakdown || []);
      setTotals(data.totals || {});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch AI listing usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userOptions = useMemo(() => uniqueOptions(rows, 'userId', 'username', 'Unknown user'), [rows]);
  const sellerOptions = useMemo(() => uniqueOptions(rows, 'sellerId', 'sellerName', 'Unknown seller'), [rows]);
  const templateOptions = useMemo(() => uniqueOptions(rows, 'templateId', 'templateName', 'Unknown template'), [rows]);
  const ipOptions = useMemo(() => {
    const ips = new Set();
    rows.forEach((row) => {
      if (row.ipAddress && row.ipAddress !== 'Unknown IP') ips.add(row.ipAddress);
    });
    return Array.from(ips).sort((a, b) => a.localeCompare(b));
  }, [rows]);

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
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>User</InputLabel>
            <Select value={userFilter} label="User" onChange={(e) => setUserFilter(e.target.value)}>
              <MenuItem value="all">All Users</MenuItem>
              {userOptions.map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Seller</InputLabel>
            <Select value={sellerFilter} label="Seller" onChange={(e) => setSellerFilter(e.target.value)}>
              <MenuItem value="all">All Sellers</MenuItem>
              {sellerOptions.map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Template</InputLabel>
            <Select value={templateFilter} label="Template" onChange={(e) => setTemplateFilter(e.target.value)}>
              <MenuItem value="all">All Templates</MenuItem>
              {templateOptions.map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>IP Address</InputLabel>
            <Select value={ipFilter} label="IP Address" onChange={(e) => setIpFilter(e.target.value)}>
              <MenuItem value="all">All IPs</MenuItem>
              {ipOptions.map((ip) => <MenuItem key={ip} value={ip}>{ip}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={fetchUsage} disabled={loading} startIcon={<CalendarMonthIcon />}>
            Apply
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
                    <TableCell colSpan={11} align="center" sx={{ py: 5, color: 'text.secondary' }}>
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

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Token Usage By Field</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
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
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No field usage found.
                    </TableCell>
                  </TableRow>
                ) : fieldBreakdown.map((row) => (
                  <TableRow key={row.fieldName} hover>
                    <TableCell>{row.fieldName}</TableCell>
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
