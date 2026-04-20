import { useEffect, useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { 
  Paper, Box, Typography, Grid, Chip, Stack, CircularProgress, 
  Button, Divider 
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  DateRange as DateRangeIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import api from '../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../theme/appTheme.js';

export default function TemplateListingStatsCard({ templateId, sellerId, onViewDetails }) {
  const theme = useTheme();
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const statCardSx = {
    p: { xs: 1, md: 1.15 },
    minHeight: { xs: 72, md: 78 },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: `${dashboardTheme.radius.card - 8}px`,
    backgroundColor: theme.palette.background.paper,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.08),
    boxShadow: '0 8px 18px rgba(15, 23, 42, 0.035)',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: alpha(BRAND_YELLOW_DARK, 0.28),
      boxShadow: '0 12px 22px rgba(15, 23, 42, 0.07)'
    }
  };
  const statMetaSx = {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 0.45,
    flex: '1 1 auto'
  };
  const statHeadingSx = {
    minWidth: 0
  };
  const statLabelSx = {
    fontWeight: 700,
    lineHeight: 1.1,
    whiteSpace: 'nowrap'
  };
  const statValueSx = {
    fontWeight: 700,
    color: 'text.primary',
    fontSize: { xs: '1.7rem', md: '1.9rem' },
    lineHeight: 1,
    flexShrink: 0,
    textAlign: 'right'
  };
  const statChipSx = {
    height: 22,
    fontSize: '0.68rem',
    border: '1px solid'
  };

  const fetchStats = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const { data } = await api.get('/template-listings/stats', {
        params: { templateId, sellerId }
      });
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [templateId, sellerId]);

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: `${dashboardTheme.radius.card}px`, border: '1px solid', borderColor: 'error.light', backgroundColor: theme.palette.background.paper }}>
        <Typography color="error" variant="body2">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 1.2, md: 1.4 }, mb: 2, borderRadius: `${dashboardTheme.radius.card}px`, border: '1px solid', borderColor: alpha(BRAND_DARK, 0.08), backgroundColor: theme.palette.background.paper, boxShadow: dashboardTheme.shadows.card, color: 'text.primary' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AnalyticsIcon sx={{ color: BRAND_DARK, fontSize: 20 }} />
          <Typography sx={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Listing Activity
          </Typography>
        </Stack>
        {onViewDetails && (
          <Button 
            size="small" 
            variant="outlined" 
            onClick={onViewDetails}
            sx={{
              minHeight: 32,
              borderRadius: `${dashboardTheme.radius.pill}px`,
              px: 1.25,
              fontSize: '0.8rem',
              color: BRAND_DARK,
              borderColor: BRAND_YELLOW_DARK,
              backgroundColor: alpha(BRAND_YELLOW, 0.08),
              '&:hover': {
                borderColor: BRAND_YELLOW_DARK,
                backgroundColor: alpha(BRAND_YELLOW, 0.18)
              }
            }}
          >
            View Details →
          </Button>
        )}
      </Stack>
      
      <Divider sx={{ mb: 1 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
          <CircularProgress size={34} color="primary" />
        </Box>
      ) : (
        <Grid container spacing={1.25}>
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Box sx={statMetaSx}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={statHeadingSx}>
                  <CalendarIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary" sx={statLabelSx}>
                    Today
                  </Typography>
                </Stack>
                <Chip 
                  label="Active" 
                  size="small" 
                  sx={{ 
                    ...statChipSx,
                    bgcolor: dashboardTheme.tones.success.background,
                    borderColor: dashboardTheme.tones.success.border,
                    color: dashboardTheme.tones.success.color
                  }} 
                />
              </Box>
              <Typography sx={statValueSx}>
                {stats?.today || 0}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Box sx={statMetaSx}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={statHeadingSx}>
                  <DateRangeIcon fontSize="small" color="info" />
                  <Typography variant="caption" color="text.secondary" sx={statLabelSx}>
                    This Week
                  </Typography>
                </Stack>
                <Chip 
                  label="7 Days" 
                  size="small" 
                  sx={{ 
                    ...statChipSx,
                    bgcolor: alpha(BRAND_YELLOW, 0.12),
                    borderColor: alpha(BRAND_YELLOW_DARK, 0.22),
                    color: BRAND_DARK
                  }} 
                />
              </Box>
              <Typography sx={statValueSx}>
                {stats?.thisWeek || 0}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Box sx={statMetaSx}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={statHeadingSx}>
                  <TrendingUpIcon fontSize="small" color="secondary" />
                  <Typography variant="caption" color="text.secondary" sx={statLabelSx}>
                    This Month
                  </Typography>
                </Stack>
                <Chip 
                  label="Current" 
                  size="small" 
                  sx={{ 
                    ...statChipSx,
                    bgcolor: alpha(BRAND_YELLOW, 0.12),
                    borderColor: alpha(BRAND_YELLOW_DARK, 0.22),
                    color: BRAND_DARK
                  }} 
                />
              </Box>
              <Typography sx={statValueSx}>
                {stats?.thisMonth || 0}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={{ ...statCardSx, borderColor: alpha(BRAND_YELLOW_DARK, 0.28), backgroundColor: alpha(BRAND_YELLOW, 0.08) }}>
              <Box sx={statMetaSx}>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={statHeadingSx}>
                  <InventoryIcon fontSize="small" color="primary" />
                  <Typography variant="caption" color="text.secondary" sx={statLabelSx}>
                    Total Active
                  </Typography>
                </Stack>
                <Chip 
                  label="All Time" 
                  size="small" 
                  sx={{ 
                    ...statChipSx,
                    bgcolor: alpha(BRAND_YELLOW, 0.14),
                    borderColor: alpha(BRAND_YELLOW_DARK, 0.24),
                    color: BRAND_DARK
                  }} 
                />
              </Box>
              <Typography sx={statValueSx}>
                {stats?.total || 0}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
}
