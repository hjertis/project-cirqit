// src/pages/PrintOrderPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Paper, Button, CircularProgress, Alert } from "@mui/material";
import { Print as PrintIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import PrintableWorkOrder from "../components/orders/PrintableWorkOrder";
import ContentWrapper from "../components/layout/ContentWrapper";

const PrintOrderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Fetch order and process data
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!id) {
        setError("Order ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Fetch order data
        const orderDoc = await getDoc(doc(db, "orders", id));

        if (!orderDoc.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setOrder(orderData);

        // Fetch processes for this order
        const processesQuery = query(collection(db, "processes"), where("workOrderId", "==", id));
        const processesSnapshot = await getDocs(processesQuery);
        const processesData: any[] = [];

        processesSnapshot.forEach(doc => {
          processesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // Sort processes by sequence
        processesData.sort((a, b) => a.sequence - b.sequence);
        setProcesses(processesData);
        setError(null);

        // Automatically open print dialog when data is loaded
        setTimeout(() => {
          setPrintDialogOpen(true);
        }, 500);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(`Failed to load order: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [id]);

  const handleBack = () => {
    navigate(`/orders/${id}`);
  };

  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  if (loading) {
    return (
      <ContentWrapper>
        <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
          <CircularProgress />
        </Box>
      </ContentWrapper>
    );
  }

  if (error) {
    return (
      <ContentWrapper>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Print Work Order: {order?.orderNumber}
        </Typography>
        <Typography variant="body1" paragraph>
          Use the button below to open the print dialog for this work order. This view includes all
          order details, processes, and manual progress tracking checkboxes for shop floor use.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBack}>
            Back to Order Details
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            color="primary"
          >
            Open Print Dialog
          </Button>
        </Box>
      </Paper>

      {/* Printable Work Order Dialog */}
      {order && (
        <PrintableWorkOrder
          open={printDialogOpen}
          onClose={() => setPrintDialogOpen(false)}
          order={order}
          processes={processes}
        />
      )}
    </ContentWrapper>
  );
};

export default PrintOrderPage;
