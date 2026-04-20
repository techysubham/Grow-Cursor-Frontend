import { useEffect, useState } from 'react';
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

const StatBox = ({ label, value, icon: Icon, color = 'primary' }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 0.5 }}>
      <Icon color={color} fontSize="small" />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
    <Typography variant="h5" color={`${color}.main`} fontWeight="bold">
      {value !== null && value !== undefined ? value.toLocaleString() : '-'}
    </Typography>
  </Box>
);

export default function TemplateListingStatsCard({ templateId, sellerId, onViewDetails }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const statCardSx = {
    textAlign: 'center',
    p: 2,
    borderRadius: 2,
    bgcolor: 'grey.50',
    border: '1px solid',
    borderColor: 'divider',
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: 'grey.100',
      borderColor: 'grey.400'
    }
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
      <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'error.lighter' }}>
        <Typography color="error" variant="body2">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2.5, mb: 3, bgcolor: 'background.paper', color: 'text.primary' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <AnalyticsIcon color="primary" />
          <Typography variant="h6" fontWeight="600">
            Listing Activity
          </Typography>
        </Stack>
        {onViewDetails && (
          <Button 
            size="small" 
            variant="outlined" 
            onClick={onViewDetails}
          >
            View Details →
          </Button>
        )}
      </Stack>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={40} color="primary" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
                <CalendarIcon fontSize="small" color="success" />
                <Typography variant="caption" color="text.secondary">
                  Today
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {stats?.today || 0}
              </Typography>
              <Chip 
                label="Active" 
                size="small" 
                sx={{ 
                  mt: 1, 
                  bgcolor: 'success.main', 
                  color: 'white',
                  fontSize: '0.7rem'
                }} 
              />
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
                <DateRangeIcon fontSize="small" color="info" />
                <Typography variant="caption" color="text.secondary">
                  This Week
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {stats?.thisWeek || 0}
              </Typography>
              <Chip 
                label="7 Days" 
                size="small" 
                sx={{ 
                  mt: 1, 
                  bgcolor: 'info.main', 
                  color: 'white',
                  fontSize: '0.7rem'
                }} 
              />
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={statCardSx}>
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
                <TrendingUpIcon fontSize="small" color="secondary" />
                <Typography variant="caption" color="text.secondary">
                  This Month
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {stats?.thisMonth || 0}
              </Typography>
              <Chip 
                label="Current" 
                size="small" 
                sx={{ 
                  mt: 1, 
                  bgcolor: 'secondary.main', 
                  color: 'white',
                  fontSize: '0.7rem'
                }} 
              />
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box sx={{ ...statCardSx, borderColor: 'primary.light', bgcolor: 'primary.50' }}>
              <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
                <InventoryIcon fontSize="small" color="primary" />
                <Typography variant="caption" color="text.secondary">
                  Total Active
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight="bold" color="text.primary">
                {stats?.total || 0}
              </Typography>
              <Chip 
                label="All Time" 
                size="small" 
                sx={{ 
                  mt: 1, 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  fontSize: '0.7rem'
                }} 
              />
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
}
