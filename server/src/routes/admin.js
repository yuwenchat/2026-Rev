import { Router } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/index.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require auth + admin
router.use(authMiddleware, adminMiddleware);

// Get all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, friend_code, is_admin, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user detail
router.get('/users/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, friend_code, public_key, is_admin, created_at
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's friends count
    const friendsCount = db.prepare(`
      SELECT COUNT(*) as count FROM friends
      WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
    `).get(user.id, user.id).count;

    // Get user's groups count
    const groupsCount = db.prepare(`
      SELECT COUNT(*) as count FROM group_members WHERE user_id = ?
    `).get(user.id).count;

    // Get user's messages count
    const messagesCount = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE sender_id = ?
    `).get(user.id).count;

    res.json({
      ...user,
      friendsCount,
      groupsCount,
      messagesCount
    });
  } catch (err) {
    console.error('Get user detail error:', err);
    res.status(500).json({ error: 'Failed to get user detail' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    const userId = parseInt(req.params.id);

    // Cannot modify self's admin status
    if (userId === req.userId && isAdmin !== undefined) {
      return res.status(400).json({ error: 'Cannot modify own admin status' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields
    if (username) {
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
      if (existing) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    }

    if (isAdmin !== undefined) {
      db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(isAdmin ? 1 : 0, userId);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot delete self
    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascades to friends, messages, group_members)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all groups
router.get('/groups', (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, u.username as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT COUNT(*) FROM messages WHERE group_id = g.id) as message_count
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      ORDER BY g.created_at DESC
    `).all();

    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Delete group
router.delete('/groups/:id', (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Get all messages (paginated)
router.get('/messages', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const messages = db.prepare(`
      SELECT m.*,
        sender.username as sender_name,
        receiver.username as receiver_name,
        g.name as group_name
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN groups g ON m.group_id = g.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;

    res.json({ messages, total, limit, offset });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Delete message
router.delete('/messages/:id', (req, res) => {
  try {
    const messageId = parseInt(req.params.id);

    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get stats
router.get('/stats', (req, res) => {
  try {
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const groupsCount = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
    const messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
    const friendshipsCount = db.prepare('SELECT COUNT(*) as count FROM friends WHERE status = "accepted"').get().count;

    // Recent activity (last 7 days)
    const recentUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    const recentMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    res.json({
      users: usersCount,
      groups: groupsCount,
      messages: messagesCount,
      friendships: friendshipsCount,
      recentUsers,
      recentMessages
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
