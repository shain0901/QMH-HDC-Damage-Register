import { useEffect, useState } from 'react';
import {
  Box, Container, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, Chip, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { api, ROLE_LABELS } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const ROLES = ['admin', 'editor', 'reporter_repairer', 'repairer'];

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'reporter_repairer' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role !== 'admin') { navigate('/'); return; }
    load();
  }, [user, navigate]);

  function load() { api.users().then(setUsers); }

  async function saveRole(u, role) {
    await api.updateUser(u.id, { name: u.name, email: u.email, role });
    load();
  }

  async function toggleActive(u) {
    if (u.active) await api.deactivateUser(u.id); else await api.reactivateUser(u.id);
    load();
  }

  async function addUser() {
    setError('');
    try {
      await api.addUser(newUser);
      setAddOpen(false);
      setNewUser({ name: '', email: '', role: 'reporter_repairer' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <TopBar />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Card variant="outlined">
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>Manage users</Typography>
              <Button variant="contained" onClick={() => setAddOpen(true)}>Add user</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell>
                  <TableCell>Status</TableCell><TableCell>Last login</TableCell><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Select size="small" value={u.role} onChange={(e) => saveRole(u, e.target.value)} disabled={u.id === user.id}>
                        {ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
                      </Select>
                    </TableCell>
                    <TableCell><Chip size="small" label={u.active ? 'Active' : 'Inactive'} color={u.active ? 'success' : 'default'} /></TableCell>
                    <TableCell>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell>
                      {u.id !== user.id && (
                        <Button size="small" onClick={() => toggleActive(u)}>{u.active ? 'Deactivate' : 'Reactivate'}</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add a user</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} autoFocus />
          <TextField label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <Select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            {ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
          </Select>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addUser} disabled={!newUser.name || !newUser.email}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
