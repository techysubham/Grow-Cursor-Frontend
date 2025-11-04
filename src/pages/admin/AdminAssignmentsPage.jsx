import { useEffect, useMemo, useState } from 'react';
import { Box, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import api from '../../lib/api.js';

export default function AdminAssignmentsPage() {
  const [rows, setRows] = useState([]);
  const [listers, setListers] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/tasks/analytics/admin-lister'),
      api.get('/users/listers')
    ]).then(([r, l]) => {
      setRows(r.data);
      setListers(l.data);
    });
  }, []);

  const perAdmin = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.adminId || 'unassigned';
      if (!map.has(key)) map.set(key, { adminName: r.adminName || 'Unassigned', tasksCount: 0, quantityTotal: 0, completedCount: 0, completedQty: 0 });
      const agg = map.get(key);
      agg.tasksCount += r.tasksCount;
      agg.quantityTotal += r.quantityTotal;
      agg.completedCount += r.completedCount;
      agg.completedQty += r.completedQty;
    }
    // Add pending fields
    return Array.from(map.values()).map(r => ({
      ...r,
      pendingTasks: r.tasksCount - r.completedCount,
      pendingQty: r.quantityTotal - r.completedQty
    }));
  }, [rows]);

  const perLister = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r.listerId) continue;
      const key = r.listerId;
      if (!map.has(key)) map.set(key, { listerName: r.listerName || 'Unknown', tasksCount: 0, quantityTotal: 0, completedCount: 0, completedQty: 0 });
      const agg = map.get(key);
      agg.tasksCount += r.tasksCount;
      agg.quantityTotal += r.quantityTotal;
      agg.completedCount += r.completedCount;
      agg.completedQty += r.completedQty;
    }
    // Add pending fields
    return Array.from(map.values()).map(r => ({
      ...r,
      pendingTasks: r.tasksCount - r.completedCount,
      pendingQty: r.quantityTotal - r.completedQty
    }));
  }, [rows]);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Assignments Summary</Typography>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Listing Admin Summary</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Listing Admin</TableCell>
              <TableCell>Tasks Assigned</TableCell>
              <TableCell>Pending Tasks</TableCell>
              <TableCell>Total Quantity</TableCell>
              <TableCell>Pending Quantity</TableCell>
              <TableCell>Completed Tasks</TableCell>
              <TableCell>Completed Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {perAdmin.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.adminName}</TableCell>
                <TableCell>{r.tasksCount}</TableCell>
                <TableCell>{r.pendingTasks}</TableCell>
                <TableCell>{r.quantityTotal}</TableCell>
                <TableCell>{r.pendingQty}</TableCell>
                <TableCell>{r.completedCount}</TableCell>
                <TableCell>{r.completedQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Lister Summary</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Lister</TableCell>
              <TableCell>Tasks Assigned</TableCell>
              <TableCell>Pending Tasks</TableCell>
              <TableCell>Total Quantity</TableCell>
              <TableCell>Pending Quantity</TableCell>
              <TableCell>Completed Tasks</TableCell>
              <TableCell>Completed Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {perLister.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.listerName}</TableCell>
                <TableCell>{r.tasksCount}</TableCell>
                <TableCell>{r.pendingTasks}</TableCell>
                <TableCell>{r.quantityTotal}</TableCell>
                <TableCell>{r.pendingQty}</TableCell>
                <TableCell>{r.completedCount}</TableCell>
                <TableCell>{r.completedQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>Admin → Lister Detail</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Listing Admin</TableCell>
              <TableCell>Lister</TableCell>
              <TableCell>Tasks</TableCell>
              <TableCell>Pending Tasks</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Pending Quantity</TableCell>
              <TableCell>Completed Tasks</TableCell>
              <TableCell>Completed Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>{r.date || '-'}</TableCell>
                <TableCell>{r.adminName || 'Unassigned'}</TableCell>
                <TableCell>{r.listerName || '-'}</TableCell>
                <TableCell>{r.tasksCount}</TableCell>
                <TableCell>{r.tasksCount - r.completedCount}</TableCell>
                <TableCell>{r.quantityTotal}</TableCell>
                <TableCell>{r.quantityTotal - r.completedQty}</TableCell>
                <TableCell>{r.completedCount}</TableCell>
                <TableCell>{r.completedQty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}