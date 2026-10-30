// Development seed: creates (or resets) the owner login so it is easy to find.
//   Username: owner    Password: owner12345
// Run from apps/next:  npm run seed
// Uses the DB_* settings from .env.local, hashes the password exactly like src/lib/password.ts (scrypt) and does not force a
// password change at first login. Never run this against a production database.
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

const USERNAME = 'owner';
const PASSWORD = 'owner12345';

if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed a production database.'); process.exit(1); }

const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(PASSWORD.normalize(), salt, 64, { N: 16384, r: 8, p: 1 });
const hash = `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
const at = new Date().toISOString().slice(0, 19).replace('T', ' ');

const db = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME,
});
try {
  const [rows] = await db.query('SELECT id FROM users WHERE username=?', [USERNAME]);
  if (rows.length) {
    await db.query('UPDATE users SET password_hash=?, role=?, active=1, must_change_pw=0 WHERE id=?', [hash, 'owner', rows[0].id]);
    console.log(`Reset the "${USERNAME}" account.`);
  } else {
    await db.query(
      `INSERT INTO users (emp_no,name,first_name,last_name,username,password_hash,role,can_expenses,must_change_pw,created_at) VALUES ('EMP-0001','Owner','Owner','',?,?,'owner',1,0,?)`,
      [USERNAME, hash, at]);
    console.log(`Created the "${USERNAME}" account.`);
  }
  console.log(`Login:  username ${USERNAME}  /  password ${PASSWORD}`);
} finally { await db.end(); }
