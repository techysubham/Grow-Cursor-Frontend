import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel,
  LinearProgress, MenuItem, Paper, Select, Snackbar, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import {
  CloudUpload as SubmitIcon,
  PlayArrow as PlayIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import api, { getAuthToken } from '../../lib/api.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableContainerSx, yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles.js';

// Seller carries no name of its own — it is identified by the populated user.
// Same derivation as AsinPrecheckPage and SelectSellerPage.
const getSellerDisplayName = (seller) =>
  seller?.user?.username || seller?.user?.email || seller?.name || 'Unknown Seller';

const formatSyncedAgo = (isoDate) => {
  if (!isoDate) return 'just now';
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

// Page default. Deliberately above the compositor's 26% DEFAULT_PLACEMENT:
// badges on existing listings were judged too small at 26.
const DEFAULT_SCALE = 30;
const ANCHORS = [
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
];

export default function ListingOverlaysPage() {
  const [sellers, setSellers] = useState([]);
  const [sellerId, setSellerId] = useState('');
  const [badges, setBadges] = useState([]);
  const [badgeKey, setBadgeKey] = useState('');
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [anchor, setAnchor] = useState('bottom-right');

  const [listings, setListings] = useState([]);
  // Thumbnails fetched live from eBay for rows the index has no imageUrl for.
  // Populated per visible page; goes quiet once the SKU sync stores them.
  const [liveImages, setLiveImages] = useState({});
  // Filters are applied server-side against the SKU index, so only matching
  // listings ever reach the browser.
  const [categoryQuery, setCategoryQuery] = useState('');
  const [keywordQuery, setKeywordQuery] = useState('');
  // Listings with a live badge are hidden by default so they cannot be badged
  // twice. Showing them is opt-in and only useful alongside a revert.
  const [includeBadged, setIncludeBadged] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(0);
  // 100 matches LIVE_IMAGE_LIMIT on the server, so a full page of thumbnails is
  // still covered by a single live-images request while imageUrl is unpopulated.
  const [rowsPerPage, setRowsPerPage] = useState(100);
  // Review step gets its own paging — the cards carry two images each, so a
  // few hundred previews would otherwise mount ~1,000 images at once.
  const [previewPage, setPreviewPage] = useState(0);
  const [previewsPerPage, setPreviewsPerPage] = useState(25);
  const [previewFilter, setPreviewFilter] = useState('all');

  const [loadingListings, setLoadingListings] = useState(false);

  // Per-seller row counts and last sync time, read from SellerSkuIndex. This
  // page no longer syncs anything itself — the daily SKU Index Sync owns that.
  const [indexBySeller, setIndexBySeller] = useState({});
  // Summary of the last submitted run, so Revert stays reachable after the
  // review panel closes.
  const [lastRun, setLastRun] = useState(null);
  // Per-listing submit failures. Kept separate from `previews`, which the
  // auto-return clears — otherwise eBay's reason for each failure is lost.
  const [submitFailures, setSubmitFailures] = useState([]);

  const [previews, setPreviews] = useState([]);
  // Review-step exclusions: previewed rows the operator unticked before submit.
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [previewing, setPreviewing] = useState(false);
  const [previewProgress, setPreviewProgress] = useState({ current: 0, total: 0 });
  const [runId, setRunId] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // The search and the preview get their own EventSource refs. Sharing one
  // meant starting a preview closed the still-running search stream.
  const listingsEsRef = useRef(null);
  const previewEsRef = useRef(null);
  // A stream that finished normally still trips onerror: the server ends the
  // response, and EventSource treats any close it did not initiate as a dropped
  // connection to retry. Without this the page reports "connection lost" on
  // every successful run. Tracked per stream for the same reason as the refs.
  const listingsDoneRef = useRef(false);
  const previewDoneRef = useRef(false);
  // Item ids already asked for, so paging back and forth does not refetch.
  const requestedImageIds = useRef(new Set());

  useEffect(() => {
    Promise.all([
      api.get('/sellers/all'),
      api.get('/listing-templates/overlay-badges'),
    ]).then(([sellerRes, badgeRes]) => {
      setSellers(sellerRes.data || []);
      setBadges(badgeRes.data?.badges || []);
    }).catch(() => setError('Failed to load sellers or overlay badges'));

    refreshIndexStatus();

    return () => {
      if (listingsEsRef.current) listingsEsRef.current.close();
      if (previewEsRef.current) previewEsRef.current.close();
    };
  }, []);

  const refreshIndexStatus = () => {
    api.get('/listing-overlays/index-status')
      .then(({ data }) => {
        const byId = {};
        (data.sellers || []).forEach((row) => {
          byId[row.sellerId] = { count: row.count, syncedAt: row.syncedAt };
        });
        setIndexBySeller(byId);
      })
      .catch(() => {});
  };

  const sellerIndex = sellerId ? indexBySeller[sellerId] : null;

  // forceRefresh must be compared with === true: this is also used as an
  // onKeyDown/onClick handler, where the first argument is a DOM event.
  const loadListings = (forceRefresh) => {
    if (!sellerId) { setError('Select a seller first'); return; }

    if (listingsEsRef.current) listingsEsRef.current.close();
    listingsDoneRef.current = false;
    setError('');
    setSuccess('');
    setListings([]);
    setSelectedIds(new Set());
    setLiveImages({});
    requestedImageIds.current.clear();
    setPage(0);
    setPreviews([]);
    setRunId(null);
    setSubmitResult(null);
    setLoadingListings(true);

    const url = `${api.defaults.baseURL}/listing-overlays/listings-stream`
      + `?sellerId=${encodeURIComponent(sellerId)}`
      + `&category=${encodeURIComponent(categoryQuery.trim())}`
      + `&search=${encodeURIComponent(keywordQuery.trim())}`
      + `&includeBadged=${includeBadged ? 'true' : 'false'}`
      + `&token=${encodeURIComponent(getAuthToken())}`;

    const es = new EventSource(url);
    listingsEsRef.current = es;

    es.onmessage = (event) => {
      if (event.data === '[DONE]') {
        es.close();
        listingsEsRef.current = null;
        setLoadingListings(false);
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'item':
            setListings((prev) => [...prev, msg.item]);
            break;
          case 'complete': {
            listingsDoneRef.current = true;
            if (msg.indexEmpty) {
              setError('No listings stored for this seller yet — run "Sync listings from eBay" first.');
              break;
            }

            setSuccess(
              `Matched ${msg.matched.toLocaleString()} of ${msg.scanned.toLocaleString()} stored listing${msg.scanned === 1 ? '' : 's'}.`
              + (msg.hiddenBadged > 0
                ? ` ${msg.hiddenBadged} already badged and hidden.`
                : '')
              + (msg.hiddenEnded > 0
                ? ` ${msg.hiddenEnded} ended and hidden.`
                : '')
              + (msg.matched === 0 && !msg.hiddenBadged ? ' Try a broader category or keyword.' : '')
            );
            break;
          }
          case 'error':
            listingsDoneRef.current = true;
            setError(msg.error || 'Failed to load listings');
            break;
          default:
            break;
        }
      } catch {
        // A malformed frame should not kill an otherwise healthy crawl.
      }
    };

    es.onerror = () => {
      es.close();
      listingsEsRef.current = null;
      setLoadingListings(false);
      // Only a genuine drop is worth reporting; see listingsDoneRef.
      if (!listingsDoneRef.current) setError('Connection lost while loading listings.');
    };
  };

  // Ends the result stream early. The search is a database cursor now rather
  // than an eBay crawl, but a seller with tens of thousands of indexed listings
  // still streams for a few seconds and a broad search may be worth abandoning.
  const stopScan = () => {
    listingsDoneRef.current = true;
    if (listingsEsRef.current) {
      listingsEsRef.current.close();
      listingsEsRef.current = null;
    }
    setLoadingListings(false);
  };

  const applyOverlay = () => {
    if (!badgeKey) { setError('Pick an overlay badge first'); return; }
    if (selectedIds.size === 0) { setError('Select at least one listing'); return; }

    // Deliberately leaves listingsEsRef alone: the crawl keeps running while
    // you badge what it has already found.
    if (previewEsRef.current) previewEsRef.current.close();
    previewDoneRef.current = false;
    setError('');
    setSuccess('');
    setPreviews([]);
    setExcludedIds(new Set());
    setPreviewPage(0);
    setPreviewFilter('all');
    setSubmitResult(null);
    setSubmitFailures([]);
    setPreviewProgress({ current: 0, total: selectedIds.size });
    setPreviewing(true);

    const ids = [...selectedIds].join(',');
    const url = `${api.defaults.baseURL}/listing-overlays/preview-stream`
      + `?sellerId=${encodeURIComponent(sellerId)}`
      + `&badgeKey=${encodeURIComponent(badgeKey)}`
      + `&itemIds=${encodeURIComponent(ids)}`
      + `&scale=${scale / 100}`
      + `&anchor=${encodeURIComponent(anchor)}`
      + `&category=${encodeURIComponent(categoryQuery.trim())}`
      + `&search=${encodeURIComponent(keywordQuery.trim())}`
      + `&token=${encodeURIComponent(getAuthToken())}`;

    const es = new EventSource(url);
    previewEsRef.current = es;

    es.onmessage = (event) => {
      if (event.data === '[DONE]') {
        es.close();
        previewEsRef.current = null;
        setPreviewing(false);
        return;
      }

      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'started':
            setRunId(msg.runId);
            setPreviewProgress({ current: 0, total: msg.total });
            break;
          case 'item':
            setPreviews((prev) => [...prev, msg.item]);
            setPreviewProgress({ current: msg.progress, total: msg.total });
            break;
          case 'complete':
            previewDoneRef.current = true;
            setRunId(msg.runId);
            break;
          case 'error':
            previewDoneRef.current = true;
            setError(msg.error || 'Overlay preview failed');
            break;
          default:
            break;
        }
      } catch {
        // ignore malformed frame
      }
    };

    es.onerror = () => {
      es.close();
      previewEsRef.current = null;
      setPreviewing(false);
      if (!previewDoneRef.current) setError('Connection lost during overlay preview.');
    };
  };

  const previewedOk = previews.filter((p) => p.status === 'previewed');

  // Failures are the actionable rows and can be scattered anywhere in a large
  // batch, so they get a filter rather than requiring a page-by-page hunt.
  const filteredPreviews = useMemo(() => {
    switch (previewFilter) {
      case 'ready':
        return previews.filter((p) => p.status === 'previewed' && !excludedIds.has(p.itemId));
      case 'failed':
        return previews.filter((p) => p.status === 'failed');
      case 'excluded':
        return previews.filter((p) => excludedIds.has(p.itemId));
      default:
        return previews;
    }
  }, [previews, previewFilter, excludedIds]);

  const pagedPreviews = useMemo(
    () => filteredPreviews.slice(previewPage * previewsPerPage, previewPage * previewsPerPage + previewsPerPage),
    [filteredPreviews, previewPage, previewsPerPage]
  );

  const failedCount = previews.length - previewedOk.length;
  // Rows unticked in the review step. Only kept rows are sent to eBay — the
  // server revises exactly the itemIds it is given, nothing else in the run.
  const keptItems = previewedOk.filter((p) => !excludedIds.has(p.itemId));

  const toggleExcluded = (itemId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const submitToEbay = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post(`/listing-overlays/runs/${runId}/submit`, {
        itemIds: keptItems.map((p) => p.itemId),
      });
      setSubmitResult(data);

      // Two kinds of row leave the table: the ones now carrying a live badge,
      // and the ones eBay says have ended. An ended listing can never be
      // revised, so keeping it would mean re-picking a dead row every pass.
      // The server remembers it too, so it stays hidden on later searches —
      // without deleting anything from the shared SKU index. Ordinary failures
      // stay put, because those are worth retrying.
      const results = data.results || [];
      const removeIds = new Set(
        results
          .filter((r) => r.status === 'submitted' || r.ended)
          .map((r) => String(r.itemId))
      );

      setSubmitFailures(results.filter((r) => r.status === 'failed'));

      if (removeIds.size) {
        setListings((prev) => prev.filter((l) => !removeIds.has(String(l.itemId))));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          removeIds.forEach((id) => next.delete(id));
          return next;
        });
        // The list just got shorter; a page near the end may no longer exist.
        setPage(0);
      }

      const endedCount = results.filter((r) => r.ended).length;
      setSuccess(
        `Revised ${data.successCount} listing${data.successCount === 1 ? '' : 's'} on eBay`
        + (endedCount ? ` · ${endedCount} had ended and were removed` : '')
        + (data.failedCount - endedCount > 0
          ? ` · ${data.failedCount - endedCount} failed and stayed in the list`
          : '')
        + '.'
      );

      // Straight back to the table so the next batch can be picked. The run is
      // remembered separately, because closing the review panel would otherwise
      // take the Revert button with it.
      setLastRun({
        runId,
        successCount: data.successCount,
        failedCount: data.failedCount,
        revertedCount: 0,
      });
      setPreviews([]);
      setExcludedIds(new Set());
      setPreviewPage(0);
      setPreviewFilter('all');
      setRunId(null);
      setSubmitResult(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit revisions');
    } finally {
      setSubmitting(false);
    }
  };

  const revertRun = async () => {
    const targetRunId = runId || lastRun?.runId;
    if (!targetRunId) return;

    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post(`/listing-overlays/runs/${targetRunId}/revert`);
      setLastRun(null);
      // Reverted listings are badgeable again, but they were removed from the
      // table on submit and their rows are gone from local state — a fresh
      // search brings them back, since only 'submitted' items are hidden.
      setSuccess(
        `Reverted ${data.revertedCount} listing${data.revertedCount === 1 ? '' : 's'} to their original images.`
        + ' Search again to see them back in the list.'
      );
      setSubmitResult(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revert run');
    } finally {
      setSubmitting(false);
    }
  };

  // Rows currently rendered. Streaming keeps appending to `listings`, so a page
  // being viewed mid-crawl simply fills up rather than shifting under you.
  const pagedListings = useMemo(
    () => listings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [listings, page, rowsPerPage]
  );

  // Only the rows on screen, and only those the index has no picture for. A
  // seller whose sync has stored imageUrl never triggers this at all.
  useEffect(() => {
    if (!sellerId || pagedListings.length === 0) return;

    const missing = pagedListings
      .map((l) => String(l.itemId))
      .filter((id) => !requestedImageIds.current.has(id))
      .filter((id) => {
        const row = pagedListings.find((l) => String(l.itemId) === id);
        return row && !row.image;
      });

    if (missing.length === 0) return;
    missing.forEach((id) => requestedImageIds.current.add(id));

    api.post('/listing-overlays/live-images', { sellerId, itemIds: missing })
      .then(({ data }) => {
        if (data.images && Object.keys(data.images).length) {
          setLiveImages((prev) => ({ ...prev, ...data.images }));
        }
      })
      .catch(() => {
        // Thumbnails are cosmetic — a failure must not disturb the table.
      });
  }, [pagedListings, sellerId]);

  // The header checkbox acts on the current page only — the table convention,
  // and the safe default when the alternative silently selects 1,200 live
  // listings. Selecting everything is a separate, explicit button.
  const togglePageSelection = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pagedListings.forEach((l) => (checked ? next.add(l.itemId) : next.delete(l.itemId)));
      return next;
    });
  };

  const selectAllMatching = () => setSelectedIds(new Set(listings.map((l) => l.itemId)));

  const pageAllSelected = pagedListings.length > 0
    && pagedListings.every((l) => selectedIds.has(l.itemId));

  return (
    <AdminPageShell>
      <PageHeader title="Listing Overlays" />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Centred rather than inline: a confirmation at the top of a long page
          is easy to miss after scrolling through a few hundred previews. */}
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccess('')}
          sx={{ boxShadow: 6, fontSize: '1rem', alignItems: 'center' }}
        >
          {success}
        </Alert>
      </Snackbar>

      <Alert severity="info" sx={{ mb: 3 }}>
        Searches run against the <strong>SKU index</strong>, refreshed by the daily sync. Applying an
        overlay uploads the badged picture to eBay, but nothing on your live listings changes until you
        press <strong>Submit to eBay</strong>. Every run stores the original images and can be reverted.
      </Alert>

      {/* eBay's reason per listing. Without this the auto-return would clear
          the previews and leave only a failure count with no explanation. */}
      {submitFailures.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          onClose={() => setSubmitFailures([])}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {submitFailures.length} listing{submitFailures.length === 1 ? '' : 's'} could not be revised
          </Typography>
          <Stack spacing={0.75}>
            {submitFailures.map((f) => (
              <Box key={f.itemId}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {f.title || f.itemId}
                  {f.ended && ' · removed from the list'}
                </Typography>
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  {f.error}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Survives the review panel closing, so a submitted run stays revertible
          after the page returns to the listings table. */}
      {lastRun && previews.length === 0 && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" color="warning" disabled={submitting} onClick={revertRun}>
                Revert this run
              </Button>
              <Button size="small" onClick={() => setLastRun(null)}>Dismiss</Button>
            </Stack>
          }
        >
          Last run: {lastRun.successCount} listing{lastRun.successCount === 1 ? '' : 's'} revised on eBay
          {lastRun.failedCount ? ` · ${lastRun.failedCount} failed` : ''}.
        </Alert>
      )}

      {/* ── Section 1: find ───────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          1 · Find listings
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a seller, then narrow the stored listings by category or keyword.
        </Typography>

        {/* Index state for the selected seller. Read-only: this page searches
            what the daily SKU Index Sync maintains rather than crawling eBay,
            so freshness is reported but not controlled from here. */}
        {sellerId && (
          <Alert severity={sellerIndex ? 'success' : 'warning'} sx={{ mb: 2 }}>
            {sellerIndex
              ? `${sellerIndex.count.toLocaleString()} listings indexed · synced ${formatSyncedAgo(sellerIndex.syncedAt)}`
              : 'No listings indexed for this seller yet. They appear after the next SKU Index Sync.'}
          </Alert>
        )}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} flexWrap="wrap" useFlexGap>
          <Autocomplete
            sx={{ minWidth: 260 }}
            options={sellers}
            getOptionLabel={getSellerDisplayName}
            // Two sellers can share a username, so the key comes from _id
            // rather than the label MUI would otherwise fall back to.
            renderOption={(props, option) => {
              const { key: _ignored, ...rest } = props;
              return <li key={option._id} {...rest}>{getSellerDisplayName(option)}</li>;
            }}
            isOptionEqualToValue={(option, value) => option._id === value._id}
            value={sellers.find((s) => s._id === sellerId) || null}
            onChange={(_, v) => setSellerId(v?._id || '')}
            renderInput={(params) => <TextField {...params} label="Seller" size="small" />}
          />

          <TextField
            size="small"
            label="Category contains"
            placeholder="e.g. Smart Watches"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && sellerId && !loadingListings) loadListings(); }}
            sx={{ minWidth: 220 }}
          />

          <TextField
            size="small"
            label="Keyword"
            placeholder="phone case · strap,band"
            value={keywordQuery}
            onChange={(e) => setKeywordQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && sellerId && !loadingListings) loadListings(); }}
            sx={{ minWidth: 220 }}
          />

          <Button
            variant="contained"
            startIcon={loadingListings ? <CircularProgress size={16} /> : <PlayIcon />}
            disabled={!sellerId || loadingListings || !sellerIndex}
            onClick={() => loadListings()}
            sx={yellowFilledButtonSx}
          >
            {loadingListings ? 'Searching…' : 'Find listings'}
          </Button>

          {loadingListings && (
            <Button variant="outlined" onClick={stopScan} sx={yellowOutlinedButtonSx}>
              Stop
            </Button>
          )}

          <Tooltip title="Listings whose badge is live are hidden so they cannot be badged twice. Show them only if you intend to revert first.">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={includeBadged}
                  onChange={(e) => setIncludeBadged(e.target.checked)}
                  disabled={loadingListings}
                />
              }
              label={<Typography variant="caption">Show already-badged</Typography>}
            />
          </Tooltip>
        </Stack>

        {loadingListings && <LinearProgress sx={{ mt: 2 }} />}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Keyword: <strong>phone case</strong> needs both words in the title (any order) ·{' '}
          <strong>strap,band</strong> matches either · <strong>apple strap,apple band</strong> combines the two.
          Leave both boxes empty to return every indexed listing. Searches read the SKU index, so you can
          change keywords as often as you like without touching eBay. New listings appear after the next
          daily sync.
        </Typography>
      </Paper>

      {/* ── Section 2: select listings + pick the badge ───────────────── */}
      {listings.length > 0 && previews.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            2 · Select listings and choose a badge
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tick the listings to badge, set the badge and its placement, then apply.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Overlay badge</InputLabel>
              <Select label="Overlay badge" value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)}>
                {badges.map((b) => (
                  <MenuItem key={b.key} value={b.key}>{b.label || b.key}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="number"
              label="Size (% of longest edge)"
              value={scale}
              onChange={(e) => setScale(Math.min(Math.max(Number(e.target.value) || 0, 5), 100))}
              inputProps={{ min: 5, max: 100 }}
              sx={{ width: 190 }}
              helperText="Default 30%"
            />

            <FormControl size="small" sx={{ width: 170 }}>
              <InputLabel>Position</InputLabel>
              <Select label="Position" value={anchor} onChange={(e) => setAnchor(e.target.value)}>
                {ANCHORS.map((a) => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={previewing || selectedIds.size === 0 || !badgeKey}
              startIcon={previewing ? <CircularProgress size={16} /> : <PlayIcon />}
              onClick={applyOverlay}
              sx={yellowFilledButtonSx}
            >
              {previewing
                ? `Applying… ${previewProgress.current}/${previewProgress.total}`
                : `Apply overlay to ${selectedIds.size} selected`}
            </Button>

            <Button
              size="small"
              onClick={selectAllMatching}
              disabled={previewing || selectedIds.size === listings.length}
              sx={yellowOutlinedButtonSx}
            >
              Select all {listings.length}
            </Button>

            {selectedIds.size > 0 && (
              <Button size="small" onClick={() => setSelectedIds(new Set())} disabled={previewing}>
                Clear selection
              </Button>
            )}

            <Typography variant="caption" color="text.secondary">
              {listings.length} matching listing{listings.length === 1 ? '' : 's'}
            </Typography>
          </Stack>
          {previewing && <LinearProgress sx={{ mt: 2 }} />}

          <TableContainer sx={{ ...tableContainerSx, mt: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={tableHeaderCellSx}>
                  <Tooltip title="Select everything on this page">
                    <Checkbox
                      checked={pageAllSelected}
                      indeterminate={!pageAllSelected && pagedListings.some((l) => selectedIds.has(l.itemId))}
                      onChange={(e) => togglePageSelection(e.target.checked)}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ ...tableHeaderCellSx, width: 110 }}>Image</TableCell>
                <TableCell sx={tableHeaderCellSx}>Title</TableCell>
                <TableCell sx={tableHeaderCellSx}>SKU</TableCell>
                <TableCell sx={tableHeaderCellSx}>Category</TableCell>
                <TableCell sx={tableHeaderCellSx}>Item ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedListings.map((l) => (
                <TableRow key={l.itemId} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(l.itemId)}
                      onChange={(e) => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(l.itemId); else next.delete(l.itemId);
                        return next;
                      })}
                    />
                  </TableCell>
                  <TableCell>
                    {(l.image || liveImages[String(l.itemId)])
                      ? <Box component="img" src={l.image || liveImages[String(l.itemId)]} alt="" loading="lazy"
                          sx={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 1 }} />
                      : <Typography variant="caption" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 560 }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {l.title}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="caption">{l.sku || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{l.categoryName || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="caption">{l.itemId}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={listings.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100, 250]}
            labelRowsPerPage="Rows per page"
          />
          </TableContainer>
        </Paper>
      )}

      {/* ── Section 3: review + submit ────────────────────────────────── */}
      {previews.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                3 · Review and submit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {keptItems.length} to submit
                {excludedIds.size > 0 && ` · ${excludedIds.size} excluded`}
                {failedCount > 0 && ` · ${failedCount} failed`}
                {' '}· nothing has changed on eBay yet
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => {
                  setPreviews([]);
                  setExcludedIds(new Set());
                  setPreviewPage(0);
                  setPreviewFilter('all');
                  setRunId(null);
                  setSubmitResult(null);
                }}
                sx={yellowOutlinedButtonSx}
              >
                Back to listings
              </Button>
              {submitResult ? (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<UndoIcon />}
                  disabled={submitting}
                  onClick={revertRun}
                >
                  Revert this run
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={submitting ? <CircularProgress size={16} /> : <SubmitIcon />}
                  disabled={submitting || keptItems.length === 0}
                  onClick={() => setConfirmOpen(true)}
                  sx={yellowFilledButtonSx}
                >
                  Submit {keptItems.length} to eBay
                </Button>
              )}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {[
              ['all', `All (${previews.length})`],
              ['ready', `Ready (${keptItems.length})`],
              ['excluded', `Excluded (${excludedIds.size})`],
              ['failed', `Failed (${failedCount})`],
            ].map(([value, label]) => (
              <Chip
                key={value}
                size="small"
                label={label}
                color={previewFilter === value ? 'primary' : 'default'}
                variant={previewFilter === value ? 'filled' : 'outlined'}
                onClick={() => { setPreviewFilter(value); setPreviewPage(0); }}
              />
            ))}
          </Stack>

          <Stack spacing={2}>
            {pagedPreviews.map((p) => {
              const excluded = excludedIds.has(p.itemId);
              return (
              <Paper key={p.itemId} variant="outlined" sx={{ p: 2, opacity: excluded ? 0.45 : 1 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                  {p.status === 'previewed' && !submitResult && (
                    <Tooltip title={excluded ? 'Excluded — will not be submitted' : 'Included in the submit'}>
                      <Checkbox
                        checked={!excluded}
                        onChange={() => toggleExcluded(p.itemId)}
                        disabled={submitting}
                      />
                    </Tooltip>
                  )}
                  <Box sx={{ flex: '1 1 320px', minWidth: 260 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{p.title || p.itemId}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.sku ? `${p.sku} · ` : ''}{p.itemId}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={excluded ? 'excluded' : p.status}
                        color={p.status === 'failed' ? 'error' : p.status === 'submitted' ? 'success' : 'default'}
                      />
                    </Box>
                    {p.error && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                        {p.error}
                      </Typography>
                    )}
                  </Box>

                  {p.status !== 'failed' && (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Before</Typography>
                        <Box component="img" src={p.originalImages?.[0]} alt="before" loading="lazy"
                          sx={{ width: 120, height: 120, objectFit: 'contain', border: '1px solid', borderColor: 'divider' }} />
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">After</Typography>
                        <Box component="img" src={p.newImages?.[0]} alt="after" loading="lazy"
                          sx={{ width: 120, height: 120, objectFit: 'contain', border: '2px solid', borderColor: 'success.main' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {p.newImages?.length || 0} image{(p.newImages?.length || 0) === 1 ? '' : 's'} re-hosted
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </Paper>
              );
            })}
          </Stack>

          {filteredPreviews.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Nothing in this view.
            </Typography>
          )}

          <TablePagination
            component="div"
            count={filteredPreviews.length}
            page={previewPage}
            onPageChange={(_, newPage) => setPreviewPage(newPage)}
            rowsPerPage={previewsPerPage}
            onRowsPerPageChange={(e) => {
              setPreviewsPerPage(parseInt(e.target.value, 10));
              setPreviewPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100, 500]}
            labelRowsPerPage="Previews per page"
          />
        </Paper>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Revise {keptItems.length} live listing{keptItems.length === 1 ? '' : 's'}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This replaces the pictures on listings that are live on eBay right now. The original images
            are stored, so the whole run can be reverted from this page afterwards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitToEbay} sx={yellowFilledButtonSx}>
            Submit to eBay
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPageShell>
  );
}
