// src/pages/ReviewWritingTestsList.js
import React, { useEffect, useState } from 'react';
import api from '../utils/axiosInstance'; // Adjust path as needed
import { toast } from 'react-toastify'; // Ensure toast is imported
import moment from 'moment'; // Make sure you've installed moment: npm install moment
import { formatDuration } from '../utils/time';

const ReviewWritingTestsList = ({ onSelectSubmission }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchWritingReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/tests/writing-reviews');
            setReviews(response.data.reviews);
            //toast.success('Writing tests for review loaded!');
        } catch (err) {
            console.error('Failed to fetch writing test reviews:', err);
            setError('Failed to fetch writing tests for review.');
            toast.error('Failed to load writing tests for review.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWritingReviews();
    }, []);

    if (loading) {
        return <div className="loading-message">Loading writing tests for review...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    return (
        <div className="review-writing-tests-list-container">
            <h2>Writing Tests Pending Review</h2>
            {reviews.length === 0 ? (
                <p>No writing tests currently pending review.</p>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Submission ID</th>
                            <th>User Name</th>
                            <th>Course Name</th>
                            <th>Date & Time</th>
                            <th>Time Taken</th>
                            <th>Total Questions</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reviews.map((review) => (
                            <tr key={review.submission_id}>
                                <td>{review.submission_id}</td>
                                <td>{review.user_name}</td>
                                <td>{review.course_name}</td>
                                <td>{moment(review.date_time).format('YYYY-MM-DD HH:mm')}</td>
                                <td>{formatDuration(review.total_time_taken_sec)}</td>
                                <td>{review.total_questions_submitted}</td>
                                <td>
                                    <button
                                        onClick={() => onSelectSubmission(review.submission_id)}
                                        className="action-button view-button"
                                    >
                                        Review Test
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ReviewWritingTestsList;