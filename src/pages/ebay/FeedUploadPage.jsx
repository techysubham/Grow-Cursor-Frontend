import React, { useState, useEffect } from 'react';
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
    Pagination
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import api from '../../lib/api';

// Common Feed Types
const FEED_TYPES = [
    { value: 'FX_LISTING', label: 'File Exchange Listing (CSV)' }
];

const FeedUploadPage = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [feedType, setFeedType] = useState('FX_LISTING');
    const [schemaVersion, setSchemaVersion] = useState('1.0');
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

    // Fetch Sellers on mount
    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const res = await api.get('/sellers/all');
                setSellers(res.data);
                if (res.data.length > 0) {
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

        try {
            const response = await api.post('/ebay/feed/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
            fetchTasks(); // Refresh list
        } catch (err) {
            console.error('Upload failed', err);
            setError(err.response?.data?.error || err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                eBay Feed Upload
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                Upload bulk listing files (XML/CSV) to eBay via the Feed API.
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 600 }}>
                <Stack spacing={3}>

                    {/* Seller Selection */}
                    <FormControl fullWidth>
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
                    <FormControl fullWidth>
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
                    />

                    {/* File Input */}
                    <Box
                        sx={{
                            border: '2px dashed #ccc',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: '#fafafa',
                            '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                        component="label"
                    >
                        <input
                            type="file"
                            hidden
                            onChange={handleFileChange}
                            accept=".csv"
                        />
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
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
                        color="primary"
                        size="large"
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile || !selectedSeller}
                        startIcon={uploading && <CircularProgress size={20} color="inherit" />}
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

                <TableContainer
                    component={Paper}
                    sx={{
                        maxHeight: 'calc(100vh - 450px)',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                            height: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: '#f1f1f1',
                            borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#888',
                            borderRadius: '10px',
                            '&:hover': {
                                backgroundColor: '#555',
                            },
                        },
                    }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Task ID</TableCell>
                                <TableCell>File Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Result</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingTasks ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : tasks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        No recent uploads found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tasks.map((task) => (
                                    <TableRow key={task.taskId}>
                                        <TableCell>
                                            {new Date(task.creationDate).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{task.taskId}</TableCell>
                                        <TableCell>
                                            {task.fileName || task.uploadSummary?.inputFileName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={task.status}
                                                color={
                                                    task.status === 'COMPLETED' ? 'success' :
                                                        task.status === 'COMPLETED_WITH_ERROR' ? 'warning' :
                                                            task.status === 'CREATED' ? 'info' :
                                                                'error'
                                                }
                                                size="small"
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
                            borderTop: 1,
                            borderColor: 'divider',
                            bgcolor: 'background.paper'
                        }}
                    >
                        <Pagination
                            count={totalPages}
                            page={currentPage}
                            onChange={(e, page) => setCurrentPage(page)}
                            color="primary"
                            showFirstButton
                            showLastButton
                        />
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalTasks)} of {totalTasks} uploads
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2" color="text.secondary">Rows per page:</Typography>
                                <Select
                                    size="small"
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    sx={{ minWidth: 70, height: 32 }}
                                >
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </Stack>
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default FeedUploadPage;
