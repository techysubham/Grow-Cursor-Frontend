import { useEffect, useMemo, useState } from 'react';
import { AppBar, Box, Button, Card, CardActions, CardContent, Grid, Toolbar, Typography, Divider, TextField } from '@mui/material';
import api from '../../lib/api.js';

export default function ListerDashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const load = async () => {
    const { data } = await api.get('/tasks');
    setTasks(data);
  };
  useEffect(() => { load(); }, []);

  const complete = async (id, completedQuantity) => {
    await api.post(`/tasks/${id}/complete`, { completedQuantity });
    await load();
  };

  const pending = useMemo(() => tasks.filter((t) => t.status !== 'completed'), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.status === 'completed'), [tasks]);

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>My Tasks</Typography>
          {user ? <Typography variant="body2" sx={{ mr: 2 }}>{user.username} (lister)</Typography> : null}
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Pending</Typography>
        <Grid container spacing={2}>
          {pending.map((t) => (
            <Grid item xs={12} md={6} lg={4} key={t._id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">{t.productTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(t.date).toLocaleDateString()}</Typography>
                  <Typography variant="body2">Range: {t.range} | Category: {t.category}</Typography>
                  <Typography variant="body2">Qty: {t.quantity} | Selling Price: {t.sellingPrice}</Typography>
                  <Typography variant="body2">Listing: {t.listingPlatform?.name} / {t.store?.name}</Typography>
                  <Typography variant="body2"><a href={t.supplierLink} target="_blank" rel="noreferrer">Supplier Link</a></Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Completed: {t.completedQuantity || 0} / {t.quantity}</Typography>
                </CardContent>
                <CardActions>
                  <TextField size="small" type="number" label="Completed Qty" inputProps={{ min: 0, max: t.quantity }} value={t.completedQuantity || 0} onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 0 && val <= t.quantity) {
                      complete(t._id, val);
                    }
                  }} sx={{ width: 120, mr: 1 }} />
                  <Button size="small" onClick={() => complete(t._id, t.quantity)}>Mark Fully Completed</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {pending.length === 0 ? (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No pending tasks.</Typography></Grid>
          ) : null}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Completed</Typography>
        <Grid container spacing={2}>
          {completed.map((t) => (
            <Grid item xs={12} md={6} lg={4} key={t._id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">{t.productTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(t.date).toLocaleDateString()}</Typography>
                  <Typography variant="body2">Range: {t.range} | Category: {t.category}</Typography>
                  <Typography variant="body2">Qty: {t.quantity} | Selling Price: {t.sellingPrice}</Typography>
                  <Typography variant="body2">Listing: {t.listingPlatform?.name} / {t.store?.name}</Typography>
                  <Typography variant="body2"><a href={t.supplierLink} target="_blank" rel="noreferrer">Supplier Link</a></Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Status: completed</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {completed.length === 0 ? (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No completed tasks yet.</Typography></Grid>
          ) : null}
        </Grid>
      </Box>
    </Box>
  );
}


