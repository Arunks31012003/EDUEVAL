// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path'); // Import path module
const pool = require('../db'); // PostgreSQL connection
const testController = require('../controllers/testController'); // Import testController

// --- Multer Storage Configuration for Images ---
// Use memory storage for S3 upload
const uploadImage = multer({ storage: multer.memoryStorage() });

// --- Multer Storage Configuration for CSVs ---
// Use memory storage for S3 upload
const uploadCsv = multer({ storage: multer.memoryStorage() });


// ==================== NEW ROUTE FOR IMAGE UPLOAD ====================
// This route will handle POST requests to /api/uploads/image
// and use the uploadListeningImage controller function.
router.post('/image', uploadImage.single('image'), testController.uploadListeningImage);


// ==================== EXISTING /upload-csv ROUTE (Modified to use memoryStorage) ====================
router.post('/upload-csv', uploadCsv.single('file'), async (req, res) => {
    const courseId = req.body.courseId;
    const fileBuffer = req.file.buffer; // Buffer from memory storage

    const results = [];

    try {
        const { Readable } = require('stream');
        Readable.from(fileBuffer)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const client = await pool.connect();

                try {
                    for (const row of results) {
                        await client.query(
                            `INSERT INTO test_questions
                             (course_id, question, option_a, option_b, option_c, option_d, correct_option)
                             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [
                                courseId,
                                row.question,
                                row.option_a,
                                row.option_b,
                                row.option_c,
                                row.option_d,
                                row.correct_option
                            ]
                        );
                    }

                    res.status(200).json({ message: 'CSV uploaded and questions saved.' });
                } catch (error) {
                    console.error("Database error during CSV insert:", error);
                    res.status(500).json({ error: 'Database error during CSV processing.' });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error("Failed to process CSV:", err);
        res.status(500).json({ error: 'Failed to process CSV file.' });
    }
});

module.exports = router;
