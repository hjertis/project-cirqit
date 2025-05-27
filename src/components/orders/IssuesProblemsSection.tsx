import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const IssuesProblemsSection: React.FC = () => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 2, mb: 0.5 }}>
        Issues & Problems
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, minHeight: "80px", mb: 1 }} className="issues-section">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.75rem", mb: 1, display: "block" }}
        >
          Record any issues, machine problems, material defects, or delays:
        </Typography>
        {/* Empty lined space for writing */}
        <Box sx={{ mt: 1 }}>
          {[...Array(5)].map((_, index) => (
            <Box
              key={index}
              sx={{
                borderBottom: "1px solid #ccc",
                minHeight: "16px",
                mb: "4px",
                width: "100%",
              }}
            />
          ))}
        </Box>
      </Paper>
    </>
  );
};

export default IssuesProblemsSection;
