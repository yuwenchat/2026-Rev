import db from '../db/index.js';

// Store online users: { oderId: socketId }
const onlineUsers = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected`);

    // Mark user as online
    onlineUsers.set(userId, socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Notify friends about online status
    notifyFriendsOnlineStatus(io, userId, true);

    // Send current online friends to this user
    sendOnlineFriends(socket, userId);

    // Check for group members who need keys and notify them
    notifyPendingKeyMembers(io, socket, userId);

    // Handle private message
    socket.on('chat:private', (data) => {
      handlePrivateMessage(io, socket, userId, data);
    });

    // Handle group message
    socket.on('chat:group', (data) => {
      handleGroupMessage(io, socket, userId, data);
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
      handleTyping(io, userId, data);
    });

    // Handle message read
    socket.on('chat:read', (data) => {
      handleMessageRead(io, userId, data);
    });

    // Handle message edit
    socket.on('chat:edit', (data) => {
      handleMessageEdit(io, socket, userId, data);
    });

    // Handle message delete
    socket.on('chat:delete', (data) => {
      handleMessageDelete(io, socket, userId, data);
    });

    // Join group rooms
    socket.on('join:groups', () => {
      joinUserGroups(socket, userId);
    });

    // Request group key from existing members
    socket.on('group:requestKey', (data) => {
      handleGroupKeyRequest(io, socket, userId, data);
    });

    // Share group key with a new member
    socket.on('group:shareKey', (data) => {
      handleGroupKeyShare(io, socket, userId, data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      onlineUsers.delete(userId);
      notifyFriendsOnlineStatus(io, userId, false);
    });
  });
}

function handlePrivateMessage(io, socket, senderId, data) {
  const { receiverId, encryptedContent, nonce } = data;

  if (!receiverId || !encryptedContent || !nonce) {
    socket.emit('error', { message: 'Invalid message data' });
    return;
  }

  try {
    // Verify friendship
    const friendship = db.prepare(`
      SELECT id FROM friends
      WHERE status = 'accepted'
      AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    `).get(senderId, receiverId, receiverId, senderId);

    if (!friendship) {
      socket.emit('error', { message: 'Not friends with this user' });
      return;
    }

    // Save message
    const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, encrypted_content, nonce, status)
      VALUES (?, ?, ?, ?, 'sent')
    `).run(senderId, receiverId, encryptedContent, nonce);

    const messageId = result.lastInsertRowid;
    const message = {
      id: messageId,
      senderId,
      receiverId,
      encryptedContent,
      nonce,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    // Send to receiver if online
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('chat:private', message);

      // Update status to delivered
      db.prepare('UPDATE messages SET status = ? WHERE id = ?').run('delivered', messageId);
      message.status = 'delivered';
    }

    // Confirm to sender
    socket.emit('chat:private:sent', message);
  } catch (err) {
    console.error('Private message error:', err);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

function handleGroupMessage(io, socket, senderId, data) {
  const { groupId, encryptedContent, nonce } = data;

  if (!groupId || !encryptedContent || !nonce) {
    socket.emit('error', { message: 'Invalid message data' });
    return;
  }

  try {
    // Verify membership
    const membership = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, senderId);

    if (!membership) {
      socket.emit('error', { message: 'Not a member of this group' });
      return;
    }

    // Get sender info
    const sender = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId);

    // Save message
    const result = db.prepare(`
      INSERT INTO messages (sender_id, group_id, encrypted_content, nonce)
      VALUES (?, ?, ?, ?)
    `).run(senderId, groupId, encryptedContent, nonce);

    const message = {
      id: result.lastInsertRowid,
      senderId,
      senderName: sender.username,
      groupId,
      encryptedContent,
      nonce,
      createdAt: new Date().toISOString()
    };

    // Broadcast to group
    io.to(`group:${groupId}`).emit('chat:group', message);
  } catch (err) {
    console.error('Group message error:', err);
    socket.emit('error', { message: 'Failed to send message' });
  }
}

function handleTyping(io, userId, data) {
  const { receiverId, groupId, isTyping } = data;

  if (receiverId) {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('chat:typing', { userId, isTyping });
    }
  } else if (groupId) {
    io.to(`group:${groupId}`).emit('chat:typing', { userId, groupId, isTyping });
  }
}

function handleMessageRead(io, userId, data) {
  const { messageIds, senderId } = data;

  if (!Array.isArray(messageIds) || messageIds.length === 0) return;

  try {
    const placeholders = messageIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE messages SET status = 'read'
      WHERE id IN (${placeholders}) AND receiver_id = ?
    `).run(...messageIds, userId);

    // Notify sender
    if (senderId) {
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('chat:read', { messageIds, readBy: userId });
      }
    }
  } catch (err) {
    console.error('Mark read error:', err);
  }
}

function handleMessageEdit(io, socket, userId, data) {
  const { messageId, encryptedContent, nonce, receiverId, groupId } = data;

  if (!messageId || !encryptedContent || !nonce) {
    socket.emit('error', { message: 'Invalid edit data' });
    return;
  }

  try {
    // Check if message belongs to user
    const message = db.prepare('SELECT sender_id FROM messages WHERE id = ?').get(messageId);

    if (!message || message.sender_id !== userId) {
      socket.emit('error', { message: 'Cannot edit this message' });
      return;
    }

    // Update message
    db.prepare(`
      UPDATE messages SET encrypted_content = ?, nonce = ?, edited_at = datetime('now')
      WHERE id = ?
    `).run(encryptedContent, nonce, messageId);

    const editedAt = new Date().toISOString();

    // Notify the other party
    if (receiverId) {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('chat:edited', {
          messageId,
          encryptedContent,
          nonce,
          editedAt
        });
      }
    } else if (groupId) {
      io.to(`group:${groupId}`).emit('chat:edited', {
        messageId,
        encryptedContent,
        nonce,
        editedAt
      });
    }

    // Confirm to sender
    socket.emit('chat:edited', { messageId, encryptedContent, nonce, editedAt });
  } catch (err) {
    console.error('Edit message error:', err);
    socket.emit('error', { message: 'Failed to edit message' });
  }
}

function handleMessageDelete(io, socket, userId, data) {
  const { messageId, forBoth, receiverId, groupId } = data;

  if (!messageId) {
    socket.emit('error', { message: 'Invalid delete data' });
    return;
  }

  try {
    const message = db.prepare('SELECT sender_id, receiver_id FROM messages WHERE id = ?').get(messageId);

    if (!message) {
      socket.emit('error', { message: 'Message not found' });
      return;
    }

    const isSender = message.sender_id === userId;
    const isReceiver = message.receiver_id === userId;

    if (!isSender && !isReceiver) {
      socket.emit('error', { message: 'Cannot delete this message' });
      return;
    }

    if (forBoth && isSender) {
      // Delete for both parties
      db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

      // Notify receiver
      if (receiverId) {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('chat:deleted', { messageId, deletedForBoth: true });
        }
      } else if (groupId) {
        io.to(`group:${groupId}`).emit('chat:deleted', { messageId, deletedForBoth: true });
      }
    } else {
      // Soft delete for current user only
      if (isSender) {
        db.prepare('UPDATE messages SET deleted_for_sender = 1 WHERE id = ?').run(messageId);
      } else {
        db.prepare('UPDATE messages SET deleted_for_receiver = 1 WHERE id = ?').run(messageId);
      }
    }

    // Confirm to sender
    socket.emit('chat:deleted', { messageId, deletedForBoth: forBoth && isSender });
  } catch (err) {
    console.error('Delete message error:', err);
    socket.emit('error', { message: 'Failed to delete message' });
  }
}

function notifyFriendsOnlineStatus(io, userId, isOnline) {
  try {
    const friends = db.prepare(`
      SELECT CASE
        WHEN user_id = ? THEN friend_id
        ELSE user_id
      END as friendId
      FROM friends
      WHERE status = 'accepted' AND (user_id = ? OR friend_id = ?)
    `).all(userId, userId, userId);

    friends.forEach(({ friendId }) => {
      const friendSocketId = onlineUsers.get(friendId);
      if (friendSocketId) {
        io.to(friendSocketId).emit('user:status', { userId, isOnline });
      }
    });
  } catch (err) {
    console.error('Notify online status error:', err);
  }
}

function sendOnlineFriends(socket, userId) {
  try {
    const friends = db.prepare(`
      SELECT CASE
        WHEN user_id = ? THEN friend_id
        ELSE user_id
      END as friendId
      FROM friends
      WHERE status = 'accepted' AND (user_id = ? OR friend_id = ?)
    `).all(userId, userId, userId);

    const onlineFriends = friends
      .filter(({ friendId }) => onlineUsers.has(friendId))
      .map(({ friendId }) => friendId);

    socket.emit('friends:online', onlineFriends);
  } catch (err) {
    console.error('Send online friends error:', err);
  }
}

function joinUserGroups(socket, userId) {
  try {
    const groups = db.prepare(`
      SELECT group_id FROM group_members WHERE user_id = ?
    `).all(userId);

    groups.forEach(({ group_id }) => {
      socket.join(`group:${group_id}`);
    });
  } catch (err) {
    console.error('Join groups error:', err);
  }
}

// When a user with keys comes online, notify them about members who need keys
function notifyPendingKeyMembers(io, socket, userId) {
  try {
    // Find groups where current user has a key
    const groupsWithKey = db.prepare(`
      SELECT group_id FROM group_members
      WHERE user_id = ? AND encrypted_group_key != ''
    `).all(userId);

    groupsWithKey.forEach(({ group_id }) => {
      // Find members in this group who don't have a key yet
      const membersNeedingKey = db.prepare(`
        SELECT gm.user_id, u.username, u.public_key
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ? AND gm.user_id != ? AND (gm.encrypted_group_key = '' OR gm.encrypted_group_key IS NULL)
      `).all(group_id, userId);

      // Send key request notifications to current user for each member needing key
      membersNeedingKey.forEach(member => {
        socket.emit('group:keyRequest', {
          groupId: group_id,
          requesterId: member.user_id,
          requesterName: member.username,
          requesterPublicKey: member.public_key
        });
      });
    });
  } catch (err) {
    console.error('Notify pending key members error:', err);
  }
}

// Handle request for group key from new member
function handleGroupKeyRequest(io, socket, userId, data) {
  const { groupId, publicKey } = data;

  if (!groupId || !publicKey) {
    socket.emit('error', { message: 'Invalid key request data' });
    return;
  }

  try {
    // Verify user is a member
    const membership = db.prepare(`
      SELECT id FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, userId);

    if (!membership) {
      socket.emit('error', { message: 'Not a member of this group' });
      return;
    }

    // Get user info
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);

    // Send request to all members who have the key
    const membersWithKey = db.prepare(`
      SELECT user_id FROM group_members
      WHERE group_id = ? AND user_id != ? AND encrypted_group_key != ''
    `).all(groupId, userId);

    membersWithKey.forEach(({ user_id }) => {
      const memberSocketId = onlineUsers.get(user_id);
      if (memberSocketId) {
        io.to(memberSocketId).emit('group:keyRequest', {
          groupId,
          requesterId: userId,
          requesterName: user.username,
          requesterPublicKey: publicKey
        });
      }
    });

    // Also join the group room
    socket.join(`group:${groupId}`);
  } catch (err) {
    console.error('Group key request error:', err);
    socket.emit('error', { message: 'Failed to request group key' });
  }
}

// Handle sharing group key with new member
function handleGroupKeyShare(io, socket, userId, data) {
  const { groupId, targetUserId, encryptedGroupKey, sharerPublicKey } = data;

  if (!groupId || !targetUserId || !encryptedGroupKey || !sharerPublicKey) {
    socket.emit('error', { message: 'Invalid key share data' });
    return;
  }

  try {
    // Verify sender has the key
    const senderMembership = db.prepare(`
      SELECT encrypted_group_key FROM group_members
      WHERE group_id = ? AND user_id = ? AND encrypted_group_key != ''
    `).get(groupId, userId);

    if (!senderMembership) {
      socket.emit('error', { message: 'You do not have the group key' });
      return;
    }

    // Verify target is a member (who needs the key)
    const targetMembership = db.prepare(`
      SELECT id, encrypted_group_key FROM group_members WHERE group_id = ? AND user_id = ?
    `).get(groupId, targetUserId);

    if (!targetMembership) {
      socket.emit('error', { message: 'Target is not a member of this group' });
      return;
    }

    // Store the encrypted key on server for the target user (even if offline)
    // This allows them to retrieve it later without needing sender to be online
    if (!targetMembership.encrypted_group_key) {
      const keyData = JSON.stringify({
        key: encryptedGroupKey,
        sharedBy: sharerPublicKey
      });
      db.prepare(`
        UPDATE group_members SET encrypted_group_key = ?
        WHERE group_id = ? AND user_id = ?
      `).run(keyData, groupId, targetUserId);
    }

    // Also send via socket if target is online (for immediate update)
    const targetSocketId = onlineUsers.get(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('group:keyReceived', {
        groupId,
        encryptedGroupKey,
        sharerPublicKey,
        sharerId: userId
      });
    }
  } catch (err) {
    console.error('Group key share error:', err);
    socket.emit('error', { message: 'Failed to share group key' });
  }
}
