import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import JSZip from 'jszip';
import { api } from '../lib/api';

// Full export: one ZIP with the register as a CSV plus every photo, filed by incident reference.
// Built in the browser rather than on the server, because a serverless function can't return a
// response anywhere near the size of a folder of photos. Photos are fetched straight from Blob
// storage; any that can't be fetched are listed (with their links) in photos-not-included.txt so
// the export is never silently incomplete.

function safeName(name) {
  return name.replace(/[\\/:*?"<>|]+/g, '_');
}

export default function ExportAllButton() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function run() {
    setBusy(true);
    setProgress('Preparing…');
    try {
      const zip = new JSZip();
      const today = new Date().toISOString().slice(0, 10);

      const csvRes = await fetch(api.exportCsvUrl(), { credentials: 'include' });
      if (!csvRes.ok) throw new Error('Could not download the register CSV.');
      zip.file(`qmh-damage-register-${today}.csv`, await csvRes.text());

      const incidents = await api.incidents();
      const photos = incidents.flatMap((i) =>
        i.photos.map((p, n) => ({ ref: i.ref_code, url: p.blob_url, name: `${n + 1}-${safeName(p.filename)}` }))
      );

      const missing = [];
      for (let k = 0; k < photos.length; k++) {
        const p = photos[k];
        setProgress(`Photo ${k + 1} of ${photos.length}…`);
        try {
          const res = await fetch(p.url);
          if (!res.ok) throw new Error(res.statusText);
          zip.file(`photos/${p.ref}/${p.name}`, await res.blob());
        } catch (e) {
          missing.push(`${p.ref}\t${p.name}\t${p.url}`);
        }
      }
      if (missing.length) {
        zip.file(
          'photos-not-included.txt',
          'These photos could not be downloaded into this export. Each is still available at its link.\n\n' +
            missing.join('\n') + '\n'
        );
      }

      setProgress('Building ZIP…');
      // Photos are already compressed, so store them as-is: much faster, barely any bigger.
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `qmh-damage-register-full-export-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);

      setProgress(missing.length ? `Done — ${missing.length} photo(s) listed in photos-not-included.txt` : '');
    } catch (e) {
      setProgress(`Export failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Button size="small" variant="outlined" onClick={run} disabled={busy}>
        {busy ? progress : 'Full export (ZIP)'}
      </Button>
      {!busy && progress && (
        <Typography variant="caption" color="text.secondary">{progress}</Typography>
      )}
    </Box>
  );
}
