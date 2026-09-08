import { useState } from 'react';
import {
  Card, CardContent, Box, Typography, Tabs, Tab, Chip, Stack, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import ZoneDot from './ZoneDot';
import { api, can } from '../lib/api';

export default function ZonePicker({ buildings, currentBuildingId, onChangeBuilding, selections, onChangeSelections, role, onZonesChanged }) {
  const [editMode, setEditMode] = useState(false);
  const [dialog, setDialog] = useState(null); // { mode: 'add'|'rename', zone? }
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#ad4a15');

  const building = buildings.find((b) => b.id === currentBuildingId) || buildings[0];
  const canEditZones = can(role, 'manage_zones');

  function isSelected(zoneId) {
    return selections.some((s) => s.zone_id === zoneId);
  }

  function toggle(zone) {
    if (isSelected(zone.id)) {
      onChangeSelections(selections.filter((s) => s.zone_id !== zone.id));
    } else {
      onChangeSelections([...selections, { zone_id: zone.id, building: building.name, label: zone.label, color: zone.color }]);
    }
  }

  function openAdd() {
    setLabel('');
    setColor('#ad4a15');
    setDialog({ mode: 'add' });
  }
  function openRename(zone) {
    setLabel(zone.label);
    setColor(zone.color || '#ad4a15');
    setDialog({ mode: 'rename', zone });
  }

  async function saveDialog() {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (dialog.mode === 'add') {
      await api.addZone(building.id, trimmed, color);
    } else {
      await api.renameZone(dialog.zone.id, trimmed, color);
    }
    setDialog(null);
    onZonesChanged();
  }

  async function removeZone(zone) {
    if (!window.confirm(`Remove "${zone.label}" from the map? Past incidents logged against it keep their record.`)) return;
    await api.deleteZone(zone.id);
    onChangeSelections(selections.filter((s) => s.zone_id !== zone.id));
    onZonesChanged();
  }

  if (!building) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
          <Box>
            <Typography variant="overline" color="text.secondary">Step 1</Typography>
            <Typography variant="h6" fontWeight={600}>Select the zone(s)</Typography>
          </Box>
          {canEditZones && (
            <Button size="small" variant={editMode ? 'contained' : 'outlined'} onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Done editing' : 'Edit zone layout'}
            </Button>
          )}
        </Box>

        <Tabs
          value={building.id}
          onChange={(_, id) => onChangeBuilding(id)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, minHeight: 36 }}
        >
          {buildings.map((b) => <Tab key={b.id} value={b.id} label={b.name} sx={{ minHeight: 36 }} />)}
        </Tabs>

        <Box
          sx={{
            display: 'flex', flexWrap: 'wrap', gap: 1, background: 'background.default',
            border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, minHeight: 64,
          }}
        >
          {building.zones.map((zone) => (
            editMode ? (
              <Chip
                key={zone.id}
                icon={zone.color ? <ZoneDot color={zone.color} /> : undefined}
                label={zone.label}
                onClick={() => openRename(zone)}
                onDelete={() => removeZone(zone)}
                deleteIcon={<CloseIcon />}
                variant="outlined"
              />
            ) : (
              <Chip
                key={zone.id}
                icon={zone.color ? <ZoneDot color={zone.color} /> : undefined}
                label={zone.label}
                onClick={() => toggle(zone)}
                color={isSelected(zone.id) ? 'primary' : 'default'}
                variant={isSelected(zone.id) ? 'filled' : 'outlined'}
              />
            )
          ))}
          {editMode && (
            <Chip icon={<AddIcon />} label="Add zone" variant="outlined" onClick={openAdd} sx={{ borderStyle: 'dashed' }} />
          )}
          {building.zones.length === 0 && !editMode && (
            <Typography variant="body2" color="text.secondary">
              No zones mapped for {building.name} yet{canEditZones ? ' — turn on Edit zone layout to add one.' : '.'}
            </Typography>
          )}
        </Box>

        {selections.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={1} mt={2}>
            {selections.map((s) => (
              <Chip
                key={s.zone_id}
                size="small"
                icon={s.color ? <ZoneDot color={s.color} /> : undefined}
                label={`${s.building} — ${s.label}`}
                onDelete={() => onChangeSelections(selections.filter((x) => x.zone_id !== s.zone_id))}
              />
            ))}
          </Stack>
        )}
        {selections.length === 0 && (
          <Typography variant="body2" color="text.secondary" mt={2}>
            No zones selected yet — tap one or more above.
          </Typography>
        )}
      </CardContent>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>{dialog?.mode === 'add' ? `Add a zone to ${building.name}` : 'Rename zone'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Zone label" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="e.g. Zone2-NW" />
          <TextField
            label="Colour (matches the reference photo)" type="color" value={color}
            onChange={(e) => setColor(e.target.value)} sx={{ width: 120 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveDialog} disabled={!label.trim()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
