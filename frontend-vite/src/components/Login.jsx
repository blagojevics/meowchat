import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Google } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState('local'); // 'local' or 'firebase'
  const [errors, setErrors] = useState({});

  const { login, loginWithFirebase, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (result.success) {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    let result;
    if (loginMode === 'firebase') {
      result = await loginWithFirebase(formData.email, formData.password);
    } else {
      result = await login(formData.email, formData.password);
    }
    
    if (result.success) {
      navigate('/');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            width: '100%',
            borderRadius: 2 
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" color="primary" fontWeight="bold">
              🐱 MeowChat
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
              Welcome back!
            </Typography>
          </Box>

          {/* Login Mode Selection */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Login Method
            </Typography>
            <ToggleButtonGroup
              value={loginMode}
              exclusive
              onChange={(e, newMode) => newMode && setLoginMode(newMode)}
              aria-label="login mode"
              size="small"
            >
              <ToggleButton value="local" aria-label="local login">
                Local Account
              </ToggleButton>
              <ToggleButton value="firebase" aria-label="firebase login">
                Meowgram Account
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              {loginMode === 'firebase' 
                ? 'Use your existing Meowgram credentials' 
                : 'Use your MeowChat local account'
              }
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
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
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
              size="large"
            >
              {loading 
                ? (loginMode === 'firebase' ? 'Signing In with Meowgram...' : 'Signing In...') 
                : (loginMode === 'firebase' ? 'Sign In with Meowgram' : 'Sign In')
              }
            </Button>

            {/* Google Sign-In Button */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Google />}
              onClick={handleGoogleLogin}
              disabled={loading}
              size="large"
              sx={{ 
                mb: 2, 
                py: 1.5,
                borderColor: '#db4437',
                color: '#db4437',
                '&:hover': {
                  borderColor: '#c23321',
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              {loading ? 'Connecting...' : 'Continue with Google'}
            </Button>

            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
              Google sign-in works with your existing Meowgram account
            </Typography>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;