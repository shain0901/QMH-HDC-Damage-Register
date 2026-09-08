import { useMemo, useState } from 'react';
import {
  Card, CardContent, Box, Typography, Stack, Chip, Button, Select, MenuItem, TextField,
  Collapse, Divider, IconButton, ButtonGroup,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ZoneDot from './ZoneDot';
import { api, can } from '../lib/api';

const SHAIN_EMAIL = 'shain@hanmersolutions.co.nz';

function statusColor(kind, value) {
  if (kind === 'police') return value === 'Filed' ? 'success' : value === 'Not required' ? 'default' : 'warning';
  return value === 'Repaired' ? 'success' : value === 'Assigned' ? 'primary' : 'warning';
}

function groupByBuilding(locations) {
  const order = [], map = {};
  for (const l of locations) {
    if (!map[l.building]) { map[l.building] = []; order.push(l.building); }
    map[l.building].push(l);
  }
  return order.map((building) => ({ building, locs: map[building] }));
}

function reportText(i) {
  const groups = groupByBuilding(i.locations);
  const locLines = groups.map((g) => `${g.building}: ${g.locs.map((l) => l.zone_label).join(', ')}`).join('\n');
  return `Damage incident ${i.ref_code}\n` +
    `Site: Queen Mary Hospital grounds\n${locLines}\n` +
    `Found: ${i.date_found} ${i.time_found}\n` +
    `Reported by: ${i.reported_by_name}${i.contact ? ` (${i.contact})` : ''}\n` +
    `Damage type: ${i.damage_type}\n` +
    `Police status: ${i.police_status}${i.police_number ? ` – ${i.police_number}` : ''}\n` +
    `Notes: ${i.notes}\n` +
    `Photos: ${i.photos.length ? i.photos.map((p) => p.blob_url).join(', ') : 'None'}`;
}

export default function IncidentRegister({ incidents, role, onChanged }) {
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [drafts, setDrafts] = useState({});

  const buildingNames = useMemo(() => {
    const set = new Set();
    incidents.forEach((i) => i.locations.forEach((l) => set.add(l.building)));
    return Array.from(set);
  }, [incidents]);

  const filtered = incidents.filter((i) => {
    if (filterBuilding !== 'all' && !i.locations.some((l) => l.building === filterBuilding)) return false;
    if (filterStatus === 'needsPolice') return i.police_status === 'Not yet filed';
    if (filterStatus === 'needsRepair') return i.repair_status === 'Not assigned';
    if (filterStatus === 'closed') return i.police_status !== 'Not yet filed' && i.repair_status === 'Repaired';
    return true;
  });

  function draftFor(i) {
    return drafts[i.id] || {
      police_status: i.police_status, police_number: i.police_number || '',
      repair_status: i.repair_status, repair_contractor: i.repair_contractor || '',
    };
  }
  function setDraft(incident, patch) {
    setDrafts((d) => ({ ...d, [incident.id]: { ...draftFor(incident), ...patch } }));
  }

  async function saveEdits(i) {
    const draft = draftFor(i);
    const allowed = {};
    if (can(role, 'edit_full')) {
      allowed.police_status = draft.police_status;
      allowed.police_number = draft.police_number;
    }
    if (can(role, 'edit_repair')) {
      allowed.repair_status = draft.repair_status;
      allowed.repair_contractor = draft.repair_contractor;
    }
    await api.patchIncident(i.id, allowed);
    onChanged();
  }

  async function doDelete(id) {
    if (confirmDelete === id) {
      await api.deleteIncident(id);
      setConfirmDelete(null);
      setExpanded(null);
      onChanged();
    } else {
      setConfirmDelete(id);
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
          <Typography variant="h6" fontWeight={600}>Incident register</Typography>
          <Button size="small" variant="outlined" component="a" href={api.exportCsvUrl()}>Export CSV</Button>
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" mb={2}>
          <Select size="small" value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)}>
            <MenuItem value="all">All buildings</MenuItem>
            {buildingNames.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </Select>
          <ButtonGroup size="small">
            {[['all', 'All'], ['needsPolice', 'Needs police report'], ['needsRepair', 'Repair unassigned'], ['closed', 'Closed out']].map(([v, label]) => (
              <Button key={v} variant={filterStatus === v ? 'contained' : 'outlined'} onClick={() => setFilterStatus(v)}>{label}</Button>
            ))}
          </ButtonGroup>
          <Box flex={1} />
          <Typography variant="body2" color="text.secondary">
            {filtered.length} {filtered.length === 1 ? 'incident' : 'incidents'}
          </Typography>
        </Stack>

        {incidents.length === 0 && (
          <Typography color="text.secondary" textAlign="center" py={3}>
            No incidents logged yet — the first one anyone saves will appear here for the whole team.
          </Typography>
        )}

        <Stack gap={1}>
          {filtered.map((i) => {
            const open = expanded === i.id;
            const draft = draftFor(i);
            const groups = groupByBuilding(i.locations);
            return (
              <Box key={i.id} border={1} borderColor="divider" borderRadius={2} overflow="hidden">
                <Box
                  onClick={() => { setExpanded(open ? null : i.id); setConfirmDelete(null); }}
                  sx={{ p: 1.5, cursor: 'pointer', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary', minWidth: 150 }}>{i.ref_code}</Typography>
                  <Box flex={1} minWidth={200}>
                    <Typography variant="body2" component="div">
                      {groups.map((g) => (
                        <Box key={g.building} component="span" sx={{ mr: 1.5 }}>
                          {g.building} —{' '}
                          {g.locs.map((l) => (
                            <Box key={l.zone_label} component="span" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                              <ZoneDot color={l.zone_color} />{l.zone_label}{' '}
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{i.damage_type}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {i.date_found} {i.time_found}
                  </Typography>
                  <Stack direction="row" gap={0.5}>
                    <Chip size="small" label={i.police_status} color={statusColor('police', i.police_status)} />
                    <Chip size="small" label={`Repair: ${i.repair_status}`} color={statusColor('repair', i.repair_status)} />
                  </Stack>
                  <IconButton size="small">{open ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
                </Box>

                <Collapse in={open}>
                  <Divider />
                  <Box p={2} display="flex" flexDirection="column" gap={2} bgcolor="background.default">
                    <Box>
                      <Typography variant="caption" color="text.secondary">ZONES</Typography>
                      {groups.map((g) => (
                        <Typography key={g.building} variant="body2">
                          {g.building}: {g.locs.map((l) => (
                            <span key={l.zone_label}><ZoneDot color={l.zone_color} />{l.zone_label} </span>
                          ))}
                        </Typography>
                      ))}
                    </Box>
                    <Typography variant="body2"><strong>Reported by:</strong> {i.reported_by_name}{i.contact ? ` · ${i.contact}` : ''}</Typography>
                    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5, whiteSpace: 'pre-wrap' }}>
                      {i.notes}
                    </Box>
                    {i.photos.length > 0 && (
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        {i.photos.map((p) => (
                          <Box key={p.id} component="a" href={p.blob_url} target="_blank" rel="noreferrer">
                            <Box component="img" src={p.blob_url} alt={p.filename} sx={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }} />
                          </Box>
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" gap={2} flexWrap="wrap">
                      {can(role, 'edit_full') && (
                        <>
                          <Select size="small" value={draft.police_status} onChange={(e) => setDraft(i, { police_status: e.target.value })}>
                            <MenuItem value="Not yet filed">Not yet filed</MenuItem>
                            <MenuItem value="Filed">Filed</MenuItem>
                            <MenuItem value="Not required">Not required</MenuItem>
                          </Select>
                          <TextField size="small" label="Police number" value={draft.police_number} onChange={(e) => setDraft(i, { police_number: e.target.value })} />
                        </>
                      )}
                      {can(role, 'edit_repair') && (
                        <>
                          <Select size="small" value={draft.repair_status} onChange={(e) => setDraft(i, { repair_status: e.target.value })}>
                            <MenuItem value="Not assigned">Not assigned</MenuItem>
                            <MenuItem value="Assigned">Assigned</MenuItem>
                            <MenuItem value="Repaired">Repaired</MenuItem>
                          </Select>
                          <TextField size="small" label="Repair contractor" value={draft.repair_contractor} onChange={(e) => setDraft(i, { repair_contractor: e.target.value })} />
                        </>
                      )}
                    </Stack>

                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                      {(can(role, 'edit_full') || can(role, 'edit_repair')) && (
                        <Button size="small" variant="outlined" onClick={() => saveEdits(i)}>Save changes</Button>
                      )}
                      <Button size="small" component="a" href={`mailto:${SHAIN_EMAIL}?subject=${encodeURIComponent('Damage incident ' + i.ref_code)}&body=${encodeURIComponent(reportText(i))}`}>
                        Notify Shain · Email
                      </Button>
                      <Button size="small" component="a" href={`sms:?&body=${encodeURIComponent('Damage incident ' + i.ref_code + '. Details in the register.')}`}>
                        Notify Shain · Text
                      </Button>
                      <Button size="small" onClick={() => navigator.clipboard.writeText(reportText(i))}>Copy for police report</Button>
                      <Box flex={1} />
                      {can(role, 'delete') && (
                        <Button size="small" color="error" variant={confirmDelete === i.id ? 'contained' : 'outlined'} onClick={() => doDelete(i.id)}>
                          {confirmDelete === i.id ? 'Confirm delete?' : 'Delete'}
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
