import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Stack,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
  Pagination,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../lib/api';

export default function IdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'idea',
    priority: 'medium',
    createdBy: '',
    completeByDate: ''
  });

  useEffect(() => {
    fetchIdeas();
  }, [filterStatus, filterPriority, filterType, page]);

  const fetchIdeas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 50);
      if (filterStatus) params.append('status', filterStatus);
      if (filterPriority) params.append('priority', filterPriority);
      if (filterType) params.append('type', filterType);
      
      const response = await api.get(`/ideas?${params.toString()}`);
      setIdeas(response.data.ideas);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Error fetching ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.createdBy) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await api.post('/ideas', formData);
      alert('Idea submitted successfully!');
      setFormData({
        title: '',
        description: '',
        type: 'idea',
        priority: 'medium',
        createdBy: '',
        completeByDate: ''
      });
      setShowForm(false);
      setPage(1);
      fetchIdeas();
    } catch (err) {
      console.error('Error submitting idea:', err);
      alert('Failed to submit idea');
    }
  };

  const handleStatusChange = async (ideaId, newStatus) => {
    try {
      await api.patch(`/ideas/${ideaId}`, { status: newStatus });
      fetchIdeas();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const handlePickedUpByChange = async (ideaId, newPickedUpBy) => {
    try {
      await api.patch(`/ideas/${ideaId}`, { pickedUpBy: newPickedUpBy });
      fetchIdeas();
    } catch (err) {
      console.error('Error updating picked up by:', err);
      alert('Failed to update picked up by');
    }
  };

  const handleDelete = async (ideaId) => {
    if (!window.confirm('Are you sure you want to delete this idea?')) {
      return;
    }
    
    try {
      await api.delete(`/ideas/${ideaId}`);
      fetchIdeas();
    } catch (err) {
      console.error('Error deleting idea:', err);
      alert('Failed to delete idea');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'warning';
      case 'in-progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Ideas & Issues Board
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchIdeas}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowForm(true)}
          >
            New Idea/Issue
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight="bold">
            Search Filters
          </Typography>
          <IconButton onClick={() => setFiltersExpanded(!filtersExpanded)}>
            {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={filtersExpanded}>
          <Stack direction="row" spacing={2} mt={2}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                label="Status"
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
              >
                <MenuItem value="">All Priorities</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filterType}
                label="Type"
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="idea">Idea</MenuItem>
                <MenuItem value="issue">Issue</MenuItem>
                <MenuItem value="feature">Feature Request</MenuItem>
                <MenuItem value="bug">Bug</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Collapse>
      </Paper>

      {/* Ideas Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : ideas.length === 0 ? (
          <Box p={4}>
            <Alert severity="info">
              No ideas or issues yet. Be the first to share!
            </Alert>
          </Box>
        ) : (
          <>
            {/* Total Count Header inside Table */}
            <Box px={2} pt={2} pb={1}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                Total: {total} idea(s)
              </Typography>
            </Box>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell><strong>Date Created</strong></TableCell>
                  <TableCell><strong>Title & Description</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Picked Up By</strong></TableCell>
                  <TableCell><strong>Complete By</strong></TableCell>
                  <TableCell><strong>Created By</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {ideas.map((idea) => (
                <TableRow key={idea._id} hover>
                  <TableCell sx={{ minWidth: 140 }}>
                    <Typography variant="body2">
                      {formatDate(idea.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 400 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {idea.title}
                    </Typography>
                    <Tooltip 
                      title={idea.description} 
                      arrow 
                      placement="top"
                      componentsProps={{
                        tooltip: {
                          sx: {
                            bgcolor: 'rgba(0, 0, 0, 0.9)',
                            fontSize: '0.875rem',
                            maxWidth: 500,
                            p: 1.5
                          }
                        }
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mt: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word',
                          cursor: 'help'
                        }}
                      >
                        {idea.description}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={idea.type.charAt(0).toUpperCase() + idea.type.slice(1)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)}
                      size="small"
                      color={getPriorityColor(idea.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                      <Select
                        value={idea.status}
                        onChange={(e) => handleStatusChange(idea._id, e.target.value)}
                        sx={{
                          bgcolor: idea.status === 'open' 
                            ? '#fff3cd' 
                            : idea.status === 'in-progress' 
                            ? '#cfe2ff' 
                            : '#d1e7dd',
                          color: idea.status === 'open'
                            ? '#856404'
                            : idea.status === 'in-progress'
                            ? '#084298'
                            : '#0a3622',
                          fontWeight: 'bold',
                          '& .MuiOutlinedInput-notchedOutline': { 
                            border: 'none' 
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            border: '1px solid rgba(0,0,0,0.23)'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            border: '2px solid #1976d2'
                          }
                        }}
                      >
                        <MenuItem value="open">Open</MenuItem>
                        <MenuItem value="in-progress">In Progress</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth sx={{ minWidth: 120 }}>
                      <Select
                        value={idea.pickedUpBy || ''}
                        onChange={(e) => handlePickedUpByChange(idea._id, e.target.value)}
                        displayEmpty
                        sx={{
                          fontSize: '0.875rem',
                        }}
                      >
                        <MenuItem value="">-</MenuItem>
                        <MenuItem value="aaryan">aaryan</MenuItem>
                        <MenuItem value="rajarshi">rajarshi</MenuItem>
                        <MenuItem value="prassanna">prassanna</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    {idea.completeByDate ? (
                      <Typography variant="body2" color="text.secondary">
                        {new Date(idea.completeByDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {idea.createdBy}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(idea._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* New Idea Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Submit New Idea or Issue
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField
                label="Your Name"
                value={formData.createdBy}
                onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={4}
                required
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="idea">Idea</MenuItem>
                  <MenuItem value="issue">Issue</MenuItem>
                  <MenuItem value="feature">Feature Request</MenuItem>
                  <MenuItem value="bug">Bug</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Complete By Date (Optional)"
                type="date"
                value={formData.completeByDate}
                onChange={(e) => setFormData({ ...formData, completeByDate: e.target.value })}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Submit</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
