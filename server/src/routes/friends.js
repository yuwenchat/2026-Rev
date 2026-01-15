import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Search user by friend code
router.get('/search/:code', authMiddleware, (req, res) => {
  try {
    const { code } = req.params;

    const user = db.prepare(`
      SELECT id, username, friend_code, public_key
      FROM users WHERE friend_code = ?
    `).get(code.toUpperCase());

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.id === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    res.json({
      id: user.id,
      username: user.username,
      friendCode: user.friend_code,
      publicKey: user.public_key
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Send friend request
router.post('/request', authMiddleware, (req, res) => {
  try {
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID required' });
    }

    if (friendId === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    // Check if friend exists
    const friend = db.prepare('SELECT id FROM users WHERE id = ?').get(friendId);
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends or request pending
    const existing = db.prepare(`
      SELECT id, status FROM friends
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(req.userId, friendId, friendId, req.userId);

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    // Create friend request
    db.prepare(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
    `).run(req.userId, friendId);

    res.json({ message: 'Friend request sent' });
  } catch (err) {
    console.error('Friend request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Accept friend request
router.post('/accept', authMiddleware, (req, res) => {
  try {
    const { requestId } = req.body;

    // Find the request (where current user is the friend_id)
    const request = db.prepare(`
      SELECT id, user_id FROM friends
      WHERE id = ? AND friend_id = ? AND status = 'pending'
    `).get(requestId, req.userId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update status to accepted
    db.prepare(`UPDATE friends SET status = 'accepted' WHERE id = ?`).run(requestId);

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Accept friend error:', err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Reject/Delete friend request
router.delete('/request/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    // Can delete if you're either the sender or receiver
    const result = db.prepare(`
      DELETE FROM friends
      WHERE id = ? AND (user_id = ? OR friend_id = ?)
    `).run(id, req.userId, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error('Delete friend error:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get friends list
router.get('/', authMiddleware, (req, res) => {
  try {
    const friends = db.prepare(`
      SELECT
        f.id as friendshipId,
        f.status,
        f.user_id as requesterId,
        CASE
          WHEN f.user_id = ? THEN u2.id
          ELSE u1.id
        END as id,
        CASE
          WHEN f.user_id = ? THEN u2.username
          ELSE u1.username
        END as username,
        CASE
          WHEN f.user_id = ? THEN u2.friend_code
          ELSE u1.friend_code
        END as friendCode,
        CASE
          WHEN f.user_id = ? THEN u2.public_key
          ELSE u1.public_key
        END as publicKey
      FROM friends f
      JOIN users u1 ON f.user_id = u1.id
      JOIN users u2 ON f.friend_id = u2.id
      WHERE f.user_id = ? OR f.friend_id = ?
    `).all(req.userId, req.userId, req.userId, req.userId, req.userId, req.userId);

    // Separate into accepted friends and pending requests
    const accepted = friends.filter(f => f.status === 'accepted');
    const pendingReceived = friends.filter(f => f.status === 'pending' && f.requesterId !== req.userId);
    const pendingSent = friends.filter(f => f.status === 'pending' && f.requesterId === req.userId);

    res.json({
      friends: accepted,
      pendingReceived,
      pendingSent
    });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

export default router;
