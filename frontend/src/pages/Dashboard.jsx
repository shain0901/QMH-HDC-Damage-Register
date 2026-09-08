import { useEffect, useState, useCallback } from 'react';
import { Box, Container, Grid, Snackbar, Tabs, Tab } from '@mui/material';
import TopBar from '../components/TopBar';
import ZonePicker from '../components/ZonePicker';
import IncidentForm from '../components/IncidentForm';
import BuildingMapCard from '../components/BuildingMapCard';
import IncidentRegister from '../components/IncidentRegister';
import { api, can } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [currentBuildingId, setCurrentBuildingId] = useState(null);
  const [selections, setSelections] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [toast, setToast] = useState('');

  const loadBuildings = useCallback(() => {
    api.buildings().then((b) => {
      setBuildings(b);
      setCurrentBuildingId((cur) => cur || (b[0] && b[0].id));
    });
  }, []);
  const loadIncidents = useCallback(() => {
    api.incidents().then(setIncidents);
  }, []);

  useEffect(() => { loadBuildings(); loadIncidents(); }, [loadBuildings, loadIncidents]);

  const currentBuilding = buildings.find((b) => b.id === currentBuildingId);
  const canCreate = can(user.role, 'create_incident');

  return (
    <Box bgcolor="background.default" minHeight="100vh">
      <TopBar />
      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {canCreate && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <ZonePicker
                buildings={buildings}
                currentBuildingId={currentBuildingId}
                onChangeBuilding={setCurrentBuildingId}
                selections={selections}
                onChangeSelections={setSelections}
                role={user.role}
                onZonesChanged={loadBuildings}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <IncidentForm
                selections={selections}
                onClearSelections={() => setSelections([])}
                onSaved={(incident) => { setToast(`Incident ${incident.ref_code} saved.`); loadIncidents(); }}
              />
            </Grid>
          </Grid>
        )}

        {!canCreate && buildings.length > 0 && (
          <Tabs
            value={currentBuildingId || false}
            onChange={(_, id) => setCurrentBuildingId(id)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {buildings.map((b) => <Tab key={b.id} value={b.id} label={b.name} />)}
          </Tabs>
        )}
        <BuildingMapCard building={currentBuilding} />

        <IncidentRegister incidents={incidents} role={user.role} onChanged={loadIncidents} />
      </Container>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
