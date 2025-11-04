import { useMemo, useState } from 'react';
import { Link, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import InsightsIcon from '@mui/icons-material/Insights';
import StoreIcon from '@mui/icons-material/Store';
import AppsIcon from '@mui/icons-material/Apps';
import CategoryIcon from '@mui/icons-material/Category';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ProductResearchPage from '../pages/admin/ProductResearchPage.jsx';
import AddListerPage from '../pages/admin/AddListerPage.jsx';
import ListingManagementPage from '../pages/admin/ListingManagementPage.jsx';
import ManagePlatformsPage from '../pages/admin/ManagePlatformsPage.jsx';
import ManageStoresPage from '../pages/admin/ManageStoresPage.jsx';
import AdminAssignmentsPage from '../pages/admin/AdminAssignmentsPage.jsx';
import ManageRangesPage from '../pages/admin/ManageRangesPage.jsx';
import ManageCategoriesPage from '../pages/admin/ManageCategoriesPage.jsx';
import ListingsSummaryPage from '../pages/admin/ListingsSummaryPage.jsx';
import UserCredentialsPage from '../pages/admin/UserCredentialsPage.jsx';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

const drawerWidth = 260;

export default function AdminLayout({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listingMenuOpen, setListingMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isSuper = user?.role === 'superadmin';
  const isProductAdmin = user?.role === 'productadmin';
  const isListingAdmin = user?.role === 'listingadmin';

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {isProductAdmin || isSuper ? (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/research" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><Inventory2Icon /></ListItemIcon>
              <ListItemText primary="Product Research" />
            </ListItemButton>
          </ListItem>
        ) : null}
        {isListingAdmin || isSuper ? (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setListingMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                <ListItemIcon><ListAltIcon /></ListItemIcon>
                <ListItemText primary="Listing" />
                {listingMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={listingMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 4 }}>
                <ListItemButton component={Link} to="/admin/listing" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="View Table" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/assignments" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Assignments" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/listings-summary" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Listings Summary" />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        ) : null}
        {isProductAdmin || isSuper ? (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/ranges" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText primary="Manage Ranges" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/categories" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText primary="Manage Categories" />
              </ListItemButton>
            </ListItem>
          </>
        ) : null}
       
        {isSuper || isListingAdmin ? (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/add-user" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><AddCircleIcon /></ListItemIcon>
              <ListItemText primary="Add User" />
            </ListItemButton>
          </ListItem>
        ) : null}
        {isSuper || isListingAdmin ? (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/platforms" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><AppsIcon /></ListItemIcon>
                <ListItemText primary="Platforms" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/stores" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><StoreIcon /></ListItemIcon>
                <ListItemText primary="Stores" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              
            </ListItem>
          </>
        ) : null}
       
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <IconButton color="inherit" edge="start" onClick={() => setSidebarOpen((open) => !open)} sx={{ mr: 2, display: { xs: 'none', sm: 'inline-flex' } }}>
            {sidebarOpen ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Admin Dashboard</Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>{user?.username} ({user?.role})</Typography>
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: sidebarOpen ? drawerWidth : 56 }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarOpen ? drawerWidth : 56, transition: 'width 0.2s' } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${sidebarOpen ? drawerWidth : 56}px)` }, transition: 'width 0.2s' }}>
        <Toolbar />
        <Routes>
          {isProductAdmin || isSuper ? (
            <>
              <Route path="/research" element={<ProductResearchPage />} />
              <Route path="/ranges" element={<ManageRangesPage />} />
              <Route path="/categories" element={<ManageCategoriesPage />} />
            </>
          ) : null}
          {isListingAdmin || isSuper ? (
            <>
              <Route path="/listing" element={<ListingManagementPage />} />
              <Route path="/assignments" element={<AdminAssignmentsPage />} />
            </>
          ) : null}
          {isSuper || isListingAdmin ? (
            <Route path="/add-user" element={<AddListerPage />} />
          ) : null}
          {isSuper || isListingAdmin ? (
            <>
              <Route path="/platforms" element={<ManagePlatformsPage />} />
              <Route path="/stores" element={<ManageStoresPage />} />
              <Route path="/listings-summary" element={<ListingsSummaryPage />} />
            </>
          ) : null}
          {isSuper && (
            <Route path="/user-credentials" element={<UserCredentialsPage />} />
          )}
          <Route path="*" element={<Navigate to={isProductAdmin ? "/admin/research" : isListingAdmin ? "/admin/listing" : "/admin/research"} replace />} />
        </Routes>
      </Box>
    </Box>
  );
}