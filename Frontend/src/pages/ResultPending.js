// ResultPending.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/resultpending.css'; // Assuming you have this CSS file

const ResultPending = () => {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { // Changed condition to <= 1 for robustness
          clearInterval(timer);
          // Defer navigation to the next tick of the event loop
          // This prevents "Cannot update a component while rendering a different component" error
          setTimeout(() => {
            navigate('/user-dashboard');
          }, 0);
          return 0; // Ensure countdown stops at 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]); // Added navigate to dependency array for completeness, though it's stable

  return (
    <div className="pending-container">
      <h1>Thank you</h1>
      <h2>Your test results will be updated shortly</h2> {/* Updated text */}
      <p>Redirecting to dashboard in {countdown} seconds...</p>
    </div>
  );
};

export default ResultPending;
