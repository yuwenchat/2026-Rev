<template>
  <div class="chat-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="app-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32">
            <path d="M50 8L10 40V85C10 88.3 12.7 91 16 91H84C87.3 91 90 88.3 90 85V40L50 8Z" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <ellipse cx="50" cy="58" rx="22" ry="16" fill="currentColor"/>
            <path d="M32 62C32 62 28 70 24 74" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/>
          </svg>
        </div>
        <div class="header-actions">
          <router-link v-if="userStore.user?.isAdmin" to="/admin" class="icon-btn" :title="t('adminPanel')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </router-link>
          <button class="icon-btn" @click="showSettings = true" :title="t('settings')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83"/></svg>
          </button>
        </div>
      </div>

      <div class="my-code">
        <span>{{ t('myCode') }}:</span>
        <strong>{{ userStore.user?.friendCode }}</strong>
        <button @click="copyCode" class="copy-btn" title="Copy">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
      </div>

      <div class="actions">
        <button @click="showAddFriend = true">{{ t('addFriend') }}</button>
        <button @click="showCreateGroup = true">{{ t('newGroup') }}</button>
        <button @click="showJoinGroup = true">{{ t('joinGroup') }}</button>
      </div>

      <!-- Friend requests -->
      <div v-if="chatStore.pendingReceived.length" class="section">
        <h3>{{ t('friendRequests') }}</h3>
        <div
          v-for="req in chatStore.pendingReceived"
          :key="req.friendshipId"
          class="request-item"
        >
          <span>{{ req.username }}</span>
          <div class="request-actions">
            <button @click="acceptRequest(req.friendshipId)" class="accept">{{ t('accept') }}</button>
            <button @click="rejectRequest(req.friendshipId)" class="reject">{{ t('reject') }}</button>
          </div>
        </div>
      </div>

      <!-- Friends -->
      <div class="section">
        <h3>{{ t('friends') }}</h3>
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
              {{ chatStore.onlineFriends.has(friend.id) ? t('online') : t('offline') }}
            </span>
          </div>
        </div>
        <p v-if="!chatStore.friends.length" class="empty">{{ t('noFriends') }}</p>
      </div>

      <!-- Groups -->
      <div class="section">
        <h3>{{ t('groups') }}</h3>
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
        <p v-if="!chatStore.groups.length" class="empty">{{ t('noGroups') }}</p>
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
          <h3>{{ t('selectChat') }}</h3>
          <p>{{ t('encrypted') }}</p>
        </div>
      </div>

      <!-- Chat window -->
      <template v-else>
        <div class="chat-header">
          <div class="chat-info">
            <h3>{{ chatStore.currentChat.name }}</h3>
            <span v-if="chatStore.currentChat.type === 'group'" class="group-code">
              {{ t('groupCode') }}: {{ chatStore.currentChat.groupCode }}
            </span>
            <span v-else class="online-status" :class="{ online: chatStore.onlineFriends.has(chatStore.currentChat.id) }">
              {{ chatStore.onlineFriends.has(chatStore.currentChat.id) ? t('online') : t('offline') }}
            </span>
          </div>
        </div>

        <div class="messages" ref="messagesContainer">
          <div
            v-for="msg in chatStore.messages"
            :key="msg.id"
            class="message"
            :class="{ own: msg.senderId === userStore.user?.id }"
            @contextmenu="showContextMenu($event, msg)"
          >
            <span v-if="chatStore.currentChat.type === 'group' && msg.senderId !== userStore.user?.id" class="sender">
              {{ msg.senderName }}
            </span>
            <div class="bubble">
              <template v-if="parseMessage(msg.content).file">
                <div class="file-message">
                  <img
                    v-if="isImage(parseMessage(msg.content).file.type)"
                    :src="parseMessage(msg.content).file.url"
                    :alt="parseMessage(msg.content).file.name"
                    class="message-image"
                    @click="openImage(parseMessage(msg.content).file.url)"
                  />
                  <a
                    v-else
                    :href="parseMessage(msg.content).file.url"
                    target="_blank"
                    class="file-download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="18"/><line x1="15" y1="15" x2="12" y2="18"/></svg>
                    <span>{{ parseMessage(msg.content).file.name }}</span>
                    <small>{{ formatFileSize(parseMessage(msg.content).file.size) }}</small>
                  </a>
                </div>
                <div v-if="parseMessage(msg.content).text" class="file-text">
                  {{ parseMessage(msg.content).text }}
                </div>
              </template>
              <template v-else>
                {{ msg.content }}
              </template>
            </div>
            <div class="message-meta">
              <span class="time">{{ formatTime(msg.createdAt) }}</span>
              <span v-if="msg.editedAt" class="edited-indicator">({{ t('edited') }})</span>
              <span v-if="msg.senderId === userStore.user?.id && chatStore.currentChat?.type === 'private'" class="read-status" :class="msg.status">
                {{ msg.status === 'read' ? t('read') : msg.status === 'delivered' ? t('delivered') : t('sent') }}
              </span>
            </div>
          </div>
        </div>

        <form class="message-input" @submit.prevent="sendMessage">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelect"
            style="display: none"
            accept="image/*,.pdf,.txt,.zip"
          />
          <button type="button" class="attach-btn" @click="$refs.fileInput.click()" :disabled="isUploading">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input
            v-model="newMessage"
            type="text"
            :placeholder="t('typeMessage')"
            @input="handleTyping"
          />
          <button type="submit" :disabled="!newMessage.trim() && !isUploading">
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

    <!-- Context Menu for messages -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button @click="startEdit(contextMenu.message)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        {{ t('edit') }}
      </button>
      <button @click="confirmDelete(contextMenu.message)" class="danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        {{ t('delete') }}
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal delete-modal">
        <h3>{{ t('deleteMessage') }}</h3>
        <p>{{ t('confirmDelete') }}</p>
        <label class="checkbox-label">
          <input type="checkbox" v-model="deleteForBoth" />
          {{ t('alsoDeleteForOther') }}
        </label>
        <div class="modal-actions">
          <button @click="cancelDelete" class="btn-secondary">{{ t('cancel') }}</button>
          <button @click="executeDelete" class="btn-danger">{{ t('delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Edit Message Modal -->
    <div v-if="editingMessage" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal edit-modal">
        <h3>{{ t('editMessage') }}</h3>
        <input
          v-model="editContent"
          type="text"
          class="edit-input"
          @keyup.enter="saveEdit"
          @keyup.esc="cancelEdit"
          autofocus
        />
        <div class="modal-actions">
          <button @click="cancelEdit" class="btn-secondary">{{ t('cancel') }}</button>
          <button @click="saveEdit" class="btn-primary" :disabled="!editContent.trim()">{{ t('save') }}</button>
        </div>
      </div>
    </div>

    <!-- Unlock Modal (for session restoration) -->
    <div v-if="showUnlockModal" class="modal-overlay">
      <div class="modal unlock-modal">
        <h3>{{ t('unlockTitle') || '解锁 / Unlock' }}</h3>
        <p>{{ t('unlockDescription') || '请输入密码解锁您的私钥 / Enter password to unlock your private key' }}</p>
        <input
          v-model="unlockPassword"
          type="password"
          class="edit-input"
          :placeholder="t('password') || 'Password'"
          @keyup.enter="handleUnlock"
          autofocus
        />
        <p v-if="unlockError" class="error-text">{{ unlockError }}</p>
        <div class="modal-actions">
          <button @click="handleLogout" class="btn-secondary">{{ t('logout') || '登出 / Logout' }}</button>
          <button @click="handleUnlock" class="btn-primary" :disabled="!unlockPassword || unlockLoading">
            {{ unlockLoading ? (t('unlocking') || '解锁中...') : (t('unlock') || '解锁 / Unlock') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useChatStore } from '../stores/chat.js'
import { useLanguageStore } from '../stores/language.js'
import AddFriendModal from '../components/AddFriendModal.vue'
import CreateGroupModal from '../components/CreateGroupModal.vue'
import JoinGroupModal from '../components/JoinGroupModal.vue'
import SettingsModal from '../components/SettingsModal.vue'

const router = useRouter()

const userStore = useUserStore()
const chatStore = useChatStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

const sidebarOpen = ref(false)
const showAddFriend = ref(false)
const showCreateGroup = ref(false)
const showJoinGroup = ref(false)
const showSettings = ref(false)

const newMessage = ref('')
const messagesContainer = ref(null)
const fileInput = ref(null)
const isUploading = ref(false)

// Edit/Delete state
const editingMessage = ref(null)
const editContent = ref('')
const showDeleteModal = ref(false)
const deleteMessageId = ref(null)
const deleteForBoth = ref(false)
const contextMenu = ref({ show: false, x: 0, y: 0, message: null })

// Unlock modal state
const showUnlockModal = ref(false)
const unlockPassword = ref('')
const unlockError = ref('')
const unlockLoading = ref(false)

let typingTimeout = null

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

async function selectChat(type, contact) {
  await chatStore.selectChat(type, contact)
  sidebarOpen.value = false
  // Mark messages as read after loading
  setTimeout(() => chatStore.markMessagesAsRead(), 100)
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

function parseMessage(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && parsed.file) {
      return parsed
    }
  } catch {
    // Not JSON, regular text message
  }
  return { text: content, file: null }
}

function isImage(mimeType) {
  return mimeType && mimeType.startsWith('image/')
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function openImage(url) {
  window.open(url, '_blank')
}

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    alert(t.value('fileTooLarge'))
    return
  }

  isUploading.value = true
  try {
    await chatStore.sendFile(file)
  } catch (err) {
    alert(t.value('uploadFailed') + ': ' + err.message)
  } finally {
    isUploading.value = false
    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Context menu for messages
function showContextMenu(event, msg) {
  event.preventDefault()
  // Only show for own messages
  if (msg.senderId !== userStore.user?.id) return

  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message: msg
  }
}

function hideContextMenu() {
  contextMenu.value.show = false
}

// Edit message
function startEdit(msg) {
  hideContextMenu()
  // Get the text content (not file info)
  const parsed = parseMessage(msg.content)
  editingMessage.value = msg
  editContent.value = parsed.file ? parsed.text : msg.content
}

function cancelEdit() {
  editingMessage.value = null
  editContent.value = ''
}

function saveEdit() {
  if (!editingMessage.value || !editContent.value.trim()) return
  chatStore.editMessage(editingMessage.value.id, editContent.value)
  cancelEdit()
}

// Delete message
function confirmDelete(msg) {
  hideContextMenu()
  deleteMessageId.value = msg.id
  deleteForBoth.value = false
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  deleteMessageId.value = null
  deleteForBoth.value = false
}

function executeDelete() {
  if (!deleteMessageId.value) return
  chatStore.deleteMessage(deleteMessageId.value, deleteForBoth.value)
  cancelDelete()
}

// Close context menu when clicking outside
function handleGlobalClick(event) {
  if (contextMenu.value.show) {
    hideContextMenu()
  }
}

// Unlock session
async function handleUnlock() {
  if (!unlockPassword.value || unlockLoading.value) return

  unlockLoading.value = true
  unlockError.value = ''

  try {
    const success = await userStore.restoreSession(unlockPassword.value)
    if (success) {
      showUnlockModal.value = false
      unlockPassword.value = ''
      // Load contacts and setup socket after successful unlock
      await chatStore.loadContacts()
      chatStore.setupSocketListeners()
    } else {
      unlockError.value = langStore.t('invalidPassword') || '密码错误 / Invalid password'
    }
  } catch (err) {
    unlockError.value = err.message || langStore.t('invalidPassword') || '密码错误 / Invalid password'
  } finally {
    unlockLoading.value = false
  }
}

// Logout and go to login page
function handleLogout() {
  userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  // Check if we need to restore session (has token but no private key)
  if (userStore.token && !userStore.privateKey) {
    showUnlockModal.value = true
    return // Don't load contacts until unlocked
  }

  await chatStore.loadContacts()
  chatStore.setupSocketListeners()
  document.addEventListener('click', handleGlobalClick)
})
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

.app-logo {
  color: var(--primary);
  display: flex;
  align-items: center;
}

.app-logo svg {
  width: 32px;
  height: 32px;
}

.header-actions {
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
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

.message-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
}

.time {
  font-size: 0.625rem;
  color: var(--text-secondary);
}

.read-status {
  font-size: 0.625rem;
  color: var(--text-secondary);
}

.read-status.read {
  color: var(--success);
}

.read-status.delivered {
  color: var(--primary);
}

/* File messages */
.file-message {
  margin-bottom: 0.5rem;
}

.message-image {
  max-width: 250px;
  max-height: 250px;
  border-radius: 8px;
  cursor: pointer;
}

.file-download {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}

.message.own .file-download {
  background: rgba(255, 255, 255, 0.2);
}

.file-download span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-download small {
  font-size: 0.7rem;
  opacity: 0.7;
}

.file-text {
  margin-top: 0.5rem;
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

.attach-btn {
  width: 44px;
  height: 44px;
  background: var(--bg);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attach-btn:hover {
  background: var(--border);
  color: var(--text);
}

.attach-btn:disabled {
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

/* Edited indicator */
.edited-indicator {
  font-size: 0.625rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 140px;
  overflow: hidden;
}

.context-menu button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
}

.context-menu button:hover {
  background: var(--bg);
}

.context-menu button.danger {
  color: var(--error);
}

.context-menu button.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

.modal p {
  margin: 0 0 1rem;
  color: var(--text-secondary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-primary {
  padding: 0.5rem 1rem;
  background: var(--primary);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: var(--error);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

.btn-danger:hover {
  opacity: 0.9;
}

.edit-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
  margin-bottom: 1rem;
}

.edit-input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Unlock modal */
.unlock-modal {
  text-align: center;
}

.unlock-modal h3 {
  color: var(--primary);
}

.unlock-modal p {
  font-size: 0.875rem;
}

.error-text {
  color: var(--error);
  font-size: 0.875rem;
  margin: -0.5rem 0 1rem;
}
</style>
