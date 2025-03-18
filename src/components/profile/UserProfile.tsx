// src/components/profile/UserProfile.tsx
import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { PersonOutline as PersonIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";

const UserProfile = () => {
  const { currentUser, updateUserProfile, logout } = useAuth();

  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Get user initials for avatar
  const getInitials = () => {
    if (!currentUser?.displayName) return "U";

    return currentUser.displayName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || "");
    setIsEditing(false);
    setError("");
    setMessage("");
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }

    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await updateUserProfile(displayName);
      setMessage("Profile updated successfully");
      setIsEditing(false);
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Redirection will be handled by ProtectedRoute component
    } catch (err: any) {
      setError(`Failed to log out: ${err.message}`);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", mr: 2 }}>
          {getInitials()}
        </Avatar>
        <Box>
          <Typography variant="h5">{currentUser?.displayName || "User"}</Typography>
          <Typography variant="body2" color="text.secondary">
            {currentUser?.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={!isEditing || isLoading}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              value={currentUser?.email || ""}
              disabled
              helperText="Email cannot be changed"
            />
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {isEditing ? (
              <>
                <Button variant="outlined" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : null}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button variant="outlined" onClick={handleEdit}>
                Edit Profile
              </Button>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Account
          </Typography>

          <Button variant="outlined" color="error" onClick={handleLogout}>
            Sign Out
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default UserProfile;
