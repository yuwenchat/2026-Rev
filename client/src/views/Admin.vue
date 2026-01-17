<template>
  <div class="admin-container">
    <header class="admin-header">
      <h1>{{ t('adminPanel') }}</h1>
      <button @click="goBack" class="btn-back">{{ t('backToChat') }}</button>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.users }}</div>
        <div class="stat-label">{{ t('totalUsers') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.groups }}</div>
        <div class="stat-label">{{ t('groups') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.messages }}</div>
        <div class="stat-label">{{ t('messages') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.friendships }}</div>
        <div class="stat-label">{{ t('friendships') }}</div>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ t(tab.label) }}
      </button>
    </div>

    <div class="tab-content">
      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="users-section">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ t('username') }}</th>
              <th>{{ t('friendCode') }}</th>
              <th>{{ t('type') }}</th>
              <th>{{ t('created') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.id }}</td>
              <td>{{ user.username }}</td>
              <td><code>{{ user.friend_code }}</code></td>
              <td>
                <span :class="['badge', user.is_admin ? 'badge-admin' : 'badge-user']">
                  {{ user.is_admin ? t('admin') : t('user') }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <button @click="editUser(user)" class="btn-small">{{ t('edit') }}</button>
                <button @click="deleteUser(user)" class="btn-small btn-danger">{{ t('delete') }}</button>
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
              <th>{{ t('groupName') }}</th>
              <th>{{ t('groupCode') }}</th>
              <th>{{ t('members') }}</th>
              <th>{{ t('messages') }}</th>
              <th>{{ t('created') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="group in groups" :key="group.id">
              <td>{{ group.id }}</td>
              <td>{{ group.name }}</td>
              <td><code>{{ group.group_code }}</code></td>
              <td>{{ group.member_count }}</td>
              <td>{{ group.message_count }}</td>
              <td>{{ formatDate(group.created_at) }}</td>
              <td>
                <button @click="deleteGroup(group)" class="btn-small btn-danger">{{ t('delete') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Messages Tab -->
      <div v-if="activeTab === 'messages'" class="messages-section">
        <div class="messages-info">
          {{ messages.length }} / {{ messagesTotal }}
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ t('from') }}</th>
              <th>{{ t('to') }}</th>
              <th>{{ t('type') }}</th>
              <th>{{ t('status') }}</th>
              <th>{{ t('created') }}</th>
              <th>{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="msg in messages" :key="msg.id">
              <td>{{ msg.id }}</td>
              <td>{{ msg.sender_name || '-' }}</td>
              <td>{{ msg.receiver_name || msg.group_name || '-' }}</td>
              <td>
                <span :class="['badge', msg.group_id ? 'badge-group' : 'badge-private']">
                  {{ msg.group_id ? t('group') : t('private') }}
                </span>
              </td>
              <td>{{ msg.status }}</td>
              <td>{{ formatDate(msg.created_at) }}</td>
              <td>
                <button @click="deleteMessage(msg)" class="btn-small btn-danger">{{ t('delete') }}</button>
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
            {{ t('previous') }}
          </button>
          <button
            @click="loadMessages(messagesOffset + 50)"
            :disabled="messagesOffset + 50 >= messagesTotal"
            class="btn-small"
          >
            {{ t('next') }}
          </button>
        </div>
      </div>

      <!-- Updates Tab -->
      <div v-if="activeTab === 'updates'" class="updates-section">
        <!-- Current Status -->
        <div class="update-status">
          <h3>{{ t('currentVersion') }}</h3>
          <div class="version-info" v-if="updateStatus">
            <div class="info-row">
              <span class="label">{{ t('branch') }}:</span>
              <code>{{ updateStatus.currentBranch }}</code>
            </div>
            <div class="info-row">
              <span class="label">{{ t('commit') }}:</span>
              <code>{{ updateStatus.currentCommitShort }}</code>
              <span class="commit-msg">{{ updateStatus.commitMessage }}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span>{{ formatDate(updateStatus.commitDate) }}</span>
            </div>
            <div v-if="updateStatus.hasLocalChanges" class="warning-box">
              {{ t('localChanges') }}: {{ updateStatus.localChanges }} files
            </div>
          </div>
        </div>

        <!-- Branch Selection -->
        <div class="branch-selection">
          <h3>{{ t('selectBranch') }}</h3>
          <div class="branch-list" v-if="branches.length">
            <div
              v-for="branch in branches"
              :key="branch.name"
              :class="['branch-item', { selected: selectedBranch === branch.name }]"
              @click="selectedBranch = branch.name"
            >
              <div class="branch-name">{{ branch.name }}</div>
              <div class="branch-info">
                <code>{{ branch.shortSha }}</code>
                <span v-if="branch.message" class="branch-msg">{{ branch.message }}</span>
              </div>
              <div class="branch-date" v-if="branch.date">{{ formatDate(branch.date) }}</div>
            </div>
          </div>
          <div v-else class="loading">Loading branches...</div>
        </div>

        <!-- Check Updates -->
        <div class="update-actions">
          <button
            @click="checkForUpdates"
            :disabled="!selectedBranch || checkingUpdates"
            class="btn-check"
          >
            {{ checkingUpdates ? '...' : t('checkUpdates') }}
          </button>
        </div>

        <!-- Update Results -->
        <div v-if="updateCheck" class="update-results">
          <div v-if="updateCheck.hasUpdates" class="has-updates">
            <h4>{{ t('updatesAvailable') }}</h4>

            <div v-if="!updateCheck.databaseSafe" class="warning-box">
              {{ t('databaseWarning') }}
            </div>

            <div v-if="updateCheck.commits.length" class="commits-list">
              <h5>{{ t('newCommits') }} ({{ updateCheck.commits.length }})</h5>
              <div v-for="commit in updateCheck.commits" :key="commit.hash" class="commit-item">
                <code>{{ commit.hash }}</code>
                <span>{{ commit.message }}</span>
              </div>
            </div>

            <div v-if="updateCheck.filesChanged.length" class="files-list">
              <h5>{{ t('filesChanged') }} ({{ updateCheck.filesChanged.length }})</h5>
              <div v-for="file in updateCheck.filesChanged.slice(0, 20)" :key="file.path" class="file-item">
                <span :class="['file-status', file.status]">{{ file.status[0].toUpperCase() }}</span>
                <span>{{ file.path }}</span>
              </div>
              <div v-if="updateCheck.filesChanged.length > 20" class="more-files">
                +{{ updateCheck.filesChanged.length - 20 }} more files
              </div>
            </div>

            <div class="update-options">
              <div v-if="updateStatus?.hasLocalChanges" class="option-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="stashLocal" />
                  {{ t('stashChanges') }}
                </label>
              </div>
              <div class="option-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="autoBuild" />
                  {{ t('autoBuild') }}
                </label>
              </div>
              <div class="option-row">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="autoRestart" />
                  {{ t('autoRestart') }}
                </label>
              </div>
            </div>

            <button
              @click="applyUpdate"
              :disabled="applyingUpdate || (updateStatus?.hasLocalChanges && !stashLocal)"
              class="btn-apply"
            >
              {{ applyingUpdate ? t('updating') : t('applyUpdate') }}
            </button>

            <!-- Progress Display -->
            <div v-if="applyingUpdate && updateProgress" class="update-progress">
              <div class="progress-stage">{{ getStageText(updateProgress.stage) }}</div>
              <div class="progress-message">{{ updateProgress.message }}</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: getProgressPercent() + '%' }"></div>
              </div>
            </div>
          </div>

          <div v-else class="no-updates">
            <span class="success-icon">✓</span>
            {{ t('noUpdates') }}
          </div>
        </div>

        <!-- Update Result Message -->
        <div v-if="updateResult" :class="['update-message', updateResult.success ? 'success' : 'error']">
          {{ updateResult.message }}
          <div v-if="updateResult.success && updateResult.clientChanged" class="change-info">
            {{ t('clientChanged') }}
          </div>
          <div v-if="updateResult.success && updateResult.serverChanged" class="change-info">
            {{ t('serverChanged') }}
          </div>
          <div v-if="updateResult.success && !updateResult.buildSuccess" class="build-warning">
            {{ t('buildFailed') }}: {{ updateResult.buildOutput }}
          </div>
          <div v-if="updateResult.willRestart" class="restart-notice">
            {{ t('serverRestarting') }}
          </div>
        </div>

        <!-- Server Restarting Overlay -->
        <div v-if="serverRestarting" class="restart-overlay">
          <div class="restart-modal">
            <div class="spinner"></div>
            <div class="restart-text">{{ t('serverRestarting') }}</div>
            <div class="reconnect-text">{{ t('reconnecting') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="editingUser" class="modal-overlay" @click.self="editingUser = null">
      <div class="modal">
        <h3>{{ t('editUser') }}: {{ editingUser.username }}</h3>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label>{{ t('username') }}</label>
            <input v-model="editForm.username" type="text" />
          </div>
          <div class="form-group">
            <label>{{ t('newPassword') }}</label>
            <input v-model="editForm.password" type="password" />
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="editForm.isAdmin" type="checkbox" />
              {{ t('admin') }}
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="editingUser = null" class="btn-cancel">{{ t('cancel') }}</button>
            <button type="submit" class="btn-save">{{ t('save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../utils/api.js'
import { useLanguageStore } from '../stores/language.js'

const router = useRouter()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

const tabs = [
  { id: 'users', label: 'users' },
  { id: 'groups', label: 'groups' },
  { id: 'messages', label: 'messages' },
  { id: 'updates', label: 'updates' }
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

// Updates state
const updateStatus = ref(null)
const branches = ref([])
const selectedBranch = ref('')
const checkingUpdates = ref(false)
const updateCheck = ref(null)
const applyingUpdate = ref(false)
const stashLocal = ref(false)
const autoBuild = ref(true)
const autoRestart = ref(true)
const updateResult = ref(null)
const updateProgress = ref(null)
const serverRestarting = ref(false)
let progressInterval = null

function formatDate(dateStr) {
  if (!dateStr) return '-'
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
    alert(t.value('updateFailed') + ': ' + err.message)
  }
}

async function deleteUser(user) {
  if (!confirm(t.value('confirmDeleteUser', { username: user.username }))) return

  try {
    await api.adminDeleteUser(user.id)
    await loadUsers()
    await loadStats()
  } catch (err) {
    alert(err.message)
  }
}

async function deleteGroup(group) {
  if (!confirm(t.value('confirmDeleteGroup', { name: group.name }))) return

  try {
    await api.adminDeleteGroup(group.id)
    await loadGroups()
    await loadStats()
  } catch (err) {
    alert(err.message)
  }
}

async function deleteMessage(msg) {
  if (!confirm(t.value('confirmDeleteMessage'))) return

  try {
    await api.adminDeleteMessage(msg.id)
    await loadMessages(messagesOffset.value)
    await loadStats()
  } catch (err) {
    alert(err.message)
  }
}

// Updates functions
async function loadUpdateStatus() {
  try {
    updateStatus.value = await api.getUpdateStatus()
    selectedBranch.value = updateStatus.value.currentBranch
  } catch (err) {
    console.error('Failed to load update status:', err)
  }
}

async function loadBranches() {
  try {
    branches.value = await api.getUpdateBranches()
  } catch (err) {
    console.error('Failed to load branches:', err)
  }
}

async function checkForUpdates() {
  if (!selectedBranch.value) return

  checkingUpdates.value = true
  updateCheck.value = null
  updateResult.value = null

  try {
    updateCheck.value = await api.checkUpdates(selectedBranch.value)
  } catch (err) {
    alert(t.value('updateFailed') + ': ' + err.message)
  } finally {
    checkingUpdates.value = false
  }
}

// Progress helper functions
function getStageText(stage) {
  const stages = {
    checking: t.value('updating'),
    stashing: t.value('stashChanges'),
    fetching: t.value('stageFetching'),
    merging: t.value('stageMerging'),
    installing: t.value('stageInstalling'),
    building: t.value('stageBuilding'),
    'server-deps': t.value('stageInstalling'),
    restarting: t.value('stageRestarting')
  }
  return stages[stage] || t.value('updating')
}

function getProgressPercent() {
  const stages = ['checking', 'stashing', 'fetching', 'merging', 'installing', 'building', 'server-deps', 'restarting']
  const currentIndex = stages.indexOf(updateProgress.value?.stage || 'checking')
  return Math.min(((currentIndex + 1) / stages.length) * 100, 100)
}

async function pollProgress() {
  try {
    updateProgress.value = await api.getUpdateProgress()
  } catch {
    // Server might be restarting
  }
}

function startProgressPolling() {
  progressInterval = setInterval(pollProgress, 500)
}

function stopProgressPolling() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

async function waitForServerRestart() {
  serverRestarting.value = true
  let attempts = 0
  const maxAttempts = 60 // 30 seconds

  while (attempts < maxAttempts) {
    try {
      await api.getUpdateStatus()
      // Server is back online
      serverRestarting.value = false
      await loadUpdateStatus()
      return true
    } catch {
      attempts++
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  serverRestarting.value = false
  return false
}

async function applyUpdate() {
  if (!selectedBranch.value) return

  applyingUpdate.value = true
  updateResult.value = null
  updateProgress.value = null
  startProgressPolling()

  try {
    const result = await api.applyUpdates(selectedBranch.value, {
      stashLocal: stashLocal.value,
      autoBuild: autoBuild.value,
      autoRestart: autoRestart.value
    })
    updateResult.value = result
    updateCheck.value = null

    // If server will restart, wait for it
    if (result.willRestart) {
      stopProgressPolling()
      await waitForServerRestart()
    } else {
      // Refresh status
      await loadUpdateStatus()
    }
  } catch (err) {
    updateResult.value = {
      success: false,
      message: t.value('updateFailed') + ': ' + err.message
    }
  } finally {
    stopProgressPolling()
    applyingUpdate.value = false
    updateProgress.value = null
  }
}

onMounted(() => {
  loadStats()
  loadUsers()
  loadGroups()
  loadMessages()
  loadUpdateStatus()
  loadBranches()
})
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: var(--bg, #f5f5f5);
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
  color: var(--text, #333);
}

.btn-back {
  padding: 8px 16px;
  background: var(--primary, #6366f1);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-back:hover {
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--card-bg, white);
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary, #6366f1);
}

.stat-label {
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: var(--card-bg, white);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.tab.active {
  background: var(--primary, #6366f1);
  color: white;
}

.tab-content {
  background: var(--card-bg, white);
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
  border-bottom: 1px solid var(--border, #eee);
}

.data-table th {
  background: var(--bg, #f9f9f9);
  font-weight: 600;
  color: var(--text, #333);
}

.data-table code {
  background: var(--bg, #f0f0f0);
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
  background: var(--bg, #e5e7eb);
  color: var(--text, #374151);
  margin-right: 4px;
}

.btn-small:hover {
  opacity: 0.8;
}

.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.messages-info {
  margin-bottom: 12px;
  color: var(--text-secondary, #666);
}

.pagination {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Updates Section */
.updates-section h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: var(--text, #333);
}

.updates-section h4 {
  margin: 0 0 12px;
  color: var(--primary, #6366f1);
}

.updates-section h5 {
  margin: 12px 0 8px;
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
}

.update-status {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border, #eee);
}

.version-info {
  background: var(--bg, #f9f9f9);
  padding: 16px;
  border-radius: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.info-row .label {
  font-weight: 500;
  min-width: 80px;
}

.info-row code {
  background: var(--card-bg, white);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
}

.commit-msg {
  color: var(--text-secondary, #666);
  font-size: 0.875rem;
}

.branch-selection {
  margin-bottom: 24px;
}

.branch-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border, #eee);
  border-radius: 8px;
}

.branch-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #eee);
  cursor: pointer;
  transition: background 0.2s;
}

.branch-item:last-child {
  border-bottom: none;
}

.branch-item:hover {
  background: var(--bg, #f5f5f5);
}

.branch-item.selected {
  background: rgba(99, 102, 241, 0.1);
  border-left: 3px solid var(--primary, #6366f1);
}

.branch-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.branch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.branch-info code {
  background: var(--bg, #f0f0f0);
  padding: 2px 6px;
  border-radius: 4px;
}

.branch-msg {
  color: var(--text-secondary, #666);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.branch-date {
  font-size: 0.75rem;
  color: var(--text-secondary, #999);
  margin-top: 4px;
}

.update-actions {
  margin-bottom: 24px;
}

.btn-check, .btn-apply {
  padding: 10px 24px;
  background: var(--primary, #6366f1);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-check:hover, .btn-apply:hover {
  opacity: 0.9;
}

.btn-check:disabled, .btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-apply {
  background: #10b981;
  margin-top: 16px;
}

.update-results {
  margin-top: 20px;
}

.has-updates {
  padding: 16px;
  background: var(--bg, #f9f9f9);
  border-radius: 8px;
}

.no-updates {
  padding: 24px;
  text-align: center;
  background: #dcfce7;
  border-radius: 8px;
  color: #166534;
}

.success-icon {
  font-size: 1.5rem;
  margin-right: 8px;
}

.warning-box {
  background: #fef3c7;
  color: #92400e;
  padding: 12px;
  border-radius: 6px;
  margin: 12px 0;
  font-size: 0.875rem;
}

.commits-list, .files-list {
  margin-top: 12px;
}

.commit-item, .file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--border, #eee);
}

.commit-item code {
  background: var(--card-bg, white);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.file-status {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
}

.file-status.added {
  background: #dcfce7;
  color: #166534;
}

.file-status.modified {
  background: #dbeafe;
  color: #1e40af;
}

.file-status.deleted {
  background: #fee2e2;
  color: #b91c1c;
}

.more-files {
  padding: 8px 0;
  color: var(--text-secondary, #666);
  font-size: 0.875rem;
}

.update-options {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border, #eee);
}

.option-row {
  margin-bottom: 12px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.update-message {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.update-message.success {
  background: #dcfce7;
  color: #166534;
}

.update-message.error {
  background: #fee2e2;
  color: #b91c1c;
}

.restart-notice {
  margin-top: 8px;
  font-weight: 600;
}

.change-info {
  margin-top: 4px;
  font-size: 0.875rem;
  opacity: 0.9;
}

.build-warning {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-size: 0.875rem;
}

/* Progress Display */
.update-progress {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg, #f0f0f0);
  border-radius: 8px;
}

.progress-stage {
  font-weight: 600;
  margin-bottom: 4px;
}

.progress-message {
  font-size: 0.875rem;
  color: var(--text-secondary, #666);
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: var(--border, #ddd);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary, #6366f1);
  transition: width 0.3s ease;
}

/* Server Restarting Overlay */
.restart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.restart-modal {
  background: var(--card-bg, white);
  padding: 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border, #ddd);
  border-top-color: var(--primary, #6366f1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.restart-text {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text, #333);
}

.reconnect-text {
  color: var(--text-secondary, #666);
  font-size: 0.875rem;
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--text-secondary, #666);
}

/* Modal */
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
  background: var(--card-bg, white);
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
  color: var(--text, #333);
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  font-size: 1rem;
  box-sizing: border-box;
  background: var(--input-bg, white);
  color: var(--text, #333);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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
  border: 1px solid var(--border, #ddd);
  background: var(--card-bg, white);
  border-radius: 6px;
  cursor: pointer;
  color: var(--text, #333);
}

.btn-save {
  padding: 10px 20px;
  background: var(--primary, #6366f1);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-save:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .admin-container {
    padding: 12px;
  }

  .data-table {
    font-size: 0.875rem;
  }

  .data-table th,
  .data-table td {
    padding: 8px;
  }
}
</style>
