<template>
  <div
    class="avatar"
    :style="avatarStyle"
    :class="{ clickable: clickable }"
    @click="$emit('click')"
  >
    <img v-if="avatarUrl" :src="avatarUrl" :alt="name" />
    <span v-else class="initial">{{ initial }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: null
  },
  avatarColor: {
    type: String,
    default: '#6366f1'
  },
  size: {
    type: Number,
    default: 40
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const initial = computed(() => {
  return props.name ? props.name.charAt(0).toUpperCase() : '?'
})

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${props.size * 0.45}px`,
  backgroundColor: props.avatarUrl ? 'transparent' : props.avatarColor
}))
</script>

<style scoped>
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  color: white;
  font-weight: 600;
  user-select: none;
}

.avatar.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.avatar.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initial {
  line-height: 1;
}
</style>
