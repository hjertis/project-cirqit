// src/pages/auth/Signup.tsx
import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Link,
  Grid,
  Container,
  Avatar,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const steps = ['Account Details', 'Personal Information', 'Review'];

const Signup = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: ''
  });
  const [errors, setErrors] = useState({} as Record<string, string>);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  
  const handleChange = (field: keyof typeof formData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    
    // Clear error when field is modified
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };
  
  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (activeStep === 0) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email is invalid';
      }
      
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (activeStep === 1) {
      if (!formData.firstName) {
        newErrors.firstName = 'First name is required';
      }
      
      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep()) {
      if (activeStep === steps.length - 1) {
        handleSubmit();
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Here you would typically call your authentication service
      // await authService.register(formData);
      
      // For now, just simulate registration
      setTimeout(() => {
        console.log('Registered user:', formData);
        // Redirect to login
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange('password')}
              error={!!errors.password}
              helperText={errors.password}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={isLoading}
            />
          </>
        );
      case 1:
        return (
          <>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              fullWidth
              id="company"
              label="Company"
              name="company"
              autoComplete="organization"
              value={formData.company}
              onChange={handleChange('company')}
              disabled={isLoading}
            />
            <TextField
              margin="normal"
              fullWidth
              id="phone"
              label="Phone Number"
              name="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              disabled={isLoading}
            />
          </>
        );
      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Please review your information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Email:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">{formData.email}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  First Name:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">{formData.firstName}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Last Name:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">{formData.lastName}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Company:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">{formData.company || '-'}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Phone:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">{formData.phone || '-'}</Typography>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 4,
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign up
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ width: '100%', mt: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box component="form" noValidate sx={{ mt: 3, width: '100%' }}>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0 || isLoading}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isLoading}
            >
              {activeStep === steps.length - 1
                ? (isLoading ? 'Creating Account...' : 'Create Account')
                : 'Next'}
            </Button>
          </Box>
          
          <Grid container justifyContent="flex-end" sx={{ mt: 3 }}>
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;