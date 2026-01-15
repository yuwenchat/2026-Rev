import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { generateUniqueCode } from '../utils/helpers.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password, publicKey, encryptedPrivateKey } = req.body;

    // Validate input
    if (!username || !password || !publicKey || !encryptedPrivateKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 2-20 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique friend code
    const friendCode = generateUniqueCode(db, 'users', 'friend_code');

    // Insert user
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, friend_code, public_key, encrypted_private_key)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, passwordHash, friendCode, publicKey, encryptedPrivateKey);

    const userId = result.lastInsertRowid;
    const token = generateToken(userId);

    res.json({
      user: {
        id: userId,
        username,
        friendCode,
        publicKey
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    // Find user
    const user = db.prepare(`
      SELECT id, username, password_hash, friend_code, public_key, encrypted_private_key
      FROM users WHERE username = ?
    `).get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        friendCode: user.friend_code,
        publicKey: user.public_key,
        encryptedPrivateKey: user.encrypted_private_key
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, friend_code, public_key, encrypted_private_key, created_at
      FROM users WHERE id = ?
    `).get(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      friendCode: user.friend_code,
      publicKey: user.public_key,
      encryptedPrivateKey: user.encrypted_private_key,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
