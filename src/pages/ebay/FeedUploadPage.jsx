import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Stack,
    FormHelperText,
    Pagination,
    useTheme
} from '@mui/material';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx, yellowFilledButtonSx } from '../../theme/tableStyles.js';

// Common Feed Types
const FEED_TYPES = [
    { value: 'FX_LISTING', label: 'File Exchange Listing (CSV)' }
];

const FeedUploadPage = () => {
    const theme = useTheme();

    // ── Style tokens ──────────────────────────────────────────────────────────
    const inputFocusSx = {
        '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
        '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND_YELLOW_DARK, borderWidth: 2 },
        },
        '& input': { accentColor: BRAND_YELLOW_DARK }
    };
    const selectFocusSx = {
        '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
        '& .MuiOutlinedInput-root': { 
            borderRadius: 1.5,
            '&.Mui-focused fieldset': { borderColor: BRAND_YELLOW_DARK } 
        },
    };
    const darkButtonSx = {
        minHeight: 36, px: 2, borderRadius: 1.5,
        color: '#fff', backgroundColor: BRAND_DARK, fontWeight: 700,
        '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.82) },
        '&.Mui-disabled': { color: alpha('#fff', 0.35), backgroundColor: alpha(BRAND_DARK, 0.38) },
    };
    const outlinedButtonSx = {
        minHeight: 36, px: 2, borderRadius: 1.5,
        color: BRAND_DARK, borderColor: alpha(BRAND_DARK, 0.3), fontWeight: 600,
        '&:hover': { borderColor: BRAND_YELLOW_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.08) },
        '&.Mui-disabled': { borderColor: alpha(BRAND_DARK, 0.15), color: alpha(BRAND_DARK, 0.3) },
    };

    const datePickerTheme = React.useMemo(() => createTheme(theme, {
        palette: {
            primary: { main: BRAND_YELLOW_DARK }
        }
    }), [theme]);

    const location = useLocation();
    const [selectedFile, setSelectedFile] = useState(null);
    const [feedType, setFeedType] = useState('FX_LISTING');
    const [schemaVersion, setSchemaVersion] = useState('1.0');
    const [country, setCountry] = useState('US');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('');

    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [downloadingTaskId, setDownloadingTaskId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Schedule upload state (right panel)
    const [scheduleFile, setScheduleFile] = useState(null);
    const [scheduleDateTime, setScheduleDateTime] = useState(null);
    const [scheduling, setScheduling] = useState(false);
    const [scheduleResult, setScheduleResult] = useState(null);
    const [scheduleError, setScheduleError] = useState(null);

    // Pre-populate from navigation state (List Directly flow)
    useEffect(() => {
        if (location.state?.csvFile) {
            setSelectedFile(location.state.csvFile);
        }
    }, []);

    // Fetch Sellers on mount
    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const res = await api.get('/sellers/all');
                setSellers(res.data);
                // If navigated from List Directly, use the passed seller; otherwise default to first
                if (location.state?.sellerId) {
                    setSelectedSeller(location.state.sellerId);
                } else if (res.data.length > 0) {
                    setSelectedSeller(res.data[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch sellers', err);
                setError('Failed to load sellers. Please refresh.');
            }
        };
        fetchSellers();
    }, []);

    // Fetch Tasks when seller changes — reset to first page
    useEffect(() => {
        if (selectedSeller) {
            setCurrentPage(1);
            fetchTasks(1);
        }
    }, [selectedSeller]);

    // Re-fetch when page or rowsPerPage changes
    useEffect(() => {
        if (selectedSeller) {
            fetchTasks(currentPage);
        }
    }, [currentPage, rowsPerPage]);

    const fetchTasks = async (pg = currentPage) => {
        setLoadingTasks(true);
        try {
            const res = await api.get('/ebay/feed/tasks', {
                params: { sellerId: selectedSeller, limit: rowsPerPage, offset: (pg - 1) * rowsPerPage }
            });
            console.log('Fetched tasks:', res.data.tasks);
            setTasks(res.data.tasks || []);
            const total = res.data.total || 0;
            setTotalTasks(total);
            setTotalPages(Math.ceil(total / rowsPerPage) || 1);
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleDownloadErrors = async (taskId) => {
        setDownloadingTaskId(taskId);
        try {
            const response = await api.get(`/ebay/feed/result/${taskId}`, {
                params: { sellerId: selectedSeller },
                responseType: 'blob'
            });

            // Create a download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            const fileNameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
            link.download = fileNameMatch ? fileNameMatch[1] : `errors_${taskId}.csv`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
            setError(err.response?.data?.error || 'Failed to download error report');
        } finally {
            setDownloadingTaskId(null);
        }
    };

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !selectedSeller) {
            setError('Please select a file and a seller.');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sellerId', selectedSeller);
        formData.append('feedType', feedType);
        formData.append('schemaVersion', schemaVersion);
        formData.append('country', country);

        try {
            const response = await api.post('/ebay/feed/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // If this upload came from CSV Storage (List Directly flow), link the records
            const taskId = response.data?.taskId;
            if (location.state?.csvStorageId && taskId) {
                try {
                    await api.patch(`/csv-storage/${location.state.csvStorageId}/link-upload`, { taskId });
                } catch (linkErr) {
                    console.error('Failed to link CSV storage record:', linkErr.message);
                }
            } else if (taskId) {
                // Manual direct upload — save to CSV Storage with manual tag and link
                try {
                    const listingCount = await countCsvRows(selectedFile);
                    const storageForm = new FormData();
                    storageForm.append('csvFile', selectedFile, selectedFile.name);
                    storageForm.append('sellerId', selectedSeller);
                    storageForm.append('listingCount', String(listingCount));
                    storageForm.append('source', 'manual');
                    const saveRes = await api.post('/csv-storage', storageForm, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    await api.patch(`/csv-storage/${saveRes.data._id}/link-upload`, { taskId });
                } catch (saveErr) {
                    console.error('Failed to save manual upload to CSV storage:', saveErr.message);
                }
            }
            setResult(response.data);
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Upload failed', err);
            setError(err.response?.data?.error || err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const countCsvRows = (file) =>
        new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const lines = e.target.result.split('\n').filter(l => l.trim().length > 0);
                resolve(Math.max(0, lines.length - 1));
            };
            reader.onerror = () => resolve(0);
            reader.readAsText(file);
        });

    const handleScheduleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setScheduleFile(event.target.files[0]);
            setScheduleError(null);
            setScheduleResult(null);
        }
    };

    const handleSchedule = async () => {
        if (!scheduleFile || !selectedSeller || !scheduleDateTime) {
            setScheduleError('Please select a CSV file, seller, and date/time.');
            return;
        }
        const scheduledDate = scheduleDateTime;
        if (!scheduledDate || isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
            setScheduleError('Please select a future date and time.');
            return;
        }

        setScheduling(true);
        setScheduleError(null);
        setScheduleResult(null);

        try {
            const listingCount = await countCsvRows(scheduleFile);
            const storageForm = new FormData();
            storageForm.append('csvFile', scheduleFile, scheduleFile.name);
            storageForm.append('sellerId', selectedSeller);
            storageForm.append('listingCount', String(listingCount));
            storageForm.append('source', 'manual');
            const saveRes = await api.post('/csv-storage', storageForm, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            await api.post(`/csv-storage/${saveRes.data._id}/schedule-upload`, {
                scheduledAt: scheduledDate.toISOString(),
                sellerId: selectedSeller,
            });
            setScheduleResult(scheduledDate);
            setScheduleFile(null);
            setScheduleDateTime('');
        } catch (err) {
            setScheduleError(err.response?.data?.error || err.message || 'Failed to schedule upload.');
        } finally {
            setScheduling(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', p: 1, borderRadius: 2, backgroundColor: alpha(BRAND_YELLOW, 0.2) }}>
                    <CloudUploadIcon sx={{ color: BRAND_YELLOW_DARK, fontSize: 28 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND_DARK, letterSpacing: -0.5 }}>
                    eBay Feed Upload
                </Typography>
            </Stack>
            <Typography variant="body1" color="textSecondary" paragraph>
                Upload bulk listing files (XML/CSV) to eBay via the Feed API.
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
                {/* Left: Upload Feed */}
                <Paper elevation={0} sx={{ p: 3, maxWidth: 560, flex: '0 0 auto', border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3 }}>
                    <Stack spacing={3}>

                        {/* Seller Selection */}
                        <FormControl fullWidth sx={selectFocusSx}>
                            <InputLabel>Select Seller Account</InputLabel>
                            <Select
                                value={selectedSeller}
                                label="Select Seller Account"
                                onChange={(e) => setSelectedSeller(e.target.value)}
                            >
                                {sellers.map((seller) => (
                                    <MenuItem key={seller._id} value={seller._id}>
                                        {seller.storeName || seller.user?.username || seller._id}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Feed Type Selection - Fixed to CSV */}
                        <FormControl fullWidth sx={selectFocusSx}>
                            <InputLabel>Feed Type</InputLabel>
                            <Select
                                value={feedType}
                                label="Feed Type"
                                disabled
                            >
                                <MenuItem value="FX_LISTING">File Exchange Listing (CSV)</MenuItem>
                            </Select>
                            <FormHelperText>Currently only CSV uploads (FX_LISTING) are supported.</FormHelperText>
                        </FormControl>

                        {/* Schema Version */}
                        <TextField
                            label="Schema Version"
                            value={schemaVersion}
                            disabled
                            helperText="Fixed to 1.0 for CSV uploads"
                            sx={inputFocusSx}
                        />

                        {/* Country Selection */}
                        <FormControl fullWidth sx={selectFocusSx}>
                            <InputLabel>Upload Country</InputLabel>
                            <Select
                                value={country}
                                label="Upload Country"
                                onChange={(e) => setCountry(e.target.value)}
                            >
                                <MenuItem value="US">United States (US)</MenuItem>
                                <MenuItem value="UK">United Kingdom (UK)</MenuItem>
                                <MenuItem value="AU">Australia (AU)</MenuItem>
                                <MenuItem value="Canada">Canada</MenuItem>
                            </Select>
                            <FormHelperText>Tag this upload with a country for reporting purposes</FormHelperText>
                        </FormControl>

                        {/* File Input */}
                        <Box
                            sx={{
                                border: `2px dashed ${alpha(BRAND_DARK, 0.2)}`,
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: alpha(BRAND_DARK, 0.02),
                                transition: 'all 0.2s ease',
                                '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.04), borderColor: BRAND_YELLOW_DARK }
                            }}
                            component="label"
                        >
                            <input
                                type="file"
                                hidden
                                onChange={handleFileChange}
                                accept=".csv"
                            />
                            <CloudUploadIcon sx={{ fontSize: 40, color: BRAND_YELLOW_DARK, mb: 1 }} />
                            <Typography variant="h6">
                                {selectedFile ? selectedFile.name : 'Click to Select CSV File'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Supported format: CSV (File Exchange)
                            </Typography>
                        </Box>

                        {/* Upload Button */}
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleUpload}
                            disabled={uploading || !selectedFile || !selectedSeller}
                            startIcon={uploading && <CircularProgress size={20} color="inherit" />}
                            sx={yellowFilledButtonSx}
                        >
                            {uploading ? 'Uploading...' : 'Upload Feed'}
                        </Button>

                        {/* Messages */}
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}

                        {result && (
                            <Alert severity="success">
                                <Typography variant="subtitle1">Upload Successful!</Typography>
                                <Typography variant="body2">Task ID: {result.taskId}</Typography>
                                <Typography variant="caption">
                                    The file is being processed by eBay. Check the status later using the Task ID.
                                </Typography>
                            </Alert>
                        )}

                    </Stack>
                </Paper>

                {/* Right: Schedule Upload */}
                <Paper elevation={0} sx={{ p: 3, flex: '1 1 380px', minWidth: 340, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3 }}>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" gutterBottom>Schedule Upload</Typography>
                            <Typography variant="body2" color="textSecondary">
                                Attach a CSV file and pick a date/time — it will be automatically sent to eBay at that time and saved to CSV Storage with a Manual Upload tag.
                            </Typography>
                        </Box>

                        {/* Schedule File Input */}
                        <Box
                            sx={{
                                border: `2px dashed ${alpha(BRAND_DARK, 0.2)}`,
                                borderRadius: 2,
                                p: 3,
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: alpha(BRAND_DARK, 0.02),
                                transition: 'all 0.2s ease',
                                '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.04), borderColor: BRAND_YELLOW_DARK }
                            }}
                            component="label"
                        >
                            <input type="file" hidden onChange={handleScheduleFileChange} accept=".csv" />
                            <CloudUploadIcon sx={{ fontSize: 40, color: BRAND_YELLOW_DARK, mb: 1 }} />
                            <Typography variant="h6">
                                {scheduleFile ? scheduleFile.name : 'Click to Select CSV File'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Supported format: CSV (File Exchange)
                            </Typography>
                        </Box>

                        {/* Date/Time Picker */}
                        <ThemeProvider theme={datePickerTheme}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DateTimePicker
                                    label="Schedule Date & Time"
                                    value={scheduleDateTime}
                                    onChange={(newValue) => {
                                        setScheduleDateTime(newValue);
                                        setScheduleError(null);
                                        setScheduleResult(null);
                                    }}
                                    minDateTime={new Date()}
                                    slotProps={{
                                        textField: { fullWidth: true, sx: inputFocusSx }
                                    }}
                                />
                            </LocalizationProvider>
                        </ThemeProvider>

                        {/* Schedule Button */}
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSchedule}
                            disabled={scheduling || !scheduleFile || !selectedSeller || !scheduleDateTime}
                            startIcon={scheduling ? <CircularProgress size={20} color="inherit" /> : <ScheduleIcon />}
                            sx={darkButtonSx}
                        >
                            {scheduling ? 'Scheduling...' : 'Schedule Upload'}
                        </Button>

                        {scheduleError && (
                            <Alert severity="error">{scheduleError}</Alert>
                        )}

                        {scheduleResult && (
                            <Alert severity="success">
                                <Typography variant="subtitle1">Upload Scheduled!</Typography>
                                <Typography variant="body2">
                                    Will be sent to eBay on {scheduleResult.toLocaleString()}.
                                </Typography>
                                <Typography variant="caption">
                                    You can view and manage it in CSV Storage.
                                </Typography>
                            </Alert>
                        )}
                    </Stack>
                </Paper>
            </Stack>

            {/* Tasks Table */}
            <Box sx={{ mt: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">Recent Uploads</Typography>
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchTasks}
                        disabled={loadingTasks}
                    >
                        Refresh
                    </Button>
                </Stack>

                <Paper elevation={0} sx={{ border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
                    <TableContainer
                        sx={{
                            maxHeight: 'calc(100vh - 450px)',
                            overflow: 'auto',
                            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                            '&::-webkit-scrollbar-track': { backgroundColor: alpha(BRAND_DARK, 0.04), borderRadius: '10px' },
                            '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(BRAND_DARK, 0.2), borderRadius: '10px', '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.4) } }
                        }}
                    >
                        <Table stickyHeader>
                            <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                                <TableRow>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Date</TableCell>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Task ID</TableCell>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>File Name</TableCell>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Country</TableCell>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Status</TableCell>
                                    <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Result</TableCell>
                                </TableRow>
                            </TableHead>
                        <TableBody>
                            {loadingTasks ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
                                            <CircularProgress size={24} sx={{ color: BRAND_YELLOW_DARK }} />
                                            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 500 }}>Loading Uploads...</Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ) : tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                        <CloudUploadIcon sx={{ fontSize: 48, color: alpha(BRAND_DARK, 0.12), mb: 1 }} />
                                        <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
                                            No recent uploads found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.map((task) => (
                                    <TableRow key={task.taskId} hover sx={tableBodyRowSx}>
                                        <TableCell>
                                            {new Date(task.creationDate).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{task.taskId}</TableCell>
                                        <TableCell>
                                            {task.fileName || task.uploadSummary?.inputFileName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={task.country || 'US'}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    ...(task.country === 'US' ? { backgroundColor: alpha('#1976d2', 0.1), color: '#0d47a1', border: `1px solid ${alpha('#1976d2', 0.25)}` } :
                                                        task.country === 'UK' ? { backgroundColor: alpha('#9c27b0', 0.1), color: '#4a148c', border: `1px solid ${alpha('#9c27b0', 0.25)}` } :
                                                            task.country === 'AU' ? { backgroundColor: alpha('#2e7d32', 0.1), color: '#1b5e20', border: `1px solid ${alpha('#2e7d32', 0.25)}` } :
                                                                { backgroundColor: alpha('#0288d1', 0.1), color: '#01579b', border: `1px solid ${alpha('#0288d1', 0.25)}` })
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={task.status}
                                                size="small"
                                                sx={{
                                                    fontWeight: 700,
                                                    ...(task.status === 'COMPLETED' ? { backgroundColor: alpha('#2e7d32', 0.1), color: '#1b5e20', border: `1px solid ${alpha('#2e7d32', 0.25)}` } :
                                                        task.status === 'COMPLETED_WITH_ERROR' ? { backgroundColor: alpha('#ed6c02', 0.1), color: '#e65100', border: `1px solid ${alpha('#ed6c02', 0.25)}` } :
                                                            task.status === 'CREATED' ? { backgroundColor: alpha('#0288d1', 0.1), color: '#01579b', border: `1px solid ${alpha('#0288d1', 0.25)}` } :
                                                                { backgroundColor: alpha('#d32f2f', 0.1), color: '#b71c1c', border: `1px solid ${alpha('#d32f2f', 0.25)}` })
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {task.uploadSummary ? (
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        {task.uploadSummary.failureCount} failed, {task.uploadSummary.successCount} completed
                                                    </Typography>
                                                    {task.uploadSummary.failureCount > 0 && (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="warning"
                                                            startIcon={
                                                                downloadingTaskId === task.taskId
                                                                    ? <CircularProgress size={14} color="inherit" />
                                                                    : <DownloadIcon fontSize="small" />
                                                            }
                                                            onClick={() => handleDownloadErrors(task.taskId)}
                                                            disabled={downloadingTaskId === task.taskId}
                                                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                        >
                                                            {downloadingTaskId === task.taskId ? 'Downloading...' : 'Download Errors'}
                                                        </Button>
                                                    )}
                                                </Stack>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                {totalTasks > 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5,
                            py: 2,
                            px: 1,
                            borderTop: `1px solid ${alpha(BRAND_DARK, 0.08)}`,
                            backgroundColor: alpha(BRAND_DARK, 0.02)
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(e, page) => setCurrentPage(page)}
                            color="primary"
                            showFirstButton
                            showLastButton
                            sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: BRAND_YELLOW, color: BRAND_DARK, fontWeight: 'bold' } }}
                        />
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.6) }}>
                                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalTasks)} of {totalTasks} uploads
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.6) }}>Rows per page:</Typography>
                                <Select
                                    size="small"
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    sx={{ minWidth: 70, height: 32, ...selectFocusSx }}
                                >
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </Stack>
                        </Stack>
                    </Box>
                )}
                </Paper>
            </Box>
        </Box>
    );
};

export default FeedUploadPage;
