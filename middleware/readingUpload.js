  // backend/middleware/readingUpload.js
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  // Multer Storage Configuration for Reading Tests
  const readingTestStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../Uploads/AudioUploads/CSVs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
  });

  // Create the Multer upload instance for reading test CSVs
  const uploadReadingTestCsv = multer({
    storage: readingTestStorage,
    fileFilter: (req, file, cb) => {
      // Re-enable the strict CSV type check now that field name is resolved
      if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed for Reading Tests!'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB file size limit (adjust as needed)
    }
  });

  module.exports = uploadReadingTestCsv;