<template>
  <div class="app" :class="{ dark: isDark }">
    <router-view />
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isDark = ref(true)
</script>
