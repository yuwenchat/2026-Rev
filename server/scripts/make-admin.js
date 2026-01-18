#!/usr/bin/env node
/**
 * Make a user an admin
 * Usage: node make-admin.js
 */

import Database from 'better-sqlite3';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '../data/chat.db');
const db = new Database(dbPath);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('=== Set User as Admin ===\n');

  // List existing users
  const users = db.prepare('SELECT id, username, is_admin FROM users ORDER BY id').all();

  if (users.length === 0) {
    console.log('No users found in database.');
    rl.close();
    return;
  }

  console.log('Existing users:');
  users.forEach(u => {
    const adminTag = u.is_admin ? ' [ADMIN]' : '';
    console.log(`  - ${u.username}${adminTag}`);
  });
  console.log('');

  const username = await question('Enter username to make admin: ');

  if (!username.trim()) {
    console.log('No username provided. Exiting.');
    rl.close();
    return;
  }

  const user = db.prepare('SELECT id, username, is_admin FROM users WHERE username = ?').get(username.trim());

  if (!user) {
    console.log(`User "${username}" not found.`);
    rl.close();
    return;
  }

  if (user.is_admin) {
    console.log(`User "${username}" is already an admin.`);
    rl.close();
    return;
  }

  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
  console.log(`\n✓ User "${username}" is now an admin!`);
  console.log('They can now access /admin after logging in.');

  rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
