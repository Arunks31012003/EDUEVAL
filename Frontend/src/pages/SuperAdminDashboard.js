import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Import PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Sector } from 'recharts';

// Import Font Awesome icons
import {
    faBars, faUsers, faCogs, faUserCircle, faSignOutAlt,
    faDatabase, faTachometerAlt
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Assuming these components exist and are correctly imported
import ManageUsers from './ManageUsers';
import ManageAdmins from './ManageAdmins';
import ManageSuperAdmins from './ManageSuperAdmins';

// Import LanguageSelector component
import LanguageSelector from '../components/LanguageSelector';

import '../styles/dashboard.css';
import '../styles/crud.css';

// Get the API base URL from the environment variable.
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ;

// Custom Active Shape for Pie Chart (to highlight a segment on hover)
const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, midAngle } = props;

    // Calculate mid-point for the label to be placed on the slice
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <g>
            {/* Highlighted Sector */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 5} // Slightly larger outer radius for active state
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                stroke="#000" // Stroke is black for contrast on light background
                strokeWidth={2}
            />
            {/* Text Label with Name and Percentage - fill is black and font-bold applied */}
            <text x={x} y={y} fill="#000" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold text-sm">
                {`${payload.name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        </g>
    );
};


const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('welcome');
    const [superAdminName, setSuperAdminName] = useState('');
    const [superAdminEmail, setSuperAdminEmail] = useState('');

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    const [totalUsers, setTotalUsers] = useState(0);
    const [totalAdmins, setTotalAdmins] = useState(0);

    const [userStatusCounts, setUserStatusCounts] = useState({
        active: 0,
        inactive: 0,
        suspended: 0,
        deleted: 0,
    });
    const [adminStatusCounts, setAdminStatusCounts] = useState({
        active: 0,
        inactive: 0,
        suspended: 0,
        deleted: 0,
    });

    const [totalCourses, setTotalCourses] = useState(0);
    const [courseTypeCounts, setCourseTypeCounts] = useState({
        Speaking: 0,
        Listening: 0,
        Writing: 0,
        Reading: 0,
    });

    // State for active index in Pie charts for hover effect
    const [activeIndexUser, setActiveIndexUser] = useState(-1); // Initialize to -1 (no active segment)
    const [activeIndexAdmin, setActiveIndexAdmin] = useState(-1);
    const [activeIndexCourse, setActiveIndexCourse] = useState(-1);




    const showToast = useCallback((type, message, options = {}) => {
        switch (type) {
            case 'success':
                toast.success(message, { position: "top-right", ...options });
                break;
            case 'error':
                toast.error(message, { position: "top-right", ...options });
                break;
            case 'info':
                toast.info(message, { position: "top-right", ...options });
                break;
            case 'warn':
                toast.warn(message, { position: "top-right", ...options });
                break;
            default:
                toast(message, { position: "top-right", ...options });
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // --- Fetch Total Users ---
            const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users/count`, { headers });
            const usersData = await usersResponse.json();
            if (usersResponse.ok) {
                setTotalUsers(usersData.count);
            } else {
                console.error('Failed to fetch total user count:', usersData.message);
                showToast('error', 'Failed to load total user count. (Details: ' + (usersData.message || 'Unauthorized') + ')');
                setTotalUsers('Error');
            }

            // --- Fetch Total Admins ---
            const adminsResponse = await fetch(`${API_BASE_URL}/api/admin/admins/count`, { headers });
            const adminsData = await adminsResponse.json();
            if (adminsResponse.ok) {
                setTotalAdmins(adminsData.count);
            } else {
                console.error('Failed to fetch total admin count:', adminsData.message);
                showToast('error', 'Failed to load total admin count. (Details: ' + (adminsData.message || 'Unauthorized') + ')');
                setTotalAdmins('Error');
            }

            // Fetch User Status Counts
            const userStatusResponse = await fetch(`${API_BASE_URL}/api/admin/users/status-counts`, { headers });
            const userStatusData = await userStatusResponse.json();
            if (userStatusResponse.ok) {
                setUserStatusCounts(prev => ({ ...prev, ...userStatusData }));
            } else {
                console.error('Failed to fetch user status counts:', userStatusData.message);
                showToast('error', 'Failed to load user status counts.');
            }

            // Fetch Admin Status Counts
            const adminStatusResponse = await fetch(`${API_BASE_URL}/api/admin/admins/status-counts`, { headers });
            const adminStatusData = await adminStatusResponse.json();
            if (adminStatusResponse.ok) {
                setAdminStatusCounts(prev => ({ ...prev, ...adminStatusData }));
            } else {
                console.error('Failed to fetch admin status counts:', adminStatusData.message);
                showToast('error', 'Failed to load admin status counts.');
            }

            // --- Fetch Total Courses from Backend ---
            try {
                const coursesTotalResponse = await fetch(`${API_BASE_URL}/api/admin/courses/total-count`, { headers });
                const coursesTotalData = await coursesTotalResponse.json();
                if (coursesTotalResponse.ok) {
                    setTotalCourses(coursesTotalData.count);
                } else {
                    console.error('Failed to fetch total courses count from backend:', coursesTotalData.message);
                    showToast('error', 'Failed to load total courses count. (Details: ' + (coursesTotalData.message || 'Unauthorized') + ')');
                    setTotalCourses('Error');
                }
            } catch (error) {
                console.error('Error fetching total courses count from backend:', error);
                showToast('error', 'Network error or server unavailable for total courses count. Please check your backend server.');
                setTotalCourses('Error');
            }

            // --- Fetch Course Type Counts from Backend ---
            try {
                const courseTypeResponse = await fetch(`${API_BASE_URL}/api/admin/courses/type-counts`, { headers });
                const courseTypeData = await courseTypeResponse.json();
                if (courseTypeResponse.ok) {
                    // Ensure all expected types are present, default to 0 if not
                    const fetchedCounts = {
                        Speaking: courseTypeData.Speaking || 0,
                        Listening: courseTypeData.Listening || 0,
                        Writing: courseTypeData.Writing || 0,
                        Reading: courseTypeData.Reading || 0,
                        ...courseTypeData // Spread to include any other types if backend sends them
                    };
                    setCourseTypeCounts(fetchedCounts);
                } else {
                    console.error('Failed to fetch course type counts from backend:', courseTypeData.message);
                    showToast('error', 'Failed to load course type counts. (Details: ' + (courseTypeData.message || 'Unauthorized') + ')');
                    setCourseTypeCounts({ Speaking: 'Error', Listening: 'Error', Writing: 'Error', Reading: 'Error' });
                }
            } catch (error) {
                console.error('Error fetching course type counts from backend:', error);
                showToast('error', 'Network error or server unavailable for course type counts. Please check your backend server.');
                setCourseTypeCounts({ Speaking: 'Error', Listening: 'Error', Writing: 'Error', Reading: 'Error' });
            }

            showToast('success', 'Dashboard data loaded successfully!', { autoClose: 2000 });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast('error', 'Failed to load dashboard data. Please check network and server status.');
            setTotalUsers('Error');
            setTotalAdmins('Error');
            setUserStatusCounts({ active: 'Error', inactive: 'Error', suspended: 'Error', deleted: 'Error' });
            setAdminStatusCounts({ active: 'Error', inactive: 'Error', suspended: 'Error', deleted: 'Error' });
            setTotalCourses('Error');
            setCourseTypeCounts({ Speaking: 'Error', Listening: 'Error', Writing: 'Error', Reading: 'Error' });
        }
    }, [showToast]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser && storedUser.role === 'superadmin') {
            setSuperAdminName(storedUser.username);
            setSuperAdminEmail(storedUser.email || 'superadmin@example.com');
        } else {
            navigate('/'); // Redirect if not a superadmin
        }
    }, [navigate]);

    useEffect(() => {
        if (activeSection === 'totalLists' && superAdminName) {
            fetchDashboardData();
        }
    }, [activeSection, superAdminName, fetchDashboardData]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        showToast('info', 'You have been logged out.', { position: "top-center" });
        navigate('/login');
    };



    // Handlers for chart hover
    const onPieEnterUser = useCallback((_, index) => {
        setActiveIndexUser(index);
    }, []);

    const onPieLeaveUser = useCallback(() => {
        setActiveIndexUser(-1);
    }, []);

    const onPieEnterAdmin = useCallback((_, index) => {
        setActiveIndexAdmin(index);
    }, []);

    const onPieLeaveAdmin = useCallback(() => {
        setActiveIndexAdmin(-1);
    }, []);

    const onPieEnterCourse = useCallback((_, index) => {
        setActiveIndexCourse(index);
    }, []);

    const onPieLeaveCourse = useCallback(() => {
        setActiveIndexCourse(-1);
    }, []);


    const renderContent = () => {
        const userStatusKeys = ['active', 'inactive', 'suspended', 'deleted'];
        const adminStatusKeys = ['active', 'inactive', 'suspended', 'deleted'];
        const courseTypeKeys = ['Speaking', 'Listening', 'Writing', 'Reading'];

        // Prepare data for User Status Pie Chart
        const userChartData = userStatusKeys.map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: userStatusCounts[key] || 0
        }));
        const USER_COLORS = ['#4CAF50', '#FFC107', '#F44336', '#9E9E9E']; // Green, Amber, Red, Grey

        // Prepare data for Admin Status Pie Chart
        const adminChartData = adminStatusKeys.map(key => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: adminStatusCounts[key] || 0
        }));
        const ADMIN_COLORS = ['#2196F3', '#FF9800', '#E91E63', '#607D8B']; // Blue, Orange, Pink, Dark Grey

        // Prepare data for Course Type Pie Chart
        const courseChartData = courseTypeKeys.map(key => ({
            name: key,
            value: courseTypeCounts[key] || 0
        }));
        const COURSE_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042'];


        switch (activeSection) {
            case 'welcome':
                return (
                    <div className="welcome-section text-center p-8 bg-white rounded-3xl shadow-md text-gray-800 mx-auto my-8 transform transition-all duration-500 hover:scale-105 hover:shadow-purple-200/50">
                        <h3 className="text-4xl font-extrabold mb-6 text-purple-700 animate-fade-in-down">Welcome, {superAdminName || 'Super Admin'}!</h3>
                        <p className="text-lg text-gray-700 mb-6 animate-fade-in">
                            As a Super Admin, you have full control over the platform's users and administrators.
                        </p>
                        <div className="text-left space-y-4 text-gray-700 mb-10 animate-fade-in-up">
                            <p className="text-xl font-semibold text-purple-600">Here's what you can do:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>Manage Users:</strong> View, add, edit, suspend, activate, and delete student/user accounts.</li>
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>Manage Admins:</strong> Create new admin accounts, modify existing admin permissions, and manage their access.</li>
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>View System Reports:</strong> Access overall platform statistics and performance metrics. (Placeholder for future feature)</li>
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>Configure Global Settings:</strong> Adjust platform-wide settings. (Placeholder for future feature)</li>
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>Profile:</strong> View and update your Super Admin profile details.</li>
                                <li className="hover:text-purple-500 transition-colors duration-200"><strong>Logout:</strong> Securely log out of the Super Admin panel.</li>
                            </ul>
                        </div>
                    </div>
                );
            case 'manageUsers':
                return <ManageUsers showToast={showToast} />;
            case 'manageAdmins':
                return <ManageAdmins showToast={showToast} />;
            case 'createSuperAdmin':
                return <ManageSuperAdmins showToast={showToast} />;
            case 'totalLists':
                return (
                    <div className="overview-section-container p-8 bg-white rounded-3xl shadow-md text-gray-800 mx-auto my-8">
                        <h2 className="text-4xl font-extrabold mb-8 text-purple-700 text-center animate-fade-in-down">Platform Overview</h2>
                        <div className="overview-boxes-wrapper grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* User Statistics Card (Pie Chart) */}
                            <div
                                className="overview-card-plain bg-white p-6 rounded-2xl shadow-md flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-purple-200/50 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveSection('manageUsers')}
                                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSection('manageUsers'); }}
                            >
                                <h3 className="text-2xl font-bold mb-4 text-purple-700">User Statistics</h3>
                                <ul className="stats-list text-gray-700 space-y-2 mb-4 w-full">
                                    <li className="flex justify-between items-center"><span className="stat-label font-semibold">Total Users:</span> <span className="stat-value text-xl font-bold text-blue-500">{totalUsers}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Active:</span> <span className="stat-value text-green-600">{userStatusCounts.active}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Inactive:</span> <span className="stat-value text-yellow-600">{userStatusCounts.inactive}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Suspended:</span> <span className="stat-value text-red-600">{userStatusCounts.suspended}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Deleted:</span> <span className="stat-value text-gray-600">{userStatusCounts.deleted}</span></li>
                                </ul>
                                <div className="chart-container w-full h-56 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
                                            <Pie
                                                activeIndex={activeIndexUser}
                                                activeShape={renderActiveShape}
                                                data={userChartData.map(item => ({...item, totalValue: totalUsers}))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                                onMouseEnter={onPieEnterUser}
                                                onMouseLeave={onPieLeaveUser}
                                            >
                                                {userChartData.map((entry, index) => (
                                                    <Cell key={`cell-user-${index}`} fill={USER_COLORS[index % USER_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="left"
                                                align="left"
                                                wrapperStyle={{ paddingTop: '20px', color: 'black !important' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Admin Statistics Card (Pie Chart) */}
                            <div
                                className="overview-card-plain bg-white p-6 rounded-2xl shadow-md flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-purple-200/50 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveSection('manageAdmins')}
                                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSection('manageAdmins'); }}
                            >
                                <h3 className="text-2xl font-bold mb-4 text-purple-700">Admin Statistics</h3>
                                <ul className="stats-list text-gray-700 space-y-2 mb-4 w-full">
                                    <li className="flex justify-between items-center"><span className="stat-label font-semibold">Total Admins:</span> <span className="stat-value text-xl font-bold text-blue-500">{totalAdmins}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Active:</span> <span className="stat-value text-green-600">{adminStatusCounts.active}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Inactive:</span> <span className="stat-value text-yellow-600">{adminStatusCounts.inactive}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Suspended:</span> <span className="stat-value text-red-600">{adminStatusCounts.suspended}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Deleted:</span> <span className="stat-value text-gray-600">{adminStatusCounts.deleted}</span></li>
                                </ul>
                                <div className="chart-container w-full h-56 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
                                            <Pie
                                                activeIndex={activeIndexAdmin}
                                                activeShape={renderActiveShape}
                                                data={adminChartData.map(item => ({...item, totalValue: totalAdmins}))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                                onMouseEnter={onPieEnterAdmin}
                                                onMouseLeave={onPieLeaveAdmin}
                                            >
                                                {adminChartData.map((entry, index) => (
                                                    <Cell key={`cell-admin-${index}`} fill={ADMIN_COLORS[index % ADMIN_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="left"
                                                align="left"
                                                wrapperStyle={{ paddingTop: '20px', color: 'black !important' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* New Courses Card (Pie Chart) */}
                            <div className="overview-card-plain bg-white p-6 rounded-2xl shadow-md flex flex-col items-center transform transition-all duration-300 hover:scale-105 hover:shadow-purple-200/50">
                                <h3 className="text-2xl font-bold mb-4 text-purple-700">Courses</h3>
                                <ul className="stats-list text-gray-700 space-y-2 mb-4 w-full">
                                    <li className="flex justify-between items-center"><span className="stat-label font-semibold">Total Courses:</span> <span className="stat-value text-xl font-bold text-blue-500">{totalCourses}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Speaking:</span> <span className="stat-value text-green-600">{courseTypeCounts.Speaking}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Listening:</span> <span className="stat-value text-yellow-600">{courseTypeCounts.Listening}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Writing:</span> <span className="stat-value text-red-600">{courseTypeCounts.Writing}</span></li>
                                    <li className="flex justify-between items-center"><span className="stat-label">Reading:</span> <span className="stat-value text-purple-600">{courseTypeCounts.Reading}</span></li>
                                </ul>
                                <div className="chart-container w-full h-56 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 40, right: 20, bottom: 20, left: 20 }}>
                                            <Pie
                                                activeIndex={activeIndexCourse}
                                                activeShape={renderActiveShape}
                                                data={courseChartData.map(item => ({...item, totalValue: totalCourses}))}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                                onMouseEnter={onPieEnterCourse}
                                                onMouseLeave={onPieLeaveCourse}
                                            >
                                                {courseChartData.map((entry, index) => (
                                                    <Cell key={`cell-course-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend
                                                layout="vertical"
                                                verticalAlign="left"
                                                align="left"
                                                wrapperStyle={{ paddingTop: '20px', color: 'black !important' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="profile-section content-panel p-6 bg-white rounded-3xl shadow-md text-gray-800 max-w-md mx-auto my-8 transform transition-all duration-500 hover:scale-105 hover:shadow-purple-200/50">
                        <h2 className="text-3xl font-bold mb-6 text-purple-700 text-center">Super Admin Profile</h2>
                        <div className="space-y-4 text-lg">
                            <p><strong className="text-purple-600">Username:</strong> {superAdminName}</p>
                            <p><strong className="text-purple-600">Email:</strong> {superAdminEmail}</p>
                        </div>
                        <button
                            onClick={() => showToast('info', 'Profile data is up to date!', { autoClose: 3000 })}
                            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out shadow-lg hover:shadow-blue-300/50 transform hover:-translate-y-1"
                        >
                            Check Profile Status
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!superAdminName) {
        return (
            <div className="flex items-center justify-center h-screen bg-white text-purple-700 text-3xl font-semibold animate-pulse">
                Loading Super Admin Dashboard...
            </div>
        );
    }

    return (
        <div className={`dashboard-wrapper flex h-screen font-sans ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} bg-white`}>
            {/* Sidebar */}
            <aside className={`sidebar bg-white text-gray-800 flex flex-col border-r border-gray-200 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20 collapsed' : 'w-64'}`}>
                <div className="sidebar-header p-6 border-b border-gray-200 flex items-center justify-between">
                    {!isSidebarCollapsed && (
                        <div className="header-content">
                            <h2 className="text-3xl font-extrabold text-purple-700 mb-2">Super Admin</h2>
                            <p className="welcome text-white-700 text-sm">Welcome, {superAdminName}!</p>
                            <LanguageSelector />
                        </div>
                    )}
                    {/* Hamburger Icon for toggling */}
                    <div className={`sidebar-toggle cursor-pointer text-3xl text-purple-700 hover:text-purple-500 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} onClick={toggleSidebar}>
                        <FontAwesomeIcon icon={faBars} />
                    </div>
                </div>

                <nav className="flex-grow">
                    {/* Navigation items */}
                    <ul className="sidebar-menu py-4 space-y-2">
                        <li
                            className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                                ${activeSection === 'welcome' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                            onClick={() => {
                                setActiveSection('welcome');
                            }}
                        >
                            <FontAwesomeIcon icon={faTachometerAlt} className="text-xl mr-4" />
                            {!isSidebarCollapsed && <span className="menu-text text-lg">Dashboard Overview</span>}
                        </li>
                        <li
                            className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                                ${activeSection === 'manageUsers' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                            onClick={() => {
                                setActiveSection('manageUsers');
                            }}
                        >
                            <FontAwesomeIcon icon={faUsers} className="text-xl mr-4" />
                            {!isSidebarCollapsed && <span className="menu-text text-lg">Manage Users</span>}
                        </li>
                        <li
                            className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                                ${activeSection === 'manageAdmins' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                            onClick={() => {
                                setActiveSection('manageAdmins');
                            }}
                        >
                            <FontAwesomeIcon icon={faCogs} className="text-xl mr-4" />
                            {!isSidebarCollapsed && <span className="menu-text text-lg">Manage Admins</span>}
                        </li>
                        <li
                            className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                                ${activeSection === 'createSuperAdmin' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                            onClick={() => setActiveSection('createSuperAdmin')}
                        >
                            <FontAwesomeIcon icon={faUserCircle} className="text-xl mr-4" />
                            {!isSidebarCollapsed && <span className="menu-text text-lg">Manage Super Admins</span>}
                        </li>
                        {/* Navigation item for Overview of Statistics */}
                        <li
                            className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                                ${activeSection === 'totalLists' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                            onClick={() => {
                                setActiveSection('totalLists');
                            }}
                        >
                            <FontAwesomeIcon icon={faDatabase} className="text-xl mr-4" />
                            {!isSidebarCollapsed && <span className="menu-text text-lg">Overview of Statistics</span>}
                        </li>
                    </ul>
                </nav>

                <ul className="sidebar-footer py-4 border-t border-gray-200 mt-auto">
                    <li
                        className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100 transition-all duration-200 rounded-lg mx-2
                            ${activeSection === 'profile' ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                        onClick={() => setActiveSection('profile')}
                    >
                        <FontAwesomeIcon icon={faUserCircle} className="text-xl mr-4" />
                        {!isSidebarCollapsed && <span className="menu-text text-lg">Profile</span>}
                    </li>
                    <li onClick={handleLogout} className="flex items-center px-6 py-3 cursor-pointer hover:bg-red-100 transition-colors duration-200 rounded-lg mx-2 text-red-700 hover:text-red-900">
                        <FontAwesomeIcon icon={faSignOutAlt} className="text-xl mr-4" />
                        {!isSidebarCollapsed && <span className="menu-text text-lg">Logout</span>}
                    </li>
                </ul>
            </aside>

            {/* Main Content */}
            <main className="dashboard-content flex-grow p-8 overflow-y-auto bg-white text-gray-800">
                {renderContent()}
            </main>

            <ToastContainer />
        </div>
    );
};

export default SuperAdminDashboard;
