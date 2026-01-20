import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import moment from 'moment'; // For date formatting

// This component will now list pending speaking test submissions in a table format.
// It receives a prop `onReviewClick` which is a function from AdminDashboard
// to handle navigating to the detail view of a specific submission.
const SpeakingTestReviews = ({ onReviewClick }) => {
    const [pendingSpeakingReviews, setPendingSpeakingReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to fetch pending speaking test submissions
    const fetchPendingSpeakingReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/tests/speaking-reviews');
            setPendingSpeakingReviews(response.data.reviews || []);
        } catch (err) {
            console.error('Error fetching pending speaking reviews:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to fetch pending speaking reviews.');
            toast.error(err.response?.data?.message || 'Failed to fetch pending speaking reviews.');
        } finally {
            setLoading(false);
        }
    }, []); // No dependencies, as it fetches once on mount or when called manually

    // Fetch data when the component mounts
    useEffect(() => {
        fetchPendingSpeakingReviews();
    }, [fetchPendingSpeakingReviews]);

    if (loading) {
        return <p className="text-center text-white text-lg mt-8">Loading pending speaking tests...</p>;
    }

    if (error) {
        return <p className="text-center text-red-400 text-lg mt-8">Error: {error}</p>;
    }

    if (pendingSpeakingReviews.length === 0) {
        return <p className="text-center text-gray-300">No speaking tests currently pending review.</p>;
    }

    return (
        <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
            <h4 className="text-xl font-bold mb-4 text-purple-200">Pending Speaking Test Reviews</h4>
            <div className="overflow-x-auto rounded-lg">
                <table className="admin-table">
                    <thead className="bg-purple-700 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left">ID</th>
                            <th className="py-3 px-4 text-left">Student Name</th>
                            <th className="py-3 px-4 text-left">Course Name</th>
                            <th className="py-3 px-4 text-left">Submitted At</th>
                            <th className="py-3 px-4 text-left">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingSpeakingReviews.map((review, idx) => (
                            <tr key={review.submission_id} className={`${idx % 2 === 0 ? 'bg-gray-500' : 'bg-gray-600'} border-b border-gray-400 last:border-b-0`}>
                                <td className="py-3 px-4">{review.submission_id}</td>
                                <td className="py-3 px-4">{review.user_name}</td>
                                <td className="py-3 px-4">{review.course_name}</td>
                                <td className="py-3 px-4">{moment(review.date_time).format('YYYY-MM-DD HH:mm')}</td>
                                <td className="py-3 px-4">
                                    <button
                                        onClick={() => onReviewClick(review.submission_id)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SpeakingTestReviews;
