<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>{{ t('settings') }}</h3>

      <div class="user-info">
        <Avatar
          :name="userStore.user?.username"
          :avatarUrl="userStore.user?.avatarUrl"
          :avatarColor="userStore.user?.avatarColor"
          :size="56"
          clickable
          @click="triggerFileInput"
        />
        <div class="details">
          <strong>{{ userStore.user?.username }}</strong>
          <span>{{ userStore.user?.friendCode }}</span>
        </div>
      </div>

      <!-- Avatar Settings -->
      <div class="section">
        <h4>{{ t('avatar') || 'Avatar' }}</h4>

        <div class="avatar-actions">
          <button class="avatar-btn" @click="triggerFileInput">
            {{ t('uploadAvatar') || 'Upload Image' }}
          </button>
          <button
            v-if="userStore.user?.avatarUrl"
            class="avatar-btn remove"
            @click="handleRemoveAvatar"
          >
            {{ t('removeAvatar') || 'Remove' }}
          </button>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileSelect"
        />

        <div class="color-section">
          <span class="color-label">{{ t('backgroundColor') || 'Background Color' }}</span>
          <div class="color-picker">
            <div
              v-for="color in avatarColors"
              :key="color"
              class="color-option"
              :style="{ backgroundColor: color }"
              :class="{ active: userStore.user?.avatarColor === color }"
              @click="handleColorChange(color)"
            ></div>
          </div>
        </div>

        <p v-if="avatarError" class="error-text">{{ avatarError }}</p>
        <p v-if="avatarSuccess" class="success-text">{{ avatarSuccess }}</p>
      </div>

      <div class="section">
        <h4>{{ t('language') }}</h4>
        <div class="language-select">
          <button
            :class="{ active: langStore.currentLang === 'en' }"
            @click="langStore.setLanguage('en')"
          >
            {{ t('english') }}
          </button>
          <button
            :class="{ active: langStore.currentLang === 'zh' }"
            @click="langStore.setLanguage('zh')"
          >
            {{ t('chinese') }}
          </button>
        </div>
      </div>

      <div class="section">
        <h4>{{ t('security') || 'Security' }}</h4>
        <p class="info-text">
          {{ t('encrypted') }}
        </p>

        <button
          v-if="!showPasswordChange"
          class="change-password-btn"
          @click="showPasswordChange = true"
        >
          {{ t('changePassword') || 'Change Password' }}
        </button>

        <div v-else class="password-form">
          <input
            v-model="oldPassword"
            type="password"
            :placeholder="t('currentPassword') || 'Current Password'"
          />
          <input
            v-model="newPassword"
            type="password"
            :placeholder="t('newPassword') || 'New Password'"
          />
          <input
            v-model="confirmNewPassword"
            type="password"
            :placeholder="t('confirmNewPassword') || 'Confirm New Password'"
          />
          <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
          <p v-if="passwordSuccess" class="success-text">{{ passwordSuccess }}</p>
          <div class="password-actions">
            <button type="button" class="btn-cancel" @click="cancelPasswordChange">
              {{ t('cancel') }}
            </button>
            <button
              type="button"
              class="btn-confirm"
              @click="handleChangePassword"
              :disabled="passwordLoading"
            >
              {{ passwordLoading ? (t('saving') || 'Saving...') : (t('save') || 'Save') }}
            </button>
          </div>
        </div>
      </div>

      <button class="logout" @click="handleLogout">
        {{ t('logout') }}
      </button>

      <button class="cancel" @click="$emit('close')">{{ t('cancel') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useLanguageStore } from '../stores/language.js'
import Avatar from './Avatar.vue'

const emit = defineEmits(['close'])
const router = useRouter()
const userStore = useUserStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

// Avatar colors
const avatarColors = [
  '#6366f1', // Indigo (default)
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
  '#171717'  // Black
]

// Avatar state
const fileInput = ref(null)
const avatarError = ref('')
const avatarSuccess = ref('')

// Password change state
const showPasswordChange = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordLoading = ref(false)

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (!file) return

  avatarError.value = ''
  avatarSuccess.value = ''

  // Validate file type
  if (!file.type.startsWith('image/')) {
    avatarError.value = t.value('invalidImageType') || 'Please select an image file'
    return
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = t.value('imageTooLarge') || 'Image too large (max 2MB)'
    return
  }

  try {
    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        await userStore.uploadAvatar(e.target.result)
        avatarSuccess.value = t.value('avatarUpdated') || 'Avatar updated!'
        setTimeout(() => avatarSuccess.value = '', 2000)
      } catch (err) {
        avatarError.value = err.message || t.value('avatarUploadFailed') || 'Failed to upload avatar'
      }
    }
    reader.readAsDataURL(file)
  } catch (err) {
    avatarError.value = err.message || t.value('avatarUploadFailed') || 'Failed to upload avatar'
  }

  // Clear input
  event.target.value = ''
}

async function handleRemoveAvatar() {
  avatarError.value = ''
  avatarSuccess.value = ''

  try {
    await userStore.removeAvatar()
    avatarSuccess.value = t.value('avatarRemoved') || 'Avatar removed'
    setTimeout(() => avatarSuccess.value = '', 2000)
  } catch (err) {
    avatarError.value = err.message || t.value('avatarRemoveFailed') || 'Failed to remove avatar'
  }
}

async function handleColorChange(color) {
  avatarError.value = ''
  avatarSuccess.value = ''

  try {
    await userStore.updateAvatarColor(color)
  } catch (err) {
    avatarError.value = err.message || t.value('colorChangeFailed') || 'Failed to change color'
  }
}

function cancelPasswordChange() {
  showPasswordChange.value = false
  oldPassword.value = ''
  newPassword.value = ''
  confirmNewPassword.value = ''
  passwordError.value = ''
  passwordSuccess.value = ''
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''

  // Validation
  if (!oldPassword.value || !newPassword.value || !confirmNewPassword.value) {
    passwordError.value = t.value('fillAllFields') || 'Please fill all fields'
    return
  }

  if (newPassword.value.length < 6) {
    passwordError.value = t.value('passwordTooShort') || 'Password must be at least 6 characters'
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = t.value('passwordMismatch') || 'Passwords do not match'
    return
  }

  passwordLoading.value = true

  try {
    await userStore.changePassword(oldPassword.value, newPassword.value)
    passwordSuccess.value = t.value('passwordChanged') || 'Password changed successfully'
    oldPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    // Hide form after 2 seconds
    setTimeout(() => {
      showPasswordChange.value = false
      passwordSuccess.value = ''
    }, 2000)
  } catch (err) {
    passwordError.value = err.message || t.value('passwordChangeFailed') || 'Failed to change password'
  } finally {
    passwordLoading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 360px;
  max-height: 90vh;
  overflow-y: auto;
}

h3 {
  margin: 0 0 1rem;
}

h4 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.details strong {
  display: block;
  font-size: 1rem;
}

.details span {
  font-size: 0.875rem;
  color: var(--primary);
  font-family: monospace;
}

.section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: var(--bg);
  border-radius: 8px;
}

.info-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0.5rem 0;
  line-height: 1.4;
}

/* Avatar settings */
.avatar-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.avatar-btn {
  flex: 1;
  padding: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
}

.avatar-btn:hover {
  background: var(--border);
}

.avatar-btn.remove {
  flex: 0 0 auto;
  color: var(--error);
  border-color: var(--error);
}

.avatar-btn.remove:hover {
  background: var(--error);
  color: white;
}

.color-section {
  margin-top: 0.5rem;
}

.color-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 0.5rem;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s, border-color 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--text);
  box-shadow: 0 0 0 2px var(--card-bg);
}

.language-select {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.language-select button {
  flex: 1;
  padding: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: 0;
}

.language-select button:hover {
  background: var(--border);
}

.language-select button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

button {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

button.logout {
  background: var(--error);
}

button.cancel {
  background: transparent;
  color: var(--text-secondary);
}

/* Password change */
.change-password-btn {
  margin-top: 0.75rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 0.875rem;
}

.change-password-btn:hover {
  background: var(--border);
}

.password-form {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.password-form input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text);
  font-size: 0.875rem;
}

.password-form input:focus {
  outline: none;
  border-color: var(--primary);
}

.password-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.password-actions button {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0;
}

.btn-cancel {
  background: var(--card-bg);
  border: 1px solid var(--border);
  color: var(--text);
}

.btn-cancel:hover {
  background: var(--border);
}

.btn-confirm {
  background: var(--primary);
  color: white;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-text {
  color: var(--error);
  font-size: 0.75rem;
  margin: 0.5rem 0 0;
}

.success-text {
  color: var(--success);
  font-size: 0.75rem;
  margin: 0.5rem 0 0;
}
</style>
