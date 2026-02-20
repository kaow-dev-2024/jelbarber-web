import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d9b46c',
      light: '#f1d7a0',
      dark: '#b0863a'
    },
    secondary: {
      main: '#b54b3b',
      light: '#d46b5c',
      dark: '#8b3529'
    },
    background: {
      default: '#1b1712',
      paper: '#262018'
    },
    text: {
      primary: '#f7f1e5',
      secondary: '#d9cbb4'
    },
    divider: 'rgba(255, 255, 255, 0.12)'
  },
  typography: {
    fontFamily: 'var(--font-body)',
    h1: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.06em'
    },
    h2: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.06em'
    },
    h3: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.06em'
    },
    h4: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.04em'
    },
    h5: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.04em'
    },
    h6: {
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.04em'
    },
    button: {
      textTransform: 'none',
      letterSpacing: '0.06em'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))'
        }
      }
    }
  }
});

export default theme;
