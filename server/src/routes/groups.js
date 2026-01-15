import { Router } from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateUniqueCode } from '../utils/helpers.js';

const router = Router();

// Create group
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, encryptedGroupKey } = req.body;

    if (!name || !encryptedGroupKey) {
      return res.status(400).json({ error: 'Group name and encrypted key required' });
    }

    if (name.length < 1 || name.length > 50) {
      return res.status(400).json({ error: 'Group name must be 1-50 characters' });
    }

    const groupCode = generateUniqueCode(db, 'groups', 'group_code');

    // Create group
    const result = db.prepare(`
      INSERT INTO groups (name, group_code, creator_id)
      VALUES (?, ?, ?)
    `).run(name, groupCode, req.userId);

    const groupId = result.lastInsertRowid;

    // Add creator as admin member
    db.prepare(`
      INSERT INTO group_members (group_id, user_id, encrypted_group_key, role)
      VALUES (?, ?, ?, 'admin')
    `).run(groupId, req.userId, encryptedGroupKey);

    res.json({
      id: groupId,
      name,
      groupCode,
      role: 'admin'
    });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Join group by code
router.post('/join', authMiddleware, (req, res) => {
  try {
    const { groupCode, encryptedGroupKey } = req.body;

    if (!groupCode || !encryptedGroupKey) {
      return res.status(400).json({ error: 'Group code and encrypted key required' });
    }

    // Find group
    const group = db.prepare(`
      SELECT id, name, group_code FROM groups WHERE group_code = ?
    `).get(groupCode.toUpperCase());

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const existing = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(group.id, req.userId);

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add as member
    db.prepare(`
      INSERT INTO group_members (group_id, user_id, encrypted_group_key, role)
      VALUES (?, ?, ?, 'member')
    `).run(group.id, req.userId, encryptedGroupKey);

    res.json({
      id: group.id,
      name: group.name,
      groupCode: group.group_code,
      role: 'member'
    });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Get user's groups
router.get('/', authMiddleware, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.id, g.name, g.group_code as groupCode, gm.role, gm.encrypted_group_key as encryptedGroupKey
      FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ?
    `).all(req.userId);

    res.json(groups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Get group details and members
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT role, encrypted_group_key FROM group_members
      WHERE group_id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get group info
    const group = db.prepare(`
      SELECT id, name, group_code as groupCode, creator_id as creatorId
      FROM groups WHERE id = ?
    `).get(id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Get members
    const members = db.prepare(`
      SELECT u.id, u.username, u.public_key as publicKey, gm.role
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ?
    `).all(id);

    res.json({
      ...group,
      role: membership.role,
      encryptedGroupKey: membership.encrypted_group_key,
      members
    });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Leave group
router.delete('/:id/leave', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a member
    const membership = db.prepare(`
      SELECT role FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    // Remove member
    db.prepare(`
      DELETE FROM group_members WHERE group_id = ? AND user_id = ?
    `).run(id, req.userId);

    // Check if group is now empty
    const remaining = db.prepare(`
      SELECT COUNT(*) as count FROM group_members WHERE group_id = ?
    `).get(id);

    if (remaining.count === 0) {
      // Delete group and its messages if empty
      db.prepare('DELETE FROM messages WHERE group_id = ?').run(id);
      db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    }

    res.json({ message: 'Left group' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

export default router;
