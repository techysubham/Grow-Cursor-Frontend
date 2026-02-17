import React from 'react';
import { Grid, Card, CardContent, Box, Button } from '@mui/material';
import DepartmentIssues from '../components/DepartmentIssues';
import Announcements from '../components/Announcements';
import LeaveRequests from '../components/LeaveRequests';
import { Link } from 'react-router-dom';

export default function WorkHRDashboard() {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Announcements preview={true} showCreate={true} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <DepartmentIssues preview={true} showReport={true} showDateFilter={true} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <LeaveRequests />
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}
