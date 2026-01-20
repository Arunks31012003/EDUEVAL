import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import moment from 'moment';

const ReviewedWritingTestsList = ({ onSelectSubmission }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviewedSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/tests/writing-tests/reviewed-submissions');
      setSubmissions(response.data.submissions);
    } catch (err) {
      console.error('Error fetching reviewed writing test submissions:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to fetch reviewed writing test submissions.');
      toast.error(err.response?.data?.message || 'Failed to load reviewed tests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewedSubmissions();
  }, [fetchReviewedSubmissions]);

  if (loading) {
    return <p className="loading-message">Loading reviewed writing tests...</p>;
  }

  if (error) {
    return <p className="error-message">Error: {error}</p>;
  }

  return (
    <div className="writing-tests-list-container">
      <h4 style={{ color: 'white', fontSize: '20px', marginBottom: '1rem' }}>Reviewed Writing Tests</h4>
      {submissions.length === 0 ? (
        <p style={{ color: 'white' }}>No writing tests have been reviewed yet.</p>
      ) : (
        <table
          className="dashboard-table"
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            marginTop: '1rem',
            background: 'transparent',
          }}
        >
          <thead>
            <tr
              style={{
                background: '#4f46e5', // Solid blue background
                color: 'black', // Changed text color to black as requested
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              <th style={{ padding: '12px', textAlign: 'left', borderRadius: '8px 0 0 8px' }}>ID</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Course</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Submitted On</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Scored On</th>
              <th style={{ padding: '12px', textAlign: 'left', borderRadius: '0 8px 8px 0' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)', // Blue-500 translucent
                  color: 'white',
                }}
              >
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{submission.id}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{submission.user_username}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{submission.course_title}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {moment(submission.submitted_at).format('YYYY-MM-DD HH:mm')}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {submission.scored_at ? moment(submission.scored_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {submission.score !== null && submission.total_score !== null ? (
                    <span
                      style={{
                        color: submission.score >= submission.total_score / 2 ? 'lightgreen' : 'orange',
                      }}
                    >
                      {submission.score} / {submission.total_score}
                    </span>
                  ) : (
                    <span style={{ color: 'grey' }}>Not Scored</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReviewedWritingTestsList;
