import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { STANDARD_PROCESS_NAMES } from "../../constants/constants";
import { ProcessTemplate } from "../../types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

interface ProcessTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  processTemplates: ProcessTemplate[];
  onSave: (templates: ProcessTemplate[]) => void;
  loading?: boolean;
  product?: { partNo: string; description: string } | null;
}

const initialProcess: ProcessTemplate = {
  name: STANDARD_PROCESS_NAMES[0],
  duration: 1,
  sequence: 1,
};

const ProcessTemplateDialog = ({
  open,
  onClose,
  processTemplates,
  onSave,
  loading = false,
  product,
}: ProcessTemplateDialogProps) => {
  const [templates, setTemplates] = useState<ProcessTemplate[]>(processTemplates || []);
  const [availableProducts, setAvailableProducts] = useState<
    { partNo: string; description: string; processTemplates: ProcessTemplate[] }[]
  >([]);
  const [copyFrom, setCopyFrom] = useState<string>("");

  const handleAdd = () => {
    const nextSeq = templates.length > 0 ? Math.max(...templates.map(t => t.sequence)) + 1 : 1;
    setTemplates([...templates, { ...initialProcess, sequence: nextSeq }]);
  };

  const handleChange = (idx: number, field: keyof ProcessTemplate, value: string | number) => {
    const updated = templates.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    setTemplates(updated);
  };

  const handleRemove = (idx: number) => {
    const updated = templates
      .filter((_, i) => i !== idx)
      .map((t, i) => ({ ...t, sequence: i + 1 }));
    setTemplates(updated);
  };

  const handleSave = () => {
    onSave(templates);
    onClose();
  };

  React.useEffect(() => {
    if (open) setTemplates(processTemplates || []);
  }, [open, processTemplates]);

  // Fetch products with processTemplates for copy option
  React.useEffect(() => {
    if (!open) return;
    (async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const products: {
        partNo: string;
        description: string;
        processTemplates: ProcessTemplate[];
      }[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.processTemplates) && data.processTemplates.length > 0) {
          products.push({
            partNo: data.partNo,
            description: data.description,
            processTemplates: data.processTemplates,
          });
        }
      });
      setAvailableProducts(products);
    })();
  }, [open]);

  const handleCopyTemplates = () => {
    const selected = availableProducts.find(p => p.partNo === copyFrom);
    if (selected) {
      setTemplates(selected.processTemplates.map((t, i) => ({ ...t, sequence: i + 1 })));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6">
            Edit Process Templates{product ? ` for ${product.partNo}` : ""}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {/* Copy from another product */}
        {availableProducts.length > 0 && (
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl sx={{ minWidth: 220 }} size="small">
              <InputLabel>Copy from product</InputLabel>
              <Select
                value={copyFrom}
                label="Copy from product"
                onChange={e => setCopyFrom(e.target.value)}
              >
                {availableProducts
                  .filter(p => !product || p.partNo !== product.partNo)
                  .map(p => (
                    <MenuItem key={p.partNo} value={p.partNo}>
                      {p.partNo} - {p.description}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              disabled={!copyFrom}
              onClick={handleCopyTemplates}
            >
              Copy Templates
            </Button>
          </Box>
        )}
        {loading ? (
          <Box
            sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Button startIcon={<AddIcon />} onClick={handleAdd} variant="outlined" size="small">
                Add Process
              </Button>
            </Box>
            <Grid container spacing={2}>
              {templates.map((process, idx) => (
                <Grid item xs={12} key={idx}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={1}>
                        <Chip label={`Step ${process.sequence}`} color="primary" size="small" />
                      </Grid>
                      <Grid item xs={12} md={7}>
                        <FormControl fullWidth>
                          <InputLabel>Process Name</InputLabel>
                          <Select
                            value={process.name}
                            label="Process Name"
                            onChange={e => handleChange(idx, "name", e.target.value)}
                          >
                            {STANDARD_PROCESS_NAMES.map(name => (
                              <MenuItem key={name} value={name}>
                                {name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Duration (hours)"
                          value={process.duration}
                          onChange={e => handleChange(idx, "duration", Number(e.target.value))}
                          InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                          helperText="Per unit"
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <IconButton color="error" onClick={() => handleRemove(idx)}>
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProcessTemplateDialog;
