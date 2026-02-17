import React from 'react';
import DepartmentIssues from '../components/DepartmentIssues';
import { Box, Paper, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function DepartmentIssuesPage() {
    return (
        <Box p={3}>
            <Box mb={2}>
                <Button component={Link} to="/admin/work-hr-dashboard" variant="outlined">← Back to Dashboard</Button>
            </Box>
            <Paper sx={{ p: 3 }}>
                <DepartmentIssues />
            </Paper>
        </Box>
    );
}
