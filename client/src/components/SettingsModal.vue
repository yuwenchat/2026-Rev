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
        <h4>Security</h4>
        <p class="info-text">
          {{ t('encrypted') }}
        </p>
      </div>

      <button class="logout" @click="handleLogout">
        {{ t('logout') }}
      </button>

      <button class="cancel" @click="$emit('close')">{{ t('cancel') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useLanguageStore } from '../stores/language.js'

const emit = defineEmits(['close'])
const router = useRouter()
const userStore = useUserStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

function handleLogout() {
  userStore.logout()
  router.push('/login')
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
</style>
