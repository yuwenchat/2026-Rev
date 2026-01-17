<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>{{ t('joinGroup') }}</h3>

      <div class="field">
        <label>{{ t('groupCode') }}</label>
        <input
          v-model="code"
          type="text"
          :placeholder="t('groupCode')"
          maxlength="6"
          @input="code = code.toUpperCase()"
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="joined" class="success">
        <p>{{ joined.name }}</p>
      </div>

      <button
        v-if="!joined"
        @click="joinGroup"
        :disabled="code.length !== 6 || loading"
      >
        {{ loading ? '...' : t('join') }}
      </button>

      <button class="cancel" @click="$emit('close')">
        {{ t('cancel') }}
      </button>
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
const loading = ref(false)
const error = ref('')
const joined = ref(null)

async function joinGroup() {
  if (code.value.length !== 6) return

  loading.value = true
  error.value = ''

  try {
    joined.value = await chatStore.joinGroup(code.value)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
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

.success {
  background: var(--bg);
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  text-align: center;
}

.success p {
  color: var(--success);
  margin: 0;
}
</style>
