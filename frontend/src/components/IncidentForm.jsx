import { useState } from 'react';
import {
  Card, CardContent, Box, Typography, TextField, MenuItem, Button, Stack, Alert, List, ListItem,
} from '@mui/material';
import { api } from '../lib/api';
import { uploadPhoto } from '../lib/photos';

const DAMAGE_TYPES = ['Broken window', 'Attempted break-in', 'Door damage', 'Fence / perimeter damage', 'Graffiti / vandalism', 'Other damage'];

function today() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }

export default function IncidentForm({ selections, onClearSelections, onSaved }) {
  const [form, setForm] = useState({
    date_found: today(), time_found: nowTime(), contact: '', damage_type: DAMAGE_TYPES[0],
    police_status: 'Not yet filed', police_number: '', notes: '',
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!selections.length) { setError('Select at least one zone above first.'); return; }
    setBusy(true);
    try {
      const incident = await api.createIncident({
        locations: selections.map((s) => ({ zone_id: s.zone_id })),
        ...form,
      });
      for (const file of files) {
        try {
          const url = await uploadPhoto(file);
          await api.attachPhoto(incident.id, url, file.name);
        } catch (photoErr) {
          console.error('Photo upload failed', photoErr);
        }
      }
      onClearSelections();
      setForm({ date_found: today(), time_found: nowTime(), contact: '', damage_type: DAMAGE_TYPES[0], police_status: 'Not yet filed', police_number: '', notes: '' });
      setFiles([]);
      onSaved(incident);
    } catch (err) {
      setError(err.message || 'Could not save — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary">Step 2</Typography>
        <Typography variant="h6" fontWeight={600} gutterBottom>Incident details</Typography>
        <Box component="form" onSubmit={submit} display="flex" flexDirection="column" gap={2}>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField label="Date discovered" type="date" required sx={{ flex: 1, minWidth: 160 }}
              InputLabelProps={{ shrink: true }} value={form.date_found} onChange={(e) => set('date_found', e.target.value)} />
            <TextField label="Time discovered" type="time" required sx={{ flex: 1, minWidth: 140 }}
              InputLabelProps={{ shrink: true }} value={form.time_found} onChange={(e) => set('time_found', e.target.value)} />
          </Stack>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField label="Contact number (optional)" sx={{ flex: 1, minWidth: 180 }}
              value={form.contact} onChange={(e) => set('contact', e.target.value)} />
            <TextField select label="Damage type" sx={{ flex: 1, minWidth: 180 }}
              value={form.damage_type} onChange={(e) => set('damage_type', e.target.value)}>
              {DAMAGE_TYPES.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Stack>
          <Stack direction="row" gap={2} flexWrap="wrap">
            <TextField select label="Police report" sx={{ flex: 1, minWidth: 180 }}
              value={form.police_status} onChange={(e) => set('police_status', e.target.value)}>
              <MenuItem value="Not yet filed">Not yet filed</MenuItem>
              <MenuItem value="Filed">Filed</MenuItem>
              <MenuItem value="Not required">Not required</MenuItem>
            </TextField>
            {form.police_status === 'Filed' && (
              <TextField label="Police event / report number" sx={{ flex: 1, minWidth: 180 }}
                value={form.police_number} onChange={(e) => set('police_number', e.target.value)} />
            )}
          </Stack>
          <TextField label="What was found?" required multiline minRows={3}
            placeholder="Describe the damage, exactly which window(s) within the zone, access point, hazards, anything unusual."
            value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          <Box>
            <Button component="label" variant="outlined" size="small">
              Attach photos
              <input hidden type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
            </Button>
            {files.length > 0 && (
              <List dense>
                {files.map((f) => <ListItem key={f.name} sx={{ py: 0 }}>{f.name}</ListItem>)}
              </List>
            )}
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" gap={1}>
            <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : 'Save incident'}</Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
