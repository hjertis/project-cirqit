import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
} from "@mui/material";
import { CalendarToday as CalendarIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import { Timestamp } from "firebase/firestore";
import { TimeEntry } from "../../services/timeTrackingService";

export interface EditTimeEntryDialogProps {
  open: boolean;
  entry: TimeEntry | null;
  processes?: { id: string; name: string; type: string }[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (updates: Partial<TimeEntry>) => void;
}

const EditTimeEntryDialog: React.FC<EditTimeEntryDialogProps> = ({
  open,
  entry,
  processes = [],
  loading = false,
  error = null,
  onClose,
  onSave,
}) => {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [process, setProcess] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (entry) {
      setStartTime(dayjs(entry.startTime.toDate()).format("YYYY-MM-DDTHH:mm"));
      setEndTime(entry.endTime ? dayjs(entry.endTime.toDate()).format("YYYY-MM-DDTHH:mm") : "");
      setProcess(entry.processId || "");
      setNotes(entry.notes || "");
    }
  }, [entry]);

  const handleSave = () => {
    const updates: Partial<TimeEntry> = {
      startTime: startTime ? Timestamp.fromDate(dayjs(startTime).toDate()) : undefined,
      notes,
      processId: process,
    };
    if (endTime) {
      updates.endTime = Timestamp.fromDate(dayjs(endTime).toDate());
      // Optionally calculate duration here if needed by parent
    }
    onSave(updates);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Time Entry</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Start Time"
          type="datetime-local"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <CalendarIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="End Time"
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <CalendarIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="edit-process-label">Process</InputLabel>
          <Select
            labelId="edit-process-label"
            value={process}
            label="Process"
            onChange={e => setProcess(e.target.value)}
          >
            <MenuItem value="">
              <em>General order work</em>
            </MenuItem>
            {processes.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.type})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTimeEntryDialog;
