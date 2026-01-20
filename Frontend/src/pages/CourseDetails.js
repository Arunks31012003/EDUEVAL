import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance'; // Your axios instance, make sure path is correct

// Import the DescriptiveCSVUpload component
import DescriptiveCSVUpload from '../components/DescriptiveCSVUpload'; // Adjust this path if your component is in a different directory

const CourseDetails = () => {
    const { id } = useParams(); // Get the course ID from the URL (e.g., /courses/123 -> id = "123")
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const res = await api.get(`/api/courses/${id}`);
                setCourse(res.data.course);
            } catch (err) {
                console.error('Failed to fetch course:', err);
                // Handle cases where the course might not be found or an error occurs
                // For example, redirect to a 404 page or a list of courses
                // navigate('/courses');
            }
        };

        fetchCourse();
    }, [id, navigate]); // Add 'navigate' to dependency array as recommended by linter

    // Show a loading message while course data is being fetched
    if (!course) {
        return <p className="p-6 text-center text-gray-600">Loading course details...</p>;
    }

    // Convert id to a number for passing to DescriptiveCSVUpload,
    // though useParams typically gives a string, and course.id from backend should be numeric.
    const courseIdForUpload = parseInt(id, 10);

    return (
        <div className="dashboard-wrapper">
            {/* You might have a sidebar component that wraps this content,
                or this div acts as the main content area. */}

            <div className="dashboard-content" style={{ padding: '20px' }}> {/* Added some padding for overall content */}
                <h1 className="text-3xl font-bold mb-6">Welcome, Arun!</h1>

                <div className="course-card-box" style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', // Softer shadow
                    backgroundColor: '#fff' // White background for the card
                }}>
                    <h3 className="text-2xl font-semibold mb-3">{course.title}</h3>
                    <p className="mb-2 text-gray-700"><strong>Subject:</strong> {course.subject}</p>
                    <p className="mb-4 text-gray-700"><strong>Description:</strong> {course.description}</p>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                            className="view-btn"
                            onClick={() => navigate(-1)}
                            style={{
                                padding: '10px 15px',
                                backgroundColor: '#6c757d', // A neutral grey
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            Back to Courses
                        </button>
                        <button
                            onClick={() => navigate(`/user/test/${course.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 mt-4 rounded"
                            style={{
                                padding: '10px 15px',
                                backgroundColor: '#007bff', // Bootstrap primary blue
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                transition: 'background-color 0.2s ease'
                            }}
                        >
                            Start Test
                        </button>
                    </div>

                    {/* Section for Uploading Questions */}
                    <div style={{
                        marginTop: '40px',
                        paddingTop: '20px',
                        borderTop: '1px solid #e9ecef' // Light grey border
                    }}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Upload Questions for This Course</h2>
                        {/* Render the DescriptiveCSVUpload component and pass the courseId */}
                        {/* Check if courseIdForUpload is a valid number before passing */}
                        {isNaN(courseIdForUpload) ? (
                            <p className="text-red-500">Error: Invalid Course ID provided in the URL.</p>
                        ) : (
                            <DescriptiveCSVUpload courseId={courseIdForUpload} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetails;