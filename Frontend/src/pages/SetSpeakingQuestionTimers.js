import React, { useState, useEffect } from 'react';
import api from '../utils/axiosInstance';
import '../styles/dashboard.css'; // Assuming common dashboard styles

const SetSpeakingQuestionTimers = () => {
    console.log('SetSpeakingQuestionTimers.js component mounted.');

    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourse] = useState('');
    const [speakingQuestions, setSpeakingQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newTimers, setNewTimers] = useState({}); // { questionId: newTimerValueInMinutes }

    useEffect(() => {
        console.log('useEffect: Fetching courses...');
        const fetchCourses = async () => {
            try {
                const res = await api.get('/api/courses');
                console.log('API Response for /api/courses:', res.data);
                // Filter for 'Speaking' courses
                const speakingCourses = res.data.courses.filter(course => course.type === 'Speaking');
                setCourses(speakingCourses);
                console.log('Filtered Speaking Courses (from /api/courses):', speakingCourses);
            } catch (err) {
                console.error('Error fetching courses:', err.response?.data || err.message);
                setError('Failed to load courses.');
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        console.log('useEffect: selectedCourseId changed to:', selectedCourseId);
        const fetchSpeakingQuestions = async () => {
            if (!selectedCourseId) {
                console.log('No course selected, clearing questions and timers.');
                setSpeakingQuestions([]);
                setNewTimers({}); // Clear timers when no course is selected
                return;
            }
            console.log('Fetching speaking questions for course ID:', selectedCourseId);
            setLoading(true);
            setError('');
            console.log(`Attempting to fetch speaking questions for course ID: ${selectedCourseId} from /api/tests/course-details-with-questions/${selectedCourseId}`);
            try {
                // Fetch course details and all questions for the selected course
                const res = await api.get(`/api/tests/course-details-with-questions/${selectedCourseId}`);
                console.log('Backend response for course details with questions (raw res.data):', res.data);

                // Check if res.data.questions exists and is an array
                if (!res.data || !Array.isArray(res.data.questions)) {
                    console.warn('Backend response does not contain a "questions" array as expected.');
                    setSpeakingQuestions([]);
                    setNewTimers({});
                    setError('Invalid data format from server. No questions array found.');
                    return;
                }

                // Filter for speaking questions and map them to include the timer_duration_minutes
                console.log('All questions received from API:', res.data.questions);
                const fetchedQuestions = res.data.questions
                    .filter(q => { // ✅ Re-enabled filter
                        console.log(`Question ID ${q.id} has question_type: "${q.question_type}"`);
                        const isSpeaking = q.question_type && q.question_type.toLowerCase() === 'speaking';
                        if (!isSpeaking) {
                            console.log(`Skipping non-speaking question (ID: ${q.id}, Type: ${q.question_type})`);
                        }
                        return isSpeaking;
                    })
                    .map(q => {
                        // Access 'timer' property directly from backend response (which is timer_duration_seconds)
                        // Convert seconds to minutes for display and input
                        const timerInSeconds = q.timer;
                        const timerInMinutes = (typeof timerInSeconds === 'number' && !isNaN(timerInSeconds))
                            ? parseFloat(timerInSeconds) / 60
                            : 0; // Default to 0 if NaN or not a number

                        console.log(`Mapping question ID ${q.id}: Raw timer=${q.timer}, Calculated timer_duration_minutes=${timerInMinutes}`);

                        return {
                            ...q,
                            timer_duration_minutes: timerInMinutes
                        };
                    });

                console.log('Filtered Speaking Questions (after frontend processing):', fetchedQuestions);
                setSpeakingQuestions(fetchedQuestions);

                // Initialize newTimers state with current values for input fields
                const initialNewTimers = {};
                fetchedQuestions.forEach(q => {
                    // Initialize input field with the current timer duration in minutes
                    initialNewTimers[q.id] = (typeof q.timer_duration_minutes === 'number' && !isNaN(q.timer_duration_minutes))
                        ? q.timer_duration_minutes
                        : ''; // Set to empty string if not a valid number for input field
                });
                setNewTimers(initialNewTimers);
                console.log('Initial New Timers state (for input fields):', initialNewTimers);

            } catch (err) {
                console.error('Error fetching speaking questions:', err.response?.data || err.message);
                setError(err.response?.data?.message || 'Failed to load speaking questions for the selected course.');
                setSpeakingQuestions([]);
                setNewTimers({});
            } finally {
                setLoading(false);
            }
        };

        fetchSpeakingQuestions();
    }, [selectedCourseId]);

    const handleTimerChange = (questionId, value) => {
        const parsedValue = parseFloat(value);
        let valueToStore;

        if (value === '') {
            valueToStore = '';
        } else if (isNaN(parsedValue)) {
            valueToStore = '';
        } else {
            valueToStore = parsedValue;
        }

        setNewTimers(prev => ({
            ...prev,
            [questionId]: valueToStore
        }));
    };

    const handleUpdateTimer = async (questionId) => {
        const timerValueFromState = newTimers[questionId];
        const timerValueInMinutes = Number(timerValueFromState) || 0; // Convert to number, default to 0

        if (isNaN(timerValueInMinutes) || timerValueInMinutes < 0) {
            alert('Please enter a valid non-negative number for the timer duration.');
            return;
        }

        // Backend expects seconds, so convert minutes to seconds
        const timerValueInSeconds = timerValueInMinutes * 60;
        console.log(`Updating timer for Q ID ${questionId}: ${timerValueInMinutes} min (${timerValueInSeconds} sec)`);

        try {
            setLoading(true);
            setError('');
            const res = await api.patch(`/api/tests/questions/${questionId}/update-timer`, {
                timer_duration_seconds: timerValueInSeconds
            });
            alert(res.data.message);

            // Update the displayed current timer in the table directly
            setSpeakingQuestions(prevQuestions =>
                prevQuestions.map(q =>
                    q.id === questionId
                        ? { ...q, timer_duration_minutes: timerValueInMinutes } // Store the numeric value in minutes
                        : q
                )
            );
        } catch (err) {
            console.error('Error updating timer:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to update timer.');
            alert('Failed to update timer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-content">
            <h2>Set Speaking Question Timers</h2>

            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="course-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Speaking Course:</label>
                <select
                    id="course-select"
                    value={selectedCourseId}
                    onChange={(e) => {
                        console.log('Course selected:', e.target.value);
                        const selectedId = parseInt(e.target.value, 10);
                        setSelectedCourse(isNaN(selectedId) ? '' : selectedId);
                    }}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                >
                    <option value="">-- Select a Course --</option>
                    {courses.map(course => (
                        <option key={course.id} value={course.id}>
                            {course.title} (ID: {course.id})
                        </option>
                    ))}
                </select>
            </div>

            {loading && <p>Loading questions...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {selectedCourseId && speakingQuestions.length > 0 && (
                <div className="course-grid"> {/* Reusing course-grid for styling */}
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 17, background: 'transparent', borderRadius: 20, overflow: 'hidden' }}>
                        <thead>
                            <tr style={{ background: '#f5f7fa', color: '#5a67d8', fontWeight: 700, fontSize: 19 }}>
                                <th style={{ padding: '18px 0', borderRadius: '12px 0 0 12px', textAlign: 'left' }}>ID</th>
                                <th style={{ padding: '18px 0', textAlign: 'left' }}>Question</th>
                                <th style={{ padding: '18px 0', textAlign: 'center' }}>Current Timer (min)</th>
                                <th style={{ padding: '18px 0', textAlign: 'center' }}>New Timer (min)</th>
                                <th style={{ padding: '18px 0', borderRadius: '0 12px 12px 0', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {speakingQuestions.map((q, idx) => (
                                <tr key={q.id} style={{ background: idx % 2 === 0 ? '#f9fafe' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '14px 0 14px 8px', fontWeight: 600 }}>{q.id}</td>
                                    <td style={{ padding: '14px 0', fontWeight: 600 }}>{q.question}</td>
                                    <td style={{ padding: '14px 0', textAlign: 'center' }}>
                                        {/* Display current timer, ensuring it's a number and formatted to 2 decimal places */}
                                        {q.timer_duration_minutes !== null && !isNaN(q.timer_duration_minutes)
                                            ? `${Number(q.timer_duration_minutes).toFixed(2)} min`
                                            : 'Not set'}
                                    </td>
                                    <td style={{ padding: '14px 0', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            step="0.01" // Allow decimal input
                                            value={newTimers[q.id] !== undefined && newTimers[q.id] !== null ? newTimers[q.id] : ''}
                                            onChange={(e) => handleTimerChange(q.id, e.target.value)}
                                            min="0"
                                            style={{ width: '80px', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', textAlign: 'center' }}
                                        />
                                    </td>
                                    <td style={{ padding: '14px 0', textAlign: 'center' }}>
                                        <button
                                            className="primary-button"
                                            onClick={() => handleUpdateTimer(q.id)}
                                            disabled={loading}
                                            style={{ background: '#00bfa6', fontSize: '14px', padding: '8px 16px' }}
                                        >
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedCourseId && speakingQuestions.length === 0 && !loading && !error && (
                <p>No speaking questions found for this course. Please upload questions first.</p>
            )}
        </div>
    );
};

export default SetSpeakingQuestionTimers;
