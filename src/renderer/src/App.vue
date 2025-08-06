<script setup lang="ts">
import TitleBar from './components/TitleBar.vue'
import Versions from './components/Versions.vue'

const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
</script>

<template>
  <div class="app">
    <TitleBar />
    <div class="content">
      <img alt="logo" class="logo" src="./assets/electron.svg" />
      <div class="creator">Powered by electron-vite</div>
      <div class="text">
        Build an Electron app with
        <span class="vue">Vue</span>
        and
        <span class="ts">TypeScript</span>
      </div>
      <p class="tip">Please try pressing <code>F12</code> to open the devTool</p>
      <div class="actions">
        <div class="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">Documentation</a>
        </div>
        <div class="action">
          <a target="_blank" rel="noreferrer" @click="ipcHandle">Send IPC</a>
        </div>
      </div>
      <Versions />
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-bottom: 80px;
}
</style>
