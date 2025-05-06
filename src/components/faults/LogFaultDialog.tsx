import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import LogFaultForm from "./LogFaultForm";
import { DialogActions, Button } from "@mui/material";

interface LogFaultDialogProps {
  open: boolean;
  onClose: () => void;
  initialOrderId?: string;
  initialPartNumber?: string;
}

const LogFaultDialog = ({
  open,
  onClose,
  initialOrderId,
  initialPartNumber,
}: LogFaultDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Log Fault / Rework</DialogTitle>
      <DialogContent>
        <LogFaultForm
          initialOrderId={initialOrderId}
          initialPartNumber={initialPartNumber}
          onSuccess={onClose}
          onCancel={onClose}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogFaultDialog;
