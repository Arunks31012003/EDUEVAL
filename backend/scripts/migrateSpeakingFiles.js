const fs = require('fs').promises;
const path = require('path');
// Reuse the existing DB pool configuration from backend/db.js which loads .env
const pool = require('../db');

async function findFileByName(rootDir, basename) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFileByName(full, basename);
      if (found) return found;
    } else if (entry.isFile() && entry.name === basename) {
      return full;
    }
  }
  return null;
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function main() {
  console.log('Starting migration: move speaking files into /Uploads/SpeakingUpload and update DB');
  const DRY = process.argv.includes('--dry');
  const COPY = process.argv.includes('--copy');
  if (DRY) console.log('Running in dry-run mode: no files will be moved and DB will not be updated');
  if (COPY) console.log('Running in copy mode: files will be copied instead of moved');
  const targetDir = path.join(__dirname, '..', 'Uploads', 'SpeakingUpload');
  await ensureDir(targetDir);

  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT id, user_answers FROM test_results WHERE is_speaking_test = TRUE AND user_answers IS NOT NULL`);
    console.log('Found', res.rows.length, 'speaking submissions with user_answers');
    for (const row of res.rows) {
      let userAnswers = row.user_answers;
      if (!userAnswers) continue;
      // Ensure object
      if (typeof userAnswers === 'string') {
        try { userAnswers = JSON.parse(userAnswers); } catch (e) { console.warn('Could not parse user_answers for id', row.id); continue; }
      }
      let updated = false;
      for (const qid of Object.keys(userAnswers)) {
        let val = userAnswers[qid];
        if (!val || typeof val !== 'string') continue;
        const basename = path.basename(val);
        // If already in target folder, skip
        if (val.includes('/Uploads/SpeakingUpload') || val.includes('Uploads\\SpeakingUpload')) continue;

        // First check likely raw path
        const candidate1 = path.join(__dirname, '..', val.replace(/^\/+/, ''));
        let sourcePath = null;
        try {
          // Check candidate1
          const stat = await fs.stat(candidate1).catch(() => null);
          if (stat && stat.isFile()) sourcePath = candidate1;
        } catch (e) {}

        // If not found, search Uploads directory recursively by basename
        if (!sourcePath) {
          const uploadsRoot = path.join(__dirname, '..', 'Uploads');
          const found = await findFileByName(uploadsRoot, basename).catch(() => null);
          if (found) sourcePath = found;
        }

        if (!sourcePath) {
          console.warn('Could not locate file for submission', row.id, 'question', qid, 'basename', basename);
          continue;
        }

        // Move file to targetDir (or simulate in dry-run)
        const destName = `${Date.now()}-${basename}`;
        const destPath = path.join(targetDir, destName);
        const newRel = `/Uploads/SpeakingUpload/${destName}`;
        if (DRY) {
          console.log(`[dry-run] Would ${COPY ? 'copy' : 'move'} ${sourcePath} -> ${destPath} and set DB to ${newRel}`);
        } else {
          if (COPY) {
            await fs.copyFile(sourcePath, destPath);
            console.log(`Copied ${sourcePath} -> ${destPath}`);
          } else {
            await fs.rename(sourcePath, destPath);
            console.log(`Moved ${sourcePath} -> ${destPath}`);
          }
          userAnswers[qid] = newRel;
          updated = true;
          console.log(`Updated DB to ${newRel}`);
        }
      }

      if (updated) {
        if (DRY) {
          console.log(`[dry-run] Would update DB for submission ${row.id} with new user_answers`);
        } else {
          // Update DB
          await client.query('UPDATE test_results SET user_answers = $1 WHERE id = $2', [userAnswers, row.id]);
          console.log('Updated DB for submission', row.id);
        }
      }
    }
    console.log('Migration complete');
  } catch (err) {
    console.error('Migration error', err);
  } finally {
    client.release();
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

main().catch(err => { console.error('Unexpected error', err); pool.end(); process.exit(1); });
