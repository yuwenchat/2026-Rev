<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>{{ t('addFriend') }}</h3>

      <div class="field">
        <label>{{ t('friendCode') }}</label>
        <input
          v-model="code"
          type="text"
          :placeholder="t('searchByCode')"
          maxlength="6"
          @input="code = code.toUpperCase()"
        />
      </div>

      <button @click="searchUser" :disabled="code.length !== 6 || loading">
        {{ loading ? '...' : t('search') }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="foundUser" class="found-user">
        <div class="avatar">{{ foundUser.username[0].toUpperCase() }}</div>
        <div class="info">
          <strong>{{ foundUser.username }}</strong>
          <span>{{ foundUser.friendCode }}</span>
        </div>
        <button @click="sendRequest" :disabled="sending" class="add-btn">
          {{ sending ? '...' : t('sendRequest') }}
        </button>
      </div>

      <button class="cancel" @click="$emit('close')">{{ t('cancel') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '../stores/chat.js'
import { useLanguageStore } from '../stores/language.js'

const emit = defineEmits(['close'])
const chatStore = useChatStore()
const langStore = useLanguageStore()
const t = computed(() => langStore.t)

const code = ref('')
const foundUser = ref(null)
const loading = ref(false)
const sending = ref(false)
const error = ref('')

async function searchUser() {
  if (code.value.length !== 6) return

  loading.value = true
  error.value = ''
  foundUser.value = null

  try {
    foundUser.value = await chatStore.searchUser(code.value)
  } catch (err) {
    error.value = t.value('userNotFound')
  } finally {
    loading.value = false
  }
}

async function sendRequest() {
  if (!foundUser.value) return

  sending.value = true
  error.value = ''

  try {
    await chatStore.sendFriendRequest(foundUser.value.id)
    emit('close')
  } catch (err) {
    error.value = err.message
  } finally {
    sending.value = false
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

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  text-align: center;
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

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button.cancel {
  background: transparent;
  color: var(--text-secondary);
}

.error {
  color: var(--error);
  font-size: 0.875rem;
  margin: 0.5rem 0;
}

.found-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--bg);
  border-radius: 8px;
  margin: 1rem 0;
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
}

.info {
  flex: 1;
}

.info strong {
  display: block;
}

.info span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.add-btn {
  width: auto;
  padding: 0.5rem 1rem;
  margin: 0;
}
</style>
