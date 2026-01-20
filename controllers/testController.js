const fs = require('fs');
const csv = require('csv-parser');
const pool = require('../db');
const nodemailer = require('nodemailer');
const path = require('path');
const { Readable } = require('stream'); // Import Readable for stream from buffer
const { uploadFileToGoogleDrive } = require('../utils/googleDriveClient');

// Configure Nodemailer transporter (reusing existing setup)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Helper function to save file locally and return relative path
async function saveFileLocally(buffer, filename, contentType, fileType = 'csv') {
    const fs = require('fs');
    const path = require('path');

    // Determine directory based on file type
    let uploadDir;
    if (fileType === 'image') {
        uploadDir = path.join(__dirname, '../Uploads/AudioUploads/CSVs/Images');
    } else if (fileType === 'audio_upload' || fileType === 'audio_recording') {
        // Store speaking test uploads in a centralized folder for easier management
        // Matches requested path: backend/Uploads/SpeakingUpload
        uploadDir = path.join(__dirname, '../Uploads/SpeakingUpload');
    } else {
        uploadDir = path.join(__dirname, '../Uploads/AudioUploads/CSVs');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Return relative path for API response (e.g., /Uploads/AudioUploads/CSVs/Images/filename)
    const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
    console.log(`File saved locally: ${filePath}, relative path: /${relativePath}`);
    return `/${relativePath}`; // Return relative path starting with /
}

// Helper: Given an external URL (Google Drive or public URL), return a Google Drive file ID.
// If the URL is a Google Drive link, extract the file ID. Otherwise, fetch the resource and upload to Drive.
async function resolveExternalUrlToDriveId(url, suggestedFilename = null, fileType = 'image') {
    if (!url) return null;
    try {
        // If it's already a drive link, extract id
        if (/drive\.google\.com/i.test(url)) {
            const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) return match[1];
            // Also handle shareable link forms
            const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) return idMatch[1];
        }

        // Otherwise fetch the URL and upload its contents to Google Drive
        console.log('Resolving external URL to Google Drive ID by fetching:', url);
        const fetch = require('node-fetch');
        const resp = await fetch(url, { timeout: 15000 });
        if (!resp.ok) {
            console.warn('Failed to fetch external URL for Drive upload:', url, resp.status);
            return null;
        }

        const contentType = resp.headers.get('content-type') || undefined;
        const buffer = await resp.buffer();

        const filename = suggestedFilename || (`imported-${Date.now()}${contentType && contentType.includes('image') ? '.png' : ''}`);
        const id = await uploadFileToGoogleDriveHelper(buffer, filename, contentType, fileType);
        return id;
    } catch (err) {
        console.error('Error resolving external URL to Drive ID:', err && err.message);
        return null;
    }
}

// ==================== UPLOAD INDIVIDUAL LISTENING IMAGE (NEW) ====================
exports.uploadListeningImage = async (req, res) => {
    console.log('📂 Received request to upload listening image file.');

    if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // Validate file properties
    const { buffer, mimetype, originalname, size } = req.file;
    if (!buffer || buffer.length === 0) {
        console.error('❌ Invalid file buffer: buffer is empty or undefined');
        return res.status(400).json({ message: 'Invalid file: no content provided.' });
    }
    if (!mimetype || !mimetype.startsWith('image/')) {
        console.error(`❌ Invalid mimetype: ${mimetype}`);
        return res.status(400).json({ message: 'Invalid file type. Only image files are allowed.' });
    }
    if (size > 10 * 1024 * 1024) { // 10MB limit
        console.error(`❌ File too large: ${size} bytes`);
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }

    console.log(`📋 File details: originalname=${originalname}, mimetype=${mimetype}, size=${size} bytes`);

    try {
        const filename = `${Date.now()}-${originalname}`;
        const filePath = await saveFileLocally(buffer, filename, mimetype, 'image');

        console.log(`✅ Image file uploaded successfully locally: ${filePath}`);
        res.status(200).json({
            message: 'Image file uploaded successfully!',
            filePath: filePath
        });
    } catch (error) {
        console.error('❌ Error uploading image locally:', error.message, error.stack);
        res.status(500).json({ message: 'Failed to upload image file.', error: error.message });
    }
};


// ==================== ADD INDIVIDUAL LISTENING QUESTION (UPDATED) ====================
exports.addListeningQuestion = async (req, res) => {
    const { listening_section_id, question_text, option_a, option_b, option_c, option_d, correct_option, image_path } = req.body;
    const userId = req.user?.id;

    console.log('Received individual listening question data:', {
        listening_section_id, question_text, option_a, option_b, option_c, option_d, correct_option, image_path
    });

    if (!listening_section_id) {
        return res.status(400).json({ message: 'Listening section ID is required.' });
    }
    if (!question_text) {
        return res.status(400).json({ message: 'Question text is required.' });
    }
    if (!option_a) {
        return res.status(400).json({ message: 'Option A is required.' });
    }
    if (!option_b) {
        return res.status(400).json({ message: 'Option B is required.' });
    }
    if (!correct_option) {
        return res.status(400).json({ message: 'Correct option is required.' });
    }

    const validOptions = [];
    if (option_a) validOptions.push('A');
    if (option_b) validOptions.push('B');
    if (option_c) validOptions.push('C');
    if (option_d) validOptions.push('D');

    if (!validOptions.includes(correct_option.toUpperCase())) {
        return res.status(400).json({ message: `Correct option must be one of the provided options: ${validOptions.join(', ')}.` });
    }

    const parsedSectionId = parseInt(listening_section_id);
    if (isNaN(parsedSectionId)) {
        return res.status(400).json({ message: 'Invalid Listening Section ID provided.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const sectionCheck = await client.query('SELECT id FROM listening_sections WHERE id = $1', [parsedSectionId]);
        if (sectionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Listening Section with ID ${parsedSectionId} does not exist.` });
        }

        const result = await client.query(
            `INSERT INTO listening_questions (listening_section_id, question_text, option_a, option_b, option_c, option_d, correct_option, image_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [parsedSectionId, question_text, option_a, option_b, option_c || null, option_d || null, correct_option, image_path || null]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Listening question added successfully!', question: result.rows[0] });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Error adding individual listening question:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to add listening question.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};


// ==================== UPLOAD MCQ CSV (Existing - now specifically for non-Reading MCQs or old format) ====================
exports.uploadCSVTest = async (req, res) => {
    const courseId = req.body.course_id;
    const fileBuffer = req.file?.buffer; // Read from buffer
    const results = [];

    console.log('📂 Received file buffer (MCQ).');
    console.log('📘 Received course ID (MCQ):', courseId, '| Type:', typeof courseId);

    if (!fileBuffer) {
        return res.status(400).json({ message: 'No file uploaded or invalid file data.' });
    }

    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
        return res.status(400).json({ message: 'Invalid or missing Course ID for MCQ upload. Please provide a valid number.' });
    }

    let client;
    try {
        client = await pool.connect();

        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [parsedCourseId]);
        if (courseCheck.rows.length === 0) {
            console.error(`❌ Course with ID ${parsedCourseId} does not exist in the 'courses' table for MCQ upload.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} does not exist. Please ensure the course is created before uploading MCQ questions for it.` });
        }
        if (courseCheck.rows[0].type === 'Reading') {
            console.warn(`⚠️ Attempted to use old MCQ upload for Reading course ID ${parsedCourseId}. Please use the new 'Upload Reading Test (New)' feature for Reading courses.`);
            client.release();
            return res.status(400).json({ message: 'Please use the dedicated "Upload Reading Test (New)" for Reading courses.' });
        }


        Readable.from(fileBuffer)
            .on('error', (err) => {
                console.error('❌ File read error (MCQ):', err.message);
                client.release();
                return res.status(500).json({ message: 'Unable to read uploaded file for MCQs.' });
            })
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', async () => {
                console.log('📦 Parsed CSV data (MCQ):', results);

                if (results.length === 0) {
                    client.release();
                    return res.status(400).json({ message: 'No valid questions found in the CSV after parsing. Ensure required columns exist.' });
                }

                try {
                    await client.query('BEGIN');

                    for (const row of results) {
                        const {
                            question,
                            option_a,
                            option_b,
                            option_c,
                            option_d,
                            correct_option
                        } = row;

                        const questionText = question?.trim();
                        const a = option_a?.trim();
                        const b = option_b?.trim();
                        const c = option_c?.trim();
                        const d = option_d?.trim();
                        const correct = correct_option?.trim().toUpperCase();

                        if (!questionText || !a || !b || !c || !d || !['A', 'B', 'C', 'D'].includes(correct)) {
                            console.warn('⚠️ Skipping invalid or incomplete MCQ row:', row);
                            continue;
                        }

                        console.log(`📤 Inserting MCQ for course ${parsedCourseId}:`, questionText);

                        await client.query(
                            `INSERT INTO test_questions
                             (course_id, question, option_a, option_b, option_c, option_d, correct_option, question_type)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [parsedCourseId, questionText, a, b, c, d, correct, 'mcq']
                        );
                    }

                    await client.query('COMMIT');
                    res.status(200).json({ message: 'MCQ CSV uploaded and saved successfully.' });
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Database insert error (MCQ):', err.message, err.stack);
                    res.status(500).json({ message: 'Database insert error for MCQ questions.' });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error('❌ Server error during MCQ CSV upload pre-processing:', err.message, err.stack);
        if (client) {
            client.release();
        }
        res.status(500).json({ message: 'Server error during file or course validation for MCQ.' });
    }
};

// ==================== NEW: UPLOAD NEW READING TEST (PASSAGE + QUESTIONS) - CRITICAL FIX ====================
exports.uploadNewReadingTest = async (req, res) => {
    const courseId = req.body.course_id;
    const fileBuffer = req.file?.buffer; // Read from buffer

    console.log('📂 Received file buffer (New Reading Test CSV).');
    console.log('📘 Received course ID (New Reading Test CSV):', courseId);

    if (!fileBuffer) {
        return res.status(400).json({ message: 'No file uploaded or invalid file data for reading test.' });
    }

    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
        return res.status(400).json({ message: 'Invalid or missing Course ID for reading test upload. Please provide a valid number.' });
    }

    let client;
    try {
        client = await pool.connect();

        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [parsedCourseId]);
        if (courseCheck.rows.length === 0) {
            console.error(`❌ Course with ID ${parsedCourseId} does not exist for Reading upload.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} does not exist. Please ensure the course is created before uploading Reading questions for it.` });
        }
        if (courseCheck.rows[0].type !== 'Reading') {
            console.error(`❌ Course with ID ${parsedCourseId} is not a 'Reading' type course.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} is not a 'Reading' type. Reading tests can only be uploaded for 'Reading' courses.` });
        }

        const allPassagesWithQuestions = [];
        let currentPassageGroup = null;

        Readable.from(fileBuffer)
            .on('error', (err) => {
                console.error('❌ File read error (New Reading Test CSV):', err.message);
                client.release();
                return res.status(500).json({ message: 'Unable to read uploaded file for new reading test.' });
            })
            .pipe(csv())
            .on('data', (row) => {
                const type = row.TYPE?.trim().toUpperCase();

                if (type === 'PASSAGE') {
                    if (currentPassageGroup) {
                        allPassagesWithQuestions.push(currentPassageGroup);
                    }
                    currentPassageGroup = {
                        passageData: row,
                        questions: []
                    };
                } else if (['QUESTION', 'TRUE_FALSE_QUESTION', 'FILL_BLANK_QUESTION'].includes(type)) {
                    if (!currentPassageGroup) {
                        // Allow standalone questions without a passage
                        currentPassageGroup = {
                            passageData: null,
                            questions: []
                        };
                    }
                    currentPassageGroup.questions.push(row);
                }
            })
            .on('end', async () => {
                if (currentPassageGroup) {
                    allPassagesWithQuestions.push(currentPassageGroup);
                }

                if (allPassagesWithQuestions.length === 0 || allPassagesWithQuestions.every(p => (!p.passageData || !p.passageData.VALUE) && p.questions.length === 0)) {
                    client.release();
                    return res.status(400).json({ message: 'No valid passages or questions found in the CSV after parsing. Ensure correct format.' });
                }

                try {
                    await client.query('BEGIN');

                    for (const passageGroup of allPassagesWithQuestions) {
                        let passageTitle = null;
                        let passageContent = null;
                        let passageId = null;

                        if (passageGroup.passageData) {
                            passageTitle = passageGroup.passageData.TITLE?.trim() || `Reading Passage for Course ${parsedCourseId} - ${new Date().toLocaleString()}`;
                            passageContent = passageGroup.passageData.VALUE?.trim();

                            if (!passageContent) {
                                console.warn('⚠️ Skipping passage with missing content:', passageGroup.passageData);
                                continue;
                            }

                            const insertPassageRes = await client.query(
                                `INSERT INTO reading_passages (course_id, title, content)
                                 VALUES ($1, $2, $3)
                                 RETURNING id`,
                                [parsedCourseId, passageTitle, passageContent]
                            );
                            passageId = insertPassageRes.rows[0].id;
                            console.log(`✅ Inserted Reading Passage with ID: ${passageId} for Course ID: ${parsedCourseId}`);
                        }

                        for (const row of passageGroup.questions) {
                            const type = row.TYPE?.trim().toUpperCase();
                            const questionText = row.VALUE?.trim();
                            let questionTypeInDB = '';
                            let correctOption = null;
                            let options = {};
                            let correctAnswersJson = null;

                            if (!questionText) {
                                console.warn('⚠️ Skipping question row with missing VALUE (question text):', row);
                                continue;
                            }

                            if (type === 'QUESTION') {
                                questionTypeInDB = 'reading_mcq';
                                options = {
                                    option_a: row.OPTION_A?.trim(),
                                    option_b: row.OPTION_B?.trim(),
                                    option_c: row.OPTION_C?.trim() || null,
                                    option_d: row.OPTION_D?.trim() || null,
                                    option_e: row.OPTION_E?.trim() || null,
                                    option_f: row.OPTION_F?.trim() || null,
                                    option_g: row.OPTION_G?.trim() || null,
                                    option_h: row.OPTION_H?.trim() || null,
                                    option_i: row.OPTION_I?.trim() || null,
                                    option_j: row.OPTION_J?.trim() || null,
                                };
                                correctOption = row.CORRECT_ANSWER?.trim().toUpperCase();

                                // Validate that at least options A and B are provided
                                if (!options.option_a || !options.option_b) {
                                    console.warn('⚠️ Skipping invalid or incomplete Reading MCQ row (missing required options A and B):', row);
                                    continue;
                                }

                                // Validate correct option is within available options (A-J)
                                const availableOptions = [];
                                for (let i = 0; i < 10; i++) {
                                    const optionKey = String.fromCharCode(65 + i); // A-J
                                    const optionValue = options[`option_${optionKey.toLowerCase()}`];
                                    if (optionValue) {
                                        availableOptions.push(optionKey);
                                    }
                                }

                                if (!availableOptions.includes(correctOption)) {
                                    console.warn('⚠️ Skipping invalid Reading MCQ row (correct_answer not in available options):', row);
                                    continue;
                                }
                            } else if (type === 'TRUE_FALSE_QUESTION') {
                                questionTypeInDB = 'true_false';
                                correctOption = row.CORRECT_ANSWER?.trim().toUpperCase();
                                // Normalize "NOT GIVEN" to "NOTGIVEN" for consistency
                                if (correctOption === 'NOT GIVEN') {
                                    correctOption = 'NOTGIVEN';
                                }
                                if (!['TRUE', 'FALSE', 'NOTGIVEN', 'NOT GIVEN'].includes(correctOption)) {
                                    console.warn('⚠️ Skipping invalid True/False question (invalid CORRECT_ANSWER):', row);
                                    continue;
                                }
                            } else if (type === 'FILL_BLANK_QUESTION') {
                                questionTypeInDB = 'fill_in_blanks';
                                const blankAnswers = [];
                                for (let i = 1; i <= 10; i++) {
                                    const blankKey = `CORRECT_BLANK_${i}`;
                                    if (row[blankKey] !== undefined && row[blankKey] !== null && row[blankKey].trim() !== '') {
                                        blankAnswers.push(row[blankKey].trim());
                                    }
                                }
                                if (blankAnswers.length === 0) {
                                    console.warn('⚠️ Skipping Fill-in-the-Blanks question with no correct blank answers:', row);
                                    continue;
                                }
                                correctAnswersJson = JSON.stringify(blankAnswers);
                                options = { option_a: null, option_b: null, option_c: null, option_d: null };
                                correctOption = null;
                            } else {
                                console.warn('⚠️ Skipping unrecognized question type:', type, 'in row:', row);
                                continue;
                            }
                            
                            console.log(`📤 Inserting Reading question (Type: ${questionTypeInDB}) for Passage ID: ${passageId}:`, questionText);

                            await client.query(
                                `INSERT INTO test_questions
                                 (course_id, passage_id, question, option_a, option_b, option_c, option_d, option_e, option_f, option_g, option_h, option_i, option_j, correct_option, question_type, correct_answers_json)
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                                [
                                    parsedCourseId,
                                    passageId || null,
                                    questionText,
                                    options.option_a,
                                    options.option_b,
                                    options.option_c,
                                    options.option_d,
                                    options.option_e,
                                    options.option_f,
                                    options.option_g,
                                    options.option_h,
                                    options.option_i,
                                    options.option_j,
                                    correctOption,
                                    questionTypeInDB,
                                    correctAnswersJson
                                ]
                            );
                        }
                    }

                    await client.query('COMMIT');
                    res.status(200).json({ message: 'Reading test (passages and questions) uploaded and saved successfully.' });

                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Database insert error (New Reading Test):', err.message, err.stack);
                    res.status(500).json({ message: 'Database insert error for new reading test. All inserts rolled back.', details: err.message });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error('❌ Server error during New Reading Test CSV upload pre-processing:', err.message, err.stack);
        if (client) {
            client.release();
        }
        res.status(500).json({ message: 'Server error during file or course validation for new reading test.' });
    }
};


// ==================== UPLOAD DESCRIPTIVE CSV ====================
exports.uploadDescriptiveCSV = async (req, res) => {
    const fileBuffer = req.file?.buffer; // Read from buffer
    const courseId = parseInt(req.body.course_id);
    const results = [];

    console.log('📂 Uploading Descriptive CSV | File Buffer Received.');
    console.log('📘 Received course ID from frontend:', courseId, '| Type:', typeof courseId);

    if (!fileBuffer) {
        return res.status(400).json({ message: 'No file uploaded or invalid file data.' });
    }

    if (isNaN(courseId)) {
        console.error('❌ Invalid course ID received:', req.body.course_id);
        return res.status(400).json({ message: 'Invalid or missing Course ID. Please provide a valid number.' });
    }

    let client;
    try {
        client = await pool.connect();
        const courseCheck = await client.query('SELECT 1 FROM courses WHERE id = $1', [courseId]);
        if (courseCheck.rows.length === 0) {
            console.error(`❌ Course with ID ${courseId} does not exist in the 'courses' table.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${courseId} does not exist. Please ensure the course is created before uploading questions for it.` });
        }

        Readable.from(fileBuffer)
            .on('error', (err) => {
                console.error('❌ File read error:', err.message);
                client.release();
                return res.status(500).json({ message: 'Unable to read uploaded file.' });
            })
            .pipe(csv())
            .on('data', (row) => {
                const question = row.question?.trim();
                if (question) {
                    results.push({ question, course_id: courseId });
                } else {
                    console.warn('⚠️ Skipping row with missing "question" data:', row);
                }
            })
            .on('end', async () => {
                console.log('📦 Parsed descriptive questions (assigned to course_id from frontend):', results);

                if (results.length === 0) {
                    client.release();
                    return res.status(400).json({ message: 'No valid questions found in the CSV after parsing. Ensure a "question" column exists.' });
                }

                try {
                    await client.query('BEGIN');

                    for (const q of results) {
                        await client.query(
                            `INSERT INTO descriptive_qna (question, course_id) VALUES ($1, $2)`,
                            [q.question, q.course_id]
                        );
                        console.log(`✅ Inserted: "${q.question}" for Course ID: ${q.course_id}`);
                    }

                    await client.query('COMMIT');
                    res.status(200).json({ message: 'Descriptive questions uploaded successfully.' });
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Database insert error (Descriptive):', err.message, err.stack);
                    res.status(500).json({ message: 'Database insert error for descriptive questions. All inserts rolled back.' });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error('❌ Server error during descriptive CSV upload pre-processing:', err.message, err.stack);
        if (client) {
            client.release();
        }
        res.status(500).json({ message: 'Server error during file or course validation.' });
    }
};

// ==================== UPLOAD SPEAKING CSV ====================
exports.uploadSpeakingCSV = async (req, res) => {
    const courseId = req.body.course_id;
    const fileBuffer = req.file?.buffer; // Read from buffer
    const results = [];

    console.log('📂 Received file buffer (Speaking CSV).');
    console.log('📘 Received course ID (Speaking CSV):', courseId, '| Type:', typeof courseId);

    if (!fileBuffer) {
        return res.status(400).json({ message: 'No file uploaded or invalid file data.' });
    }

    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
        return res.status(400).json({ message: 'Invalid or missing Course ID for Speaking CSV upload. Please provide a valid number.' });
    }

    let client;
    try {
        client = await pool.connect();

        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [parsedCourseId]);
        if (courseCheck.rows.length === 0) {
            console.error(`❌ Course with ID ${parsedCourseId} does not exist.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} does not exist.` });
        }
        if (courseCheck.rows[0].type !== 'Speaking') {
            console.error(`❌ Course with ID ${parsedCourseId} is not a 'Speaking' type course.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} is not a 'Speaking' type. Speaking questions can only be uploaded for 'Speaking' courses.` });
        }
        Readable.from(fileBuffer)
            .on('error', (err) => {
                console.error('❌ File read error (Speaking CSV):', err.message);
                client.release();
                return res.status(500).json({ message: 'Unable to read uploaded Speaking CSV file.' });
            })
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', async () => {
                console.log('📦 Parsed Speaking CSV data:', results);

                if (results.length === 0) {
                    client.release();
                    return res.status(400).json({ message: 'No valid questions found in the Speaking CSV after parsing. Ensure a "question_text" column exists.' });
                }

                try {
                    await client.query('BEGIN');

                    for (const row of results) {
                        const questionText = row.question_text?.trim();

                        if (!questionText) {
                            console.warn('⚠️ Skipping invalid or incomplete Speaking question row (missing question_text):', row);
                            continue;
                        }

                        console.log(`📤 Inserting Speaking question for course ${parsedCourseId}: "${questionText}" (timer will be set later)`);

                        await client.query(
                            `INSERT INTO speaking_questions (course_id, question_text, timer_duration_seconds)
                             VALUES ($1, $2, $3)`,
                            [parsedCourseId, questionText, null]
                        );
                    }

                    await client.query('COMMIT');
                    res.status(200).json({ message: 'Speaking questions CSV uploaded and saved successfully.' });
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Database insert error (Speaking CSV):', err.message, err.stack);
                    res.status(500).json({ message: 'Database insert error for Speaking questions.' });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error('❌ Server error during Speaking CSV upload pre-processing:', err.message, err.stack);
        if (client) {
            client.release();
        }
        res.status(500).json({ message: 'Server error during file or course validation for Speaking CSV.' });
    }
};

// ==================== UPLOAD LISTENING CSV (Old method, might be deprecated by new section upload) ====================
exports.uploadListeningCSV = async (req, res) => {
    const courseId = req.body.course_id;
    const fileBuffer = req.file?.buffer; // Read from buffer
    const results = [];

    console.log('📂 Received CSV file buffer (Old Listening CSV).');
    console.log('📘 Received course ID (Old Listening CSV):', courseId, '| Type:', typeof courseId);

    if (!fileBuffer) {
        return res.status(400).json({ message: 'No CSV file uploaded or invalid file data.' });
    }

    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
        return res.status(400).json({ message: 'Invalid or missing Course ID for Listening CSV upload. Please provide a valid number.' });
    }

    let client;
    try {
        client = await pool.connect();

        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [parsedCourseId]);
        if (courseCheck.rows.length === 0) {
            console.error(`❌ Course with ID ${parsedCourseId} does not exist for Listening upload.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} does not exist. Please ensure the course is created before uploading Listening questions for it.` });
        }
        if (courseCheck.rows[0].type !== 'Listening') {
            console.error(`❌ Course with ID ${parsedCourseId} is not a 'Listening' type course.`);
            client.release();
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} is not a 'Listening' type. Listening questions can only be uploaded for 'Listening' courses.` });
        }

        Readable.from(fileBuffer)
            .on('error', (err) => {
                console.error('❌ File read error (Listening CSV):', err.message);
                client.release();
                return res.status(500).json({ message: 'Unable to read uploaded Listening CSV file.' });
            })
            .pipe(csv())
            .on('data', (row) => {
                results.push(row);
            })
            .on('end', async () => {
                console.log('📦 Parsed Listening CSV data:', results);

                if (results.length === 0) {
                    client.release();
                    return res.status(400).json({ message: 'No valid questions found in the CSV after parsing. Ensure required columns exist.' });
                }

                try {
                    await client.query('BEGIN');

                    for (const row of results) {
                        let audioFilePath = row.audio_url?.trim() || null;
                        const questionText = row.question_text?.trim();
                        const optionA = row.option_a?.trim();
                        const optionB = row.option_b?.trim();
                        const optionC = row.option_c?.trim();
                        const optionD = row.option_d?.trim();
                        const correctOption = row.correct_option?.trim().toUpperCase();
                        let imagePath = row.image_path?.trim() || null;

                        if (!questionText || !optionA || !optionB || !correctOption) {
                            console.warn('⚠️ Skipping invalid or incomplete Listening MCQ row (missing question text, option A, option B, or correct option):', row);
                            continue;
                        }

                        const providedOptions = [];
                        if (optionA) providedOptions.push('A');
                        if (optionB) providedOptions.push('B');
                        if (optionC) providedOptions.push('C');
                        if (optionD) providedOptions.push('D');

                        if (!providedOptions.includes(correctOption)) {
                            console.warn(`⚠️ Skipping Listening MCQ row because correct option (${correctOption}) is not one of the provided options (${providedOptions.join(', ')}):`, row);
                            continue;
                        }

                        // If audioFilePath is a URL (not a Drive ID) attempt to resolve/upload to Google Drive
                        if (audioFilePath && /^https?:\/\//i.test(audioFilePath)) {
                            const resolved = await resolveExternalUrlToDriveId(audioFilePath, `listening-audio-${Date.now()}`, 'audio_upload');
                            if (resolved) {
                                audioFilePath = resolved;
                            } else {
                                console.warn('Warning: could not resolve audio URL to Drive ID, storing original URL:', audioFilePath);
                            }
                        }

                        // If imagePath is a URL (not a Drive ID) attempt to resolve/upload to Google Drive
                        if (imagePath && /^https?:\/\//i.test(imagePath)) {
                            const resolvedImg = await resolveExternalUrlToDriveId(imagePath, `image-${Date.now()}`, 'image');
                            if (resolvedImg) {
                                imagePath = resolvedImg;
                            } else {
                                console.warn('Warning: could not resolve image URL to Drive ID, storing original URL:', imagePath);
                            }
                        }

                        await client.query(
                            `INSERT INTO listening_questions (course_id, audio_file_path, question_text, option_a, option_b, option_c, option_d, correct_option, image_path)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [parsedCourseId, audioFilePath, questionText, optionA, optionB, optionC || null, optionD || null, correctOption, imagePath]
                        );
                    }

                    await client.query('COMMIT');
                    res.status(200).json({ message: 'Listening questions CSV uploaded and saved successfully.' });
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error('❌ Database insert error (Listening CSV):', err.message, err.stack);
                    res.status(500).json({ message: 'Database insert error for Listening questions.' });
                } finally {
                    client.release();
                }
            });
    } catch (err) {
        console.error('❌ Server error during Listening CSV upload pre-processing:', err.message, err.stack);
        if (client) {
            client.release();
        }
        res.status(500).json({ message: 'Server error during file or course validation for Listening CSV.' });
    }
};


// ==================== NEW: Upload Individual Listening Audio File ====================
exports.uploadListeningAudio = async (req, res) => {
    console.log('📂 Received request to upload listening audio file.');

    if (!req.file) {
        return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    try {
        const filename = `${Date.now()}-${req.file.originalname}`;
        const filePath = await saveFileLocally(req.file.buffer, filename, req.file.mimetype, 'audio_upload');

        console.log(`✅ Audio file uploaded successfully locally: ${filePath}`);
        res.status(200).json({
            message: 'Audio file uploaded successfully!',
            filePath: filePath
        });
    } catch (error) {
        console.error('❌ Error uploading audio locally:', error);
        res.status(500).json({ message: 'Failed to upload audio file.', error: error.message });
    }
};


// ==================== NEW: Upload Listening Section (Audio + Questions CSV) ====================
exports.uploadListeningSection = async (req, res) => {
    const courseId = req.body.course_id;
    const sectionTitle = req.body.section_title || `Section ${Date.now()}`;
    const sectionNumber = parseInt(req.body.section_number);

    // --- Diagnostic Logs ---
    console.log('📂 Received request to upload listening section. Details:');
    console.log('  Course ID:', courseId);
    console.log('  Section Title:', sectionTitle);
    console.log('  Section Number:', sectionNumber);
    console.log('  req.files received by controller:', JSON.stringify(req.files, null, 2));

    const audioFile = req.files?.audioFile?.[0];
    const csvFile = req.files?.csvFile?.[0];

    // --- Further Diagnostic Logs ---
    if (!audioFile) {
        console.error('❌ audioFile is missing or undefined in req.files.');
        return res.status(400).json({ message: 'Audio file is required.' });
    } else {
        console.log('  Audio File (exists):', audioFile.originalname, 'Buffer size:', audioFile.buffer?.length || 'N/A (no buffer)');
    }
    if (!csvFile) {
        console.error('❌ csvFile is missing or undefined in req.files.');
        return res.status(400).json({ message: 'CSV file is required.' });
    } else {
        console.log('  CSV File (exists):', csvFile.originalname, 'Buffer size:', csvFile.buffer?.length || 'N/A (no buffer)');
    }
    // --- End Diagnostic Logs ---


    // Explicitly check for buffer presence for both files before proceeding
    if (!audioFile.buffer) {
        console.error(`Critical: Missing buffer for audioFile. This indicates a Multer configuration issue.`);
        return res.status(500).json({ message: `Server configuration error: Missing audio file buffer. Ensure Multer uses memoryStorage for audioFile.` });
    }
    if (!csvFile.buffer) {
        console.error(`Critical: Missing buffer for csvFile. This indicates a Multer configuration issue.`);
        return res.status(500).json({ message: `Server configuration error: Missing CSV file buffer. Ensure Multer uses memoryStorage for csvFile.` });
    }


    const parsedCourseId = parseInt(courseId);
    if (isNaN(parsedCourseId)) {
        return res.status(400).json({ message: 'Invalid Course ID provided.' });
    }

    if (isNaN(sectionNumber) || sectionNumber <= 0) {
        return res.status(400).json({ message: 'Invalid or missing section number. Must be a positive integer.' });
    }

    let client;
    let audioPathForDb = null;
    let audioFilePathOnDisk = null;

    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Validate if the course exists and is of 'Listening' type
        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [parsedCourseId]);
        if (courseCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} does not exist.` });
        }
        if (courseCheck.rows[0].type !== 'Listening') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Course with ID ${parsedCourseId} is not a 'Listening' type.` });
        }

        // 2. Check for duplicate section_number for this course
        const duplicateSectionCheck = await client.query(
            `SELECT id FROM listening_sections WHERE course_id = $1 AND section_number = $2`,
            [parsedCourseId, sectionNumber]
        );
        if (duplicateSectionCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `A section with number ${sectionNumber} already exists for this course. Please choose a unique section number.` });
        }

        // --- Upload Audio File Locally ---
        const audioFilename = `${Date.now()}-${audioFile.originalname}`;
        audioPathForDb = await saveFileLocally(audioFile.buffer, audioFilename, audioFile.mimetype, 'audio_upload');
        console.log(`✅ Audio file uploaded locally: ${audioPathForDb}`);
        // --- End Audio Upload ---

        // 3. Insert into listening_sections table
        const insertSectionRes = await client.query(
            `INSERT INTO listening_sections (course_id, section_title, audio_file_path, section_number)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [parsedCourseId, sectionTitle, audioPathForDb, sectionNumber]
        );
        const listeningSectionId = insertSectionRes.rows[0].id;
        console.log(`✅ Inserted Listening Section with ID: ${listeningSectionId} for Course ID: ${parsedCourseId}`);

        // 4. Parse CSV from buffer and insert questions into listening_questions table
        const csvResults = [];
        await new Promise((resolve, reject) => {
            if (!csvFile.buffer || csvFile.buffer.length === 0) {
                reject(new Error('CSV file buffer is empty or undefined'));
                return;
            }
            
            Readable.from(csvFile.buffer)
                .pipe(csv())
                .on('data', (row) => {
                    csvResults.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (csvResults.length === 0) {
            await client.query('ROLLBACK');
            if (audioFilePathOnDisk && fs.existsSync(audioFilePathOnDisk)) {
                fs.unlink(audioFilePathOnDisk, (err) => { if (err) console.error("Error deleting audio file after CSV empty:", err); });
            }
            return res.status(400).json({ message: 'No valid questions found in the CSV after parsing for the listening section.' });
        }

        for (const row of csvResults) {
            const questionText = row.question_text?.trim();
            const optionA = row.option_a?.trim();
            const optionB = row.option_b?.trim();
            const optionC = row.option_c?.trim();
            const optionD = row.option_d?.trim();
            const correctOption = row.correct_option?.trim().toUpperCase();
            const imagePath = row.image_path?.trim() || null;

            if (!questionText || !optionA || !optionB || !correctOption) {
                console.warn('⚠️ Skipping invalid or incomplete Listening question in CSV:', row);
                continue;
            }

            const providedOptions = [];
            if (optionA) providedOptions.push('A');
            if (optionB) providedOptions.push('B');
            if (optionC) providedOptions.push('C');
            if (optionD) providedOptions.push('D');

            if (!providedOptions.includes(correctOption)) {
                console.warn(`⚠️ Skipping Listening question because correct option (${correctOption}) is not one of the provided options (${providedOptions.join(', ')}):`, row);
                continue;
            }

            console.log(`📤 Inserting Listening question for Section ID ${listeningSectionId}: "${questionText}"`);

            await client.query(
                `INSERT INTO listening_questions (listening_section_id, question_text, option_a, option_b, option_c, option_d, correct_option, image_path)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [listeningSectionId, questionText, optionA, optionB, optionC || null, optionD || null, correctOption, imagePath || null]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Listening section (audio and questions) uploaded and saved successfully!', sectionId: listeningSectionId });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Server error during Listening Section upload:', err.message, err.stack);
        if (audioFilePathOnDisk && fs.existsSync(audioFilePathOnDisk)) {
            fs.unlink(audioFilePathOnDisk, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting manually saved audio file after DB error:", unlinkErr);
            });
        }
        res.status(500).json({ message: 'Failed to upload listening section.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};


// ==================== NEW: Update Individual Question Timer ====================
exports.updateQuestionTimer = async (req, res) => {
    const { questionId } = req.params;
    const { timer_duration_seconds } = req.body;

    console.log(`⏱️ Received request to update timer for question ID: ${questionId}`);
    console.log(`New timer duration: ${timer_duration_seconds}`);

    const parsedQuestionId = parseInt(questionId);
    if (isNaN(parsedQuestionId)) {
        return res.status(400).json({ message: 'Invalid question ID provided.' });
    }

    const parsedTimerDuration = parseInt(timer_duration_seconds);
    if (isNaN(parsedTimerDuration) || parsedTimerDuration < 0) {
        return res.status(400).json({ message: 'Invalid timer duration provided. Must be a non-negative integer.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const updateQuery = `
            UPDATE speaking_questions
            SET timer_duration_seconds = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id;
        `;
        const result = await client.query(updateQuery, [parsedTimerDuration, parsedQuestionId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Question not found or not a speaking question.' });
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully updated timer for question ID: ${parsedQuestionId}`);
        res.status(200).json({ message: 'Question timer updated successfully.' });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Database error updating question timer:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to update question timer.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== SUBMIT SPEAKING TEST (Already provided, keeping for completeness) ====================
exports.submitSpeakingTest = async (req, res) => {
    console.log('--- Inside submitSpeakingTest Controller ---');

    const { courseId, autoSubmitted } = req.body;
    const userId = req.user.id;

    console.log('Request files structure:', req.files);
    console.log('Request files keys:', Object.keys(req.files));
    
    // Check if files exist and are not empty
    if (!req.files || Object.keys(req.files).length === 0) {
        console.log('No files found in request');
        return res.status(400).json({ message: 'No audio files uploaded. Please ensure you have recorded audio responses.' });
    }

    // Check for required fields
    if (!courseId || !userId) {
        console.log('Missing required fields:', { courseId, userId });
        return res.status(400).json({ message: 'Missing required data for speaking test submission (courseId, userId).' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const courseRes = await client.query('SELECT title, type FROM courses WHERE id = $1', [courseId]);
        if (courseRes.rows.length === 0) {
            await client.query('ROLLBACK');
            // Ensure all files are unlinked on error
            if (Array.isArray(req.files)) { // Multer().array()
                req.files.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            } else if (req.files.audioFiles) { // Multer().fields() with named field 'audioFiles'
                req.files.audioFiles.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            }
            return res.status(404).json({ message: 'Course not found.' });
        }
        const { title: courseName, type: courseType } = courseRes.rows[0];

        if (courseType !== 'Speaking') {
            await client.query('ROLLBACK');
            // Ensure all files are unlinked on error
            if (Array.isArray(req.files)) { // Multer().array()
                req.files.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            } else if (req.files.audioFiles) { // Multer().fields() with named field 'audioFiles'
                req.files.audioFiles.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            }
            return res.status(400).json({ message: `Course ${courseName} is not a Speaking test.` });
        }

        const twoSecondsAgo = new Date(Date.now() - 2000);
        const duplicateCheck = await client.query(
            `SELECT id FROM test_results
             WHERE user_id = $1
             AND course_id = $2
             AND taken_at >= $3`,
            [userId, courseId, twoSecondsAgo]
        );

        if (duplicateCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            // No need to unlink files on duplicate, as the original submission would have handled them
            console.warn('⚠️ Duplicate test submission detected for user:', userId, 'course:', courseId);
            return res.status(200).json({ message: 'Test result already processed or recently submitted.' });
        }

        const userAnswers = {};
        let totalQuestionsSubmitted = 0;

        // ✅ FIX: Correctly access the array of files from req.files
        const audioFiles = Array.isArray(req.files) ? req.files : req.files.audioFiles;
        // Further ensure audioFiles is an array or handle a single file case
        const normalizedAudioFiles = Array.isArray(audioFiles) ? audioFiles : (audioFiles ? [audioFiles] : []);

        for (const file of normalizedAudioFiles) {
            if (!file || file.size === 0) {
                console.warn('Skipping empty file');
                continue;
            }

            // Attempt to determine question id from original filename (q<id>.webm)
            const filenameMatch = (file.originalname || '').match(/^q(\d+)\.webm$/);
            if (!filenameMatch || !filenameMatch[1]) {
                console.warn(`Could not extract question ID from filename: ${file.originalname}`);
                continue;
            }
            const questionId = filenameMatch[1];

            try {
                let audioFilePath = null;

                // If multer was configured with memoryStorage, file.buffer will exist
                if (file.buffer && file.buffer.length > 0) {
                    const filename = `${Date.now()}-${file.originalname}`;
                    audioFilePath = await saveFileLocally(file.buffer, filename, file.mimetype, 'audio_recording');
                    console.log(`Saved uploaded buffer to local path: ${audioFilePath}`);
                } else if (file.path) {
                    // Multer diskStorage: file.path contains absolute path on server
                    // Convert to a relative path the fileProxy expects (starting with /Uploads/...)
                    let rel = path.relative(path.join(__dirname, '..'), file.path).replace(/\\/g, '/').replace(/\\/g, '/');
                    if (!rel.startsWith('/')) rel = '/' + rel;
                    audioFilePath = rel;
                    console.log(`Using existing disk-stored file path for question ${questionId}: ${audioFilePath}`);
                } else {
                    console.warn(`No buffer or path available for uploaded file ${file.originalname}. Skipping.`);
                    continue;
                }

                userAnswers[questionId] = audioFilePath; // Store the local path or relative path
                totalQuestionsSubmitted++;
                console.log(`Recorded audio for question ${questionId}: ${audioFilePath}`);
            } catch (uploadError) {
                console.error(`Failed to process audio file for question ${questionId}:`, uploadError);
                // Continue with other files, but mark this as failed
            }
        }

        if (totalQuestionsSubmitted === 0) {
            await client.query('ROLLBACK');
            // Unlink files here if no valid files were processed
            if (Array.isArray(req.files)) {
                req.files.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            } else if (req.files.audioFiles) {
                req.files.audioFiles.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
            }
            return res.status(400).json({ message: 'No valid audio files with identifiable question IDs were submitted. Please ensure you have recorded audio responses.' });
        }

        const actualTimeTaken = req.body.timeTaken || 0;

        // Get total number of questions for this speaking course
        const totalQuestionsResult = await client.query(
            `SELECT COUNT(*) as total_questions FROM speaking_questions WHERE course_id = $1`,
            [courseId]
        );
        const totalQuestions = parseInt(totalQuestionsResult.rows[0].total_questions);
 
        await client.query(
            `INSERT INTO test_results (user_id, course_id, score, total_questions, time_taken, user_answers, is_speaking_test, course_type)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
            [userId, courseId, 0, totalQuestionsSubmitted, actualTimeTaken, userAnswers, courseType]
        );

        await client.query('COMMIT');
        console.log('Speaking test submitted successfully');
        res.status(200).json({ 
            message: 'Speaking test submitted successfully for review.', 
            courseName, 
            courseType, 
            score: 0, 
            totalQuestions: totalQuestionsSubmitted 
        });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to submit speaking test:', err.message, err.stack);
        // Ensure all files are unlinked on error
        if (Array.isArray(req.files)) {
            req.files.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
        } else if (req.files.audioFiles) {
            req.files.audioFiles.forEach(file => fs.unlink(file.path, (err) => { if (err) console.error("Error deleting file:", err); }));
        }
        res.status(500).json({ error: 'Failed to submit speaking test', details: err.message, stack: err.stack });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== GET MCQ Tests for Course (Used by SetTimeCourse) ====================
exports.getMCQTestsForCourse = async (req, res) => {
    const { courseId } = req.params;
    console.log('🔍 Fetching questions for course ID (via getMCQTestsForCourse):', courseId);

    let client;
    try {
        client = await pool.connect();

        const courseTypeResult = await client.query('SELECT type FROM courses WHERE id = $1', [courseId]);
        if (courseTypeResult.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        const courseType = courseTypeResult.rows[0].type;

        let query;
        let questions;

        if (courseType === 'Reading') {
            query = `
                SELECT
                    tq.id,
                    tq.question,
                    tq.option_a,
                    tq.option_b,
                    tq.option_c,
                    tq.option_d,
                    tq.correct_option,
                    tq.question_type,
                    tq.correct_answers_json,
                    rp.id AS passage_id,
                    rp.title AS passage_title,
                    rp.content AS passage_content
                FROM test_questions tq
                JOIN reading_passages rp ON tq.passage_id = rp.id
                WHERE tq.course_id = $1 AND tq.question_type IN ('reading_mcq', 'fill_in_blanks', 'true_false')
                ORDER BY rp.id, tq.id ASC;
            `;
            const result = await client.query(query, [courseId]);
            if (result.rows.length > 0) {
                const passage = {
                    id: result.rows[0].passage_id,
                    title: result.rows[0].passage_title,
                    content: result.rows[0].passage_content
                };
                questions = result.rows.map(row => ({
                    id: row.id,
                    question: row.question,
                    option_a: row.option_a,
                    option_b: row.option_b,
                    option_c: row.option_c,
                    option_d: row.option_d,
                    correct_option: row.correct_option,
                    question_type: row.question_type,
                    correct_answers_json: row.correct_answers_json
                }));
                res.status(200).json({ passage, questions });
            } else {
                return res.status(404).json({ message: 'No reading questions found for this course.' });
            }

        } else if (courseType === 'Listening') {
            query = `SELECT id, question_text AS question, audio_file_path, option_a, option_b, option_c, option_d, correct_option, image_path, 'listening' as question_type
                     FROM listening_questions WHERE course_id = $1 ORDER BY id ASC`;
            questions = (await client.query(query, [courseId])).rows;
            const normalizedListeningQuestions = questions.map(q => ({
                ...q,
                audio_file_path: q.audio_file_path ? q.audio_file_path.replace(/\\/g, '/') : q.audio_file_path,
                image_path: q.image_path ? q.image_path.replace(/\\/g, '/') : q.image_path
            }));
            res.status(200).json({ questions: normalizedListeningQuestions });
        } else {
            query = `SELECT id, question, option_a, option_b, option_c, option_d, correct_option, 'mcq' as question_type
                     FROM test_questions WHERE course_id = $1 AND question_type = 'mcq' ORDER BY id ASC`;
            questions = (await client.query(query, [courseId])).rows;
            res.status(200).json({ questions });
        }

    } catch (err) {
        console.error('❌ Failed to fetch test questions:', err.message, err.stack);
        res.status(500).json({ error: '❌ Failed to fetch test questions', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== GET Course Info (for StartTest.js) ====================
exports.getCourseInfo = async (req, res) => {
    const { courseId } = req.params;

    try {
        const result = await pool.query('SELECT id, title, subject, description, type, test_duration FROM courses WHERE id = $1', [courseId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        res.status(200).json({ course: result.rows[0] });
    } catch (err) {
        console.error('❌ Failed to fetch course info:', err.message, err.stack);
        res.status(500).json({ error: '❌ Failed to fetch course info' });
    }
};

// ==================== GET Course Details with ALL Questions (for AdminDashboard 'View Details' and StartTest) ====================
exports.getCourseDetailsWithQuestions = async (req, res) => {
    const { courseId } = req.params;
    console.log('🔍 Fetching course details and ALL questions for course ID:', courseId);

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Fetch course details
        const courseResult = await client.query(
            `SELECT id, title, subject, description, type, test_duration
             FROM courses
             WHERE id = $1`,
            [courseId]
        );

        if (courseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Course not found.' });
        }
        const courseDetails = courseResult.rows[0];

        let allQuestions = [];
        let passagesWithQuestions = [];
        let listeningSectionsData = [];
        let speakingQuestions = [];

        if (courseDetails.type === 'Reading') {
            const readingQuestionsResult = await client.query(
                `SELECT
                    tq.id,
                    tq.question,
                    tq.option_a,
                    tq.option_b,
                    tq.option_c,
                    tq.option_d,
                    tq.option_e,
                    tq.option_f,
                    tq.option_g,
                    tq.option_h,
                    tq.option_i,
                    tq.option_j,
                    tq.correct_option,
                    tq.question_type,
                    tq.correct_answers_json,
                    rp.id AS passage_id,
                    rp.title AS passage_title,
                    rp.content AS passage_content
                FROM test_questions tq
                LEFT JOIN reading_passages rp ON tq.passage_id = rp.id
                WHERE tq.course_id = $1 AND tq.question_type IN ('reading_mcq', 'fill_in_blanks', 'true_false')
                ORDER BY rp.id, tq.id ASC`,
                [courseId]
            );

            const passagesMap = new Map();
            readingQuestionsResult.rows.forEach(row => {
                const passageKey = row.passage_id || 'standalone';
                if (!passagesMap.has(passageKey)) {
                    passagesMap.set(passageKey, {
                        passage: {
                            id: row.passage_id,
                            title: row.passage_id ? row.passage_title : 'No passage for this test',
                            content: row.passage_id ? row.passage_content : null
                        },
                        questions: []
                    });
                }
                passagesMap.get(passageKey).questions.push({
                    id: row.id,
                    question: row.question,
                    option_a: row.option_a,
                    option_b: row.option_b,
                    option_c: row.option_c,
                    option_d: row.option_d,
                    option_e: row.option_e,
                    option_f: row.option_f,
                    option_g: row.option_g,
                    option_h: row.option_h,
                    option_i: row.option_i,
                    option_j: row.option_j,
                    correct_option: row.correct_option,
                    question_type: row.question_type,
                    correct_answers_json: row.correct_answers_json
                });
            });
            passagesWithQuestions = Array.from(passagesMap.values());

        } else if (courseDetails.type === 'Listening') {
            const sectionsResult = await client.query(
                `SELECT
                    ls.id AS section_id,
                    ls.section_title,
                    ls.audio_file_path,
                    ls.section_number,
                    tq.id AS question_id,
                    tq.question_text AS question,
                    tq.option_a,
                    tq.option_b,
                    tq.option_c,
                    tq.option_d,
                    tq.correct_option,
                    tq.image_path,
                    'listening' as question_type
                FROM listening_sections ls
                JOIN listening_questions tq ON ls.id = tq.listening_section_id
                WHERE ls.course_id = $1
                ORDER BY ls.section_number ASC, tq.id ASC;`,
                [courseId]
            );

            const sectionsMap = new Map();
            sectionsResult.rows.forEach(row => {
                if (!sectionsMap.has(row.section_id)) {
                    sectionsMap.set(row.section_id, {
                        id: row.section_id,
                        section_title: row.section_title,
                        audio_file_path: row.audio_file_path ? row.audio_file_path.replace(/\\/g, '/') : row.audio_file_path,
                        section_number: row.section_number,
                        questions: []
                    });
                }
                sectionsMap.get(row.section_id).questions.push({
                    id: row.question_id,
                    question: row.question,
                    option_a: row.option_a,
                    option_b: row.option_b,
                    option_c: row.option_c,
                    option_d: row.option_d,
                    correct_option: row.correct_option,
                    image_path: row.image_path ? row.image_path.replace(/\\/g, '/') : row.image_path,
                    question_type: row.question_type
                });
            });
            listeningSectionsData = Array.from(sectionsMap.values());

        } else {
            const mcqQuestionsResult = await client.query(
                `SELECT id, question, option_a, option_b, option_c, option_d, correct_option, 'mcq' as question_type
                 FROM test_questions
                 WHERE course_id = $1 AND question_type = 'mcq'
                 ORDER BY id ASC`,
                [courseId]
            );
            allQuestions = allQuestions.concat(mcqQuestionsResult.rows);

            const descriptiveQuestionsResult = await client.query(
                `SELECT id, question, 'descriptive' as question_type
                 FROM descriptive_qna
                 WHERE course_id = $1
                 ORDER BY id ASC`,
                [courseId]
            );
            allQuestions = allQuestions.concat(descriptiveQuestionsResult.rows);

            const speakingQuestionsResult = await client.query(
                `SELECT id, question_text AS question, timer_duration_seconds AS timer, 'speaking' as question_type
                 FROM speaking_questions
                 WHERE course_id = $1
                 ORDER BY id ASC`,
                [courseId]
            );
            allQuestions = allQuestions.concat(speakingQuestionsResult.rows.map(q => ({
                id: q.id,
                question: q.question,
                timer: q.timer,
                question_type: q.question_type
            })));

            const listeningQuestionsResult = await client.query(
                `SELECT id, question_text AS question, audio_file_path, option_a, option_b, option_c, option_d, correct_option, image_path, 'listening' as question_type
                 FROM listening_questions
                 WHERE course_id = $1
                 ORDER BY id ASC`,
                [courseId]
            );
            const normalizedListeningQuestions = listeningQuestionsResult.rows.map(q => ({
                ...q,
                audio_file_path: q.audio_file_path ? q.audio_file_path.replace(/\\/g, '/') : q.audio_file_path,
                image_path: q.image_path ? q.image_path.replace(/\\/g, '/') : q.image_path
            }));
            allQuestions = allQuestions.concat(normalizedListeningQuestions);
        }

        await client.query('COMMIT');

        if (courseDetails.type === 'Reading') {
            res.status(200).json({
                course: courseDetails,
                passagesWithQuestions: passagesWithQuestions
            });
        } else if (courseDetails.type === 'Listening') {
            res.status(200).json({
                course: courseDetails,
                listeningSections: listeningSectionsData
            });
        } else if (courseDetails.type === 'Speaking') {
            // Get speaking questions specifically
            const speakingQuestionsResult = await client.query(
                `SELECT id, question_text, timer_duration_seconds
                 FROM speaking_questions
                 WHERE course_id = $1
                 ORDER BY id ASC`,
                [courseId]
            );
            
            const speakingQuestions = speakingQuestionsResult.rows.map(q => ({
                id: q.id,
                question: q.question_text,
                timer: q.timer_duration_seconds,
                question_type: 'speaking'
            }));

            res.status(200).json({
                course: courseDetails,
                questions: speakingQuestions,
                passage: null
            });
        } else {
            res.status(200).json({
                course: courseDetails,
                questions: allQuestions,
                passage: null
            });
        }

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to fetch course details and questions:', err.message, err.stack);
        res.status(500).json({ error: '❌ Failed to fetch course details and questions', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== SUBMIT TEST (MODIFIED FOR WRITING and LISTENING) ====================
exports.submitTest = async (req, res) => {
    const { courseId, answers, timeTaken, autoSubmitted } = req.body;
    const userId = req.user.id;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const courseRes = await client.query('SELECT title, type FROM courses WHERE id = $1', [courseId]);
        if (courseRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Course not found.' });
        }
        const { title: courseName, type: courseType } = courseRes.rows[0];

console.log('Received submission payload:', { userId, courseId, answers, timeTaken, autoSubmitted });
console.log('Answers object structure:', answers);
        const twoSecondsAgo = new Date(Date.now() - 2000);
        const duplicateCheck = await client.query(
            `SELECT id FROM test_results
             WHERE user_id = $1
             AND course_id = $2
             AND taken_at >= $3`,
            [userId, courseId, twoSecondsAgo]
        );

        if (duplicateCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            console.warn('⚠️ Duplicate test submission detected for user:', userId, 'course:', courseId);
            return res.status(200).json({ message: 'Test result already processed or recently submitted.' });
        }

        let score = 0;
        let totalQuestions = 0;
        let userAnswersToStore = answers;

        if (courseType === 'Writing') {
            score = 0;
            totalQuestions = Object.keys(answers).length;
            console.log(`📝 Writing test submission for Course ID: ${courseId}, User ID: ${userId}`);
            console.log('User Answers:', userAnswersToStore);

            const testResultInsert = await client.query(
                `INSERT INTO test_results (user_id, course_id, score, total_questions, time_taken, user_answers, is_writing_test, course_type)
                 VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
                 RETURNING id`,
                [userId, courseId, score, totalQuestions, timeTaken, userAnswersToStore, courseType]
            );
            const testResultId = testResultInsert.rows[0].id;

            for (const questionId in answers) {
                if (Object.hasOwnProperty.call(answers, questionId)) {
                    const userAnswerText = answers[questionId];
                    console.log(`  Inserting descriptive submission for QID: ${questionId}, Answer: "${userAnswerText.substring(0, 50)}..."`);

                    await client.query(
                        `INSERT INTO descriptive_submissions (user_id, course_id, test_result_id, question_id, user_answer)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [userId, courseId, testResultId, parseInt(questionId), userAnswerText]
                    );
                }
            }

            await client.query('COMMIT');
            return res.json({ message: 'Writing test submitted for review.', courseName, courseType, score, totalQuestions }); // ✅ ADDED score, totalQuestions

        } else if (courseType === 'Listening') {
            // Corrected query to join listening_sections and listening_questions
            const listeningQuestionsResult = await client.query(
                `SELECT lq.id, lq.question_text, lq.correct_option
                 FROM listening_questions lq
                 JOIN listening_sections ls ON lq.listening_section_id = ls.id
                 WHERE ls.course_id = $1`,
                [courseId]
            );
            const listeningQuestions = listeningQuestionsResult.rows;
            console.log('Correct options for listening questions:', listeningQuestions.map(q => ({ id: q.id, correct_option: q.correct_option })));
            totalQuestions = listeningQuestions.length;

            // Collect wrong answers for detailed feedback
            const wrongAnswers = [];

            listeningQuestions.forEach((q) => {
                console.log(`Checking question ID: ${q.id}, User Answer: ${answers[q.id]}, Correct Option: ${q.correct_option}`);
                const userAns = answers[q.id];
                if (userAns && userAns.toUpperCase() === q.correct_option?.toUpperCase()) {
                    score++;
                } else {
                    wrongAnswers.push({
                        questionId: q.id,
                        questionText: q.question_text,
                        userAnswer: userAns,
                        correctAnswer: q.correct_option
                    });
                }
            });

            console.log(`📊 Listening test submission for Course ID: ${courseId}, User ID: ${userId}, Score: ${score}/${totalQuestions}`);

            await client.query(
                `INSERT INTO test_results (user_id, course_id, score, total_questions, time_taken, user_answers, is_writing_test, is_speaking_test, course_type)
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, $7)`,
                [userId, courseId, score, totalQuestions, timeTaken, userAnswersToStore, courseType]
            );
            await client.query('COMMIT');
            return res.json({ score, courseName, totalQuestions, courseType, wrongAnswers }); // ✅ CHANGED total to totalQuestions

        } else if (courseType === 'Reading') {
            const readingQuestionsResult = await client.query(
                `SELECT id, question, correct_option, question_type, correct_answers_json FROM test_questions
                 WHERE course_id = $1 AND question_type IN ('reading_mcq', 'fill_in_blanks', 'true_false')`,
                [courseId]
            );
            const readingQuestions = readingQuestionsResult.rows;
            totalQuestions = readingQuestions.length;

            console.log(`Reading test scoring: Found ${totalQuestions} questions for course ${courseId}`);

            readingQuestions.forEach((q) => {
                const userAns = answers[q.id];
                let isCorrect = false;

                if (q.question_type === 'reading_mcq') {
                    if (userAns && userAns.toUpperCase() === q.correct_option?.toUpperCase()) {
                        isCorrect = true;
                    }
                    console.log(`Question ${q.id} (MCQ): User answer '${userAns}', Correct '${q.correct_option}', Correct: ${isCorrect}`);
                } else if (q.question_type === 'true_false') {
                    if (userAns && userAns.toUpperCase() === q.correct_option?.toUpperCase()) {
                        isCorrect = true;
                    }
                    console.log(`Question ${q.id} (True/False): User answer '${userAns}', Correct '${q.correct_option}', Correct: ${isCorrect}`);
                } else if (q.question_type === 'fill_in_blanks') {
                    let correctBlanksArray = [];
                    try {
                        correctBlanksArray = Array.isArray(q.correct_answers_json)
                            ? q.correct_answers_json
                            : JSON.parse(q.correct_answers_json);
                    } catch (parseErr) {
                        console.error(`Error parsing correct_answers_json for question ${q.id} during grading:`, parseErr, 'Raw:', q.correct_answers_json);
                        correctBlanksArray = [];
                    }

                    if (Array.isArray(correctBlanksArray) && userAns) {
                        let allBlanksCorrect = true;

                        // Handle both object (from frontend) and array formats
                        let userAnswersArray = [];
                        if (Array.isArray(userAns)) {
                            userAnswersArray = userAns;
                        } else if (typeof userAns === 'object' && userAns !== null) {
                            // Convert object with numeric keys to array
                            const maxIndex = Math.max(...Object.keys(userAns).map(Number));
                            for (let i = 0; i <= maxIndex; i++) {
                                userAnswersArray[i] = userAns[i] || '';
                            }
                        }

                        console.log(`Question ${q.id} (Fill-in-blanks): User answers array length: ${userAnswersArray.length}, Correct answers array length: ${correctBlanksArray.length}`);

                        if (userAnswersArray.length !== correctBlanksArray.length) {
                            allBlanksCorrect = false;
                            console.log(`Question ${q.id}: Array length mismatch - User: ${userAnswersArray.length}, Correct: ${correctBlanksArray.length}`);
                        } else {
                            for (let i = 0; i < correctBlanksArray.length; i++) {
                                const correctAns = correctBlanksArray[i]?.toLowerCase().trim();
                                const userProvidedAns = userAnswersArray[i]?.toLowerCase().trim();
                                console.log(`Question ${q.id}, Blank ${i}: User '${userProvidedAns}', Correct '${correctAns}'`);
                                // Allow for minor variations in spacing and punctuation
                                if (!userProvidedAns || userProvidedAns !== correctAns) {
                                    // Check if answers are similar (e.g., ignore extra spaces or minor differences)
                                    const normalizedCorrect = correctAns.replace(/\s+/g, ' ').replace(/[.,;!?]/g, '').trim();
                                    const normalizedUser = userProvidedAns.replace(/\s+/g, ' ').replace(/[.,;!?]/g, '').trim();
                                    if (normalizedUser !== normalizedCorrect) {
                                        allBlanksCorrect = false;
                                        console.log(`Question ${q.id}, Blank ${i}: Mismatch detected - Normalized User: '${normalizedUser}', Normalized Correct: '${normalizedCorrect}'`);
                                        break;
                                    }
                                }
                            }
                        }
                        isCorrect = allBlanksCorrect;
                        console.log(`Question ${q.id} (Fill-in-blanks): All blanks correct: ${isCorrect}`);
                    } else {
                        console.log(`Question ${q.id} (Fill-in-blanks): No valid answers provided or parsing failed`);
                    }
                }

                if (isCorrect) {
                    score++;
                    console.log(`Question ${q.id}: Correct, Score now: ${score}`);
                } else {
                    console.log(`Question ${q.id}: Incorrect, Score remains: ${score}`);
                }
            });

            console.log(`📊 Reading test submission for Course ID: ${courseId}, User ID: ${userId}, Score: ${score}/${totalQuestions}`);

            // Collect wrong answers for detailed feedback
            const wrongAnswers = [];
            readingQuestions.forEach((q) => {
                const userAns = answers[q.id];
                let isCorrect = false;
                let correctAnswer = '';

                if (q.question_type === 'reading_mcq') {
                    correctAnswer = q.correct_option;
                    if (userAns && userAns.toUpperCase() === q.correct_option?.toUpperCase()) {
                        isCorrect = true;
                    }
                } else if (q.question_type === 'true_false') {
                    correctAnswer = q.correct_option;
                    // Normalize user answer by removing spaces and converting to uppercase
                    const normalizedUserAns = userAns?.replace(/\s+/g, '').toUpperCase();
                    // Normalize correct answer by removing spaces and converting to uppercase
                    const normalizedCorrect = q.correct_option?.replace(/\s+/g, '').toUpperCase();
                    if (userAns && normalizedUserAns === normalizedCorrect) {
                        isCorrect = true;
                    }
                } else if (q.question_type === 'fill_in_blanks') {
                    let correctBlanksArray = [];
                    try {
                        correctBlanksArray = Array.isArray(q.correct_answers_json)
                            ? q.correct_answers_json
                            : JSON.parse(q.correct_answers_json);
                    } catch (parseErr) {
                        console.error(`Error parsing correct_answers_json for question ${q.id} during grading:`, parseErr, 'Raw:', q.correct_answers_json);
                        correctBlanksArray = [];
                    }

                    if (Array.isArray(correctBlanksArray) && userAns) {
                        let allBlanksCorrect = true;

                        let userAnswersArray = [];
                        if (Array.isArray(userAns)) {
                            userAnswersArray = userAns;
                        } else if (typeof userAns === 'object' && userAns !== null) {
                            const maxIndex = Math.max(...Object.keys(userAns).map(Number));
                            for (let i = 0; i <= maxIndex; i++) {
                                userAnswersArray[i] = userAns[i] || '';
                            }
                        }

                        if (userAnswersArray.length !== correctBlanksArray.length) {
                            allBlanksCorrect = false;
                        } else {
                            for (let i = 0; i < correctBlanksArray.length; i++) {
                                const correctAns = correctBlanksArray[i]?.toLowerCase().trim();
                                const userProvidedAns = userAnswersArray[i]?.toLowerCase().trim();
                                if (!userProvidedAns || userProvidedAns !== correctAns) {
                                    const normalizedCorrect = correctAns.replace(/\s+/g, ' ').replace(/[.,;!?]/g, '').trim();
                                    const normalizedUser = userProvidedAns.replace(/\s+/g, ' ').replace(/[.,;!?]/g, '').trim();
                                    if (normalizedUser !== normalizedCorrect) {
                                        allBlanksCorrect = false;
                                        break;
                                    }
                                }
                            }
                        }
                        isCorrect = allBlanksCorrect;
                        correctAnswer = correctBlanksArray.join(', ');
                    }
                }

                if (!isCorrect) {
                    // Normalize correct answer for display (convert "NOTGIVEN" back to "NOT GIVEN" for better readability)
                    let displayCorrectAnswer = correctAnswer;
                    if (correctAnswer === 'NOT GIVEN') {
                        displayCorrectAnswer = 'NOT GIVEN';
                    }
                    wrongAnswers.push({
                        questionId: q.id,
                        questionText: q.question,
                        userAnswer: userAns,
                        correctAnswer: displayCorrectAnswer
                    });
                }
            });

            await client.query(
                `INSERT INTO test_results (user_id, course_id, score, total_questions, time_taken, user_answers, is_writing_test, is_speaking_test, course_type)
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, $7)`,
                [userId, courseId, score, totalQuestions, timeTaken, userAnswersToStore, courseType]
            );
            await client.query('COMMIT');
            return res.json({ score, courseName, totalQuestions, courseType, wrongAnswers }); // ✅ CHANGED total to totalQuestions

        } else {
            const result = await client.query('SELECT id, correct_option FROM test_questions WHERE course_id = $1 AND question_type = \'mcq\'', [courseId]);
            const mcqQuestions = result.rows;
            totalQuestions = mcqQuestions.length;

            mcqQuestions.forEach((q) => {
                const userAns = answers[q.id];
                if (q.correct_option && String(q.correct_option).includes(',')) {
                    const correctOptionsArray = String(q.correct_option).split(',').map(opt => opt.trim().toUpperCase());
                    if (
                        Array.isArray(userAns) &&
                        userAns.length === correctOptionsArray.length &&
                        userAns.every((ans) => correctOptionsArray.includes(ans.toUpperCase()))
                    ) {
                        score++;
                    }
                } else {
                    if (userAns?.toUpperCase() === q.correct_option?.toUpperCase()) {
                        score++;
                    }
                }
            });

            console.log(`📊 General MCQ test submission for Course ID: ${courseId}, User ID: ${userId}, Score: ${score}/${totalQuestions}`);

            await client.query('COMMIT');
            return res.json({ score, courseName, totalQuestions, courseType }); // ✅ CHANGED total to totalQuestions
        }

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to submit test:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to submit test', details: err.message, stack: err.stack });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== GET Test Results (for User Dashboard) ====================
exports.getTestResults = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            `WITH speaking_counts AS (
                SELECT course_id, COUNT(*) as question_count 
                FROM speaking_questions 
                GROUP BY course_id
            )
            SELECT 
                r.id,
                r.user_id,
                r.course_id,
                r.score,
                r.time_taken,
                r.taken_at,
                r.user_answers,
                r.is_speaking_test,
                r.is_writing_test,
                r.course_type,
                c.title as course_name,
                c.type as course_type,
                COALESCE(
                    CASE 
                        WHEN r.is_speaking_test = TRUE THEN sc.question_count
                        ELSE r.total_questions 
                    END,
                    0
                ) as total_questions
            FROM test_results r
            JOIN courses c ON r.course_id = c.id
            LEFT JOIN speaking_counts sc ON r.course_id = sc.course_id
            WHERE r.user_id = $1
            ORDER BY r.taken_at DESC`,
            [userId]
        );
        res.json({ results: result.rows });
    } catch (err) {
        console.error('❌ Failed to fetch test results:', err.message, err.stack);
        res.status(500).json({ error: '❌ Failed to fetch test results' });
    }
};

// ==================== GET Test Results (for Admin Dashboard) ====================
exports.getTestResultsForAdmin = async (req, res) => {
    const { name, id, course_type } = req.query;

    try {
        let query = `
            WITH speaking_counts AS (
                SELECT course_id, COUNT(*) as question_count 
                FROM speaking_questions 
                GROUP BY course_id
            )
            SELECT 
                r.id,
                r.user_id,
                u.username as user_name,
                r.course_id,
                r.score,
                r.time_taken,
                r.taken_at,
                r.user_answers,
                r.is_speaking_test,
                r.is_writing_test,
                r.course_type,
                c.title as course_name,
                c.type as course_type_from_courses,
                COALESCE(
                    CASE 
                        WHEN r.is_speaking_test = TRUE THEN sc.question_count
                        ELSE r.total_questions 
                    END,
                    0
                ) as total_questions
            FROM test_results r
            JOIN users u ON r.user_id = u.id
            JOIN courses c ON r.course_id = c.id
            LEFT JOIN speaking_counts sc ON r.course_id = sc.course_id
        `;

        const filterConditions = [];
        const queryParams = [];

        if (name) {
            filterConditions.push(`u.username ILIKE $${queryParams.length + 1}`);
            queryParams.push(`%${name}%`);
        }
        if (id) {
            filterConditions.push(`r.user_id = $${queryParams.length + 1}`);
            queryParams.push(id);
        }
        if (course_type) {
            filterConditions.push(`c.type = $${queryParams.length + 1}`);
            queryParams.push(course_type);
        }

        if (filterConditions.length > 0) {
            query += ' WHERE ' + filterConditions.join(' AND ');
        }

        query += ' ORDER BY r.taken_at DESC';

        const result = await pool.query(query, queryParams);
        res.json({ results: result.rows });
    } catch (err) {
        console.error('❌ Failed to fetch test results for admin:', err.message, err.stack);
        res.status(500).json({ error: '❌ Failed to fetch test results for admin' });
    }
};


// ==================== Get List of Writing Tests Pending Review ====================
exports.getWritingTestsForReview = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                tr.id AS submission_id,
                u.username AS user_name,
                c.title AS course_name,
                tr.taken_at AS date_time,
                tr.time_taken AS total_time_taken_sec,
                tr.score AS current_score,
                tr.total_questions AS total_questions_submitted
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.is_writing_test = TRUE AND (tr.score IS NULL OR tr.score = 0)
            ORDER BY tr.taken_at ASC`
        );

        res.status(200).json({ reviews: result.rows });
    } catch (err) {
        console.error('❌ Failed to fetch writing tests for review:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch writing tests for review.', details: err.message });
    }
};


// ==================== Get List of Reviewed Writing Test Submissions ====================
exports.getReviewedWritingSubmissions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                tr.id AS id,
                u.username AS user_username,
                c.title AS course_title,
                tr.taken_at AS submitted_at,
                tr.score AS score,
                tr.total_questions AS total_score,
                tr.updated_at AS scored_at
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.is_writing_test = TRUE AND tr.score IS NOT NULL AND tr.score != 0
            ORDER BY tr.taken_at DESC`
        );

        res.status(200).json({ submissions: result.rows });
    }
    catch (err) {
        console.error('❌ Failed to fetch reviewed writing test submissions:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch reviewed writing test submissions.', details: err.message });
    }
};


// ==================== Get Specific Writing Test Submission Details ====================
exports.getWritingSubmissionDetails = async (req, res) => {
    const { submissionId } = req.params;

    let client;
    try {
        client = await pool.connect();

        const testResultEntry = await client.query(
            `SELECT
                tr.id AS submission_id,
                u.username AS user_name,
                c.title AS course_name,
                c.description AS course_description,
                tr.taken_at AS date_time,
                tr.time_taken AS total_time_taken_sec,
                tr.score AS current_score,
                c.id AS course_id
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.id = $1 AND tr.is_writing_test = TRUE`,
            [submissionId]
        );

        if (testResultEntry.rows.length === 0) {
            return res.status(404).json({ message: 'Writing test submission not found or not a writing test.' });
        }

        const submission = testResultEntry.rows[0];
        const courseId = submission.course_id;

        const descriptiveSubmissionsResult = await client.query(
            `SELECT
                ds.question_id,
                dq.question AS question_text,
                ds.user_answer
            FROM descriptive_submissions ds
            JOIN descriptive_qna dq ON ds.question_id = dq.id
            WHERE ds.test_result_id = $1
            ORDER BY ds.question_id ASC`,
            [submissionId]
        );

        const combinedQuestionsAndAnswers = descriptiveSubmissionsResult.rows.map(row => ({
            question_id: row.question_id,
            question_text: row.question_text,
            user_answer: row.user_answer
        }));

        res.status(200).json({
            submission: {
                submission_id: submission.submission_id,
                user_name: submission.user_name,
                course_name: submission.course_name,
                date_time: submission.date_time,
                total_time_taken_sec: submission.total_time_taken_sec,
                current_score: submission.current_score,
                questions_and_answers: combinedQuestionsAndAnswers
            }
        });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to fetch writing test submission details:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch writing test submission details.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Admin debug: return raw user_answers for a submission (useful for migration/debug)
exports.getSubmissionRaw = async (req, res) => {
    const { submissionId } = req.params;
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, user_id, course_id, user_answers, is_speaking_test FROM test_results WHERE id = $1`,
            [submissionId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Submission not found' });
        const row = result.rows[0];
        res.status(200).json({ submission: row });
    } catch (err) {
        console.error('Error fetching raw submission:', err.message);
        res.status(500).json({ error: 'Failed to fetch raw submission', details: err.message });
    } finally {
        if (client) client.release();
    }
};

// List files in Uploads/SpeakingUpload
exports.getSpeakingFilesList = async (req, res) => {
    try {
        const dir = path.join(__dirname, '..', 'Uploads', 'SpeakingUpload');
        if (!fs.existsSync(dir)) return res.status(200).json({ files: [] });
        const files = await fs.promises.readdir(dir);
        const result = [];
        for (const f of files) {
            const full = path.join(dir, f);
            try {
                const stat = await fs.promises.stat(full);
                if (stat.isFile()) result.push({ name: f, size: stat.size, mtime: stat.mtime });
            } catch (e) {
                // ignore
            }
        }
        res.status(200).json({ files: result });
    } catch (err) {
        console.error('Error listing speaking files:', err.message);
        res.status(500).json({ error: 'Failed to list speaking files' });
    }
};

// Report DB submissions whose user_answers do not reference /Uploads/SpeakingUpload
exports.getSpeakingFilesReport = async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(`SELECT id, user_id, user_answers FROM test_results WHERE is_speaking_test = TRUE AND user_answers IS NOT NULL`);
        const problems = [];
        for (const row of result.rows) {
            let ua = row.user_answers;
            if (!ua) continue;
            if (typeof ua === 'string') {
                try { ua = JSON.parse(ua); } catch (e) { ua = null; }
            }
            if (!ua || typeof ua !== 'object') continue;
            for (const [qid, val] of Object.entries(ua)) {
                if (!val || typeof val !== 'string') continue;
                if (!val.includes('/Uploads/SpeakingUpload')) {
                    problems.push({ submission_id: row.id, user_id: row.user_id, question_id: qid, value: val });
                }
            }
        }
        res.status(200).json({ problems });
    } catch (err) {
        console.error('Error generating speaking files report:', err.message);
        res.status(500).json({ error: 'Failed to generate report' });
    } finally {
        if (client) client.release();
    }
};
// ==================== Update Writing Test Score ====================
exports.updateWritingTestScore = async (req, res) => {
    const { submissionId } = req.params;
    const { score } = req.body;

    if (score === undefined || score === null || isNaN(score) || score < 0) {
        return res.status(400).json({ message: 'Invalid score provided. Score must be a non-negative number.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE test_results
             SET score = $1, scored_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND is_writing_test = TRUE
             RETURNING id, score, user_id, course_id, scored_at`,
            [score, submissionId]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Writing test submission not found or not a writing test.' });
        }

        const updatedSubmission = updateResult.rows[0];

        const studentInfoResult = await client.query(
            `SELECT u.email, u.username, c.title AS course_title
             FROM users u
             JOIN test_results tr ON u.id = tr.user_id
             JOIN courses c ON tr.course_id = c.id
             WHERE tr.id = $1`,
            [submissionId]
        );

        let emailSent = false;
        if (studentInfoResult.rows.length > 0) {
            const { email: studentEmail, username: studentUsername, course_title: courseTitle } = studentInfoResult.rows[0];

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: studentEmail,
                subject: `Your Writing Test for ${courseTitle} Has Been Reviewed!`,
                html: `
                    <p>Hello ${studentUsername},</p>
                    <p>Your writing test for <strong>${courseTitle}</strong> has been reviewed.</p>
                    <p>Please log in to your account to view your updated score and any feedback.</p>
                    <p>Thank you!</p>
                    <p>The PracticeIELTS Team</p>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent to ${studentEmail} for submission ${submissionId}`);
                emailSent = true;
            } catch (emailErr) {
                console.error('❌ Error sending email notification:', emailErr.message, emailErr.stack);
            }
        } else {
            console.warn(`⚠️ Could not find student info for submission ${submissionId} to send email.`);
        }

        await client.query('COMMIT');
        const message = emailSent
            ? 'Score updated successfully and email notification sent.'
            : 'Score updated successfully. Email notification could not be sent.';
        res.status(200).json({ message, updatedSubmission: updatedSubmission });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to update writing test score:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to update writing test score.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== NEW: Get List of Speaking Tests Pending Review ====================
exports.getSpeakingTestsForReview = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                tr.id AS submission_id,
                u.username AS user_name,
                c.title AS course_name,
                tr.taken_at AS date_time,
                tr.time_taken AS total_time_taken_sec,
                tr.score AS current_score,
                tr.total_questions AS total_questions_submitted
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.is_speaking_test = TRUE AND (tr.score IS NULL OR tr.score = 0)
            ORDER BY tr.taken_at ASC`
        );

        res.status(200).json({ reviews: result.rows });
    } catch (err) {
        console.error('❌ Failed to fetch speaking tests for review:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch speaking tests for review.', details: err.message });
    }
};


// ==================== NEW: Get List of Reviewed Speaking Test Submissions ====================
exports.getReviewedSpeakingSubmissions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                tr.id AS id,
                u.username AS user_username,
                c.title AS course_title,
                tr.taken_at AS submitted_at,
                tr.score AS score,
                tr.total_questions AS total_score,
                tr.updated_at AS scored_at
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.is_speaking_test = TRUE AND tr.score IS NOT NULL AND tr.score != 0
            ORDER BY tr.taken_at DESC`
        );

        res.status(200).json({ submissions: result.rows });
    } catch (err) {
        console.error('❌ Failed to fetch reviewed speaking submissions:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch reviewed speaking submissions.', details: err.message });
    }
};


// ==================== NEW: Get Specific Speaking Test Submission Details ====================
exports.getSpeakingSubmissionDetails = async (req, res) => {
    const { submissionId } = req.params;

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(
            `SELECT
                tr.id AS submission_id,
                u.username AS user_name,
                c.title AS course_name,
                c.description AS course_description,
                tr.taken_at AS date_time,
                tr.time_taken AS total_time_taken_sec,
                tr.score AS current_score,
                tr.user_answers AS user_answers_json,
                c.id AS course_id
            FROM test_results tr
            JOIN users u ON tr.user_id = u.id
            JOIN courses c ON tr.course_id = c.id
            WHERE tr.id = $1 AND tr.is_speaking_test = TRUE`,
            [submissionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Speaking test submission not found or not a speaking test.' });
        }

        const submission = result.rows[0];
        const courseId = submission.course_id;
        const userAudioAnswers = submission.user_answers_json || {};

        const questionsResult = await client.query(
            `SELECT id, question_text FROM speaking_questions WHERE course_id = $1 ORDER BY id ASC`,
            [courseId]
        );
        const originalSpeakingQuestions = questionsResult.rows;

        const combinedQuestionsAndAnswers = originalSpeakingQuestions.map(q => {
            const audioValue = userAudioAnswers[q.id];
            let finalAudioUrl = null;
            if (audioValue) {
                // audioValue can be:
                // - local relative path starting with '/Uploads/...' -> proxy via /api/files
                // - a Google Drive file ID (alphanumeric) -> proxy via /api/external?url=<id>
                // - a full URL (http/https) -> use as-is
                if (typeof audioValue === 'string') {
                    if (audioValue.startsWith('/')) {
                        finalAudioUrl = `/api/files${audioValue}`; // local file
                    } else if (/^[a-zA-Z0-9_-]+$/.test(audioValue)) {
                        // likely a Google Drive file ID
                        finalAudioUrl = `/api/external?url=${encodeURIComponent(audioValue)}`;
                    } else if (/^https?:\/\//i.test(audioValue)) {
                        finalAudioUrl = audioValue; // external direct link
                    } else {
                        // Fallback: treat as relative path
                        finalAudioUrl = `/api/files/${audioValue.replace(/^\/+/, '')}`;
                    }
                }
            }
            return {
                question_id: q.id,
                question_text: q.question_text,
                audio_url: finalAudioUrl
            };
        });

        res.status(200).json({
            submission: {
                submission_id: submission.submission_id,
                user_name: submission.user_name,
                course_name: submission.course_name,
                date_time: submission.date_time,
                total_time_taken_sec: submission.total_time_taken_sec,
                current_score: submission.current_score,
                questions_and_answers: combinedQuestionsAndAnswers
            }
        });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to fetch speaking test submission details:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch speaking test submission details.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== NEW: Update Speaking Test Score ====================
exports.updateSpeakingTestScore = async (req, res) => {
    const { submissionId } = req.params;
    const { score } = req.body;

    if (score === undefined || score === null || isNaN(score) || score < 0) {
        return res.status(400).json({ message: 'Invalid score provided. Score must be a non-negative number.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE test_results
             SET score = $1, scored_at = NOW(), updated_at = NOW()
             WHERE id = $2 AND is_speaking_test = TRUE
             RETURNING id, score, user_id, course_id, scored_at`,
            [score, submissionId]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Speaking test submission not found or not a speaking test.' });
        }

        const updatedSubmission = updateResult.rows[0];

        const studentInfoResult = await client.query(
            `SELECT u.email, u.username, c.title AS course_title
             FROM users u
             JOIN test_results tr ON u.id = tr.user_id
             JOIN courses c ON tr.course_id = c.id
             WHERE tr.id = $1`,
            [submissionId]
        );

        let emailSent = false;
        if (studentInfoResult.rows.length > 0) {
            const { email: studentEmail, username: studentUsername, course_title: courseTitle } = studentInfoResult.rows[0];

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: studentEmail,
                subject: `Your Speaking Test for ${courseTitle} Has Been Reviewed!`,
                html: `
                    <p>Hello ${studentUsername},</p>
                    <p>Your speaking test for <strong>${courseTitle}</strong> has been reviewed.</p>
                    <p>Please log in to your account to view your updated score and any feedback.</p>
                    <p>Thank you!</p>
                    <p>The PracticeIELTS Team</p>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`✅ Email sent to ${studentEmail} for submission ${submissionId}`);
                emailSent = true;
            } catch (emailErr) {
                console.error('❌ Error sending email notification:', emailErr.message, emailErr.stack);
            }
        } else {
            console.warn(`⚠️ Could not find student info for submission ${submissionId} to send email.`);
        }

        await client.query('COMMIT');
        const message = emailSent
            ? 'Score updated successfully and email notification sent.'
            : 'Score updated successfully. Email notification could not be sent.';
        res.status(200).json({ message, updatedSubmission: updatedSubmission });

    } catch (err) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('❌ Failed to update speaking test score:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to update speaking test score.', details: err.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// ==================== NEW: Welcome Endpoint ====================
exports.getWelcome = async (req, res) => {
    console.log(`Request received: ${req.method} ${req.path}`);
    res.status(200).json({ message: 'Welcome to the IELTS Practice API!' });
};
