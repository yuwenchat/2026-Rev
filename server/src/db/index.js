import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
}

runMigrations();

export default db;
