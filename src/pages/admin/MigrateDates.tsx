import React, { useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../config/firebase";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Button, CircularProgress, Alert } from "@mui/material";

dayjs.extend(isoWeek);

const MigratePlannedWeekStartDateButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const ordersRef = collection(db, "orders");
      const snapshot = await getDocs(ordersRef);
      let updatedCount = 0;

      for (const orderDoc of snapshot.docs) {
        const data = orderDoc.data();
        if (data.plannedWeekStartDate) {
          const monday = dayjs(data.plannedWeekStartDate).startOf("isoWeek").format("YYYY-MM-DD");
          if (monday !== data.plannedWeekStartDate) {
            await updateDoc(doc(db, "orders", orderDoc.id), {
              plannedWeekStartDate: monday,
            });
            updatedCount++;
          }
        }
      }
      setResult(`Migration complete. Updated ${updatedCount} orders.`);
    } catch (err) {
      setResult("Migration failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button variant="contained" color="warning" onClick={handleMigrate} disabled={loading}>
        Migrate plannedWeekStartDate to Monday
      </Button>
      {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      {result && (
        <Alert
          severity={result.startsWith("Migration complete") ? "success" : "error"}
          sx={{ mt: 2 }}
        >
          {result}
        </Alert>
      )}
    </div>
  );
};

export default MigratePlannedWeekStartDateButton;
