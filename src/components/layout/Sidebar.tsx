import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useTheme,
  useMediaQuery,
  Collapse,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assignment as OrdersIcon,
  Inventory as ProductsIcon,
  People as EmployeesIcon,
  BarChart as ReportsIcon,
  Settings as SettingsIcon,
  AccessTime as AccessTimeIcon,
  ExpandLess,
  ExpandMore,
  PeopleAlt as PeopleAltIcon,
  ErrorOutline as FaultIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  CalendarToday as CalendarTodayIcon,
  ViewKanban as ViewKanbanIcon,
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Archive as ArchiveIcon,
  ErrorOutline as ErrorOutlineIcon,
} from "@mui/icons-material";
import { useState, useEffect } from "react";

const drawerWidth = 240;

interface SidebarProps {
  open: boolean;
  toggleDrawer: () => void;
}

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  children?: NavItem[];
}

const Sidebar = ({ open, toggleDrawer }: SidebarProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const handleSubmenuToggle = (text: string) => {
    setOpenSubmenu(text === openSubmenu ? null : text);
  };

  const navItems: NavItem[] = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/",
    },
    {
      text: "Orders",
      icon: <OrdersIcon />,
      path: "/orders",
      children: [
        { text: "All Orders", icon: <OrdersIcon />, path: "/orders" },
        { text: "Create Order", icon: <OrdersIcon />, path: "/orders/create" },
        { text: "Planning", icon: <OrdersIcon />, path: "/orders/planning" },
        { text: "Resource Calendar", icon: <CalendarTodayIcon />, path: "/orders/calendar" },
        { text: "Resource Board", icon: <ViewKanbanIcon />, path: "/orders/resource-board" },
        { text: "Kanban Board", icon: <ViewKanbanIcon />, path: "/kanban" },
        { text: "Archived Orders", icon: <ArchiveIcon />, path: "/orders/archived" },
        { text: "View Removed Orders", icon: <ErrorOutlineIcon />, path: "/removed-orders" },
      ],
    },
    {
      text: "Products",
      icon: <ProductsIcon />,
      path: "/products",
    },
    {
      text: "Faults",
      icon: <ErrorIcon />,
      path: "/faults",
      children: [
        { text: "Log Fault", icon: <ErrorIcon />, path: "/fault-tracking" },
        { text: "Fault Report", icon: <ErrorIcon />, path: "/fault-report" },
      ],
    },
    {
      text: "Employees",
      icon: <EmployeesIcon />,
      path: "/employees",
    },
    {
      text: "Reports",
      icon: <ReportsIcon />,
      path: "/reports",
      children: [
        { text: "Overview", icon: <ReportsIcon />, path: "/reports" },
        { text: "Fault Analysis", icon: <FaultIcon />, path: "/reports/fault-analysis" },
        {
          text: "Production Dashboard",
          icon: <ReportsIcon />,
          path: "/reports/production-dashboard",
        },
      ],
    },
    {
      text: "Time Tracking",
      icon: <AccessTimeIcon />,
      path: "/time",
    },
    {
      text: "Tasks",
      icon: <AssignmentIcon />,
      path: "/tasks",
    },
    {
      text: "Resources",
      icon: <PeopleAltIcon />,
      path: "/resources",
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      toggleDrawer();
    }
  };

  // Only auto-open submenu if navigating directly to a child route
  useEffect(() => {
    const parentItem = navItems.find(
      item => item.children && item.children.some(child => child.path === location.pathname)
    );
    if (parentItem) {
      setOpenSubmenu(parentItem.text);
    }
    // Do not close openSubmenu on navigation if user opened it manually
    // eslint-disable-next-line
  }, [location.pathname]);

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {navItems.map(item => (
          <Box key={item.text}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleSubmenuToggle(item.text)}
                    selected={location.pathname.startsWith(item.path)}
                    sx={{
                      backgroundColor: location.pathname.startsWith(item.path)
                        ? theme.palette.action.selected
                        : "transparent",
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                    {openSubmenu === item.text ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openSubmenu === item.text} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map(child => (
                      <ListItemButton
                        key={child.text}
                        onClick={() => handleNavClick(child.path)}
                        selected={location.pathname === child.path}
                        sx={{
                          pl: 4,
                          backgroundColor:
                            location.pathname === child.path
                              ? theme.palette.primary.light
                              : "transparent",
                          color:
                            location.pathname === child.path
                              ? theme.palette.primary.main
                              : "inherit",
                          fontWeight: location.pathname === child.path ? "bold" : "normal",
                          "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                          },
                          "& .MuiListItemIcon-root": {
                            color:
                              location.pathname === child.path
                                ? theme.palette.primary.main
                                : "inherit",
                          },
                        }}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText
                          primary={child.text}
                          sx={{
                            "& .MuiTypography-root": {
                              fontWeight: location.pathname === child.path ? "bold" : "normal",
                            },
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavClick(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    backgroundColor:
                      location.pathname === item.path ? theme.palette.primary.light : "transparent",
                    color: location.pathname === item.path ? theme.palette.primary.main : "inherit",
                    fontWeight: location.pathname === item.path ? "bold" : "normal",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                    },
                    "& .MuiListItemIcon-root": {
                      color:
                        location.pathname === item.path ? theme.palette.primary.main : "inherit",
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      "& .MuiTypography-root": {
                        fontWeight: location.pathname === item.path ? "bold" : "normal",
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}
          </Box>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleNavClick("/settings")}
            selected={location.pathname === "/settings"}
            sx={{
              backgroundColor:
                location.pathname === "/settings" ? theme.palette.primary.light : "transparent",
              color: location.pathname === "/settings" ? theme.palette.primary.main : "inherit",
              fontWeight: location.pathname === "/settings" ? "bold" : "normal",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
              },
              "& .MuiListItemIcon-root": {
                color: location.pathname === "/settings" ? theme.palette.primary.main : "inherit",
              },
            }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              sx={{
                "& .MuiTypography-root": {
                  fontWeight: location.pathname === "/settings" ? "bold" : "normal",
                },
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={toggleDrawer}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
};

export default Sidebar;
