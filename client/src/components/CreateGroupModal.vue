<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h3>Create Group</h3>

      <div class="field">
        <label>Group Name</label>
        <input
          v-model="name"
          type="text"
          placeholder="Enter group name"
          maxlength="50"
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div v-if="createdGroup" class="success">
        <p>Group created!</p>
        <div class="code-display">
          <span>Share this code:</span>
          <strong>{{ createdGroup.groupCode }}</strong>
        </div>
      </div>

      <button
        v-if="!createdGroup"
        @click="createGroup"
        :disabled="!name.trim() || loading"
      >
        {{ loading ? 'Creating...' : 'Create Group' }}
      </button>

      <button class="cancel" @click="$emit('close')">
        {{ createdGroup ? 'Done' : 'Cancel' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useChatStore } from '../stores/chat.js'

const emit = defineEmits(['close'])
const chatStore = useChatStore()

const name = ref('')
const loading = ref(false)
const error = ref('')
const createdGroup = ref(null)

async function createGroup() {
  if (!name.value.trim()) return

  loading.value = true
  error.value = ''

  try {
    createdGroup.value = await chatStore.createGroup(name.value.trim())
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
  margin: 0 0 0.75rem;
}

.code-display {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.code-display span {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.code-display strong {
  font-size: 1.5rem;
  color: var(--primary);
  font-family: monospace;
  letter-spacing: 0.1em;
}
</style>
