import React, { useState } from "react";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { Button, Alert, Typography, CircularProgress } from "@mui/material";

const LEGACY_TO_STANDARD: Record<string, string> = {
  setup: "Setup",
  production: "SMT",
  "quality check": "Inspection",
  packaging: "Delivery",
};

function mapToStandard(value: string): string {
  if (!value) return "Setup";
  const cleaned = value.trim().toLowerCase();
  return LEGACY_TO_STANDARD[cleaned] || "Setup";
}

const StandardizeProcessesCollectionPage: React.FC = () => {
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
      const processesRef = collection(db, "processes");
      const querySnapshot = await getDocs(processesRef);

      for (const processDoc of querySnapshot.docs) {
        const processData = processDoc.data();
        const newName = mapToStandard(processData.name);
        const newType = mapToStandard(processData.type);

        console.log(
          `Doc: ${processDoc.id}, name: "${processData.name}" -> "${newName}", type: "${processData.type}" -> "${newType}"`
        );

        if (processData.name !== newName || processData.type !== newType) {
          const docRef = doc(db, "processes", processDoc.id);
          batch.update(docRef, { name: newName, type: newType });
          operationsInBatch++;
          totalUpdated++;
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
        `Standardization complete. Processes checked: ${totalProcessed}, Processes updated: ${totalUpdated}`
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
        Standardize Processes Collection
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

export default StandardizeProcessesCollectionPage;
