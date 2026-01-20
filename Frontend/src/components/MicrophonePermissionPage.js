// src/components/MicrophonePermissionPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const MicrophonePermissionPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [permissionStatus, setPermissionStatus] = useState('pending'); // 'pending', 'granted', 'denied'
    const [error, setError] = useState('');

    // Function to request microphone permission
    const requestPermission = useCallback(async () => {
        try {
            // Attempt to get user media (audio)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted.');
            setPermissionStatus('granted');
            setError('');
            // Stop the stream tracks immediately after getting permission.
            // We only need to confirm permission here, actual recording stream will be created in StartSpeakingTest.
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error('Microphone access denied:', err);
            setPermissionStatus('denied');
            // Provide a user-friendly error message
            setError('Microphone access is required for this test. Please allow access in your browser settings.');
        }
    }, []);

    // Request permission when the component mounts
    useEffect(() => {
        requestPermission();
    }, [requestPermission]);

    // Handler for the "Microphone is working, Start Test" button
    const handleProceedToTest = () => {
        if (permissionStatus === 'granted') {
            // Navigate to the actual speaking test page
            navigate(`/start-speaking-test/${courseId}`);
        } else {
            // Alert user if permission is not granted (should ideally not happen if button is disabled)
            alert('Microphone access is not granted. Please allow access to proceed with the test.');
        }
    };

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-content" style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 32, textAlign: 'center' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#5a67d8' }}>Microphone Permission Check</h2>

                {permissionStatus === 'pending' && (
                    <p className="text-lg text-gray-700">Requesting microphone access...</p>
                )}

                {permissionStatus === 'granted' && (
                    <>
                        <p className="text-lg text-green-600 mb-4">Microphone access granted!</p>
                        <p className="text-md text-gray-600 mb-6">Click the button below to proceed to the test.</p>
                        <button
                            className="primary-button"
                            onClick={handleProceedToTest}
                            // Button is only enabled if permission is granted
                            disabled={permissionStatus !== 'granted'}
                            style={{ background: '#00bfa6', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                            Microphone is working, Start Test
                        </button>
                    </>
                )}

                {permissionStatus === 'denied' && (
                    <>
                        <p className="text-lg text-red-600 mb-4">{error}</p>
                        <p className="text-md text-gray-600 mb-6">Please enable microphone access in your browser settings and refresh this page to continue.</p>
                        <button
                            className="primary-button"
                            onClick={requestPermission} // Allow retrying permission
                            style={{ background: '#f44336', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                            Retry Permission
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MicrophonePermissionPage;
