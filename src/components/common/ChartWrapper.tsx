import { Paper, Typography, Box } from "@mui/material";
import { ReactNode } from "react";

interface ChartWrapperProps {
  title?: string;
  description?: string;
  height?: number | string;
  children: ReactNode;
}

const ChartWrapper = ({ title, description, height = 400, children }: ChartWrapperProps) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    {title && (
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
    )}
    {description && (
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {description}
      </Typography>
    )}
    <Box sx={{ height }}>{children}</Box>
  </Paper>
);

export default ChartWrapper;
