import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { formatDuration } from '../utils/time';

const ScorePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, total, timeTaken, courseName, wrongAnswers } = location.state || {};

  // Helper function to convert object answers to readable strings
  const formatAnswer = (answer) => {
    if (typeof answer === 'object' && answer !== null) {
      // Handle fill-in-the-blanks objects like {0: "answer1", 1: "answer2"}
      const values = Object.values(answer);
      return values.join(', ');
    }
    return answer || 'No answer provided';
  };

  // Get user role from localStorage (or default to user)
  let role = 'user';
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role) role = user.role;
  } catch {}

  const handleReturn = () => {
    if (role === 'admin') navigate('/admin-dashboard');
    else if (role === 'superadmin') navigate('/superadmin-dashboard');
    else navigate('/user-dashboard');
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content" style={{ maxWidth: 800, margin: '60px auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#5a67d8', marginBottom: 16 }}>Test Complete!</h2>
        <h3 style={{ color: '#647dee', marginBottom: 24 }}>Course: {courseName}</h3>
        <p style={{ fontSize: 28, fontWeight: 600, marginBottom: 16 }}>Score: <b>{score}</b> / {total}</p>
  <p style={{ fontSize: 18, marginBottom: 32 }}>Time taken: {formatDuration(timeTaken)}</p>

        {/* Display wrong answers */}
        {wrongAnswers && wrongAnswers.length > 0 && (
          <div style={{ textAlign: 'left', marginTop: 40, padding: 20, background: '#f7fafc', borderRadius: 8 }}>
            <h4 style={{ color: '#e53e3e', marginBottom: 16 }}>Incorrect Answers:</h4>
            {wrongAnswers.map((item, index) => (
              <div key={item.questionId} style={{ marginBottom: 20, padding: 15, background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ fontWeight: 'bold', marginBottom: 8 }}>Question {index + 1}: {item.questionText}</p>
                <p style={{ color: '#e53e3e', marginBottom: 4 }}>Your Answer: {formatAnswer(item.userAnswer)}</p>
                <p style={{ color: '#38a169' }}>Correct Answer: {formatAnswer(item.correctAnswer)}</p>
              </div>
            ))}
          </div>
        )}

        <button className="primary-button" style={{ width: 220, fontSize: 18, marginTop: 20 }} onClick={handleReturn}>Return to Dashboard</button>
      </div>
    </div>
  );
};

export default ScorePage;
