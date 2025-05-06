// src/pages/admin/FixInvalidOrderResourcesPage.tsx
import React, { useState } from "react";
import { Box, Button, Typography, Alert, CircularProgress } from "@mui/material";
import { getResources } from "../../services/resourceService";
import { db } from "../../config/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const FixInvalidOrderResourcesPage: React.FC = () => {
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setFixing(true);
    setResult(null);
    setError(null);
    try {
      const resources = await getResources(false);
      const validResourceIds = new Set(resources.map(r => r.id));
      const ordersSnapshot = await getDocs(collection(db, "orders"));
      let fixedCount = 0;

      for (const orderDoc of ordersSnapshot.docs) {
        const order = orderDoc.data();
        const assignedResourceId = order.assignedResourceId;
        if (assignedResourceId && !validResourceIds.has(assignedResourceId)) {
          await updateDoc(doc(db, "orders", orderDoc.id), {
            assignedResourceId: null,
          });
          fixedCount++;
        }
      }
      setResult(`Done. Fixed ${fixedCount} orders.`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setFixing(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Fix Invalid Order Resource Assignments
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This will scan all orders and set <b>assignedResourceId</b> to <b>none</b> for any order
        that references a non-existent resource.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleFix}
        disabled={fixing}
        startIcon={fixing ? <CircularProgress size={20} /> : null}
      >
        {fixing ? "Fixing..." : "Run Fix"}
      </Button>
      {result && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {result}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FixInvalidOrderResourcesPage;
