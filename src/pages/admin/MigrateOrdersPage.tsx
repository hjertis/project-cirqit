import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Breadcrumbs,
  Link,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  MoveToInbox as MoveToInboxIcon,
  Storage as StorageIcon,
  ArrowForward as ArrowForwardIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import {
  migrateFinishedOrders,
  migrateRelatedProcesses,
} from "../../scripts/migrateFinishedOrders";

const steps = [
  {
    label: "Migrate Finished Orders",
    description: 'Move all orders with "Finished" or "Done" status to the archive collection.',
  },
  {
    label: "Migrate Related Processes",
    description: "Move all processes related to archived orders to the archive.",
  },
  {
    label: "Review and Verify",
    description: "Confirm that all data has been migrated correctly.",
  },
];

const MigrateOrdersPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [processesResults, setProcessesResults] = useState<any>(null);
  const [processesError, setProcessesError] = useState<string | null>(null);

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setMigrationResults(null);
    setMigrationError(null);
    setProcessesResults(null);
    setProcessesError(null);
  };

  const handleMigrateOrders = async () => {
    setIsProcessing(true);
    setMigrationError(null);

    try {
      const results = await migrateFinishedOrders();
      setMigrationResults(results);

      if (results.success || results.totalMigrated > 0) {
        handleNext();
      }
    } catch (error) {
      console.error("Error during migration:", error);
      setMigrationError(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMigrateProcesses = async () => {
    setIsProcessing(true);
    setProcessesError(null);

    try {
      const results = await migrateRelatedProcesses();
      setProcessesResults(results);

      if (results.success) {
        handleNext();
      }
    } catch (error) {
      console.error("Error during process migration:", error);
      setProcessesError(
        `Process migration failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
          <Link component={RouterLink} to="/" color="inherit">
            Dashboard
          </Link>
          <Link component={RouterLink} to="/admin" color="inherit">
            Admin
          </Link>
          <Typography color="text.primary">Migrate Orders</Typography>
        </Breadcrumbs>

        <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
          Migrate Finished Orders to Archive
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Important Information</AlertTitle>
          <Typography variant="body2" paragraph>
            This utility will move all orders with "Finished" or "Done" status to a separate archive
            collection. This helps maintain performance by keeping your active orders collection
            lean.
          </Typography>
          <Typography variant="body2">
            The process is performed in batches and is resumable if interrupted. Orders that have
            already been migrated will be skipped.
          </Typography>
        </Alert>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography>{step.description}</Typography>
                <Box sx={{ mb: 2, mt: 2 }}>
                  {index === 0 && (
                    <>
                      {migrationResults ? (
                        <Box sx={{ mb: 2 }}>
                          <Alert severity={migrationResults.success ? "success" : "warning"}>
                            <AlertTitle>
                              {migrationResults.success
                                ? "Migration Successful"
                                : "Migration Completed with Issues"}
                            </AlertTitle>
                            <Typography variant="body2">{migrationResults.message}</Typography>
                          </Alert>

                          <List dense>
                            <ListItem>
                              <ListItemIcon>
                                <StorageIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`Total orders processed: ${migrationResults.totalProcessed}`}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon>
                                <MoveToInboxIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`Orders migrated to archive: ${migrationResults.totalMigrated}`}
                              />
                            </ListItem>
                            {migrationResults.totalErrors > 0 && (
                              <ListItem>
                                <ListItemIcon>
                                  <ErrorIcon color="error" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={`Errors encountered: ${migrationResults.totalErrors}`}
                                  secondary="Check console logs for details"
                                />
                              </ListItem>
                            )}
                          </List>
                        </Box>
                      ) : migrationError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <AlertTitle>Migration Failed</AlertTitle>
                          {migrationError}
                        </Alert>
                      ) : null}

                      <div>
                        <Button
                          variant="contained"
                          onClick={handleMigrateOrders}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={isProcessing}
                          startIcon={
                            isProcessing ? <CircularProgress size={20} /> : <ArrowForwardIcon />
                          }
                        >
                          {isProcessing ? "Migrating..." : "Migrate Orders"}
                        </Button>
                        <Button
                          disabled={activeStep === 0 || isProcessing}
                          onClick={handleBack}
                          sx={{ mt: 1, mr: 1 }}
                        >
                          Back
                        </Button>
                      </div>
                    </>
                  )}

                  {index === 1 && (
                    <>
                      {processesResults ? (
                        <Box sx={{ mb: 2 }}>
                          <Alert severity={processesResults.success ? "success" : "warning"}>
                            <AlertTitle>
                              {processesResults.success
                                ? "Process Migration Successful"
                                : "Process Migration Completed with Issues"}
                            </AlertTitle>
                            <Typography variant="body2">{processesResults.message}</Typography>
                          </Alert>

                          {processesResults.totalProcessed > 0 && (
                            <List dense>
                              <ListItem>
                                <ListItemIcon>
                                  <StorageIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={`Total processes processed: ${processesResults.totalProcessed}`}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemIcon>
                                  <MoveToInboxIcon color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={`Processes migrated to archive: ${processesResults.totalMigrated}`}
                                />
                              </ListItem>
                              {processesResults.totalErrors > 0 && (
                                <ListItem>
                                  <ListItemIcon>
                                    <ErrorIcon color="error" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={`Errors encountered: ${processesResults.totalErrors}`}
                                    secondary="Check console logs for details"
                                  />
                                </ListItem>
                              )}
                            </List>
                          )}
                        </Box>
                      ) : processesError ? (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <AlertTitle>Process Migration Failed</AlertTitle>
                          {processesError}
                        </Alert>
                      ) : null}

                      <div>
                        <Button
                          variant="contained"
                          onClick={handleMigrateProcesses}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={isProcessing}
                          startIcon={
                            isProcessing ? <CircularProgress size={20} /> : <ArrowForwardIcon />
                          }
                        >
                          {isProcessing ? "Migrating Processes..." : "Migrate Processes"}
                        </Button>
                        <Button disabled={isProcessing} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                          Back
                        </Button>
                      </div>
                    </>
                  )}

                  {index === 2 && (
                    <>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <AlertTitle>Migration Complete</AlertTitle>
                        <Typography variant="body2" paragraph>
                          The migration process has completed successfully. Finished orders have
                          been moved to the archive collection, and active orders remain in the main
                          collection.
                        </Typography>
                        <Typography variant="body2">
                          You can now view your archived orders in the Archived Orders page.
                        </Typography>
                      </Alert>

                      <Box sx={{ mt: 3, mb: 1 }}>
                        <Button
                          component={RouterLink}
                          to="/orders/archived"
                          variant="contained"
                          sx={{ mr: 2 }}
                        >
                          View Archived Orders
                        </Button>
                        <Button onClick={handleReset} variant="outlined">
                          Reset Migration Tool
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
    </Box>
  );
};

export default MigrateOrdersPage;
