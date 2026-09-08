import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Paper, Typography, Alert, CircularProgress, Button } from '@mui/material';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Missing sign-in token.');
      return;
    }
    api.verify(token)
      .then((me) => { setUser(me); navigate('/', { replace: true }); })
      .catch((err) => setError(err.message || 'That sign-in link is no longer valid.'));
  }, [params, navigate, setUser]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default" px={2}>
      <Paper elevation={0} variant="outlined" sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {error ? (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="contained" onClick={() => navigate('/login')}>Request a new link</Button>
          </>
        ) : (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Signing you in…</Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
