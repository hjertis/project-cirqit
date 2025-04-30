import React, { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";
import { Button, Alert, Typography, CircularProgress } from "@mui/material";

// Helper: Try to match a process name to a standard name
function matchStandardProcessName(name: string): string | null {
  if (!name) return null;
  const cleaned = name
    .replace(/^WO-\d+\s*/i, "")
    .trim()
    .toLowerCase();
  for (const std of STANDARD_PROCESS_NAMES) {
    if (cleaned === std.toLowerCase()) return std;
    if (cleaned.replace(/[^\w]/g, "") === std.toLowerCase().replace(/[^\w]/g, "")) return std;
  }
  return null;
}

const StandardizeOrderProcessesPage: React.FC = () => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStandardize = async () => {
    setLoading(true);
    setResult(null);
    let totalProcessed = 0;
    let totalUpdated = 0;
    let batch = writeBatch(db);
    let operationsInBatch = 0;
    const BATCH_SIZE = 400;

    try {
      const ordersRef = collection(db, "orders");
      const querySnapshot = await getDocs(ordersRef);

      for (const orderDoc of querySnapshot.docs) {
        const orderData = orderDoc.data();
        let updated = false;

        if (Array.isArray(orderData.processes)) {
          const newProcesses = orderData.processes.map((proc: any) => {
            const matched = matchStandardProcessName(proc.name);
            if (matched && proc.name !== matched) {
              updated = true;
              return { ...proc, name: matched };
            }
            return proc;
          });

          if (updated) {
            const docRef = doc(db, "orders", orderDoc.id);
            batch.update(docRef, { processes: newProcesses });
            operationsInBatch++;
            totalUpdated++;
          }
        }

        totalProcessed++;
        if (operationsInBatch >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          operationsInBatch = 0;
        }
      }

      if (operationsInBatch > 0) {
        await batch.commit();
      }

      setResult(
        `Standardization complete. Orders checked: ${totalProcessed}, Orders updated: ${totalUpdated}`
      );
    } catch (error: any) {
      setResult("Error: " + (error.message || String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Standardize Order Process Names
      </Typography>
      <Button variant="contained" color="primary" onClick={handleStandardize} disabled={loading}>
        {loading ? <CircularProgress size={24} /> : "Run Standardization"}
      </Button>
      {result && (
        <Alert severity={result.startsWith("Error") ? "error" : "success"} sx={{ mt: 2 }}>
          {result}
        </Alert>
      )}
    </div>
  );
};

export default StandardizeOrderProcessesPage;
