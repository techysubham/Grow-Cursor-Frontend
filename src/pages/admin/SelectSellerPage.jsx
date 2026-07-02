import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Button, Alert, TextField, InputAdornment, Paper, Stack, Skeleton
} from '@mui/material';
import {
  Person as PersonIcon,
  Search as SearchIcon,
  ArrowForward as ArrowForwardIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import Chip from '@mui/material/Chip';

// ── Skeleton card ────────────────────────────────────────────────────────────
function SellerCardSkeleton() {
  return (
    <Card sx={{ height: '100%', borderRadius: 3, border: `1px solid ${alpha(BRAND_DARK, 0.08)}` }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="50%" height={18} />
          </Box>
        </Stack>
        <Skeleton variant="text" width="40%" height={18} />
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Skeleton variant="rounded" width="100%" height={38} sx={{ borderRadius: 1.5 }} />
      </CardActions>
    </Card>
  );
}

export default function SelectSellerPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const templateId = searchParams.get('templateId');
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Map of sellerId -> array of { country, isBlocked, currentCount, limit }
  const [limitsBySellerMap, setLimitsBySellerMap] = useState({});

  useEffect(() => { fetchSellers(); fetchLimitStatuses(); }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSellers(sellers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredSellers(sellers.filter(seller => {
        const username = seller.user?.username?.toLowerCase() || '';
        const email = seller.user?.email?.toLowerCase() || '';
        return username.includes(query) || email.includes(query);
      }));
    }
  }, [searchQuery, sellers]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
      setFilteredSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
      setError('Failed to fetch sellers');
    } finally {
      setLoading(false);
    }
  };

  const fetchLimitStatuses = async () => {
    try {
      const { data } = await api.get('/seller-upload-limits');
      const map = {};
      (data || []).forEach(item => {
        const sid = item.seller?._id || item.seller;
        if (!map[sid]) map[sid] = [];
        map[sid].push({ country: item.country, isBlocked: item.isBlocked, currentCount: item.currentCount, limit: item.limit });
      });
      setLimitsBySellerMap(map);
    } catch {
      // Non-critical — silently skip if the endpoint is unavailable
    }
  };

  const handleSelectSeller = (sellerId) => {
    if (returnTo === 'template-listings' && templateId) {
      navigate(`/admin/template-listings?templateId=${templateId}&sellerId=${sellerId}`);
    } else {
      navigate(`/admin/seller-templates?sellerId=${sellerId}`);
    }
  };

  const getSellerDisplayName = (seller) =>
    seller.user?.username || seller.user?.email || 'Unknown Seller';

  // Avatar colours keyed by first letter for visual variety
  const avatarBg = (name) => {
    const colours = [BRAND_DARK, alpha(BRAND_DARK, 0.75), '#1e3a5f', '#2d4a6e', '#1a3040'];
    return colours[name.charCodeAt(0) % colours.length];
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, backgroundColor: theme.palette.background.paper, minHeight: '100vh' }}>

      {/* Page Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3, pt: 2 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.8)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${alpha(BRAND_DARK, 0.25)}`
        }}>
          <GroupIcon sx={{ color: BRAND_YELLOW, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK, letterSpacing: -0.5 }}>
            Select Seller
          </Typography>
          {!loading && sellers.length > 0 && (
            <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.45), fontWeight: 500 }}>
              {sellers.length} seller{sellers.length !== 1 ? 's' : ''} available
            </Typography>
          )}
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Search Bar */}
      <Paper sx={{
        p: 2, mb: 3,
        borderRadius: `${dashboardTheme.radius.card}px`,
        border: `1px solid ${alpha(BRAND_DARK, 0.08)}`,
        boxShadow: dashboardTheme.shadows.card
      }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search sellers by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#b8860b', borderWidth: 2 }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Loading skeleton grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <SellerCardSkeleton />
            </Grid>
          ))}
        </Grid>

      ) : filteredSellers.length === 0 ? (
        <Paper sx={{
          p: 5, textAlign: 'center',
          borderRadius: `${dashboardTheme.radius.card}px`,
          border: `1px solid ${alpha(BRAND_DARK, 0.07)}`,
          background: dashboardTheme.surfaces?.emptyState || alpha(BRAND_DARK, 0.02)
        }}>
          <PersonIcon sx={{ fontSize: 56, color: alpha(BRAND_DARK, 0.15), mb: 1.5 }} />
          <Typography variant="h6" fontWeight={600} sx={{ color: alpha(BRAND_DARK, 0.5) }}>
            {searchQuery ? 'No sellers match your search' : 'No sellers available'}
          </Typography>
          {searchQuery && (
            <Button onClick={() => setSearchQuery('')}
              sx={{ mt: 2, color: BRAND_DARK, fontWeight: 600, textDecoration: 'underline', '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}>
              Clear Search
            </Button>
          )}
        </Paper>

      ) : (
        <Grid container spacing={3}>
          {filteredSellers.map((seller) => {
            const name = getSellerDisplayName(seller);
            return (
              <Grid item xs={12} sm={6} md={4} key={seller._id}>
                <Card sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  border: `1px solid ${alpha(BRAND_DARK, 0.08)}`,
                  boxShadow: dashboardTheme.shadows.card,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 32px ${alpha(BRAND_DARK, 0.12)}, 0 2px 8px ${alpha(BRAND_YELLOW, 0.2)}`,
                    borderColor: alpha(BRAND_YELLOW_DARK, 0.4)
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                      {/* Avatar */}
                      <Box sx={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${avatarBg(name)} 0%, ${alpha(avatarBg(name), 0.75)} 100%)`,
                        color: BRAND_YELLOW,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.25rem', fontWeight: 800,
                        boxShadow: `0 4px 10px ${alpha(BRAND_DARK, 0.2)}`,
                        flexShrink: 0
                      }}>
                        {name.charAt(0).toUpperCase()}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle1" noWrap fontWeight={700} sx={{ color: BRAND_DARK }}>
                          {name}
                        </Typography>
                        {seller.user?.email && seller.user?.username && (
                          <Typography variant="caption" noWrap sx={{ display: 'block', color: alpha(BRAND_DARK, 0.45) }}>
                            {seller.user.email}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    <Typography variant="caption" sx={{ fontWeight: 600, color: alpha(BRAND_DARK, 0.4), letterSpacing: 0.3 }}>
                      {seller.ebayMarketplaces?.length || 0} eBay Marketplace{seller.ebayMarketplaces?.length !== 1 ? 's' : ''}
                    </Typography>

                    {/* Upload limit badges */}
                    {(limitsBySellerMap[seller._id] || []).length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                        {limitsBySellerMap[seller._id].map(ls => {
                          const pct = ls.limit > 0 ? Math.round((ls.currentCount / ls.limit) * 100) : 0;
                          const isWarn = !ls.isBlocked && pct >= 80;
                          if (!ls.isBlocked && !isWarn) return null;
                          return (
                            <Chip
                              key={ls.country}
                              label={ls.isBlocked ? `${ls.country}: Blocked` : `${ls.country}: ${pct}%`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: ls.isBlocked ? '#fde8e8' : '#fff8e1',
                                color: ls.isBlocked ? '#c0392b' : '#856404',
                                border: `1px solid ${ls.isBlocked ? '#f5c6c6' : '#ffe082'}`,
                              }}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>

                  <CardActions sx={{ p: 2, pt: 0.5 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleSelectSeller(seller._id)}
                      sx={{
                        color: BRAND_DARK,
                        backgroundColor: BRAND_YELLOW,
                        fontWeight: 700,
                        borderRadius: 1.5,
                        boxShadow: `0 4px 14px ${alpha(BRAND_YELLOW_DARK, 0.25)}`,
                        '&:hover': { backgroundColor: BRAND_YELLOW_DARK, boxShadow: `0 6px 18px ${alpha(BRAND_YELLOW_DARK, 0.35)}` }
                      }}
                    >
                      View Templates
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
