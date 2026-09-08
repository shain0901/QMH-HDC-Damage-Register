import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';
import { api } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default" px={2}>
      <Paper elevation={0} variant="outlined" sx={{ p: 4, maxWidth: 420, width: '100%' }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>Damage Register</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Hanmer Security · Queen Mary Hospital grounds
        </Typography>
        {sent ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            If that email's on the list, a sign-in link is on its way — check your inbox (and spam
            folder). It's valid for 15 minutes.
          </Alert>
        ) : (
          <Box component="form" onSubmit={submit} mt={2} display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Your email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={busy || !email}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
