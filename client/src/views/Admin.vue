<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>Admin Panel</h1>
      <button @click="goBack" class="btn-back">Back to Chat</button>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.users }}</div>
        <div class="stat-label">Total Users</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.groups }}</div>
        <div class="stat-label">Groups</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.messages }}</div>
        <div class="stat-label">Messages</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.friendships }}</div>
        <div class="stat-label">Friendships</div>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="users-section">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Friend Code</th>
              <th>Admin</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td><code>{{ user.friend_code }}</code></td>
              <td>
                <span :class="['badge', user.is_admin ? 'badge-admin' : 'badge-user']">
                  {{ user.is_admin ? 'Admin' : 'User' }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <button @click="editUser(user)" class="btn-small">Edit</button>
                <button @click="deleteUser(user)" class="btn-small btn-danger">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Groups Tab -->
      <div v-if="activeTab === 'groups'" class="groups-section">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Code</th>
              <th>Creator</th>
              <th>Members</th>
              <th>Messages</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groups" :key="group.id">
              <td>{{ group.id }}</td>
              <td>{{ group.name }}</td>
              <td><code>{{ group.group_code }}</code></td>
              <td>{{ group.creator_name || '-' }}</td>
              <td>{{ group.member_count }}</td>
              <td>{{ group.message_count }}</td>
              <td>{{ formatDate(group.created_at) }}</td>
              <td>
                <button @click="deleteGroup(group)" class="btn-small btn-danger">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Messages Tab -->
      <div v-if="activeTab === 'messages'" class="messages-section">
        <div class="messages-info">
          Showing {{ messages.length }} of {{ messagesTotal }} messages
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="msg in messages" :key="msg.id">
              <td>{{ msg.id }}</td>
              <td>{{ msg.sender_name || '-' }}</td>
              <td>{{ msg.receiver_name || msg.group_name || '-' }}</td>
              <td>
                <span :class="['badge', msg.group_id ? 'badge-group' : 'badge-private']">
                  {{ msg.group_id ? 'Group' : 'Private' }}
                </span>
              </td>
              <td>{{ msg.status }}</td>
              <td>{{ formatDate(msg.created_at) }}</td>
              <td>
                <button @click="deleteMessage(msg)" class="btn-small btn-danger">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination" v-if="messagesTotal > 50">
          <button
            @click="loadMessages(messagesOffset - 50)"
            :disabled="messagesOffset === 0"
            class="btn-small"
          >
            Previous
          </button>
          <button
            @click="loadMessages(messagesOffset + 50)"
            :disabled="messagesOffset + 50 >= messagesTotal"
            class="btn-small"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="editingUser" class="modal-overlay" @click.self="editingUser = null">
      <div class="modal">
        <h3>Edit User: {{ editingUser.username }}</h3>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>Username</label>
            <input v-model="editForm.username" type="text" />
          </div>
          <div class="form-group">
            <label>New Password (leave empty to keep)</label>
            <input v-model="editForm.password" type="password" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="editForm.isAdmin" type="checkbox" />
              Admin
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="editingUser = null" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api.js'

const router = useRouter()

const tabs = [
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { id: 'messages', label: 'Messages' }
]

const activeTab = ref('users')
const stats = ref({ users: 0, groups: 0, messages: 0, friendships: 0 })
const users = ref([])
const groups = ref([])
const messages = ref([])
const messagesTotal = ref(0)
const messagesOffset = ref(0)

const editingUser = ref(null)
const editForm = ref({ username: '', password: '', isAdmin: false })

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString()
}

function goBack() {
  router.push('/chat')
}

async function loadStats() {
  try {
    stats.value = await api.adminGetStats()
  } catch (err) {
    console.error('Failed to load stats:', err)
  }
}

async function loadUsers() {
  try {
    users.value = await api.adminGetUsers()
  } catch (err) {
    console.error('Failed to load users:', err)
  }
}

async function loadGroups() {
  try {
    groups.value = await api.adminGetGroups()
  } catch (err) {
    console.error('Failed to load groups:', err)
  }
}

async function loadMessages(offset = 0) {
  try {
    messagesOffset.value = offset
    const result = await api.adminGetMessages({ offset, limit: 50 })
    messages.value = result.messages
    messagesTotal.value = result.total
  } catch (err) {
    console.error('Failed to load messages:', err)
  }
}

function editUser(user) {
  editingUser.value = user
  editForm.value = {
    username: user.username,
    password: '',
    isAdmin: !!user.is_admin
  }
}

async function saveUser() {
  try {
    const data = {}
    if (editForm.value.username !== editingUser.value.username) {
      data.username = editForm.value.username
    }
    if (editForm.value.password) {
      data.password = editForm.value.password
    }
    if (editForm.value.isAdmin !== !!editingUser.value.is_admin) {
      data.isAdmin = editForm.value.isAdmin
    }

    if (Object.keys(data).length > 0) {
      await api.adminUpdateUser(editingUser.value.id, data)
      await loadUsers()
    }
    editingUser.value = null
  } catch (err) {
    alert('Failed to update user: ' + err.message)
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return

  try {
    await api.adminDeleteUser(user.id)
    await loadUsers()
    await loadStats()
  } catch (err) {
    alert('Failed to delete user: ' + err.message)
  }
}

async function deleteGroup(group) {
  if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return

  try {
    await api.adminDeleteGroup(group.id)
    await loadGroups()
    await loadStats()
  } catch (err) {
    alert('Failed to delete group: ' + err.message)
  }
}

async function deleteMessage(msg) {
  if (!confirm('Delete this message? This cannot be undone.')) return

  try {
    await api.adminDeleteMessage(msg.id)
    await loadMessages(messagesOffset.value)
    await loadStats()
  } catch (err) {
    alert('Failed to delete message: ' + err.message)
  }
}

onMounted(() => {
  loadStats()
  loadUsers()
  loadGroups()
  loadMessages()
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.admin-header h1 {
  margin: 0;
  color: #333;
}

.btn-back {
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-back:hover {
  background: #5558e3;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #6366f1;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
}

.tab.active {
  background: #6366f1;
  color: white;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f9f9f9;
  font-weight: 600;
  color: #333;
}

.data-table code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-admin {
  background: #dcfce7;
  color: #166534;
}

.badge-user {
  background: #e0e7ff;
  color: #3730a3;
}

.badge-group {
  background: #fef3c7;
  color: #92400e;
}

.badge-private {
  background: #dbeafe;
  color: #1e40af;
}

.btn-small {
  padding: 4px 10px;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #e5e7eb;
  color: #374151;
  margin-right: 4px;
}

.btn-small:hover {
  background: #d1d5db;
}

.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.btn-danger:hover {
  background: #fecaca;
}

.messages-info {
  margin-bottom: 12px;
  color: #666;
}

.pagination {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

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
  z-index: 1000;
}

.modal {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
}

.modal h3 {
  margin: 0 0 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save {
  padding: 10px 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save:hover {
  background: #5558e3;
}
</style>
