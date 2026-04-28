import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box, Paper, Typography, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Breadcrumbs, Link, TextField, Button, FormControl,
  InputLabel, Select, MenuItem, Chip, CircularProgress, Alert, Grid,
  Card, CardContent, Collapse, IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableBodyRowSx, tableContainerSx, yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles.js';

export default function TemplateListingAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  const templateId = searchParams.get('templateId');
  const sellerId = searchParams.get('sellerId');

  const [template, setTemplate] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState('all');

  // Data
  const [analytics, setAnalytics] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);
  const [dateDetails, setDateDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  // Pagination
  const [page, setPage] = useState(1);

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const surfaceCardSx = {
    borderRadius: `${dashboardTheme.radius.card}px`,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.08),
    backgroundColor: theme.palette.background.paper,
    boxShadow: dashboardTheme.shadows.card
  };

  const breadcrumbLinkSx = {
    cursor: 'pointer',
    textDecoration: 'none',
    color: BRAND_DARK,
    fontWeight: 600,
    '&:hover': { textDecoration: 'none', color: BRAND_YELLOW_DARK }
  };

  const quickChipSx = (active) => ({
    fontWeight: 600,
    fontSize: '0.78rem',
    borderRadius: 1.5,
    cursor: 'pointer',
    backgroundColor: active ? BRAND_YELLOW : alpha(BRAND_DARK, 0.06),
    color: active ? BRAND_DARK : alpha(BRAND_DARK, 0.7),
    border: `1px solid ${active ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.12)}`,
    '&:hover': { backgroundColor: active ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.1) }
  });

  // ─── Logic ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (templateId) fetchTemplate();
    if (sellerId) fetchSeller();
  }, [templateId, sellerId]);

  useEffect(() => {
    if (templateId) fetchAnalytics();
  }, [templateId, sellerId, startDate, endDate, selectedUser, page]);

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get(`/listing-templates/${templateId}`);
      setTemplate(data);
    } catch (err) {
      console.error('Error fetching template:', err);
    }
  };

  const fetchSeller = async () => {
    try {
      const { data } = await api.get('/sellers/all');
      const foundSeller = data.find(s => s._id === sellerId);
      setSeller(foundSeller);
    } catch (err) {
      console.error('Error fetching seller:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/template-listings/analytics', {
        params: { templateId, sellerId, startDate, endDate, userId: selectedUser, page, limit: 100 }
      });
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDateDetails = async (date) => {
    if (dateDetails[date]) {
      setExpandedDate(expandedDate === date ? null : date);
      return;
    }
    try {
      setLoadingDetails(prev => ({ ...prev, [date]: true }));
      const dateStart = new Date(date); dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date); dateEnd.setHours(23, 59, 59, 999);
      const { data } = await api.get('/template-listings/analytics', {
        params: { templateId, sellerId, startDate: dateStart.toISOString(), endDate: dateEnd.toISOString(), limit: 1000 }
      });
      setDateDetails(prev => ({ ...prev, [date]: data.listings }));
      setExpandedDate(date);
    } catch (err) {
      console.error('Error fetching date details:', err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [date]: false }));
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/template-listings/analytics', {
        params: { templateId, sellerId, startDate, endDate, userId: selectedUser, limit: 10000 }
      });
      const headers = ['Date', 'Time', 'SKU', 'Title', 'ASIN', 'Added By', 'Role'];
      const rows = data.listings.map(l => [
        new Date(l.createdAt).toLocaleDateString(),
        new Date(l.createdAt).toLocaleTimeString(),
        l.customLabel || '',
        l.title || '',
        l._asinReference || '',
        l.createdBy?.username || 'Unknown',
        l.createdBy?.role || 'N/A'
      ]);
      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-analytics-${templateId}-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Failed to export data');
    }
  };

  const [activeRange, setActiveRange] = useState('thisMonth');
  const getQuickDateRange = (range) => {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'yesterday':
        start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
        break;
      case 'last7days': start.setDate(start.getDate() - 7); break;
      case 'thisMonth': start.setDate(1); start.setHours(0, 0, 0, 0); break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1); start.setDate(1); start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() - 1); end.setDate(new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()); end.setHours(23, 59, 59, 999);
        break;
      default: return;
    }
    setActiveRange(range);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setPage(1);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminPageShell>

      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2, pt: 2 }}>
        <Link component="button" variant="body2" onClick={() => navigate('/admin/select-seller')} sx={breadcrumbLinkSx}>
          Select Seller
        </Link>
        <Link component="button" variant="body2" onClick={() => navigate(`/admin/seller-templates?sellerId=${sellerId}`)} sx={breadcrumbLinkSx}>
          {seller?.user?.username || seller?.user?.email || 'Seller'}
        </Link>
        <Link component="button" variant="body2" onClick={() => navigate(`/admin/template-listings?templateId=${templateId}&sellerId=${sellerId}`)} sx={breadcrumbLinkSx}>
          {template?.name || 'Template Listings'}
        </Link>
        <Typography variant="body2" sx={{ color: BRAND_DARK, fontWeight: 600 }}>Analytics</Typography>
      </Breadcrumbs>

      <PageHeader
        title="Listing Analytics"
        subtitle={template?.name || undefined}
        actions={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={!analytics || analytics.listings?.length === 0}
            sx={yellowOutlinedButtonSx}
          >
            Export CSV
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters Card */}
      <Paper sx={{ ...surfaceCardSx, p: 2.5, mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.5), display: 'block', mb: 1.5 }}>
          Filters
        </Typography>

        {/* Quick Date Range Chips */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last7days', label: 'Last 7 Days' },
            { key: 'thisMonth', label: 'This Month' },
            { key: 'lastMonth', label: 'Last Month' }
          ].map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              size="small"
              onClick={() => getQuickDateRange(key)}
              sx={quickChipSx(activeRange === key)}
            />
          ))}
        </Stack>

        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActiveRange(null); setPage(1); }}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActiveRange(null); setPage(1); }}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>User Filter</InputLabel>
              <Select
                value={selectedUser}
                label="User Filter"
                onChange={(e) => { setSelectedUser(e.target.value); setPage(1); }}
              >
                <MenuItem value="all">All Users</MenuItem>
                {analytics?.userBreakdown?.map(u => (
                  <MenuItem key={u.userId} value={u.userId}>{u.username} ({u.count} listings)</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={fetchAnalytics}
              disabled={loading}
              sx={yellowFilledButtonSx}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: BRAND_YELLOW_DARK }} />
        </Box>
      ) : analytics ? (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Total Listings', value: analytics.summary?.totalInPeriod || 0, accent: BRAND_YELLOW },
              { label: 'Unique Users', value: analytics.summary?.uniqueUsers || 0, accent: alpha(BRAND_DARK, 0.75) },
              {
                label: 'Avg Per Day',
                value: analytics.dailyBreakdown?.length > 0
                  ? Math.round(analytics.summary.totalInPeriod / analytics.dailyBreakdown.length)
                  : 0,
                accent: BRAND_DARK
              }
            ].map(({ label, value, accent }) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Card sx={{
                  ...surfaceCardSx,
                  borderLeft: `4px solid ${accent}`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: dashboardTheme.shadows.card }
                }}>
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.5) }}>
                      {label}
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ color: BRAND_DARK, mt: 0.5, lineHeight: 1 }}>
                      {value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Daily Breakdown Table */}
          <TableContainer component={Paper} sx={{ ...tableContainerSx, mb: 3 }}>
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: BRAND_DARK, borderBottom: `2px solid ${BRAND_YELLOW}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5, color: alpha('#fff', 0.95) }}>
                Daily Breakdown
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 50 }} />
                  <TableCell sx={tableHeaderCellSx}>Date</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Total</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Contributors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.dailyBreakdown?.length > 0 ? (
                  analytics.dailyBreakdown.map((day) => (
                    <>
                      <TableRow
                        key={day.date}
                        hover
                        sx={tableBodyRowSx}
                        onClick={() => fetchDateDetails(day.date)}
                      >
                        <TableCell>
                          <IconButton size="small" sx={{ color: BRAND_DARK }}>
                            {expandedDate === day.date ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon fontSize="small" sx={{ color: alpha(BRAND_DARK, 0.4) }} />
                            <Typography variant="body2" fontWeight={500} sx={{ color: BRAND_DARK }}>
                              {new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={day.total}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              backgroundColor: BRAND_YELLOW,
                              color: BRAND_DARK,
                              border: `1px solid ${BRAND_YELLOW_DARK}`
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {day.users.map((u, idx) => (
                              <Chip
                                key={idx}
                                icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                                label={`${u.username} (${u.count})`}
                                size="small"
                                variant="outlined"
                                sx={{ borderColor: alpha(BRAND_DARK, 0.2), color: BRAND_DARK, fontWeight: 500 }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Details */}
                      <TableRow key={`${day.date}-details`}>
                        <TableCell colSpan={4} sx={{ py: 0, border: 0 }}>
                          <Collapse in={expandedDate === day.date} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, backgroundColor: alpha(BRAND_DARK, 0.03), borderBottom: `1px solid ${alpha(BRAND_DARK, 0.06)}` }}>
                              {loadingDetails[day.date] ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                  <CircularProgress size={24} sx={{ color: BRAND_YELLOW_DARK }} />
                                </Box>
                              ) : dateDetails[day.date] ? (
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      {['Time', 'SKU', 'Title', 'ASIN', 'Added By'].map(h => (
                                        <TableCell key={h} sx={{
                                          fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.4,
                                          textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.55),
                                          borderBottom: `1px solid ${alpha(BRAND_DARK, 0.1)}`
                                        }}>
                                          {h}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {dateDetails[day.date].map((listing) => (
                                      <TableRow key={listing._id} sx={{ '&:hover td': { backgroundColor: `${dashboardTheme.table.rowHover} !important` } }}>
                                        <TableCell>
                                          <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.55) }}>
                                            {new Date(listing.createdAt).toLocaleTimeString()}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" fontFamily="monospace" fontWeight={600} sx={{ color: BRAND_DARK }}>
                                            {listing.customLabel}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" noWrap sx={{ maxWidth: 300, color: BRAND_DARK }}>
                                            {listing.title}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Typography variant="body2" fontFamily="monospace" sx={{ color: alpha(BRAND_DARK, 0.6) }}>
                                            {listing._asinReference || '-'}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
                                          <Chip
                                            icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                                            label={listing.createdBy?.username || 'Unknown'}
                                            size="small"
                                            sx={{
                                              fontWeight: 600,
                                              backgroundColor: listing.createdBy?.role === 'lister'
                                                ? alpha(BRAND_YELLOW, 0.25)
                                                : alpha(BRAND_DARK, 0.07),
                                              color: BRAND_DARK,
                                              borderColor: listing.createdBy?.role === 'lister'
                                                ? BRAND_YELLOW_DARK
                                                : alpha(BRAND_DARK, 0.15),
                                              border: '1px solid'
                                            }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : null}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6, background: dashboardTheme.surfaces.emptyState }}>
                      <Typography color="text.secondary" fontWeight={500}>
                        No data available for the selected period
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* User Breakdown Table */}
          <TableContainer component={Paper} sx={tableContainerSx}>
            <Box sx={{ px: 2.5, py: 1.5, backgroundColor: BRAND_DARK, borderBottom: `2px solid ${BRAND_YELLOW}` }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5, color: alpha('#fff', 0.95) }}>
                User Breakdown
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>User</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Role</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Listings Added</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.userBreakdown?.length > 0 ? analytics.userBreakdown.map((user) => (
                  <TableRow key={user.userId} sx={tableBodyRowSx}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PersonIcon fontSize="small" sx={{ color: alpha(BRAND_DARK, 0.4) }} />
                        <Typography variant="body2" fontWeight={600} sx={{ color: BRAND_DARK }}>
                          {user.username}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: alpha(BRAND_DARK, 0.07),
                          color: BRAND_DARK,
                          border: `1px solid ${alpha(BRAND_DARK, 0.15)}`
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>
                        {user.count}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                        <Box sx={{
                          height: 6, borderRadius: 3,
                          width: `${analytics.summary?.totalInPeriod > 0 ? Math.round((user.count / analytics.summary.totalInPeriod) * 80) : 0}px`,
                          backgroundColor: BRAND_YELLOW,
                          border: `1px solid ${BRAND_YELLOW_DARK}`,
                          minWidth: 4
                        }} />
                        <Typography variant="body2" fontWeight={600} sx={{ color: alpha(BRAND_DARK, 0.7), minWidth: 36, textAlign: 'right' }}>
                          {analytics.summary?.totalInPeriod > 0
                            ? Math.round((user.count / analytics.summary.totalInPeriod) * 100)
                            : 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, background: dashboardTheme.surfaces.emptyState }}>
                      <Typography color="text.secondary" fontWeight={500}>No user data available</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary" fontWeight={500}>
            Select filters and click Apply to view analytics
          </Typography>
        </Box>
      )}
    </AdminPageShell>
  );
}
