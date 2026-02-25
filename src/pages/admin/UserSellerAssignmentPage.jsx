import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    IconButton,
    Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../lib/api';

const UserSellerAssignmentPage = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = user?.role || '';

    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [sellers, setSellers] = useState([]);

    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedSeller, setSelectedSeller] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAssignments();
        fetchUsersAndSellers();
    }, []);

    const fetchAssignments = async () => {
        try {
            const { data } = await api.get('/user-sellers/assignments');
            setAssignments(data);
        } catch (err) {
            console.error('Failed to fetch assignments:', err);
            setError('Failed to load assignments');
        }
    };

    const fetchUsersAndSellers = async () => {
        try {
            const [usersRes, sellersRes] = await Promise.all([
                api.get('/users'),
                api.get('/sellers/all')
            ]);
            setUsers(usersRes.data);
            setSellers(sellersRes.data);
        } catch (err) {
            console.error('Failed to fetch users and sellers:', err);
        }
    };

    const handleAssign = async () => {
        if (!selectedUser || !selectedSeller) {
            setError('Please select both a user and a seller');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/user-sellers/assignments', {
                userId: selectedUser,
                sellerId: selectedSeller
            });
            setOpenDialog(false);
            setSelectedUser('');
            setSelectedSeller('');
            fetchAssignments();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this assignment?')) return;
        try {
            await api.delete(`/user-sellers/assignments/${id}`);
            fetchAssignments();
        } catch (err) {
            console.error('Failed to delete assignment:', err);
            alert('Failed to remove assignment');
        }
    };

    const canManage = ['superadmin', 'hr', 'hradmin'].includes(userRole);

    if (!canManage) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4 }}>
                <Alert severity="error">You do not have permission to view this page.</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Grid container justifyContent="space-between" alignItems="center" mb={3}>
                <Grid item>
                    <Typography variant="h4" component="h1">
                        User-Seller Assignments
                    </Typography>
                </Grid>
                <Grid item>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                    >
                        New Assignment
                    </Button>
                </Grid>
            </Grid>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Department</TableCell>
                            <TableCell>Seller / Store</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assignments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">No assignments found</TableCell>
                            </TableRow>
                        ) : (
                            assignments.map((assignment) => (
                                <TableRow key={assignment._id}>
                                    <TableCell>{assignment.user?.username} ({assignment.user?.email})</TableCell>
                                    <TableCell>{assignment.user?.department || '-'}</TableCell>
                                    <TableCell>
                                        {assignment.seller?.user?.username || assignment.seller?.storeName || assignment.seller?._id}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton color="error" onClick={() => handleDelete(assignment._id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Assignment Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Seller to User</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select User</InputLabel>
                        <Select
                            value={selectedUser}
                            label="Select User"
                            onChange={(e) => setSelectedUser(e.target.value)}
                        >
                            {users.map((u) => (
                                <MenuItem key={u._id} value={u._id}>
                                    {u.username} ({u.role})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth sx={{ mt: 3 }}>
                        <InputLabel>Select Seller</InputLabel>
                        <Select
                            value={selectedSeller}
                            label="Select Seller"
                            onChange={(e) => setSelectedSeller(e.target.value)}
                        >
                            {sellers.map((s) => (
                                <MenuItem key={s._id} value={s._id}>
                                    {s.user?.username || s.storeName || s._id}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleAssign} variant="contained" disabled={loading}>
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default UserSellerAssignmentPage;
