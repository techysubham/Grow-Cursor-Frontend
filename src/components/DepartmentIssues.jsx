import React from 'react';
import { Typography, Button, Box, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';

export default function DepartmentIssues() {
  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Department-wise Issues</Typography>
        <Button variant="contained" color="primary">Report Issue</Button>
      </Box>
      <Stack direction="row" spacing={2} mb={2}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Department</InputLabel>
          <Select label="Department" value="">
            <MenuItem value="">All Departments</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select label="Status" value="">
            <MenuItem value="">Status</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select label="Priority" value="">
            <MenuItem value="">Priority</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Typography color="text.secondary">No issues reported yet.</Typography>
    </Box>
  );
}
