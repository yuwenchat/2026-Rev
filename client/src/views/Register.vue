<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>{{ t('appName') }}</h1>
      <p class="subtitle">{{ t('appSubtitle') }}</p>

      <form @submit.prevent="handleRegister">
        <div class="field">
          <label>{{ t('username') }}</label>
          <input
            v-model="username"
            type="text"
            :placeholder="t('username')"
            required
            autocomplete="username"
            minlength="2"
            maxlength="20"
          />
        </div>

        <div class="field">
          <label>{{ t('password') }}</label>
          <input
            v-model="password"
            type="password"
            :placeholder="t('password')"
            required
            autocomplete="new-password"
            minlength="6"
          />
        </div>

        <div class="field">
          <label>{{ t('confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            :placeholder="t('confirmPassword')"
            required
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? '...' : t('registerBtn') }}
        </button>
      </form>

      <div class="info">
        <p>{{ t('encrypted') }}</p>
      </div>

      <p class="switch">
        {{ t('hasAccount') }}
        <router-link to="/login">{{ t('loginHere') }}</router-link>
      </p>

      <div class="lang-switch">
        <button
          :class="{ active: langStore.currentLang === 'en' }"
          @click="langStore.setLanguage('en')"
        >EN</button>
        <button
          :class="{ active: langStore.currentLang === 'zh' }"
          @click="langStore.setLanguage('zh')"
        >中文</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useLanguageStore } from '../stores/language.js'

const router = useRouter()
const userStore = useUserStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = langStore.currentLang === 'zh' ? '密码不匹配' : 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    error.value = langStore.currentLang === 'zh' ? '密码至少6位' : 'Password must be at least 6 characters'
    return
  }

  loading.value = true

  try {
    await userStore.register(username.value, password.value)
    router.push('/chat')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.auth-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  text-align: center;
}

.subtitle {
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
}

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--primary);
}

button {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.info p {
  margin: 0.25rem 0;
}

.switch {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.switch a {
  color: var(--primary);
  text-decoration: none;
}

.lang-switch {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.lang-switch button {
  width: auto;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  background: var(--bg);
  color: var(--text-secondary);
  margin-top: 0;
}

.lang-switch button.active {
  background: var(--primary);
  color: white;
}
</style>
