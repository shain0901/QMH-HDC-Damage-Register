import { AppBar, Toolbar, Box, Typography, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ROLE_LABELS, can } from '../lib/api';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: '#231e15', color: '#fff8f1' }}>
      <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
        <Box
          sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, mr: 1.5 }}
        >
          HS
        </Box>
        <Box flex={1} minWidth={200}>
          <Typography fontWeight={600} sx={{ fontFamily: "'Fraunces', serif" }}>Damage Register</Typography>
          <Typography variant="caption" sx={{ color: '#d8cbb2' }}>Hanmer Security · Queen Mary Hospital grounds</Typography>
        </Box>
        {user && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2">{user.name}</Typography>
            <Chip size="small" label={ROLE_LABELS[user.role] || user.role} sx={{ bgcolor: 'rgba(255,255,255,.12)', color: '#fff' }} />
            {can(user.role, 'manage_users') && (
              <Button size="small" sx={{ color: '#fff8f1' }} onClick={() => navigate('/admin/users')}>Manage users</Button>
            )}
            <Button size="small" sx={{ color: '#fff8f1' }} onClick={logout}>Sign out</Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
