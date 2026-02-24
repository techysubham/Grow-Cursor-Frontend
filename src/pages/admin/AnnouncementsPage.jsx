import { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Stack, List, ListItem, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Chip, Autocomplete, Avatar
} from '@mui/material';
import api from '../../lib/api.js';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'company-wide', title: '', message: '', priority: 'normal', targetUsers: [], expiresAt: '' });
  const [usersOptions, setUsersOptions] = useState([]);

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  const isAdmin = ['superadmin','productadmin','listingadmin','compatibilityadmin','fulfillmentadmin','hradmin','operationhead','hoc','compliancemanager'].includes(currentUser?.role);

  useEffect(() => {
    load();
    loadUsers();
  }, []);

  function toLocalInputString(d) {
    if (!d) return '';
    const dt = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const min = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  function getEndOfDayLocalInputString(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 0, 0);
    return toLocalInputString(d);
  }

  async function loadUsers() {
    try {
      const res = await api.get('/users');
      // Expect array of users; map to option objects { username, display }
      const list = (res.data || res).map(u => ({ username: u.username, display: u.username, department: u.department }));
      setUsersOptions(list);
    } catch (e) {
      console.error('Failed to load users for autocomplete', e);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data.announcements || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ type: 'company-wide', title: '', message: '', priority: 'normal', targetUsers: [], expiresAt: getEndOfDayLocalInputString() });
    setOpen(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({
      type: a.type,
      title: a.title,
      message: a.message,
      priority: a.priority || 'normal',
      targetUsers: a.targetUsers || [],
      expiresAt: a.expiresAt ? toLocalInputString(a.expiresAt) : getEndOfDayLocalInputString()
    });
    setOpen(true);
  }

  async function save() {
    // Client-side validation: require title, message, priority, expiresAt; targetUsers for individual
    if (!form.title || !form.message) {
      return alert('Title and message are required');
    }
    if (!form.priority) return alert('Priority is required');
    if (!form.expiresAt) return alert('Expires At is required');
    if (form.type === 'individual' && (!form.targetUsers || form.targetUsers.length === 0)) return alert('Select at least one target user for individual announcements');

    try {
      if (editing) {
        await api.patch(`/announcements/${editing._id}`, form);
      } else {
        await api.post('/announcements', form);
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Failed');
    }
  }

  async function remove(a) {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${a._id}`);
      load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ color: 'primary.main' }}>Announcements</Typography>
          {isAdmin && <Button variant="contained" color="primary" onClick={openCreate}>New Announcement</Button>}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <List>
          {announcements.map(a => (
            <ListItem key={a._id} divider
              sx={{ borderLeft: '4px solid', pl: 2, borderLeftColor: a.type === 'company-wide' ? 'primary.main' : 'secondary.main' }}
              secondaryAction={<>
              {(a.createdBy === currentUser?.username || currentUser?.role === 'superadmin' || (currentUser?.role && currentUser.department && a.createdByUserId?.department === currentUser.department && ['productadmin','listingadmin','compatibilityadmin','fulfillmentadmin','compliancemanager'].includes(currentUser.role))) && (
                <>
                  <Button size="small" onClick={() => openEdit(a)} sx={{ mr: 1 }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => remove(a)}>Delete</Button>
                </>
              )}
            </>}>
              <ListItemText
                primary={<>
                  <Typography component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{a.title}</Typography>
                  <Chip label={a.priority}
                    size="small"
                    sx={{ ml: 1, ...(a.priority === 'urgent' ? { bgcolor: 'error.main', color: 'white', boxShadow: 1 } : a.priority === 'important' ? { bgcolor: 'warning.main', color: 'white', boxShadow: 1 } : { bgcolor: 'primary.50', color: 'primary.main', border: '1px solid', borderColor: 'primary.100' }) }}
                  />
                  <Chip label={a.type === 'company-wide' ? 'Company' : 'Individual'} size="small" sx={{ ml: 1, ...(a.type === 'company-wide' ? { bgcolor: 'primary.light', color: 'primary.contrastText', border: '1px solid', borderColor: 'primary.main' } : { bgcolor: 'secondary.light', color: 'secondary.contrastText', border: '1px solid', borderColor: 'secondary.main' }) }} />
                </>}
                secondary={<>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{a.message}</Typography>
                  {a.type === 'individual' && a.targetUsers && a.targetUsers.length > 0 && (
                    <Typography variant="body2" sx={{ mt: 1 }}><strong>To:</strong> {a.targetUsers.join(', ')}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">By {a.createdBy} {a.createdByUserId?.department ? `(${a.createdByUserId.department})` : ''} • {new Date(a.createdAt).toLocaleString()}</Typography>
                </>}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={form.type} label="Type" onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}>
                <MenuItem value="company-wide">Company-wide</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Title" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} fullWidth />
            <TextField label="Message" value={form.message} onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))} fullWidth multiline minRows={4} />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select value={form.priority} label="Priority" onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="important">Important</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
            {form.type === 'individual' && (
              <Autocomplete
                multiple
                options={usersOptions}
                getOptionLabel={(option) => option.username || ''}
                value={usersOptions.filter(opt => (form.targetUsers || []).includes(opt.username))}
                onChange={(e, v) => setForm(prev => ({ ...prev, targetUsers: v.map(i => i.username) }))}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={`${option.username}${option.department ? ` (${option.department})` : ''}`} {...getTagProps({ index })} key={option.username} />
                  ))
                }
                renderOption={(props, option) => (
                  <li {...props} key={option.username}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1 }}>{option.username?.charAt(0)?.toUpperCase()}</Avatar>
                    <Stack>
                      <Typography sx={{ fontSize: '0.95rem' }}>{option.username}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.department || 'No department'}</Typography>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="Target Users" placeholder="Select users" />
                )}
                fullWidth
              />
            )}
            <TextField type="datetime-local" label="Expires At" value={form.expiresAt} onChange={(e) => setForm(prev => ({ ...prev, expiresAt: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={save}>{editing ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
