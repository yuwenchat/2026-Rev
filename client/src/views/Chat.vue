<template>
  <div class="chat-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <h2>YuwenChat</h2>
        <button class="icon-btn" @click="showSettings = true" title="Settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/></svg>
        </button>
      </div>

      <div class="my-code">
        <span>My Code:</span>
        <strong>{{ userStore.user?.friendCode }}</strong>
        <button @click="copyCode" class="copy-btn" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
      </div>

      <div class="actions">
        <button @click="showAddFriend = true">Add Friend</button>
        <button @click="showCreateGroup = true">New Group</button>
        <button @click="showJoinGroup = true">Join Group</button>
      </div>

      <!-- Friend requests -->
      <div v-if="chatStore.pendingReceived.length" class="section">
        <h3>Friend Requests</h3>
        <div
          v-for="req in chatStore.pendingReceived"
          :key="req.friendshipId"
          class="request-item"
        >
          <span>{{ req.username }}</span>
          <div class="request-actions">
            <button @click="acceptRequest(req.friendshipId)" class="accept">Accept</button>
            <button @click="rejectRequest(req.friendshipId)" class="reject">Reject</button>
          </div>
        </div>
      </div>

      <!-- Friends -->
      <div class="section">
        <h3>Friends</h3>
        <div
          v-for="friend in chatStore.friends"
          :key="friend.id"
          class="contact-item"
          :class="{ active: chatStore.currentChat?.type === 'private' && chatStore.currentChat?.id === friend.id }"
          @click="selectChat('private', friend)"
        >
          <div class="avatar">{{ friend.username[0].toUpperCase() }}</div>
          <div class="contact-info">
            <span class="name">{{ friend.username }}</span>
            <span class="status" :class="{ online: chatStore.onlineFriends.has(friend.id) }">
              {{ chatStore.onlineFriends.has(friend.id) ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
        <p v-if="!chatStore.friends.length" class="empty">No friends yet</p>
      </div>

      <!-- Groups -->
      <div class="section">
        <h3>Groups</h3>
        <div
          v-for="group in chatStore.groups"
          :key="group.id"
          class="contact-item"
          :class="{ active: chatStore.currentChat?.type === 'group' && chatStore.currentChat?.id === group.id }"
          @click="selectChat('group', group)"
        >
          <div class="avatar group">{{ group.name[0].toUpperCase() }}</div>
          <div class="contact-info">
            <span class="name">{{ group.name }}</span>
            <span class="code">{{ group.groupCode }}</span>
          </div>
        </div>
        <p v-if="!chatStore.groups.length" class="empty">No groups yet</p>
      </div>
    </aside>

    <!-- Main chat area -->
    <main class="chat-main">
      <!-- Mobile header -->
      <div class="mobile-header">
        <button @click="sidebarOpen = !sidebarOpen" class="menu-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h3>{{ chatStore.currentChat?.name || 'YuwenChat' }}</h3>
      </div>

      <!-- No chat selected -->
      <div v-if="!chatStore.currentChat" class="no-chat">
        <div class="no-chat-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <h3>Select a chat to start messaging</h3>
          <p>Your messages are end-to-end encrypted</p>
        </div>
      </div>

      <!-- Chat window -->
      <template v-else>
        <div class="chat-header">
          <div class="chat-info">
            <h3>{{ chatStore.currentChat.name }}</h3>
            <span v-if="chatStore.currentChat.type === 'group'" class="group-code">
              Code: {{ chatStore.currentChat.groupCode }}
            </span>
            <span v-else class="online-status" :class="{ online: chatStore.onlineFriends.has(chatStore.currentChat.id) }">
              {{ chatStore.onlineFriends.has(chatStore.currentChat.id) ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>

        <div class="messages" ref="messagesContainer">
          <div
            v-for="msg in chatStore.messages"
            :key="msg.id"
            class="message"
            :class="{ own: msg.senderId === userStore.user?.id }"
          >
            <span v-if="chatStore.currentChat.type === 'group' && msg.senderId !== userStore.user?.id" class="sender">
              {{ msg.senderName }}
            </span>
            <div class="bubble">
              {{ msg.content }}
            </div>
            <span class="time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>

        <form class="message-input" @submit.prevent="sendMessage">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type a message..."
            @input="handleTyping"
          />
          <button type="submit" :disabled="!newMessage.trim()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </template>
    </main>

    <!-- Modals -->
    <AddFriendModal v-if="showAddFriend" @close="showAddFriend = false" />
    <CreateGroupModal v-if="showCreateGroup" @close="showCreateGroup = false" />
    <JoinGroupModal v-if="showJoinGroup" @close="showJoinGroup = false" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useChatStore } from '../stores/chat.js'
import AddFriendModal from '../components/AddFriendModal.vue'
import CreateGroupModal from '../components/CreateGroupModal.vue'
import JoinGroupModal from '../components/JoinGroupModal.vue'
import SettingsModal from '../components/SettingsModal.vue'

const userStore = useUserStore()
const chatStore = useChatStore()

const sidebarOpen = ref(false)
const showAddFriend = ref(false)
const showCreateGroup = ref(false)
const showJoinGroup = ref(false)
const showSettings = ref(false)

const newMessage = ref('')
const messagesContainer = ref(null)

let typingTimeout = null

onMounted(async () => {
  await chatStore.loadContacts()
  chatStore.setupSocketListeners()
})

watch(() => chatStore.messages.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
})

function copyCode() {
  navigator.clipboard.writeText(userStore.user?.friendCode || '')
}

function selectChat(type, contact) {
  chatStore.selectChat(type, contact)
  sidebarOpen.value = false
}

async function acceptRequest(requestId) {
  await chatStore.acceptFriendRequest(requestId)
}

async function rejectRequest(friendshipId) {
  await chatStore.removeFriend(friendshipId)
}

function sendMessage() {
  if (!newMessage.value.trim()) return
  chatStore.sendMessage(newMessage.value)
  newMessage.value = ''
}

function handleTyping() {
  chatStore.sendTyping(true)
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    chatStore.sendTyping(false)
  }, 1000)
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 280px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
}

.icon-btn:hover {
  background: var(--bg);
  color: var(--text);
}

.my-code {
  padding: 0.75rem 1rem;
  background: var(--bg);
  margin: 0.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.my-code strong {
  color: var(--primary);
  font-family: monospace;
}

.copy-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  margin-left: auto;
}

.copy-btn:hover {
  color: var(--primary);
}

.actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  flex-wrap: wrap;
}

.actions button {
  flex: 1;
  min-width: 80px;
  padding: 0.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.actions button:hover {
  opacity: 0.9;
}

.section {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.section h3 {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin: 0.5rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
}

.contact-item:hover {
  background: var(--bg);
}

.contact-item.active {
  background: var(--primary);
  color: white;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar.group {
  border-radius: 12px;
  background: var(--secondary);
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-info .name {
  display: block;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-info .status,
.contact-info .code {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.contact-item.active .status,
.contact-item.active .code {
  color: rgba(255, 255, 255, 0.8);
}

.status.online {
  color: var(--success);
}

.request-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.request-actions {
  display: flex;
  gap: 0.5rem;
}

.request-actions button {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.request-actions .accept {
  background: var(--success);
  color: white;
}

.request-actions .reject {
  background: var(--error);
  color: white;
}

.empty {
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

/* Main chat area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mobile-header {
  display: none;
  padding: 1rem;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  align-items: center;
  gap: 1rem;
}

.menu-btn {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
}

.no-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-chat-content {
  text-align: center;
  color: var(--text-secondary);
}

.no-chat-content svg {
  opacity: 0.5;
  margin-bottom: 1rem;
}

.no-chat-content h3 {
  margin: 0 0 0.5rem;
  color: var(--text);
}

.chat-header {
  padding: 1rem;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}

.chat-info h3 {
  margin: 0;
  font-size: 1rem;
}

.group-code,
.online-status {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.online-status.online {
  color: var(--success);
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.message.own {
  align-self: flex-end;
  align-items: flex-end;
}

.sender {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.bubble {
  padding: 0.75rem 1rem;
  background: var(--card-bg);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  word-break: break-word;
}

.message.own .bubble {
  background: var(--primary);
  color: white;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
}

.time {
  font-size: 0.625rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* Message input */
.message-input {
  padding: 1rem;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.75rem;
}

.message-input input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 24px;
  color: var(--text);
  font-size: 1rem;
}

.message-input input:focus {
  outline: none;
  border-color: var(--primary);
}

.message-input button {
  width: 44px;
  height: 44px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -280px;
    top: 0;
    bottom: 0;
    z-index: 100;
    transition: left 0.3s;
  }

  .sidebar.open {
    left: 0;
  }

  .mobile-header {
    display: flex;
  }

  .chat-header {
    display: none;
  }

  .message {
    max-width: 85%;
  }
}
</style>
