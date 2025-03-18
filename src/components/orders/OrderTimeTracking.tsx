// src/components/orders/OrderTimeTracking.tsx
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import TimeEntryWidget from "../time/TimeEntryWidget";
import TimeEntriesList from "../time/TimeEntriesList";
import { calculateTotalTimeForOrder } from "../../services/timeTrackingService";
import { formatDuration, formatDurationHumanReadable } from "../../utils/helpers";

interface OrderTimeTrackingProps {
  orderId: string;
  orderNumber: string;
  processes?: { id: string; name: string; type: string }[];
}

const OrderTimeTracking = ({ orderId, orderNumber, processes = [] }: OrderTimeTrackingProps) => {
  const [totalTime, setTotalTime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    const fetchTotalTime = async () => {
      try {
        setLoading(true);
        const total = await calculateTotalTimeForOrder(orderId);
        setTotalTime(total);
      } catch (err) {
        console.error("Error calculating total time:", err);
        setError("Failed to calculate total time");
      } finally {
        setLoading(false);
      }
    };

    fetchTotalTime();
  }, [orderId, refreshTrigger]);

  const handleTimeEntryUpdated = () => {
    // Trigger a refresh of the time entries list and total time
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {/* Time Entry Widget */}
          <TimeEntryWidget
            orderId={orderId}
            orderNumber={orderNumber}
            processes={processes}
            onTimeEntryUpdated={handleTimeEntryUpdated}
          />

          {/* Time Summary Card */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Time Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 1 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              ) : (
                <Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Total Time:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="bold">
                        {formatDuration(totalTime)}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        In Hours:
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">{(totalTime / 3600).toFixed(2)} hrs</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Time Entries List */}
          <TimeEntriesList orderId={orderId} reloadTrigger={refreshTrigger} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderTimeTracking;
