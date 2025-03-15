/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/orders/OrdersImporter.tsx
import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as RestartIcon
} from '@mui/icons-material';
import Papa from 'papaparse';

// Define expected CSV structure based on the old implementation
interface OrderCsvRow {
  No: string;
  Description: string;
  SourceNo: string; // partNo
  Quantity: string | number;
  StartingDateTime: string;
  EndingDateTime: string;
  Status: string;
  Notes?: string;
  State?: string;
  [key: string]: string | number | undefined; // Allow for additional fields
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  data: OrderCsvRow[];
}

const steps = ['Upload CSV', 'Validate Data', 'Import Orders'];

const OrdersImporter = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<OrderCsvRow[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: false,
    errors: [],
    warnings: [],
    data: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setCsvFile(files[0]);
      setActiveStep(1); // Move to validation step
      parseCSV(files[0]);
    }
  };

  // Parse CSV file
  const parseCSV = (file: File) => {
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsLoading(false);
        const data = results.data as OrderCsvRow[];
        setParsedData(data);
        validateData(data);
      },
      error: (error) => {
        setIsLoading(false);
        setImportError(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  // Validate the parsed data
  const validateData = (data: OrderCsvRow[]) => {
    setIsLoading(true);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    // Check for required columns
    const requiredFields = ['No', 'Description', 'SourceNo', 'Quantity', 'StartingDateTime', 'EndingDateTime', 'Status'];
    const firstRow = data[0] || {};
    const missingFields = requiredFields.filter(field => !(field in firstRow));
    
    if (missingFields.length > 0) {
      errors.push({
        row: 0,
        field: 'header',
        message: `Missing required columns: ${missingFields.join(', ')}`
      });
      
      setValidationResult({
        valid: false,
        errors,
        warnings,
        data
      });
      setIsLoading(false);
      return;
    }
    
    // Validate each row
    data.forEach((row, index) => {
      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] && field !== 'Notes' && field !== 'State') {
          errors.push({
            row: index + 1,
            field,
            message: `Missing ${field}`
          });
        }
      });
      
      // Validate order number format
      if (row.No && (isNaN(Number(row.No)) || row.No.trim() === '')) {
        warnings.push({
          row: index + 1,
          field: 'No',
          message: `Order number should be a valid number`
        });
      }
      
      // Validate status
      const validStatuses = ['Released', 'Finished', 'In Progress', 'Planned'];
      if (row.Status && !validStatuses.includes(row.Status)) {
        warnings.push({
          row: index + 1,
          field: 'Status',
          message: `Invalid status. Expected: ${validStatuses.join(', ')}`
        });
      }
      
      // Validate date format (DD-MM-YYYY)
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/; 
      
      if (row.StartingDateTime) {
        if (!dateRegex.test(row.StartingDateTime) || !isValidDate(row.StartingDateTime)) {
          errors.push({
            row: index + 1,
            field: 'StartingDateTime',
            message: 'Invalid date format. Use DD-MM-YYYY'
          });
        }
      }
      
      if (row.EndingDateTime) {
        if (!dateRegex.test(row.EndingDateTime) || !isValidDate(row.EndingDateTime)) {
          errors.push({
            row: index + 1,
            field: 'EndingDateTime',
            message: 'Invalid date format. Use DD-MM-YYYY'
          });
        }
      }
      
      // Validate quantity is a number
      if (row.Quantity && isNaN(Number(row.Quantity))) {
        errors.push({
          row: index + 1,
          field: 'Quantity',
          message: 'Quantity must be a number'
        });
      }
      
      // Check for duplicate order numbers
      const duplicates = data.filter(r => r.No === row.No);
      if (duplicates.length > 1) {
        // Only add this error once per duplicate
        const isDuplicate = duplicates.findIndex(r => r.No === row.No) === index;
        if (isDuplicate) {
          warnings.push({
            row: index + 1,
            field: 'No',
            message: `Duplicate order number: ${row.No}`
          });
        }
      }
    });
    
    setValidationResult({
      valid: errors.length === 0,
      errors,
      warnings,
      data
    });
    setIsLoading(false);
  };
  
  // Helper function to validate date in DD-MM-YYYY format
  const isValidDate = (dateString: string): boolean => {
    // Extract day, month, and year
    const parts = dateString.split('-');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const year = parseInt(parts[2], 10);
    
    // Create a date object and check if it's valid
    const date = new Date(year, month, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    );
  };

  // Handle import of validated data
  const handleImport = async () => {
    setIsLoading(true);
    setImportError(null);
    
    try {
      // Import the order import service
      const orderImportService = await import('../../services/orderImportService');
      
      // Use the import service to process all orders
      const results = await orderImportService.importOrdersBatch(validationResult.data);
      
      // Log results
      console.log('Import results:', results);
      
      if (results.errors > 0) {
        // If there are errors, show first error but continue
        const errorMessage = results.errorMessages[0];
        setImportError(`Some orders could not be imported. ${errorMessage}`);
      }
      
      // Even with some errors, continue to completion if some were successful
      if (results.created > 0 || results.updated > 0) {
        setImportSuccess(true);
        setActiveStep(3); // Move to completion step
      }
    } catch (error) {
      console.error("Error importing orders:", error);
      setImportError(`Error importing orders: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the import process
  const handleReset = () => {
    setCsvFile(null);
    setParsedData([]);
    setValidationResult({
      valid: false,
      errors: [],
      warnings: [],
      data: []
    });
    setImportSuccess(false);
    setImportError(null);
    setActiveStep(0);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file dialog
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Render functions for each step
  const renderUploadStep = () => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: 'none' }}
      />
      <Box 
        sx={{ 
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 5,
          mb: 3
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag and drop a CSV file here
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          or
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleBrowseClick}
          startIcon={<UploadIcon />}
        >
          Browse Files
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">
        The CSV file should contain the following columns: No, Description, SourceNo, Quantity, StartingDateTime, EndingDateTime, Status
      </Typography>
    </Box>
  );

  const renderValidationStep = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Validation Results
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2">
              File: <strong>{csvFile?.name}</strong> ({parsedData.length} rows)
            </Typography>
          </Box>
          
          {validationResult.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Errors Found</AlertTitle>
              <Typography variant="body2">
                Please fix the following errors before importing:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                {validationResult.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>
                    Row {error.row}: {error.message} (Field: {error.field})
                  </li>
                ))}
                {validationResult.errors.length > 5 && (
                  <li>...and {validationResult.errors.length - 5} more errors</li>
                )}
              </Box>
            </Alert>
          )}
          
          {validationResult.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Warnings Found</AlertTitle>
              <Typography variant="body2">
                The following issues were found but will not prevent import:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                {validationResult.warnings.slice(0, 5).map((warning, index) => (
                  <li key={index}>
                    Row {warning.row}: {warning.message} (Field: {warning.field})
                  </li>
                ))}
                {validationResult.warnings.length > 5 && (
                  <li>...and {validationResult.warnings.length - 5} more warnings</li>
                )}
              </Box>
            </Alert>
          )}
          
          {validationResult.valid && validationResult.warnings.length === 0 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Validation Successful</AlertTitle>
              All data is valid and ready for import
            </Alert>
          )}
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Preview Data
          </Typography>
          
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Part No</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.No}</TableCell>
                    <TableCell>{row.Description}</TableCell>
                    <TableCell>{row.SourceNo}</TableCell>
                    <TableCell>{row.Quantity}</TableCell>
                    <TableCell>{row.StartingDateTime}</TableCell>
                    <TableCell>{row.EndingDateTime}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.Status} 
                        size="small" 
                        color={
                          row.Status === 'Released' ? 'primary' :
                          row.Status === 'In Progress' ? 'secondary' :
                          row.Status === 'Finished' ? 'success' :
                          row.Status === 'Planned' ? 'info' : 'default'
                        }
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 5 && (
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing 5 of {parsedData.length} rows
                </Typography>
              </Box>
            )}
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              onClick={handleReset}
              startIcon={<DeleteIcon />}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={() => setActiveStep(2)}
              disabled={!validationResult.valid}
            >
              Continue
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  const renderImportStep = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Import Orders
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Ready to Import</AlertTitle>
        You are about to import {parsedData.length} orders into the system
      </Alert>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Summary:</strong>
        </Typography>
        <Box sx={{ pl: 2 }}>
          <Typography variant="body2">
            • Total Orders: {parsedData.length}
          </Typography>
          <Typography variant="body2">
            • Released: {parsedData.filter(row => row.Status === 'Released').length}
          </Typography>
          <Typography variant="body2">
            • In Progress: {parsedData.filter(row => row.Status === 'In Progress').length}
          </Typography>
          <Typography variant="body2">
            • Finished: {parsedData.filter(row => row.Status === 'Finished').length}
          </Typography>
          <Typography variant="body2">
            • Planned: {parsedData.filter(row => row.Status === 'Planned').length}
          </Typography>
          <Typography variant="body2">
            • Urgent: {parsedData.filter(row => row.State === 'URGENT').length}
          </Typography>
        </Box>
      </Box>
      
      {importError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Import Failed</AlertTitle>
          {importError}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          onClick={() => setActiveStep(1)}
          disabled={isLoading}
        >
          Back
        </Button>
        <Button 
          variant="contained" 
          onClick={handleImport}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={24} /> : null}
        >
          {isLoading ? 'Importing...' : 'Import Orders'}
        </Button>
      </Box>
    </Box>
  );

  const renderCompletionStep = () => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Import Completed Successfully
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Orders have been imported into the system. Any duplicate order numbers were updated with the new information.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={handleReset}
          startIcon={<RestartIcon />}
        >
          Import Another File
        </Button>
        <Button 
          variant="contained" 
          onClick={() => window.location.href = '/orders'}
        >
          Go to Orders
        </Button>
      </Box>
    </Box>
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5">Import Orders</Typography>
      </Box>
      
      <Stepper activeStep={activeStep} sx={{ p: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Divider />
      
      {activeStep === 0 && renderUploadStep()}
      {activeStep === 1 && renderValidationStep()}
      {activeStep === 2 && renderImportStep()}
      {activeStep === 3 && renderCompletionStep()}
    </Paper>
  );
};

export default OrdersImporter;