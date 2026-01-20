const fs = require('fs');
const path = require('path');

module.exports = async (req, res, next) => {
    const filePath = req.path; // e.g., /Uploads/AudioUploads/...

    if (!filePath || filePath === '/') {
        return res.status(400).send('File path is required');
    }

    try {
        console.log('File proxy requested path:', filePath);
        // Construct full local path
        const fullPath = path.join(__dirname, '..', filePath);
        console.log('File proxy resolved fullPath:', fullPath);

        // Quick existence check log
        const exists = fs.existsSync(fullPath);
        console.log(`File exists check for ${fullPath}:`, exists);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            console.warn('File proxy could not find file at path:', fullPath);
            return res.status(404).send(`File not found: ${fullPath}`);
        }

        // Get file stats to set content type
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return res.status(404).send('File not found');
        }

        // Set content type based on extension
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.webm': 'audio/webm',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            // Add more as needed
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Add CORS headers to allow cross-origin requests from frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Stream the file
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error fetching file locally:', error);
        res.status(500).send('Internal server error');
    }
};
