// src/components/dashboard/NotificationsPanel.tsx
import { useState } from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  IconButton,
  Badge,
  Chip,
  Divider,
  Paper,
  Button,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  AssignmentLate as AssignmentLateIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  details: string;
  time: string;
  read: boolean;
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "warning",
    message: "Order WO-1004 is delayed",
    details: "The order is behind schedule by 2 days",
    time: "10 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "success",
    message: "Order WO-1003 completed",
    details: "All processes finished successfully",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    message: "New employee added",
    details: "John Doe has been added to the system",
    time: "3 hours ago",
    read: true,
  },
  {
    id: "4",
    type: "error",
    message: "Inventory shortage",
    details: "Component XYZ-123 is out of stock",
    time: "Yesterday",
    read: true,
  },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "warning":
      return <AssignmentLateIcon />;
    case "success":
      return <CheckCircleIcon />;
    case "error":
      return <ErrorOutlineIcon />;
    case "info":
    default:
      return <InfoIcon />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "warning":
      return "#ff9800";
    case "success":
      return "#4caf50";
    case "error":
      return "#f44336";
    case "info":
    default:
      return "#2196f3";
  }
};

const NotificationsPanel = () => {
  const [notificationsList, setNotificationsList] = useState<Notification[]>(notifications);

  const markAsRead = (id: string) => {
    setNotificationsList(
      notificationsList.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotificationsList(notificationsList.filter(notification => notification.id !== id));
  };

  const unreadCount = notificationsList.filter(notification => !notification.read).length;

  return (
    <Paper sx={{ height: "100%" }}>
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 1 }}>
            <NotificationsIcon color="action" />
          </Badge>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Button size="small">Mark all as read</Button>
      </Box>

      <List sx={{ maxHeight: 360, overflow: "auto" }}>
        {notificationsList.length > 0 ? (
          notificationsList.map(notification => (
            <Box key={notification.id}>
              <ListItem
                alignItems="flex-start"
                secondaryAction={
                  <IconButton edge="end" onClick={() => deleteNotification(notification.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{
                  backgroundColor: notification.read ? "inherit" : "action.hover",
                  "&:hover": {
                    backgroundColor: "action.selected",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getNotificationColor(notification.type) }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        component="span"
                        variant="body1"
                        fontWeight={notification.read ? "normal" : "bold"}
                      >
                        {notification.message}
                      </Typography>
                      {!notification.read && (
                        <Chip label="New" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography component="div" variant="body2" color="text.primary">
                        {notification.details}
                      </Typography>
                      <Typography
                        component="div"
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {notification.time}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </Box>
          ))
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">No notifications</Typography>
          </Box>
        )}
      </List>

      <Box sx={{ p: 2, textAlign: "center", borderTop: 1, borderColor: "divider" }}>
        <Button fullWidth>View All Notifications</Button>
      </Box>
    </Paper>
  );
};

export default NotificationsPanel;
