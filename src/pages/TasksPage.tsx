import React from "react";
import { Box, Typography } from "@mui/material";
import TasksPanel from "../components/tasks/TasksPanel";

const TasksPage: React.FC = () => {
  return (
    <Box sx={{ maxWidth: 700, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      <TasksPanel />
    </Box>
  );
};

export default TasksPage;
