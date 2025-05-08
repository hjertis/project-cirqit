import React, { useState } from "react";
import { Button, CircularProgress, Alert, Typography, Box } from "@mui/material";
import { migrateProcessDurationsToHours } from "../../scripts/migrateProcessDurationsToHours";

const MigrateProcessDurationsToHoursPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await migrateProcessDurationsToHours();
      setResult(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" gutterBottom>
        Migrate Process Durations to Hours
      </Typography>
      <Typography variant="body1" gutterBottom>
        This will convert all process durations that are likely in days (integer ≤ 24) to hours
        (multiply by 8).
      </Typography>
      <Button variant="contained" color="primary" onClick={handleMigrate} disabled={loading}>
        {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
        Run Migration
      </Button>
      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {result}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default MigrateProcessDurationsToHoursPage;
