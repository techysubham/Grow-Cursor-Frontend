import React from 'react';
import { Typography, Button, Box } from '@mui/material';

export default function LeaveRequests() {
  return (
    <Box>
      <Typography variant="h6" mb={2}>Leave Requests</Typography>
      <Typography>Leave Balance: <b>2 days</b></Typography>
      <Button variant="contained" color="primary" sx={{ my: 2 }}>Apply Leave</Button>
      <Typography variant="subtitle1" fontWeight={600}>Requests</Typography>
      <Typography color="text.secondary">No leave requests yet.</Typography>
    </Box>
  );
}
