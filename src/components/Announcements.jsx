import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Autocomplete,
  Stack
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Campaign as CampaignIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAllUsers
} from '../lib/api';

const ADMIN_ROLES = [
  'superadmin',
  'productadmin',
  'listingadmin',
  'compatibilityadmin',
  'fulfillmentadmin',
  'hradmin',
  'operationhead',
  'hoc',
  'compliancemanager'
];

import { Link } from 'react-router-dom';

export default function Announcements({ preview = false, showCreate = false }) {
  const [announcementType, setAnnouncementType] = useState('company-wide');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetUsers, setTargetUsers] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Check if user is admin
  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);

  useEffect(() => {
    loadAnnouncements();
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = () => {
    try {
      const token = sessionStorage.getItem('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      }
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements({ page: 1, limit: 20 });
      setAnnouncements(data.announcements || []);
      setError('');
    } catch (err) {
      setError('Failed to load announcements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (announcementType === 'individual' && targetUsers.length === 0) {
      setError('Please select at least one target user for individual announcements');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createAnnouncement({
        type: announcementType,
        title: title.trim(),
        message: message.trim(),
        priority,
        targetUsers: announcementType === 'individual' ? targetUsers.map(u => u.username) : []
      });

      setSuccess('Announcement posted successfully!');
      setTitle('');
      setMessage('');
      setTargetUsers([]);
      setPriority('normal');
      setAnnouncementType('company-wide');

      // Reload announcements
      await loadAnnouncements();
    } catch (err) {
      setError('Failed to create announcement: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await deleteAnnouncement(id);
      setSuccess('Announcement deleted successfully');
      await loadAnnouncements();
    } catch (err) {
      setError('Failed to delete announcement: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box sx={{ p: preview ? 1 : 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header Section with Gradient */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: preview ? 2 : 4,
          p: preview ? 2 : 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
        }}
      >
        <CampaignIcon sx={{ fontSize: preview ? 28 : 40, mr: 2, color: 'white' }} />
        <Typography variant={preview ? "h6" : "h4"} fontWeight={700} color="white">
          Announcements
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* Announcement Form - Only for Admins. Show when not preview OR when showCreate is true */}
      {isAdmin && (!preview || showCreate) && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            background: 'white', // changed from dark to white
            borderRadius: 3,
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
          }}
        >
          <Typography
            variant="h5"
            fontWeight={700}
            mb={3}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            📢 Create New Announcement
          </Typography>

          <form onSubmit={handleSubmit}>
            <FormControl
              fullWidth
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f3f4f6', // light gray for input
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: '#e5e7eb',
                  }
                }
              }}
            >
              <InputLabel sx={{ fontWeight: 600 }}>Announcement Type</InputLabel>
              <Select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value)}
                label="Announcement Type"
              >
                <MenuItem value="company-wide">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CampaignIcon sx={{ color: '#a78bfa', fontSize: 22 }} />
                    <Typography fontWeight={600}>Company-Wide Announcement</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="individual">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ color: '#60a5fa', fontSize: 22 }} />
                    <Typography fontWeight={600}>Individual Announcement</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                mb: 3,
                backgroundColor: '#f3f4f6', // light gray
                borderRadius: 2
              }}
              InputLabelProps={{ style: { color: '#222', fontWeight: 600 } }}
              InputProps={{ style: { color: '#222' } }}
              required
              placeholder="Enter a catchy title..."
            />

            <TextField
              fullWidth
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              multiline
              minRows={3}
              sx={{
                mb: 3,
                backgroundColor: '#f3f4f6',
                borderRadius: 2
              }}
              InputLabelProps={{ style: { color: '#222', fontWeight: 600 } }}
              InputProps={{ style: { color: '#222' } }}
              required
              placeholder="Write your announcement message here..."
            />

            {announcementType === 'individual' && (
              <Autocomplete
                multiple
                options={users}
                getOptionLabel={(option) => `${option.username} (${option.role})`}
                value={targetUsers}
                onChange={(e, newValue) => setTargetUsers(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Target Users"
                    placeholder="Select users to notify..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f3f4f6',
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: '#e5e7eb',
                        }
                      },
                      '& .MuiInputLabel-root': {
                        fontWeight: 600
                      }
                    }}
                  />
                )}
                sx={{ mb: 3 }}
              />
            )}

            <FormControl
              fullWidth
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f3f4f6',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: '#e5e7eb',
                  }
                }
              }}
            >
              <InputLabel sx={{ fontWeight: 600 }}>Priority</InputLabel>
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                label="Priority"
              >
                <MenuItem value="normal">
                  <Typography fontWeight={600}>Normal</Typography>
                </MenuItem>
                <MenuItem value="important">
                  <Typography fontWeight={600} color="warning.main">⚠️ Important</Typography>
                </MenuItem>
                <MenuItem value="urgent">
                  <Typography fontWeight={600} color="error.main">🚨 Urgent</Typography>
                </MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={submitting}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 2,
                background: announcementType === 'company-wide'
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                boxShadow: announcementType === 'company-wide'
                  ? '0 8px 24px rgba(102, 126, 234, 0.4)'
                  : '0 8px 24px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: announcementType === 'company-wide'
                    ? '0 12px 32px rgba(102, 126, 234, 0.5)'
                    : '0 12px 32px rgba(59, 130, 246, 0.5)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {submitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <>
                  📢 Post {announcementType === 'company-wide' ? 'Company' : 'Individual'} Announcement
                </>
              )}
            </Button>
          </form>
        </Paper>
      )}

      {/* Recent Announcements Section */}
      <Box mb={3}>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 2
          }}
        >
          Recent Announcements
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress size={48} sx={{ color: '#667eea' }} />
        </Box>
      ) : announcements.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(30, 42, 56, 0.6) 0%, rgba(30, 42, 56, 0.8) 100%)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <CampaignIcon sx={{ fontSize: 64, color: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            No announcements yet.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Check back later for updates!
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {(preview ? announcements.slice(0, 3) : announcements).map((announcement) => (
            <Card
              key={announcement._id}
              sx={{
                background: announcement.type === 'company-wide'
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                borderRadius: 2,
                border: '1px solid',
                borderColor: announcement.type === 'company-wide'
                  ? 'rgba(102, 126, 234, 0.3)'
                  : 'rgba(59, 130, 246, 0.3)',
                borderLeft: 4,
                borderLeftColor: announcement.type === 'company-wide' ? '#a78bfa' : '#60a5fa',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.3s ease',
                p: 0.5, // even less padding
                mb: 1, // even less margin between cards
                minHeight: 80, // set a minimum height
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: announcement.type === 'company-wide'
                    ? '0 6px 16px rgba(102, 126, 234, 0.15)'
                    : '0 6px 16px rgba(59, 130, 246, 0.15)',
                  borderColor: announcement.type === 'company-wide'
                    ? 'rgba(102, 126, 234, 0.4)'
                    : 'rgba(59, 130, 246, 0.4)',
                }
              }}
            >
              <CardContent sx={{ p: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      {announcement.type === 'company-wide' ? (
                        <Chip
                          icon={<CampaignIcon />}
                          label="Company-Wide"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            '& .MuiChip-icon': {
                              color: 'white'
                            }
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<PersonIcon />}
                          label="Individual"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            '& .MuiChip-icon': {
                              color: 'white'
                            }
                          }}
                        />
                      )}
                      {announcement.priority === 'important' && (
                        <Chip
                          label="⚠️ IMPORTANT"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            animation: 'pulse 2s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.8 }
                            }
                          }}
                        />
                      )}
                      {announcement.priority === 'urgent' && (
                        <Chip
                          label="🚨 URGENT"
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            animation: 'blink 1s ease-in-out infinite',
                            '@keyframes blink': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.6 }
                            }
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{
                        mb: 1,
                        color: '#222',
                        textShadow: 'none',
                        fontSize: '1.1rem', // smaller title
                        lineHeight: 1.2
                      }}
                    >
                      {announcement.title}
                    </Typography>
                  </Box>

                  {isAdmin && currentUser?.username === announcement.createdBy && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(announcement._id)}
                      sx={{
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          transform: 'scale(1.1)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    mb: 1.2,
                    whiteSpace: 'pre-wrap',
                    color: '#444',
                    lineHeight: 1.5,
                    fontSize: '0.95rem', // smaller message
                    display: '-webkit-box',
                    WebkitLineClamp: preview ? 3 : 'unset',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {announcement.message}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pt: 2,
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#333', // darker for better contrast
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      letterSpacing: 0.2
                    }}
                  >
                    Posted by <span style={{ color: '#7c3aed', fontWeight: 700 }}>{announcement.createdBy}</span> · {formatDate(announcement.createdAt)}
                  </Typography>
                  {announcement.type === 'individual' && announcement.targetUsers && announcement.targetUsers.length > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#333', // darker for better contrast
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        letterSpacing: 0.2
                      }}
                    >
                      To: <span style={{ color: '#2563eb', fontWeight: 700 }}>{announcement.targetUsers.join(', ')}</span>
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
          {preview && (
            <Box textAlign="center" mt={2}>
              <Button component={Link} to="/admin/announcements" variant="outlined">
                View All Announcements
              </Button>
            </Box>
          )}
        </Stack>

      )}
    </Box>
  );
}
