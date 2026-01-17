<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>{{ t('settings') }}</h3>

      <div class="user-info">
        <div class="avatar">{{ userStore.user?.username[0].toUpperCase() }}</div>
        <div class="details">
          <strong>{{ userStore.user?.username }}</strong>
          <span>{{ userStore.user?.friendCode }}</span>
        </div>
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
          {{ t('changePassword') || '修改密码 / Change Password' }}
        </button>

        <div v-else class="password-form">
          <input
            v-model="oldPassword"
            type="password"
            :placeholder="t('currentPassword') || '当前密码 / Current Password'"
          />
          <input
            v-model="newPassword"
            type="password"
            :placeholder="t('newPassword') || '新密码 / New Password'"
          />
          <input
            v-model="confirmNewPassword"
            type="password"
            :placeholder="t('confirmNewPassword') || '确认新密码 / Confirm New Password'"
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
              {{ passwordLoading ? (t('saving') || '保存中...') : (t('save') || '保存') }}
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

const emit = defineEmits(['close'])
const router = useRouter()
const userStore = useUserStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

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
    passwordError.value = t.value('fillAllFields') || '请填写所有字段 / Please fill all fields'
    return
  }

  if (newPassword.value.length < 6) {
    passwordError.value = t.value('passwordTooShort') || '密码至少6个字符 / Password must be at least 6 characters'
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = t.value('passwordMismatch') || '两次密码不一致 / Passwords do not match'
    return
  }

  passwordLoading.value = true

  try {
    await userStore.changePassword(oldPassword.value, newPassword.value)
    passwordSuccess.value = t.value('passwordChanged') || '密码已修改 / Password changed successfully'
    oldPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    // Hide form after 2 seconds
    setTimeout(() => {
      showPasswordChange.value = false
      passwordSuccess.value = ''
    }, 2000)
  } catch (err) {
    passwordError.value = err.message || t.value('passwordChangeFailed') || '修改密码失败 / Failed to change password'
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
  max-width: 320px;
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

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
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
  margin: 0;
}

.success-text {
  color: var(--success);
  font-size: 0.75rem;
  margin: 0;
}
</style>
