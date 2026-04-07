import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme, alpha } from '@mui/material/styles';
import LoginPage from './pages/LoginPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProductResearchPage from './pages/admin/ProductResearchPage.jsx';
import AddListerPage from './pages/admin/AddListerPage.jsx';
import ListingAnalyticsPage from './pages/admin/ListingAnalyticsPage.jsx';
import ListerDashboard from './pages/lister/ListerDashboard.jsx';
import RangeAnalyzerPage from './pages/admin/RangeAnalyzerPage.jsx';
import SellerEbayPage from './pages/SellerProfilePage.jsx';
import AboutMePage from './pages/AboutMePage.jsx';
import MessageReceivedPage from './pages/admin/MessageReceivedPage.jsx';
import PayoneerSheetPage from './pages/admin/PayoneerSheetPage.jsx';
import BankAccountsPage from './pages/admin/BankAccountsPage.jsx';
import TransactionPage from './pages/admin/TransactionPage.jsx';
import SalaryPage from './pages/admin/SalaryPage.jsx';
import IdeasPage from './pages/IdeasPage.jsx';

import { setAuthToken } from './lib/api'
import { AttendanceProvider } from './context/AttendanceContext';
import AttendanceModal from './components/Attendance/AttendanceModal';
import AttendanceTimer from './components/Attendance/AttendanceTimer';
import TimerPausedModal from './components/Attendance/TimerPausedModal';

function useAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem('auth_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user'); // keeping user in localStorage is fine
    return raw ? JSON.parse(raw) : null;
  });
  const navigate = useNavigate();
  const login = (t, u) => {
    setToken(t);
    setUser(u);
    sessionStorage.setItem('auth_token', t);   // per-tab token
    setAuthToken(t);
    localStorage.setItem('user', JSON.stringify(u));

    // Navigation Logic
    if (u.role === 'lister') navigate('/lister');
    else if (u.role === 'advancelister') navigate('/lister');
    else if (u.role === 'trainee') navigate('/lister');
    else if (u.role === 'compatibilityadmin') navigate('/admin/compatibility-tasks');
    else if (u.role === 'compatibilityeditor') navigate('/admin/compatibility-editor');
    else if (u.role === 'seller') navigate('/seller-ebay');
    else if (u.role === 'fulfillmentadmin') navigate('/admin/fulfillment');
    else if (u.role === 'hradmin') navigate('/admin/employee-details');
    else if (u.role === 'hr') navigate('/admin/about-me');
    else if (u.role === 'operationhead') navigate('/admin/employee-details');
    // For HOC and Compliance Manager, we send them to the general admin area
    // AdminLayout will handle the specific redirect to /fulfillment
    else navigate('/admin');
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('auth_token');
    setAuthToken(null);
    localStorage.removeItem('user');
    navigate('/login');
  };
  return { token, user, login, logout };
}

function getButtonPalette(theme, color) {
  if (color && color !== 'inherit' && theme.palette[color]) {
    return theme.palette[color];
  }

  return theme.palette.primary;
}

export default function App() {
  const { token, user, login, logout } = useAuth();
  const theme = useMemo(() => createTheme({
    palette: { mode: 'light' },
    typography: { fontFamily: "'Inter', sans-serif" },
    components: {
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            letterSpacing: 0.2,
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
          }),
          outlined: ({ theme, ownerState }) => {
            if (ownerState.color === 'inherit') {
              return {};
            }

            const paletteColor = getButtonPalette(theme, ownerState.color);

            return {
              '&:hover': {
                borderColor: paletteColor.main,
                backgroundColor: alpha(paletteColor.main, 0.06),
              },
            };
          },
          contained: ({ theme }) => ({
            boxShadow: 'none',
            '&:hover': {
              boxShadow: theme.shadows[2],
            },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, 0.4),
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
            },
            '&.Mui-selected:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.18),
            },
          }),
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          grouped: {
            '&:first-of-type': {
              borderRadius: '8px 0 0 8px',
            },
            '&:last-of-type': {
              borderRadius: '0 8px 8px 0',
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
              width: 46,
              height: 28,
            padding: 0,
          },
          switchBase: {
            padding: 0,
            margin: 2,
            transitionDuration: '200ms',
            '&.Mui-checked': {
                transform: 'translateX(18px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: '#34C759',
                opacity: 1,
                border: 0,
              },
            },
          },
          thumb: {
              width: 24,
              height: 24,
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          },
          track: {
              borderRadius: 14,
            backgroundColor: '#c0c0c8',
            opacity: 1,
          },
        },
      },
    },
  }), []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {token && user ? (
        <AttendanceProvider user={user}>
          <AttendanceModal />
          <TimerPausedModal />
          <AttendanceTimer />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={login} />} />

            {/* PUBLIC ROUTE - No authentication required */}
            <Route path="/ideas" element={<IdeasPage />} />

            <Route
              path="/about-me"
              element={<AboutMePage />}
            />

            <Route
              path="/admin/*"
              element={
                user.role === 'productadmin' ||
                  user.role === 'listingadmin' ||
                  user.role === 'superadmin' ||
                  user.role === 'compatibilityadmin' ||
                  user.role === 'compatibilityeditor' ||
                  user.role === 'fulfillmentadmin' ||
                  user.role === 'hradmin' ||
                  user.role === 'hr' ||
                  user.role === 'operationhead' ||
                  user.role === 'hoc' ||
                  user.role === 'compliancemanager' ||
                  // Lister roles - access to template listing workflow only
                  user.role === 'lister' ||
                  user.role === 'advancelister' ||
                  user.role === 'trainee' ? (
                  <AdminLayout user={user} onLogout={logout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/lister"
              element={user.role === 'lister' || user.role === 'advancelister' || user.role === 'trainee' ? <ListerDashboard user={user} onLogout={logout} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/lister/range-analyzer"
              element={user.role === 'lister' || user.role === 'advancelister' || user.role === 'trainee' ? <RangeAnalyzerPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/seller-ebay"
              element={
                user.role === 'seller' || user.role === 'superadmin' ? (
                  <SellerEbayPage user={user} onLogout={logout} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AttendanceProvider>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage onLogin={login} />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}