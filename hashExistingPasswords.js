// hashExistingPasswords.js
const bcrypt = require('bcrypt');
const pool = require('./db'); // adjust path as needed

const isHashed = (password) => {
  // bcrypt hashes typically start with $2b$ or $2a$ and are 60 chars long
  return password.startsWith('$2') && password.length === 60;
};

const hashPasswords = async () => {
  try {
    const res = await pool.query('SELECT id, password FROM users');
    
    for (const user of res.rows) {
      const { id, password } = user;

      if (!isHashed(password)) {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);
        console.log(`✅ Password for user ID ${id} hashed`);
      } else {
        console.log(`ℹ️ Password for user ID ${id} already hashed, skipping`);
      }
    }

    console.log('🎉 All applicable passwords hashed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error hashing passwords:', err);
    process.exit(1);
  }
};

hashPasswords();
