import { Grid, Typography, Paper, Box } from "@mui/material";

interface CompactSignatureSectionProps {
  isPrintMode?: boolean;
}

const CompactSignatureSection = ({ isPrintMode = false }: CompactSignatureSectionProps) => {
  return (
    <Grid container spacing={isPrintMode ? 1 : 2} sx={{ mb: isPrintMode ? 1 : 2, width: "100%" }}>
      <Grid item xs={6}>
        <Paper variant="outlined" sx={{ p: isPrintMode ? 0.5 : 1, width: "100%" }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: isPrintMode ? "0.7rem" : "0.75rem",
              display: "block",
            }}
          >
            Inspected By:
          </Typography>
          <Box
            className="signature-box"
            sx={{
              border: "1px dashed #ccc",
              height: isPrintMode ? "30px" : "40px",
              mt: 0.5,
              width: "100%",
            }}
          />
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: isPrintMode ? "0.7rem" : "0.75rem",
                display: "block",
              }}
            >
              Name: ____________________________
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: isPrintMode ? "0.7rem" : "0.75rem",
                display: "block",
              }}
            >
              Date: ____________________________
            </Typography>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={6}>
        <Paper variant="outlined" sx={{ p: isPrintMode ? 0.5 : 1, width: "100%" }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: isPrintMode ? "0.7rem" : "0.75rem",
              display: "block",
            }}
          >
            Approved By:
          </Typography>
          <Box
            className="signature-box"
            sx={{
              border: "1px dashed #ccc",
              height: isPrintMode ? "30px" : "40px",
              mt: 0.5,
              width: "100%",
            }}
          />
          <Box sx={{ mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: isPrintMode ? "0.7rem" : "0.75rem",
                display: "block",
              }}
            >
              Name: ____________________________
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: isPrintMode ? "0.7rem" : "0.75rem",
                display: "block",
              }}
            >
              Date: ____________________________
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default CompactSignatureSection;
