const express = require('express');
const router = express.Router();
const { URL } = require('url');

// This proxy fetches files from Google Drive only.
// All storage has been migrated from Wasabi/S3 to Google Drive.
// The proxy now only handles Google Drive URLs by extracting the file ID and streaming via Drive API.

// GET /api/external?url=<encoded-url>
// This endpoint proxies Google Drive file URLs.
// It extracts the file ID from the URL and streams the file from Google Drive.
// Non-Google Drive URLs are denied.
// Also handles direct Google Drive file IDs (for migrated data).
router.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url parameter');

  let fileId = null;

  // Check if the url starts with /api/files/ (internal file reference)
  if (url.startsWith('/api/files/')) {
    fileId = url.substring('/api/files/'.length);
    console.log('Proxy: treating as internal file ID:', fileId);
  } else if (/^[a-zA-Z0-9_-]+$/.test(url)) {
    // Treat as direct file ID
    fileId = url;
    console.log('Proxy: treating as direct Google Drive file ID:', fileId);
  } else {
    // Parse as full URL
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      console.error('Invalid URL passed to external proxy:', url, err.message);
      return res.status(400).send('Invalid url');
    }

    // Only allow Google Drive URLs
    const isDrive = /drive\.google\.com|docs\.google\.com/i.test(parsed.hostname);
    if (!isDrive) {
      console.warn('Proxy: only Google Drive URLs are allowed, blocked host:', parsed.hostname);
      return res.status(403).send('Only Google Drive URLs are allowed');
    }

    // Extract file ID from Google Drive URL
    const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) fileId = idMatch[1];
    const qIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!fileId && qIdMatch && qIdMatch[1]) fileId = qIdMatch[1];

    if (!fileId) {
      console.warn('Proxy: could not extract file ID from Google Drive URL:', url);
      return res.status(400).send('Invalid Google Drive URL');
    }
  }

  try {
    const driveClientHelpers = require('../utils/googleDriveClient');
    console.log('Proxy: streaming Google Drive file id=', fileId);
    const metadata = await driveClientHelpers.getFileMetadata(fileId);
    if (metadata && metadata.mimeType) res.setHeader('Content-Type', metadata.mimeType);
    // Add CORS headers to allow cross-origin requests from frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    const stream = await driveClientHelpers.getFileFromGoogleDrive(fileId);
    stream.pipe(res);
  } catch (driveErr) {
    console.error('Proxy: Google Drive fetch failed for id=', fileId, driveErr && driveErr.message);
    res.status(502).send('Failed to fetch file from Google Drive');
  }
});

module.exports = router;
