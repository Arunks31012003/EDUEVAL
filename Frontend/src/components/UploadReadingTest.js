// src/components/UploadReadingTest.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const UploadReadingTest = ({ courses, fetchCourses }) => {
    const fileInputRef = useRef(null);
    const [selectedUploadCourseId, setSelectedUploadCourseId] = useState('');
    const [selectedUploadCourseType, setSelectedUploadCourseType] = useState('');

    const readingCourses = courses.filter(course => course.type === 'Reading');

    useEffect(() => {
        if (selectedUploadCourseId) {
            const currentCourse = readingCourses.find(c => String(c.id) === selectedUploadCourseId);
            if (!currentCourse) {
                setSelectedUploadCourseId('');
                setSelectedUploadCourseType('');
            }
        }
    }, [selectedUploadCourseId, readingCourses]);

    const handleUploadCourseSelectChange = (e) => {
        const courseId = e.target.value;
        setSelectedUploadCourseId(courseId);
        if (courseId) {
            const selectedCourse = readingCourses.find(c => String(c.id) === courseId);
            setSelectedUploadCourseType(selectedCourse ? selectedCourse.type : '');
        } else {
            setSelectedUploadCourseType('');
        }
    };

    const handleCsvFileUpload = async (e) => {
        e.preventDefault();
        const file = fileInputRef.current?.files[0];
        const courseId = selectedUploadCourseId;

        console.log('Frontend: File object from input:', file);
        console.log('Frontend: Course ID:', courseId);

        if (!file || !courseId) {
            toast.error('Please select a CSV file and a Reading course to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', file); // This is the intended field name
        formData.append('course_id', courseId);

        // --- IMPORTANT: This loop will show what's in your FormData ---
        console.log('Frontend: FormData content before sending:');
        for (let pair of formData.entries()) {
            console.log(`  Key: ${pair[0]}, Value: ${pair[1] instanceof File ? pair[1].name : pair[1]}`);
        }
        // --- END IMPORTANT ADDITION ---

        try {
            // --- CRITICAL FIX: Changed endpoint to /api/tests/upload-reading-advanced-csv ---
            const res = await api.post('/api/tests/upload-reading-advanced-csv', formData, {
                headers: {
                    // 'Content-Type': 'multipart/form-data' is automatically set by FormData with boundary
                },
            });
            toast.success(res.data.message || 'Reading Test CSV uploaded successfully!');
            fileInputRef.current.value = ''; // Clear the file input
            setSelectedUploadCourseId('');
            setSelectedUploadCourseType('');
            fetchCourses(); // Refresh courses in AdminDashboard if needed
        } catch (error) {
            console.error("Error uploading Reading CSV:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Failed to upload Reading Test CSV.');
        }
    };

    return (
        <div className="upload-questions-section content-panel p-6 bg-white rounded-3xl shadow-md text-gray-800 max-w-lg mx-auto my-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-700 text-center">Upload Reading Test (Passage + Questions)</h2>
            <form onSubmit={handleCsvFileUpload} className="space-y-6">
                <div>
                    <label htmlFor="readingCourseSelect" className="block text-lg font-medium text-gray-700 mb-2">
                        Select Reading Course:
                    </label>
                    <select
                        id="readingCourseSelect"
                        value={selectedUploadCourseId}
                        onChange={handleUploadCourseSelectChange}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                        required
                    >
                        <option value="">-- Select a Reading Course --</option>
                        {readingCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.title} (ID: {course.id})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="info-box bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md text-sm">
                    <p className="font-semibold mb-2">CSV Format for Reading Tests:</p>
                    <p>Each Reading test CSV must contain at least one `PASSAGE` row and its associated questions (`QUESTION` for MCQ, `TRUE_FALSE_QUESTION`, `FILL_BLANK_QUESTION`).</p>
                    <p className="mt-2">Example format:</p>
                    <pre className="bg-blue-100 p-2 rounded-md text-xs overflow-auto">
                        <code>TYPE,VALUE,OPTION_A,OPTION_B,OPTION_C,OPTION_D,CORRECT_ANSWER,CORRECT_BLANK_1<br/>PASSAGE,"...",,,,,, <br/>QUESTION,"...",A,B,C,D,B,,<br/>TRUE_FALSE_QUESTION,"...",,,,,TRUE,<br/>FILL_BLANK_QUESTION,"...[BLANK]...",,,,,,,answer1,answer2</code>
                    </pre>
                </div>
                <div>
                    <label htmlFor="readingCsvFile" className="block text-lg font-medium text-gray-700 mb-2">
                        Upload CSV File:
                    </label>
                    <input
                        type="file"
                        id="readingCsvFile"
                        accept=".csv"
                        onChange={() => {}} // onChange is required for controlled components, but we use ref for file input
                        ref={fileInputRef}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out shadow-lg hover:shadow-purple-300/50 transform hover:-translate-y-1"
                >
                    Upload Reading Test
                </button>
            </form>
        </div>
    );
};

export default UploadReadingTest;