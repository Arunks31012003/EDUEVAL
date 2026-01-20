import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Import language context
import { LanguageProvider } from './context/LanguageContext';

// Import your existing pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import StartTest from './pages/StartTest';
import StartSpeakingTest from './components/StartSpeakingTest';
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute
import CourseDetails from './pages/CourseDetails';
import ScorePage from './pages/ScorePage';
import ResultPending from './pages/ResultPending';
import SetSpeakingQuestionTimers from './pages/SetSpeakingQuestionTimers'; // Import the component
import ReadingTestPage from './pages/ReadingTestPage';
import NotFoundPage from './pages/NotFoundPage';

import './styles/login.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
    console.log('App.js component is rendering (V3)!');

    return (
        <LanguageProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <>
                    <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Protected Routes by Role */}
                    <Route
                        path="/user-dashboard"
                        element={<PrivateRoute element={UserDashboard} roles={['user', 'admin', 'superadmin']} />}
                    />
                    <Route
                        path="/admin-dashboard"
                        element={<PrivateRoute element={AdminDashboard} roles={['admin', 'superadmin']} />}
                    />
                    <Route
                        path="/superadmin-dashboard"
                        element={<PrivateRoute element={SuperAdminDashboard} roles={['superadmin']} />}
                    />
                    {/* The general /user/test route, if it's meant to be protected */}
                    <Route
                        path="/user/test"
                        element={<PrivateRoute element={() => <div>Test Page Coming Soon</div>} roles={['user', 'admin', 'superadmin']} />}
                    />

                    {/* Existing test-related routes */}
                    {/* These might also need to be wrapped in PrivateRoute if they are not public */}
                    <Route path="/user/course/:courseId" element={<CourseDetails />} />
                    <Route path="/user/test/:courseId" element={<StartTest />} />
                    <Route path="/score" element={<ScorePage />} />
                    <Route path="/result-pending" element={<ResultPending />} />

                    {/* NEW ROUTE FOR TEST RESULTS 🎉 */}
                    {/* This routes will now correctly handle navigation to /test-results */}
                    <Route
                        path="/test-results"
                        element={<PrivateRoute element={ScorePage} roles={['user', 'admin', 'superadmin']} />}
                    />

                    {/* NEW ROUTE FOR SPEAKING TEST - also wrapped in PrivateRoute */}
                    <Route
                        path="/start-speaking-test/:courseId"
                        element={<PrivateRoute element={StartSpeakingTest} roles={['user', 'admin', 'superadmin']} />}
                    />

                    {/* Route for SetSpeakingQuestionTimers - using PrivateRoute */}
                    <Route
                        path="/admin/set-course-time"
                        element={<PrivateRoute element={SetSpeakingQuestionTimers} roles={['admin', 'superadmin']} />}
                    />

                    {/* NEW ROUTE FOR READING TEST - protected by PrivateRoute */}
                    <Route
                        path="/user/reading-test/:courseId"
                        element={<PrivateRoute element={ReadingTestPage} roles={['user', 'admin', 'superadmin']} />}
                    />

                    {/* Catch-all route for unmatched paths, redirecting to a 404 page */}
                    <Route path="*" element={<NotFoundPage />} />

                </Routes>
                </>
            </BrowserRouter>
        </LanguageProvider>
    );
}

export default App;
