import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get messages with a friend (private chat)
router.get('/private/:friendId', authMiddleware, (req, res) => {
  try {
    const { friendId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if they are friends
    const friendship = db.prepare(`
      SELECT id FROM friends
      WHERE status = 'accepted'
      AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    `).get(req.userId, friendId, friendId, req.userId);

    if (!friendship) {
      return res.status(403).json({ error: 'Not friends with this user' });
    }

    let query = `
      SELECT id, sender_id as senderId, receiver_id as receiverId,
             encrypted_content as encryptedContent, nonce, status, created_at as createdAt
      FROM messages
      WHERE group_id IS NULL
      AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
    `;

    const params = [req.userId, friendId, friendId, req.userId];

    if (before) {
      query += ' AND id < ?';
      params.push(before);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = db.prepare(query).all(...params);

    // Mark messages as delivered
    db.prepare(`
      UPDATE messages SET status = 'delivered'
      WHERE receiver_id = ? AND sender_id = ? AND status = 'sent'
    `).run(req.userId, friendId);

    res.json(messages.reverse());
  } catch (err) {
    console.error('Get private messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Get messages in a group
router.get('/group/:groupId', authMiddleware, (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, req.userId);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    let query = `
      SELECT m.id, m.sender_id as senderId, m.group_id as groupId,
             m.encrypted_content as encryptedContent, m.nonce, m.created_at as createdAt,
             u.username as senderName
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.group_id = ?
    `;

    const params = [groupId];

    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }

    query += ' ORDER BY m.id DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = db.prepare(query).all(...params);

    res.json(messages.reverse());
  } catch (err) {
    console.error('Get group messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Mark messages as read
router.post('/read', authMiddleware, (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs required' });
    }

    const placeholders = messageIds.map(() => '?').join(',');

    db.prepare(`
      UPDATE messages SET status = 'read'
      WHERE id IN (${placeholders}) AND receiver_id = ?
    `).run(...messageIds, req.userId);

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark messages' });
  }
});

export default router;
