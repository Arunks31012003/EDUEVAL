import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import moment from 'moment';
import { formatDuration } from '../utils/time';
import { resolveAudioUrl, getAudioMimeType } from '../utils/media';

const SpeakingSubmissionDetail = ({ submissionId, onBackToList }) => {
    const [submissionDetails, setSubmissionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [score, setScore] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [audioErrors, setAudioErrors] = useState({});

    // Removed BASE_API_URL usage to rely on backend providing full URLs

    const fetchSubmissionDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/tests/speaking-submission/${submissionId}`);
            setSubmissionDetails(response.data.submission);
            // Set initial score if already exists, otherwise empty
            setScore(response.data.submission.current_score !== null ? response.data.submission.current_score : '');
        } catch (err) {
            console.error('Error fetching speaking submission details:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to fetch speaking submission details.');
            toast.error(err.response?.data?.message || 'Failed to fetch speaking submission details.');
        } finally {
            setLoading(false);
        }
    }, [submissionId]); // Re-fetch if submissionId changes

    useEffect(() => {
        if (submissionId) {
            fetchSubmissionDetails();
        }
    }, [submissionId, fetchSubmissionDetails]);

    const handleSaveScore = async () => {
        if (score === '' || isNaN(score) || parseFloat(score) < 0) {
            toast.error('Please enter a valid non-negative number for the score.');
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.patch(`/api/tests/speaking-submission/${submissionId}/score`, { score: parseFloat(score) });
            toast.success(res.data.message);
            // After saving, go back to the list
            onBackToList();
        } catch (err) {
            console.error('Error saving speaking score:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to save score.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <p className="text-center text-white text-lg mt-8">Loading speaking submission details...</p>;
    }

    if (error) {
        return <p className="text-center text-red-400 text-lg mt-8">Error: {error}</p>;
    }

    if (!submissionDetails) {
        return <p className="text-center text-gray-300">No submission details found.</p>;
    }

    return (
        <div className="speaking-submission-detail-container p-6 bg-gray-700 rounded-lg shadow-inner">
            <button
                onClick={onBackToList}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 mb-6"
            >
                ← Back to Review List
            </button>

            <h4 className="text-xl font-bold mb-4 text-purple-300">Review Speaking Test Submission</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-300">
                <p><strong className="text-purple-200">Student Name:</strong> {submissionDetails.user_name}</p>
                <p><strong className="text-purple-200">Course Name:</strong> {submissionDetails.course_name}</p>
                <p><strong className="text-purple-200">Submitted At:</strong> {moment(submissionDetails.date_time).format('YYYY-MM-DD HH:mm:ss')}</p>
                <p><strong className="text-purple-200">Time Taken:</strong> {formatDuration(submissionDetails.total_time_taken_sec)}</p>
                <p><strong className="text-purple-200">Current Score:</strong> {submissionDetails.current_score !== null ? submissionDetails.current_score : 'Not Scored'}</p>
            </div>

            <h5 className="text-xl font-bold mt-6 mb-4 text-purple-300">Recorded Audio Answers:</h5>
            {submissionDetails.questions_and_answers && submissionDetails.questions_and_answers.length > 0 ? (
                <div className="space-y-4">
                    {submissionDetails.questions_and_answers.map((qa, index) => (
                        <div key={qa.question_id} className="bg-gray-600 p-4 rounded-lg shadow-inner">
                            <p className="font-semibold text-lg text-purple-100 mb-2">
                                {index + 1}. Question: {qa.question_text}
                            </p>
                            {qa.audio_url ? (
                                <div className="mt-2">
                                    <audio
                                        controls
                                        className="w-full"
                                        onError={(e) => {
                                            const audio = e.target;
                                            console.error('Audio load error', { path: qa.audio_url, currentSrc: audio.currentSrc, event: e.type });
                                            setAudioErrors(prev => ({ ...prev, [qa.question_id]: true }));
                                            try { audio.style.display = 'none'; } catch (err) { /* ignore */ }
                                        }}
                                    >
                                        <source src={resolveAudioUrl(qa.audio_url)} type={getAudioMimeType(qa.audio_url)} />
                                        Your browser does not support the audio element.
                                    </audio>
                                    {audioErrors[qa.question_id] && (
                                        <div className="text-red-400 mt-2 text-sm">
                                            Audio file appears to be corrupted or unavailable.
                                            <a href={resolveAudioUrl(qa.audio_url)} target="_blank" rel="noopener noreferrer" className="underline ml-2">Try downloading directly</a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-gray-400 mt-2">No audio recorded for this question.</div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-300">No recorded answers found for this submission.</p>
            )}

            <div className="mt-8 pt-6 border-t border-gray-600">
                <label htmlFor="score-input" className="block text-xl font-medium text-purple-300 mb-2">
                    Enter Score:
                </label>
                <input
                    type="number"
                    id="score-input"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    min="0"
                    className="w-40 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white text-lg"
                    placeholder="e.g., 85"
                />
                <button
                    onClick={handleSaveScore}
                    disabled={isSaving}
                    className={`ml-4 px-6 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                        ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}
                    `}
                >
                    {isSaving ? 'Saving...' : 'Save Score'}
                </button>
            </div>
        </div>
    );
};

export default SpeakingSubmissionDetail;
