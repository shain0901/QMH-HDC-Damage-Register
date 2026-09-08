import { useState } from 'react';
import { Card, CardContent, Box, Typography, Stack, Chip, Alert } from '@mui/material';
import ZoneDot from './ZoneDot';

// Filename convention so Shain can just drop redrawn photos into frontend/public/maps/ without
// touching code — see frontend/public/maps/README.md. Change the extension here if a building's
// photo isn't a .jpg.
const MAP_IMAGE_EXT = {
  'Chisholm Block': 'jpg',
  "Nurse's Hostel": 'jpg',
  "Soldier's Block": 'jpg',
};

function slug(name) {
  return name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function BuildingMapCard({ building }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (!building) return null;
  const ext = MAP_IMAGE_EXT[building.name] || 'jpg';
  const src = `/maps/${slug(building.name)}.${ext}`;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary">Reference</Typography>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Building map — {building.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          For whoever's assigned to fix it: find the zone below, then use this marked-up site photo
          to see where it actually is.
        </Typography>

        <Box
          sx={{
            background: 'background.default', border: '1px solid', borderColor: 'divider',
            borderRadius: 2, p: 1.5, display: 'flex', justifyContent: 'center', minHeight: 120,
          }}
        >
          {!imgFailed ? (
            <Box
              component="img"
              src={src}
              alt={`Marked-up site photo of ${building.name} showing zone outlines`}
              onError={() => setImgFailed(true)}
              sx={{ maxWidth: '100%', borderRadius: 1, display: 'block' }}
            />
          ) : (
            <Alert severity="info" sx={{ alignSelf: 'center' }}>
              No reference photo yet for {building.name} — drop one into <code>frontend/public/maps/</code>.
            </Alert>
          )}
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1.5} mt={1.5}>
          {building.zones.map((z) => (
            <Chip
              key={z.id}
              size="small"
              variant="outlined"
              icon={z.color ? <ZoneDot color={z.color} /> : undefined}
              label={z.label}
            />
          ))}
          {building.zones.length === 0 && (
            <Typography variant="body2" color="text.secondary">No zones mapped for this building yet.</Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
