import { Router } from 'express';
import bcrypt from 'bcrypt';
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';
import { generateUniqueCode } from '../utils/helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = join(__dirname, '../../uploads/avatars');

// Ensure avatars upload directory exists
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

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

    // Insert user (not admin by default)
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, friend_code, public_key, encrypted_private_key, is_admin)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(username, passwordHash, friendCode, publicKey, encryptedPrivateKey);

    const userId = result.lastInsertRowid;
    const token = generateToken(userId);

    res.json({
      user: {
        id: userId,
        username,
        friendCode,
        publicKey,
        isAdmin: false,
        avatarUrl: null,
        avatarColor: '#6366f1'
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
      SELECT id, username, password_hash, friend_code, public_key, encrypted_private_key, is_admin, avatar_url, avatar_color
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
        encryptedPrivateKey: user.encrypted_private_key,
        isAdmin: !!user.is_admin,
        avatarUrl: user.avatar_url,
        avatarColor: user.avatar_color || '#6366f1'
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
      SELECT id, username, friend_code, public_key, encrypted_private_key, is_admin, avatar_url, avatar_color, created_at
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
      isAdmin: !!user.is_admin,
      avatarUrl: user.avatar_url,
      avatarColor: user.avatar_color || '#6366f1',
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword, newEncryptedPrivateKey } = req.body;

    if (!oldPassword || !newPassword || !newEncryptedPrivateKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get current user
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password and encrypted private key
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.prepare(`
      UPDATE users SET password_hash = ?, encrypted_private_key = ?
      WHERE id = ?
    `).run(newPasswordHash, newEncryptedPrivateKey, req.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update avatar color
router.post('/avatar/color', authMiddleware, (req, res) => {
  try {
    const { color } = req.body;

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Invalid color format' });
    }

    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(color, req.userId);

    res.json({ success: true, avatarColor: color });
  } catch (err) {
    console.error('Update avatar color error:', err);
    res.status(500).json({ error: 'Failed to update avatar color' });
  }
});

// Upload avatar image
router.post('/avatar/upload', authMiddleware, (req, res) => {
  try {
    const { image } = req.body; // Base64 encoded image

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Parse base64 data
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Check file size (max 2MB)
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 2MB)' });
    }

    // Delete old avatar if exists
    const oldUser = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.userId);
    if (oldUser?.avatar_url) {
      const oldPath = join(__dirname, '../..', oldUser.avatar_url);
      if (existsSync(oldPath)) {
        try {
          unlinkSync(oldPath);
        } catch (e) {
          console.error('Failed to delete old avatar:', e);
        }
      }
    }

    // Save new avatar
    const filename = `${req.userId}_${Date.now()}.${ext}`;
    const filepath = join(uploadsDir, filename);
    writeFileSync(filepath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.userId);

    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Remove avatar (revert to letter avatar)
router.delete('/avatar', authMiddleware, (req, res) => {
  try {
    // Delete avatar file if exists
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.userId);
    if (user?.avatar_url) {
      const filepath = join(__dirname, '../..', user.avatar_url);
      if (existsSync(filepath)) {
        try {
          unlinkSync(filepath);
        } catch (e) {
          console.error('Failed to delete avatar file:', e);
        }
      }
    }

    db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Remove avatar error:', err);
    res.status(500).json({ error: 'Failed to remove avatar' });
  }
});

export default router;
