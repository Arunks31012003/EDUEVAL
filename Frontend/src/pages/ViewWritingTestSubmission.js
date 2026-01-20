// src/pages/ViewWritingTestSubmission.js
import React, { useEffect, useState } from 'react';
import api from '../utils/axiosInstance'; // Adjust path as needed
import { toast } from 'react-toastify'; // Ensure toast is imported
import moment from 'moment'; // Make sure you've installed moment: npm install moment
import { formatDuration } from '../utils/time';
import { useTranslation } from 'react-i18next';

const ViewWritingTestSubmission = ({ submissionId, onBackToList, onScoreUpdated }) => {
    const { t } = useTranslation();
    const [submissionDetails, setSubmissionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scoreInput, setScoreInput] = useState('');

    useEffect(() => {
        const fetchSubmissionDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get(`/api/tests/writing-submission/${submissionId}`);
                setSubmissionDetails(response.data.submission);
                setScoreInput(response.data.submission.current_score || ''); // Pre-fill if already scored
                //toast.success('Submission details loaded!');
            } catch (err) {
                console.error('Failed to fetch submission details:', err);
                // More user-friendly error message, distinguish network from API errors
                if (err.response) {
                    // Server responded with a status code that falls out of the range of 2xx
                    setError(err.response.data.message || 'Error loading submission details from server.');
                    toast.error(err.response.data.message || 'Error loading submission details.');
                } else if (err.request) {
                    // The request was made but no response was received (e.g., network error, CORS)
                    setError('Network Error: Could not connect to the server. Please ensure the backend is running and accessible.');
                    toast.error('Network Error: Server unreachable. Please try again later.');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    setError('An unexpected error occurred while setting up the request.');
                    toast.error('An unexpected error occurred.');
                }
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchSubmissionDetails();
        }
    }, [submissionId]);

    const handleScoreChange = (e) => {
        setScoreInput(e.target.value);
    };

    const handleSaveScore = async () => {
        const parsedScore = parseInt(scoreInput, 10);
        if (isNaN(parsedScore) || parsedScore < 0) {
            toast.error('Please enter a valid non-negative number for the score.');
            return;
        }

        try {
            const response = await api.patch(`/api/tests/writing-submission/${submissionId}/score`, { score: parsedScore });
            toast.success(response.data.message || 'Score updated successfully!');
            // Optionally, update the submission details locally or refetch
            setSubmissionDetails(prev => ({ ...prev, current_score: parsedScore }));
            onScoreUpdated(); // Notify parent to refresh the list if needed
        } catch (err) {
            console.error('Failed to update score:', err);
            toast.error(err.response?.data?.message || 'Failed to update score.');
        }
    };

    if (loading) {
        return <div className="loading-message">Loading submission details...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!submissionDetails) {
        return <div className="no-data-message">No submission details available.</div>;
    }

    return (
        <div className="view-writing-submission-container">
            <button onClick={onBackToList} className="back-button">← {t('back')} {t('reviewWritingTest')}</button>
            <h2>{t('reviewWritingTest')}: {submissionDetails.course_name}</h2>
            <div className="submission-header-info">
                <p><strong>User:</strong> {submissionDetails.user_name}</p>
                <p><strong>Date Submitted:</strong> {moment(submissionDetails.date_time).format('YYYY-MM-DD HH:mm')}</p>
                <p><strong>Time Taken:</strong> {formatDuration(submissionDetails.total_time_taken_sec)}</p>
                <p><strong>Current Score:</strong> {submissionDetails.current_score !== null ? submissionDetails.current_score : 'Not yet graded'}</p>
            </div>

            <div className="questions-and-answers">
                <h3>Questions & User Answers:</h3>
                {submissionDetails.questions_and_answers && submissionDetails.questions_and_answers.length > 0 ? (
                    submissionDetails.questions_and_answers.map((qa, index) => (
                        <div key={qa.question_id} className="qa-item">
                            <p><strong>Q{index + 1}:</strong> {qa.question_text}</p>
                            <p><strong>Your Answer:</strong></p>
                            <div className="user-answer-box">
                                {qa.user_answer || 'No answer provided'}
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No questions or answers found for this submission.</p>
                )}
            </div>

            <div className="score-input-section">
                <label htmlFor="score-input">{t('enterScore')}:</label>
                <input
                    id="score-input"
                    type="number"
                    value={scoreInput}
                    onChange={handleScoreChange}
                    min="0"
                    className="score-input-field"
                />
                <button onClick={handleSaveScore} className="action-button save-score-button">
                    {t('saveScore')}
                </button>
            </div>
        </div>
    );
};

export default ViewWritingTestSubmission;