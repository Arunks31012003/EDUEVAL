const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destructure verifyToken and authorizeRoles from authMiddleware
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

// --- Multer Storage Configurations ---

// Storage for individual image uploads (kept on disk)
const imageUploadStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../Uploads/AudioUploads/CSVs/Images');
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            console.error('Multer Destination Error (images): Failed to create directory or save file:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadImage = multer({ storage: imageUploadStorage });

// Storage for general audio uploads (e.g., speaking test audio) (kept on disk)
const uploadGeneralAudioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save speaking audio recordings to backend/Uploads/SpeakingUpload
        const uploadPath = path.join(__dirname, '../Uploads/SpeakingUpload');
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            console.error('Multer Destination Error (general audio): Failed to create directory or save file:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadGeneralAudio = multer({ storage: uploadGeneralAudioStorage });

// Storage for listening audio files (specifically for sections) (kept on disk)
const listeningAudioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../Uploads/AudioUploads');
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            console.error('Multer Destination Error (listening audio): Failed to create directory or save file:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadListeningAudio = multer({ storage: listeningAudioStorage });


// Storage for CSV files (on disk)
const uploadListeningCsvStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../Uploads/AudioUploads/CSVs');
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            console.error('Multer Destination Error (listening csv): Failed to create directory or save file:', error);
            cb(error);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadListeningCsv = multer({ storage: uploadListeningCsvStorage });
const uploadReadingCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for CSV files
});
const uploadGeneralCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for CSV files
});

// Multer instance for listening sections, using memory storage to keep buffers
const uploadListeningSectionFiles = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for audio files
});


// ==================== ROUTES ====================

// Test submission route (handles various test types)
router.post('/submit', verifyToken, testController.submitTest);

// ✅ CRITICAL FIX HERE: Removed the redundant '/tests' prefix from the route path
router.post(
    '/submit-speaking-test', // This will now correctly resolve to /api/tests/submit-speaking-test
    verifyToken,
    authorizeRoles(['user', 'admin', 'superadmin']),
    uploadGeneralAudio.array('audioFiles', 10), // 'audioFiles' must match the formData.append key from frontend
    testController.submitSpeakingTest
);


// Route to get all course questions/sections for admin view or student test
router.get('/course-details-with-questions/:courseId', verifyToken, testController.getCourseDetailsWithQuestions);

// Route to get course info (duration, type etc.)
router.get('/course-info/:courseId', verifyToken, testController.getCourseInfo);

// Update individual question timer (for Speaking questions)
router.patch('/questions/:questionId/update-timer', verifyToken, authorizeRoles(['admin']), testController.updateQuestionTimer);

// --- UPLOAD ROUTES ---
router.post('/upload-csv', verifyToken, authorizeRoles(['admin']), uploadGeneralCsv.single('file'), testController.uploadCSVTest);
router.post('/upload-reading-advanced-csv', verifyToken, authorizeRoles(['admin']), uploadReadingCsv.single('csvFile'), testController.uploadNewReadingTest);
router.post('/upload-descriptive', verifyToken, authorizeRoles(['admin']), uploadGeneralCsv.single('file'), testController.uploadDescriptiveCSV);
router.post('/upload-speaking-csv', verifyToken, authorizeRoles(['admin']), uploadGeneralCsv.single('file'), testController.uploadSpeakingCSV);
router.post('/upload-listening-audio', verifyToken, authorizeRoles(['admin']), uploadListeningAudio.single('audioFile'), testController.uploadListeningAudio);
router.post('/uploads/image', verifyToken, authorizeRoles(['admin']), uploadImage.single('image'), testController.uploadListeningImage);
router.post(
    '/upload-listening-section',
    verifyToken,
    authorizeRoles(['admin']),
    uploadListeningSectionFiles.fields([
        { name: 'audioFile', maxCount: 1 },
        { name: 'csvFile', maxCount: 1 }
    ]),
    testController.uploadListeningSection
);

// --- TEST REVIEW ROUTES ---
router.get('/writing-reviews', verifyToken, authorizeRoles(['admin']), testController.getWritingTestsForReview);
router.get('/writing-tests/reviewed-submissions', verifyToken, authorizeRoles(['admin']), testController.getReviewedWritingSubmissions);
router.get('/writing-submission/:submissionId', verifyToken, authorizeRoles(['admin']), testController.getWritingSubmissionDetails);
router.patch('/writing-submission/:submissionId/score', verifyToken, authorizeRoles(['admin']), testController.updateWritingTestScore);

router.get('/speaking-reviews', verifyToken, authorizeRoles(['admin']), testController.getSpeakingTestsForReview);
router.get('/speaking-tests/reviewed-submissions', verifyToken, authorizeRoles(['admin']), testController.getReviewedSpeakingSubmissions);
router.get('/speaking-submission/:submissionId', verifyToken, authorizeRoles(['admin']), testController.getSpeakingSubmissionDetails);
router.patch('/speaking-submission/:submissionId/score', verifyToken, authorizeRoles(['admin']), testController.updateSpeakingTestScore);

// Admin debug: return raw user_answers (unmodified) for a submission
router.get('/submission-raw/:submissionId', verifyToken, authorizeRoles(['admin','superadmin']), testController.getSubmissionRaw);

// Admin: list files present in Uploads/SpeakingUpload
router.get('/speaking-files', verifyToken, authorizeRoles(['admin','superadmin']), testController.getSpeakingFilesList);

// Admin: report DB submissions whose user_answers don't point into /Uploads/SpeakingUpload
router.get('/speaking-files/report', verifyToken, authorizeRoles(['admin','superadmin']), testController.getSpeakingFilesReport);

// Student dashboard results
router.get('/results', verifyToken, testController.getTestResults);

// Admin dashboard results
router.get('/results/admin', verifyToken, authorizeRoles(['admin']), testController.getTestResultsForAdmin);

// New welcome endpoint with logging (protected)
router.get('/welcome', verifyToken, testController.getWelcome);

// Public welcome endpoint with logging
router.get('/welcome-public', testController.getWelcome);

module.exports = router;
