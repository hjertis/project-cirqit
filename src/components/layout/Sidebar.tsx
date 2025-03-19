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
} from "@mui/icons-material";
import { useState } from "react";

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
      path: "/orders",
      children: [
        { text: "All Orders", icon: <OrdersIcon />, path: "/orders" },
        { text: "Create Order", icon: <OrdersIcon />, path: "/orders/create" },
        { text: "Planning", icon: <OrdersIcon />, path: "/orders/planning" },
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
      path: "/reports",
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
                      "&.Mui-selected": {
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                        "&:hover": {
                          backgroundColor: "primary.main",
                        },
                        "& .MuiListItemIcon-root": {
                          color: "primary.contrastText",
                        },
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
                          "&.Mui-selected": {
                            backgroundColor: "primary.light",
                            color: "primary.contrastText",
                            "&:hover": {
                              backgroundColor: "primary.main",
                            },
                            "& .MuiListItemIcon-root": {
                              color: "primary.contrastText",
                            },
                          },
                        }}
                      >
                        <ListItemIcon>{child.icon}</ListItemIcon>
                        <ListItemText primary={child.text} />
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
                    "&.Mui-selected": {
                      backgroundColor: "primary.light",
                      color: "primary.contrastText",
                      "&:hover": {
                        backgroundColor: "primary.main",
                      },
                      "& .MuiListItemIcon-root": {
                        color: "primary.contrastText",
                      },
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )}
          </Box>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavClick("/settings")}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
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
