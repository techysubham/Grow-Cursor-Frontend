import React from 'react';
import Announcements from '../components/Announcements';
import { Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function AnnouncementsPage() {
    return (
        <Box sx={{ p: 3 }}>
            <Box mb={2}>
                <Button component={Link} to="/admin/work-hr-dashboard" variant="outlined">← Back to Dashboard</Button>
            </Box>
            <Announcements />
        </Box>
    );
}
