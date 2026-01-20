  const { google } = require('googleapis');
const { Readable } = require('stream');

// --- Environment Variables (Must be defined in your .env file) ---
// Note: We are now using the OAuth2 variables based on your configuration.
const DRIVE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.DRIVE_CLIENT_ID;
const DRIVE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.DRIVE_CLIENT_SECRET;
const DRIVE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || process.env.DRIVE_REFRESH_TOKEN;

// Google Drive folder IDs from environment variables
const DRIVE_CSVS_FOLDER_ID = process.env.DRIVE_CSVS_FOLDER_ID;
const DRIVE_IMAGES_FOLDER_ID = process.env.DRIVE_IMAGES_FOLDER_ID;
const DRIVE_AUDIO_UPLOADS_FOLDER_ID = process.env.DRIVE_AUDIO_UPLOADS_FOLDER_ID;
const DRIVE_AUDIO_RECORDINGS_FOLDER_ID = process.env.DRIVE_AUDIO_RECORDINGS_FOLDER_ID;

// Initialize Google Drive API
let drive;
function initializeDrive() {
  if (!drive) {
    if (!DRIVE_CLIENT_ID || !DRIVE_CLIENT_SECRET || !DRIVE_REFRESH_TOKEN) {
      throw new Error("Missing Google Drive OAuth credentials (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN).");
    }

    // 1. Create the OAuth2 client object
    const oAuth2Client = new google.auth.OAuth2(
      DRIVE_CLIENT_ID,
      DRIVE_CLIENT_SECRET,
      // The redirect URL is needed here, even if not used directly for this token
      // If you generated the token via OAuth Playground, use that URL.
      'https://developers.google.com/oauthplayground' 
    );
    
    // 2. Set the Refresh Token, allowing the client to automatically fetch new Access Tokens
    oAuth2Client.setCredentials({
      refresh_token: DRIVE_REFRESH_TOKEN,
    });
    
    // 3. Create the Drive service using the authenticated client
    drive = google.drive({ version: 'v3', auth: oAuth2Client });
  }
  return drive;
}

// Helper function to get folder ID based on file type
function getFolderId(fileType) {
  switch (fileType) {
    case 'csv':
      return DRIVE_CSVS_FOLDER_ID;
    case 'image':
      return DRIVE_IMAGES_FOLDER_ID;
    case 'audio_upload':
      return DRIVE_AUDIO_UPLOADS_FOLDER_ID;
    case 'audio_recording':
      return DRIVE_AUDIO_RECORDINGS_FOLDER_ID;
    default:
      // Default to CSVs or throw an error if files must be categorized
      return DRIVE_CSVS_FOLDER_ID; 
  }
}

/**
 * Uploads a file buffer to Google Drive.
 * @param {Buffer} buffer - The file content as a Buffer.
 * @param {string} filename - The name to save the file as.
 * @param {string} contentType - The MIME type of the file.
 * @param {string} fileType - The file type key ('csv', 'image', etc.) to determine the folder.
 * @returns {Promise<{id: string, url: string}>} The file ID and web view link.
 */
async function uploadFileToGoogleDrive(buffer, filename, contentType, fileType = 'csv') {
  const drive = initializeDrive();
  const folderId = getFolderId(fileType);

  if (!folderId) {
    throw new Error(`Google Drive folder ID not set for file type: ${fileType}`);
  }

  console.log(`Uploading to Google Drive: filename=${filename}, contentType=${contentType}, folderId=${folderId}`);

  const fileMetadata = {
    name: filename,
    parents: [folderId], 
  };

  const media = {
    mimeType: contentType,
    body: Readable.from(buffer), 
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id,webViewLink', 
  });

  console.log(`Upload successful, File ID: ${response.data.id}, Link: ${response.data.webViewLink}`);
  return {
    id: response.data.id,
    url: response.data.webViewLink,
  };
}

/**
 * Gets a file's content stream from Google Drive.
 * @param {string} fileId - The ID of the file to retrieve.
 * @returns {Promise<Stream>} The file content as a stream.
 */
async function getFileFromGoogleDrive(fileId) {
  const drive = initializeDrive();

  try {
    console.log(`GoogleDrive: fetching file content for id=${fileId}`);
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media', 
    }, { responseType: 'stream' }); 
    console.log(`GoogleDrive: fetched content for id=${fileId}, status=200`);
    return response.data;
  } catch (err) {
    console.error(`GoogleDrive: failed to fetch file content for id=${fileId}:`, err.message);
    throw err;
  }
}

/**
 * Gets a file's metadata from Google Drive.
 * @param {string} fileId - The ID of the file to retrieve.
 * @returns {Promise<object>} The file metadata.
 */
async function getFileMetadata(fileId) {
  const drive = initializeDrive();

  try {
    console.log(`GoogleDrive: fetching metadata for id=${fileId}`);
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,webViewLink',
    });
    console.log(`GoogleDrive: metadata fetched for id=${fileId} mimeType=${response.data.mimeType}`);
    return response.data;
  } catch (err) {
    console.error(`GoogleDrive: failed to fetch metadata for id=${fileId}:`, err.message);
    throw err;
  }
}

module.exports = {
  initializeDrive,
  uploadFileToGoogleDrive,
  getFileFromGoogleDrive,
  getFileMetadata,
  getFolderId,
};
