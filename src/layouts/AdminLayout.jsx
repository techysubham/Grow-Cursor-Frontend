import { useMemo, useState, useEffect, startTransition } from 'react';
import { Link, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
  Button,
  Menu,
  MenuItem,
  Tooltip
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
import EditIcon from '@mui/icons-material/Edit';

import TaskListPage from '../pages/admin/TaskListPage.jsx';
import StockLedgerPage from '../pages/admin/StockLedgerPage.jsx';
import StoreWiseTaskListPage from '../pages/admin/StoreWiseTaskListPage.jsx';
import StoreTaskDetailPage from '../pages/admin/StoreTaskDetailPage.jsx';
import StoreDailyTasksPage from '../pages/admin/StoreDailyTasksPage.jsx';
import ListerInfoPage from '../pages/admin/ListerInfoPage.jsx';
import ListerInfoDetailPage from '../pages/admin/ListerInfoDetailPage.jsx';
import AdminTaskList from '../pages/compatibility/AdminTaskList.jsx';
import EditorDashboard from '../pages/compatibility/EditorDashboard.jsx';
import ProgressTrackingPage from '../pages/compatibility/ProgressTrackingPage.jsx';

import FulfillmentDashboard from '../pages/admin/FulfillmentDashboard.jsx';
import AllOrdersSheetPage from '../pages/admin/AllOrdersSheetPage.jsx';
import AwaitingShipmentPage from '../pages/admin/AwaitingShipmentPage.jsx';
import AwaitingSheetPage from '../pages/admin/AwaitingSheetPage.jsx';
import AmazonArrivalsPage from '../pages/admin/AmazonArrivalsPage.jsx';
import FulfillmentNotesPage from '../pages/admin/FulfillmentNotesPage.jsx';
import ConversationTrackingPage from '../pages/admin/ConversationTrackingPage.jsx';
// CancelledStatusPage is now embedded in Issues and Resolutions (DisputesPage)
import DisputesPage from '../pages/admin/DisputesPage.jsx';
import AccountHealthReportPage from '../pages/admin/AccountHealthReportPage.jsx';
import PayoneerSheetPage from '../pages/admin/PayoneerSheetPage.jsx';
import BankAccountsPage from '../pages/admin/BankAccountsPage.jsx';
import TransactionPage from '../pages/admin/TransactionPage.jsx';
import ExtraExpensePage from '../pages/admin/ExtraExpensePage.jsx';
//import MessageReceivedPage from '../pages/admin/MessageReceivedPage.jsx';
import AboutMePage from '../pages/AboutMePage.jsx';
import EmployeeDetailsPage from '../pages/admin/EmployeeDetailsPage.jsx';
import EmployeeManagementPage from '../pages/admin/EmployeeManagementPage.jsx';
import BuyerChatPage from '../pages/admin/BuyerChatPage.jsx';
import RangeAnalyzerPage from '../pages/admin/RangeAnalyzerPage.jsx';
import FeedUploadPage from '../pages/ebay/FeedUploadPage.jsx';
import SellingPrivilegesPage from '../pages/admin/SellingPrivilegesPage.jsx';
import EbayApiUsagePage from '../pages/admin/EbayApiUsagePage.jsx';

import DashboardIcon from '@mui/icons-material/Dashboard';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import CompatibilityDashboard from '../pages/compatibility/CompatibilityDashboard.jsx';
import EditListingsDashboard from '../pages/listings/EditListingsDashboard.jsx';

import ConversationManagementPage from '../pages/admin/ConversationManagementPage.jsx';
import ManageAmazonAccountsPage from '../pages/admin/ManageAmazonAccountsPage.jsx';
import InternalMessagesPage from '../pages/admin/InternalMessagesPage.jsx';
import InternalMessagesAdminPage from '../pages/admin/InternalMessagesAdminPage.jsx';
import ManageCreditCardsPage from '../pages/admin/ManageCreditCardsPage.jsx';
import ManageCreditCardNamesPage from '../pages/admin/ManageCreditCardNamesPage.jsx';
import IdeasPage from '../pages/IdeasPage.jsx';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OrderAnalyticsPage from '../pages/admin/OrderAnalyticsPage.jsx';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SellerAnalyticsPage from '../pages/admin/SellerAnalyticsPage.jsx';
import OrdersDepartmentDashboardPage from '../pages/admin/OrdersDepartmentDashboardPage.jsx';
// WorksheetPage is now embedded in Issues and Resolutions (DisputesPage)
import BarChartIcon from '@mui/icons-material/BarChart';
import ChatIcon from '@mui/icons-material/Chat';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AmazonLookupPage from '../pages/admin/AmazonLookupPage.jsx';
import SearchIcon from '@mui/icons-material/Search';
import ManageProductUmbrellasPage from '../pages/admin/ManageProductUmbrellasPage.jsx';
import UmbrellaIcon from '@mui/icons-material/Umbrella';
import ASINStoragePage from '../pages/admin/ASINStoragePage.jsx';
import StorageIcon from '@mui/icons-material/Storage';
import ColumnCreatorPage from '../pages/admin/ColumnCreatorPage.jsx';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ManageTemplatesPage from '../pages/admin/ManageTemplatesPage.jsx';
import TemplateListingsPage from '../pages/admin/TemplateListingsPage.jsx';
import TemplateListingAnalyticsPage from '../pages/admin/TemplateListingAnalyticsPage.jsx';
import SelectSellerPage from '../pages/admin/SelectSellerPage.jsx';
import SellerTemplatesPage from '../pages/admin/SellerTemplatesPage.jsx';
import TemplateDatabasePage from '../pages/admin/TemplateDatabasePage.jsx';
import DescriptionIcon from '@mui/icons-material/Description';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LeaveManagementPage from '../pages/LeaveManagementPage.jsx';
import LeaveAdminPage from '../pages/admin/LeaveAdminPage.jsx';
import AttendanceAdminPage from '../pages/admin/AttendanceAdminPage.jsx';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AsinDirectoryPage from '../pages/admin/AsinDirectoryPage.jsx';

const drawerWidth = 230;

// Helper component for sidebar icons with tooltips when collapsed
const NavIcon = ({ icon: Icon, label, sidebarOpen }) => (
  sidebarOpen ? (
    <Icon />
  ) : (
    <Tooltip
      title={label}
      placement="right"
      arrow
      enterDelay={200}
      leaveDelay={200}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon />
      </span>
    </Tooltip>
  )
);

export default function AdminLayout({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [listingMenuOpen, setListingMenuOpen] = useState(false);
  const [monitoringMenuOpen, setMonitoringMenuOpen] = useState(false);
  const [compatMenuOpen, setCompatMenuOpen] = useState(false);
  const [ordersMenuOpen, setOrdersMenuOpen] = useState(false);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);

  // Flyout menu anchor states for collapsed sidebar
  const [listingAnchorEl, setListingAnchorEl] = useState(null);
  const [monitoringAnchorEl, setMonitoringAnchorEl] = useState(null);
  const [compatAnchorEl, setCompatAnchorEl] = useState(null);
  const [ordersAnchorEl, setOrdersAnchorEl] = useState(null);
  const [manageAnchorEl, setManageAnchorEl] = useState(null);
  const [financeAnchorEl, setFinanceAnchorEl] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Close all dropdowns when sidebar collapses
  useEffect(() => {
    if (!sidebarOpen) {
      startTransition(() => {
        setListingMenuOpen(false);
        setMonitoringMenuOpen(false);
        setCompatMenuOpen(false);
        setOrdersMenuOpen(false);
        setManageMenuOpen(false);
        setFinanceMenuOpen(false);
      });
    }
  }, [sidebarOpen]);

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

  // Lister Roles
  const isLister = user?.role === 'lister';
  const isAdvanceLister = user?.role === 'advancelister';
  const isTrainee = user?.role === 'trainee';
  const isAnyLister = isLister || isAdvanceLister || isTrainee;

  // Custom styling for selected menu items
  const selectedMenuItemStyle = {
    '&.Mui-selected': {
      backgroundColor: 'rgba(25, 118, 210, 0.25)',
      '&:hover': {
        backgroundColor: 'rgba(25, 118, 210, 0.35)',
      }
    }
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {/* Back to Lister Dashboard - visible only to listers */}
        {isAnyLister && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/lister"
              onClick={() => setMobileOpen(false)}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon>
                <NavIcon icon={HomeIcon} label="Back to My Dashboard" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="My Dashboard" />}
            </ListItemButton>
          </ListItem>
        )}

        {/* Divider after lister dashboard link */}
        {isAnyLister && <Divider sx={{ my: 1 }} />}

        {/* Ideas & Issues - visible to ALL users */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/ideas"
            onClick={() => setMobileOpen(false)}
            selected={location.pathname === '/admin/ideas'}
            sx={selectedMenuItemStyle}
          >
            <ListItemIcon>
              <NavIcon icon={LightbulbIcon} label="Ideas & Issues Board" sidebarOpen={sidebarOpen} />
            </ListItemIcon>
            {sidebarOpen && <ListItemText primary="Ideas & Issues" />}
          </ListItemButton>
        </ListItem>

        {/* About Me - visible to all users except superadmin */}
        {!isSuper && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/about-me"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/about-me'}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon>
                <NavIcon icon={SupervisorAccountIcon} label="View Your Profile" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="About Me" />}
            </ListItemButton>
          </ListItem>
        )}

        {/* Internal Messages - visible to ALL users */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/internal-messages"
            onClick={() => setMobileOpen(false)}
            selected={location.pathname === '/admin/internal-messages'}
            sx={selectedMenuItemStyle}
          >
            <ListItemIcon>
              <NavIcon icon={ChatIcon} label="Team Chat & Messaging" sidebarOpen={sidebarOpen} />
            </ListItemIcon>
            {sidebarOpen && <ListItemText primary="Team Chat" />}
          </ListItemButton>
        </ListItem>

        {/* Finance Dropdown - visible to superadmin only */}
        {isSuper && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => sidebarOpen && setFinanceMenuOpen((open) => !open)}
                onMouseEnter={(e) => !sidebarOpen && setFinanceAnchorEl(e.currentTarget)}
                onMouseLeave={() => !sidebarOpen && setFinanceAnchorEl(null)}
                sx={{ justifyContent: 'space-between' }}
              >
                <ListItemIcon>
                  <NavIcon icon={AttachMoneyIcon} label="Finance" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Finance" />}
                {sidebarOpen && (financeMenuOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>

            {/* Expanded sidebar: Collapse component */}
            {sidebarOpen && (
              <Collapse in={financeMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    component={Link}
                    to="/admin/payoneer"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/payoneer'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Payoneer Sheet" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/bank-accounts"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/bank-accounts'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Bank Accounts" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/transactions"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/transactions'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Transactions" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/extra-expenses"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/extra-expenses'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Extra Expenses" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/credit-card-names"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/credit-card-names'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Credit Card Names" />
                  </ListItemButton>
                </List>
              </Collapse>
            )}

            {/* Collapsed sidebar: Flyout menu */}
            <Menu
              anchorEl={financeAnchorEl}
              open={Boolean(financeAnchorEl) && !sidebarOpen}
              onClose={() => setFinanceAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => financeAnchorEl && setFinanceAnchorEl(financeAnchorEl),
                onMouseLeave: () => setFinanceAnchorEl(null),
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px' } }}
            >
              <MenuItem component={Link} to="/admin/payoneer" onClick={() => setFinanceAnchorEl(null)}>
                Payoneer Sheet
              </MenuItem>
              <MenuItem component={Link} to="/admin/bank-accounts" onClick={() => setFinanceAnchorEl(null)}>
                Bank Accounts
              </MenuItem>
              <MenuItem component={Link} to="/admin/transactions" onClick={() => setFinanceAnchorEl(null)}>
                Transactions
              </MenuItem>
              <MenuItem component={Link} to="/admin/extra-expenses" onClick={() => setFinanceAnchorEl(null)}>
                Extra Expenses
              </MenuItem>
              <MenuItem component={Link} to="/admin/credit-card-names" onClick={() => setFinanceAnchorEl(null)}>
                Credit Card Names
              </MenuItem>
            </Menu>

            {/* View All Messages - standalone */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/internal-messages-admin"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/internal-messages-admin'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={AdminPanelSettingsIcon} label="Admin Panel - View All Messages" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="View All Messages" />}
              </ListItemButton>
            </ListItem>

            {/* Working Hours Tracking - superadmin only */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/attendance"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/attendance'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={AccessTimeIcon} label="Working Hours Tracking" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Working Hours Tracking" />}
              </ListItemButton>
            </ListItem>
          </>
        )}

        {/* Product Research - visible to ProductAdmin or Superadmin */}
        {isProductAdmin || isSuper ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/research"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/research'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={Inventory2Icon} label="Product Research & Analysis" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Product Research" />}
              </ListItemButton>
            </ListItem>

            {/* Amazon Lookup */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/amazon-lookup"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/amazon-lookup'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={SearchIcon} label="Search Amazon Products" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Amazon Lookup" />}
              </ListItemButton>
            </ListItem>

            {/* Listing Templates - Create/Edit Templates (Superadmin only) */}
            {isSuper && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/admin/manage-templates"
                  onClick={() => setMobileOpen(false)}
                  selected={location.pathname === '/admin/manage-templates'}
                  sx={selectedMenuItemStyle}
                >
                  <ListItemIcon>
                    <NavIcon icon={DescriptionIcon} label="Manage Templates" sidebarOpen={sidebarOpen} />
                  </ListItemIcon>
                  {sidebarOpen && <ListItemText primary="Manage Templates" />}
                </ListItemButton>
              </ListItem>
            )}

            {/* Template Listings Database (Superadmin only) */}
            {isSuper && (
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/admin/listings-database"
                  onClick={() => setMobileOpen(false)}
                  selected={location.pathname === '/admin/listings-database'}
                  sx={selectedMenuItemStyle}
                >
                  <ListItemIcon>
                    <NavIcon icon={StorageIcon} label="Listings Database" sidebarOpen={sidebarOpen} />
                  </ListItemIcon>
                  {sidebarOpen && <ListItemText primary="Listings Database" />}
                </ListItemButton>
              </ListItem>
            )}
          </>
        ) : null}

        {/* Template Listings - Seller-based listing workflow (Superadmin + Listers) */}
        {(isSuper || isAnyLister) && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/select-seller"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname.startsWith('/admin/select-seller') || location.pathname.startsWith('/admin/seller-templates') || location.pathname.startsWith('/admin/template-listings')}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon>
                <NavIcon icon={AddCircleIcon} label="Add Template Listings" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Add Template Listings" />}
            </ListItemButton>
          </ListItem>
        )}

        {/* Continue with Product Features (Superadmin only) */}
        {isSuper ? (
          <>

            {/* Product Umbrellas */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/product-umbrellas"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/product-umbrellas'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={UmbrellaIcon} label="Product Categories" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Product Umbrellas" />}
              </ListItemButton>
            </ListItem>

            {/* ASIN Storage */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/asin-storage"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/asin-storage'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={StorageIcon} label="ASIN Database" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="ASIN Storage" />}
              </ListItemButton>
            </ListItem>

            {/* ASIN Directory */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/asin-directory"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/asin-directory'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={ListAltIcon} label="ASIN Directory" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="ASIN Directory" />}
              </ListItemButton>
            </ListItem>

            {/* Column Creator */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/column-creator"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/column-creator'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={ViewColumnIcon} label="Create Custom Columns" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Column Creator" />}
              </ListItemButton>
            </ListItem>
          </>
        ) : null}

        {/* Listing Dropdown with Monitoring Subdropdown */}
        {(isListingAdmin || isSuper) && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/feed-upload"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/feed-upload'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={CloudUploadIcon} label="Feed Upload" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Feed Upload (CSV)" />}
              </ListItemButton>
            </ListItem>

            {/* Selling Privileges */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/selling-privileges"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/selling-privileges'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={InsightsIcon} label="Selling Privileges" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Selling Privileges" />}
              </ListItemButton>
            </ListItem>

            {/* eBay API Usage */}
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/ebay-api-usage"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/ebay-api-usage'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={BarChartIcon} label="eBay API Usage" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="eBay API Usage" />}
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => sidebarOpen && setListingMenuOpen((open) => !open)}
                onMouseEnter={(e) => !sidebarOpen && setListingAnchorEl(e.currentTarget)}
                onMouseLeave={() => !sidebarOpen && setListingAnchorEl(null)}
                sx={{ justifyContent: 'space-between' }}
              >
                <ListItemIcon>
                  <NavIcon icon={ListAltIcon} label="Listing Management" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Listing" />}
                {sidebarOpen && (listingMenuOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>

            {/* Expanded sidebar: Collapse component */}
            {sidebarOpen && (
              <Collapse in={listingMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    component={Link}
                    to="/admin/listing"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/listing'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Product Table" />
                  </ListItemButton>
                  {/* Monitoring Subdropdown */}
                  <ListItemButton onClick={() => setMonitoringMenuOpen((open) => !open)} sx={{ justifyContent: 'space-between' }}>
                    <ListItemText primary="Monitoring" />
                    {monitoringMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={monitoringMenuOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ pl: 4 }}>
                      <ListItemButton
                        component={Link}
                        to="/admin/task-list"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/task-list'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Task List" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/assignments"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/assignments'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Assignments" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/listings-summary"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/listings-summary'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Listings Summary" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/listings-summary"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/listings-summary'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Listings Summary" />
                      </ListItemButton>

                      <ListItemButton
                        component={Link}
                        to="/admin/listing-sheet"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/listing-sheet'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Listing Sheet" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/store-wise-tasks"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/store-wise-tasks'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Store-Wise Tasks" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/store-daily-tasks"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/store-daily-tasks'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Store Daily Tasks" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/lister-info"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/lister-info'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Lister Info" />
                      </ListItemButton>
                      <ListItemButton
                        component={Link}
                        to="/admin/range-analyzer"
                        onClick={() => setMobileOpen(false)}
                        selected={location.pathname === '/admin/range-analyzer'}
                        sx={selectedMenuItemStyle}
                      >
                        <ListItemText primary="Range Analyzer" />
                      </ListItemButton>
                    </List>
                  </Collapse>

                </List>
              </Collapse>
            )}

            {/* Collapsed sidebar: Flyout menu */}
            <Menu
              anchorEl={listingAnchorEl}
              open={Boolean(listingAnchorEl) && !sidebarOpen}
              onClose={() => {
                setListingAnchorEl(null);
                setMonitoringAnchorEl(null);
              }}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => listingAnchorEl && setListingAnchorEl(listingAnchorEl),
                onMouseLeave: () => {
                  // Only close Listing menu if Monitoring is also not open
                  if (!monitoringAnchorEl) {
                    setListingAnchorEl(null);
                  }
                },
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px' } }}
            >
              <MenuItem component={Link} to="/admin/listing" onClick={() => { setListingAnchorEl(null); setMonitoringAnchorEl(null); }}>
                Product Table
              </MenuItem>
              <MenuItem component={Link} to="/admin/feed-upload" onClick={() => { setListingAnchorEl(null); setMonitoringAnchorEl(null); }}>
                Feed Upload (CSV)
              </MenuItem>
              <MenuItem
                onMouseEnter={(e) => setMonitoringAnchorEl(e.currentTarget)}
                onMouseLeave={() => setMonitoringAnchorEl(null)}
                sx={{ display: 'flex', justifyContent: 'space-between' }}
              >
                Monitoring <ExpandMore sx={{ transform: 'rotate(-90deg)', ml: 1 }} />
              </MenuItem>
            </Menu>

            {/* Nested Monitoring flyout menu */}
            <Menu
              anchorEl={monitoringAnchorEl}
              open={Boolean(monitoringAnchorEl) && !sidebarOpen}
              onClose={() => setMonitoringAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => monitoringAnchorEl && setMonitoringAnchorEl(monitoringAnchorEl),
                onMouseLeave: () => setMonitoringAnchorEl(null),
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px', maxHeight: '80vh' } }}
            >
              <MenuItem component={Link} to="/admin/task-list" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Task List
              </MenuItem>
              <MenuItem component={Link} to="/admin/assignments" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Assignments
              </MenuItem>
              <MenuItem component={Link} to="/admin/listings-summary" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Listings Summary
              </MenuItem>
              <MenuItem component={Link} to="/admin/listings-summary" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Listings Summary
              </MenuItem>
              <MenuItem component={Link} to="/admin/listing-sheet" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Listing Sheet
              </MenuItem>
              <MenuItem component={Link} to="/admin/store-wise-tasks" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Store-Wise Tasks
              </MenuItem>
              <MenuItem component={Link} to="/admin/store-daily-tasks" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Store Daily Tasks
              </MenuItem>
              <MenuItem component={Link} to="/admin/lister-info" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Lister Info
              </MenuItem>
              <MenuItem component={Link} to="/admin/range-analyzer" onClick={() => { setMonitoringAnchorEl(null); setListingAnchorEl(null); }}>
                Range Analyzer
              </MenuItem>
            </Menu>
          </>
        )}

        {/* Compatibility Dropdown */}
        {isSuper && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => sidebarOpen && setCompatMenuOpen((open) => !open)}
                onMouseEnter={(e) => !sidebarOpen && setCompatAnchorEl(e.currentTarget)}
                onMouseLeave={() => !sidebarOpen && setCompatAnchorEl(null)}
                sx={{ justifyContent: 'space-between' }}
              >
                <ListItemIcon>
                  <NavIcon icon={TaskIcon} label="Compatibility Management" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Compatibility" />}
                {sidebarOpen && (compatMenuOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>

            {/* Expanded sidebar: Collapse component */}
            {sidebarOpen && (
              <Collapse in={compatMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    component={Link}
                    to="/admin/compatibility-tasks"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/compatibility-tasks'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Compatibility Tasks" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/compatibility-progress"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/compatibility-progress'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Progress Tracking" />
                  </ListItemButton>
                </List>
              </Collapse>
            )}

            {/* Collapsed sidebar: Flyout menu */}
            <Menu
              anchorEl={compatAnchorEl}
              open={Boolean(compatAnchorEl) && !sidebarOpen}
              onClose={() => setCompatAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => compatAnchorEl && setCompatAnchorEl(compatAnchorEl),
                onMouseLeave: () => setCompatAnchorEl(null),
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px' } }}
            >
              <MenuItem component={Link} to="/admin/compatibility-tasks" onClick={() => setCompatAnchorEl(null)}>
                Compatibility Tasks
              </MenuItem>
              <MenuItem component={Link} to="/admin/compatibility-progress" onClick={() => setCompatAnchorEl(null)}>
                Progress Tracking
              </MenuItem>
            </Menu>
          </>
        )}

        {(isSuper || isCompatibilityAdmin || isCompatibilityEditor) && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/compatibility-dashboard"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/compatibility-dashboard'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={DashboardIcon} label="Compatibility Dashboard" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Compat. Dashboard" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/edit-listings"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/edit-listings'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={EditIcon} label="Edit Listings" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Edit Listings" />}
              </ListItemButton>
            </ListItem>
          </>
        )}

        {/* Orders Dept Dropdown - UPDATED FOR HOC & COMPLIANCE MANAGER */}
        {(isSuper || isFulfillmentAdmin || isHOC || isComplianceManager) && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => sidebarOpen && setOrdersMenuOpen((open) => !open)}
                onMouseEnter={(e) => !sidebarOpen && setOrdersAnchorEl(e.currentTarget)}
                onMouseLeave={() => !sidebarOpen && setOrdersAnchorEl(null)}
                sx={{ justifyContent: 'space-between' }}
              >
                <ListItemIcon>
                  <NavIcon icon={LocalShippingIcon} label="Orders & Fulfillment" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="Orders Dept" />}
                {sidebarOpen && (ordersMenuOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>

            {/* Expanded sidebar: Collapse component */}
            {sidebarOpen && (
              <Collapse in={ordersMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    component={Link}
                    to="/admin/orders-dashboard"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/orders-dashboard'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Orders Dashboard" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/order-analytics"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/order-analytics'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Order Analytics" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/seller-analytics"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/seller-analytics'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Seller Analytics" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/fulfillment"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/fulfillment'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="All Orders" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/all-orders-sheet"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/all-orders-sheet'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="All Orders Sheet (USD)" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/awaiting-shipment"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/awaiting-shipment'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Awaiting Shipment" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/awaiting-sheet"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/awaiting-sheet'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Awaiting Sheet" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/amazon-arrivals"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/amazon-arrivals'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Amazon Arrivals" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/fulfillment-notes"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/fulfillment-notes'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Fulfillment Notes" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/disputes"
                    onClick={() => setMobileOpen(false)}
                    selected={
                      location.pathname === '/admin/disputes' ||
                      location.pathname === '/admin/worksheet' ||
                      location.pathname === '/admin/cancelled-status' ||
                      location.pathname === '/admin/return-requested'
                    }
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Issues and Resolutions" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/account-health"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/account-health'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Account Health Report" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/message-received"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/message-received'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Buyer Messages" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/conversation-management"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/conversation-management'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Conversation Mgmt" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/amazon-accounts"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/amazon-accounts'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Manage Amazon Accts" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/credit-cards"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/credit-cards'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Manage Credit Cards" />
                  </ListItemButton>
                </List>
              </Collapse>
            )}

            {/* Collapsed sidebar: Flyout menu */}
            <Menu
              anchorEl={ordersAnchorEl}
              open={Boolean(ordersAnchorEl) && !sidebarOpen}
              onClose={() => setOrdersAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => ordersAnchorEl && setOrdersAnchorEl(ordersAnchorEl),
                onMouseLeave: () => setOrdersAnchorEl(null),
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px', maxHeight: '80vh' } }}
            >
              <MenuItem component={Link} to="/admin/orders-dashboard" onClick={() => setOrdersAnchorEl(null)}>
                Orders Dashboard
              </MenuItem>
              <MenuItem component={Link} to="/admin/order-analytics" onClick={() => setOrdersAnchorEl(null)}>
                Order Analytics
              </MenuItem>
              <MenuItem component={Link} to="/admin/seller-analytics" onClick={() => setOrdersAnchorEl(null)}>
                Seller Analytics
              </MenuItem>
              <MenuItem component={Link} to="/admin/fulfillment" onClick={() => setOrdersAnchorEl(null)}>
                All Orders
              </MenuItem>
              <MenuItem component={Link} to="/admin/all-orders-sheet" onClick={() => setOrdersAnchorEl(null)}>
                All Orders Sheet (USD)
              </MenuItem>
              <MenuItem component={Link} to="/admin/awaiting-shipment" onClick={() => setOrdersAnchorEl(null)}>
                Awaiting Shipment
              </MenuItem>
              <MenuItem component={Link} to="/admin/awaiting-sheet" onClick={() => setOrdersAnchorEl(null)}>
                Awaiting Sheet
              </MenuItem>
              <MenuItem component={Link} to="/admin/fulfillment-notes" onClick={() => setOrdersAnchorEl(null)}>
                Fulfillment Notes
              </MenuItem>
              <MenuItem component={Link} to="/admin/disputes" onClick={() => setOrdersAnchorEl(null)}>
                Issues and Resolutions
              </MenuItem>
              <MenuItem component={Link} to="/admin/account-health" onClick={() => setOrdersAnchorEl(null)}>
                Account Health Report
              </MenuItem>
              <MenuItem component={Link} to="/admin/message-received" onClick={() => setOrdersAnchorEl(null)}>
                Buyer Messages
              </MenuItem>
              <MenuItem component={Link} to="/admin/conversation-management" onClick={() => setOrdersAnchorEl(null)}>
                Conversation Mgmt
              </MenuItem>
              <MenuItem component={Link} to="/admin/amazon-accounts" onClick={() => setOrdersAnchorEl(null)}>
                Manage Amazon Accts
              </MenuItem>
              <MenuItem component={Link} to="/admin/credit-cards" onClick={() => setOrdersAnchorEl(null)}>
                Manage Credit Cards
              </MenuItem>
            </Menu>
          </>
        )}

        {/* Manage Components Dropdown */}
        {isSuper && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => sidebarOpen && setManageMenuOpen((open) => !open)}
                onMouseEnter={(e) => !sidebarOpen && setManageAnchorEl(e.currentTarget)}
                onMouseLeave={() => !sidebarOpen && setManageAnchorEl(null)}
                sx={{ justifyContent: 'space-between' }}
              >
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                {sidebarOpen && <ListItemText primary="Manage Components" />}
                {sidebarOpen && (manageMenuOpen ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
            </ListItem>

            {/* Expanded sidebar: Collapse component */}
            {sidebarOpen && (
              <Collapse in={manageMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 4 }}>
                  <ListItemButton
                    component={Link}
                    to="/admin/categories"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/categories'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Manage Categories" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/platforms"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/platforms'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Manage Platforms" />
                  </ListItemButton>
                  <ListItemButton
                    component={Link}
                    to="/admin/stores"
                    onClick={() => setMobileOpen(false)}
                    selected={location.pathname === '/admin/stores'}
                    sx={selectedMenuItemStyle}
                  >
                    <ListItemText primary="Manage Stores" />
                  </ListItemButton>
                </List>
              </Collapse>
            )}

            {/* Collapsed sidebar: Flyout menu */}
            <Menu
              anchorEl={manageAnchorEl}
              open={Boolean(manageAnchorEl) && !sidebarOpen}
              onClose={() => setManageAnchorEl(null)}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              MenuListProps={{
                onMouseEnter: () => manageAnchorEl && setManageAnchorEl(manageAnchorEl),
                onMouseLeave: () => setManageAnchorEl(null),
              }}
              sx={{ pointerEvents: 'none', '& .MuiPaper-root': { pointerEvents: 'auto', minWidth: '220px' } }}
            >
              <MenuItem component={Link} to="/admin/categories" onClick={() => setManageAnchorEl(null)}>
                Manage Categories
              </MenuItem>
              <MenuItem component={Link} to="/admin/platforms" onClick={() => setManageAnchorEl(null)}>
                Manage Platforms
              </MenuItem>
              <MenuItem component={Link} to="/admin/stores" onClick={() => setManageAnchorEl(null)}>
                Manage Stores
              </MenuItem>
            </Menu>
          </>
        )}

        {isProductAdmin ? (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/categories"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/categories'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon><CategoryIcon /></ListItemIcon>
                {sidebarOpen && <ListItemText primary="Manage Categories" />}
              </ListItemButton>
            </ListItem>
          </>
        ) : null}

        {isSuper || isListingAdmin || isHRAdmin || isOperationHead ? (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/add-user"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/add-user'}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon><AddCircleIcon /></ListItemIcon>
              {sidebarOpen && <ListItemText primary="Add User" />}
            </ListItemButton>
          </ListItem>
        ) : null}

        {(isCompatibilityAdmin) && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/add-compatibility-editor"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/add-compatibility-editor'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon><AddCircleIcon /></ListItemIcon>
                {sidebarOpen && <ListItemText primary="Add Compatibility Editor" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/compatibility-tasks"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/compatibility-tasks'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon><TaskIcon /></ListItemIcon>
                {sidebarOpen && <ListItemText primary="Available Tasks" />}
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/compatibility-progress"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/compatibility-progress'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon><InsightsIcon /></ListItemIcon>
                {sidebarOpen && <ListItemText primary="Progress Tracking" />}
              </ListItemButton>
            </ListItem>
          </>
        )}

        {(isCompatibilityEditor) && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/compatibility-editor"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/compatibility-editor'}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon><TaskIcon /></ListItemIcon>
              {sidebarOpen && <ListItemText primary="My Assignments" />}
            </ListItemButton>
          </ListItem>
        )}


        {/* Employee Management - visible to superadmin and hradmin only */}
        {(isSuper || isHRAdmin) && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/employee-management"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/employee-management'}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon>
                <NavIcon icon={AdminPanelSettingsIcon} label="Employee Management" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Employee Management" />}
            </ListItemButton>
          </ListItem>
        )}

        {/* Leave Management - visible to ALL users for applying leaves */}
        {(!isSuper) && (<ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/admin/my-leaves"
            onClick={() => setMobileOpen(false)}
            selected={location.pathname === '/admin/my-leaves'}
            sx={selectedMenuItemStyle}
          >
            <ListItemIcon>
              <NavIcon icon={EventAvailableIcon} label="My Leave Requests" sidebarOpen={sidebarOpen} />
            </ListItemIcon>
            {sidebarOpen && <ListItemText primary="My Leaves" />}
          </ListItemButton>
        </ListItem>)}

        {/* Leave Admin - visible to superadmin and hradmin only */}
        {(isSuper || isHRAdmin) && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/leave-admin"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/leave-admin'}
              sx={selectedMenuItemStyle}
            >
              <ListItemIcon>
                <NavIcon icon={AdminPanelSettingsIcon} label="Leave Management (Admin)" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="Leave Admin" />}
            </ListItemButton>
          </ListItem>
        )}

        {/* [Testing]Employee Details - visible to superadmin, hradmin, and operation head */}
        {(isSuper || isHRAdmin || isOperationHead) && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/admin/employee-details"
                onClick={() => setMobileOpen(false)}
                selected={location.pathname === '/admin/employee-details'}
                sx={selectedMenuItemStyle}
              >
                <ListItemIcon>
                  <NavIcon icon={SupervisorAccountIcon} label="[Testing] Employee Details" sidebarOpen={sidebarOpen} />
                </ListItemIcon>
                {sidebarOpen && <ListItemText primary="[Testing] Employee Details" />}
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
            <MenuIcon />
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
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '3px',
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.3)',
                },
              },
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: sidebarOpen ? drawerWidth : 56,
              transition: 'width 0.2s',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '3px',
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.3)',
                },
              },
            }
          }}
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
              <Route path="/amazon-lookup" element={<AmazonLookupPage />} />
              <Route path="/product-umbrellas" element={<ManageProductUmbrellasPage />} />
              <Route path="/asin-storage" element={<ASINStoragePage />} />
              <Route path="/asin-directory" element={<AsinDirectoryPage />} />
              <Route path="/column-creator" element={<ColumnCreatorPage />} />
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
              <Route path="/store-daily-tasks" element={<StoreDailyTasksPage />} />
              <Route path="/lister-info" element={<ListerInfoPage />} />
              <Route path="/lister-info/details" element={<ListerInfoDetailPage />} />
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
              <Route path="/feed-upload" element={<FeedUploadPage />} />
              <Route path="/selling-privileges" element={<SellingPrivilegesPage />} />
              <Route path="/ebay-api-usage" element={<EbayApiUsagePage />} />
            </>
          ) : null}
          {isSuper && (
            <>
              <>
                <Route path="/user-credentials" element={<UserCredentialsPage />} />
                <Route path="/payoneer" element={<PayoneerSheetPage />} />
                <Route path="/bank-accounts" element={<BankAccountsPage />} />
                <Route path="/transactions" element={<TransactionPage />} />
                <Route path="/extra-expenses" element={<ExtraExpensePage />} />
                <Route path="/manage-templates" element={<ManageTemplatesPage />} />
                <Route path="/listings-database" element={<TemplateDatabasePage />} />
              </>
            </>
          )}
          {(isSuper || isAnyLister) && (
            <>
              <Route path="/template-listings" element={<TemplateListingsPage />} />
              <Route path="/template-listing-analytics" element={<TemplateListingAnalyticsPage />} />
              <Route path="/select-seller" element={<SelectSellerPage />} />
              <Route path="/seller-templates" element={<SellerTemplatesPage />} />
            </>
          )}
          {(isSuper || isHRAdmin || isOperationHead) && (
            <Route path="/employee-details" element={<EmployeeDetailsPage />} />
          )}
          {(isSuper || isHRAdmin) && (
            <Route path="/employee-management" element={<EmployeeManagementPage />} />
          )}

          {/* Leave Management - accessible to ALL authenticated users */}
          <Route path="/my-leaves" element={<LeaveManagementPage />} />

          {/* Leave Admin - accessible to superadmin and hradmin only */}
          {(isSuper || isHRAdmin) && (
            <Route path="/leave-admin" element={<LeaveAdminPage />} />
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
            <>
              <Route path="/compatibility-dashboard" element={<CompatibilityDashboard />} />
              <Route path="/edit-listings" element={<EditListingsDashboard />} />
            </>
          )}

          {/* UPDATED ROUTES FOR ORDERS DEPT */}
          {(isFulfillmentAdmin || isSuper || isHOC || isComplianceManager) && (
            <>
              <Route path="/orders-dashboard" element={<OrdersDepartmentDashboardPage />} />
              <Route path="/order-analytics" element={<OrderAnalyticsPage />} />
              <Route path="/worksheet" element={<DisputesPage initialTab={4} />} />
              <Route path="/seller-analytics" element={<SellerAnalyticsPage />} />
              <Route path="/fulfillment" element={<FulfillmentDashboard />} />
              <Route path="/all-orders-sheet" element={<AllOrdersSheetPage />} />
              <Route path="/awaiting-shipment" element={<AwaitingShipmentPage />} />
              <Route path="/awaiting-sheet" element={<AwaitingSheetPage />} />
              <Route path="/amazon-arrivals" element={<AmazonArrivalsPage />} />
              <Route path="/fulfillment-notes" element={<FulfillmentNotesPage />} />
              <Route path="/conversation-tracking" element={<ConversationTrackingPage />} />
              <Route path="/cancelled-status" element={<DisputesPage initialTab={3} />} />
              <Route path="/return-requested" element={<DisputesPage initialTab={2} />} />
              <Route path="/disputes" element={<DisputesPage />} />
              <Route path="/account-health" element={<AccountHealthReportPage />} />
              <Route path="/message-received" element={<BuyerChatPage />} />
              <Route path="/conversation-management" element={<ConversationManagementPage />} />
              <Route path="/amazon-accounts" element={<ManageAmazonAccountsPage />} />
              <Route path="/credit-cards" element={<ManageCreditCardsPage />} />
              <Route path="/credit-card-names" element={<ManageCreditCardNamesPage />} />
            </>
          )}

          {/* Internal Messages - accessible to ALL authenticated users */}
          <Route path="/internal-messages" element={<InternalMessagesPage />} />

          {/* Internal Messages Admin - accessible to superadmin only */}
          {isSuper && (
            <>
              <Route path="/internal-messages-admin" element={<InternalMessagesAdminPage />} />
              <Route path="/attendance" element={<AttendanceAdminPage />} />
            </>
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
