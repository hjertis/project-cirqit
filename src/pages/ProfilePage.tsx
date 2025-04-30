import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import UserProfile from "../components/profile/UserProfile";
import ContentWrapper from "../components/layout/ContentWrapper";

const ProfilePage = () => {
  return (
    <ContentWrapper>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
            <Link component={RouterLink} to="/" color="inherit">
              Dashboard
            </Link>
            <Typography color="text.primary">Profile</Typography>
          </Breadcrumbs>

          <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
            User Profile
          </Typography>
        </Box>

        <UserProfile />
      </Box>
    </ContentWrapper>
  );
};

export default ProfilePage;
