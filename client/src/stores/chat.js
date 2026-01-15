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
    groups.value = groupsData
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

  // Join group
  async function joinGroup(groupCode) {
    // For simplicity, using self-encrypted group key
    // In real app, would need key exchange with existing members
    const groupKey = generateGroupKey()
    const encryptedGroupKey = encryptGroupKey(
      groupKey,
      userStore.user.publicKey,
      userStore.privateKey
    )

    const result = await api.joinGroup({ groupCode, encryptedGroupKey })
    groups.value.push({ ...result, groupKey })

    // Join socket room
    getSocket()?.emit('join:groups')

    return result
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

      // Decrypt group key
      let groupKey
      try {
        groupKey = decryptGroupKey(
          groupData.encryptedGroupKey,
          userStore.user.publicKey,
          userStore.privateKey
        )
      } catch {
        groupKey = null
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
  function sendMessage(content) {
    const socket = getSocket()
    if (!socket || !currentChat.value || !content.trim()) return

    if (currentChat.value.type === 'private') {
      const { encryptedContent, nonce } = encryptMessage(
        content,
        userStore.privateKey,
        currentChat.value.publicKey
      )

      socket.emit('chat:private', {
        receiverId: currentChat.value.id,
        encryptedContent,
        nonce
      })
    } else {
      if (!currentChat.value.groupKey) return

      const { encryptedContent, nonce } = encryptGroupMessage(
        content,
        currentChat.value.groupKey
      )

      socket.emit('chat:group', {
        groupId: currentChat.value.id,
        encryptedContent,
        nonce
      })
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
    setupSocketListeners,
    sendTyping
  }
})
