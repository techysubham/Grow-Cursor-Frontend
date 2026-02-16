import React, { useState, useEffect } from 'react';
import { Typography, Button, Box, FormControl, InputLabel, Select, MenuItem, Stack, Modal, TextField, Chip } from '@mui/material';
import api, { setAuthToken } from '../lib/api';


export default function DepartmentIssues() {
  // Get user from localStorage (must be before any use of user)
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
    priority: '',
    status: 'open',
  });
  const [issues, setIssues] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const params = {};
      if (departmentFilter) params.department = departmentFilter;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const { data } = await api.get('/ideas', { params });
      setIssues(data.ideas || []);
    } catch (err) {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ensure auth token is set for all API requests
    const token = sessionStorage.getItem('auth_token');
    if (token) setAuthToken(token);
    fetchIssues();
    // eslint-disable-next-line
  }, [departmentFilter, statusFilter, priorityFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        createdBy: user?.username || 'Unknown',
        type: 'issue',
      };
      await api.post('/ideas', payload);
      handleClose();
      setForm({ title: '', description: '', department: '', priority: '', status: 'open' });
      fetchIssues();
    } catch (err) {
      console.error('Error submitting issue:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit issue';
      alert(errorMsg);
    }
  };

  // Helper: map role to department
  const getUserDepartment = (role) => {
    const mapping = {
      'hradmin': 'HR',
      'operationhead': 'Operations',
      'listingadmin': 'Listing',
      'productadmin': 'Product Research',
      'compatibilityadmin': 'Compatibility',
      'fulfillmentadmin': 'Operations',
      'hoc': 'Compliance',
      'compliancemanager': 'Compliance'
    };
    return mapping[role] || null;
  };

  // Helper: check if user is admin/head
  const isAdmin = user && typeof user.role === 'string' && [
    'superadmin', 'productadmin', 'listingadmin', 'compatibilityadmin', 'fulfillmentadmin',
    'hradmin', 'operationhead', 'hoc', 'compliancemanager'
  ].includes(user.role);

  // Helper: check if user can manage a specific issue
  const canManageIssue = (issue) => {
    if (!isAdmin) return false;
    if (user.role === 'superadmin' || user.role === 'hradmin') return true;

    // Department heads can only manage their department's issues
    const userDepartment = getUserDepartment(user.role);
    const allowedDepartment = userDepartment || user.department;

    return allowedDepartment && allowedDepartment === issue.department;
  };

  // Status update handler with better error handling
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/ideas/${id}`, { status: newStatus });
      fetchIssues();
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMsg = err.response?.data?.error || 'Failed to update issue status';
      alert(errorMsg);
    }
  };

  // Delete issue handler (only for admins/heads)
  const handleDeleteIssue = async (id) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/ideas/${id}`);
      fetchIssues();
    } catch (err) {
      // Optionally show error
    }
  };

  return (
    <Box>
      {!user?.username && (
        <Typography color="error">User not found. Please log in again.</Typography>
      )}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Department-wise Issues</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>Report Issue</Button>
      </Box>
      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Department</InputLabel>
          <Select label="Department" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
            <MenuItem value="">All Departments</MenuItem>
            <MenuItem value="HR">HR</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="Product Research">Product Research</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
            <MenuItem value="Listing">Listing</MenuItem>
            <MenuItem value="Resource Manager">Resource Manager</MenuItem>
            <MenuItem value="Compliance">Compliance</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in-progress">In Progress</MenuItem>
            <MenuItem value="completed">Closed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select label="Priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <MenuItem value="">All Priorities</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {loading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : issues.length === 0 ? (
        <Typography color="text.secondary">No issues reported yet.</Typography>
      ) : (
        <Box>
          {issues.map(issue => (
            <Box key={issue._id} p={1} mb={1} border={1} borderColor="grey.300" borderRadius={2}>
              <Typography variant="subtitle1">{issue.title}</Typography>
              <Typography variant="body2" color="text.secondary">{issue.description}</Typography>
              <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ rowGap: 1, columnGap: 1, width: '100%' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, width: '100%' }}>
                  <Chip label={issue.department} size="small" sx={{ mb: 0.5 }} />
                  <Chip label={issue.priority} size="small" color={issue.priority === 'high' ? 'error' : issue.priority === 'medium' ? 'warning' : 'default'} sx={{ mb: 0.5 }} />
                  <Chip label={issue.status} size="small" color={issue.status === 'completed' ? 'success' : issue.status === 'in-progress' ? 'info' : 'default'} sx={{ mb: 0.5 }} />
                  {isAdmin && (
                    <>
                      {issue.status !== 'in-progress' && issue.status !== 'completed' && (
                        <Button size="small" onClick={() => handleStatusUpdate(issue._id, 'in-progress')} sx={{ minWidth: 0, fontSize: '0.85rem', color: '#1976d2' }}>MARK IN PROGRESS</Button>
                      )}
                      {issue.status !== 'completed' && (
                        <Button size="small" color="success" onClick={() => handleStatusUpdate(issue._id, 'completed')} sx={{ minWidth: 0, fontSize: '0.85rem', color: '#388e3c' }}>MARK CLOSED</Button>
                      )}
                      <Button size="small" color="error" onClick={() => handleDeleteIssue(issue._id)} sx={{ minWidth: 0, fontSize: '0.85rem', color: '#d32f2f' }}>DELETE</Button>
                    </>
                  )}
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      )}
      <Modal open={open} onClose={handleClose}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2 }}>
          <Typography variant="h6" mb={2}>Report Department Issue</Typography>
          <form onSubmit={handleSubmit}>
            <TextField label="Title" name="title" value={form.title} onChange={handleChange} fullWidth required margin="normal" />
            <TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth required multiline rows={3} margin="normal" />
            <FormControl fullWidth margin="normal">
              <InputLabel>Department</InputLabel>
              <Select name="department" value={form.department} onChange={handleChange} required>
                <MenuItem value="">Select Department</MenuItem>
                <MenuItem value="HR">HR</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Product Research">Product Research</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="Listing">Listing</MenuItem>
                <MenuItem value="Resource Manager">Resource Manager</MenuItem>
                <MenuItem value="Compliance">Compliance</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority</InputLabel>
              <Select name="priority" value={form.priority} onChange={handleChange} required>
                <MenuItem value="">Select Priority</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Submit</Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
}
