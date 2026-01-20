// updatePathsToIds.js
// Run with: node updatePathsToIds.js
// Updates DB paths from folder URLs to Google Drive file IDs by matching filenames.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db');
const { google } = require('googleapis');

// Google Drive folder IDs from environment variables
const DRIVE_IMAGES_FOLDER_ID = process.env.DRIVE_IMAGES_FOLDER_ID;
const DRIVE_AUDIO_UPLOADS_FOLDER_ID = process.env.DRIVE_AUDIO_UPLOADS_FOLDER_ID;
const DRIVE_AUDIO_RECORDINGS_FOLDER_ID = process.env.DRIVE_AUDIO_RECORDINGS_FOLDER_ID;
const DRIVE_CSVS_FOLDER_ID = process.env.DRIVE_CSVS_FOLDER_ID;

// Initialize Google Drive API
const DRIVE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.DRIVE_CLIENT_ID;
const DRIVE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.DRIVE_CLIENT_SECRET;
const DRIVE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || process.env.DRIVE_REFRESH_TOKEN;

let drive;
function initializeDrive() {
  if (!drive) {
    if (!DRIVE_CLIENT_ID || !DRIVE_CLIENT_SECRET || !DRIVE_REFRESH_TOKEN) {
      throw new Error("Missing Google Drive OAuth credentials.");
    }
    const oAuth2Client = new google.auth.OAuth2(
      DRIVE_CLIENT_ID,
      DRIVE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    oAuth2Client.setCredentials({
      refresh_token: DRIVE_REFRESH_TOKEN,
    });
    drive = google.drive({ version: 'v3', auth: oAuth2Client });
  }
  return drive;
}

async function listFilesInFolder(folderId) {
  const drive = initializeDrive();
  const nameToId = {};
  let pageToken = null;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name), nextPageToken',
      pageToken: pageToken,
    });
    for (const file of response.data.files) {
      nameToId[file.name] = file.id;
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return nameToId;
}

async function updateTable(table, idColumn, fileColumn, nameToIdMap, fileType) {
  console.log(`Updating ${table}.${fileColumn}...`);
  const client = await pool.connect();
  try {
    // Update both folder URLs and filenames to file IDs
    const rows = await client.query(`SELECT ${idColumn} as id, ${fileColumn} as file FROM ${table} WHERE ${fileColumn} IS NOT NULL AND (${fileColumn} LIKE 'https://drive.google.com/drive/folders/%' OR ${fileColumn} NOT LIKE 'https://%')`);
    console.log(`Found ${rows.rows.length} rows to update.`);
    for (const r of rows.rows) {
      let baseFilename;
      if (r.file.startsWith('https://drive.google.com/drive/folders/')) {
        baseFilename = r.file.split('/').pop(); // Extract filename after last /
      } else {
        baseFilename = r.file; // It's already a filename
      }
      // Check if it's already a file ID (alphanumeric string)
      if (/^[a-zA-Z0-9_-]+$/.test(baseFilename)) {
        console.log(`Skipping ${table} id=${r.id} - already a file ID: ${baseFilename}`);
        continue;
      }
      const filename = `${fileType}s/${baseFilename}`; // Add prefix like 'audios/' or 'images/'
      const fileId = nameToIdMap[filename];
      if (fileId) {
        await client.query(`UPDATE ${table} SET ${fileColumn} = $1 WHERE ${idColumn} = $2`, [fileId, r.id]);
        console.log(`Updated ${table} id=${r.id} filename=${filename} -> id=${fileId}`);
      } else {
        console.warn(`No file ID found for filename=${filename} in ${table} id=${r.id}`);
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  console.log('Listing audio files...');
  const nameToIdAudio = await listFilesInFolder(DRIVE_AUDIO_UPLOADS_FOLDER_ID);
  console.log(`Found ${Object.keys(nameToIdAudio).length} audio files.`);

  console.log('Listing image files...');
  const nameToIdImage = await listFilesInFolder(DRIVE_IMAGES_FOLDER_ID);
  console.log(`Found ${Object.keys(nameToIdImage).length} image files.`);

  await updateTable('listening_sections', 'id', 'audio_file_path', nameToIdAudio, 'audio');
  await updateTable('listening_questions', 'id', 'image_path', nameToIdImage, 'image');

  console.log('Update complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
