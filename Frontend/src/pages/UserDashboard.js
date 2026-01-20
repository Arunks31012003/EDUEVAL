import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/axiosInstance';
import '../styles/user.css'; // Your existing CSS file
import moment from 'moment'; // For date formatting

// Import Font Awesome icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faHome, faBook, faChartLine, faUser, faSignOutAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

// Import LanguageSelector component
import LanguageSelector from '../components/LanguageSelector';

// Import language context
import { useLanguage } from '../context/LanguageContext';

const UserDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();

    // State for main sections
    const [activeSection, setActiveSection] = useState('welcome'); // Default to 'welcome'
    const [courses, setCourses] = useState([]);
    const [user, setUser] = useState(location.state?.user || null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [testResults, setTestResults] = useState([]);

    // States for nested course navigation
    const [showCourseSubMenu, setShowCourseSubMenu] = useState(false);
    const [activeCourseTypeFilter, setActiveCourseTypeFilter] = useState('Reading'); // Default to 'Reading')

    // State for sidebar collapse/expand
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // New state to manage loading and prevent showing cached content
    const [isLoading, setIsLoading] = useState(true);

    // Ref to track if logout is manual
    const isManualLogout = useRef(false);

    // Ref to track previous path

    // Removed unused navigateRef to fix eslint warning
    // const navigateRef = useRef(navigate);

    // Function to toggle sidebar collapse state
    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    // Use useCallback to memoize the handleLogout function
    const handleLogout = useCallback(() => {
        isManualLogout.current = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
    }, [navigate]);

    // This useEffect now manages authentication and prevents the cached page from showing
    // It runs whenever the component mounts or the route changes.
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            // No token found, user is not authenticated.
            setIsLoading(false);
            navigate('/login', { replace: true });
            return;
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            setIsLoading(false); // User data found, stop loading and show content
        } else {
            // Inconsistent state: token exists but no user data.
            // Log out to be safe.
            handleLogout();
            setIsLoading(false);
        }
    }, [navigate, handleLogout]);



    const fetchCourses = useCallback(async () => {
        try {
            const res = await api.get('/api/courses');
            const courseData = Array.isArray(res.data)
                ? res.data
                : res.data.courses;

            if (Array.isArray(courseData)) {
                setCourses(courseData);
            } else {
                console.error("Courses response is not an array:", res.data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    }, []);

    useEffect(() => {
        if (activeSection === 'courses') {
            fetchCourses();
        }
    }, [activeSection, fetchCourses]);

    useEffect(() => {
        if (activeSection === 'scores') {
            const fetchResults = async () => {
                try {
                    const res = await api.get('/api/tests/results');
                    setTestResults(res.data.results || []);
                } catch (err) {
                    console.error('Error fetching test results:', err);
                }
            };
            fetchResults();
        }
    }, [activeSection]);

    const handleStartTest = (course) => {
        if (course.type === 'Reading') {
            navigate(`/user/reading-test/${course.id}`);
        } else if (course.type === 'Speaking') {
            navigate(`/start-speaking-test/${course.id}`);
        } else {
            navigate(`/user/test/${course.id}`);
        }
    };

    const handleViewDetails = (course) => {
        setSelectedCourse(course);
        setActiveSection('details');
    };

    const handleBack = () => {
        setSelectedCourse(null);
        setActiveSection('courses');
    };

    const handleCourseMenuClick = () => {
        setShowCourseSubMenu(!showCourseSubMenu);
        if (!showCourseSubMenu) {
            setActiveSection('courses');
            if (activeCourseTypeFilter === 'all') {
                setActiveCourseTypeFilter('Reading');
            }
        }
    };

    const handleSubMenuItemClick = (type) => {
        setActiveCourseTypeFilter(type);
        setActiveSection('courses');
    };

    const renderContent = () => {
        if (activeSection === 'welcome') {
            return (
                <div className="welcome-section">
                    <h2 className="welcome-title">{t('welcomeUser').replace('{user}', user?.username || 'User')}</h2>
                    <p className="welcome-text">
                        {t('personalDashboard')}
                    </p>
                    <p className="welcome-subtitle">
                        {t('hereYouCan')}
                    </p>
                    <ul className="welcome-list">
                        <li>{t('browseCourses')}</li>
                        <li>{t('startNewTests')}</li>
                        <li>{t('viewScores')}</li>
                        <li>{t('manageProfile')}</li>
                    </ul>
                    <p className="welcome-footer">
                        {t('useSidebar')}
                    </p>
                </div>
            );
        }

        if (activeSection === 'details' && selectedCourse) {
            return (
                <div className="course-details-page">
                    <h2 className="course-details-title">{t('courseDetails')}</h2>
                    <p className="course-details-text"><span className="course-details-strong">{t('title')}:</span> {selectedCourse.title}</p>
                    <p className="course-details-text"><span className="course-details-strong">{t('subject')}:</span> {selectedCourse.subject}</p>
                    <p className="course-details-text"><span className="course-details-strong">{t('description')}:</span> {selectedCourse.description}</p>
                    <p className="course-details-text"><span className="course-details-strong">{t('type')}:</span> {selectedCourse.type}</p>
                    {selectedCourse.type !== 'Speaking' && (
                        <p className="course-details-text"><span className="course-details-strong">{t('testDuration')}:</span> {selectedCourse.test_duration ? selectedCourse.test_duration / 60 : t('notSet')} {t('minutes')}</p>
                    )}
                    <button className="primary-button" onClick={handleBack}>{t('backToCourses')}</button>
                </div>
            );
        }

        switch (activeSection) {
            case 'courses':
                const filteredCourses = activeCourseTypeFilter === 'all'
                    ? courses
                    : courses.filter(course => course.type === activeCourseTypeFilter);

                return (
                    <div className="courses-list-section">
                        <h2 className="courses-title">
                            {activeCourseTypeFilter === 'all' ? t('allCourses') : `${activeCourseTypeFilter} ${t('courses')}`}
                        </h2>
                        <div className="course-grid">
                            {filteredCourses.length > 0 ? (
                                filteredCourses.map((course) => (
                                    <div className="course-card" key={course.id}>
                                        <h3 className="course-card-title">{course.title}</h3>
                                        <p className="course-card-text"><span className="course-card-strong">{t('subject')}:</span> {course.subject}</p>
                                        <p className="course-card-text"><span className="course-card-strong">{t('type')}:</span> {course.type}</p>
                                        <div className="button-group">
                                            <button
                                                className="secondary-button"
                                                onClick={() => handleViewDetails(course)}
                                            >
                                                {t('viewDetails')}
                                            </button>
                                            <button
                                                className="accent-button"
                                                onClick={() => handleStartTest(course)}
                                            >
                                                {t('startTest')}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-courses-text">{t('noCoursesAvailable')}</p>
                            )}
                        </div>
                    </div>
                );

            case 'scores':
                return (
                    <div className="scores-section">
                        <h2 className="scores-title">{t('scoresOfPreviousTests')}</h2>
                        {testResults.length === 0 ? (
                            <div className="scores-empty">{t('previousTestAttempts')}</div>
                        ) : (
                            <div className="scores-table-container">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>{t('courseName')}</th>
                                            <th>{t('type')}</th>
                                            <th>{t('score')}</th>
                                            <th>{t('totalQs')}</th>
                                            <th>{t('timeTakenMin')}</th>
                                            <th>{t('takenAt')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testResults.map((r, idx) => (
                                            <tr key={r.id}>
                                                <td>{r.course_name}</td>
                                                <td>{r.course_type}</td>
                                                <td>
                                                    {r.is_writing_test || r.is_speaking_test ? (
                                                        r.score !== null ? <span className="score-passed">{r.score}</span> : <span className="score-pending">{t('pendingReview')}</span>
                                                    ) : (
                                                        <span className="score-passed">{r.score} / {r.total_questions}</span>
                                                    )}
                                                </td>
                                                <td>{r.total_questions}</td>
                                                <td>
                                                    {r.time_taken !== null ? `${(r.time_taken / 60).toFixed(1)} min` : 'N/A'}
                                                </td>
                                                <td>
                                                    {moment(r.taken_at).format('YYYY-MM-DD HH:mm:ss')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );

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
                return null;
        }
    };

    if (isLoading) {
        return <div className="loading-screen text-center text-2xl font-semibold text-indigo-300 mt-20">{t('loading')}</div>;
    }

    return (
        <div className={`dashboard-wrapper flex h-screen bg-gray-100 ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <aside className={`sidebar flex flex-col shadow-lg ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-toggle" onClick={toggleSidebar}>
                        <FontAwesomeIcon icon={faBars} />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="header-content">
                            <h1 className="text-3xl font-extrabold text-white">{t('userPanel')}</h1>
                            <p className="welcome text-white text-sm">{t('welcomeUser').replace('{user}', user?.username || 'User')}</p>
                            <LanguageSelector />
                        </div>
                    )}
                </div>
                <nav className="flex-grow">
                    <ul className="sidebar-menu py-4 space-y-2">
                        <li onClick={() => { setActiveSection('welcome'); setShowCourseSubMenu(false); }} className={`px-6 py-3 cursor-pointer hover:bg-indigo-700 transition-colors duration-200 ${activeSection === 'welcome' ? 'bg-indigo-700 text-white font-bold' : 'text-indigo-300'}`}>
                            <FontAwesomeIcon icon={faHome} />
                            <span className="menu-text">{t('dashboardHome')}</span>
                        </li>

                        <li onClick={handleCourseMenuClick} className={`px-6 py-3 cursor-pointer hover:bg-indigo-700 transition-colors duration-200 ${activeSection === 'courses' ? 'bg-indigo-700 text-white font-bold' : 'text-indigo-300'} parent-menu-item`}>
                            <FontAwesomeIcon icon={faBook} />
                            <span className="menu-text">{t('courses')}</span>
                            {!isSidebarCollapsed && (showCourseSubMenu ? (
                                <FontAwesomeIcon icon={faChevronUp} className="ml-auto" />
                            ) : (
                                <FontAwesomeIcon icon={faChevronDown} className="ml-auto" />
                            ))}
                        </li>
                        {showCourseSubMenu && !isSidebarCollapsed && (
                            <ul className="sub-menu ml-4 mt-1 space-y-1">
                                <li onClick={() => handleSubMenuItemClick('Reading')} className={`px-6 py-2 cursor-pointer hover:bg-indigo-600 rounded-md transition-colors duration-200 ${activeCourseTypeFilter === 'Reading' && activeSection === 'courses' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>
                                    <span className="menu-text">{t('readingTests')}</span>
                                </li>
                                <li onClick={() => handleSubMenuItemClick('Listening')} className={`px-6 py-2 cursor-pointer hover:bg-indigo-600 rounded-md transition-colors duration-200 ${activeCourseTypeFilter === 'Listening' && activeSection === 'courses' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>
                                    <span className="menu-text">{t('listeningTests')}</span>
                                </li>
                                <li onClick={() => handleSubMenuItemClick('Writing')} className={`px-6 py-2 cursor-pointer hover:bg-indigo-600 rounded-md transition-colors duration-200 ${activeCourseTypeFilter === 'Writing' && activeSection === 'courses' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>
                                    <span className="menu-text">{t('writingTests')}</span>
                                </li>
                                <li onClick={() => handleSubMenuItemClick('Speaking')} className={`px-6 py-2 cursor-pointer hover:bg-indigo-600 rounded-md transition-colors duration-200 ${activeCourseTypeFilter === 'Speaking' && activeSection === 'courses' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`}>
                                    <span className="menu-text">{t('speakingTests')}</span>
                                </li>
                            </ul>
                        )}

                        <li onClick={() => { setActiveSection('scores'); setShowCourseSubMenu(false); }} className={`px-6 py-3 cursor-pointer hover:bg-indigo-700 transition-colors duration-200 ${activeSection === 'scores' ? 'bg-indigo-700 text-white font-bold' : 'text-indigo-300'}`}>
                            <FontAwesomeIcon icon={faChartLine} />
                            <span className="menu-text">{t('scoresOfPreviousTests')}</span>
                        </li>
                    </ul>
                </nav>
                <ul className="sidebar-footer py-4 border-t border-indigo-700 mt-auto">
                    <li onClick={() => { setActiveSection('profile'); setShowCourseSubMenu(false); }} className={`px-6 py-3 cursor-pointer hover:bg-indigo-700 transition-colors duration-200 ${activeSection === 'profile' ? 'bg-indigo-700 text-white font-bold' : 'text-indigo-300'}`}>
                        <FontAwesomeIcon icon={faUser} />
                        <span className="menu-text">{t('profile')}</span>
                    </li>
                    <li onClick={handleLogout} className="px-6 py-3 cursor-pointer hover:bg-red-700 transition-colors duration-200 text-red-300">
                        <FontAwesomeIcon icon={faSignOutAlt} />
                        <span className="menu-text">{t('logout')}</span>
                    </li>
                </ul>
            </aside>
            <main className="dashboard-content flex-grow p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default UserDashboard;
