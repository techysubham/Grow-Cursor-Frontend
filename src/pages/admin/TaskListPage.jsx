// src/pages/admin/TaskListPage.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Checkbox,
  ListItemText,
  TextField,
  Button,
  Typography,
  Grid,
  Collapse,
  Badge,
  Divider,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import api from '../../lib/api.js';

const ITEM_HEIGHT = 44;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 280,
    },
  },
};

// --- IST-safe YYYY-MM-DD ---
const toISTYMD = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const utc = dt.getTime() + dt.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 330 * 60000); // +05:30
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

export default function TaskListPage() {
  const [items, setItems] = useState([]);
  const [openFilters, setOpenFilters] = useState(false); // start collapsed for a cleaner look
  const [expandedRows, setExpandedRows] = useState({}); // { [assignmentId]: true/false }

  // ====== FILTER STATE (trimmed to only requested ones) ======
  const [filters, setFilters] = useState({
    date: { mode: 'none', single: '', from: '', to: '' }, // 'none' | 'single' | 'range'
    productTitle: { contains: '' },
    sourcePlatform: { in: [] },   // task.sourcePlatform.name
    category: { in: [] },
    subcategory: { in: [] },
    createdByTask: { in: [] },    // task.createdBy.username
    listingPlatform: { in: [] },  // listingPlatform.name
    store: { in: [] },            // store.name
    lister: { in: [] },           // lister.username
    sharedBy: { in: [] },         // createdBy.username (assigner)
  });

  // ====== FIELD ACCESSORS (align with your render) ======
  const A = {
    date: (r) => r.createdAt,
    productTitle: (r) => r.task?.productTitle,
    sourcePlatform: (r) => r.task?.sourcePlatform?.name,
    category: (r) => r.task?.category?.name,
    subcategory: (r) => r.task?.subcategory?.name,
    distributedQty: (r) => {
      const rqList = r.rangeQuantities || [];
      return rqList.reduce((sum, rq) => sum + (rq.quantity || 0), 0);
    },
    createdByTask: (r) => r.task?.createdBy?.username,
    listingPlatform: (r) => r.listingPlatform?.name,
    store: (r) => r.store?.name,
    quantity: (r) => Number(r.quantity),
    lister: (r) => r.lister?.username,
    sharedBy: (r) => r.createdBy?.username,
    completedQuantity: (r) => Number(r.completedQuantity || 0),
  };

  // Quick helpers for pending & progress (per assignment row)
  const pendingQty = (r) => {
    const q = A.quantity(r);
    const c = A.completedQuantity(r);
    return Math.max(0, q - (Number.isFinite(c) ? c : 0));
  };
  const progressPct = (r) => {
    const q = A.quantity(r);
    if (!q || q <= 0) return 0;
    const c = Math.min(A.completedQuantity(r), q);
    return Math.round((c / q) * 100);
  };

  // ====== PREDICATES (trimmed) ======
  const matchesText = (val, contains) =>
    !contains || String(val ?? '').toLowerCase().includes(String(contains).toLowerCase());

  const matchesEnum = (val, arr) => !arr?.length || arr.includes(val);

  const matchesDate = (createdAt, dateFilter) => {
    const ymd = toISTYMD(createdAt);
    if (dateFilter.mode === 'none') return true;
    if (dateFilter.mode === 'single') return dateFilter.single ? ymd === dateFilter.single : true;
    // range
    const { from, to } = dateFilter;
    if (!from && !to) return true;
    if (from && ymd < from) return false;
    if (to && ymd > to) return false;
    return true;
  };

  // ====== DATA FETCH ======
  useEffect(() => {
    api
      .get('/assignments', { params: { sortBy: 'createdAt', sortOrder: 'desc' } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data.items || data.assignments || []);
        setItems(list);
      })
      .catch(() => alert('Failed to fetch tasks.'));
  }, []);

  // ====== OPTION LISTS (enums/relations pulled from data) ======
  const enumOptions = useMemo(
    () => ({
      sourcePlatform: unique(items.map(A.sourcePlatform)),
      category: unique(items.map(A.category)),
      subcategory: unique(items.map(A.subcategory)),
      createdByTask: unique(items.map(A.createdByTask)),
      listingPlatform: unique(items.map(A.listingPlatform)),
      store: unique(items.map(A.store)),
      lister: unique(items.map(A.lister)),
      sharedBy: unique(items.map(A.sharedBy)),
    }),
    [items]
  );

  // ====== FILTERED LIST (only trimmed filters applied) ======
  const filteredItems = useMemo(() => {
    return items.filter((r) =>
      matchesDate(A.date(r), filters.date) &&
      matchesText(A.productTitle(r), filters.productTitle.contains) &&
      matchesEnum(A.sourcePlatform(r), filters.sourcePlatform.in) &&
      matchesEnum(A.category(r), filters.category.in) &&
      matchesEnum(A.subcategory(r), filters.subcategory.in) &&
      matchesEnum(A.createdByTask(r), filters.createdByTask.in) &&
      matchesEnum(A.listingPlatform(r), filters.listingPlatform.in) &&
      matchesEnum(A.store(r), filters.store.in) &&
      matchesEnum(A.lister(r), filters.lister.in) &&
      matchesEnum(A.sharedBy(r), filters.sharedBy.in)
    );
  }, [items, filters]);

  // ====== ACTIVE FILTER COUNT (for badge) ======
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.date.mode === 'single' && filters.date.single) n++;
    if (filters.date.mode === 'range' && (filters.date.from || filters.date.to)) n++;
    if (filters.productTitle.contains) n++;
    ['sourcePlatform','category','subcategory','createdByTask','listingPlatform','store','lister','sharedBy']
      .forEach(k => { if (filters[k].in.length) n++; });
    return n;
  }, [filters]);

  // ====== HANDLERS ======
  const handleMultiChange = (key) => (event) => {
    const value = typeof event.target.value === 'string'
      ? event.target.value.split(',')
      : event.target.value;
    setFilters((f) => ({ ...f, [key]: { in: value } }));
  };

  const clearAll = () =>
    setFilters({
      date: { mode: 'none', single: '', from: '', to: '' },
      productTitle: { contains: '' },
      sourcePlatform: { in: [] },
      category: { in: [] },
      subcategory: { in: [] },
      createdByTask: { in: [] },
      listingPlatform: { in: [] },
      store: { in: [] },
      lister: { in: [] },
      sharedBy: { in: [] },
    });

  // ====== RENDER ======
  return (
    <Box>
      {/* FILTER TOOLBAR (compact, starts collapsed) */}
      <Paper sx={{ p: 1, mb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Badge color={activeCount ? 'primary' : 'default'} badgeContent={activeCount} overlap="circular">
              <IconButton
                onClick={() => setOpenFilters(v => !v)}
                size="small"
                aria-label="Toggle filters"
                sx={{
                  transform: openFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s',
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Badge>
            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon fontSize="small" /> Filters
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Showing <b>{filteredItems.length}</b> of {items.length}
            </Typography>
          </Stack>

          <Stack direction="row" gap={1}>
            <Tooltip title="Clear all filters">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClearAllIcon />}
                  onClick={clearAll}
                  disabled={activeCount === 0}
                >
                  Clear
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        <Collapse in={openFilters} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 1 }} />
          {/* FILTER GRID (only requested filters) */}
          <Grid container spacing={1} alignItems="center">
            {/* Date mode & pickers */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="date-mode-label">Date mode</InputLabel>
                <Select
                  labelId="date-mode-label"
                  value={filters.date.mode}
                  label="Date mode"
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date: { ...f.date, mode: e.target.value } }))
                  }
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">Single day</MenuItem>
                  <MenuItem value="range">Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {filters.date.mode === 'single' && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  size="small"
                  type="date"
                  label="Date"
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  value={filters.date.single}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, date: { ...f.date, single: e.target.value } }))
                  }
                />
              </Grid>
            )}

            {filters.date.mode === 'range' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={filters.date.from}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date: { ...f.date, from: e.target.value } }))
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    value={filters.date.to}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, date: { ...f.date, to: e.target.value } }))
                    }
                  />
                </Grid>
              </>
            )}

            {/* Product Title contains */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                label="Title contains"
                fullWidth
                value={filters.productTitle.contains}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, productTitle: { contains: e.target.value } }))
                }
              />
            </Grid>

            {/* Multi-select enums/relations (only the ones you want) */}
            {[
              ['sourcePlatform', 'Source Platform'],
              ['category', 'Category'],
              ['subcategory', 'Subcategory'],
              ['createdByTask', 'Created By'],
              ['listingPlatform', 'Listing Platform'],
              ['store', 'Store'],
              ['lister', 'Lister'],
              ['sharedBy', 'Shared By'],
            ].map(([key, label]) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <FormControl fullWidth size="small">
                  <InputLabel id={`${key}-label`}>{label}</InputLabel>
                  <Select
                    labelId={`${key}-label`}
                    multiple
                    value={filters[key].in}
                    onChange={handleMultiChange(key)}
                    input={<OutlinedInput label={label} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={MenuProps}
                  >
                    {enumOptions[key].map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox size="small" checked={filters[key].in.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>
        </Collapse>
      </Paper>

      {/* TABLE (all columns retained; a little compact styling) */}
      <TableContainer component={Paper}>
        <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>SL No</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Product Title</TableCell>
              <TableCell>Supplier Link</TableCell>
              <TableCell>Source Price</TableCell>
              <TableCell>Selling Price</TableCell>
              <TableCell>Source Platform</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Subcategory</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Listing Platform</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Distributed Qty</TableCell>
              <TableCell>Quantity Pending</TableCell>
              <TableCell>Lister</TableCell>
              <TableCell>Shared By</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredItems.map((it, idx) => {
              const t = it.task || {};
              const q = A.quantity(it);
              const p = pendingQty(it);
              const pct = progressPct(it);
              const distributedQty = A.distributedQty(it);
              const rangeQuantities = it.rangeQuantities || [];
              const isExpanded = expandedRows[it._id] || false;
              
              return (
                <>
                  <TableRow key={it._id || idx} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{toISTYMD(it.createdAt)}</TableCell>
                    <TableCell sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.productTitle || '-'}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.supplierLink ? (
                        <a href={t.supplierLink} target="_blank" rel="noreferrer">Link</a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{t.sourcePrice ?? '-'}</TableCell>
                    <TableCell>{t.sellingPrice ?? '-'}</TableCell>
                    <TableCell>{t.sourcePlatform?.name || '-'}</TableCell>
                    <TableCell>{t.category?.name || '-'}</TableCell>
                    <TableCell>{t.subcategory?.name || '-'}</TableCell>
                    <TableCell>{t.createdBy?.username || '-'}</TableCell>
                    <TableCell>{it.listingPlatform?.name || '-'}</TableCell>
                    <TableCell>{it.store?.name || '-'}</TableCell>
                    <TableCell>{q ?? '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <span>{distributedQty}</span>
                        {rangeQuantities.length > 0 && (
                          <IconButton
                            size="small"
                            onClick={() => setExpandedRows(prev => ({ ...prev, [it._id]: !isExpanded }))}
                          >
                            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                        <Typography variant="body2">{p} pending</Typography>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Math.min(A.completedQuantity(it), q || 0)} / {q || 0} ({pct}%)
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{it.lister?.username || '-'}</TableCell>
                    <TableCell>{it.createdBy?.username || '-'}</TableCell>
                  </TableRow>
                  {rangeQuantities.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={16} sx={{ py: 0, borderBottom: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Range Quantity Breakdown:</Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Range</TableCell>
                                  <TableCell align="right">Quantity</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {rangeQuantities.map((rq, rIdx) => (
                                  <TableRow key={rIdx}>
                                    <TableCell>{rq.range?.name || rq.range || '-'}</TableCell>
                                    <TableCell align="right">{rq.quantity || 0}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell><strong>Total</strong></TableCell>
                                  <TableCell align="right"><strong>{distributedQty}</strong></TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
