<template>
  <div class="app-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" fill="currentColor" />
      <rect x="14" y="14" width="7" height="7" fill="currentColor" />
    </svg>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，无交互逻辑
</script>

<style scoped>
.app-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 100%;
  color: var(--wt-text-primary);
  flex-shrink: 0;
  -webkit-app-region: drag;
}
</style>