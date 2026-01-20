// migrateExternalToDrive.js
// Run with: node migrateExternalToDrive.js
// Scans DB for external http(s) file URLs, uploads them to Google Drive, and updates DB to store Drive file IDs.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db');
const fs = require('fs');
const { uploadFileToGoogleDrive }
 = require('../utils/googleDriveClient');

async function fetchBuffer(url) {
  const res = await fetch(url, { timeout: 15000 });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: res.headers.get('content-type') };
}

async function migrateColumn(table, idColumn, fileColumn, fileTypeGuess = 'image') {
  console.log(`\nScanning ${table}.${fileColumn} for external URLs...`);
  const client = await pool.connect();
  try {
    // Check if column exists first
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `, [table, fileColumn]);

    if (columnCheck.rows.length === 0) {
      console.log(`Column "${fileColumn}" does not exist in table "${table}". Skipping.`);
      return;
    }

    const rows = await client.query(`SELECT ${idColumn} as id, ${fileColumn} as file FROM ${table} WHERE ${fileColumn} LIKE 'http%';`);
    console.log(`Found ${rows.rows.length} rows to check.`);
    for (const r of rows.rows) {
      const id = r.id;
      const fileUrl = r.file;
      try {
        console.log(`Processing ${table} id=${id} -> ${fileUrl}`);
        const { buffer, contentType } = await fetchBuffer(fileUrl);
        const nameFromUrl = path.basename(new URL(fileUrl).pathname) || `${fileTypeGuess}-${Date.now()}`;
        const filename = `${fileTypeGuess}s/${Date.now()}-${nameFromUrl}`;
        const driveRes = await uploadFileToGoogleDrive(buffer, filename, contentType || undefined, fileTypeGuess === 'audio' ? 'audio_upload' : 'image');
        if (driveRes && driveRes.id) {
          const updateSql = `UPDATE ${table} SET ${fileColumn} = $1 WHERE ${idColumn} = $2`;
          await client.query(updateSql, [driveRes.id, id]);
          console.log(`Updated ${table} id=${id} -> Drive ID ${driveRes.id}`);
        } else {
          console.warn(`Upload returned no id for ${fileUrl}`);
        }
      } catch (err) {
        console.error(`Failed to migrate ${table} id=${r.id} url=${r.file}:`, err.message);
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  // Accept either GOOGLE_* or DRIVE_* environment variable names (project uses DRIVE_ vars)
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Google Drive credentials not set in env (expected GOOGLE_* or DRIVE_*). Aborting.');
    process.exit(1);
  }

  // List of table/column pairs to migrate. Add more if needed.
  const targets = [
    { table: 'listening_questions', idColumn: 'id', fileColumn: 'image_path', fileType: 'image' },
    { table: 'listening_questions', idColumn: 'id', fileColumn: 'audio_file_path', fileType: 'audio' },
    { table: 'listening_sections', idColumn: 'id', fileColumn: 'audio_file_path', fileType: 'audio' },
    { table: 'test_questions', idColumn: 'id', fileColumn: 'image_path', fileType: 'image' },
    { table: 'test_questions', idColumn: 'id', fileColumn: 'audio_file_path', fileType: 'audio' }
  ];

  for (const t of targets) {
    try {
      await migrateColumn(t.table, t.idColumn, t.fileColumn, t.fileType);
    } catch (err) {
      console.error('Error migrating target', t, err.message);
    }
  }

  console.log('\nMigration run complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
