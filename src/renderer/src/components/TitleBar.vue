<template>
  <div class="title-bar">
    <div class="title-bar-drag-region">
      <div class="title-bar-title">Electron App</div>
    </div>
    <div class="title-bar-controls">
      <button class="title-bar-button minimize" @click="minimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="6" width="8" height="1" fill="currentColor" />
        </svg>
      </button>
      <button class="title-bar-button maximize" @click="maximize" title="最大化/还原">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
      </button>
      <button class="title-bar-button close" @click="close" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const minimize = () => {
  window.api.windowControls.minimize()
}

const maximize = () => {
  window.api.windowControls.maximize()
}

const close = () => {
  window.api.windowControls.close()
}
</script>

<style scoped>
.title-bar {
  display: flex;
  height: 32px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #d0d0d0;
  user-select: none;
}

.title-bar-drag-region {
  flex: 1;
  display: flex;
  align-items: center;
  padding-left: 12px;
  -webkit-app-region: drag;
}

.title-bar-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.title-bar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.title-bar-button {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #333;
  transition: background-color 0.1s ease;
}

.title-bar-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.title-bar-button.close:hover {
  background-color: #e81123;
  color: white;
}

.title-bar-button:active {
  background-color: rgba(0, 0, 0, 0.2);
}

.title-bar-button.close:active {
  background-color: #c50e1f;
}

@media (prefers-color-scheme: dark) {
  .title-bar {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
  }

  .title-bar-title {
    color: #fff;
  }

  .title-bar-button {
    color: #fff;
  }

  .title-bar-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .title-bar-button:active {
    background-color: rgba(255, 255, 255, 0.2);
  }
}
</style>