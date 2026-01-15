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

    // Join group rooms
    socket.on('join:groups', () => {
      joinUserGroups(socket, userId);
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
