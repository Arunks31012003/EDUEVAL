// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/axiosInstance';
import '../styles/login.css';

// Import LanguageSelector component
import LanguageSelector from '../components/LanguageSelector';

// Import translation hook
import { useLanguage } from '../context/LanguageContext';


const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const { user, token } = response.data;

      if (!user || !token) {
        setError("Invalid credentials or missing user/token data");
        return;
      }

      // Store user and token in localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);

      // Navigate based on role
      if (user.role === 'admin') {
        navigate('/admin-dashboard', { state: { user } });
      } else if (user.role === 'superadmin') {
        navigate('/superadmin-dashboard', { state: { user } });
      } else if (user.role === 'user') {
        navigate('/user-dashboard', { state: { user } });
      } else {
        setError("Unknown user role");
      }

    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <motion.div 
      className="login-page"
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      transition={{ duration: 0.5 }}
    >
      <div className="login-container">
        <motion.div 
          className="welcome-section"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <h1>{t('welcomeToWebsite')}</h1>
          <div>
            {t('lookingAddSkills')}
            <div>
              {t('newOnlineLearning')}
            </div>
            {t('takeCourses')}
          </div>
          <button className="home-button" onClick={() => navigate('/')}>Home</button>
        </motion.div>

        <motion.div
          className="login-box"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="language-selector-container">
            <LanguageSelector />
          </div>
          <h2>{t('loginTitle')}</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder={t('email')}
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder={t('password')}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="options">
              <label>
                <input type="checkbox" /> {t('remember')}
              </label>
              <a href="/forgot-password">{t('forgotPassword')}</a>
            </div>

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

            <button className="login-button" type="submit">{t('loginIntoAccount')}</button>
<p className="switch-auth">
  {t('dontHaveAccount')} <span className="highlight-text" onClick={() => navigate('/register')}>{t('switchToRegister')}</span>
</p>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};


export default LoginPage;
