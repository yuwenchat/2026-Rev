import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || join(__dirname, '../../data/chat.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Run migrations for existing databases
function runMigrations() {
  // Check if is_admin column exists
  const columns = db.prepare("PRAGMA table_info(users)").all();
  const hasIsAdmin = columns.some(col => col.name === 'is_admin');

  if (!hasIsAdmin) {
    console.log('Migration: Adding is_admin column to users table');
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
  }

  // Check if file_path column exists in messages
  const msgColumns = db.prepare("PRAGMA table_info(messages)").all();
  const hasFilePath = msgColumns.some(col => col.name === 'file_path');

  if (!hasFilePath) {
    console.log('Migration: Adding file columns to messages table');
    db.exec('ALTER TABLE messages ADD COLUMN file_path TEXT');
    db.exec('ALTER TABLE messages ADD COLUMN file_name TEXT');
    db.exec('ALTER TABLE messages ADD COLUMN file_type TEXT');
    db.exec('ALTER TABLE messages ADD COLUMN file_size INTEGER');
  }

  // Check if edited_at column exists in messages
  const hasEditedAt = msgColumns.some(col => col.name === 'edited_at');
  if (!hasEditedAt) {
    console.log('Migration: Adding edit/delete columns to messages table');
    db.exec('ALTER TABLE messages ADD COLUMN edited_at DATETIME');
    db.exec('ALTER TABLE messages ADD COLUMN deleted_for_sender INTEGER DEFAULT 0');
    db.exec('ALTER TABLE messages ADD COLUMN deleted_for_receiver INTEGER DEFAULT 0');
  }
}

// Create default admin user if not exists
async function createDefaultAdmin() {
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

  if (!adminUser) {
    console.log('Creating default admin user (admin/admin1)');
    const passwordHash = await bcrypt.hash('admin1', 10);

    // Generate a unique friend code for admin
    let friendCode;
    do {
      friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (db.prepare('SELECT id FROM users WHERE friend_code = ?').get(friendCode));

    db.prepare(`
      INSERT INTO users (username, password_hash, friend_code, public_key, encrypted_private_key, is_admin)
      VALUES (?, ?, ?, '', '', 1)
    `).run('admin', passwordHash, friendCode);

    console.log('Default admin created with friend code:', friendCode);
  }
}

runMigrations();
createDefaultAdmin();

export default db;
