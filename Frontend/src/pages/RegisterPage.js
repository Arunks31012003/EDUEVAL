import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/login.css';

// Import LanguageSelector component
import LanguageSelector from '../components/LanguageSelector';

// Import translation hook
import { useLanguage } from '../context/LanguageContext';

// Get the API base URL from the environment variable.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Validation rules
  const validationRules = {
    username: {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/,
      textcolor: 'red',
      message: "Username must be 5-20 characters and contain only letters, numbers, and underscores."
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      textcolor: 'red',
      message: "Please enter a valid email address."
    },
    phone: {
      required: true,
      pattern: /^[0-9]{10}$/,
      textcolor: 'red',
      message: "Please enter a valid phone number with 10 digits."
    },
    password: {
      required: true,
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/,
      textcolor: 'red',
      message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character."
    },
    confirmPassword: {
      required: true,
      matchField: 'password',
      textcolor: 'red',
      message: "Passwords must match."
    }
  };

  const validateField = (field, value) => {
    const rules = validationRules[field];
    if (!rules) return null;

    if (rules.required && !value) {
      return "This field is required.";
    }
    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters.`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters.`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message;
    }
    if (rules.matchField && value !== password) {
      return rules.message;
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};
    const values = { username, email, phone, password, confirmPassword };
    Object.keys(validationRules).forEach(field => {
      const value = values[field];
      const error = validateField(field, value);
      if (error) {
        errors[field] = error;
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    try {
         const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          phone,
          password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("🎉 Registration successful! Redirecting to login...");
      console.log("✅ Registered:", data);

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError("Server error. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="welcome-section"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1 style={{ marginBottom: '1px' }}>{t('welcomeAboard')}</h1>
          {/* FIX: Changed nested <p> tags to two separate <p> tags */}
          <p style={{ marginBottom: '0px' }}>{t('joinPlatform')}</p>
          <p style={{ marginBottom: '0px' }}>{t('firstStep')}</p>
          <div className="validation-rules">
            <h3>{t('registrationRules')}</h3>
            <ul>
              <li>{t('usernameRule')}</li>
              <li>{t('emailRule')}</li>
              <li>{t('phoneRule')}</li>
              <li>{t('passwordRule')}</li>
              <li>{t('confirmPasswordRule')}</li>
            </ul>
          </div>
          <button className="home-button" onClick={() => navigate('/')}>Home</button>
        </motion.div>

        <div className="login-box">
          <div className="language-selector-container">
            <LanguageSelector />
          </div>
          <h2>{t('createAccount')}</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder={t('username')}
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            {validationErrors.username && <p className="validation-error" style={{color: 'red'}}>{validationErrors.username}</p>}
            <input
              type="email"
              placeholder={t('email')}
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {validationErrors.email && <p className="validation-error" style={{color: 'red'}}>{validationErrors.email}</p>}
            <input
              type="tel"
              placeholder={t('phoneNumber')}
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          {validationErrors.phone && <p className="validation-error" style={{color: 'red'}}>{validationErrors.phone}</p>}
            <input
              type="password"
              placeholder={t('password')}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {validationErrors.password && <p className="validation-error" style={{color: 'red'}}>{validationErrors.password}</p>}
            <input
              type="password"
              placeholder={t('confirmPassword')}
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {validationErrors.confirmPassword && <p className="validation-error" style={{color: 'red'}}>{validationErrors.confirmPassword}</p>}

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
            {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

            <button className="login-button" type="submit">{t('registerAccount')}</button>

            <p className="switch-auth">
              {t('alreadyHaveAccount')} <span className="highlight-text" onClick={() => navigate('/login')}>{t('switchToLogin')}</span>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
