import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Badge,
  IconButton,
  Popover,
  Stack,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import api from '../lib/api';
import StatusChip from './StatusChip';
import { BRAND_DARK, BRAND_YELLOW } from '../constants/brandTheme';

const IST = 'Asia/Kolkata';

// In-house accounts that are not real sellers — hidden here the same way
// discounts.js hides them from the Discounts page and its bell.
const HIDDEN_SELLERS = ['growmentality'];

const isHiddenSeller = (sellerName) =>
  HIDDEN_SELLERS.includes(String(sellerName || '').trim().toLowerCase());

// The cron fires at 11:00 AM IST (server/src/scheduledJobs.js), so "today"
// is measured in IST too — otherwise a browser in another zone would call
// the morning's run "yesterday".
const istDayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: IST });

const formatISTTime = (d) =>
  d
    ? `${new Date(d).toLocaleTimeString('en-US', {
        timeZone: IST,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })} IST`
    : '—';

const formatISTDateTime = (d) =>
  d
    ? `${new Date(d).toLocaleString('en-US', {
        timeZone: IST,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })} IST`
    : '—';

const ACTIVE_RUN_STATUSES = ['queued', 'running', 'stopping'];
const DONE_SELLER_STATUSES = ['completed', 'failed', 'dismissed', 'interrupted'];

// Running first, then what's still coming, then what already finished.
const SELLER_SORT_ORDER = {
  running: 0,
  queued: 1,
  failed: 2,
  interrupted: 3,
  completed: 4,
  dismissed: 5,
};

const SELLER_TONE = {
  running: 'info',
  queued: 'warning',
  completed: 'success',
  failed: 'danger',
  interrupted: 'danger',
  dismissed: 'neutral',
};

const SELLER_LABEL = {
  running: 'Running',
  queued: 'In queue',
  completed: 'Done',
  failed: 'Failed',
  interrupted: 'Interrupted',
  dismissed: 'Dismissed',
};

const RUN_TONE = {
  running: 'info',
  queued: 'warning',
  stopping: 'warning',
  completed: 'success',
  failed: 'danger',
  interrupted: 'danger',
  stopped: 'neutral',
};

const sellerCaption = (s) => {
  switch (s.status) {
    case 'running':
      return s.totalPages > 0
        ? `Page ${s.currentPage} / ${s.totalPages} · ${(s.totalCount || 0).toLocaleString()} listings`
        : 'Starting…';
    case 'queued':
      return 'Waiting to start';
    case 'completed':
      return `${(s.totalCount || 0).toLocaleString()} listings · finished ${formatISTTime(s.completedAt)}`;
    case 'failed':
      return s.error || 'Failed — previous index left intact';
    case 'interrupted':
      return 'Interrupted — will resume on next server start';
    case 'dismissed':
      return 'Dismissed';
    default:
      return '';
  }
};

/**
 * Header bell showing the daily SKU Index Sync run: which sellers are done,
 * which one is syncing right now, and which are still queued.
 *
 * Reads the run document the cron job writes as it works
 * (GET /ebay/sync-sku-index/run-status) — one Mongo read, never an eBay call.
 * Fetches once on mount (so the badge is right without opening anything) and
 * again each time the popover is opened, so what you see is current. There is
 * no background polling: working in the app or switching pages never re-fetches.
 *
 * Strictly read-only — no stop, dismiss, or link into the sync page, so a run
 * can never be interrupted from here.
 */
export default function SkuIndexSyncBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [run, setRun] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Guards against overlapping requests when the bell is opened and closed
  // in quick succession
  const loadingRef = useRef(false);

  const fetchRun = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setFetchError('');
    try {
      const { data } = await api.get('/ebay/sync-sku-index/run-status');
      setRun(data.run || null);
      setFetchedAt(new Date().toISOString());
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setFetchError(`Failed to load sync status: ${msg}`);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // One read on mount so the badge is accurate before the bell is ever opened
  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  const open = Boolean(anchorEl);

  // Every count below is derived from the visible sellers, so a hidden
  // in-house account never shows up in the totals or paints the run red.
  const visibleSellers = (run?.sellers || []).filter((s) => !isHiddenSeller(s.sellerName));
  const isActive = ACTIVE_RUN_STATUSES.includes(run?.status);
  const isToday = run?.startedAt ? istDayKey(run.startedAt) === istDayKey(new Date()) : false;

  const runningCount = visibleSellers.filter((s) => s.status === 'running').length;
  const queuedCount = visibleSellers.filter((s) => s.status === 'queued').length;
  const completedCount = visibleSellers.filter((s) => s.status === 'completed').length;
  const failedCount = visibleSellers.filter((s) => ['failed', 'interrupted'].includes(s.status)).length;
  const doneCount = visibleSellers.filter((s) => DONE_SELLER_STATUSES.includes(s.status)).length;
  const totalCount = visibleSellers.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const displayStatus = !run
    ? null
    : isActive || ['stopped', 'interrupted'].includes(run.status)
      ? run.status
      : failedCount > 0 ? 'failed' : 'completed';

  // Badge counts what is still outstanding while a run is in flight; once the
  // run is over it only nags when today's run left failures behind.
  const badgeCount = isActive ? runningCount + queuedCount : 0;
  const showFailureDot = !isActive && isToday && failedCount > 0;

  const sortedSellers = [...visibleSellers].sort((a, b) => {
    const orderDiff = (SELLER_SORT_ORDER[a.status] ?? 9) - (SELLER_SORT_ORDER[b.status] ?? 9);
    if (orderDiff !== 0) return orderDiff;
    return (a.sellerName || '').localeCompare(b.sellerName || '');
  });

  const headline = !run
    ? 'No sync run recorded yet'
    : isToday
      ? isActive
        ? `Running now · ${doneCount} of ${totalCount} sellers handled`
        : `Today's run finished · ${doneCount} of ${totalCount} sellers handled`
      : `Last run ${formatISTDateTime(run.startedAt)} · ${doneCount} of ${totalCount} sellers handled`;

  return (
    <>
      <Tooltip title="SKU Index Sync — daily run progress" arrow>
        <IconButton
          onClick={(e) => { setAnchorEl(e.currentTarget); fetchRun(); }}
          sx={{
            mr: 1,
            minHeight: 40,
            minWidth: 40,
            borderRadius: 2.5,
            color: BRAND_YELLOW,
            border: '1px solid rgba(245, 200, 66, 0.22)',
            backgroundColor: 'rgba(245, 200, 66, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(245, 200, 66, 0.16)',
              borderColor: 'rgba(245, 200, 66, 0.34)',
            },
          }}
        >
          <Badge
            badgeContent={badgeCount}
            color={showFailureDot ? 'error' : 'warning'}
            max={99}
            invisible={badgeCount === 0 && !showFailureDot}
            variant={badgeCount === 0 && showFailureDot ? 'dot' : 'standard'}
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                fontWeight: 700,
                boxShadow: '0 0 0 2px rgba(15, 15, 23, 0.9)',
              },
            }}
          >
            <SyncIcon
              sx={{
                animation: isActive ? 'skuSyncSpin 2s linear infinite' : 'none',
                '@keyframes skuSyncSpin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
              }}
            />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 420, maxWidth: '95vw', borderRadius: 2 } } }}
      >
        {/* ── Header ── */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: BRAND_DARK, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <InventoryOutlinedIcon sx={{ fontSize: 18, color: BRAND_YELLOW }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              SKU Index Sync
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6) }}>
              Daily run at 11:00 AM IST
              {fetchedAt ? ` · updated ${formatISTTime(fetchedAt)}` : ''}
            </Typography>
          </Box>
          <Tooltip title="Refresh now" arrow>
            <IconButton size="small" onClick={fetchRun} disabled={loading} sx={{ color: BRAND_YELLOW }}>
              {loading ? <CircularProgress size={16} sx={{ color: BRAND_YELLOW }} /> : <RefreshIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Run summary ── */}
        {fetchError && <Alert severity="error" sx={{ m: 1.5 }}>{fetchError}</Alert>}

        {run && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
                {headline}
              </Typography>
              <StatusChip label={displayStatus} tone={RUN_TONE[displayStatus] || 'neutral'} size="small" />
            </Stack>

            <LinearProgress
              variant={isActive && totalCount === 0 ? 'indeterminate' : 'determinate'}
              value={pct}
              sx={{ height: 6, borderRadius: 3, mb: 1 }}
            />

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <StatusChip label={`${runningCount} running`} tone="info" size="small" />
              <StatusChip label={`${queuedCount} in queue`} tone="warning" size="small" />
              <StatusChip label={`${completedCount} done`} tone="success" size="small" />
              {failedCount > 0 && <StatusChip label={`${failedCount} failed`} tone="danger" size="small" />}
            </Stack>

            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
              {run.source === 'cron' ? 'Scheduled run' : 'Manual run'} · started {formatISTDateTime(run.startedAt)}
              {run.completedAt ? ` · ended ${formatISTTime(run.completedAt)}` : ''}
            </Typography>
          </Box>
        )}

        <Divider />

        {/* ── Per-seller list (display only — no controls) ── */}
        <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
          {!run && !fetchError ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
              {loading ? 'Loading…' : 'No SKU index sync run recorded yet.'}
            </Typography>
          ) : sortedSellers.length === 0 && !fetchError ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
              No sellers in this run.
            </Typography>
          ) : (
            sortedSellers.map((s, idx) => (
              <React.Fragment key={`${s.seller?._id || s.seller}-${idx}`}>
                {idx > 0 && <Divider />}
                <Box sx={{ px: 2, py: 1.1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.sellerName || 'Unknown seller'}
                    </Typography>
                    <StatusChip label={SELLER_LABEL[s.status] || s.status} tone={SELLER_TONE[s.status] || 'neutral'} size="small" />
                  </Stack>
                  <Typography
                    variant="caption"
                    component="div"
                    color={['failed', 'interrupted'].includes(s.status) ? 'error.main' : 'text.secondary'}
                  >
                    {sellerCaption(s)}
                  </Typography>
                  {s.status === 'running' && s.totalPages > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.round((s.currentPage / s.totalPages) * 100)}
                      sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                    />
                  )}
                </Box>
              </React.Fragment>
            ))
          )}
        </Box>

        {/* ── Footer ── */}
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            View only · refreshes every time you open this
          </Typography>
        </Box>
      </Popover>
    </>
  );
}
