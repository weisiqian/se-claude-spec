<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGitStore } from '../../stores/gitStore'

const gitStore = useGitStore()
const commitMessage = ref('')
const isCommitting = ref(false)

// 提交更改
const commit = async () => {
  if (!commitMessage.value.trim()) {
    return
  }

  if (!hasStaged.value) {
    return
  }

  isCommitting.value = true
  try {
    await gitStore.commit(commitMessage.value.trim())
    commitMessage.value = ''
  } catch (error: any) {
    console.error('提交失败:', error.message)
  } finally {
    isCommitting.value = false
  }
}

// 提交并推送
const commitAndPush = async () => {
  if (!commitMessage.value.trim()) {
    return
  }

  if (!hasStaged.value) {
    return
  }

  isCommitting.value = true
  try {
    await gitStore.commit(commitMessage.value.trim())
    await gitStore.push()
    commitMessage.value = ''
  } catch (error: any) {
    console.error('提交并推送失败:', error.message)
  } finally {
    isCommitting.value = false
  }
}

// 计算属性
const hasStaged = computed(() => {
  return gitStore.status && gitStore.status.staged.length > 0
})

const stagedCount = computed(() => {
  return gitStore.status?.staged.length || 0
})

// 快捷键处理
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    commit()
  }
}
</script>

<template>
  <div class="git-commit">
    <div class="commit-input-wrapper">
      <textarea
        v-model="commitMessage"
        class="commit-input"
        placeholder="消息 (Ctrl+Enter 提交)"
        @keydown="handleKeydown"
        :disabled="!hasStaged || isCommitting"
      />
      <div class="commit-info">
        <span v-if="hasStaged" class="staged-info">
          {{ stagedCount }} 个暂存的更改
        </span>
        <span v-else class="no-staged">
          没有暂存的更改
        </span>
      </div>
    </div>
    
    <div class="commit-actions">
      <button 
        class="commit-button primary"
        @click="commit"
        :disabled="!hasStaged || !commitMessage.trim() || isCommitting"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
        </svg>
        提交
      </button>
      
      <button 
        class="commit-button"
        @click="commitAndPush"
        :disabled="!hasStaged || !commitMessage.trim() || isCommitting"
      >
        <svg viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a.5.5 0 0 1 .5.5v6.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 8.293V1.5A.5.5 0 0 1 8 1z"/>
          <path d="M2 7v7.5A1.5 1.5 0 0 0 3.5 16h9a1.5 1.5 0 0 0 1.5-1.5V7h1v7.5A2.5 2.5 0 0 1 12.5 17h-9A2.5 2.5 0 0 1 1 14.5V7h1z"/>
        </svg>
        提交并推送
      </button>
    </div>
  </div>
</template>

<style scoped>
.git-commit {
  border-bottom: 1px solid #2d2d30;
  padding: 12px;
  background: #212121;
}

.commit-input-wrapper {
  margin-bottom: 8px;
}

.commit-input {
  width: 100%;
  min-height: 60px;
  max-height: 120px;
  padding: 8px;
  border: 1px solid #2d2d30;
  border-radius: 4px;
  background: #181818;
  color: #cccccc;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

.commit-input:focus {
  border-color: #007acc;
}

.commit-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.commit-input::placeholder {
  color: #808080;
}

.commit-info {
  margin-top: 4px;
  font-size: 11px;
  color: #969696;
}

.staged-info {
  color: #73c991;
}

.no-staged {
  color: #808080;
}

.commit-actions {
  display: flex;
  gap: 8px;
}

.commit-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #2d2d30;
  border-radius: 4px;
  background: #252526;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.commit-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  border-color: #464647;
}

.commit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.commit-button.primary {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.commit-button.primary:hover:not(:disabled) {
  background: #005a9e;
  border-color: #005a9e;
}

.commit-button svg {
  width: 14px;
  height: 14px;
}

</style>