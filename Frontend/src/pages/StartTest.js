import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance';
import '../styles/starttest.css';
import { toast } from 'react-toastify';
import { formatDuration } from '../utils/time';


// Helper component for Audio Playback - NOW USES forwardRef
const AudioPlayer = React.forwardRef(({ src, onEnded, onPlay, onPause, currentTime, setPlaybackTime, duration, controls = true, onError }, ref) => {
    // The ref is now passed from the parent and assigned directly to the audio element.
    // No need for an internal useRef for the audio element itself here, unless for specific internal component logic.

    useEffect(() => {
        if (ref.current) { // Use the forwarded ref
            if (currentTime !== null && currentTime !== ref.current.currentTime) {
                ref.current.currentTime = currentTime;
            }
        }
    }, [currentTime, ref]); // Add ref to dependencies

    const handleTimeUpdate = () => {
        if (ref.current) {
            setPlaybackTime(ref.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (ref.current) {
            duration(ref.current.duration);
        }
    };

    const handleError = (e) => {
        console.error("Audio element error:", e.target.error, "Src:", src);
        if (onError) onError(e);
    };

    return (
        <audio
            ref={ref} // Assign the forwarded ref here
            src={src}
            onEnded={onEnded}
            onPlay={onPlay}
            onPause={onPause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
            controls={controls}
            preload="auto"
            className="w-full max-w-md mx-auto my-4 rounded-lg shadow-lg"
            key={src} // Key ensures remount when src changes
        >
            Your browser does not support the audio element.
        </audio>
    );
});

// Utility to shuffle an array (Fisher-Yates)
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Helper functions for URL handling
const isFullUrl = (url) => {
    return /^https?:\/\//i.test(url);
};

const getAudioSrc = (audioPath) => {
    if (!audioPath) return '';
    // Remove any leading slashes or 'Uploads/' from audioPath
    let cleanPath = audioPath.replace(/^\/?Uploads\//, '').replace(/^\//, '');
    const BASE_API_URL = process.env.REACT_APP_API_BASE_URL;
    return joinUrl(BASE_API_URL, 'uploads/' + cleanPath);
};

const getImageSrc = (imagePath) => {
    if (!imagePath) return '';
    if (isFullUrl(imagePath)) {
        // Check if it's a Google Drive URL
        if (imagePath.includes('drive.google.com')) {
            // Convert Google Drive sharing link to direct download link
            const fileIdMatch = imagePath.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
                const fileId = fileIdMatch[1];
                return `${process.env.REACT_APP_GOOGLE_DRIVE_BASE_URL}${fileId}`;
            }
        }
        // For other full URLs, assume they are direct links or handle as before
        return imagePath;
    } else {
        // For file IDs or relative paths, use the proxy endpoint
        const BASE_API_URL = process.env.REACT_APP_API_BASE_URL;
        return `${BASE_API_URL}/api/files/${imagePath}`;
    }
};

// Helper function to join base URL and path without double slashes
const joinUrl = (base, path) => {
    if (!base.endsWith('/') && !path.startsWith('/')) {
        return base + '/' + path;
    } else if (base.endsWith('/') && path.startsWith('/')) {
        return base + path.substring(1);
    } else {
        return base + path;
    }
};

// Default test duration for non-timed courses (e.g., if test_duration is null/0)
const DEFAULT_DURATION = 3600; // 60 minutes in seconds

const StartTest = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timer, setTimer] = useState(DEFAULT_DURATION); // Overall test timer
    const [isTestStarted, setIsTestStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timerIntervalRef = useRef(null);
    const courseTypeRef = useRef(null);
    const testStartTimeRef = useRef(0);
    const [courseTitle, setCourseTitle] = useState('Test');

    // NEW STATES for displaying test results directly in this component
    const [testCompleted, setTestCompleted] = useState(false);
    const [testScore, setTestScore] = useState(null);
    const [totalQuestionsInTest, setTotalQuestionsInTest] = useState(null);
    const [wrongAnswers, setWrongAnswers] = useState([]);


    // For Listening Test Specifics
    const [listeningSections, setListeningSections] = useState([]);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [currentAudioPath, setCurrentAudioPath] = useState('');
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [isAudioPlayedOnce, setIsAudioPlayedOnce] = useState(false); // To track if audio played at least once
    const audioRef = useRef(null); // Ref for the audio element itself in the main component

    // NEW: Ref to track how many times the user has tried to leave
    const leaveCountRef = useRef({ count: 0 });

    // Helper function to format answers for display
    const formatAnswer = (answer) => {
        if (Array.isArray(answer)) {
            return answer.join(', ');
        }
        return answer || 'Not answered';
    };

    // Function to handle return to dashboard based on user role
    const handleReturn = () => {
        const userRole = localStorage.getItem('userRole'); // Assuming role is stored in localStorage
        if (userRole === 'admin') {
            navigate('/admin-dashboard');
        } else if (userRole === 'superadmin') {
            navigate('/superadmin-dashboard');
        } else {
            navigate('/user-dashboard');
        }
    };

    const calculateOverallTimeTaken = useCallback(() => {
        if (testStartTimeRef.current) {
            return Math.floor((Date.now() - testStartTimeRef.current) / 1000);
        }
        return 0;
    }, []);

    const handleEndTest = useCallback(async (auto = false) => {
        // Prevent multiple submissions if already submitted or test is completed
        if (testCompleted) return;

        // Clear timer if running
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        const totalTimeTaken = calculateOverallTimeTaken();
        console.log("End test triggered. Auto submission:", auto); // Debug log
        const submissionPayload = {
            courseId,
            answers,
            timeTaken: totalTimeTaken,
            autoSubmitted: auto,
            courseType: courseTypeRef.current,
        };
        console.log("Submitting test with payload:", submissionPayload);
        try {
            const submitEndpoint = courseTypeRef.current === 'Speaking'
                ? `/api/tests/submit-speaking-test`
                : `/api/tests/submit`;

            console.log("Attempting to submit to endpoint:", submitEndpoint); // Added for debug

            let res;
            if (courseTypeRef.current === 'Speaking') {
                const formData = new FormData();
                formData.append('courseId', courseId);
                formData.append('timeTaken', totalTimeTaken);
                formData.append('autoSubmitted', auto);

                // Collect audio blobs from answers and append to formData
                for (const qId in answers) {
                    if (answers[qId] instanceof Blob) {
                        formData.append(`audioFiles`, answers[qId], `q${qId}.webm`); // Naming convention: q[questionId].webm
                    }
                }

                res = await api.post(submitEndpoint, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            } else {
                res = await api.post(submitEndpoint, submissionPayload);
            }

            console.log("Test submission response:", res.data);

            if (courseTypeRef.current === 'Writing' || courseTypeRef.current === 'Speaking') {
                // For Writing/Speaking, still navigate to result-pending as they are manually graded
                navigate('/result-pending', {
                    state: {
                        message: `Your ${courseTypeRef.current} test has been submitted for review.`,
                        courseTitle,
                        courseType: courseTypeRef.current,
                        score: res.data.score || 0,
                        total: res.data.totalQuestions || 0
                    }
                });
            } else {
                // For instantly graded tests (Listening, Reading, MCQ),
                // set states to display results directly in this component
                setTestScore(res.data.score);
                // Log the totalQuestions from backend response
                console.log("Total Questions from backend (on submit):", res.data.totalQuestions);
                console.log("Submit response data:", res.data);
                console.log("wrongAnswers in response:", res.data.wrongAnswers);
                const wrongAns = res.data.wrongAnswers || [];
                console.log("Setting wrongAnswers to:", wrongAns);
                setWrongAnswers(wrongAns);
                setTestCompleted(true); // Trigger the "Test Complete!" screen
            }

            toast.success(auto ? 'Time up! Test submitted automatically.' : 'Test submitted successfully!');

        } catch (err) {
            console.error('Error submitting test:', err.response?.data || err.message);
            setError('Failed to submit test. Please try again.');
            // Do NOT set testCompleted to false here if auto-submitted, otherwise it might re-trigger.
            // Only set to false if user manually clicked submit and it failed, allowing them to try again.
            if (!auto) { // Only reset if it was a manual submission attempt
                setTestCompleted(false);
            }
        }
    }, [courseId, answers, calculateOverallTimeTaken, navigate, courseTitle, testCompleted]);

    // Timer effect
    useEffect(() => {
        if (isTestStarted && timer > 0 && !testCompleted) { // Ensure timer runs only if test is started and not completed
            timerIntervalRef.current = setInterval(() => {
                setTimer(prevTimer => {
                    if (prevTimer <= 1) {
                        clearInterval(timerIntervalRef.current);
                        timerIntervalRef.current = null;
                        handleEndTest(true); // Auto-submit when timer runs out
                        return 0;
                    }
                    return prevTimer - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [isTestStarted, timer, testCompleted, handleEndTest]);

    // Fetch questions and setup initial state
    useEffect(() => {
        const fetchQuestionsAndDuration = async () => {
            console.log("Fetching questions and duration for courseId:", courseId); // Debug log
            try {
                const res = await api.get(`/api/tests/course-details-with-questions/${courseId}`);
                const fetchedCourse = res.data.course;
                courseTypeRef.current = fetchedCourse?.type;

                // Handle redirection for Speaking tests immediately
                // Removed redirect to non-existent speaking test page
                if (fetchedCourse?.type === 'Speaking') {
                    console.log(`Redirecting to speaking test for courseId: ${courseId}`);
                    navigate(`/start-speaking-test/${courseId}`);
                    return; // Prevent further execution in this effect
                }

                let questionsToProcess = [];
                if (fetchedCourse?.type === 'Listening' && res.data.listeningSections) {
                    setListeningSections(res.data.listeningSections);
                    // For initial display, set questions to the first section's questions
                    if (res.data.listeningSections.length > 0) {
                        questionsToProcess = res.data.listeningSections[0].questions;
                        setCurrentAudioPath(res.data.listeningSections[0].audio_file_path);
                    }
                } else if (fetchedCourse?.type === 'Reading') {
                    // Reading passages come grouped; flatten questions for general display but keep passage context
                    // For now, flatten all questions from all passages
                    questionsToProcess = res.data.passagesWithQuestions.flatMap(p => p.questions);
                    questionsToProcess = shuffleArray(questionsToProcess); // Shuffle for reading
                } else { // Handles general MCQs, etc.
                    questionsToProcess = res.data.questions || [];
                    questionsToProcess = shuffleArray(questionsToProcess); // Shuffle general MCQs
                }

                setQuestions(questionsToProcess);
                setCourseTitle(fetchedCourse?.title || 'Test');
                // Log the initial totalQuestions based on fetched data
                console.log("Initial Total Questions (from fetch):", questionsToProcess.length);
                setTotalQuestionsInTest(questionsToProcess.length);

                const durationSeconds = fetchedCourse?.test_duration ? fetchedCourse.test_duration : DEFAULT_DURATION;
                setTimer(durationSeconds);

                const initialAnswers = {};
                questionsToProcess.forEach(q => {
                    if (q.question_type === 'fill_in_blanks') {
                        let blankCount = 0;
                        try {
                            // Ensure q.correct_answers_json is a string before parsing
                            const correctBlanks = typeof q.correct_answers_json === 'string'
                                ? JSON.parse(q.correct_answers_json)
                                : q.correct_answers_json; // If it's already an object/array

                            if (Array.isArray(correctBlanks)) {
                                blankCount = correctBlanks.length;
                            }
                        } catch (e) {
                            console.error("Error parsing correct_answers_json for fill-in-blanks:", e, "Raw data:", q.correct_answers_json);
                        }
                        initialAnswers[q.id] = Array(blankCount).fill('');
                    } else if (q.question_type === 'checkbox') {
                        initialAnswers[q.id] = [];
                    } else {
                        initialAnswers[q.id] = '';
                    }
                });
                setAnswers(initialAnswers);

            } catch (err) {
                console.error('Error fetching questions or duration:', err.response?.data || err.message);
                if (err.response && err.response.status === 401) {
                    setError('Session expired. Please login again.');
                } else {
                    setError('Failed to load questions or test time. ' + (err.response?.data?.message || err.message));
                }
            } finally {
                setLoading(false);
            }
        };

        fetchQuestionsAndDuration();

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
        };
    }, [courseId, navigate]); // Removed setAnswers to prevent re-runs

    // Effect to update questions when currentSectionIndex changes for Listening tests
    useEffect(() => {
        if (courseTypeRef.current === 'Listening' && listeningSections.length > 0 && isTestStarted) {
            const currentSection = listeningSections[currentSectionIndex];
            console.log("Switching to section:", currentSectionIndex, "Audio path:", currentSection.audio_file_path);
            setQuestions(currentSection.questions);
            setCurrentAudioPath(currentSection.audio_file_path);
            setIsAudioPlayedOnce(false); // Reset for new section
            setAudioCurrentTime(0); // Reset audio playback time
            // If audio is paused and controls were hidden, they should re-appear now
            if (audioRef.current) {
                console.log("Reloading audio for new section. Current readyState:", audioRef.current.readyState);
                audioRef.current.load(); // Reload audio element to ensure play capability
            }
        }
    }, [currentSectionIndex, listeningSections, isTestStarted]);

    // --- Auto-Save/Submit on Page Visibility Change or Before Unload ---
    useEffect(() => {
        // Capture the current ref value to use in cleanup function
        const currentLeaveCountRef = leaveCountRef.current;

        const handleVisibilityChange = () => {
            if (isTestStarted && !testCompleted) { // Only act if test started and not already completed
                if (document.visibilityState === 'hidden') {
                    currentLeaveCountRef.count += 1;
                    console.log('Visibility change detected. Leave count:', currentLeaveCountRef.count);

                    if (currentLeaveCountRef.count === 1) {
                        // First time leaving: show alert message
                        alert("Warning: If you leave this page again, your test will be automatically submitted.");
                    } else if (currentLeaveCountRef.count >= 2) { // Removed redundant !testCompleted
                        // Second or more time leaving: auto-submit and show warning
                        alert("You left the test page again. Your test has been automatically submitted to prevent invalid attempts.");
                        handleEndTest(true); // Trigger auto-submission
                    }
                }
            }
        };

        const handleBeforeUnload = (event) => {
            if (isTestStarted && !testCompleted) { // Only act if test started and not already completed
                if (currentLeaveCountRef.count === 0) {
                    // First time leaving: prompt browser native confirmation
                    event.preventDefault(); // Standard for browser to show confirmation
                    event.returnValue = ''; // Required for Chrome to show confirmation message
                    console.log('Before unload event: First leave attempt, showing native confirmation.');
                } else {
                    // Subsequent leaves: Do NOT prevent default. Allow the browser to close/navigate.
                    // The auto-submit would have been triggered by handleVisibilityChange already.
                    console.log('Before unload event: Allowing unload or submission, leave count:', currentLeaveCountRef.count, 'testCompleted:', testCompleted);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Reset leave count on unmount (e.g., if user finishes test normally or navigates deliberately)
            // Use the captured ref value instead of accessing the ref directly
            currentLeaveCountRef.count = 0;
        };
    }, [isTestStarted, testCompleted, handleEndTest]);


    const handleStartTest = () => {
        setIsTestStarted(true);
        testStartTimeRef.current = Date.now();
        // For listening tests, start audio immediately if not auto-played
        if (courseTypeRef.current === 'Listening' && audioRef.current && !isAudioPlayedOnce) {
            console.log("Attempting to play audio. ReadyState:", audioRef.current.readyState, "Src:", audioRef.current.src, "Network state:", audioRef.current.networkState);
            if (!audioRef.current.src || audioRef.current.src === '') {
                console.error("Audio src is not set!");
                return;
            }

            const tryPlayAudio = () => {
                if (!audioRef.current) return;
                console.log("Calling play() on audio element. Paused before play:", audioRef.current.paused);
                audioRef.current.play().then(() => {
                    if (!audioRef.current) return;
                    console.log("Play promise resolved. Audio paused after play:", audioRef.current.paused, "Current time:", audioRef.current.currentTime);
                    if (audioRef.current.paused) {
                        console.warn("Audio is still paused after play() - likely blocked by browser autoplay policy");
                    }
                }).catch(e => {
                    console.error("Error playing audio:", e);
                    // If play fails, try again after a short delay if not yet played
                    if (!isAudioPlayedOnce) {
                        setTimeout(() => {
                            if (audioRef.current && !isAudioPlayedOnce) {
                                console.log("Retrying audio play after error. ReadyState:", audioRef.current.readyState);
                                tryPlayAudio();
                            }
                        }, 500);
                    }
                });
            };

            // If already enough data, try play immediately
            if (audioRef.current.readyState >= 3) { // HAVE_FUTURE_DATA
                tryPlayAudio();
            } else {
                // Set up listeners for when audio is ready
                const onCanPlay = () => {
                    if (!audioRef.current) return;
                    console.log("Audio can play. ReadyState:", audioRef.current.readyState);
                    tryPlayAudio();
                    audioRef.current.removeEventListener('canplay', onCanPlay);
                };

                const onCanPlayThrough = () => {
                    if (!audioRef.current) return;
                    console.log("Audio can play through. ReadyState:", audioRef.current.readyState);
                    tryPlayAudio();
                    audioRef.current.removeEventListener('canplaythrough', onCanPlayThrough);
                };

                audioRef.current.addEventListener('canplay', onCanPlay);
                audioRef.current.addEventListener('canplaythrough', onCanPlayThrough);

                // Fallback: try play after 2 seconds if listeners haven't fired
                setTimeout(() => {
                    if (audioRef.current && !isAudioPlayedOnce && audioRef.current.readyState >= 2) {
                        console.log("Fallback: trying to play audio after timeout. ReadyState:", audioRef.current.readyState);
                        tryPlayAudio();
                        if (audioRef.current) {
                            audioRef.current.removeEventListener('canplay', onCanPlay);
                            audioRef.current.removeEventListener('canplaythrough', onCanPlayThrough);
                        }
                    }
                }, 2000);
            }
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prevAnswers => ({
            ...prevAnswers,
            [questionId]: value,
        }));
    };

    const handleCheckboxChange = (questionId, option) => {
        setAnswers(prevAnswers => {
            const currentAnswers = Array.isArray(prevAnswers[questionId]) ? prevAnswers[questionId] : [];
            if (currentAnswers.includes(option)) {
                return {
                    ...prevAnswers,
                    [questionId]: currentAnswers.filter(item => item !== option),
                };
            } else {
                return {
                    ...prevAnswers,
                    [questionId]: [...currentAnswers, option],
                };
            }
        });
    };

    const handleFillInBlanksChange = (questionId, index, value) => {
        setAnswers(prevAnswers => {
            const currentBlanks = Array.isArray(prevAnswers[questionId]) ? [...prevAnswers[questionId]] : [];
            currentBlanks[index] = value;
            return {
                ...prevAnswers,
                [questionId]: currentBlanks
            };
        });
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prevIndex => prevIndex - 1);
        }
    };

    const handleGoToQuestion = (index) => {
        setCurrentQuestionIndex(index);
    };

    // --- Listening Test Navigation (Next Section / Previous Section) ---
    const handleNextSection = () => {
        if (currentSectionIndex < listeningSections.length - 1) {
            setCurrentSectionIndex(prevIndex => prevIndex + 1);
            setCurrentQuestionIndex(0); // Reset to first question of new section
            setIsAudioPlayedOnce(false); // Allow audio to play again for new section
            setAudioCurrentTime(0); // Reset audio playback time
        }
    };

    const handlePreviousSection = () => {
        if (currentSectionIndex > 0) {
            setCurrentSectionIndex(prevIndex => prevIndex - 1);
            setCurrentQuestionIndex(0); // Reset to first question of new section
            setIsAudioPlayedOnce(false); // Allow audio to play again for new section
            setAudioCurrentTime(0); // Reset audio playback time
        }
    };

    const handleAudioEnded = () => {
        setIsAudioPlayedOnce(true); // Mark that the audio has been played once
    };

    const handleAudioPlay = () => {
        // This callback is triggered by the audio element itself.
        // The logic to prevent replay is in handleStartTest and controls prop.
    };
    const handleAudioPause = () => {
        // No action needed on pause
    };

    if (loading) return <p className="text-center text-xl text-white mt-10">Loading test...</p>;
    if (error) return <p className="text-center text-xl text-red-500 mt-10">Error: {error}</p>;
    if (!questions.length && courseTypeRef.current !== 'Listening') return <p className="text-center text-xl text-yellow-300 mt-10">No questions found for this test.</p>;
    if (courseTypeRef.current === 'Listening' && !listeningSections.length) return <p className="text-center text-xl text-yellow-300 mt-10">No listening sections found for this test.</p>;

    const currentQuestion = questions[currentQuestionIndex];

    const formattedTime = new Date(timer * 1000).toISOString().substr(11, 8);

    const isCurrentQuestionAnswered = (q) => {
        const userAnswer = answers[q.id];
        if (q.question_type === 'fill_in_blanks') {
            return Array.isArray(userAnswer) && userAnswer.every(ans => ans !== '' && ans !== undefined);
        }
        if (q.question_type === 'checkbox') {
            return Array.isArray(userAnswer) && userAnswer.length > 0;
        }
        // For 'listening', 'mcq', 'reading_mcq', 'true_false', 'descriptive'
        return userAnswer !== undefined && userAnswer !== '';
    };

    const renderQuestion = (question, index) => {
        const questionNumberOverall = courseTypeRef.current === 'Listening'
            ? listeningSections.slice(0, currentSectionIndex)
                .flatMap(section => section.questions).length + index + 1
            : index + 1;

        if (!question) {
            return <p>Question not found.</p>;
        }

        switch (question.question_type) {
            case 'mcq':
            case 'reading_mcq':
            case 'listening': // Listening questions are also MCQs in this structure
                return (
                    <div className="mb-4">
                        <p className="font-semibold text-lg mb-3">
                            {questionNumberOverall}. {question.question}
                        </p>
                        {question.image_path && (
                            <div className="mb-4">
                                <img
                                    src={getImageSrc(question.image_path)}
                                    alt="Question Illustration"
                                    className="max-w-full h-auto rounded-lg shadow-md"
                                    onError={(e) => { e.target.onerror = null; e.target.src = process.env.REACT_APP_PLACEHOLDER_IMAGE_URL; }}
                                />
                            </div>
                        )}
                        <div className="options-grid">
                            {['A', 'B', 'C', 'D'].map(optionKey => (
                                question[`option_${optionKey.toLowerCase()}`] && ( // Only render if option exists
                                    <label key={optionKey} className="option-label">
                                        <input
                                            type="radio"
                                            name={`question-${question.id}`}
                                            value={optionKey}
                                            checked={answers[question.id] === optionKey}
                                            onChange={() => handleAnswerChange(question.id, optionKey)}
                                            disabled={!isTestStarted}
                                            className="mr-2"
                                        />
                                        {`${optionKey}. ${question[`option_${optionKey.toLowerCase()}`]}`}
                                    </label>
                                )
                            ))}
                        </div>
                    </div>
                );
            case 'true_false':
                return (
                    <div className="mb-4">
                        <p className="font-semibold text-lg mb-3">
                            {questionNumberOverall}. {question.question}
                        </p>
                        <div className="options-grid">
                            {['TRUE', 'FALSE'].map(optionKey => (
                                <label key={optionKey} className="option-label">
                                    <input
                                        type="radio"
                                        name={`question-${question.id}`}
                                        value={optionKey}
                                        checked={answers[question.id]?.toUpperCase() === optionKey}
                                        onChange={() => handleAnswerChange(question.id, optionKey)}
                                        disabled={!isTestStarted}
                                        className="mr-2"
                                    />
                                    {optionKey}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'fill_in_blanks':
                let blankCount = 0;
                try {
                    // Ensure q.correct_answers_json is a string before parsing
                    const correctBlanks = typeof question.correct_answers_json === 'string'
                        ? JSON.parse(question.correct_answers_json)
                        : question.correct_answers_json; // If it's already an object/array

                    if (Array.isArray(correctBlanks)) {
                        blankCount = correctBlanks.length;
                    }
                } catch (e) {
                    console.error("Error parsing correct_answers_json for fill-in-blanks:", e, "Raw data:", question.correct_answers_json);
                }

                // Create an array of input fields based on blankCount
                const blankInputs = Array.from({ length: blankCount }, (_, i) => (
                    <input
                        key={i}
                        type="text"
                        value={(answers[question.id] && answers[question.id][i]) || ''}
                        onChange={(e) => handleFillInBlanksChange(question.id, i, e.target.value)}
                        disabled={!isTestStarted}
                        className="blank-input-field" // Apply a class for consistent styling
                        placeholder={`Blank ${i + 1}`}
                    />
                ));

                // Replace [BLANK] placeholders in question text with input fields
                const questionParts = question.question.split(/\[BLANK\]/i);
                const renderedQuestionText = questionParts.map((part, i) => (
                    <React.Fragment key={i}>
                        {part}
                        {i < blankInputs.length && blankInputs[i]}
                    </React.Fragment>
                ));

                return (
                    <div className="mb-4">
                        <p className="font-semibold text-lg mb-3">
                            {questionNumberOverall}. {renderedQuestionText}
                        </p>
                    </div>
                );
            case 'checkbox':
                // Assuming options A, B, C, D for checkbox as well
                return (
                    <div className="mb-4">
                        <p className="font-semibold text-lg mb-3">
                            {questionNumberOverall}. {question.question}
                        </p>
                        <div className="options-grid">
                            {['A', 'B', 'C', 'D'].map(optionKey => (
                                question[`option_${optionKey.toLowerCase()}`] && (
                                    <label key={optionKey} className="option-label">
                                        <input
                                            type="checkbox"
                                            name={`question-${question.id}`}
                                            value={optionKey}
                                            checked={answers[question.id]?.includes(optionKey) || false}
                                            onChange={() => handleCheckboxChange(question.id, optionKey)}
                                            disabled={!isTestStarted}
                                            className="mr-2"
                                        />
                                        {`${optionKey}. ${question[`option_${optionKey.toLowerCase()}`]}`}
                                    </label>
                                )
                            ))}
                        </div>
                    </div>
                );
            case 'descriptive':
                return (
                    <div className="mb-4">
                        <p className="font-semibold text-lg mb-3">
                            {questionNumberOverall}. {question.question}
                        </p>
                        <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            disabled={!isTestStarted}
                            rows="20" // Increased rows for vertical height
                            className="w-full p-3 border border-gray-300 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[500px] resize-y" // `w-full` for full width, `min-h-[500px]` for explicit minimum vertical height, `resize-y` for vertical resizing
                            placeholder="Type your answer here..."
                        ></textarea>
                    </div>
                );
            default:
                return <p>Unsupported question type: {question.question_type}</p>;
        }
    };

    // Conditional render for Test Complete screen
    if (testCompleted) {
        // Log the totalQuestionsInTest just before rendering the complete screen
        console.log("Rendering Test Complete screen. totalQuestionsInTest:", totalQuestionsInTest);
        return (
            <div className="test-complete-container p-8 bg-white rounded-lg shadow-xl text-center max-w-6xl mx-auto my-20">
                <h2 className="text-4xl font-extrabold text-indigo-700 mb-6">Test Complete!</h2>
                <p className="text-xl text-gray-700 mb-4">Course: {courseTitle}</p>
                <h3 className="text-3xl font-bold text-green-600 mb-4">
                    Score: {testScore !== null ? testScore : 'N/A'} / {
                        typeof totalQuestionsInTest === 'number' && !isNaN(totalQuestionsInTest)
                            ? totalQuestionsInTest
                            : 'N/A'
                    }
                </h3>

                <p className="text-md text-gray-600 mb-6">Time taken: {formatDuration(calculateOverallTimeTaken())}</p>

                {/* Display wrong answers */}
                {console.log("Rendering wrongAnswers:", wrongAnswers)}
                {wrongAnswers && wrongAnswers.length > 0 && (
                    <div style={{ textAlign: 'left', marginTop: 40, padding: 20, background: '#f7fafc', borderRadius: 8, marginBottom: 20 }}>
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

                <button
                    className="primary-button px-6 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition duration-300 ease-in-out"
                    onClick={handleReturn}
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="start-test-container p-8 bg-white rounded-lg shadow-xl max-w-6xl mx-auto my-12">
            <div className="test-header">
                <h2 className="test-title">{courseTitle}</h2>
            </div>

            {!isTestStarted && courseTypeRef.current === 'Listening' && listeningSections.length > 0 && (
                <div className="info-box">
                    <p className="text-lg mb-3">This is a Listening Test.</p>
                    <p className="text-md mb-4">
                        The audio for each section will play only once.
                        You will then answer the questions for that section.
                    </p>
                    <button
                        onClick={handleStartTest}
                        className="start-test-button"
                    >
                        Start Listening Test
                    </button>
                </div>
            )}

            {isTestStarted && (
                <div className="timer-display">
                    Time Remaining: {formattedTime}
                </div>
            )}

            {/* Listening Test Audio Player and Section Navigation */}
            {isTestStarted && courseTypeRef.current === 'Listening' && listeningSections.length > 0 && ( // Ensure isTestStarted for audio and questions
                <div className="listening-section-container">
                    <h3 className="listening-section-title">
                        Section {currentSectionIndex + 1}: {listeningSections[currentSectionIndex]?.section_title}
                    </h3>

                    {/* Display image for current section */}

                    <AudioPlayer
                        ref={audioRef} // Correct: Pass the ref to the forwarded AudioPlayer component
                        src={getAudioSrc(currentAudioPath)}
                        onEnded={handleAudioEnded}
                        onPlay={handleAudioPlay}
                        onPause={handleAudioPause}
                        currentTime={audioCurrentTime}
                        setPlaybackTime={setAudioCurrentTime}
                        duration={() => { }} // Placeholder, could be used to get audio duration
                        controls={!isAudioPlayedOnce}
                        onError={(e) => console.error("AudioPlayer error:", e)}
                    />
                    <p className="text-center text-sm mt-2">
                        {isAudioPlayedOnce ? "Audio has been played once. You cannot replay it." : "Audio will play once for this section."}
                    </p>

                    {/* Display all questions for current section */}
                    <div className="mt-6">
                        {questions.map((question, index) => (
                            <div key={question.id} className="question-container">
                                {renderQuestion(question, index)}
                            </div>
                        ))}
                    </div>

                    <div className="button-container space-between">
                        <button
                            onClick={handlePreviousSection}
                            disabled={currentSectionIndex === 0}
                            className="primary-button"
                        >
                            Previous Section
                        </button>
                        {currentSectionIndex === listeningSections.length - 1 ? (
                            <button
                                onClick={() => handleEndTest(false)}
                                className="primary-button"
                            >
                                Submit Test
                            </button>
                        ) : (
                            <button
                                onClick={handleNextSection}
                                className="primary-button"
                            >
                                Next Section
                            </button>
                        )}
                    </div>
                </div>
            )}

            {isTestStarted && courseTypeRef.current !== 'Listening' && currentQuestion ? ( // Check currentQuestion also
                <>
                    <div className="question-container">
                        {renderQuestion(currentQuestion, currentQuestionIndex)}
                    </div>

                    <div className="button-container space-between">
                        <button
                            onClick={handlePreviousQuestion}
                            disabled={currentQuestionIndex === 0}
                            className="primary-button"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleNextQuestion}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="primary-button"
                        >
                            Next
                        </button>
                    </div>

                    <div className="question-container">
                        <h4 className="text-xl font-bold mb-4 text-center">Question Progress</h4>
                        <div className="question-progress-grid">
                            {questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    onClick={() => handleGoToQuestion(idx)}
                                    className={`question-progress-button
                                        ${idx === currentQuestionIndex ? 'current' :
                                            isCurrentQuestionAnswered(q) ? 'answered' : 'unanswered'
                                        }`}
                                    disabled={!isTestStarted}
                                >
                                    {/* For non-listening, direct index + 1 */}
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="button-container">
                        <button
                            onClick={() => handleEndTest(false)}
                            className="primary-button primary-button-large"
                            disabled={!isTestStarted}
                        >
                            Submit Test
                        </button>
                    </div>
                </>
            ) : (
                // Initial screen for non-Listening tests, only show if test not started and not listening type
                !isTestStarted && courseTypeRef.current !== 'Listening' && (
                    <div className="button-container">
                        <button
                            onClick={handleStartTest}
                            className="start-test-button primary-button-large"
                        >
                            Start Test
                        </button>
                    </div>
                )
            )}
        </div>
    );
};

export default StartTest;
