import { useEffect, useState } from 'react';
import { 
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, Typography, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';

export default function ManageTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    customColumns: []
  });

  const [editDialog, setEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [columnDialog, setColumnDialog] = useState(false);
  const [columnFormData, setColumnFormData] = useState({
    name: '',
    displayName: '',
    dataType: 'text',
    defaultValue: '',
    isRequired: false,
    placeholder: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/listing-templates');
      setTemplates(data || []);
    } catch (err) {
      setError('Failed to fetch templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name) {
      setError('Template name is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/listing-templates', formData);
      setSuccess('Template created successfully!');
      setFormData({
        name: '',
        customColumns: []
      });
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      customColumns: template.customColumns || []
    });
    setEditDialog(true);
  };

  const handleUpdate = async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await api.put(`/listing-templates/${editingTemplate._id}`, formData);
      setSuccess('Template updated successfully!');
      setEditDialog(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        customColumns: []
      });
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will NOT delete associated listings.`)) return;

    try {
      setLoading(true);
      await api.delete(`/listing-templates/${id}`);
      setSuccess('Template deleted successfully!');
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    setColumnFormData({
      name: '',
      displayName: '',
      dataType: 'text',
      defaultValue: '',
      isRequired: false,
      placeholder: ''
    });
    setColumnDialog(true);
  };

  const handleSaveColumn = () => {
    if (!columnFormData.name || !columnFormData.displayName) {
      setError('Column name and display name are required');
      return;
    }

    const maxOrder = formData.customColumns.length > 0 
      ? Math.max(...formData.customColumns.map(col => col.order))
      : 38;

    setFormData({
      ...formData,
      customColumns: [
        ...formData.customColumns,
        {
          ...columnFormData,
          order: maxOrder + 1
        }
      ]
    });

    setColumnDialog(false);
  };

  const handleRemoveColumn = (columnName) => {
    setFormData({
      ...formData,
      customColumns: formData.customColumns.filter(col => col.name !== columnName)
    });
  };

  const handleViewListings = (templateId) => {
    navigate(`/admin/template-listings?templateId=${templateId}`);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Listing Templates</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Create New Template
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Template Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Phone Case Template"
              helperText="All 38 core eBay columns will be automatically included. You can add custom columns below."
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Custom Columns</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddColumn}>
                  Add Column
                </Button>
              </Stack>

              {formData.customColumns.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No custom columns added yet. Click "Add Column" to create template-specific fields.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {formData.customColumns.map((col) => (
                    <Paper key={col.name} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{col.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {col.displayName} • {col.dataType}
                            {col.isRequired && ' • Required'}
                            {col.defaultValue && ` • Default: ${col.defaultValue}`}
                          </Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => handleRemoveColumn(col.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Create Template
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper>
        <Typography variant="h6" sx={{ p: 2, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
          Existing Templates ({templates.length})
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>

                <TableCell sx={{ fontWeight: 'bold' }}>Custom Columns</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No templates found. Create one above!
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template._id} hover>
                    <TableCell><strong>{template.name}</strong></TableCell>
                    <TableCell>
                      {template.customColumns?.length > 0 ? (
                        <Chip label={`${template.customColumns.length} columns`} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">None</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewListings(template._id)} title="View Listings">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(template)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(template._id, template.name)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Template Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="Template Name"
                required
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">Custom Columns</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={handleAddColumn}>
                    Add Column
                  </Button>
                </Stack>

                {formData.customColumns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No custom columns
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {formData.customColumns.map((col) => (
                      <Paper key={col.name} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight="bold">{col.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {col.displayName} • {col.dataType}
                            </Typography>
                          </Box>
                          <IconButton size="small" color="error" onClick={() => handleRemoveColumn(col.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={loading}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={columnDialog} onClose={() => setColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Custom Column</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="Column Name (CSV Header)"
                required
                fullWidth
                value={columnFormData.name}
                onChange={(e) => setColumnFormData({ ...columnFormData, name: e.target.value })}
                placeholder="e.g., C:Brand, C:Color, C:Material"
                helperText="Exact column name as it will appear in CSV"
              />

              <TextField
                label="Display Name"
                required
                fullWidth
                value={columnFormData.displayName}
                onChange={(e) => setColumnFormData({ ...columnFormData, displayName: e.target.value })}
                placeholder="e.g., Brand, Color, Material"
                helperText="User-friendly name for the UI"
              />

              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={columnFormData.dataType}
                  label="Data Type"
                  onChange={(e) => setColumnFormData({ ...columnFormData, dataType: e.target.value })}
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="multiselect">Multi-select</MenuItem>
                  <MenuItem value="boolean">Boolean</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Default Value"
                fullWidth
                value={columnFormData.defaultValue}
                onChange={(e) => setColumnFormData({ ...columnFormData, defaultValue: e.target.value })}
                placeholder="e.g., Does Not Apply"
              />

              <TextField
                label="Placeholder"
                fullWidth
                value={columnFormData.placeholder}
                onChange={(e) => setColumnFormData({ ...columnFormData, placeholder: e.target.value })}
                placeholder="e.g., Enter brand name"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveColumn} variant="contained">
            Add Column
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
