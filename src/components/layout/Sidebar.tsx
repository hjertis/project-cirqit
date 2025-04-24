// src/components/layout/Sidebar.tsx
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
  CalendarViewWeek as CalendarViewWeekIcon, // <-- Import an appropriate icon
  CalendarToday as CalendarTodayIcon, // Example icon
  ViewKanban as ViewKanbanIcon, // Example icon
} from "@mui/icons-material";
import { useState, useEffect } from "react";

// Drawer width
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
    setOpenSubmenu(openSubmenu === text ? null : text);
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
      path: "/orders", // Base path for the section
      children: [
        { text: "All Orders", icon: <OrdersIcon />, path: "/orders" },
        { text: "Create Order", icon: <OrdersIcon />, path: "/orders/create" },
        { text: "Planning", icon: <OrdersIcon />, path: "/orders/planning" },
        { text: "Resource Calendar", icon: <CalendarTodayIcon />, path: "/orders/calendar" },
        { text: "Resource Board", icon: <ViewKanbanIcon />, path: "/orders/resource-board" },
        {
          text: "Daily Scheduler",
          icon: <CalendarViewWeekIcon />,
          path: "/orders/resource-scheduler",
        },
      ],
    },
    {
      text: "Products",
      icon: <ProductsIcon />,
      path: "/products",
    },
    {
      text: "Employees",
      icon: <EmployeesIcon />,
      path: "/employees",
    },
    {
      text: "Reports",
      icon: <ReportsIcon />,
      path: "/reports", // Base path for reports section
      children: [
        { text: "Overview", icon: <ReportsIcon />, path: "/reports" }, // Link to the main reports page
        { text: "Fault Analysis", icon: <FaultIcon />, path: "/reports/fault-analysis" }, // Link to the new chart
        {
          text: "Production Dashboard",
          icon: <ReportsIcon />,
          path: "/reports/production-dashboard",
        }, // Link to the production dashboard
      ],
    },
    {
      text: "Time Tracking",
      icon: <AccessTimeIcon />,
      path: "/time",
    },
    {
      text: "Resources",
      icon: <PeopleAltIcon />, // or another appropriate icon
      path: "/resources",
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      toggleDrawer();
    }
  };

  // Function to determine if a submenu should be open based on current path
  useEffect(() => {
    const currentTopLevelPath = location.pathname.split("/")[1]; // e.g., "orders"
    const parentItem = navItems.find(
      item =>
        item.path === `/${currentTopLevelPath}` || location.pathname.startsWith(item.path + "/")
    );

    if (parentItem && parentItem.children) {
      setOpenSubmenu(parentItem.text);
    } else {
      // Optional: Close other submenus if not in a submenu section
      // setOpenSubmenu(null);
    }
  }, [location.pathname, navItems]); // Re-run when path changes

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
                    selected={location.pathname.startsWith(item.path)} // Highlight parent if any child is active
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
                        selected={location.pathname === child.path} // Exact match for child selection
                        sx={{
                          pl: 4, // Indent child items
                          backgroundColor:
                            location.pathname === child.path
                              ? theme.palette.primary.lighter
                              : "transparent", // Highlight selected child
                          color:
                            location.pathname === child.path
                              ? theme.palette.primary.main
                              : "inherit",
                          fontWeight: location.pathname === child.path ? "bold" : "normal",
                          "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                          },
                          "& .MuiListItemIcon-root": {
                            // Ensure icon color matches
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
                              // Target the typography inside ListItemText
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
                  selected={location.pathname === item.path} // Exact match for top-level selection
                  sx={{
                    backgroundColor:
                      location.pathname === item.path
                        ? theme.palette.primary.lighter
                        : "transparent", // Highlight selected top-level
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
                location.pathname === "/settings" ? theme.palette.primary.lighter : "transparent", // Highlight settings
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
      {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={open}
          onClose={toggleDrawer}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
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
