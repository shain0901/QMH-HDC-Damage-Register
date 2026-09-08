import { Box } from '@mui/material';

export default function ZoneDot({ color }) {
  if (!color) return null;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 9,
        height: 9,
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,.28)',
        background: color,
        verticalAlign: 'middle',
        mr: 0.5,
      }}
    />
  );
}
