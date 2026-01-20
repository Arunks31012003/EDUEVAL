// LanguageSelector.js - Component for selecting language
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  const handleLanguageToggle = () => {
    const newLanguage = language === 'en' ? 'kn' : 'en';
    changeLanguage(newLanguage);
  };

  const getLanguageText = () => {
    return language === 'en' ? 'EN' : 'ಕನ್ನಡ';
  };

  return (
    <div className="language-selector flex items-center">
      <button
        onClick={handleLanguageToggle}
        className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 transition-colors"
        title={`Switch to ${language === 'en' ? 'Kannada' : 'English'}`}
      >
        <FontAwesomeIcon icon={faGlobe} className="text-gray-600" />
        <span>{getLanguageText()}</span>
      </button>
    </div>
  );
};

export default LanguageSelector;
