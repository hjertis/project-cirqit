import { useState, useRef, useEffect } from "react";
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
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as RestartIcon,
} from "@mui/icons-material";
import Papa from "papaparse";

interface OrderCsvRow {
  No: string;
  Description: string;
  SourceNo: string;
  Quantity: string | number;
  StartingDateTime: string;
  EndingDateTime: string;
  Status: string;
  Notes?: string;
  State?: string;
  FinishedDate?: string; // Add FinishedDate field
  [key: string]: string | number | undefined;
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

const steps = ["Upload CSV", "Map Columns", "Validate Data", "Import Orders"];

const requiredFields = [
  { key: "No", label: "Order Number" },
  { key: "Description", label: "Description" },
  { key: "SourceNo", label: "Part Number" },
  { key: "Quantity", label: "Quantity" },
  { key: "StartingDateTime", label: "Start Date" },
  { key: "EndingDateTime", label: "End Date" },
  { key: "Status", label: "Status" },
];

const OrdersImporter = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<OrderCsvRow[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: false,
    errors: [],
    warnings: [],
    data: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [detectRemovedOrders, setDetectRemovedOrders] = useState<boolean>(true);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setCsvFile(files[0]);
      setActiveStep(1);
      parseCSV(files[0]);
    }
  };

  const parseCSV = (file: File) => {
    setIsLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.replace(/[^a-zA-Z0-9_]/g, "_").trim(),
      complete: results => {
        setIsLoading(false);
        const data = results.data as OrderCsvRow[];
        setParsedData(data);
      },
      error: error => {
        setIsLoading(false);
        setImportError(`Error parsing CSV: ${error.message}`);
      },
    });
  };

  // Helper to strip time from date-time strings, trim whitespace, remove trailing non-date chars, and convert 2-digit years to 4-digit
  const getDateOnly = (value: string) => {
    if (!value) return "";
    let datePart = value.split(/[ T]/)[0].trim();
    datePart = datePart.replace(/[^0-9\/-]/g, "");
    // Convert 2-digit year to 4-digit (assume 20xx)
    const match = datePart.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}-20${match[3]}`;
    }
    return datePart;
  };

  const validateData = (data: OrderCsvRow[]) => {
    setIsLoading(true);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Use columnMapping to get the actual CSV column for each required field
    const mappedFields = requiredFields.map(field => ({
      ...field,
      csvColumn: columnMapping[field.key],
    }));

    const firstRow = data[0] || {};
    const missingFields = mappedFields.filter(
      field => !field.csvColumn || !(field.csvColumn in firstRow)
    );

    if (missingFields.length > 0) {
      errors.push({
        row: 0,
        field: "header",
        message: `Missing required columns: ${missingFields.map(f => f.label).join(", ")}`,
      });
      setValidationResult({
        valid: false,
        errors,
        warnings,
        data: [],
      });
      setIsLoading(false);
      return;
    }

    // Build normalized data using mapping
    const normalizedData = data.map(row => {
      const obj: any = {};
      mappedFields.forEach(field => {
        let value = row[field.csvColumn] ?? "";
        // For date fields, strip time part
        if (["StartingDateTime", "EndingDateTime", "FinishedDate"].includes(field.key)) {
          value = getDateOnly(String(value));
        }
        // For Quantity, strip all non-digit characters
        if (field.key === "Quantity") {
          value = String(value).replace(/[^0-9]/g, "");
        }
        obj[field.key] = value;
      });
      // Optional fields
      obj.Notes = row[columnMapping["Notes"]] ?? row.Notes ?? "";
      obj.State = row[columnMapping["State"]] ?? row.State ?? "";
      obj.FinishedDate = getDateOnly(
        String(row[columnMapping["FinishedDate"]] ?? row.FinishedDate ?? "")
      );
      return obj;
    });

    normalizedData.forEach((row, index) => {
      mappedFields.forEach(field => {
        if (!row[field.key] && field.key !== "Notes" && field.key !== "State") {
          errors.push({
            row: index + 1,
            field: field.key,
            message: `Missing ${field.label}`,
          });
        }
      });

      if (!row.No || row.No.trim() === "") {
        errors.push({
          row: index + 1,
          field: "No",
          message: `Order number is required`,
        });
      }

      const validStatuses = ["Released", "Finished", "In Progress", "Firm Planned", "Removed"];
      if (row.Status && !validStatuses.includes(row.Status)) {
        warnings.push({
          row: index + 1,
          field: "Status",
          message: `Invalid status. Expected: ${validStatuses.join(", ")}`,
        });
      }

      const dateRegex = /^\d{2}[-/]\d{2}[-/]\d{4}$/;

      if (row.StartingDateTime) {
        if (!dateRegex.test(row.StartingDateTime) || !isValidDate(row.StartingDateTime)) {
          errors.push({
            row: index + 1,
            field: "StartingDateTime",
            message: "Invalid date format. Supported formats are DD-MM-YYYY and DD/MM/YYYY",
          });
        }
      }

      if (row.EndingDateTime) {
        if (!dateRegex.test(row.EndingDateTime) || !isValidDate(row.EndingDateTime)) {
          errors.push({
            row: index + 1,
            field: "EndingDateTime",
            message: "Invalid date format. Supported formats are DD-MM-YYYY and DD/MM/YYYY",
          });
        }
      }

      // Add validation for FinishedDate if present
      if (row.FinishedDate) {
        if (!dateRegex.test(row.FinishedDate) || !isValidDate(row.FinishedDate)) {
          errors.push({
            row: index + 1,
            field: "FinishedDate",
            message: "Invalid date format. Supported formats are DD-MM-YYYY and DD/MM/YYYY",
          });
        }
        // Add warning if finished date is present but status isn't "Finished" or "Done"
        if (row.Status && row.Status !== "Finished" && row.Status !== "Done") {
          warnings.push({
            row: index + 1,
            field: "FinishedDate",
            message: "FinishedDate provided but order status is not Finished or Done",
          });
        }
      }

      if (row.Quantity && isNaN(Number(row.Quantity))) {
        errors.push({
          row: index + 1,
          field: "Quantity",
          message: "Quantity must be a number",
        });
      }

      // Check for duplicates in normalized data
      const duplicates = normalizedData.filter(r => r.No === row.No);
      if (duplicates.length > 1) {
        const isDuplicate = duplicates.findIndex(r => r.No === row.No) === index;
        if (isDuplicate) {
          warnings.push({
            row: index + 1,
            field: "No",
            message: `Duplicate order number: ${row.No}`,
          });
        }
      }
    });

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
      data: normalizedData,
    };
    setValidationResult(result);
    setIsLoading(false);
  };

  const isValidDate = (dateString: string): boolean => {
    // Accept both 2-digit and 4-digit years
    const formats = ["DD-MM-YYYY", "DD/MM/YYYY", "DD-MM-YY", "DD/MM/YY"];
    return formats.some(format => {
      let parts;
      if (format.includes("/")) {
        parts = dateString.split("/");
      } else {
        parts = dateString.split("-");
      }
      if (parts.length !== 3) return false;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (parts[2].length === 2) {
        year = 2000 + year;
      }
      const date = new Date(year, month, day);
      return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
    });
  };

  const handleImport = async () => {
    if (validationResult.data.length === 0) {
      console.log("No data to import");
      return;
    }

    setIsLoading(true);
    setImportError(null);

    try {
      const orderImportService = await import("../../services/orderImportService");

      const importResults = await orderImportService.importOrdersBatch(
        validationResult.data,
        detectRemovedOrders
      );

      setImportResults(importResults);
      setActiveStep(3);
    } catch (error) {
      console.error("Error importing orders:", error);
      setImportError(
        `Error importing orders: ${error instanceof Error ? error.message : String(error)}`
      );
      setActiveStep(3); // Show completion step even on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCsvFile(null);
    setParsedData([]);
    setValidationResult({
      valid: false,
      errors: [],
      warnings: [],
      data: [],
    });
    setImportError(null);
    setActiveStep(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Extract CSV headers from first row
  const csvHeaders = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];

  // Render column mapping step
  const renderMappingStep = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Map CSV Columns
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Please map each required field to a column in your CSV file.
      </Typography>
      {requiredFields.map(field => (
        <Box key={field.key} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {field.label}
          </Typography>
          <select
            value={columnMapping[field.key] || ""}
            onChange={e =>
              setColumnMapping(mapping => ({
                ...mapping,
                [field.key]: e.target.value,
              }))
            }
            style={{ minWidth: 200, padding: 8 }}
          >
            <option value="">-- Select column --</option>
            {csvHeaders.map(header => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </Box>
      ))}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={handleReset} startIcon={<DeleteIcon />}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => validateData(parsedData)}
          disabled={requiredFields.some(f => !columnMapping[f.key])}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );

  // Advance to validation step only after validation passes
  useEffect(() => {
    if (activeStep === 1 && validationResult.valid) {
      setActiveStep(2);
    }
  }, [validationResult.valid, activeStep]);

  const renderUploadStep = () => (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: "none" }}
      />
      <Box
        sx={{
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 5,
          mb: 3,
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag and drop a CSV file here
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          or
        </Typography>
        <Button variant="contained" onClick={handleBrowseClick} startIcon={<UploadIcon />}>
          Browse Files
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary">
        The CSV file should contain the following columns: No, Description, SourceNo, Quantity,
        StartingDateTime, EndingDateTime, Status
      </Typography>
    </Box>
  );

  const renderValidationStep = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Validation Results
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
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
                  {requiredFields.map(field => (
                    <TableCell key={field.key}>{field.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    {requiredFields.map(field => (
                      <TableCell key={field.key}>{row[columnMapping[field.key]] || "-"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 5 && (
              <Box sx={{ p: 1, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Showing 5 of {parsedData.length} rows
                </Typography>
              </Box>
            )}
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Button onClick={handleReset} startIcon={<DeleteIcon />}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep(3)}
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
    <Box sx={{ p: 3, position: "relative" }}>
      <Typography variant="h6" gutterBottom>
        Import Orders
      </Typography>{" "}
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Ready to Import</AlertTitle>
        You are about to import {parsedData.length} orders into the system
      </Alert>{" "}
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={detectRemovedOrders}
              onChange={e => setDetectRemovedOrders(e.target.checked)}
              color="primary"
            />
          }
          label="Auto-detect removed orders (mark orders that exist in the system but not in this import file as Removed)"
        />
        {detectRemovedOrders && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 4 }}>
            Orders that are currently active in the system (not Finished, Done, or Removed) but
            don't appear in this import file will be automatically marked as Removed.
          </Typography>
        )}
      </Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Summary:</strong>
        </Typography>
        <Box sx={{ pl: 2 }}>
          <Typography variant="body2">• Total Orders: {parsedData.length}</Typography>
          <Typography variant="body2">
            • Released: {parsedData.filter(row => row.Status === "Released").length}
          </Typography>
          <Typography variant="body2">
            • In Progress: {parsedData.filter(row => row.Status === "In Progress").length}
          </Typography>
          <Typography variant="body2">
            • Finished: {parsedData.filter(row => row.Status === "Finished").length}
          </Typography>
          <Typography variant="body2">
            • Done: {parsedData.filter(row => row.Status === "Done").length}
          </Typography>{" "}
          <Typography variant="body2">
            • Planned: {parsedData.filter(row => row.Status === "Planned").length}
          </Typography>
          <Typography variant="body2">
            • Removed: {parsedData.filter(row => row.Status === "Removed").length}
          </Typography>
          {parsedData.filter(row => row.Status === "Finished" || row.Status === "Done").length >
            0 && (
            <Typography variant="body2" sx={{ mt: 1, color: "primary.main", fontWeight: "medium" }}>
              Note:{" "}
              {parsedData.filter(row => row.Status === "Finished" || row.Status === "Done").length}{" "}
              finished orders will be automatically archived
            </Typography>
          )}{" "}
          {parsedData.filter(row => row.Status === "Removed").length > 0 && (
            <Typography variant="body2" sx={{ mt: 1, color: "error.main", fontWeight: "medium" }}>
              Note: {parsedData.filter(row => row.Status === "Removed").length} orders will be
              marked as removed with the current date as removal date
            </Typography>
          )}
          {detectRemovedOrders && (
            <Typography variant="body2" sx={{ mt: 1, color: "warning.main", fontWeight: "medium" }}>
              Auto-detection is enabled: Any orders in the system that are not in this import file
              will be automatically marked as Removed
            </Typography>
          )}
        </Box>
      </Box>
      {importError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Import Failed</AlertTitle>
          {importError}
        </Alert>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button onClick={() => setActiveStep(1)} disabled={isLoading}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={24} /> : null}
        >
          {isLoading ? "Importing..." : "Import Orders"}
        </Button>
      </Box>
      {isLoading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1">Importing orders, please wait...</Typography>
        </Box>
      )}
    </Box>
  );

  const renderCompletionStep = () => (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Import Completed Successfully
      </Typography>{" "}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Orders have been imported into the system. Any duplicate order numbers were updated with the
        new information.
        {importResults &&
          importResults.archived > 0 &&
          ` ${importResults.archived} orders with "Finished" or "Done" status were automatically archived.`}
        {importResults &&
          importResults.removed > 0 &&
          ` ${importResults.removed} orders were marked as removed.`}
        {importResults &&
          importResults.autoRemoved > 0 &&
          ` ${importResults.autoRemoved} orders not found in the import file were automatically marked as removed.`}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button variant="outlined" onClick={handleReset} startIcon={<RestartIcon />}>
          Import Another File
        </Button>
        <Button variant="contained" onClick={() => (window.location.href = "/orders")}>
          Go to Orders
        </Button>{" "}
        {importResults && importResults.archived > 0 && (
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => (window.location.href = "/orders/archived")}
          >
            View Archived Orders
          </Button>
        )}{" "}
        {importResults && (importResults.removed > 0 || importResults.autoRemoved > 0) && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => (window.location.href = "/removed-orders")}
          >
            View Removed Orders
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h5">Import Orders</Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ p: 3 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Divider />

      {activeStep === 0 && renderUploadStep()}
      {activeStep === 1 && renderMappingStep()}
      {activeStep === 2 && renderValidationStep()}
      {activeStep === 3 && renderImportStep()}
      {activeStep === 4 && renderCompletionStep()}
    </Paper>
  );
};

export default OrdersImporter;
