import { createTheme } from '@mui/material/styles';

// Same palette as the original Claude Artifact prototype, so the tool looks the same to
// staff who used that version — warm paper background, burnt-orange accent.
export const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#f5f1e6', paper: '#fffdf8' },
    primary: { main: '#ad4a15', contrastText: '#fff8f1' },
    success: { main: '#2c6b4a' },
    warning: { main: '#93630a' },
    error: { main: '#a13324' },
    text: { primary: '#231e15', secondary: '#6b6151' },
  },
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif",
    h1: { fontFamily: "'Fraunces', Georgia, serif" },
    h2: { fontFamily: "'Fraunces', Georgia, serif" },
    h3: { fontFamily: "'Fraunces', Georgia, serif" },
  },
  shape: { borderRadius: 10 },
});

export const monoFont = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";
