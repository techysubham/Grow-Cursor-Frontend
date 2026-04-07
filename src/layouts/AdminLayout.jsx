import { useMemo, useState, useEffect } from 'react';
import { Link, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
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
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
import CompatibilityBatchHistoryPage from '../pages/compatibility/CompatibilityBatchHistoryPage.jsx';
import AutoCompatibilityPage from '../pages/compatibility/AutoCompatibilityPage.jsx';

import FulfillmentDashboard from '../pages/admin/FulfillmentDashboard.jsx';
import AllOrdersSheetPage from '../pages/admin/AllOrdersSheetPage.jsx';
import PriceChangeHistoryPage from '../pages/admin/PriceChangeHistoryPage.jsx';
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
import FeedUploadStatsPage from '../pages/admin/FeedUploadStatsPage.jsx';
import SalaryPage from '../pages/admin/SalaryPage.jsx';
import SellerFundsPage from '../pages/admin/SellerFundsPage.jsx';

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
import AffiliateOrdersPage from '../pages/admin/AffiliateOrdersPage.jsx';
import LinkIcon from '@mui/icons-material/Link';
import IdeasPage from '../pages/IdeasPage.jsx';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OrderAnalyticsPage from '../pages/admin/OrderAnalyticsPage.jsx';
import CRPAnalyticsPage from '../pages/admin/CRPAnalyticsPage.jsx';
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
import ImportExportIcon from '@mui/icons-material/ImportExport';
import LayersIcon from '@mui/icons-material/Layers';
import ColumnCreatorPage from '../pages/admin/ColumnCreatorPage.jsx';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ManageTemplatesPage from '../pages/admin/ManageTemplatesPage.jsx';
import TemplateListingsPage from '../pages/admin/TemplateListingsPage.jsx';
import TemplateListingAnalyticsPage from '../pages/admin/TemplateListingAnalyticsPage.jsx';
import SelectSellerPage from '../pages/admin/SelectSellerPage.jsx';
import SellerTemplatesPage from '../pages/admin/SellerTemplatesPage.jsx';
import ListingDirectoryPage from '../pages/admin/ListingDirectoryPage.jsx';
import TemplateDirectoryPage from '../pages/admin/TemplateDirectoryPage.jsx';
import TemplateDatabasePage from '../pages/admin/TemplateDatabasePage.jsx';
import CsvStoragePage from '../pages/admin/CsvStoragePage.jsx';
import DescriptionIcon from '@mui/icons-material/Description';
import HomeIcon from '@mui/icons-material/Home';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LeaveManagementPage from '../pages/LeaveManagementPage.jsx';
import LeaveAdminPage from '../pages/admin/LeaveAdminPage.jsx';
import AttendanceAdminPage from '../pages/admin/AttendanceAdminPage.jsx';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AsinDirectoryPage from '../pages/admin/AsinDirectoryPage.jsx';
import AsinListPage from '../pages/admin/AsinListPage.jsx';
import UserSellerAssignmentPage from '../pages/admin/UserSellerAssignmentPage.jsx';
import UserPerformancePage from '../pages/admin/UserPerformancePage.jsx';
import AiFitmentUsagePage from '../pages/admin/AiFitmentUsagePage.jsx';
import ListingStatsPage from '../pages/admin/ListingStatsPage.jsx';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SecurityIcon from '@mui/icons-material/Security';

import PageAccessManagementPage from '../pages/admin/PageAccessManagementPage.jsx';
import UserPasswordManagementPage from '../pages/admin/UserPasswordManagementPage.jsx';

import usePageAccess from '../hooks/usePageAccess';
import { PAGE_REGISTRY, PAGE_CATEGORIES, SUBMENUS } from '../constants/pages';

const drawerWidth = 260;

// Shared flyout menu positioning — all flyouts open to the right of their anchor
const flyoutMenuPositionProps = {
  anchorOrigin: { vertical: 'top', horizontal: 'right' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
};

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

// Map category IDs to their icons
const categoryIcons = {
  orderFulfilment: LocalShippingIcon,
  compatibility: TaskIcon,
  listingResearch: ListAltIcon,
  finance: AttachMoneyIcon,
  compliance: AdminPanelSettingsIcon,
  ebayParams: StoreIcon,
  hrManagement: SupervisorAccountIcon,
  others: AppsIcon,
};

// Flyout menu styles (shared across all categories)
const flyoutMenuSx = {
  '& .MuiPaper-root': {
    minWidth: '240px',
    maxHeight: '80vh',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    mt: 0.5
  },
  '& .MuiMenuItem-root': {
    fontSize: '0.875rem',
    py: 1.2,
    px: 2,
    borderRadius: '6px',
    mx: 1,
    my: 0.3,
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'primary.light',
      color: 'primary.contrastText',
      transform: 'translateX(4px)'
    }
  }
};

// Component map for routing
const COMPONENT_MAP = {
  'OrdersDashboard': OrdersDepartmentDashboardPage,
  'OrderAnalytics': OrderAnalyticsPage,
  'CRPAnalytics': CRPAnalyticsPage,
  'Fulfillment': FulfillmentDashboard,
  'AwaitingShipment': AwaitingShipmentPage,
  'AwaitingSheet': AwaitingSheetPage,
  'AmazonArrivals': AmazonArrivalsPage,
  'FulfillmentNotes': FulfillmentNotesPage,
  'CompatibilityDashboard': CompatibilityDashboard,
  'CompatibilityTasks': AdminTaskList,
  'CompatibilityProgress': ProgressTrackingPage,
  'AiFitmentUsage': AiFitmentUsagePage,
  'ListingStats': ListingStatsPage,
  'CompatibilityBatchHistory': CompatibilityBatchHistoryPage,
  'AutoCompatibility': AutoCompatibilityPage,
  'EditListings': EditListingsDashboard,
  'CompatibilityEditor': EditorDashboard,
  'AddCompatibilityEditor': AddListerPage,
  'ManageTemplates': ManageTemplatesPage,
  'ListingsDatabase': TemplateDatabasePage,
  'SelectSeller': SelectSellerPage,
  'ListingDirectory': ListingDirectoryPage,
  'TemplateDirectory': TemplateDirectoryPage,
  'AsinDirectory': AsinDirectoryPage,
  'AsinLists': AsinListPage,
  'FeedUpload': FeedUploadPage,
  'FeedUploadStats': FeedUploadStatsPage,
  'CsvStorage': CsvStoragePage,
  'ProductResearch': ProductResearchPage,
  'Payoneer': PayoneerSheetPage,
  'BankAccounts': BankAccountsPage,
  'Transactions': TransactionPage,
  'ExtraExpenses': ExtraExpensePage,
  'CreditCardNames': ManageCreditCardNamesPage,
  'Salary': SalaryPage,
  'AllOrdersSheet': AllOrdersSheetPage,
  'PriceChangeHistory': PriceChangeHistoryPage,
  'SellerAnalytics': SellerAnalyticsPage,
  'Disputes': DisputesPage,
  'AccountHealth': AccountHealthReportPage,
  'BuyerMessages': BuyerChatPage,
  'ConversationManagement': ConversationManagementPage,
  'AmazonAccounts': ManageAmazonAccountsPage,
  'CreditCards': ManageCreditCardsPage,
  'AffiliateOrders': AffiliateOrdersPage,
  'SellingPrivileges': SellingPrivilegesPage,
  'EbayApiUsage': EbayApiUsagePage,
  'SellerFunds': SellerFundsPage,
  'IdeasAndIssues': IdeasPage,
  'TeamChat': InternalMessagesPage,
  'LeaveAdmin': LeaveAdminPage,
  'EmployeeManagement': EmployeeManagementPage,
  'AddUser': AddListerPage,
  'UserSellerAssignments': UserSellerAssignmentPage,
  'ViewAllMessages': InternalMessagesAdminPage,
  'Attendance': AttendanceAdminPage,
  'PageAccessManagement': PageAccessManagementPage,
  'UserPasswordManagement': UserPasswordManagementPage,
  'ManageCategories': ManageCategoriesPage,
  'ManagePlatforms': ManagePlatformsPage,
  'ManageStores': ManageStoresPage,
  'ProductTable': ListingManagementPage,
  'TaskList': TaskListPage,
  'Assignments': AdminAssignmentsPage,
  'ListingsSummary': ListingsSummaryPage,
  'ListingSheet': ListingSheetPage,
  'StoreWiseTasks': StoreWiseTaskListPage,
  'StoreDailyTasks': StoreDailyTasksPage,
  'ListerInfo': ListerInfoPage,
  'RangeAnalyzer': RangeAnalyzerPage,
  'AmazonLookup': AmazonLookupPage,
  'ProductUmbrellas': ManageProductUmbrellasPage,
  'AsinStorage': ASINStoragePage,
  'ColumnCreator': ColumnCreatorPage,
  'ManageRanges': ManageRangesPage,
  'UserCredentials': UserCredentialsPage,
  'UserPerformance': UserPerformancePage,
  'EmployeeDetails': EmployeeDetailsPage,
};

export default function AdminLayout({ user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Flyout menu anchor states
  const [menuAnchors, setMenuAnchors] = useState({});
  
  // Submenu anchors
  const [submenuAnchors, setSubmenuAnchors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();

  // Use the page access hook
  const { hasAccess, hasCategoryAccess, accessibleCategories, getAccessiblePages, getSubmenuPages, hasSubmenuAccess, isSuper } = usePageAccess(user);

  // --- ROLE DEFINITIONS (kept for special non-page logic like lister dashboard link) ---
  const isAnyLister = ['lister', 'advancelister', 'trainee'].includes(user?.role);

  // Close all flyout menus + mobile drawer
  const closeAllMenus = () => {
    setMenuAnchors({});
    setSubmenuAnchors({});
    setMobileOpen(false);
  };

  const openMenu = (key, event) => {
    setMenuAnchors(prev => ({ ...prev, [key]: event.currentTarget }));
  };

  const closeMenu = (key) => {
    setMenuAnchors(prev => ({ ...prev, [key]: null }));
  };

  const openSubmenu = (key, event) => {
    setSubmenuAnchors(prev => ({ ...prev, [key]: event.currentTarget }));
  };

  const closeSubmenu = (key) => {
    setSubmenuAnchors(prev => ({ ...prev, [key]: null }));
  };

  // Helper function to check if current route belongs to a category
  const isCategoryActive = (categoryId) => {
    const pages = PAGE_REGISTRY.filter(p => p.category === categoryId);
    return pages.some(page => location.pathname.includes(page.path));
  };

  // Collapsed-mode icon centering
  const collapsedIconStyles = !sidebarOpen ? {
    justifyContent: 'center',
    '& .MuiListItemIcon-root': {
      minWidth: 0,
      justifyContent: 'center',
    },
  } : {};

  // Sidebar item styles
  const selectedMenuItemStyle = {
    borderRadius: '8px',
    mx: sidebarOpen ? 1 : 0.5,
    px: sidebarOpen ? undefined : 0,
    my: 0.3,
    transition: 'all 0.2s ease-in-out',
    ...collapsedIconStyles,
    '&.Mui-selected': {
      backgroundColor: 'primary.main',
      color: 'white',
      '& .MuiListItemIcon-root': {
        color: 'white',
        ...(!sidebarOpen && { minWidth: 0, justifyContent: 'center' }),
      },
      '&:hover': {
        backgroundColor: 'primary.dark',
        ...(sidebarOpen && { transform: 'translateX(4px)' }),
      }
    },
    '&:hover': {
      backgroundColor: 'action.hover',
      ...(sidebarOpen && { transform: 'translateX(4px)' }),
    }
  };

  const getMainCategoryStyle = (isActive) => ({
    ...selectedMenuItemStyle,
    minHeight: 44,
    justifyContent: sidebarOpen ? 'space-between' : 'center',
    ...(isActive && {
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      ...(sidebarOpen && {
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
      }),
      '& .MuiListItemIcon-root': {
        color: 'primary.main',
        ...(!sidebarOpen && { minWidth: 0, justifyContent: 'center' }),
      },
      '& .MuiListItemText-primary': {
        color: 'primary.main',
        fontWeight: 600,
      }
    }),
    '&:hover': {
      backgroundColor: isActive ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
      ...(sidebarOpen && { transform: 'translateX(4px)' }),
      '& .MuiListItemIcon-root': {
        color: 'primary.main',
      },
    }
  });

  // Render a flyout category menu
  const renderCategoryMenu = (categoryId) => {
    if (!hasCategoryAccess(categoryId)) return null;

    const category = PAGE_CATEGORIES[categoryId];
    const IconComponent = categoryIcons[categoryId];
    const isActive = isCategoryActive(categoryId);
    const pages = getAccessiblePages(categoryId);

    // Find which submenus belong to this category
    const categorySubmenus = Object.entries(SUBMENUS)
      .filter(([_, sm]) => sm.category === categoryId)
      .filter(([smId]) => hasSubmenuAccess(smId));

    // Pages that are NOT in any submenu
    const directPages = pages.filter(p => !p.submenu);

    return (
      <span key={categoryId}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={(e) => openMenu(categoryId, e)}
            sx={getMainCategoryStyle(isActive)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <NavIcon icon={IconComponent} label={category.name} sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary={category.name} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
            </Box>
            {sidebarOpen && <ChevronRightIcon fontSize="small" sx={{ opacity: 0.6 }} />}
          </ListItemButton>
        </ListItem>

        <Menu
          anchorEl={menuAnchors[categoryId]}
          open={Boolean(menuAnchors[categoryId])}
          onClose={() => closeMenu(categoryId)}
          {...flyoutMenuPositionProps}
          sx={flyoutMenuSx}
        >
          {/* Render submenus first */}
          {categorySubmenus.map(([smId, sm]) => (
            <MenuItem
              key={smId}
              onClick={(e) => openSubmenu(smId, e)}
              sx={{ display: 'flex', justifyContent: 'space-between' }}
            >
              {sm.name} <ChevronRightIcon fontSize="small" />
            </MenuItem>
          ))}

          {/* Render direct pages */}
          {directPages.map(page => (
            <MenuItem
              key={page.id}
              component={Link}
              to={`/admin${page.path}`}
              onClick={closeAllMenus}
            >
              {page.name}
            </MenuItem>
          ))}
        </Menu>

        {/* Render submenu flyouts */}
        {categorySubmenus.map(([smId]) => {
          const smPages = getSubmenuPages(smId);
          return (
            <Menu
              key={`submenu-${smId}`}
              anchorEl={submenuAnchors[smId]}
              open={Boolean(submenuAnchors[smId])}
              onClose={() => closeSubmenu(smId)}
              {...flyoutMenuPositionProps}
              sx={flyoutMenuSx}
            >
              {smPages.map(page => (
                <MenuItem
                  key={page.id}
                  component={Link}
                  to={`/admin${page.path}`}
                  onClick={closeAllMenus}
                >
                  {page.name}
                </MenuItem>
              ))}
            </Menu>
          );
        })}
      </span>
    );
  };

  const drawer = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)' }}>
      <Toolbar />
      <Divider sx={{ borderColor: 'rgba(0, 0, 0, 0.08)' }} />
      <List sx={{ px: 0.5, py: 1, overflowY: 'auto', flexGrow: 1 }}>
        {/* Back to Lister Dashboard - visible only to listers */}
        {isAnyLister && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/lister"
              onClick={() => setMobileOpen(false)}
              sx={{
                ...selectedMenuItemStyle,
                minHeight: 44,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <NavIcon icon={HomeIcon} label="Back to My Dashboard" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="My Dashboard" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
            </ListItemButton>
          </ListItem>
        )}

        {/* Divider after lister dashboard link */}
        {isAnyLister && <Divider sx={{ my: 1.5, mx: 2, borderColor: 'rgba(0, 0, 0, 0.08)' }} />}

        {/* About Me - visible to all users except superadmin */}
        {!isSuper && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/admin/about-me"
              onClick={() => setMobileOpen(false)}
              selected={location.pathname === '/admin/about-me'}
              sx={{
                ...selectedMenuItemStyle,
                minHeight: 44,
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <NavIcon icon={SupervisorAccountIcon} label="View Your Profile" sidebarOpen={sidebarOpen} />
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary="About Me" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
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
            sx={{
              ...selectedMenuItemStyle,
              minHeight: 44,
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <NavIcon icon={EventAvailableIcon} label="My Leave Requests" sidebarOpen={sidebarOpen} />
            </ListItemIcon>
            {sidebarOpen && <ListItemText primary="My Leaves" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} />}
          </ListItemButton>
        </ListItem>)}

        <Divider sx={{ my: 1.5, mx: 2, borderColor: 'rgba(0, 0, 0, 0.08)' }} />

        {/* ====== DYNAMIC CATEGORY MENUS ====== */}
        {renderCategoryMenu('orderFulfilment')}
        {renderCategoryMenu('compatibility')}
        {renderCategoryMenu('listingResearch')}
        {renderCategoryMenu('finance')}
        {renderCategoryMenu('compliance')}
        {renderCategoryMenu('ebayParams')}
        {renderCategoryMenu('hrManagement')}
        {renderCategoryMenu('others')}

        {/* Ideas & Issues - standalone for users who don't see it in HR category */}
        {!hasAccess('IdeasAndIssues') && (
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
        )}

        {/* Team Chat - standalone for users who don't see it in HR category */}
        {!hasAccess('TeamChat') && (
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
        )}

      </List>
    </div>
  );

  // Determine default redirect page
  const getDefaultRedirect = () => {
    if (isSuper) return '/admin/crp-analytics';
    // Check categories in priority order
    const priorityPages = [
      'ProductResearch', 'ProductTable', 'CompatibilityTasks', 'CompatibilityEditor',
      'Fulfillment', 'EmployeeDetails', 'OrdersDashboard'
    ];
    for (const pageId of priorityPages) {
      if (hasAccess(pageId)) {
        const page = PAGE_REGISTRY.find(p => p.id === pageId);
        if (page) return `/admin${page.path}`;
      }
    }
    return '/admin/about-me';
  };

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
          <Button variant="contained" color="error" onClick={onLogout}>Logout</Button>
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
              background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
              borderRight: '1px solid rgba(0,0,0,0.08)',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '10px',
                '&:hover': { background: 'rgba(0, 0, 0, 0.25)' },
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
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
              borderRight: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '10px',
                '&:hover': { background: 'rgba(0, 0, 0, 0.25)' },
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

          {/* About Me */}
          {!isSuper && <Route path="/about-me" element={<AboutMePage />} />}

          {/* Leave Management - accessible to ALL authenticated users */}
          <Route path="/my-leaves" element={<LeaveManagementPage />} />

          {/* Internal Messages - accessible to ALL authenticated users */}
          <Route path="/internal-messages" element={<InternalMessagesPage />} />

          {/* User Performance - accessible to all */}
          <Route path="/user-performance" element={<UserPerformancePage />} />

          {/* Dynamic page routes based on access */}
          {PAGE_REGISTRY.map(page => {
            if (!hasAccess(page.id)) return null;
            const Component = COMPONENT_MAP[page.id];
            if (!Component) return null;
            return <Route key={page.id} path={page.path} element={<Component />} />;
          })}

          {/* Additional routes that don't map 1:1 to pages but need to exist */}
          {hasAccess('Fulfillment') && (
            <>
              <Route path="/conversation-tracking" element={<ConversationTrackingPage />} />
              <Route path="/cancelled-status" element={<DisputesPage initialTab={3} />} />
              <Route path="/return-requested" element={<DisputesPage initialTab={2} />} />
              <Route path="/worksheet" element={<DisputesPage initialTab={4} />} />
            </>
          )}

          {hasAccess('SelectSeller') && (
            <>
              <Route path="/template-listings" element={<TemplateListingsPage />} />
              <Route path="/seller-templates" element={<SellerTemplatesPage />} />
              <Route path="/template-listing-analytics" element={<TemplateListingAnalyticsPage />} />
            </>
          )}

          {hasAccess('StoreWiseTasks') && (
            <Route path="/store-wise-tasks/details" element={<StoreTaskDetailPage />} />
          )}

          {hasAccess('ListerInfo') && (
            <Route path="/lister-info/details" element={<ListerInfoDetailPage />} />
          )}

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
