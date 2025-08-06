<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
import StepForm from './components/StepForm.vue'
</script>

<template>
  <div class="app">
    <TitleBar />
    <div class="content">
      <StepForm />
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  overflow: hidden;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
