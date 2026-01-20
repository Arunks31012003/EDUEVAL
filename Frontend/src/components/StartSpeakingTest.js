import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance'; // Ensure this path is correct
import { FaMicrophone, FaStopCircle } from 'react-icons/fa'; // For microphone icons

const StartSpeakingTest = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true); // Still loading for questions
    const [error, setError] = useState('');
    const [current, setCurrent] = useState(0);
    const [courseTitle, setCourseTitle] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recorder, setRecorder] = useState(null);
    const [answers, setAnswers] = useState({}); // Stores audio blobs for each question

    // Timers for individual questions
    const [questionTimer, setQuestionTimer] = useState(0); // This is the countdown timer
    const questionTimerIntervalRef = useRef(null);
    const currentQuestionDurationRef = useRef(0); // Stores the max duration for the current question

    // State for elapsed recording time
    const [elapsedRecordingTime, setElapsedRecordingTime] = useState(0);
    const elapsedTimerIntervalRef = useRef(null); // Use ref to store interval ID

    // New ref to hold audio chunks within the startRecording's closure scope
    const currentAudioChunksRef = useRef([]);

    // Ref to signal if the test is meant to be submitted after the current recording stops
    const shouldSubmitTestRef = useRef(false);
    const isSubmittingRef = useRef(false); // Prevents duplicate submission calls


    // Function to format time for display
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Utility function to stop question countdown timer
    const stopQuestionTimer = useCallback(() => {
        if (questionTimerIntervalRef.current) {
            clearInterval(questionTimerIntervalRef.current);
            questionTimerIntervalRef.current = null;
            console.log('Question countdown timer cleared.');
        }
    }, []);

    // Handles submitting the speaking test (now accepts currentAnswers as argument)
    const handleEndTest = useCallback(async (auto = false, submittedAnswers) => {
        if (isSubmittingRef.current) {
            console.log('Submission already in progress. Aborting duplicate call.');
            return;
        }
        isSubmittingRef.current = true;

        stopQuestionTimer(); // Ensure question timer stops

        try {
            const formData = new FormData();
            formData.append('courseId', courseId);
            formData.append('autoSubmitted', auto);

            // Use the provided answers or the current state (as a fallback)
            const answersToSubmit = submittedAnswers || answers;

            Object.entries(answersToSubmit).forEach(([questionId, audioBlob]) => {
                if (audioBlob instanceof Blob && audioBlob.size > 0) { // Ensure blob is valid and not empty
                    formData.append(`audioFiles`, audioBlob, `q${questionId}.webm`);
                } else {
                    console.warn(`Skipping empty or invalid audio blob for question ${questionId}`);
                }
            });

            if (Array.from(formData.keys()).filter(key => key.startsWith('audioFiles')).length === 0) {
                console.warn('No audio files found in FormData to submit. This could be due to no recordings or empty blobs.');
                // We still proceed with submission even if no audio, as there might be a reason (e.g., student skipped all)
            }

            console.log('Submitting speaking test...');
            console.log('Attempting to submit to endpoint: /api/tests/submit-speaking-test');

            const res = await api.post('/api/tests/submit-speaking-test', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Speaking test submitted successfully:', res.data);
            navigate('/result-pending', {
                state: {
                    message: `Your Speaking test has been submitted for review.`,
                    courseTitle,
                    courseType: 'Speaking',
                    score: res.data.score || 0,
                    total: res.data.totalQuestions || 0
                }
            });

        } catch (err) {
            console.error('Failed to submit speaking test:', err);
            if (err.response && [401, 403].includes(err.response.status)) {
                alert('Session expired or unauthorized. Please login again.');
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                alert(`Failed to submit test. Please try again. Error: ${err.message || 'Unknown error'}. Check console for details.`);
                // Do NOT navigate to dashboard directly on error, keep user on page to see error
            }
        } finally {
            isSubmittingRef.current = false;
        }
    }, [courseId, answers, navigate, stopQuestionTimer, courseTitle]); // Added courseTitle to dependencies


    // Handle navigation to the next question
    const handleNextQuestion = useCallback(() => {
        if (isRecording && recorder) {
            recorder.stop(); // Stop recording, onstop will process the blob
        }

        if (current < questions.length - 1) {
            setCurrent(prev => prev + 1);
        } else {
            // This is the last question, signal that test should be submitted after this blob is ready
            shouldSubmitTestRef.current = true;
            // No direct handleEndTest call here; it will be triggered by onstop callback
        }
    }, [current, questions.length, isRecording, recorder]);


    // Function to start the per-question timer (countdown)
    const startQuestionTimerCountdown = useCallback(() => {
        if (questionTimerIntervalRef.current) {
            clearInterval(questionTimerIntervalRef.current);
        }
        questionTimerIntervalRef.current = setInterval(() => {
            setQuestionTimer(prev => {
                if (prev <= 1) {
                    console.log('Question countdown timer reached 0. Stopping recording and moving next.');
                    if (recorder && isRecording) {
                        recorder.stop(); // This will trigger onstop and the subsequent blob processing
                    }
                    handleNextQuestion(); // Move to the next question (or trigger final submission)
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [recorder, isRecording, handleNextQuestion]);


    // Handles stopping the recording for a question (user click)
    const stopRecording = useCallback(() => {
        if (recorder && isRecording) {
            recorder.stop();
            console.log('Recording stopped explicitly by user.');
        }
    }, [recorder, isRecording]);


    // Handles starting the recording for a question
    const startRecording = async () => {
        if (isRecording) return; // Prevent starting if already recording

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const options = { mimeType: 'audio/webm; codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} is not supported, trying default 'audio/webm'`);
                options.mimeType = 'audio/webm'; // Fallback to plain webm
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error('Neither audio/webm; codecs=opus nor audio/webm is supported.');
                    setError('Your browser does not support the required audio recording format.');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
            }

            const mediaRecorder = new MediaRecorder(stream, options);
            setRecorder(mediaRecorder);
            currentAudioChunksRef.current = []; // Clear chunks for new recording session
            setIsRecording(true); // Set recording state first

            mediaRecorder.onstart = () => {
                console.log('MediaRecorder: Recording started (onstart event).');
            };

            mediaRecorder.ondataavailable = (event) => {
                console.log('MediaRecorder: ondataavailable event fired. Data size:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    currentAudioChunksRef.current.push(event.data); // Push to ref
                }
            };

            // ✅ CRITICAL CHANGE: Blob creation and state update now happens directly in onstop
            // This ensures state is updated before any subsequent actions dependent on it.
            mediaRecorder.onstop = () => {
                console.log('MediaRecorder: Recording stopped (onstop event). Final state:', mediaRecorder.state);
                const mimeType = mediaRecorder?.mimeType || 'audio/webm';
                const finalBlob = new Blob(currentAudioChunksRef.current, { type: mimeType });

                console.log(`onstop: Audio Blob created for question ${questions[current]?.id}:`, finalBlob, `Size: ${finalBlob.size} bytes`);

                if (finalBlob.size === 0) {
                    console.error('onstop: Created an empty audio blob. This indicates a recording issue.');
                    // Consider showing a user-friendly warning if needed, but don't stop flow
                }

                // Use a functional update for setAnswers to ensure it's based on the latest state
                setAnswers(prev => {
                    const updatedAnswers = {
                        ...prev,
                        [questions[current]?.id]: finalBlob
                    };
                    // IMPORTANT: If this was the last question and 'End Test' was signaled, submit here
                    if (shouldSubmitTestRef.current) {
                        console.log("onstop: Last question's blob ready and submission signaled. Initiating final test submission.");
                        shouldSubmitTestRef.current = false; // Reset the flag
                        handleEndTest(false, updatedAnswers); // Pass the freshly updated answers explicitly
                    }
                    return updatedAnswers;
                });

                currentAudioChunksRef.current = []; // Clear chunks after processing for the next recording
                stream.getTracks().forEach(track => track.stop()); // Stop microphone stream
                setIsRecording(false); // Set recording state to false here
            };

            mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                setError(`Recording error: ${event.error.name} - ${event.error.message}`);
                setIsRecording(false);
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            console.log('MediaRecorder: Calling .start()');

        } catch (err) {
            console.error('Error starting recording (getUserMedia or MediaRecorder setup):', err);
            setError(`Could not start recording. Error: ${err.message}. Please ensure your microphone is connected and available.`);
        }
    };


    // Effect 1: Fetch speaking questions and set initial timer
    useEffect(() => {
        setLoading(true);
        setError('');

        const fetchSpeakingQuestions = async () => {
            try {
                const res = await api.get(`/api/tests/course-details-with-questions/${courseId}`);
                const fetchedCourse = res.data.course;
                // Ensure questions are filtered for 'speaking' type
                const fetchedQuestions = res.data.questions?.filter(q => q.question_type === 'speaking') || [];

                if (fetchedCourse?.type !== 'Speaking') {
                    alert('This is not a speaking test. Redirecting...');
                    navigate(`/start-test/${courseId}`);
                    return; // Stop execution here
                }

                setQuestions(fetchedQuestions);
                setCourseTitle(fetchedCourse?.title || 'Speaking Test');

                if (fetchedQuestions.length > 0) {
                    const firstQuestionDuration = fetchedQuestions[0].timer || 60; // Default to 60s if not set
                    setQuestionTimer(firstQuestionDuration);
                    currentQuestionDurationRef.current = firstQuestionDuration;
                    // Timer will be started by Effect 3 for the first question
                } else {
                    setError('No speaking questions found for this course.');
                }

            } catch (err) {
                console.error('Error fetching speaking questions:', err);
                setError('Failed to load speaking questions.');
            } finally {
                setLoading(false);
            }
        };

        fetchSpeakingQuestions();

        // Cleanup: Stop any ongoing recording and clear timers on unmount
        return () => {
            if (recorder) {
                if (recorder.state === 'recording') {
                    recorder.stop(); // Stop recording if still active
                }
                if (recorder.stream) { // Stop all tracks on the stream
                    recorder.stream.getTracks().forEach(track => track.stop());
                }
            }
            stopQuestionTimer(); // Clear question countdown timer
            if (elapsedTimerIntervalRef.current) { // Ensure elapsed recording timer is cleared
                clearInterval(elapsedTimerIntervalRef.current);
                elapsedTimerIntervalRef.current = null;
            }
        };
    }, [courseId, navigate, stopQuestionTimer, recorder]);


    // Effect 2: Manages the elapsed recording timer
    useEffect(() => {
        if (isRecording) {
            setElapsedRecordingTime(0); // Reset for new recording session
            elapsedTimerIntervalRef.current = setInterval(() => {
                setElapsedRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            // Clear interval when not recording
            if (elapsedTimerIntervalRef.current) {
                clearInterval(elapsedTimerIntervalRef.current);
                elapsedTimerIntervalRef.current = null;
            }
            setElapsedRecordingTime(0); // Reset elapsed time when not recording
        }

        return () => { // Cleanup function for this specific effect
            if (elapsedTimerIntervalRef.current) {
                clearInterval(elapsedTimerIntervalRef.current);
                elapsedTimerIntervalRef.current = null;
            }
        };
    }, [isRecording]);


    // Effect 3: Reset/start question timer when current question changes or questions loaded
    useEffect(() => {
        // Only run if questions are loaded and component is not in submission state
        if (questions.length === 0 || isSubmittingRef.current) return;

        const qDuration = questions[current]?.timer || 60; // Use optional chaining for safety
        setQuestionTimer(qDuration); // Reset to full duration for new question
        currentQuestionDurationRef.current = qDuration; // Update ref

        stopQuestionTimer(); // Ensure previous timer is cleared before starting a new one
        startQuestionTimerCountdown(); // Start countdown for the new question

    }, [current, questions, isSubmittingRef, stopQuestionTimer, startQuestionTimerCountdown]);


    // Handle navigation to the previous question
    const handlePreviousQuestion = () => {
        if (isRecording) {
            stopRecording(); // Stop recording if currently active for the current question
        }
        if (current > 0) {
            setCurrent(prev => prev - 1);
        }
    };

    // Handles End Test button click: signals readiness for submission after current recording (if any)
    const handleEndTestButtonClick = useCallback(() => {
        if (isRecording && recorder) {
            shouldSubmitTestRef.current = true; // Signal that submission should occur after current recording stops
            recorder.stop(); // This will trigger onstop, which will then call handleEndTest via shouldSubmitTestRef
        } else {
            // If not recording, or recording already stopped, submit immediately with current answers
            handleEndTest(false, answers);
        }
    }, [isRecording, recorder, answers, handleEndTest]);


    if (loading) return <div className="dashboard-wrapper"><div className="dashboard-content"><p className="p-6 text-center">Loading test...</p></div></div>;
    if (error) return <div className="dashboard-wrapper"><div className="dashboard-content"><p className="p-6 text-red-500 text-center">{error}</p></div></div>;
    if (questions.length === 0) return <div className="dashboard-wrapper"><div className="dashboard-content"><p className="p-6 text-center">No speaking questions found for this test.</p></div></div>;

    const q = questions[current];
    // Check for non-empty blobs when counting answered questions
    const answeredCount = Object.values(answers).filter(audioBlob => audioBlob instanceof Blob && audioBlob.size > 0).length;

    const unansweredNumbers = questions
        .map((questionItem, idx) => {
            // A question is "answered" if its blob exists and has a size > 0
            return (answers[questionItem.id] && answers[questionItem.id].size > 0) ? null : (idx + 1);
        })
        .filter(x => x !== null);


    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-content" style={{ maxWidth: 700, margin: '40px auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 32 }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#5a67d8' }}>{courseTitle}</h2>
                <div style={{ marginBottom: 24, fontWeight: 'bold', color: '#647dee', fontSize: 18 }}>
                    <span>Question Time Left: {formatTime(questionTimer)}</span>
                    {isRecording && (
                        <span style={{ marginLeft: 20, color: '#F44336' }}>
                            Recording Time: {formatTime(elapsedRecordingTime)}
                        </span>
                    )}
                </div>

                <div className="bg-white shadow rounded p-4 mb-4" style={{ background: '#f5f7fa', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <p className="font-semibold" style={{ fontSize: 18 }}>{current + 1}. {q.question}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                        <button
                            className="primary-button"
                            onClick={startRecording}
                            disabled={isRecording}
                            style={{ background: '#4CAF50', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <FaMicrophone /> Start Recording
                        </button>
                        <button
                            className="primary-button"
                            onClick={stopRecording}
                            disabled={!isRecording}
                            style={{ background: '#F44336', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <FaStopCircle /> Stop Recording
                        </button>
                    </div>
                    {isRecording && <p className="text-center text-red-500 mt-2">Recording...</p>}
                    {/* Show message only if a non-empty blob exists for the current question */}
                    {answers[q.id] && answers[q.id].size > 0 && <p className="text-center text-green-600 mt-2">Answer recorded for this question.</p>}
                    {answers[q.id] && answers[q.id].size === 0 && <p className="text-center text-orange-500 mt-2">Warning: Recorded audio is empty. Please try again.</p>}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button className="primary-button" disabled={current === 0} onClick={handlePreviousQuestion}>Previous</button>
                    <button className="primary-button" disabled={current === questions.length - 1} onClick={handleNextQuestion}>Next</button>
                    <button
                        className="primary-button"
                        style={{ marginLeft: 'auto', background: '#00bfa6' }}
                        onClick={handleEndTestButtonClick} // Call the new handler
                        disabled={isSubmittingRef.current} // Disable if submission is in progress
                    >
                        End Test
                    </button>
                </div>

                <div style={{ marginTop: 32, background: '#f5f7fa', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
                        Answered Questions: <span style={{ color: '#00bfa6' }}>{answeredCount}</span>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
                        Unanswered Questions: <span style={{ color: '#e53e3e' }}>{questions.length - answeredCount}</span>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 16 }}>
                        Unanswered Question Numbers: <span style={{ color: '#e53e3e' }}>{unansweredNumbers.length > 0 ? unansweredNumbers.join(', ') : 'None'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartSpeakingTest;
