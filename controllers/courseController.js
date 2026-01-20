const pool = require('../db'); // Ensure this path is correct for your database connection

// ==================== ADD COURSE ====================
exports.addCourse = async (req, res) => {
    const { title, subject, description, type, test_duration } = req.body; // Added test_duration
    const userId = req.user?.id;

    if (!title || !subject || !description || !type) {
        return res.status(400).json({ message: 'All fields are required including type' });
    }

    try {
        const duplicateCheck = await pool.query(
            `SELECT * FROM courses WHERE title = $1 AND subject = $2 AND created_by = $3`,
            [title, subject, userId]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                message: 'Course with the same title and subject already exists for this user.',
            });
        }

        const result = await pool.query(
            'INSERT INTO courses (title, subject, description, created_by, type, test_duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, subject, description, userId, type, test_duration] // Include test_duration
        );

        res.status(201).json({
            message: 'Course added successfully',
            course: result.rows[0],
        });
    } catch (err) {
        console.error('Error adding course:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==================== GET ALL COURSES ====================
exports.getCourses = async (req, res) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        let result;
        if (userRole === 'admin' || userRole === 'superadmin') {
            // Admins should see all courses they created, SuperAdmins see all courses
            // Assuming 'created_by' is for admins. Superadmins might need a different query if they see ALL courses regardless of creator.
            // For now, keeping original logic: admin/superadmin see courses created by them.
            result = await pool.query('SELECT * FROM courses WHERE created_by = $1', [userId]);
        } else {
            // Regular users see all available courses
            result = await pool.query('SELECT * FROM courses');
        }

        res.status(200).json({ courses: result.rows });
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==================== GET COURSE BY ID ====================
exports.getCourseById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching course by ID:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==================== SET TEST DURATION ====================
exports.setTestDuration = async (req, res) => {
    const { id } = req.params;
    const { test_duration } = req.body;

    if (test_duration === undefined || test_duration === null || isNaN(test_duration)) {
        return res.status(400).json({ message: 'Invalid test duration' });
    }

    try {
        const result = await pool.query(
            'UPDATE courses SET test_duration = $1 WHERE id = $2 RETURNING *',
            [test_duration, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.status(200).json({ message: 'Test duration updated', course: result.rows[0] });
    } catch (err) {
        console.error('Error setting test duration:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ==================== GET TEST DURATION ====================
exports.getTestDuration = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT test_duration FROM courses WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found' });
        }

        res.status(200).json({ test_duration: result.rows[0].test_duration });
    } catch (err) {
        console.error('Error fetching test duration:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// ==================== DELETE COURSE (MODIFIED FOR READING MODULE) ====================
exports.deleteCourse = async (req, res) => {
    const { id } = req.params; // Get course ID from URL parameters

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start a transaction for atomicity

        // First, check the type of course being deleted
        const courseCheck = await client.query('SELECT type FROM courses WHERE id = $1', [id]);
        if (courseCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Course not found.' });
        }
        const courseType = courseCheck.rows[0].type;

        // If it's a Reading course, delete associated reading_passages first
        if (courseType === 'Reading') {
            // Find all passage_ids linked to this course's reading_mcq questions
            const passagesToDeleteResult = await client.query(
                `SELECT DISTINCT passage_id FROM test_questions WHERE course_id = $1 AND question_type = 'reading_mcq'`,
                [id]
            );
            const passagesToDelete = passagesToDeleteResult.rows.map(row => row.passage_id);

            if (passagesToDelete.length > 0) {
                // Delete the reading passages. ON DELETE CASCADE on test_questions will handle related questions.
                await client.query(
                    `DELETE FROM reading_passages WHERE id IN (${passagesToDelete.map((_, i) => `$${i + 1}`).join(',')})`,
                    passagesToDelete
                );
                console.log(`✅ Deleted ${passagesToDelete.length} reading passages for course ID: ${id}`);
            }
        }

        // Existing deletions for other question types and test results
        // 1. Delete associated MCQ questions (including reading_mcq which are now handled by cascade from passage deletion, but this is a safe cleanup)
        // Note: If a reading_mcq question's passage was already deleted, this won't find it.
        // It's good to keep for general 'mcq' type questions that are not tied to passages.
        await client.query('DELETE FROM test_questions WHERE course_id = $1', [id]);

        // 2. Delete associated Descriptive questions and answers
        await client.query('DELETE FROM descriptive_qna WHERE course_id = $1', [id]);

        // 3. Delete associated Speaking questions
        await client.query('DELETE FROM speaking_questions WHERE course_id = $1', [id]);

        // 4. Delete associated Listening questions
        await client.query('DELETE FROM listening_questions WHERE course_id = $1', [id]);

        // 5. Delete associated test results
        await client.query('DELETE FROM test_results WHERE course_id = $1', [id]);

        // 6. Delete the course itself
        const result = await client.query('DELETE FROM courses WHERE id = $1 RETURNING *', [id]);

        await client.query('COMMIT'); // Commit the transaction

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        res.status(200).json({ message: 'Course and all associated data deleted successfully!' });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); // Rollback on error
        }
        console.error('Error deleting course:', error);
        res.status(500).json({ message: 'Server error while deleting course.', details: error.message });
    } finally {
        if (client) {
            client.release(); // Release client back to the pool
        }
    }
};
