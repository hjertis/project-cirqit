import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { SERIALIZED_LABEL_ZPL } from "../../constants/constants";
import { db } from "../../config/firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

interface LabelPrintDialogProps {
  open: boolean;
  onClose: () => void;
  partNumber: string;
  defaultSerial?: string;
  onPrintSuccess?: () => void;
}

const RUST_API_URL = "http://10.8.19.65:8080/print-label"; // Update to your actual API endpoint

const LabelPrintDialog = ({
  open,
  onClose,
  partNumber,
  defaultSerial = "",
  onPrintSuccess,
}: LabelPrintDialogProps) => {
  const [startSerial, setStartSerial] = useState(defaultSerial || "0001");
  const [printerIp, setPrinterIp] = useState("10.8.19.212");
  const [quantity, setQuantity] = useState(1); //Default quantity to 1
  const [copies, setCopies] = useState(2); // Default to 2 copies per label
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Helper to get current year and week in YYWW format
  const getYYWW = () => {
    const now = new Date();
    const year = now.getFullYear() % 100;
    const firstJan = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - firstJan.getTime()) / 86400000);
    const week = Math.ceil((days + firstJan.getDay() + 1) / 7);
    return `${year.toString().padStart(2, "0")}${week.toString().padStart(2, "0")}`;
  };

  // Firestore logic for serial tracking
  const getSerialDocRef = (yyww: string) => doc(db, "labelSerials", yyww);

  const fetchAndUpdateSerial = async (yyww: string, quantity: number) => {
    const ref = getSerialDocRef(yyww);
    const snap = await getDoc(ref);
    let currentSerial = 1;
    if (snap.exists()) {
      currentSerial = snap.data().lastSerial + 1;
    }
    await setDoc(ref, { lastSerial: currentSerial + quantity - 1 }, { merge: true });
    return currentSerial;
  };

  const handlePrint = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const yyww = getYYWW();
      const serialNum = await fetchAndUpdateSerial(yyww, quantity);
      const serialStr = serialNum.toString().padStart(startSerial.length, "0");
      const zpl = SERIALIZED_LABEL_ZPL(partNumber, serialStr, quantity, yyww, copies);
      const res = await fetch(RUST_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zpl, printer_ip: printerIp }),
      });
      if (!res.ok) throw new Error("Failed to print labels");
      // Log the print event for traceability
      const printLogRef = collection(db, "labelSerials", yyww, "prints");
      await addDoc(printLogRef, {
        workOrder: defaultSerial || null,
        partNumber,
        startSerial: serialStr,
        quantity,
        printerIp,
        timestamp: serverTimestamp(),
      });
      setSuccess(true);
      if (onPrintSuccess) onPrintSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Print Label</DialogTitle>
      <DialogContent>
        <TextField
          label="Serial Number"
          value={startSerial}
          onChange={e => setStartSerial(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Printer IP"
          value={printerIp}
          onChange={e => setPrinterIp(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="e.g. 10.8.19.212"
        />
        <TextField
          label="Quantity"
          type="number"
          value={quantity}
          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          fullWidth
          margin="normal"
          inputProps={{ min: 1 }}
        />
        <TextField
          label="Copies"
          type="number"
          value={copies}
          onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
          fullWidth
          margin="normal"
          inputProps={{ min: 1 }}
        />
        <Box sx={{ mb: 1, mt: 2 }}>
          <Alert severity="info" sx={{ mb: 1, p: 1 }}>
            <strong>Work Order:</strong> {defaultSerial || "-"} <br />
            <strong>Part Number:</strong> {partNumber || "-"}
          </Alert>
        </Box>
        <pre style={{ fontSize: 10, background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
          {SERIALIZED_LABEL_ZPL(partNumber, startSerial, quantity, getYYWW(), copies)}
        </pre>
        <Box sx={{ mt: 1 }}>
          <Alert severity="info" sx={{ p: 1 }}>
            <strong>Start Serial:</strong> {startSerial}
          </Alert>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">Label sent to printer!</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handlePrint} disabled={loading || !startSerial} variant="contained">
          {loading ? <CircularProgress size={20} /> : "Print Label"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabelPrintDialog;
