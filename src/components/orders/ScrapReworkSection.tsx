import React from "react";
import { Box, Typography, Paper, Grid } from "@mui/material";

interface ScrapReworkSectionProps {
  orderQuantity: number;
}

const ScrapReworkSection: React.FC<ScrapReworkSectionProps> = ({ orderQuantity }) => {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mt: 2, mb: 0.5 }}>
        Scrap & Rework Tracking
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 1 }} className="scrap-rework-section">
        <Grid container spacing={1}>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ fontSize: "0.75rem", fontWeight: "bold", pl: 0.5 }}
              >
                Scrap Qty:
              </Typography>
              <Box
                sx={{
                  borderBottom: "1px solid #000",
                  minHeight: "24px",
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "right",
                }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#666", mb: 0.5 }}>
                  pcs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                Rework Qty:
              </Typography>
              <Box
                sx={{
                  borderBottom: "1px solid #000",
                  minHeight: "24px",
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "right",
                }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#666", mb: 0.5 }}>
                  pcs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                Good Parts:
              </Typography>
              <Box
                sx={{
                  borderBottom: "1px solid #000",
                  minHeight: "24px",
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "right",
                }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#666", mb: 0.5 }}>
                  pcs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={3}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: "bold" }}>
                Total Check:
              </Typography>
              <Box
                sx={{
                  border: "1px solid #000",
                  minHeight: "24px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                }}
              >
                <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: "bold" }}>
                  {orderQuantity} pcs
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.65rem", color: "#666", mt: 1, display: "block" }}
        >
          Note: Good Parts + Scrap + Rework should equal Total ({orderQuantity} pieces)
        </Typography>
      </Paper>
    </>
  );
};

export default ScrapReworkSection;
