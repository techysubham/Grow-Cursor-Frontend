import React, { useState } from 'react';
import { Typography, Button, Stack, Box } from '@mui/material';

export default function WorkHours() {
  const [status, setStatus] = useState('checked-out');
  const [workTime, setWorkTime] = useState('0h 0m');
  const [overtime, setOvertime] = useState('0h 0m');

  return (
    <Box>
      <Typography variant="h6" mb={2}>Work Hours</Typography>
      <Typography>Status: <b>{status.replace('-', ' ')}</b></Typography>
      <Typography>Total: {workTime}</Typography>
      <Typography mb={2}>Overtime: {overtime}</Typography>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="primary" onClick={() => setStatus('checked-in')}>Check-In</Button>
        <Button variant="outlined" color="warning" onClick={() => setStatus('paused')}>Pause</Button>
        <Button variant="contained" color="secondary" onClick={() => setStatus('checked-out')}>Check-Out</Button>
      </Stack>
    </Box>
  );
}
