import { createTheme } from '@mui/material/styles';

// ── Classroom app custom palette ──
// Warm, approachable tones — not the typical cold blue SaaS look
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a6b4a',
      light: '#4e9a76',
      dark: '#004024',
      contrastText: '#fff',
    },
    secondary: {
      main: '#e8733a',
      light: '#ffa466',
      dark: '#af4408',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f2ed',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c1917',
      secondary: '#57534e',
    },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: {
      fontFamily: '"DM Serif Display", serif',
      fontWeight: 400,
    },
    h2: {
      fontFamily: '"DM Serif Display", serif',
      fontWeight: 400,
    },
    h3: {
      fontFamily: '"DM Serif Display", serif',
      fontWeight: 400,
    },
    h4: {
      fontFamily: '"DM Serif Display", serif',
      fontWeight: 400,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '0.938rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
