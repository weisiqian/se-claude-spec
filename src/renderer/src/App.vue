<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
import StepForm from './components/StepForm.vue'
import Terminal from './components/Terminal.vue'
import ResizablePanel from './components/ResizablePanel.vue'
</script>

<template>
  <div class="app">
    <TitleBar />
    <div class="content">
      <ResizablePanel 
        :initial-side-width="400"
        :min-side-width="300"
        :max-side-width="800"
      >
        <template #main>
          <StepForm />
        </template>
        <template #side>
          <Terminal />
        </template>
      </ResizablePanel>
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
