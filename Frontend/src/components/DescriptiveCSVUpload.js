// DescriptiveCSVUpload.jsx
import React, { useState } from 'react';
import axios from '../utils/axiosInstance'; // Make sure this path is correct for your axios setup
import { toast } from 'react-toastify'; // For notifications


const DescriptiveCSVUpload = ({ courseId }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    // Ensure a courseId is available.
    // In a real application, you'd likely get this from routing (e.g., useParams from react-router-dom)
    // or from a global state/context if the user has selected a course.
    // For demonstration, if courseId is not passed, it will use a placeholder (e.g., 4).
    // You should replace this with actual logic to get the correct course ID.
    const effectiveCourseId = courseId || 4; // **IMPORTANT: Replace `4` with dynamic course ID retrieval**

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a CSV file to upload.');
            return;
        }

        if (!effectiveCourseId) {
            toast.error('Course ID is missing. Cannot upload questions.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('course_id', effectiveCourseId); // Pass the course_id to the backend

        try {
            const response = await axios.post(
                '/api/tests/upload-descriptive-csv', // Ensure this matches your backend route
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            toast.success(response.data.message || 'CSV uploaded successfully!');
            setSelectedFile(null); // Clear selected file after successful upload
            // Optionally, refresh data here if needed
        } catch (error) {
            console.error('Upload error:', error);
            // More specific error message from backend if available
            toast.error(error.response?.data?.message || 'Failed to upload CSV.');
        }
    };

    return (
        <div className="upload-section" style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', maxWidth: '500px', margin: '20px auto' }}>
            <h2 style={{ marginBottom: '15px' }}>Upload Descriptive Questions (CSV)</h2>
            <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                <span style={{ color: 'blue' }}>Target Course ID:</span> {effectiveCourseId}
                <br />
                <span style={{ fontSize: '0.9em', color: 'gray' }}>
                    (Make sure this Course ID exists in your database!)
                </span>
            </p>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ marginBottom: '15px', display: 'block' }}
            />
            <button
                onClick={handleUpload}
                disabled={!selectedFile}
                style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
            >
                Upload Questions
            </button>
            {selectedFile && (
                <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#555' }}>
                    Selected file: <strong>{selectedFile.name}</strong>
                </p>
            )}
        </div>
    );
};

export default DescriptiveCSVUpload;