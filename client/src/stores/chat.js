import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/api.js'
import { getSocket } from '../utils/socket.js'
import { useUserStore } from './user.js'
import {
  encryptMessage,
  decryptMessage,
  encryptGroupMessage,
  decryptGroupMessage,
  generateGroupKey,
  encryptGroupKey,
  decryptGroupKey
} from '../utils/crypto.js'

export const useChatStore = defineStore('chat', () => {
  const friends = ref([])
  const pendingReceived = ref([])
  const pendingSent = ref([])
  const groups = ref([])
  const onlineFriends = ref(new Set())

  const currentChat = ref(null) // { type: 'private'|'group', id, name, publicKey?, groupKey? }
  const messages = ref([])
  const typingUsers = ref(new Set())

  const userStore = useUserStore()

  // Load friends and groups
  async function loadContacts() {
    const [friendsData, groupsData] = await Promise.all([
      api.getFriends(),
      api.getGroups()
    ])

    friends.value = friendsData.friends
    pendingReceived.value = friendsData.pendingReceived
    pendingSent.value = friendsData.pendingSent

    // Process groups and try to decrypt keys
    groups.value = groupsData.map(group => {
      let groupKey = null
      let needsKey = true

      if (group.encryptedGroupKey) {
        try {
          // Try new format first (with sharedBy info)
          const keyData = JSON.parse(group.encryptedGroupKey)
          if (keyData.key && keyData.sharedBy) {
            groupKey = decryptGroupKey(
              keyData.key,
              keyData.sharedBy,
              userStore.privateKey
            )
            needsKey = false
          } else {
            // Old format
            groupKey = decryptGroupKey(
              group.encryptedGroupKey,
              userStore.user.publicKey,
              userStore.privateKey
            )
            needsKey = false
          }
        } catch {
          // Try old format as fallback
          try {
            groupKey = decryptGroupKey(
              group.encryptedGroupKey,
              userStore.user.publicKey,
              userStore.privateKey
            )
            needsKey = false
          } catch {
            // Key decryption failed
            groupKey = null
            needsKey = true
          }
        }
      }

      return {
        ...group,
        groupKey,
        needsKey
      }
    })
  }

  // Search user by friend code
  async function searchUser(code) {
    return await api.searchUser(code)
  }

  // Send friend request
  async function sendFriendRequest(friendId) {
    await api.sendFriendRequest(friendId)
    await loadContacts()
  }

  // Accept friend request
  async function acceptFriendRequest(requestId) {
    await api.acceptFriend(requestId)
    await loadContacts()
  }

  // Reject/Delete friend
  async function removeFriend(friendshipId) {
    await api.deleteFriend(friendshipId)
    await loadContacts()
  }

  // Create group
  async function createGroup(name) {
    const groupKey = generateGroupKey()
    const encryptedGroupKey = encryptGroupKey(
      groupKey,
      userStore.user.publicKey,
      userStore.privateKey
    )

    const result = await api.createGroup({ name, encryptedGroupKey })
    groups.value.push({ ...result, groupKey })

    return result
  }

  // Join group - key will be received from existing members via socket
  async function joinGroup(groupCode) {
    const result = await api.joinGroup({ groupCode })

    // Add to groups list (without key for now)
    groups.value.push({
      id: result.id,
      name: result.name,
      groupCode: result.groupCode,
      role: result.role,
      needsKey: true,
      groupKey: null
    })

    const socket = getSocket()
    if (socket) {
      // Join socket room
      socket.emit('join:groups')

      // Request key from existing members
      socket.emit('group:requestKey', {
        groupId: result.id,
        publicKey: userStore.user.publicKey
      })
    }

    return result
  }

  // Handle receiving group key from another member
  async function receiveGroupKey(groupId, encryptedGroupKey, sharerPublicKey) {
    try {
      // Decrypt the group key
      const groupKey = decryptGroupKey(
        encryptedGroupKey,
        sharerPublicKey,
        userStore.privateKey
      )

      // Save to server (re-encrypt for ourselves)
      const reEncryptedKey = encryptGroupKey(
        groupKey,
        userStore.user.publicKey,
        userStore.privateKey
      )
      await api.saveGroupKey(groupId, reEncryptedKey, userStore.user.publicKey)

      // Update local group
      const group = groups.value.find(g => g.id === groupId)
      if (group) {
        group.groupKey = groupKey
        group.needsKey = false
      }

      // Update current chat if viewing this group
      if (currentChat.value?.type === 'group' && currentChat.value?.id === groupId) {
        currentChat.value.groupKey = groupKey

        // Re-decrypt messages now that we have the key
        messages.value = messages.value.map(m => ({
          ...m,
          content: decryptGroupMessage(m.encryptedContent, m.nonce, groupKey)
        }))
      }

      return true
    } catch (err) {
      console.error('Failed to receive group key:', err)
      return false
    }
  }

  // Share group key with a new member (called when we receive a key request)
  function shareGroupKeyWith(groupId, targetUserId, targetPublicKey) {
    const group = groups.value.find(g => g.id === groupId)
    if (!group?.groupKey) {
      console.error('Cannot share key - we do not have it')
      return false
    }

    // Encrypt our group key for the new member
    const encryptedKeyForTarget = encryptGroupKey(
      group.groupKey,
      targetPublicKey,
      userStore.privateKey
    )

    const socket = getSocket()
    if (socket) {
      socket.emit('group:shareKey', {
        groupId,
        targetUserId,
        encryptedGroupKey: encryptedKeyForTarget,
        sharerPublicKey: userStore.user.publicKey
      })
    }

    return true
  }

  // Leave group
  async function leaveGroup(groupId) {
    await api.leaveGroup(groupId)
    groups.value = groups.value.filter(g => g.id !== groupId)

    if (currentChat.value?.type === 'group' && currentChat.value?.id === groupId) {
      currentChat.value = null
      messages.value = []
    }
  }

  // Select a chat
  async function selectChat(type, contact) {
    if (type === 'private') {
      currentChat.value = {
        type: 'private',
        id: contact.id,
        name: contact.username,
        publicKey: contact.publicKey
      }

      // Load messages
      const msgs = await api.getPrivateMessages(contact.id, { limit: 50 })
      messages.value = msgs.map(m => ({
        ...m,
        content: decryptMessage(
          m.encryptedContent,
          m.nonce,
          m.senderId === userStore.user.id ? contact.publicKey : contact.publicKey,
          userStore.privateKey
        )
      }))
    } else {
      // Group chat
      const groupData = await api.getGroup(contact.id)

      // Decrypt group key - handle both old and new format
      let groupKey = null
      if (groupData.encryptedGroupKey) {
        try {
          // Try new format first (with sharedBy info)
          const keyData = JSON.parse(groupData.encryptedGroupKey)
          if (keyData.key && keyData.sharedBy) {
            groupKey = decryptGroupKey(
              keyData.key,
              keyData.sharedBy,
              userStore.privateKey
            )
          } else {
            // Old format - self-encrypted
            groupKey = decryptGroupKey(
              groupData.encryptedGroupKey,
              userStore.user.publicKey,
              userStore.privateKey
            )
          }
        } catch {
          // Try old format as fallback
          try {
            groupKey = decryptGroupKey(
              groupData.encryptedGroupKey,
              userStore.user.publicKey,
              userStore.privateKey
            )
          } catch {
            groupKey = null
          }
        }
      }

      currentChat.value = {
        type: 'group',
        id: contact.id,
        name: groupData.name,
        groupCode: groupData.groupCode,
        groupKey,
        members: groupData.members
      }

      // Load messages
      const msgs = await api.getGroupMessages(contact.id, { limit: 50 })
      messages.value = msgs.map(m => ({
        ...m,
        content: groupKey
          ? decryptGroupMessage(m.encryptedContent, m.nonce, groupKey)
          : '[No key]'
      }))
    }
  }

  // Send message
  function sendMessage(content, fileInfo = null) {
    const socket = getSocket()
    if (!socket || !currentChat.value) return
    if (!content.trim() && !fileInfo) return

    // If there's a file, include file info in content
    const messageContent = fileInfo
      ? JSON.stringify({ text: content, file: fileInfo })
      : content

    if (currentChat.value.type === 'private') {
      const { encryptedContent, nonce } = encryptMessage(
        messageContent,
        userStore.privateKey,
        currentChat.value.publicKey
      )

      socket.emit('chat:private', {
        receiverId: currentChat.value.id,
        encryptedContent,
        nonce,
        hasFile: !!fileInfo
      })
    } else {
      if (!currentChat.value.groupKey) return

      const { encryptedContent, nonce } = encryptGroupMessage(
        messageContent,
        currentChat.value.groupKey
      )

      socket.emit('chat:group', {
        groupId: currentChat.value.id,
        encryptedContent,
        nonce,
        hasFile: !!fileInfo
      })
    }
  }

  // Send file
  async function sendFile(file) {
    if (!currentChat.value) return

    try {
      // Upload file first
      const uploadResult = await api.uploadFile(file)

      // Send message with file info
      sendMessage('', {
        url: uploadResult.url,
        name: uploadResult.originalName,
        size: uploadResult.size,
        type: uploadResult.mimeType
      })

      return uploadResult
    } catch (err) {
      console.error('Send file error:', err)
      throw err
    }
  }

  // Setup socket listeners
  function setupSocketListeners() {
    const socket = getSocket()
    if (!socket) return

    // Private message received
    socket.on('chat:private', (msg) => {
      if (currentChat.value?.type === 'private' && currentChat.value?.id === msg.senderId) {
        const friend = friends.value.find(f => f.id === msg.senderId)
        messages.value.push({
          ...msg,
          content: decryptMessage(
            msg.encryptedContent,
            msg.nonce,
            friend?.publicKey || '',
            userStore.privateKey
          )
        })
        // Mark as read immediately since we're viewing this chat
        setTimeout(() => markMessagesAsRead(), 100)
      }
    })

    // Private message sent confirmation
    socket.on('chat:private:sent', (msg) => {
      if (currentChat.value?.type === 'private' && currentChat.value?.id === msg.receiverId) {
        messages.value.push({
          ...msg,
          content: decryptMessage(
            msg.encryptedContent,
            msg.nonce,
            currentChat.value.publicKey,
            userStore.privateKey
          )
        })
      }
    })

    // Group message
    socket.on('chat:group', (msg) => {
      if (currentChat.value?.type === 'group' && currentChat.value?.id === msg.groupId) {
        messages.value.push({
          ...msg,
          content: currentChat.value.groupKey
            ? decryptGroupMessage(msg.encryptedContent, msg.nonce, currentChat.value.groupKey)
            : '[No key]'
        })
      }
    })

    // Online friends list
    socket.on('friends:online', (ids) => {
      onlineFriends.value = new Set(ids)
    })

    // User status change
    socket.on('user:status', ({ userId, isOnline }) => {
      if (isOnline) {
        onlineFriends.value.add(userId)
      } else {
        onlineFriends.value.delete(userId)
      }
    })

    // Typing indicator
    socket.on('chat:typing', ({ userId, isTyping }) => {
      if (isTyping) {
        typingUsers.value.add(userId)
      } else {
        typingUsers.value.delete(userId)
      }
    })

    // Message read
    socket.on('chat:read', ({ messageIds }) => {
      messages.value.forEach(m => {
        if (messageIds.includes(m.id)) {
          m.status = 'read'
        }
      })
    })

    // Message edited
    socket.on('chat:edited', ({ messageId, encryptedContent, nonce, editedAt }) => {
      const msg = messages.value.find(m => m.id === messageId)
      if (msg) {
        // Decrypt the new content
        if (currentChat.value?.type === 'private') {
          const friend = friends.value.find(f => f.id === msg.senderId)
          msg.content = decryptMessage(
            encryptedContent,
            nonce,
            friend?.publicKey || currentChat.value.publicKey,
            userStore.privateKey
          )
        } else if (currentChat.value?.type === 'group' && currentChat.value.groupKey) {
          msg.content = decryptGroupMessage(encryptedContent, nonce, currentChat.value.groupKey)
        }
        msg.editedAt = editedAt
      }
    })

    // Message deleted
    socket.on('chat:deleted', ({ messageId, deletedForBoth }) => {
      if (deletedForBoth) {
        messages.value = messages.value.filter(m => m.id !== messageId)
      }
    })

    // Group key request - someone is asking for the key
    socket.on('group:keyRequest', ({ groupId, requesterId, requesterName, requesterPublicKey }) => {
      console.log(`Key request from ${requesterName} for group ${groupId}`)
      // Automatically share our key if we have it
      shareGroupKeyWith(groupId, requesterId, requesterPublicKey)
    })

    // Group key received - we received a key from another member
    socket.on('group:keyReceived', async ({ groupId, encryptedGroupKey, sharerPublicKey }) => {
      console.log(`Received group key for group ${groupId}`)
      await receiveGroupKey(groupId, encryptedGroupKey, sharerPublicKey)
    })
  }

  // Send typing indicator
  function sendTyping(isTyping) {
    const socket = getSocket()
    if (!socket || !currentChat.value) return

    socket.emit('chat:typing', {
      receiverId: currentChat.value.type === 'private' ? currentChat.value.id : null,
      groupId: currentChat.value.type === 'group' ? currentChat.value.id : null,
      isTyping
    })
  }

  // Mark messages as read
  function markMessagesAsRead() {
    if (!currentChat.value || currentChat.value.type !== 'private') return

    const socket = getSocket()
    if (!socket) return

    // Find unread messages from the other person
    const unreadMessages = messages.value.filter(
      m => m.senderId === currentChat.value.id && m.status !== 'read'
    )

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id)
      socket.emit('chat:read', {
        messageIds,
        senderId: currentChat.value.id
      })

      // Update local state
      unreadMessages.forEach(m => {
        m.status = 'read'
      })
    }
  }

  // Edit message
  function editMessage(messageId, newContent) {
    const socket = getSocket()
    if (!socket || !currentChat.value) return

    const msg = messages.value.find(m => m.id === messageId)
    if (!msg) return

    if (currentChat.value.type === 'private') {
      const { encryptedContent, nonce } = encryptMessage(
        newContent,
        userStore.privateKey,
        currentChat.value.publicKey
      )

      socket.emit('chat:edit', {
        messageId,
        encryptedContent,
        nonce,
        receiverId: currentChat.value.id
      })

      // Update local state immediately
      msg.content = newContent
      msg.editedAt = new Date().toISOString()
    } else if (currentChat.value.groupKey) {
      const { encryptedContent, nonce } = encryptGroupMessage(
        newContent,
        currentChat.value.groupKey
      )

      socket.emit('chat:edit', {
        messageId,
        encryptedContent,
        nonce,
        groupId: currentChat.value.id
      })

      // Update local state immediately
      msg.content = newContent
      msg.editedAt = new Date().toISOString()
    }
  }

  // Delete message
  function deleteMessage(messageId, forBoth = false) {
    const socket = getSocket()
    if (!socket || !currentChat.value) return

    socket.emit('chat:delete', {
      messageId,
      forBoth,
      receiverId: currentChat.value.type === 'private' ? currentChat.value.id : null,
      groupId: currentChat.value.type === 'group' ? currentChat.value.id : null
    })

    // Remove from local state immediately
    messages.value = messages.value.filter(m => m.id !== messageId)
  }

  return {
    friends,
    pendingReceived,
    pendingSent,
    groups,
    onlineFriends,
    currentChat,
    messages,
    typingUsers,
    loadContacts,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    createGroup,
    joinGroup,
    leaveGroup,
    selectChat,
    sendMessage,
    sendFile,
    setupSocketListeners,
    sendTyping,
    markMessagesAsRead,
    editMessage,
    deleteMessage,
    receiveGroupKey,
    shareGroupKeyWith
  }
})
