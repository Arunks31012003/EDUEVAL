import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance'; // Your API utility
import { toast } from 'react-toastify'; // For notifications
import '../styles/testpage.css'; // Custom CSS for this page
import { formatDuration } from '../utils/time';

const ReadingTestPage = () => {
    const { courseId } = useParams(); // Get courseId from URL
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [courseDetails, setCourseDetails] = useState(null);

    // State to hold all passages with their respective questions
    const [passagesWithQuestions, setPassagesWithQuestions] = useState([]);
    // State to track the current passage index being displayed
    const [currentPassageIndex, setCurrentPassageIndex] = useState(0);

    // userAnswers will now store answers for all auto-scored questions
    const [userAnswers, setUserAnswers] = useState({});

    // NEW STATES for displaying test results directly in this component (like StartTest.js)
    const [testCompleted, setTestCompleted] = useState(false);
    const [testScore, setTestScore] = useState(null);
    const [totalQuestionsInTest, setTotalQuestionsInTest] = useState(null);

    const [timeLeft, setTimeLeft] = useState(0); // Time in seconds
    const timerRef = useRef(null); // Ref to hold the interval ID
    const [isTestStarted, setIsTestStarted] = useState(false); // To control when timer starts
    const [isTestSubmitted, setIsTestSubmitted] = useState(false); // To prevent multiple submissions
    const leaveCountRef = useRef({ count: 0 }); // Track how many times the user has tried to leave
    const testStartTimeRef = useRef(0); // Track when the test actually started

    // Get the current passage and its questions based on currentPassageIndex
    const currentPassageData = passagesWithQuestions[currentPassageIndex];
    const currentPassage = currentPassageData?.passage;
    const currentQuestions = currentPassageData?.questions || [];

    // Function to format time for display
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Calculate overall time taken for the test
    const calculateOverallTimeTaken = useCallback(() => {
        if (testStartTimeRef.current) {
            return Math.floor((Date.now() - testStartTimeRef.current) / 1000);
        }
        return 0; // Default if test hasn't started yet
    }, []);


    // handleSubmitTest defined using useCallback to ensure stable reference
    const handleSubmitTest = useCallback(async (autoSubmitted = false) => {
        // Prevent multiple submissions if already submitted or test is completed
        if (isTestSubmitted || testCompleted) return; // Also check testCompleted here
        setIsTestSubmitted(true); // Set submission state immediately

        if (timerRef.current) {
            clearInterval(timerRef.current); // Stop the timer
        }

        const timeTaken = calculateOverallTimeTaken(); // Use new calculation function
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user?.id;

        if (!userId) {
            toast.error('User not authenticated. Please log in again.');
            navigate('/login');
            return;
        }

        try {
            console.log("End test triggered. Auto submission:", autoSubmitted); // Debug log
            const payload = {
                courseId: courseId,
                answers: userAnswers, // This sends the object with all answers
                timeTaken: timeTaken,
                autoSubmitted: autoSubmitted,
                userId: userId // Include userId in payload
            };

            const res = await api.post(`/api/tests/submit`, payload);

            // This logic is now aligned with StartTest.js
            // For instantly graded tests (like Reading), navigate to score page with detailed results
            const { score, totalQuestions, courseName, wrongAnswers } = res.data;
            setTestScore(score);
            setTotalQuestionsInTest(totalQuestions);
            setTestCompleted(true); // Trigger the "Test Complete!" screen

            // Navigate to score page with detailed results
            navigate('/score', {
                state: {
                    score,
                    total: totalQuestions,
                    courseName,
                    wrongAnswers,
                    timeTaken
                }
            });

            toast.success(autoSubmitted ? 'Time up! Test submitted automatically!' : 'Test submitted successfully!');

        } catch (err) {
            console.error('Error submitting test:', err);
            toast.error(err.response?.data?.message || 'Failed to submit test.');
            setIsTestSubmitted(false); // Allow re-submission if error occurs
            setTestCompleted(false); // Reset if submission failed, allowing re-attempt if not auto-submitted
        }
    }, [courseId, userAnswers, calculateOverallTimeTaken, navigate, isTestSubmitted, testCompleted]); // Added testCompleted to dependencies

    // Fetch course and questions
    useEffect(() => {
        const fetchTestData = async () => {
            try {
                const res = await api.get(`/api/tests/course-details-with-questions/${courseId}`);
                const { course, passagesWithQuestions } = res.data;

                if (!course || !passagesWithQuestions || passagesWithQuestions.length === 0) {
                    setError('No test data found for this course.');
                    setLoading(false);
                    return;
                }

                setCourseDetails(course);
                setPassagesWithQuestions(passagesWithQuestions);
                setTotalQuestionsInTest(passagesWithQuestions.flatMap(p => p.questions).length); // Set total questions from fetched data

                const initialAnswers = {};
                
                passagesWithQuestions.forEach(passageData => {
                    passageData.questions.forEach(q => {
                        if (q.question_type === 'mcq' || q.question_type === 'reading_mcq' || q.question_type === 'true_false') {
                            initialAnswers[q.id] = '';
                        } else if (q.question_type === 'fill_in_blanks') {
                            const numBlanks = (q.question.match(/\[BLANK\]/g) || []).length;
                            const blankAnswers = {};
                            for (let i = 0; i < numBlanks; i++) {
                                blankAnswers[i] = '';
                            }
                            initialAnswers[q.id] = blankAnswers;
                        } 
                    });
                });
                setUserAnswers(initialAnswers);
                
                if (course.test_duration) {
                    setTimeLeft(course.test_duration);
                } else {
                    setTimeLeft(60 * 60); // Default to 60 minutes
                    toast.warn('Test duration not set for this course. Defaulting to 60 minutes.');
                }

                setLoading(false);
                setIsTestStarted(true);
                testStartTimeRef.current = Date.now(); // Record when the test actually started

            } catch (err) {
                console.error('Error fetching reading test data:', err);
                setError(err.response?.data?.message || 'Failed to load reading test.');
                setLoading(false);
                toast.error(err.response?.data?.message || 'Failed to load reading test.');
            }
        };

        fetchTestData();

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [courseId, navigate]);

    // Timer logic
    useEffect(() => {
        if (isTestStarted && timeLeft > 0 && !isTestSubmitted && !testCompleted) { // Also check testCompleted here
            timerRef.current = setInterval(() => {
                setTimeLeft(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                        handleSubmitTest(true); // Auto-submit when time runs out
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);
        } else if (timeLeft === 0 && isTestStarted && !isTestSubmitted && !testCompleted) { // Also check testCompleted here
            handleSubmitTest(true);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isTestStarted, timeLeft, isTestSubmitted, testCompleted, handleSubmitTest]); // Added testCompleted to dependencies

    // --- Two-Strike System for Page Navigation (Aligned with StartTest.js) ---
    useEffect(() => {
        const currentLeaveCountRef = leaveCountRef.current;

        const handleVisibilityChange = () => {
            // Only act if test started and NOT already submitted/completed
            if (isTestStarted && !isTestSubmitted && !testCompleted) {
                if (document.visibilityState === 'hidden') {
                    currentLeaveCountRef.count += 1;
                    console.log('Visibility change detected. Leave count:', currentLeaveCountRef.count);
                    
                        if (currentLeaveCountRef.count === 1) {
                            // First time leaving: show alert message (blocking)
                            alert("Warning: If you leave this page again, your test will be automatically submitted.");
                        } else if (currentLeaveCountRef.count >= 2) { 
                            // Second or more time leaving: auto-submit and show alert (blocking)
                            alert("You left the test page again. Your test has been automatically submitted to prevent invalid attempts.");
                            // Crucially, remove the beforeunload listener to unblock navigation before submitting.
                            window.removeEventListener('beforeunload', handleBeforeUnload);
                            handleSubmitTest(true).then(() => {
                                // After auto-submit, navigate away from test page
                                navigate('/user-dashboard');
                                // Force reload to ensure navigation happens even if React Router does not update
                                window.location.reload();
                            });
                        }
                }
            }
        };

        const handleBeforeUnload = (event) => {
            // Only act if test started and NOT already submitted/completed
            if (isTestStarted && !isTestSubmitted && !testCompleted) {
                if (currentLeaveCountRef.count === 0) {
                    // First time leaving: prompt browser native confirmation
                    event.preventDefault(); // Standard for browser to show confirmation
                    event.returnValue = ''; // Required for Chrome to show confirmation message
                    console.log('Before unload event: First leave attempt, showing native confirmation.');
                } else {
                    // Subsequent leaves (count >= 1): Do NOT prevent default. This is the key change.
                    // Allow the browser to unload/navigate. The auto-submit would have been triggered by handleVisibilityChange already.
                    console.log('Before unload event: Allowing unload. Auto-submission by visibilityChange is expected to handle the submission.');
                    // No event.preventDefault() or event.returnValue = '' here.
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Reset leave count on unmount (e.g., if user finishes test normally or navigates deliberately)
            currentLeaveCountRef.count = 0; 
        };
    }, [isTestStarted, isTestSubmitted, testCompleted, handleSubmitTest, navigate]); // Added testCompleted and navigate to dependencies

    const handleAnswerChange = useCallback((questionId, selectedOption) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionId]: selectedOption
        }));
    }, []);

    // Handle change for fill-in-the-blanks input
    const handleFillInBlanksChange = useCallback((questionId, blankIndex, value) => {
        setUserAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionId]: {
                ...(prevAnswers[questionId] || {}),
                [blankIndex]: value
            }
        }));
    }, []);

    // Helper function to render fill-in-the-blanks question
    const renderFillInBlanksQuestion = (question, index) => {
        const parts = question.question.split('[BLANK]');
        const currentAnswers = userAnswers[question.id] || {};

        return (
            <div key={question.id} className="question-card">
                <p className="font-medium text-lg text-gray-800 mb-3">
                    {index + 1}. {question.question_text || 'Complete the summary.'}
                </p>
                <div className="fill-in-blanks-group space-y-2">
                    {parts.map((part, i) => (
                        <React.Fragment key={i}>
                            <span className="text-gray-700">{part}</span>
                            {i < parts.length - 1 && (
                                <input
                                    type="text"
                                    value={currentAnswers[i] || ''}
                                    onChange={(e) => handleFillInBlanksChange(question.id, i, e.target.value)}
                                    className="blank-input"
                                    placeholder={`Blank ${i + 1}`}
                                    disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                                />
                            )}
                        </React.Fragment>
                    ))}
                    <p className="text-sm text-gray-500 mt-2">
                        Write NO MORE THAN TWO WORDS from the text for each answer.
                    </p>
                </div>
            </div>
        );
    };

    // Helper function to render True/False question
    const renderTrueFalseQuestion = (question, index) => {
        const currentAnswer = userAnswers[question.id] || '';

        return (
            <div key={question.id} className="question-card">
                <p className="font-medium text-lg text-gray-800 mb-3">
                    {index + 1}. {question.question}
                </p>
                <div className="options-group">
                    <label className="flex items-center text-gray-700 cursor-pointer">
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="TRUE"
                            checked={currentAnswer === 'TRUE'}
                            onChange={() => handleAnswerChange(question.id, 'TRUE')}
                            className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded-full"
                            disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                        />
                        <span className="ml-3 text-base">True</span>
                    </label>
                    <label className="flex items-center text-gray-700 cursor-pointer">
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="FALSE"
                            checked={currentAnswer === 'FALSE'}
                            onChange={() => handleAnswerChange(question.id, 'FALSE')}
                            className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded-full"
                            disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                        />
                        <span className="ml-3 text-base">False</span>
                    </label>
                    <label className="flex items-center text-gray-700 cursor-pointer">
                        <input
                            type="radio"
                            name={`question-${question.id}`}
                            value="NOT GIVEN"
                            checked={currentAnswer === 'NOT GIVEN'}
                            onChange={() => handleAnswerChange(question.id, 'NOT GIVEN')}
                            className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded-full"
                            disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                        />
                        <span className="ml-3 text-base">Not Given</span>
                    </label>
                </div>
            </div>
        );
    };

    // NEW: Navigation handlers
    const handleNextPassage = () => {
        if (currentPassageIndex < passagesWithQuestions.length - 1) {
            setCurrentPassageIndex(prevIndex => prevIndex + 1);
            window.scrollTo(0, 0); // Scroll to top on page change
        }
    };

    const handlePreviousPassage = () => {
        if (currentPassageIndex > 0) {
            setCurrentPassageIndex(prevIndex => prevIndex - 1);
            window.scrollTo(0, 0); // Scroll to top on page change
        }
    };

    if (loading) {
        return <div className="loading-screen">Loading Reading Test...</div>;
    }

    if (error) {
        return <div className="error-screen">Error: {error}</div>;
    }

    if (!currentPassageData) {
        return <div className="no-data-screen">No reading test data found for this course.</div>;
    }

    const isFirstPassage = currentPassageIndex === 0;
    const isLastPassage = currentPassageIndex === passagesWithQuestions.length - 1;

    // Conditional render for Test Complete screen
    if (testCompleted) {
        return (
            <div className="test-complete-container p-8 bg-white rounded-lg shadow-xl text-center max-w-6xl mx-auto my-20">
                <h2 className="text-4xl font-extrabold text-indigo-700 mb-6">Test Complete!</h2>
                <p className="text-xl text-gray-700 mb-4">Course: {courseDetails?.title || 'Reading Test'}</p>
                <h3 className="text-3xl font-bold text-green-600 mb-4">
                    Score: {testScore !== null ? testScore : 'N/A'} / {
                        typeof totalQuestionsInTest === 'number' && !isNaN(totalQuestionsInTest)
                            ? totalQuestionsInTest
                            : 'N/A'
                    }
                </h3>
                <p className="text-md text-gray-600 mb-6">Time taken: {formatDuration(calculateOverallTimeTaken())}</p>
                <button
                    className="primary-button px-6 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300 ease-in-out"
                    onClick={() => navigate('/user-dashboard')}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="reading-test-container">
            {/* Header with Course Title and Timer */}
            <div className="test-header">
                <h1>{courseDetails?.title || 'Reading Test'}</h1>
                <div className={`timer-display ${timeLeft <= 60 ? 'bg-red-200 text-red-800 animate-pulse' : ''}`}>
                    Time Left: {formatTime(timeLeft)}
                </div>
            </div>

            {/* Test Instructions */}
            {!isTestSubmitted && (
                <div className="test-instructions">
                    <p>Please answer all questions carefully. Your test will be automatically submitted when the timer runs out or if you navigate away from the page.</p>
                </div>
            )}

            {/* Main Content Area: Passage on Left, Questions on Right */}
            <div className="test-content">
                {/* Reading Passage Panel */}
                <div className="reading-passage-panel">
                    <h2>Reading Passage {currentPassageIndex + 1}</h2>
                    <div className="prose">
                        {currentPassage?.content ? (
                            <p>{currentPassage.content}</p>
                        ) : (
                            <p className="no-passage-message">{currentPassage?.title || 'No passage for this test'}</p>
                        )}
                    </div>
                </div>

                {/* Questions Panel */}
                <div className="questions-panel">
                    <h2>Questions</h2>
                    <div className="questions-list">
                        {currentQuestions.map((q, index) => {
                            switch (q.question_type) {
                                case 'mcq':
                                case 'reading_mcq':
                                    // Support up to 10 options (A-J), but only show non-null options
                                    const allOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                                    const currentAnswer = userAnswers[q.id] || '';
                                    return (
                                        <div key={q.id} className="question-card">
                                            <p className="font-medium text-lg text-gray-800 mb-3">
                                                {index + 1}. {q.question}
                                            </p>
                                            <div className="options-group">
                                                {allOptions.map(optionKey => {
                                                    const optionText = q[`option_${optionKey.toLowerCase()}`];
                                                    if (!optionText) return null;

                                                    return (
                                                        <label key={optionKey} className="flex items-center text-gray-700 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`question-${q.id}`}
                                                                value={optionKey}
                                                                checked={currentAnswer === optionKey}
                                                                onChange={() => handleAnswerChange(q.id, optionKey)}
                                                                className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded-full"
                                                                disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                                                            />
                                                            <span className="ml-3 text-base">
                                                                {optionKey}: {optionText}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                case 'fill_in_blanks':
                                    return renderFillInBlanksQuestion(q, index);
                                case 'true_false':
                                    return renderTrueFalseQuestion(q, index);
                                default:
                                    return (
                                        <div key={q.id} className="question-card">
                                            <p className="font-medium text-lg text-gray-800 mb-3">
                                                {index + 1}. Unsupported Question Type: {q.question_type}
                                            </p>
                                            <p className="text-red-500">Please contact support.</p>
                                        </div>
                                    );
                            }
                        })}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="navigation-buttons">
                        <button
                            onClick={handlePreviousPassage}
                            disabled={isFirstPassage || isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                            className="navigation-button"
                            aria-label="Previous Passage"
                        >
                            Previous
                        </button>

                        {!isLastPassage && (
                            <button
                                onClick={handleNextPassage}
                                disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                                className="navigation-button"
                                aria-label="Next Passage"
                            >
                                Next
                            </button>
                        )}

                        {isLastPassage && (
                            <button
                                onClick={() => handleSubmitTest(false)} // Manual submission
                                disabled={isTestSubmitted || testCompleted} // Disable if test is submitted or completed
                                className="start-test-button"
                                aria-label="End Test"
                            >
                                {isTestSubmitted ? 'Submitted!' : 'End Test'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );  
};

export default ReadingTestPage;
