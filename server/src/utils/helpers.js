import crypto from 'crypto';

// Generate a random 6-character code (uppercase letters and numbers)
export function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

// Generate unique friend code (check database for duplicates)
export function generateUniqueCode(db, table, column, length = 6) {
  let code;
  let exists = true;

  while (exists) {
    code = generateCode(length);
    const row = db.prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`).get(code);
    exists = !!row;
  }

  return code;
}
