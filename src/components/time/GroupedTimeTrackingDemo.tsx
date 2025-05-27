import { useState } from "react";
import {
  Card,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import {
  Info as InfoIcon,
  PlayArrow as StartIcon,
  Group as GroupIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";

const GroupedTimeTrackingDemo = () => {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: "Select Multiple Orders",
      description:
        "Use the order dropdown to select multiple orders that you want to track time for simultaneously.",
      icon: <GroupIcon />,
    },
    {
      label: "Add Notes (Optional)",
      description: "Add any notes that apply to all the orders in this group session.",
      icon: <InfoIcon />,
    },
    {
      label: "Start Group Tracking",
      description: 'Click "Start Group Tracking" to begin timing all selected orders together.',
      icon: <StartIcon />,
    },
    {
      label: "Manage Active Groups",
      description: "Use the pause, resume, and stop controls to manage your active group sessions.",
      icon: <TimerIcon />,
    },
  ];

  const features = [
    "Track time for multiple orders simultaneously",
    "Pause and resume entire groups at once",
    "View real-time elapsed time for each group",
    "Add final notes when stopping groups",
    "Automatically calculates time for each order in the group",
    "Maintains individual time entries for reporting",
  ];

  const benefits = [
    "More efficient when working on multiple orders",
    "Accurate time tracking across related tasks",
    "Simplified time management workflow",
    "Better project visibility and reporting",
    "Reduces manual time entry errors",
  ];

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<InfoIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        How to Use Group Tracking
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon />
            Group Time Tracking Guide
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Group time tracking allows you to track time for multiple orders simultaneously, perfect
            for when you're working on related tasks or switching between orders frequently.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Key Features
            </Typography>
            <List dense>
              {features.map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <InfoIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              How to Use
            </Typography>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel icon={step.icon}>{step.label}</StepLabel>
                  <StepContent>
                    <Typography>{step.description}</Typography>
                    <Box sx={{ mb: 2 }}>
                      <div>
                        <Button
                          variant="contained"
                          onClick={handleNext}
                          sx={{ mt: 1, mr: 1 }}
                          disabled={index === steps.length - 1}
                        >
                          {index === steps.length - 1 ? "Finish" : "Continue"}
                        </Button>
                        <Button disabled={index === 0} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                          Back
                        </Button>
                      </div>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
            {activeStep === steps.length && (
              <Card variant="outlined" sx={{ mt: 2, p: 2 }}>
                <Typography>
                  You're ready to start using group time tracking! This feature will help you manage
                  time more efficiently across multiple orders.
                </Typography>
                <Button onClick={handleReset} sx={{ mt: 1 }}>
                  Reset Guide
                </Button>
              </Card>
            )}
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Benefits
            </Typography>
            <List dense>
              {benefits.map((benefit, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <TimerIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={benefit} />
                </ListItem>
              ))}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GroupedTimeTrackingDemo;
