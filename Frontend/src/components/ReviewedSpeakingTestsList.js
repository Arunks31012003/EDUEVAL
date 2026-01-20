import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import moment from 'moment'; // For date formatting

const ReviewedSpeakingTestsList = ({ onViewClick }) => {
    const [reviewedSpeakingSubmissions, setReviewedSpeakingSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchReviewedSpeakingSubmissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/tests/speaking-tests/reviewed-submissions');
            setReviewedSpeakingSubmissions(response.data.submissions || []);
        } catch (err) {
            console.error('Error fetching reviewed speaking submissions:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to fetch reviewed speaking submissions.');
            toast.error(err.response?.data?.message || 'Failed to fetch reviewed speaking submissions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReviewedSpeakingSubmissions();
    }, [fetchReviewedSpeakingSubmissions]);

    if (loading) {
        return <p className="text-center text-white text-lg mt-8">Loading reviewed speaking tests...</p>;
    }

    if (error) {
        return <p className="text-center text-red-400 text-lg mt-8">Error: {error}</p>;
    }

    if (reviewedSpeakingSubmissions.length === 0) {
        return <p className="text-center text-gray-300">No speaking tests have been reviewed yet.</p>;
    }

    return (
        <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
            <h4 className="text-xl font-bold mb-4 text-purple-200">Reviewed Speaking Tests</h4>
            <div className="overflow-x-auto rounded-lg">
                <table className="admin-table">
                    <thead className="bg-purple-700 text-white">
                        <tr>
                            <th className="py-3 px-4 text-left">ID</th>
                            <th className="py-3 px-4 text-left">Student Name</th>
                            <th className="py-3 px-4 text-left">Course Name</th>
                            <th className="py-3 px-4 text-left">Submitted At</th>
                            <th className="py-3 px-4 text-left">Score</th>
                            <th className="py-3 px-4 text-left">Scored At</th>
                            {/* Removed Action column */}
                        </tr>
                    </thead>
                    <tbody>
                        {reviewedSpeakingSubmissions.map((submission, idx) => (
                            <tr key={submission.id} className={`${idx % 2 === 0 ? 'bg-gray-500' : 'bg-gray-600'} border-b border-gray-400 last:border-b-0`}>
                                <td className="py-3 px-4">{submission.id}</td>
                                <td className="py-3 px-4">{submission.user_username}</td>
                                <td className="py-3 px-4">{submission.course_title}</td>
                                <td className="py-3 px-4">{moment(submission.submitted_at).format('YYYY-MM-DD HH:mm')}</td>
                                <td className="py-3 px-4">
                                    {submission.score !== null && submission.total_score !== null ? (
                                        <span style={{color: submission.score >= submission.total_score / 2 ? 'lightgreen' : 'orange'}}>
                                            {submission.score} / {submission.total_score}
                                        </span>
                                    ) : (
                                        <span style={{color: 'grey'}}>Not Scored</span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    {submission.scored_at ? moment(submission.scored_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                                </td>
                                {/* Removed Action button column */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReviewedSpeakingTestsList;
