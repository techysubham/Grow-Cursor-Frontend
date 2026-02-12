import React from 'react';
import { Typography, Box } from '@mui/material';

export default function Announcements() {
  return (
    <Box>
      <Typography variant="h6" mb={2}>Announcements</Typography>
      <Typography variant="subtitle1" fontWeight={600}>Company Announcements</Typography>
      <Typography color="text.secondary" mb={2}>No announcements yet.</Typography>
      <Typography variant="subtitle1" fontWeight={600}>Individual Announcements</Typography>
      <Typography color="text.secondary">No personal announcements.</Typography>
    </Box>
  );
}
