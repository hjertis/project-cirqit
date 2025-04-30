import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, Toolbar, Container } from "@mui/material";
import TopBar from "./Topbar";
import Sidebar from "./Sidebar";

const Layout = () => {
  const [open, setOpen] = useState(false);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <TopBar open={open} toggleDrawer={toggleDrawer} />
      <Sidebar open={open} toggleDrawer={toggleDrawer} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: { sm: `calc(100% - 240px)` },
          overflow: "auto",
        }}
      >
        <Toolbar />
        <Container
          maxWidth={false}
          sx={{
            flexGrow: 1,
            py: 3,
            px: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: "column",
            width: { xs: "100%", md: "65%" },
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
