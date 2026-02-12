import React from 'react';
import { Grid, Card, CardContent, Box } from '@mui/material';
import DepartmentIssues from '../components/DepartmentIssues';
import Announcements from '../components/Announcements';
import WorkHours from '../components/WorkHours';
import LeaveRequests from '../components/LeaveRequests';

export default function WorkHRDashboard() {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <DepartmentIssues />
            </CardContent>
          </Card>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Announcements />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <WorkHours />
            </CardContent>
          </Card>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <LeaveRequests />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
