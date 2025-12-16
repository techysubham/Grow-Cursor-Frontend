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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
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
import ListingSheetPage from '../pages/admin/ListingSheetPage.jsx';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import TaskIcon from '@mui/icons-material/Task';

import TaskListPage from '../pages/admin/TaskListPage.jsx';
import StockLedgerPage from '../pages/admin/StockLedgerPage.jsx';
import StoreWiseTaskListPage from '../pages/admin/StoreWiseTaskListPage.jsx';
import StoreTaskDetailPage from '../pages/admin/StoreTaskDetailPage.jsx';
import AdminTaskList from '../pages/compatibility/AdminTaskList.jsx';
import EditorDashboard from '../pages/compatibility/EditorDashboard.jsx';
import ProgressTrackingPage from '../pages/compatibility/ProgressTrackingPage.jsx';

import FulfillmentDashboard from '../pages/admin/FulfillmentDashboard.jsx';
import AllOrdersSheetPage from '../pages/admin/AllOrdersSheetPage.jsx';
import AwaitingShipmentPage from '../pages/admin/AwaitingShipmentPage.jsx';
import FulfillmentNotesPage from '../pages/admin/FulfillmentNotesPage.jsx';
import ConversationTrackingPage from '../pages/admin/ConversationTrackingPage.jsx';
import CancelledStatusPage from '../pages/admin/CancelledStatusPage.jsx';
import ReturnPage from '../pages/admin/ReturnPage.jsx';
import ReplacePage from '../pages/admin/ReplacePage.jsx';
import INRPage from '../pages/admin/INRPage.jsx';
import ReturnRequestedPage from '../pages/admin/ReturnRequestedPage.jsx';
import DisputesPage from '../pages/admin/DisputesPage.jsx';
//import MessageReceivedPage from '../pages/admin/MessageReceivedPage.jsx';
import AboutMePage from '../pages/AboutMePage.jsx';
import EmployeeDetailsPage from '../pages/admin/EmployeeDetailsPage.jsx';
import BuyerChatPage from '../pages/admin/BuyerChatPage.jsx';
import RangeAnalyzerPage from '../pages/admin/RangeAnalyzerPage.jsx';

import DashboardIcon from '@mui/icons-material/Dashboard'; 
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CompatibilityDashboard from '../pages/compatibility/CompatibilityDashboard.jsx';

import ConversationManagementPage from '../pages/admin/ConversationManagementPage.jsx';
import ManageAmazonAccountsPage from '../pages/admin/ManageAmazonAccountsPage.jsx';
import InternalMessagesPage from '../pages/admin/InternalMessagesPage.jsx';
import InternalMessagesAdminPage from '../pages/admin/InternalMessagesAdminPage.jsx';
import ManageCreditCardsPage from '../pages/admin/ManageCreditCardsPage.jsx';
import IdeasPage from '../pages/IdeasPage.jsx';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OrderAnalyticsPage from '../pages/admin/OrderAnalyticsPage.jsx';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChatIcon from '@mui/icons-material/Chat';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

const drawerWidth = 230;

export default function AdminLayout({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listingMenuOpen, setListingMenuOpen] = useState(false);
  const [monitoringMenuOpen, setMonitoringMenuOpen] = useState(false);
  const [compatMenuOpen, setCompatMenuOpen] = useState(false);
  const [ordersMenuOpen, setOrdersMenuOpen] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const navigate = useNavigate();

  // --- ROLE DEFINITIONS ---
  const isSuper = user?.role === 'superadmin';
  const isProductAdmin = user?.role === 'productadmin';
  const isListingAdmin = user?.role === 'listingadmin';
  const isCompatibilityAdmin = user?.role === 'compatibilityadmin';
  const isCompatibilityEditor = user?.role === 'compatibilityeditor';
  const isFulfillmentAdmin = user?.role === 'fulfillmentadmin';
  const isHRAdmin = user?.role === 'hradmin';
  const isOperationHead = user?.role === 'operationhead';
  const isSeller = user?.role === 'seller';
  
  // New Roles
  const isHOC = user?.role === 'hoc';
  const isComplianceManager = user?.role === 'compliancemanager';

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {/* Ideas & Issues - visible to ALL users */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/admin/ideas" onClick={() => setMobileOpen(false)}>
            <ListItemIcon><LightbulbIcon /></ListItemIcon>
            <ListItemText primary="Ideas & Issues" />
          </ListItemButton>
        </ListItem>

        {/* About Me - visible to all users except superadmin */}
        {!isSuper && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/about-me" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><SupervisorAccountIcon /></ListItemIcon>
              <ListItemText primary="About Me" />
            </ListItemButton>
          </ListItem>
        )}

        {/* Internal Messages - visible to ALL users */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/admin/internal-messages" onClick={() => setMobileOpen(false)}>
            <ListItemIcon><ChatIcon /></ListItemIcon>
            <ListItemText primary="Team Chat" />
          </ListItemButton>
        </ListItem>

        {/* Internal Messages Admin - visible to superadmin only */}
        {isSuper && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/internal-messages-admin" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
              <ListItemText primary="View All Messages" />
            </ListItemButton>
          </ListItem>
        )}

        {/* Product Research - visible to ProductAdmin or Superadmin */}
        {isProductAdmin || isSuper ? (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/research" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><Inventory2Icon /></ListItemIcon>
              <ListItemText primary="Product Research" />
            </ListItemButton>
          </ListItem>
        ) : null}

        {/* Range Analyzer - Direct access for superadmin and listingadmin */}
        {(isSuper || isListingAdmin) && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/range-analyzer" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><AutoAwesomeIcon /></ListItemIcon>
              <ListItemText primary="Range Analyzer" />
            </ListItemButton>
          </ListItem>
        )}

        {/* Listing Dropdown with Monitoring Subdropdown */}
        {(isListingAdmin || isSuper) && (
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
                  <ListItemText primary="Product Table" />
                </ListItemButton>
                {/* Monitoring Subdropdown */}
                <ListItemButton onClick={() => setMonitoringMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                  <ListItemText primary="Monitoring" />
                  {monitoringMenuOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={monitoringMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl: 4 }}>
                    <ListItemButton component={Link} to="/admin/task-list" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Task List" />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/assignments" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Assignments" />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/listings-summary" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Listings Summary" />
                    </ListItemButton>
                   
                    <ListItemButton component={Link} to="/admin/listing-sheet" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Listing Sheet" />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/store-wise-tasks" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Store-Wise Tasks" />
                    </ListItemButton>
                    <ListItemButton component={Link} to="/admin/range-analyzer" onClick={() => setMobileOpen(false)}>
                      <ListItemText primary="Range Analyzer" />
                    </ListItemButton>
                  </List>
                </Collapse>
                
              </List>
            </Collapse>
          </>
        )}

        {/* Compatibility Dropdown */}
        {isSuper && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setCompatMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                <ListItemIcon><TaskIcon /></ListItemIcon>
                <ListItemText primary="Compatibility" />
                {compatMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={compatMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 4 }}>
                <ListItemButton component={Link} to="/admin/compatibility-tasks" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Compatibility Tasks" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/compatibility-progress" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Progress Tracking" />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}

        {(isSuper || isCompatibilityAdmin || isCompatibilityEditor) && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/compatibility-dashboard" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Compat. Dashboard" />
            </ListItemButton>
          </ListItem>
        )}

        {/* Orders Dept Dropdown - UPDATED FOR HOC & COMPLIANCE MANAGER */}
        {(isSuper || isFulfillmentAdmin || isHOC || isComplianceManager) && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setOrdersMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                <ListItemIcon><LocalShippingIcon /></ListItemIcon>
                <ListItemText primary="Orders Dept" />
                {ordersMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={ordersMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 4 }}>
                <ListItemButton component={Link} to="/admin/order-analytics" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Order Analytics" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/fulfillment" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="All Orders" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/all-orders-sheet" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="All Orders Sheet (USD)" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/awaiting-shipment" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Awaiting Shipment" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/fulfillment-notes" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Fulfillment Notes" />
                </ListItemButton>
                
                <ListItemButton component={Link} to="/admin/cancelled-status" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Cancelled Status" />
                </ListItemButton>
                
                <ListItemButton component={Link} to="/admin/return-requested" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Return Requests" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/disputes" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="INR & Disputes" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/message-received" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Buyer Messages" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/conversation-management" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Conversation Mgmt" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/amazon-accounts" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Manage Amazon Accts" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/credit-cards" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Manage Credit Cards" />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}

        {/* Manage Components Dropdown */}
        {isSuper && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setManageMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText primary="Manage Components" />
                {manageMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={manageMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 4 }}>
                <ListItemButton component={Link} to="/admin/categories" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Manage Categories" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/platforms" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Manage Platforms" />
                </ListItemButton>
                <ListItemButton component={Link} to="/admin/stores" onClick={() => setMobileOpen(false)}>
                  <ListItemText primary="Manage Stores" />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}

        {isProductAdmin  ? (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/categories" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                <ListItemText primary="Manage Categories" />
              </ListItemButton>
            </ListItem>
          </>
        ) : null}
       
        {isSuper || isListingAdmin || isHRAdmin || isOperationHead ? (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/add-user" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><AddCircleIcon /></ListItemIcon>
              <ListItemText primary="Add User" />
            </ListItemButton>
          </ListItem>
        ) : null}
        
        {( isCompatibilityAdmin) && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/add-compatibility-editor" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><AddCircleIcon /></ListItemIcon>
                <ListItemText primary="Add Compatibility Editor" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/compatibility-tasks" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><TaskIcon /></ListItemIcon>
                <ListItemText primary="Available Tasks" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/compatibility-progress" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><InsightsIcon /></ListItemIcon>
                <ListItemText primary="Progress Tracking" />
              </ListItemButton>
            </ListItem>
          </>
        )}
        
        {(isCompatibilityEditor) && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/admin/compatibility-editor" onClick={() => setMobileOpen(false)}>
              <ListItemIcon><TaskIcon /></ListItemIcon>
              <ListItemText primary="My Assignments" />
            </ListItemButton>
          </ListItem>
        )}

       

        {(isSuper || isHRAdmin || isOperationHead) && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/employee-details" onClick={() => setMobileOpen(false)}>
                <ListItemIcon><SupervisorAccountIcon /></ListItemIcon>
                <ListItemText primary="Employee Details" />
              </ListItemButton>
            </ListItem>
          </>
        )}
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
          <Button color="inherit" startIcon={<ChatIcon />} onClick={() => navigate('/admin/internal-messages')} sx={{ mr: 1 }}>
            Team Chat
          </Button>
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
          {/* Ideas & Issues - accessible to ALL roles */}
          <Route path="/ideas" element={<IdeasPage />} />
          
          {!isSuper && <Route path="/about-me" element={<AboutMePage />} />}
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
              <Route path="/task-list" element={<TaskListPage />} />
              <Route path="/listing-sheet" element={<ListingSheetPage />} />
              <Route path="/store-wise-tasks" element={<StoreWiseTaskListPage />} />
              <Route path="/store-wise-tasks/details" element={<StoreTaskDetailPage />} />
              <Route path="/range-analyzer" element={<RangeAnalyzerPage />} />
            </>
          ) : null}
          {isSuper || isListingAdmin || isHRAdmin || isOperationHead ? (
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
            <>
              <Route path="/user-credentials" element={<UserCredentialsPage />} />
            </>
          )}
          {(isSuper || isHRAdmin || isOperationHead) && (
            <Route path="/employee-details" element={<EmployeeDetailsPage />} />
          )}
          {isCompatibilityAdmin && (
            <>
              <Route path="/add-compatibility-editor" element={<AddListerPage />} />
              <Route path="/compatibility-tasks" element={<AdminTaskList />} />
              <Route path="/compatibility-progress" element={<ProgressTrackingPage />} />
            </>
          )}
          {(isSuper || isCompatibilityAdmin) && (
            <>
              <Route path="/add-compatibility-editor" element={<AddListerPage />} />
              <Route path="/compatibility-tasks" element={<AdminTaskList />} />
              <Route path="/compatibility-progress" element={<ProgressTrackingPage />} />
            </>
          )}
          {isCompatibilityEditor && (
            <Route path="/compatibility-editor" element={<EditorDashboard />} />
          )}

          {(isSuper || isCompatibilityAdmin || isCompatibilityEditor) && (
            <Route path="/compatibility-dashboard" element={<CompatibilityDashboard />} />
          )}

          {/* UPDATED ROUTES FOR ORDERS DEPT */}
          {(isFulfillmentAdmin || isSuper || isHOC || isComplianceManager) && (
            <>
              <Route path="/order-analytics" element={<OrderAnalyticsPage />} />
              <Route path="/fulfillment" element={<FulfillmentDashboard />} />
              <Route path="/all-orders-sheet" element={<AllOrdersSheetPage />} />
              <Route path="/awaiting-shipment" element={<AwaitingShipmentPage />} />
              <Route path="/fulfillment-notes" element={<FulfillmentNotesPage />} />
              <Route path="/conversation-tracking" element={<ConversationTrackingPage />} />
              <Route path="/cancelled-status" element={<CancelledStatusPage />} />
              <Route path="/return-requested" element={<ReturnRequestedPage />} />
              <Route path="/disputes" element={<DisputesPage />} />
              <Route path="/message-received" element={<BuyerChatPage/>} />
              <Route path="/conversation-management" element={<ConversationManagementPage />} />
              <Route path="/amazon-accounts" element={<ManageAmazonAccountsPage />} />
              <Route path="/credit-cards" element={<ManageCreditCardsPage />} />
            </>
          )}

          {/* Internal Messages - accessible to ALL authenticated users */}
          <Route path="/internal-messages" element={<InternalMessagesPage />} />
          
          {/* Internal Messages Admin - accessible to superadmin only */}
          {isSuper && (
            <Route path="/internal-messages-admin" element={<InternalMessagesAdminPage />} />
          )}
          
          {/* UPDATED DEFAULT REDIRECT */}
          <Route path="*" element={<Navigate to={
            isProductAdmin || isSuper ? "/admin/research" : 
            isListingAdmin ? "/admin/listing" : 
            isCompatibilityAdmin ? "/admin/compatibility-tasks" : 
            isCompatibilityEditor ? "/admin/compatibility-editor" : 
            (isFulfillmentAdmin || isHOC || isComplianceManager) ? "/admin/fulfillment" : 
            isHRAdmin || isOperationHead ? "/admin/employee-details" : 
            "/admin/about-me"
          } replace />} />
        </Routes>
      </Box>
    </Box>
  );
}