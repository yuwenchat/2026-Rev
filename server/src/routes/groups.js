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

// Join group by code (without key - key will be shared via socket by existing members)
router.post('/join', authMiddleware, (req, res) => {
  try {
    const { groupCode } = req.body;

    if (!groupCode) {
      return res.status(400).json({ error: 'Group code required' });
    }

    // Find group
    const group = db.prepare(`
      SELECT id, name, group_code, creator_id FROM groups WHERE group_code = ?
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

    // Get user's public key for key sharing
    const user = db.prepare('SELECT username, public_key FROM users WHERE id = ?').get(req.userId);

    // Add as member without key (will be received via socket)
    db.prepare(`
      INSERT INTO group_members (group_id, user_id, encrypted_group_key, role)
      VALUES (?, ?, '', 'member')
    `).run(group.id, req.userId);

    // Get existing members who have the key (for socket notification)
    const existingMembers = db.prepare(`
      SELECT user_id FROM group_members
      WHERE group_id = ? AND user_id != ? AND encrypted_group_key != ''
    `).all(group.id, req.userId);

    res.json({
      id: group.id,
      name: group.name,
      groupCode: group.group_code,
      role: 'member',
      needsKey: true,
      newMemberId: req.userId,
      newMemberUsername: user.username,
      newMemberPublicKey: user.public_key,
      existingMemberIds: existingMembers.map(m => m.user_id)
    });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Save group key (after receiving from another member via socket)
router.put('/:id/key', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { encryptedGroupKey, sharedByPublicKey } = req.body;

    if (!encryptedGroupKey) {
      return res.status(400).json({ error: 'Encrypted group key required' });
    }

    // Check if user is a member
    const membership = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Store the encrypted key along with who shared it (needed for decryption)
    const keyData = JSON.stringify({
      key: encryptedGroupKey,
      sharedBy: sharedByPublicKey
    });

    db.prepare(`
      UPDATE group_members SET encrypted_group_key = ?
      WHERE group_id = ? AND user_id = ?
    `).run(keyData, id, req.userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Update group key error:', err);
    res.status(500).json({ error: 'Failed to update group key' });
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
