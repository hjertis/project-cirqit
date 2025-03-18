// src/components/orders/ImportOrdersDialog.tsx
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  Alert,
  AlertTitle,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Papa from 'papaparse';
import { importOrdersBatch } from '../../services/orderImportService';

interface ImportOrdersDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportOrdersDialog = ({ open, onClose }: ImportOrdersDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Progress bar animation
  useState(() => {
    const interval = setInterval(() => {
      if (loading) {
        setProgress((prevProgress) => {
          if (prevProgress >= 100) {
            return 0;
          }
          return Math.min(prevProgress + 10, 100);
        });
      }
    }, 500);

    return () => clearInterval(interval);
  });

  // Reset progress when loading stops
  useState(() => {
    if (!loading) {
      setProgress(100);
    }
  }, [loading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      parseCSV(files[0]);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setResults(results.data);
        console.log('Parsed data:', results.data);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleImport = async () => {
    if (results.length === 0) {
      toast.error('No data to import');
      return;
    }

    setLoading(true);
    try {
      const importResults = await importOrdersBatch(results);
      
      const finishedOrdersCount = importResults.archived || 0;
      
      if (importResults.errors > 0) {
        toast.warning(
          `Imported with some errors: ${importResults.created} created, ${importResults.updated} updated, ${finishedOrdersCount} archived, ${importResults.errors} failed`
        );
      } else {
        toast.success(
          `Successfully imported: ${importResults.created} created, ${importResults.updated} updated, ${finishedOrdersCount} archived`
        );
      }
      
      // Close dialog after successful import
      setTimeout(() => {
        onClose();
        setFile(null);
        setResults([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1500);
    } catch (error) {
      console.error('Error importing orders:', error);
      toast.error(`Error importing orders: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Count finished orders in the CSV
  const getFinishedOrdersCount = () => {
    return results.filter(row => 
      row.Status === "Finished" || row.Status === "Done"
    ).length;
  };

  return (
    <Dialog 
      open={open} 
      onClose={!loading ? onClose : undefined} 
      maxWidth="md" 
      fullWidth
    >
      <ToastContainer />
      <DialogTitle>Import Orders</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>CSV Format</AlertTitle>
            <Typography variant="body2">
              Your CSV file should include these columns: No, Description, SourceNo, Quantity, StartingDateTime, EndingDateTime, Status
            </Typography>
            <Typography variant="body2">
              Optional columns: Notes, State
            </Typography>
          </Alert>

          <TextField
            variant="outlined"
            fullWidth
            value={file?.name || ''}
            placeholder="Select a CSV file"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    onClick={handleBrowseClick}
                    disabled={loading}
                  >
                    Browse
                  </Button>
                </InputAdornment>
              ),
            }}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />
          
          {results.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                {results.length} records ready to import
              </Typography>
              
              {getFinishedOrdersCount() > 0 && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`${getFinishedOrdersCount()} finished orders`} 
                    color="primary" 
                    size="small" 
                  />
                  <Typography variant="body2" color="text.secondary">
                    These will be automatically archived after import
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
        
        {loading && <LinearProgress variant="determinate" value={progress} />}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          color="error"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleImport}
          disabled={loading || results.length === 0}
        >
          {loading ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportOrdersDialog;