// Your AdminDashboard.js code will go here
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/axiosInstance'; // Assuming this path is correct
import '../styles/admin.css'; // Your existing CSS file
import moment from 'moment'; // For date formatting
import { formatDuration } from '../utils/time';
import { toast } from 'react-toastify'; // Corrected: For notifications
import { resolveAudioUrl, getAudioMimeType } from '../utils/media';

// Import language context and components
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

// Import Font Awesome icons
import {
    faBars, faPlusCircle, faEye, faClock, faUpload,
    faPenNib, faMicrophone, faUserCircle, faSignOutAlt,
    faChevronDown, faChevronUp, faFileAlt, faHeadphones, faPen, faMicrophoneAlt, faImage, faCopy
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Import FontAwesomeIcon component

import AdminScoresPage from './AdminScoresPage';

const isFullUrl = (url) => {
    return /^https?:\/\//i.test(url);
};

const getAudioSrc = (audioPath) => {
    if (!audioPath) return '';
    if (isFullUrl(audioPath)) {
        // Remove any '/uploads/' segment from full URL to match actual storage path
        return audioPath.replace('/uploads/', '/');
    }
    const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    let normalizedPath = audioPath.replace(/^\/+/, '').replace(/^Uploads\//, 'uploads/');
    return joinUrl(BASE_API_URL, normalizedPath);
};

const getImageSrc = (imagePath) => {
    if (!imagePath) return '';
    if (isFullUrl(imagePath)) {
        // Remove any '/uploads/' segment from full URL to match actual storage path
        return imagePath.replace('/uploads/', '/');
    }
    const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    let normalizedPath = imagePath.replace(/^\/+/, '').replace(/^Uploads\//, 'uploads/');
    return joinUrl(BASE_API_URL, normalizedPath);
};

// Helper function to join base URL and path without double slashes
const joinUrl = (base, path) => {
    if (!base || !path) return '';
    if (!base.endsWith('/') && !path.startsWith('/')) {
        return base + '/' + path;
    } else if (base.endsWith('/') && path.startsWith('/')) {
        return base + path.substring(1);
    } else {
        return base + path;
    }
};


// Assuming you have these components/functions defined elsewhere
// If these are not actual components, they will need to be implemented or removed
const SpeakingTestReviews = ({ onReviewClick }) => {
    // Placeholder implementation for SpeakingTestReviews
    const [pendingSpeakingReviews, setPendingSpeakingReviews] = useState([]);
    useEffect(() => {
        const fetchPendingSpeakingReviews = async () => {
            try {
                const res = await api.get('/api/tests/speaking-reviews');
                setPendingSpeakingReviews(res.data.reviews || []);
            } catch (err) {
                console.error('Error fetching pending speaking reviews:', err);
                toast.error('Failed to fetch pending speaking reviews.');
            }
        };
        // Corrected function call: fetchPendingSpeakingReviews instead of fetchPendingReviews
        fetchPendingSpeakingReviews();
    }, []);

    return (
        <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
            <h4 className="text-xl font-bold mb-4 text-purple-200">Pending Reviews</h4>
            {pendingSpeakingReviews.length === 0 ? (
                <p className="text-center text-gray-300">No speaking tests currently pending review.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg">
                    <table className="admin-table">
                        <thead className="bg-purple-700 text-white">
                            <tr>
                                <th className="py-4 px-6 text-left">ID</th>
                                <th className="py-4 px-6 text-left">Student Name</th>
                                <th className="py-4 px-6 text-left">Course Name</th>
                                <th className="py-4 px-6 text-left">Submitted At</th>
                                <th className="py-4 px-6 text-left">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingSpeakingReviews.map((review) => (
                                <tr
                                    key={review.submission_id}
                                    className="bg-blue-600 border-b border-blue-500 last:border-b-0 hover:bg-blue-700 transition duration-200"
                                >
                                    {/* Added text-white to each td */}
                                    <td className="py-4 px-6 text-white">{review.submission_id}</td>
                                    <td className="py-4 px-6 text-white">{review.user_name}</td>
                                    <td className="py-4 px-6 text-white">{review.course_name}</td>
                                    <td className="py-4 px-6 text-white">
                                        {moment(review.date_time).format('YYYY-MM-DD HH:mm')}
                                    </td>
                                    <td className="py-4 px-6">
                                        <button
                                            onClick={() => onReviewClick(review.submission_id)}
                                            className="px-5 py-2 bg-white text-blue-700 hover:bg-gray-100 rounded-lg text-sm font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ReviewedSpeakingTestsList = ({ onViewClick }) => {
    // Placeholder implementation for ReviewedSpeakingTestsList
    const [reviewedSpeakingSubmissions, setReviewedSpeakingSubmissions] = useState([]);
    useEffect(() => {
        const fetchReviewedSpeakingSubmissions = async () => {
            try {
                const res = await api.get('/api/tests/speaking-tests/reviewed-submissions');
                setReviewedSpeakingSubmissions(res.data.submissions || []);
            } catch (err) {
                console.error('Error fetching reviewed speaking submissions:', err);
                toast.error('Failed to fetch reviewed speaking submissions.');
            }
        };
        fetchReviewedSpeakingSubmissions();
    }, []);

    return (
        <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
            <h4 className="text-xl font-bold mb-4 text-purple-200">Reviewed Tests</h4>
            {reviewedSpeakingSubmissions.length === 0 ? (
                <p className="text-center text-gray-300">No speaking tests have been reviewed yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg">
                    <table className="admin-table">
                        <thead className="bg-purple-700 text-white">
                            <tr>
                                <th className="py-3 px-4 text-left">ID</th>
                                <th className="py-3 px-4 text-left">Student Name</th>
                                <th className="py-3 px-4 text-left">Course Name</th>
                                <th className="py-3 px-4 text-left">Submitted At</th>
                                <th className="py-3 px-4 text-left">Scored At</th>
                                <th className="py-3 px-4 text-left">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviewedSpeakingSubmissions.map((submission) => (
                                <tr key={submission.id} className={`bg-blue-600 border-b border-blue-500 last:border-b-0 hover:bg-blue-700 transition duration-200`}>
                                    {/* Added text-white to each td, removed text-green-300 */}
                                    <td className="py-3 px-4 text-white">{submission.id}</td>
                                    <td className="py-3 px-4 text-white">{submission.user_username}</td>
                                    <td className="py-3 px-4 text-white">{submission.course_title}</td>
                                    <td className="py-3 px-4 text-white">{moment(submission.submitted_at).format('YYYY-MM-DD HH:mm')}</td>
                                    <td className="py-3 px-4 text-white">
                                        {submission.scored_at ? moment(submission.scored_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-white">
                                        {submission.score !== null && submission.score !== undefined ? submission.score : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const SpeakingSubmissionDetail = ({ submissionId, onBackToList, BASE_API_URL }) => { // Added BASE_API_URL prop
    // Placeholder implementation for SpeakingSubmissionDetail
    const [submissionDetails, setSubmissionDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [score, setScore] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/api/tests/speaking-submission/${submissionId}`);
                setSubmissionDetails(res.data.submission);
                setScore(res.data.submission.current_score !== null ? res.data.submission.current_score : '');
            } catch (err) {
                console.error('Error fetching speaking submission details:', err);
                setError(err.response?.data?.message || 'Failed to load submission details.');
                toast.error(err.response?.data?.message || 'Failed to load submission details.');
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchDetails();
        }
    }, [submissionId]);

    const handleSaveScore = async () => {
        if (score === '') {
            toast.error('Please enter a score before saving.');
            return;
        }
        const scoreValue = parseInt(score);
        if (isNaN(scoreValue) || scoreValue < 0) {
            toast.error('Please enter a valid non-negative number for the score.');
            return;
        }

        setIsSaving(true);
        try {
            await api.patch(`/api/tests/speaking-submission/${submissionId}/score`, { score: scoreValue });
            toast.success('Score saved successfully!');
            onBackToList(); // Go back to the list after saving
        } catch (err) {
            console.error('Error saving speaking score:', err);
            toast.error(err.response?.data?.message || 'Failed to save score.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <p className="text-center text-white text-lg mt-8">Loading submission details...</p>;
    if (error) return <p className="text-center text-red-400 text-lg mt-8">Error: {error}</p>;
    if (!submissionDetails) return <p className="text-center text-gray-300">No submission details available.</p>;

    return (
        <div className="speaking-submission-detail-container p-6 bg-gray-700 rounded-lg shadow-inner">
            <button
                onClick={onBackToList}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 mb-6"
            >
                ← Back to Review List
            </button>

            <h4 className="text-xl font-bold mb-4 text-purple-300">Review Speaking Test Submission</h4>
            {/* Changed text-white on this div */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-white">
                <p><strong className="text-purple-200">Student Name:</strong> {submissionDetails.user_name}</p>
                <p><strong className="text-purple-200">Course Name:</strong> {submissionDetails.course_name}</p>
                <p><strong className="text-purple-200">Submitted At:</strong> {moment(submissionDetails.date_time).format('YYYY-MM-DD HH:mm:ss')}</p>
                <p><strong className="text-purple-200">Time Taken:</strong> {formatDuration(submissionDetails.total_time_taken_sec)}</p>
                <p><strong className="text-purple-200">Current Score:</strong> {submissionDetails.current_score !== null ? submissionDetails.current_score : 'Not Scored'}</p>
            </div>

            <h5 className="text-xl font-bold mt-6 mb-4 text-purple-300">Questions and Answers:</h5>
            {submissionDetails.questions_and_answers && submissionDetails.questions_and_answers.length > 0 ? (
                <div className="space-y-4">
                    {submissionDetails.questions_and_answers.map((qa, index) => (
                        <div key={qa.question_id} className="bg-gray-600 p-4 rounded-lg shadow-inner">
                            <p className="font-semibold text-lg text-purple-100 mb-2">
                                {index + 1}. Question: {qa.question_text}
                            </p>
                            {/* Changed text-white on this p */}
                            <p className="text-white">
                                <strong>Student Answer (Audio):</strong>
                            {qa.audio_url ? (
                                <audio controls preload="auto" key={qa.audio_url} className="w-full max-w-xs mt-2" onError={(e) => console.error('Audio load error:', e.target.error, qa.audio_url)}>
                                    <source src={resolveAudioUrl(qa.audio_url)} type={getAudioMimeType(qa.audio_url)} />
                                    Your browser does not support the audio element.
                                </audio>
                                    ) : 'No audio response provided.'}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-white">No questions or answers found for this submission.</p>
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
                    className="w-40 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-lg"
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


const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage(); // Use language context

    // Set 'welcome' as the initial active section
    const [activeSection, setActiveSection] = useState('welcome');
    const [courses, setCourses] = useState([]);
    const [user, setUser] = useState(location.state?.user || null);
    const [selectedCourseDetails, setSelectedCourseDetails] = useState(null);

    const [courseData, setCourseData] = useState({
        title: '',
        subject: '',
        description: '',
        type: '',
        test_duration: '' // in seconds
    });
    const courseTypes = ['Reading', 'Writing', 'Speaking', 'Listening'];
    const fileInputRef = useRef(null); // For general CSV upload

    // State for Set Course Time section
    const [timeType, setTimeType] = useState('Reading');
    const [selectedSpeakingCourseIdForTimer, setSelectedSpeakingCourseIdForTimer] = useState('');
    const [speakingCourseQuestions, setSpeakingCourseQuestions] = useState([]);
    const [questionTimers, setQuestionTimers] = useState({}); // Corrected: Initialized with useState({})


    // State for Writing Review
    const [writingReviewSubSection, setWritingReviewSubSection] = useState('pending');
    const [pendingWritingReviews, setPendingWritingReviews] = useState([]);
    const [reviewedWritingSubmissions, setReviewedWritingSubmissions] = useState([]);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [currentWritingSubmission, setCurrentWritingSubmission] = useState(null);
    const [writingSubmissionLoading, setWritingSubmissionLoading] = useState(false);
    const [writingSubmissionError, setWritingSubmissionError, ] = useState(null);
    const [writingSubmissionScore, setWritingSubmissionScore] = useState('');
    const [writingSubmissionIsSaving, setWritingSubmissionIsSaving] = useState(false);

    // State for Speaking Review
    const [speakingReviewSubSection, setSpeakingReviewSubSection] = useState('pending');

    // State for Listening Section Upload (Audio + CSV)
    const listeningSectionAudioRef = useRef(null);
    const listeningSectionCsvRef = useRef(null);
    const [listeningSectionData, setListeningSectionData] = useState({
        course_id: '',
        section_title: '',
        section_number: '',
    });
    const [isUploadingListeningSection, setIsUploadingListeningSection] = useState(false);

    // NEW State for Image Upload
    const imageUploadRef = useRef(null);
    const [uploadedImagePath, setUploadedImagePath] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // State to track selected course for CSV/Individual Question upload
    const [selectedUploadCourseId, setSelectedUploadCourseId] = useState('');
    const [selectedUploadCourseType, setSelectedUploadCourseType] = useState('');

    // State for sidebar collapse/expand
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Function to toggle sidebar collapse state
    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };


    useEffect(() => {
        if (!user) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                // Set initial active section to 'welcome' only if user data is loaded
                setActiveSection('welcome');
            } else {
                navigate('/admin-login'); // Redirect to admin login if no user
            }
        }
    }, [user, navigate]);

    // --- Course Management Functions ---
    const handleCourseChange = (e) => {
        const { name, value } = e.target;
        setCourseData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const durationInSeconds = (courseData.type === 'Reading' || courseData.type === 'Writing' || courseData.type === 'Listening')
                ? parseInt(courseData.test_duration) * 60
                : null;

            const payload = {
                ...courseData,
                test_duration: durationInSeconds
            };

            const res = await api.post('/api/admin/courses', payload);
            toast.success(res.data.message);
            setCourseData({ title: '', subject: '', description: '', type: '', test_duration: '' });
            fetchCourses();
        } catch (error) {
            console.error("Error adding course:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to add course.');
        }
    };

    const fetchCourses = useCallback(async () => {
        try {
            const res = await api.get('/api/courses');
            const courseData = Array.isArray(res.data) ? res.data : res.data.courses;
            if (Array.isArray(courseData)) {
                setCourses(courseData);
            } else {
                console.error("Courses response is not an array:", res.data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            toast.error('Failed to fetch courses.');
        }
    }, [setCourses]);


    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);


    const handleViewCourseDetails = async (courseId) => {
        try {
            // This endpoint now sends correct answers for admin view
            const res = await api.get(`/api/tests/course-details-with-questions/${courseId}`);
            setSelectedCourseDetails(res.data);
        } catch (error) {
            console.error("Error fetching course details:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to fetch course details.');
            setSelectedCourseDetails(null);
        }
    };

    const handleDeleteCourse = async (courseId) => {
        // IMPORTANT: Replace window.confirm with a custom modal for better UX and iframe compatibility
        if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            try {
                await api.delete(`/api/admin/courses/${courseId}`);
                setCourses(courses.filter(course => course.id !== courseId));
                toast.success('Course deleted successfully!');
                setSelectedCourseDetails(null);
            } catch (error) {
                console.error("Error deleting course:", error.response?.data || error.message);
                toast.error(error.response?.data?.message || 'Failed to delete course.');
            }
        }
    };

    // --- CSV Upload Function (for Reading, Writing, Speaking) ---
    const handleCsvFileUpload = async (e) => {
        e.preventDefault();
        const file = fileInputRef.current?.files[0];
        const courseId = selectedUploadCourseId;

        if (!file || !courseId) {
            toast.error('Please select a file and a course.');
            return;
        }

        const formData = new FormData();
        let uploadEndpoint = '';
        let fileFieldName = 'file'; // Default field name for general CSVs

        const selectedCourse = courses.find(c => c.id === parseInt(courseId));
        if (!selectedCourse) {
            toast.error('Selected course not found.');
            return;
        }

        // --- CRITICAL FIX: Conditionally set fileFieldName and uploadEndpoint ---
        if (selectedCourse.type === 'Reading') {
            uploadEndpoint = '/api/tests/upload-reading-advanced-csv'; // DEDICATED ENDPOINT FOR ADVANCED READING CSV
            fileFieldName = 'csvFile'; // Multer expects 'csvFile' for this endpoint
            toast.info('Uploading Reading Test CSV. Please ensure backend endpoint /api/tests/upload-reading-advanced-csv is ready.');
        } else if (selectedCourse.type === 'Writing') {
            uploadEndpoint = '/api/tests/upload-descriptive';
            fileFieldName = 'file'; // Backend expects 'file' for descriptive
        } else if (selectedCourse.type === 'Speaking') {
            uploadEndpoint = '/api/tests/upload-speaking-csv';
            fileFieldName = 'file'; // Backend expects 'file' for speaking
        } else {
            toast.error('Unsupported course type for CSV upload.');
            return;
        }

        formData.append(fileFieldName, file); // Dynamically set the field name
        formData.append('course_id', courseId);

        try {
            const res = await api.post(uploadEndpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // This is automatically set by FormData with boundary
                },
            });
            toast.success(res.data.message);
            fileInputRef.current.value = '';
            setSelectedUploadCourseId('');
            setSelectedUploadCourseType('');
            fetchCourses();
            if (activeSection === 'setCourseTime' && selectedCourse.type === 'Speaking' && selectedSpeakingCourseIdForTimer === courseId) {
                fetchSpeakingCourseQuestionsForTiming(courseId);
            }

        } catch (error) {
            console.error("Error uploading CSV:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to upload questions.');
        }
    };


    // --- Handle Listening Section Upload (Audio + Questions CSV) ---
    const handleListeningSectionDataChange = (e) => {
        const { name, value } = e.target;
        setListeningSectionData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadListeningSection = async (e) => {
        e.preventDefault();
        const audioFile = listeningSectionAudioRef.current?.files[0];
        const csvFile = listeningSectionCsvRef.current?.files[0];
        const courseId = selectedUploadCourseId;
        const { section_title, section_number } = listeningSectionData;

        if (!courseId || !audioFile || !csvFile || !section_title || !section_number) {
            toast.error('Please fill all fields, select an audio file, and a CSV for the section.');
            return;
        }

        const parsedSectionNumber = parseInt(section_number);
        if (isNaN(parsedSectionNumber) || parsedSectionNumber <= 0) {
            toast.error('Section number must be a positive integer.');
            return;
        }

        setIsUploadingListeningSection(true);
        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('section_title', section_title);
        formData.append('section_number', parsedSectionNumber);
        formData.append('audioFile', audioFile); // 'audioFile' matches backend multer field name
        formData.append('csvFile', csvFile);     // 'csvFile' matches backend multer field name

        try {
            const res = await api.post('/api/tests/upload-listening-section', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success(res.data.message);
            // Clear inputs after successful upload
            listeningSectionAudioRef.current.value = '';
            listeningSectionCsvRef.current.value = '';
            setListeningSectionData({
                course_id: '', // This will be reset by selectedUploadCourseId change if dropdown changes
                section_title: '',
                section_number: '',
            });
            setSelectedUploadCourseId('');
            setSelectedUploadCourseType('');
            fetchCourses(); // Refresh courses to update views if needed
        } catch (error) {
            console.error("Error uploading listening section:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to upload listening section.');
        } finally {
            setIsUploadingListeningSection(false);
        }
    };

    // --- Handle Image Upload ---
    const handleImageUpload = async (e) => {
        e.preventDefault();
        const file = imageUploadRef.current?.files[0];

        if (!file) {
            toast.error('Please select an image file.');
            return;
        }

        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('image', file); // 'image' matches backend multer field name

        try {
            // Assuming your backend has an endpoint like '/api/uploads/image' that saves
            // the image and returns its path (e.g., { filePath: 'images/your-image.png' })
            const res = await api.post('/api/uploads/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // ✅ CORRECTED: Use res.data.filePath as returned by the backend testController.uploadListeningImage
            setUploadedImagePath(res.data.filePath);
            toast.success('Image uploaded successfully! Path copied to clipboard.');
            // Automatically copy to clipboard
            // document.execCommand('copy') is deprecated but more compatible in iframes than navigator.clipboard.writeText
            const tempInput = document.createElement('input');
            // ✅ CORRECTED: Use res.data.filePath
            tempInput.value = res.data.filePath;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
        } catch (error) {
            console.error("Error uploading image:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to upload image.');
        } finally {
            setIsUploadingImage(false);
            imageUploadRef.current.value = ''; // Clear the file input
        }
    };

    const copyImagePathToClipboard = () => {
        if (uploadedImagePath) {
            const tempInput = document.createElement('input');
            tempInput.value = uploadedImagePath;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            toast.info('Image path copied to clipboard!');
        } else {
            toast.warn('No image path to copy.');
        }
    };


    // Handler for the CSV/Individual Question upload course selection dropdown
    const handleUploadCourseSelectChange = (e) => {
        const courseId = e.target.value;
        setSelectedUploadCourseId(courseId);
        if (courseId) {
            const selectedCourse = courses.find(c => c.id === parseInt(courseId));
            setSelectedUploadCourseType(selectedCourse ? selectedCourse.type : '');
            // Set course_id for listeningSectionData
            setListeningSectionData(prev => ({ ...prev, course_id: courseId }));
        } else {
            setSelectedUploadCourseType('');
            setListeningSectionData({ // Reset all listeningSectionData when no course is selected
                course_id: '',
                section_title: '',
                section_number: '',
            });
        }
        // Reset all file inputs when course selection changes
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // These refs are for the NEW unified listening section upload
        if (listeningSectionAudioRef.current) {
            listeningSectionAudioRef.current.value = '';
        }
        if (listeningSectionCsvRef.current) {
            listeningSectionCsvRef.current.value = '';
        }
        // Reset image upload field
        if (imageUploadRef.current) {
            imageUploadRef.current.value = '';
            setUploadedImagePath(''); // Clear displayed path
        }
    };


    // --- Set Course Time Functions ---
    const fetchSpeakingCourseQuestionsForTiming = useCallback(async (courseId) => {
        if (!courseId) {
            setSpeakingCourseQuestions([]);
            setQuestionTimers({});
            return;
        }
        try {
            const res = await api.get(`/api/tests/course-details-with-questions/${courseId}`);
            const speakingQs = res.data.questions.filter(q => q.question_type === 'speaking');
            setSpeakingCourseQuestions(speakingQs);

            const initialTimers = {};
            speakingQs.forEach(q => {
                initialTimers[q.id] = q.timer !== null ? (q.timer / 60) : '';
            });
            setQuestionTimers(initialTimers);

        } catch (error) {
            console.error("Error fetching speaking questions for timing:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to fetch speaking questions for timing.');
            setSpeakingCourseQuestions([]);
            setQuestionTimers({});
        }
    }, [setSpeakingCourseQuestions, setQuestionTimers]);


    const handleQuestionTimerChange = (questionId, value) => {
        const parsedValue = value === '' ? '' : parseFloat(value);
        setQuestionTimers(prev => ({
            ...prev, // Fixed: Changed 'prevData' to 'prev'
            [questionId]: parsedValue
        }));
    };

    const handleUpdateQuestionTimer = async (questionId) => {
        const newTimerMinutes = questionTimers[questionId];
        const newTimerSeconds = parseFloat(newTimerMinutes) * 60;

        if (isNaN(newTimerSeconds) || newTimerSeconds < 0) {
            toast.error('Please enter a valid non-negative number for the timer.');
            return;
        }

        try {
            const res = await api.patch(`/api/tests/questions/${questionId}/update-timer`, {
                timer_duration_seconds: newTimerSeconds
            });
            toast.success(res.data.message);
            fetchSpeakingCourseQuestionsForTiming(selectedSpeakingCourseIdForTimer);
        } catch (error) {
            console.error("Error updating question timer:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to update question timer.');
        }
    };

    const handleUpdateDuration = async (courseId, newDurationMinutes) => {
        const durationSeconds = parseInt(newDurationMinutes) * 60;
        if (isNaN(durationSeconds) || durationSeconds <= 0) {
            toast.error('Please enter a valid positive number for duration.');
            return;
        }
        try {
            const res = await api.patch(`/api/admin/courses/${courseId}/duration`, {
                test_duration: durationSeconds
            });
            toast.success(res.data.message);
            fetchCourses();
        } catch (error) {
            console.error("Error updating course duration:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to update course duration.');
        }
    };

    // --- Writing Review Functions ---
    const fetchWritingSubmissionDetails = useCallback(async (submissionId) => {
        setWritingSubmissionLoading(true);
        setWritingSubmissionError(null);
        try {
            const res = await api.get(`/api/tests/writing-submission/${submissionId}`);
            setCurrentWritingSubmission(res.data.submission);
            // Use 'score' if 'current_score' is not available or is null
            setWritingSubmissionScore(res.data.submission.current_score !== null && res.data.submission.current_score !== undefined ? res.data.submission.current_score : (res.data.submission.score !== null && res.data.submission.score !== undefined ? res.data.submission.score : ''));
        } catch (err) {
            console.error('Error fetching writing submission details:', err.response?.data || err.message);
            setWritingSubmissionError(err.response?.data?.message || 'Failed to load submission details.');
            toast.error(err.response?.data?.message || 'Failed to load submission details.');
        } finally {
            setWritingSubmissionLoading(false);
        }
    }, [setWritingSubmissionLoading, setWritingSubmissionError, setCurrentWritingSubmission, setWritingSubmissionScore]);

    const handleSaveWritingScore = async () => {
        if (!selectedSubmissionId || writingSubmissionScore === '') {
            toast.error('Please enter a score before saving.');
            return;
        }
        const scoreValue = parseInt(writingSubmissionScore);
        if (isNaN(scoreValue) || scoreValue < 0) {
            toast.error('Please enter a valid non-negative number for the score.');
            return;
        }

        setWritingSubmissionIsSaving(true);
        try {
            const response = await api.patch(`/api/tests/writing-submission/${selectedSubmissionId}/score`, { score: scoreValue });
            toast.success(response.data.message);
            // After saving, refresh the lists
            // This will trigger the useEffect to refetch pending/reviewed lists
            setWritingReviewSubSection('reviewed'); // Switch to reviewed to show the updated list
            setSelectedSubmissionId(null); // Clear selected submission to go back to list view
            setCurrentWritingSubmission(null);
            setWritingSubmissionScore('');
        } catch (err) {
            console.error('Error saving writing score:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to save score.');
        } finally {
            setWritingSubmissionIsSaving(false);
        }
    };

    useEffect(() => {
        const fetchPendingWritingReviews = async () => {
            try {
                const res = await api.get('/api/tests/writing-reviews');
                setPendingWritingReviews(res.data.reviews || []);
            } catch (err) {
                console.error('Error fetching pending writing reviews:', err);
                toast.error('Failed to fetch pending writing reviews.');
            }
        };

        const fetchReviewedWritingSubmissions = async () => {
            try {
                const res = await api.get('/api/tests/writing-tests/reviewed-submissions');
                setReviewedWritingSubmissions(res.data.submissions || []);
            } catch (err) {
                console.error('Error fetching reviewed writing submissions:', err);
                toast.error('Failed to fetch reviewed writing submissions.');
            }
        };

        if (activeSection === 'writingReview') {
            if (writingReviewSubSection === 'pending') {
                fetchPendingWritingReviews();
            } else if (writingReviewSubSection === 'reviewed') {
                fetchReviewedWritingSubmissions();
            }
        }
    }, [activeSection, writingReviewSubSection, selectedSubmissionId, setPendingWritingReviews, setReviewedWritingSubmissions]);


    useEffect(() => {
        if (activeSection === 'writingReview' && selectedSubmissionId) {
            fetchWritingSubmissionDetails(selectedSubmissionId);
        } else {
            setCurrentWritingSubmission(null);
            setWritingSubmissionScore('');
        }
    }, [selectedSubmissionId, activeSection, fetchWritingSubmissionDetails]);


    // --- Speaking Review Functions ---
    useEffect(() => {
        // This useEffect was empty, adding a placeholder for future speaking review fetches
        // if needed when activeSection or speakingReviewSubSection changes.
        // For now, SpeakingTestReviews and ReviewedSpeakingTestsList components handle their own fetches.
    }, [activeSection, speakingReviewSubSection, selectedSubmissionId]);


    // --- Logout Function ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.info('You have been logged out.');
        navigate('/login');
    };

    // --- Welcome Content for Admin Dashboard ---
    const renderWelcomeContent = () => {
        return (
            <div className="welcome-section text-center p-8 bg-gray-800 rounded-lg shadow-xl text-white max-w-2xl mx-auto my-8">
                <h3 className="text-3xl font-bold mb-6 text-purple-400">{t('welcome')} to the {t('adminPanel')}!</h3>
                <p className="text-lg text-gray-300 mb-6">
                    From here, you can manage all aspects of the testing platform.
                    Use the sidebar to navigate through the different functionalities.
                </p>
                <div className="text-left space-y-4 text-gray-200">
                    <p className="text-xl font-semibold text-purple-300">{t('hereIsWhatYouCanDo')}:</p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                        <li><strong>{t('addNewCourse')}:</strong> Create new courses for different subjects and test types (Reading, Writing, Speaking, Listening).</li>
                        <li><strong>{t('viewManageCourses')}:</strong> See all existing courses, view their details including uploaded questions, and delete courses if necessary.</li>
                        <li><strong>{t('setCourseTime')}:</strong> Define the overall test duration for Reading, Writing, and Listening courses, or set individual question timers for Speaking courses.</li>
                        <li><strong>{t('uploadQuestions')}:</strong> Add questions to your courses, either by uploading a CSV file (for Reading, Writing, Speaking) or by adding individual Listening questions with associated audio files.</li>
                        <li><strong>{t('writingReview')}:</strong> Review and score pending writing test submissions from students. You can also view previously reviewed submissions.</li>
                        <li><strong>{t('speakingReview')}:</strong> Review and score pending speaking test submissions from students, and view past reviewed submissions.</li>
                        <li><strong>{t('profile')}:</strong> View your admin profile details.</li>
                        <li><strong>{t('logout')}:</strong> Securely log out of the admin panel.</li>
                    </ul>
                </div>
                <p className="text-md text-gray-400 mt-8">
                    Start by selecting an option from the left sidebar to begin managing your courses and tests.
                </p>
            </div>
        );
    };


    // --- Conditional Rendering of Content Sections ---
    const renderContent = () => {
        const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

        switch (activeSection) {
            case 'welcome': // New case for the welcome screen
                return renderWelcomeContent();
            case 'addCourse':
                return (
                    <div className="form-section">
                        <h3>{t('addNewCourse')}</h3>
                        <form onSubmit={handleAddCourse}>
                            <label htmlFor="title">{t('courseTitle')}:</label>
                            <input type="text" id="title" name="title" value={courseData.title} onChange={handleCourseChange} required />

                            <label htmlFor="subject">{t('subject')}:</label>
                            <input type="text" id="subject" name="subject" value={courseData.subject} onChange={handleCourseChange} required />

                            <label htmlFor="description">{t('description')}:</label>
                            <textarea id="description" name="description" value={courseData.description} onChange={handleCourseChange} required rows="4"></textarea>

                            <label htmlFor="type">{t('courseType')}:</label>
                            <select id="type" name="type" value={courseData.type} onChange={handleCourseChange} required>
                                <option value="">{t('select')} {t('courseType')}</option>
                                {courseTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>

                            {(courseData.type === 'Reading' || courseData.type === 'Writing' || courseData.type === 'Listening') && (
                                <>
                                    <label htmlFor="test_duration">{t('testDuration')} ({t('minutes')}):</label>
                                    <input
                                        type="number"
                                        id="test_duration"
                                        name="test_duration"
                                        value={courseData.test_duration}
                                        onChange={handleCourseChange}
                                        min="1"
                                        required={true}
                                    />
                                </>
                            )}
                            <button type="submit">{t('add')} {t('course')}</button>
                        </form>
                    </div>
                );

            case 'uploadTest':
                return (
                    <div className="form-section">
                        <h3>{t('uploadQuestions')}</h3>
                        
                        {/* Section for Uploading Individual Images - Only displayed for Listening course type */}
                      
                        {selectedUploadCourseType === 'Listening' && (
                            <div className="mt-6 p-4 bg-gray-700 rounded-lg text-white mb-8">
                                 
                                <h4 className="text-xl font-bold mb-4 flex items-center">
                                    <FontAwesomeIcon icon={faImage} className="mr-3 text-purple-300" /> Upload Image File
                                </h4>
                                <p className="text-gray-300 mb-4">
                                    Upload individual image files to get a direct path. You can then copy this path and paste it into your CSVs for image questions (e.g., `image_path` column in Listening or Reading CSVs).
                                </p>
                                <form onSubmit={handleImageUpload} className="flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <label htmlFor="image-file-input" className="text-gray-200 w-1/2">Select Image File:</label>
                                        <input
                                            type="file"
                                            id="image-file-input"
                                            accept="image/*"
                                            ref={imageUploadRef}
                                            required
                                            className="w-1/2 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isUploadingImage}
                                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out ${isUploadingImage ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    >
                                        {isUploadingImage ? 'Uploading Image...' : 'Upload Image'}
                                    </button>
                                </form>
                                {uploadedImagePath && (
                                    <div className="mt-4 p-3 bg-gray-600 rounded-lg flex items-center justify-between flex-wrap gap-2">
                                        <p className="text-gray-200 break-all">
                                            **Uploaded Image Path:** <span className="font-mono text-purple-200">{uploadedImagePath}</span>
                                        </p>
                                        <button
                                            onClick={copyImagePathToClipboard}
                                            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition duration-300 flex items-center"
                                        >
                                            <FontAwesomeIcon icon={faCopy} className="mr-2" /> Copy Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* End of Section for Uploading Individual Images */}

                        <hr className="my-8 border-gray-600" /> {/* Separator */}

                        <label htmlFor="upload-course-select">{t('selectCourse')} {t('toUploadQuestions')}:</label>
                        <select
                            id="upload-course-select"
                            value={selectedUploadCourseId}
                            onChange={handleUploadCourseSelectChange}
                            required
                        >
                            <option value="">Select a Course</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.title} (ID: {course.id}) - {course.type}
                                </option>
                            ))}
                        </select>

                        {/* Conditional rendering based on selected course type */}
                        {selectedUploadCourseType === 'Listening' ? (
                            <div className="mt-6 p-4 bg-gray-700 rounded-lg text-white">
                                <h4 className="text-xl font-bold mb-4">Upload Listening Section (Audio + Questions CSV)</h4>
                                <p className="text-gray-300 mb-4">
                                    Upload an audio file and a CSV containing questions for this specific listening section.
                                    Each section has its own audio and set of questions.
                                </p>
                                <form onSubmit={handleUploadListeningSection} className="flex flex-col gap-4">
                                    {/* Section Title */}
                                    <label htmlFor="section_title">Section Title (e.g., "Part 1", "Conversation A"):</label>
                                    <input
                                        type="text"
                                        id="section_title"
                                        name="section_title"
                                        value={listeningSectionData.section_title}
                                        onChange={handleListeningSectionDataChange}
                                        placeholder="e.g., Section 1, Part A"
                                        required
                                    />

                                    {/* Section Number */}
                                    <label htmlFor="section_number">Section Number (for ordering):</label>
                                    <input
                                        type="number"
                                        id="section_number"
                                        name="section_number"
                                        value={listeningSectionData.section_number}
                                        onChange={handleListeningSectionDataChange}
                                        placeholder="e.g., 1, 2, 3"
                                        min="1"
                                        required
                                    />

                                    {/* Audio File Input - Corrected Layout */}
                                    <div className="flex items-center gap-4 mb-2"> {/* Added flex container */}
                                        <label htmlFor="listening-section-audio-file-input" className="text-gray-200 w-1/2">Select Audio File for this Section:</label>
                                        <input
                                            type="file"
                                            id="listening-section-audio-file-input"
                                            accept="audio/*"
                                            ref={listeningSectionAudioRef}
                                            required
                                            className="w-1/2 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        />
                                    </div>

                                    {/* CSV File Input - Corrected Layout */}
                                    <div className="flex items-center gap-4 mb-4"> {/* Added flex container */}
                                        <label htmlFor="listening-section-csv-file-input" className="text-gray-200 w-1/2">Select Questions CSV File for this Section:</label>
                                        <input
                                            type="file"
                                            id="listening-section-csv-file-input"
                                            accept=".csv"
                                            ref={listeningSectionCsvRef}
                                            required
                                            className="w-1/2 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isUploadingListeningSection}
                                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out ${isUploadingListeningSection ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                    >
                                        {isUploadingListeningSection ? 'Uploading Section...' : 'Upload Listening Section'}
                                    </button>
                                </form>
                                <p className="csv-format-info" style={{ color: 'white', marginTop: '1rem', fontSize: '0.9em' }}>
                                    **Listening Questions CSV Format for Sections:**
                                    <br />
                                    The CSV for each section should contain the following columns:
                                    <br />
                                    `question_text,option_a,option_b,option_c,option_d,correct_option,image_path`
                                    <br />
                                    Example: `What is the speaker discussing?,Option1,Option2,Option3,Option4,B,images/question_image.png`
                                    <br />
                                    `option_c`, `option_d`, and `image_path` are optional.
                                </p>
                            </div>
                        ) : selectedUploadCourseType === 'Reading' ? (
                            <> {/* Added React.Fragment shorthand */}
                                <div className="mt-6 p-4 bg-gray-700 rounded-lg text-white">
                                    <h4 className="text-xl font-bold mb-4">Upload Reading Test (Passage + Questions) via CSV</h4>
                                    <p className="text-gray-300 mb-4">
                                        This upload is for Reading courses and expects a CSV with a "PASSAGE" row and "QUESTION" rows.
                                    </p>
                                    <form onSubmit={handleCsvFileUpload}>
                                        <label htmlFor="reading-csv-file-input" className="block text-gray-200">Upload Reading CSV File:</label>
                                        <input type="file" id="reading-csv-file-input" accept=".csv" ref={fileInputRef} required
                                            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                        />
                                        <button type="submit" className="px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out bg-blue-600 hover:bg-blue-700 text-white mt-4">
                                            Upload Reading Test
                                        </button>
                                    </form>
                                    <p className="csv-format-info" style={{ color: 'white', marginTop: '1rem', fontSize: '0.9em' }}>
                                        **Reading CSV Format:**
                                        <br />
                                        The CSV must contain the following columns: `TYPE,VALUE,OPTION_A,OPTION_B,OPTION_C,OPTION_D,CORRECT_ANSWER,
                                        <br />CORRECT_BLANK_1,CORRECT_BLANK_2,CORRECT_BLANK_3`
                                        <br /><br />
                                        Supported `TYPE` values:
                                        <br />
                                        1.  **PASSAGE Row:** `TYPE,VALUE`
                                        <br />
                                        Example: `PASSAGE,"Your full reading passage content here...",,,,,,,`
                                        <br /><br />
                                        2.  **QUESTION (Multiple Choice) Rows:** `TYPE,VALUE,OPTION_A,OPTION_B,OPTION_C,OPTION_D,CORRECT_ANSWER`
                                        <br />
                                        Example: `QUESTION,"What is the main idea?",Option1,Option2,Option3,Option4,B,,,,`
                                        <br /><br />
                                        3.  **TRUE_FALSE_QUESTION Rows:** `TYPE,VALUE,CORRECT_ANSWER`
                                        <br />
                                        Example: `TRUE_FALSE_QUESTION,"The Amazon River is the longest river in the world.",FALSE,,,,,,`
                                        <br /><br />
                                        4.  **FILL_BLANK_QUESTION Rows:** `TYPE,VALUE,CORRECT_BLANK_1,CORRECT_BLANK_2,CORRECT_BLANK_3`
                                        <br />
                                        Example: `FILL_BLANK_QUESTION,"The Amazon rainforest is renowned for its [BLANK] and is home to the [BLANK] River.",,,biodiversity,Amazon,,`
                                        <br />
                                        (Use empty commas for unused `OPTION_X` or `CORRECT_BLANK_X` columns.)
                                    </p>
                                </div>
                            </>
                        ) : (
                            <> {/* Added React.Fragment shorthand */}
                                {/* Existing CSV upload form for other types (Writing, Speaking, general MCQ) */}
                                <div className="mt-6">
                                    <h4 className="text-xl font-bold mb-4">Upload Questions via CSV</h4>
                                    <form onSubmit={handleCsvFileUpload}>
                                        <label htmlFor="csv-file-input">Upload CSV File:</label>
                                        <input type="file" id="csv-file-input" accept=".csv" ref={fileInputRef} required />
                                        <button type="submit">Upload Questions</button>
                                    </form>
                                    <p className="csv-format-info" style={{ color: 'white', marginTop: '1rem', fontSize: '0.9em' }}>
                                        **CSV Format Guidelines:**
                                        <br />
                                        <br />
                                        **General MCQ Questions:** `question,option_a,option_b,option_c,option_d,correct_option` (correct_option: A, B, C, or D)
                                        <br />
                                        Example: `What is 2+2?,3,4,5,6,B`
                                        <br />
                                        <br />
                                        **Writing (Descriptive) Questions:** `question`
                                        <br />
                                        Example: `Write an essay on climate change.`
                                        <br />
                                        <br />
                                        **Speaking Questions:** `question_text`
                                        <br />
                                        Example: `Describe your favorite hobby and why you enjoy it.`
                                        <br />
                                        (Note: For Speaking, timers are set individually on this dashboard after upload.)
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'viewCourses':
                return (
                    <div className="view-courses-section">
                        <h3>{t('viewManageCourses')}</h3>
                        {selectedCourseDetails ? (
                            <div className="course-details-view form-section" style={{ maxWidth: '800px', margin: '2rem auto', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
                                <button onClick={() => setSelectedCourseDetails(null)} className="primary-button" style={{ marginBottom: '1rem', padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>← Back to Courses List</button>
                                <h4 style={{ fontSize: '1.5em', marginBottom: '10px', color: '#333' }}>{selectedCourseDetails.course.title} ({selectedCourseDetails.course.type})</h4>
                                <p style={{ marginBottom: '5px' }}><strong>Subject:</strong> {selectedCourseDetails.course.subject}</p>
                                <p style={{ marginBottom: '5px' }}><strong>Description:</strong> {selectedCourseDetails.course.description}</p>
                                {(selectedCourseDetails.course.type === 'Reading' || selectedCourseDetails.course.type === 'Writing' || selectedCourseDetails.course.type === 'Listening') && (
                                    <p style={{ marginBottom: '15px' }}><strong>Test Duration:</strong> {selectedCourseDetails.course.test_duration ? selectedCourseDetails.course.test_duration / 60 : 'Not Set'} minutes</p>
                                )}
                                {(selectedCourseDetails.course.type === 'Speaking') && (
                                    <p style={{ marginBottom: '15px' }}><strong>Test Duration:</strong> N/A (Individual question timers for Speaking)</p>
                                )}

                                {/* Consolidated NEW: Display Questions based on course type */}
                                {selectedCourseDetails.course.type === 'Reading' ? (
                                    selectedCourseDetails.passagesWithQuestions && selectedCourseDetails.passagesWithQuestions.length > 0 ? (
                                        selectedCourseDetails.passagesWithQuestions.map((passageGroup, pIdx) => (
                                            <div key={passageGroup.passage.id} style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
                                                <h5 style={{ fontSize: '1.3em', marginBottom: '10px', color: '#1a237e' }}>Passage {pIdx + 1}: {passageGroup.passage.title}</h5>
                                                <p style={{ whiteSpace: 'pre-wrap', fontSize: '1em', lineHeight: '1.6', color: '#333' }}>{passageGroup.passage.content}</p>

                                                <h6 style={{ fontSize: '1.2em', marginTop: '20px', marginBottom: '10px', color: '#333' }}>Questions for this Passage:</h6>
                                                {passageGroup.questions.length === 0 ? (
                                                    <p style={{ color: '#666' }}>No questions uploaded for this passage yet.</p>
                                                ) : (
                                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                                        {passageGroup.questions.map((q, qIdx) => (
                                                            <li key={q.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: '#fff' }}>
                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                                                    {qIdx + 1}. ({q.question_type.toUpperCase()}): {q.question}
                                                                </p>
                                                                {(q.question_type === 'reading_mcq') && (
                                                                    <ul style={{ marginLeft: '20px', listStyle: 'disc', fontSize: '0.9em', color: '#555' }}>
                                                                        <li>A: {q.option_a}</li>
                                                                        <li>B: {q.option_b}</li>
                                                                        <li>C: {q.option_c}</li>
                                                                        <li>D: {q.option_d}</li>
                                                                        <li style={{ fontWeight: 'bold', color: 'green' }}>Correct: {q.correct_option}</li>
                                                                    </ul>
                                                                )}
                                                                {q.question_type === 'true_false' && (
                                                                    <p style={{ marginLeft: '20px', fontSize: '0.9em', color: '#555' }}>
                                                                        <strong style={{ color: '#007bff' }}>Correct Answer:</strong> {q.correct_option}
                                                                    </p>
                                                                )}
                                                                {q.question_type === 'fill_in_blanks' && (
                                                                    <div style={{ marginLeft: '20px', fontSize: '0.9em', color: '#555' }}>
                                                                        <strong style={{ color: '#007bff' }}>Correct Blanks:</strong>
                                                                        <ul style={{ listStyle: 'disc', marginLeft: '20px' }}>
                                                                            {(() => {
                                                                                console.log('Frontend: Raw q.correct_answers_json for fill_in_blanks:', q.correct_answers_json);
                                                                                console.log('Frontend: Type of q.correct_answers_json:', typeof q.correct_answers_json);
                                                                                try {
                                                                                    let blanks = typeof q.correct_answers_json === 'string'
                                                                                        ? JSON.parse(q.correct_answers_json)
                                                                                        : q.correct_answers_json;

                                                                                    // Handle case where blanks is an object with numeric keys
                                                                                    if (blanks && typeof blanks === 'object' && !Array.isArray(blanks)) {
                                                                                        blanks = Object.values(blanks);
                                                                                    }

                                                                                    if (Array.isArray(blanks)) {
                                                                                        return blanks.map((blank, bIdx) => (
                                                                                            <li key={bIdx}>{String(blank)}</li>
                                                                                        ));
                                                                                    } else {
                                                                                        console.error('Frontend: Parsed blanks is not an array:', blanks);
                                                                                        return <li style={{ color: 'red' }}>Error: Invalid blank format. Raw: {String(q.correct_answers_json)}</li>;
                                                                                    }
                                                                                } catch (parseError) {
                                                                                    console.error('Frontend: JSON.parse error for correct_answers_json:', parseError, 'Raw value:', q.correct_answers_json);
                                                                                    return <li style={{ color: 'red' }}>Error parsing blanks. Raw: {String(q.correct_answers_json)}</li>;
                                                                                }
                                                                            })()}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#666' }}>No passages or questions uploaded for this Reading course yet.</p>
                                    )
                                ) : selectedCourseDetails.course.type === 'Listening' ? (
                                    selectedCourseDetails.listeningSections && selectedCourseDetails.listeningSections.length > 0 ? (
                                        selectedCourseDetails.listeningSections.map((section, sIdx) => (
                                            <div key={section.id} style={{ marginTop: '20px', marginBottom: '20px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
                                                <h5 style={{ fontSize: '1.3em', marginBottom: '10px', color: '#1a237e' }}>
                                                    Section {sIdx + 1} ({section.section_title}) - Audio:
                                                </h5>
                                                <audio controls preload="auto" key={`section-audio-${section.id}`} style={{ width: '100%', maxWidth: '300px', marginBottom: '10px' }} onError={(e) => console.error('Section audio load error:', e.target.error, getAudioSrc(section.audio_file_path))}>
                                                    <source src={getAudioSrc(section.audio_file_path)} type="audio/webm" />
                                                    Your browser does not support the audio element.
                                                </audio>

                                                <h6 style={{ fontSize: '1.2em', marginTop: '20px', marginBottom: '10px', color: '#333' }}>Questions for this Section:</h6>
                                                {section.questions.length === 0 ? (
                                                    <p style={{ color: '#666' }}>No questions uploaded for this section yet.</p>
                                                ) : (
                                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                                        {section.questions.map((q, qIdx) => (
                                                            <li key={q.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: '#fff' }}>
                                                                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                                                    {qIdx + 1}. ({q.question_type.toUpperCase()}): {q.question}
                                                                </p>
                                                                {q.image_path && (
                                                                    <p className="mt-2">
                                                                        <strong style={{ color: '#007bff' }}>Image:</strong><br />
                                                                        <img
                                                                            src={getImageSrc(q.image_path)}
                                                                            alt={`Question ${qIdx + 1} illustration`}
                                                                            style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain', marginTop: '5px', borderRadius: '8px' }}
                                                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/150x100/EEEEEE/333333?text=Image+Load+Error'; console.error('Image load error:', e.target.error, getImageSrc(q.image_path)); }}
                                                                        />
                                                                    </p>
                                                                )}
                                                                <ul style={{ marginLeft: '20px', listStyle: 'disc', fontSize: '0.9em', color: '#555' }}>
                                                                    <li>A: {q.option_a}</li>
                                                                    <li>B: {q.option_b}</li>
                                                                    {q.option_c && <li>C: {q.option_c}</li>}
                                                                    {q.option_d && <li>D: {q.option_d}</li>}
                                                                    <li style={{ fontWeight: 'bold', color: 'green' }}>Correct: {q.correct_option}</li>
                                                                </ul>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ color: '#666' }}>No listening sections or questions uploaded for this Listening course yet.</p>
                                    )
                                ) : ( // This else block handles all non-Reading/non-Listening course types (general MCQ, Writing, Speaking)
                                    <>
                                        <h5 className="text-xl font-bold mt-6 mb-4 text-purple-300">Questions:</h5>
                                        {selectedCourseDetails.questions.length === 0 ? (
                                            <p style={{ color: '#666' }}>No questions uploaded for this course yet.</p>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                                {selectedCourseDetails.questions.map((q, index) => (
                                                    <li key={q.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: '#fff' }}>
                                                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                                            {index + 1}. ({q.question_type.toUpperCase()}): {q.question}
                                                        </p>
                                                        {q.question_type === 'listening' && (
                                                            <div style={{ marginLeft: '20px', fontSize: '0.9em', color: '#555' }}>
                                                                <p><strong style={{ color: '#007bff' }}>Audio:</strong>
                                                                <audio controls preload="auto" key={`audio-${q.id}`} style={{ width: '100%', maxWidth: '250px', marginTop: '5px' }} onError={(e) => console.error('Audio load error:', e.target.error, getAudioSrc(q.audio_file_path))}>
                                                                    {/* IMPORTANT: Use audio/webm for WebM files, or audio/mpeg for MP3, etc. */}
                                                                        <source src={getAudioSrc(q.audio_file_path)} type="audio/webm" />
                                                                        Your browser does not support the audio element.
                                                                    </audio>
                                                                </p>
                                                                {/* NEW: Display Image for Listening Questions if available */}
                                                                {q.image_path && (
                                                                    <p className="mt-2">
                                                                        <strong style={{ color: '#007bff' }}>Image:</strong><br />
                                                                        <img
                                                                            src={getImageSrc(q.image_path)}
                                                                            alt={`Question ${index + 1} illustration`}
                                                                            style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'contain', marginTop: '5px', borderRadius: '8px' }}
                                                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/200x150/EEEEEE/333333?text=Image+Load+Error'; console.error('Image load error:', e.target.error, getImageSrc(q.image_path)); }}
                                                                        />
                                                                    </p>
                                                                )}
                                                                <ul style={{ marginLeft: '20px', listStyle: 'disc', fontSize: '0.9em', color: '#555' }}>
                                                                    <li>A: {q.option_a}</li>
                                                                    <li>B: {q.option_b}</li>
                                                                    {q.option_c && <li>C: {q.option_c}</li>} {/* Only show if option_c has value */}
                                                                    {q.option_d && <li>D: {q.option_d}</li>} {/* Only show if option_d has value */}
                                                                    <li style={{ fontWeight: 'bold', color: 'green' }}>Correct: {q.correct_option}</li>
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {(q.question_type === 'mcq') && (
                                                            <ul style={{ marginLeft: '20px', listStyle: 'disc', fontSize: '0.9em', color: '#555' }}>
                                                                <li>A: {q.option_a}</li>
                                                                <li>B: {q.option_b}</li>
                                                                <li>C: {q.option_c}</li>
                                                                <li>D: {q.option_d}</li>
                                                                <li style={{ fontWeight: 'bold', color: 'green' }}>Correct: {q.correct_option}</li>
                                                            </ul>
                                                        )}
                                                        {q.question_type === 'speaking' && (
                                                            <p style={{ marginLeft: '20px', fontSize: '0.9em', color: '#555' }}> {/* Corrected: Added closing brace for style object */}
                                                                <strong style={{ color: '#007bff' }}>Timer:</strong> {q.timer !== null ? `${q.timer / 60} minutes` : 'Not Set'}
                                                            </p>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </div>
                        ) : (
                            // This is the missing else part: Show the list of courses
                            <div className="courses-list-table">
                                <h4 className="text-xl font-bold mb-4 text-purple-200">{t('availableCourses')}</h4>
                                {courses.length === 0 ? (
                                    <p className="text-center text-gray-300">{t('noCoursesAdded')}</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg shadow-md">
                                        <table className="admin-table">
                                            <thead className="bg-purple-700 text-black">
                                                <tr>
                                                    <th className="py-3 px-4 text-left">ID</th>
                                                    <th className="py-3 px-4 text-left">{t('title')}</th>
                                                    <th className="py-3 px-4 text-left">{t('subject')}</th>
                                                    <th className="py-3 px-4 text-left">{t('type')}</th>
                                                    <th className="py-3 px-4 text-left">{t('duration')} ({t('minutes')})</th>
                                                    <th className="py-3 px-4 text-left">{t('actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {courses.map(course => (
                                                    <tr key={course.id} className="bg-blue-600 border-b border-blue-500 last:border-b-0 hover:bg-blue-700 transition duration-200">
                                                        <td className="py-3 px-4 text-black">{course.id}</td>
                                                        <td className="py-3 px-4 text-black">{course.title}</td>
                                                        <td className="py-3 px-4 text-black">{course.subject}</td>
                                                        <td className="py-3 px-4 text-black">{course.type}</td>
                                                        <td className="py-3 px-4 text-black">{course.test_duration ? `${course.test_duration / 60} ${t('minutes')}` : 'N/A'}</td>
                                                        <td className="py-3 px-4 flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleViewCourseDetails(course.id)}
                                                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                                                            >
                                                                {t('view')}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCourse(course.id)}
                                                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
                                                            >
                                                                {t('delete')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'setCourseTime':
                return (
                    <div className="form-section" style={{ maxWidth: '800px', margin: '2rem auto', border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f9f9f9', color: '#333' }}>
                        <h3 style={{ fontSize: '1.8em', marginBottom: '20px', textAlign: 'center', color: '#333' }}>{t('setCourseTime')}</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label htmlFor="time-type-filter" style={{ display: 'block', marginBottom: '5px', color: '#555' }}>Filter by Type:</label>
                            <select
                                id="time-type-filter"
                                value={timeType}
                                onChange={(e) => {
                                    setTimeType(e.target.value);
                                    setSelectedSpeakingCourseIdForTimer('');
                                    setSpeakingCourseQuestions([]);
                                    setQuestionTimers({});
                                }}
                                style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'white', color: '#333' }}
                            >
                                <option value="Reading">Reading</option>
                                <option value="Writing">Writing</option>
                                <option value="Speaking">Speaking</option>
                                <option value="Listening">Listening</option>
                            </select>
                        </div>

                        {timeType === 'Speaking' && (
                            <div style={{ marginBottom: '15px' }}>
                                <label htmlFor="speaking-course-select-for-timer" style={{ display: 'block', marginBottom: '5px', color: '#555' }}>Select Speaking Course:</label>
                                <select
                                    id="speaking-course-select-for-timer"
                                    value={selectedSpeakingCourseIdForTimer}
                                    onChange={(e) => {
                                        const courseId = e.target.value;
                                        setSelectedSpeakingCourseIdForTimer(courseId);
                                        fetchSpeakingCourseQuestionsForTiming(courseId);
                                    }}
                                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'white', color: '#333' }}
                                >
                                    <option value="">-- Select a Speaking Course --</option>
                                    {courses.filter(course => course.type === 'Speaking').map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.title} (ID: {course.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {timeType !== 'Speaking' && courses.filter(course => course.type === timeType).length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#666' }}>No {timeType} courses available to set time.</p>
                        ) : timeType === 'Speaking' && !selectedSpeakingCourseIdForTimer ? (
                            <p style={{ textAlign: 'center', color: '#666' }}>Please select a Speaking course to view and update question timings.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="dashboard-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Course</th>
                                            <th>Subject</th>
                                            <th>Course Type</th>
                                            <th>Current Duration (min)</th>
                                            <th>New Duration (min)</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeType === 'Speaking' ? (
                                            speakingCourseQuestions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', color: '#666' }}>No questions found for this Speaking course.</td>
                                                </tr>
                                            ) : (
                                                speakingCourseQuestions.map((q, idx) => {
                                                    const selectedCourse = courses.find(c => c.id.toString() === selectedSpeakingCourseIdForTimer.toString());
                                                    return (
                                                        <tr key={q.id}>
                                                            {/* Added text-black to each td */}
                                                            <td className="text-black">{q.id}</td>
                                                            <td className="text-black">{q.question}</td>
                                                            <td className="text-black">{selectedCourse ? selectedCourse.subject : 'Not Set'}</td>
                                                            <td className="text-black">{selectedCourse ? selectedCourse.type : 'Not Set'}</td>
                                                            <td className="text-black">{q.timer !== null ? `${(q.timer / 60).toFixed(2)} min` : 'Not Set'}</td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    value={questionTimers[q.id] || ''}
                                                                    onChange={(e) => handleQuestionTimerChange(q.id, e.target.value)}
                                                                    min="0"
                                                                    step="0.01"
                                                                    style={{ width: '80px', padding: '5px', borderRadius: '3px', border: '1px solid #ccc' }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <button
                                                                    onClick={() => handleUpdateQuestionTimer(q.id)}
                                                                    style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                                                >
                                                                    Update
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )
                                        ) : (
                                            courses
                                                .filter(course => course.type === timeType)
                                                .map((course, idx) => (
                                                    <tr key={course.id}>
                                                        {/* Added text-black to each td */}
                                                        <td className="text-black">{course.id}</td>
                                                        <td className="text-black">{course.title}</td>
                                                        <td className="text-black">{course.subject}</td>
                                                        <td className="text-black">{course.type}</td>
                                                        <td className="text-black">
                                                            {course.test_duration ? <strong>{`${course.test_duration / 60} min`}</strong> : 'N/A'}
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                defaultValue={course.test_duration ? course.test_duration / 60 : ''}
                                                                id={`duration-input-${course.id}`}
                                                                min="1"
                                                                style={{ width: '80px', padding: '5px', borderRadius: '3px', border: '1px solid #ccc' }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => {
                                                                    const newDuration = document.getElementById(`duration-input-${course.id}`).value;
                                                                    handleUpdateDuration(course.id, newDuration);
                                                                }}
                                                                style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                                            >
                                                                Update
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );

            case 'writingReview':
                return (
                    <div className="review-writing-tests-wrapper form-section p-6 bg-gray-800 rounded-lg shadow-xl text-white max-w-4xl mx-auto my-8">
                        <h3 className="text-2xl font-bold mb-6 text-center text-purple-300">{t('writingReview')}</h3>
                        <div className="flex gap-6 mb-6 justify-center">
                            <button
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${writingReviewSubSection === 'pending' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => {
                                    setWritingReviewSubSection('pending');
                                    setSelectedSubmissionId(null);
                                }}
                                style={{ marginRight: '1rem' }}
                            >
                                {t('reviewWritingTest')}
                            </button>
                            <button
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${writingReviewSubSection === 'reviewed' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => {
                                    setWritingReviewSubSection('reviewed');
                                    setSelectedSubmissionId(null);
                                }}
                            >
                                {t('reviewedTests')}
                            </button>
                        </div>

                        {selectedSubmissionId ? (
                            <div className="writing-submission-detail-container p-6 bg-gray-700 rounded-lg shadow-inner">
                                <button
                                    onClick={() => setSelectedSubmissionId(null)}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 mb-6"
                                >
                                    ← Back to Review List
                                </button>

                                <h4 className="text-xl font-bold mb-4 text-purple-300">{t('reviewWritingTest')} {t('submit')}</h4>

                                {writingSubmissionLoading ? (
                                    <p className="text-center text-white text-lg mt-8">Loading submission details...</p>
                                ) : writingSubmissionError ? (
                                    <p className="text-center text-red-400 text-lg mt-8">Error: {writingSubmissionError}</p>
                                ) : currentWritingSubmission ? (
                                    <>
                                        {/* Changed text-black on this div */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-black">
                                            <p><strong className="text-purple-200">Student Name:</strong> {currentWritingSubmission.user_name}</p>
                                            <p><strong className="text-purple-200">Course Name:</strong> {currentWritingSubmission.course_name}</p>
                                            <p><strong className="text-purple-200">Submitted At:</strong> {moment(currentWritingSubmission.date_time).format('YYYY-MM-DD HH:mm:ss')}</p>
                                            <p><strong className="text-purple-200">Time Taken:</strong> {formatDuration(currentWritingSubmission.total_time_taken_sec)}</p>
                                            <p><strong className="text-purple-200">Current Score:</strong> {currentWritingSubmission.current_score !== null ? currentWritingSubmission.current_score : 'Not Scored'}</p>
                                        </div>

                                        <h5 className="text-xl font-bold mt-6 mb-4 text-purple-300">Questions and Answers:</h5>
                                        {currentWritingSubmission.questions_and_answers && currentWritingSubmission.questions_and_answers.length > 0 ? (
                                            <div className="space-y-4">
                                                {currentWritingSubmission.questions_and_answers.map((qa, index) => (
                                                    <div key={qa.question_id} className="bg-gray-600 p-4 rounded-lg shadow-inner">
                                                        <p className="font-semibold text-lg text-purple-100 mb-2">
                                                            {index + 1}. Question: {qa.question_text}
                                                        </p>
                                                        {/* Changed text-white on this p */}
                                                        <p className="text-white">
                                                            <strong>Student Answer:</strong> {qa.user_answer || 'No answer provided.'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-black">No questions or answers found for this submission.</p>
                                        )}

                                        <div className="mt-8 pt-6 border-t border-gray-600">
                                            <label htmlFor="score-input" className="block text-xl font-medium text-purple-300 mb-2">
                                                Enter Score:
                                            </label>
                                            <input
                                                type="number"
                                                id="score-input"
                                                value={writingSubmissionScore}
                                                onChange={(e) => setWritingSubmissionScore(e.target.value)}
                                                min="0"
                                                className="w-40 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 text-black text-lg"
                                                placeholder="e.g., 85"
                                            />
                                            <button
                                                onClick={handleSaveWritingScore}
                                                disabled={writingSubmissionIsSaving}
                                                className={`ml-4 px-6 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105 shadow-lg
                                                    ${writingSubmissionIsSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}
                                                `}
                                            >
                                                {writingSubmissionIsSaving ? 'Saving...' : 'Save Score'}
                                            </button>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        ) : (
                            <>
                                {writingReviewSubSection === 'pending' && (
                                    <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
                                        <h4 className="text-xl font-bold mb-4 text-purple-200">Pending Reviews</h4>
                                        {pendingWritingReviews.length === 0 ? (
                                            <p className="text-center text-gray-300">No writing tests currently pending review.</p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-lg">
                                                <table className="admin-table">
                                                    <thead className="bg-purple-700 text-black">
                                                        <tr>
                                                            <th className="py-4 px-6 text-left">ID</th>
                                                            <th className="py-4 px-6 text-left">Student Name</th>
                                                            <th className="py-4 px-6 text-left">Course Name</th>
                                                            <th className="py-4 px-6 text-left">Submitted At</th>
                                                            <th className="py-4 px-6 text-left">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {pendingWritingReviews.map((review) => (
                                                            <tr
                                                                key={review.submission_id}
                                                                className="bg-blue-600 border-b border-blue-500 last:border-b-0 hover:bg-blue-700 transition duration-200"
                                                            >
                                                                {/* Added text-black to each td */}
                                                                <td className="py-4 px-6 text-black">{review.submission_id}</td>
                                                                <td className="py-4 px-6 text-black">{review.user_name}</td>
                                                                <td className="py-4 px-6 text-black">{review.course_name}</td>
                                                                <td className="py-4 px-6 text-black">
                                                                    {moment(review.date_time).format('YYYY-MM-DD HH:mm')}
                                                                </td>
                                                                <td className="py-4 px-6">
                                                                    <button
                                                                        onClick={() => setSelectedSubmissionId(review.submission_id)}
                                                                        className="px-5 py-2 bg-white text-blue-700 hover:bg-gray-100 rounded-lg text-sm font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                                                                    >
                                                                        Review
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {writingReviewSubSection === 'reviewed' && (
                                    <div className="p-6 bg-gray-700 rounded-lg shadow-inner">
                                        <h4 className="text-xl font-bold mb-4 text-purple-200">Reviewed Tests</h4>
                                        {reviewedWritingSubmissions.length === 0 ? (
                                            <p className="text-center text-gray-300">No writing tests have been reviewed yet.</p>
                                        ) : (
                                            <div className="overflow-x-auto rounded-lg">
                                                <table className="admin-table">
                                                    <thead className="bg-purple-700 text-black">
                                                        <tr>
                                                            <th className="py-3 px-4 text-left">ID</th>
                                                            <th className="py-3 px-4 text-left">Student Name</th>
                                                            <th className="py-3 px-4 text-left">Course Name</th>
                                                            <th className="py-3 px-4 text-left">Submitted At</th>
                                                            <th className="py-3 px-4 text-left">Scored At</th>
                                                            <th className="py-3 px-4 text-left">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {reviewedWritingSubmissions.map((submission) => (
                                                            <tr key={submission.id} className={`bg-blue-600 border-b border-blue-500 last:border-b-0 hover:bg-blue-700 transition duration-200`}>
                                                                {/* Added text-black to each td, removed text-green-300 */}
                                                                <td className="py-3 px-4 text-black">{submission.id}</td>
                                                                <td className="py-3 px-4 text-black">{submission.user_username}</td>
                                                                <td className="py-3 px-4 text-black">{submission.course_title}</td>
                                                                <td className="py-3 px-4 text-black">{moment(submission.submitted_at).format('YYYY-MM-DD HH:mm')}</td>
                                                                <td className="py-3 px-4 text-black">
                                                                    {submission.scored_at ? moment(submission.scored_at).format('YYYY-MM-DD HH:mm') : 'N/A'}
                                                                </td>
                                                                <td className="py-3 px-4 font-bold text-black">
                                                                    {submission.score !== null && submission.score !== undefined ? submission.score : 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );

            case 'speakingReview':
                return (
                    <div className="review-speaking-tests-wrapper form-section p-6 bg-gray-800 rounded-lg shadow-xl text-white max-w-4xl mx-auto my-8">
                        <h3 className="text-2xl font-bold mb-6 text-center text-purple-300">{t('speakingReview')}</h3>
                        <div className="flex gap-6 mb-6 justify-center">
                            <button
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${speakingReviewSubSection === 'pending' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => {
                                    setSpeakingReviewSubSection('pending');
                                    setSelectedSubmissionId(null);
                                }}
                                style={{ marginRight: '1rem' }}
                            >
                                {t('reviewSpeakingTest')}
                            </button>
                            <button
                                className={`px-5 py-2 rounded-lg font-semibold transition-all duration-300 ${speakingReviewSubSection === 'reviewed' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                onClick={() => {
                                    setSpeakingReviewSubSection('reviewed');
                                    setSelectedSubmissionId(null);
                                }}
                            >
                                {t('reviewedTests')}
                            </button>
                        </div>

                        {selectedSubmissionId ? (
                            <SpeakingSubmissionDetail
                                submissionId={selectedSubmissionId}
                                onBackToList={() => setSelectedSubmissionId(null)}
                                BASE_API_URL={BASE_API_URL} // Pass BASE_API_URL as a prop
                            />
                        ) : (
                            <>
                                {speakingReviewSubSection === 'pending' && (
                                    <SpeakingTestReviews onReviewClick={setSelectedSubmissionId} />
                                )}
                                {speakingReviewSubSection === 'reviewed' && (
                                    <ReviewedSpeakingTestsList onViewClick={setSelectedSubmissionId} />
                                )}
                            </>
                        )}
                    </div>
                );

            case 'scores':
                return <AdminScoresPage />;
            case 'profile':
                return (
                    <div className="profile-section">
                        <h2 className="profile-title">{t('userProfile')}</h2>
                        {user ? (
                            <div>
                                <p className="profile-info"><span className="profile-strong">{t('username')}:</span> {user.username}</p>
                                <p className="profile-info"><span className="profile-strong">{t('email')}:</span> {user.email}</p>
                                <p className="profile-info"><span className="profile-strong">{t('phone')}:</span> {user.phone}</p>
                                <p className="profile-info"><span className="profile-strong">{t('role')}:</span> {user.role}</p>
                            </div>
                        ) : (
                            <p className="profile-loading">{t('loadingProfile')}</p>
                        )}
                    </div>
                );

            default:
                // Fallback for any unhandled activeSection, though 'welcome' should catch initial load
                return <div className="welcome-message text-center text-4xl font-extrabold text-purple-400 mt-20">Please select an option from the sidebar.</div>;
        }
    };

    if (!user) {
        return (
            <div className="loading-screen text-center text-2xl font-semibold text-purple-300 mt-20">Loading user data...</div>
        );
    }

    return (
        <div className={`dashboard-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* The 'sidebar' class itself handles width and background from dashboard.css */}
            <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    {/* Header content (Admin Panel, Welcome text) */}
                    {!isSidebarCollapsed && (
                        <div className="header-content">
                            <h1 className="text-3xl font-extrabold text-white">{t('adminPanel')}</h1>
                            <p className="welcome text-white text-sm">{t('welcome')}, {user?.username}!</p>
                            <LanguageSelector />
                        </div>
                    )}
                    {/* Hamburger Icon for toggling */}
                    <div className="sidebar-toggle" onClick={toggleSidebar}>
                        <FontAwesomeIcon icon={faBars} />
                    </div>
                </div>
                <nav className="flex-grow">
                    <ul className="sidebar-menu">
                        <li onClick={() => { setActiveSection('addCourse'); setSelectedCourseDetails(null); setSelectedSubmissionId(null); }} className={`${activeSection === 'addCourse' ? 'active' : ''}`}>
                            <FontAwesomeIcon icon={faPlusCircle} /><span className="menu-text">{t('addNewCourse')}</span>
                        </li>
                        <li onClick={() => { setActiveSection('viewCourses'); setSelectedCourseDetails(null); setSelectedSubmissionId(null); }} className={`${activeSection === 'viewCourses' ? 'active' : ''}`}>
                            <FontAwesomeIcon icon={faEye} /><span className="menu-text">{t('viewManageCourses')}</span>
                        </li>
                        <li onClick={() => { setActiveSection('setCourseTime'); setSelectedCourseDetails(null); setSelectedSubmissionId(null); }} className={`${activeSection === 'setCourseTime' ? 'active' : ''}`}>
                            <FontAwesomeIcon icon={faClock} /><span className="menu-text">{t('setCourseTime')}</span>
                        </li>

                        {/* Category for Upload Tests */}
                        {!isSidebarCollapsed && (
                        <li className="menu-category"><b><u>{t('uploadTests')}</u></b></li>
                        )}
                        <li onClick={() => { setActiveSection('uploadTest'); setSelectedCourseDetails(null); setSelectedSubmissionId(null); setListeningSectionData({ course_id: '', section_title: '', section_number: '' }); if (listeningSectionAudioRef.current) listeningSectionAudioRef.current.value = ''; if (listeningSectionCsvRef.current) listeningSectionCsvRef.current.value = ''; setSelectedUploadCourseId(''); setSelectedUploadCourseType(''); setUploadedImagePath(''); }} className={`${activeSection === 'uploadTest' ? 'active' : ''}`}>
                            <FontAwesomeIcon icon={faUpload} /><span className="menu-text">{t('uploadQuestions')}</span>
                        </li>

                        {/* Category for Review Submissions */}
                        {!isSidebarCollapsed && (
                            <li className="menu-category"><b><u>{t('reviewSubmissions')}</u></b></li>
                        )}
                        <li
                            className={`parent-menu-item ${activeSection === 'writingReview' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveSection('writingReview');
                                setWritingReviewSubSection('pending');
                                setSelectedSubmissionId(null);
                            }}
                        >
                            <FontAwesomeIcon icon={faPenNib} /><span className="menu-text">{t('writingReview')}</span>
                            {!isSidebarCollapsed && ( // Chevron only visible when not collapsed
                                <FontAwesomeIcon icon={activeSection === 'writingReview' ? faChevronUp : faChevronDown} className="ml-auto" />
                            )}
                            {activeSection === 'writingReview' && !isSidebarCollapsed && ( // Submenu only visible when not collapsed
                                <ul className="sub-menu">
                                    <li
                                        onClick={(e) => { e.stopPropagation(); setWritingReviewSubSection('pending'); setSelectedSubmissionId(null); }}
                                        className={`${writingReviewSubSection === 'pending' ? 'active-sub-item' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faFileAlt} /><span className="menu-text">{t('reviewWritingTest')}</span>
                                    </li>
                                    <li
                                        onClick={(e) => { e.stopPropagation(); setWritingReviewSubSection('reviewed'); setSelectedSubmissionId(null); }}
                                        className={`${writingReviewSubSection === 'reviewed' ? 'active-sub-item' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faPen} /><span className="menu-text">{t('reviewedTests')}</span>
                                    </li>
                                </ul>
                            )}
                        </li>
                        <li
                            className={`parent-menu-item ${activeSection === 'speakingReview' ? 'active' : ''}`}
                            onClick={() => {
                                setActiveSection('speakingReview');
                                setSpeakingReviewSubSection('pending');
                                setSelectedSubmissionId(null);
                            }}
                        >
                            <FontAwesomeIcon icon={faMicrophone} /><span className="menu-text">{t('speakingReview')}</span>
                            {!isSidebarCollapsed && ( // Chevron only visible when not collapsed
                                <FontAwesomeIcon icon={activeSection === 'speakingReview' ? faChevronUp : faChevronDown} className="ml-auto" />
                            )}
                            {activeSection === 'speakingReview' && !isSidebarCollapsed && ( // Submenu only visible when not collapsed
                                <ul className="sub-menu">
                                    <li
                                        onClick={(e) => { e.stopPropagation(); setSpeakingReviewSubSection('pending'); setSelectedSubmissionId(null); }}
                                        className={`${speakingReviewSubSection === 'pending' ? 'active-sub-item' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faMicrophoneAlt} /><span className="menu-text">{t('reviewSpeakingTest')}</span>
                                    </li>
                                    <li
                                        onClick={(e) => { e.stopPropagation(); setSpeakingReviewSubSection('reviewed'); setSelectedSubmissionId(null); }}
                                        className={`${speakingReviewSubSection === 'reviewed' ? 'active-sub-item' : ''}`}
                                    >
                                        <FontAwesomeIcon icon={faHeadphones} /><span className="menu-text">{t('reviewedTests')}</span>
                                    </li>
                                </ul>
                            )}
                        </li>
                        <li onClick={() => { setActiveSection('scores'); setSelectedCourseDetails(null); setSelectedSubmissionId(null); }} className={`${activeSection === 'scores' ? 'active' : ''}`}>
                            <FontAwesomeIcon icon={faFileAlt} /><span className="menu-text">Scores of Previous Tests</span>
                        </li>
                    </ul>
                </nav>
                <ul className="sidebar-footer">
                    <li onClick={() => setActiveSection('profile')} className={`${activeSection === 'profile' ? 'active' : ''}`}>
                        <FontAwesomeIcon icon={faUserCircle} /><span className="menu-text">{t('profile')}</span>
                    </li>
                    <li onClick={handleLogout}>
                        <FontAwesomeIcon icon={faSignOutAlt} /><span className="menu-text">{t('logout')}</span>
                    </li>
                </ul>
            </aside>
            <main className="dashboard-content flex-grow p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminDashboard;