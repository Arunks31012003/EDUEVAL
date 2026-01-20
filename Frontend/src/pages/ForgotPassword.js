// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/login.css';

// Get the API base URL from the environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Cooldown timer
  React.useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => setCooldownRemaining(cooldownRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  // Password strength calculation
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  // Frontend password validation
  const validatePassword = (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/\d/.test(password)) return 'Password must contain at least one number.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character.';
    return null;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.email) return toast.error('Please enter your email');

      setLoading(true);
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
          email: formData.email,
        });
        toast.success(res.data.message || 'OTP sent to email');
        setStep(2);
        setCooldownRemaining(60);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error sending OTP');
      } finally {
        setLoading(false);
      }
    }

    if (step === 2) {
      if (!formData.otp) return toast.error('Please enter the OTP');

      setLoading(true);
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
          email: formData.email,
          otp: formData.otp,
        });
        toast.success(res.data.message || 'OTP verified');
        setStep(3);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Invalid OTP');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (cooldownRemaining > 0) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email: formData.email,
      });
      toast.success(res.data.message || 'OTP sent to email');
      setCooldownRemaining(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!formData.newPassword || !formData.confirmPassword)
      return toast.error('Please enter and confirm the password');

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) return toast.error(passwordError);

    if (formData.newPassword !== formData.confirmPassword)
      return toast.error('Passwords do not match');

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        email: formData.email,
        newPassword: formData.newPassword,
      });

      toast.success(res.data.message || 'Password reset successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-container forgot-password-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Info Section */}
        <div className="welcome-section">
          <h2>Forgot Your Password?</h2>
          <p>Follow the steps to reset it securely:</p>
          <ul className="forgot-steps">
            <li>Enter your email</li>
            <li>Verify the OTP sent to your email</li>
            <li>Set a new password</li>
          </ul>
        </div>

        {/* Right Form Section */}
        <div className="login-box">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <h3>Step 1: Enter Email</h3>
                <input
                  className="input-field"
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <button className="login-button" onClick={handleNext} disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <h3>Step 2: Verify OTP</h3>
                <input
                  className="input-field"
                  type="text"
                  name="otp"
                  placeholder="Enter OTP"
                  value={formData.otp}
                  onChange={handleChange}
                />
                <button className="login-button" onClick={handleNext} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
                <button className="resend-button" onClick={handleResend} disabled={loading || cooldownRemaining > 0}>
                  {cooldownRemaining > 0 ? `Resend in ${cooldownRemaining}s` : 'Resend OTP'}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
              >
                <h3>Step 3: Reset Password</h3>
                <div className="password-toggle-group">
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="New Password"
                    value={formData.newPassword}
                    onChange={handleChange}
                  />
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <label>
                    <input type="checkbox" onChange={togglePasswordVisibility} />
                    Show Password
                  </label>
                  {formData.newPassword && (
                    <div className="password-strength">
                      <div
                        className="strength-bar"
                        style={{
                          width: `${(getPasswordStrength(formData.newPassword) / 5) * 100}%`,
                          backgroundColor: getPasswordStrength(formData.newPassword) < 2 ? 'red' : getPasswordStrength(formData.newPassword) < 4 ? 'orange' : 'green'
                        }}
                      ></div>
                      <p>Strength: {getPasswordStrength(formData.newPassword) < 2 ? 'Weak' : getPasswordStrength(formData.newPassword) < 4 ? 'Medium' : 'Strong'}</p>
                    </div>
                  )}
                </div>
                <button
                  className="login-button"
                  onClick={handleUpdatePassword}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <Link to="/" className="back-link">Back to Login</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
