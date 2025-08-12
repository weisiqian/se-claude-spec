<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGitStore } from '../../stores/gitStore'
import ConfirmDialog from '../common/ConfirmDialog.vue'

const gitStore = useGitStore()
const showBranchList = ref(false)
const showCreateBranch = ref(false)
const newBranchName = ref('')
const isCreating = ref(false)

// 弹窗状态
const deleteDialog = ref({
  visible: false,
  branch: ''
})

const mergeDialog = ref({
  visible: false,
  branch: ''
})

// 切换分支
const switchBranch = async (branch: string) => {
  try {
    await gitStore.switchBranch(branch)
    showBranchList.value = false
  } catch (error: any) {
    console.error('切换分支失败:', error.message)
  }
}

// 创建新分支
const createBranch = async () => {
  if (!newBranchName.value.trim()) {
    return
  }

  isCreating.value = true
  try {
    await gitStore.createBranch(newBranchName.value.trim())
    newBranchName.value = ''
    showCreateBranch.value = false
  } catch (error: any) {
    console.error('创建分支失败:', error.message)
  } finally {
    isCreating.value = false
  }
}

// 显示删除分支弹窗
const showDeleteDialog = (branch: string) => {
  deleteDialog.value = {
    visible: true,
    branch
  }
}

// 确认删除分支
const confirmDelete = async () => {
  try {
    await gitStore.deleteBranch(deleteDialog.value.branch)
  } catch (error: any) {
    console.error('删除分支失败:', error.message)
  } finally {
    deleteDialog.value.visible = false
  }
}

// 取消删除
const cancelDelete = () => {
  deleteDialog.value.visible = false
}

// 显示合并分支弹窗
const showMergeDialog = (branch: string) => {
  mergeDialog.value = {
    visible: true,
    branch
  }
}

// 确认合并分支
const confirmMerge = async () => {
  try {
    await gitStore.merge(mergeDialog.value.branch)
  } catch (error: any) {
    console.error('合并分支失败:', error.message)
  } finally {
    mergeDialog.value.visible = false
  }
}

// 取消合并
const cancelMerge = () => {
  mergeDialog.value.visible = false
}

// 计算属性
const currentBranch = computed(() => gitStore.status?.current || 'main')
const branches = computed(() => gitStore.branches || [])
const remoteBranch = computed(() => gitStore.status?.tracking || '')
const ahead = computed(() => gitStore.status?.ahead || 0)
const behind = computed(() => gitStore.status?.behind || 0)
</script>

<template>
  <div class="git-branch">
    <div class="branch-selector">
      <button class="branch-button" @click="showBranchList = !showBranchList">
        <svg class="branch-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25zM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5zM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0z"/>
        </svg>
        <span class="branch-name">{{ currentBranch }}</span>
        <svg class="dropdown-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z"/>
        </svg>
      </button>
      
      <div class="branch-status">
        <span v-if="ahead > 0" class="status-ahead" :title="`领先 ${ahead} 个提交`">
          ↑{{ ahead }}
        </span>
        <span v-if="behind > 0" class="status-behind" :title="`落后 ${behind} 个提交`">
          ↓{{ behind }}
        </span>
        <span v-if="remoteBranch" class="remote-branch" :title="`远程分支: ${remoteBranch}`">
          → {{ remoteBranch }}
        </span>
      </div>
    </div>

    <!-- 分支列表下拉菜单 -->
    <div v-if="showBranchList" class="branch-dropdown">
      <div class="dropdown-header">
        <span>分支</span>
        <button class="close-button" @click="showBranchList = false">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <div class="dropdown-actions">
        <button class="action-button" @click="showCreateBranch = true">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          创建新分支
        </button>
      </div>

      <div v-if="showCreateBranch" class="create-branch">
        <input
          v-model="newBranchName"
          class="branch-input"
          placeholder="分支名称"
          @keyup.enter="createBranch"
          @keyup.esc="showCreateBranch = false"
        />
        <div class="create-actions">
          <button class="btn-create" @click="createBranch" :disabled="isCreating">
            创建
          </button>
          <button class="btn-cancel" @click="showCreateBranch = false">
            取消
          </button>
        </div>
      </div>

      <div class="branch-list">
        <div 
          v-for="branch in branches" 
          :key="branch.name"
          class="branch-item"
          :class="{ current: branch.current }"
        >
          <div class="branch-info" @click="!branch.current && switchBranch(branch.name)">
            <svg v-if="branch.current" class="check-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
            </svg>
            <span class="branch-item-name">{{ branch.name }}</span>
            <span v-if="branch.remote" class="branch-remote">{{ branch.remote }}</span>
          </div>
          <div v-if="!branch.current" class="branch-actions">
            <button 
              class="branch-action"
              @click.stop="showMergeDialog(branch.name)"
              title="合并到当前分支"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
              </svg>
            </button>
            <button 
              class="branch-action"
              @click.stop="showDeleteDialog(branch.name)"
              title="删除分支"
            >
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 1 0-1.492.15l.66 6.6A1.75 1.75 0 0 0 5.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 0 0-1.492-.149l-.66 6.6a.25.25 0 0 1-.249.225h-5.19a.25.25 0 0 1-.249-.225l-.66-6.6z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 删除分支确认弹窗 -->
  <ConfirmDialog
    :visible="deleteDialog.visible"
    title="删除分支"
    :message="`确定要删除分支 <strong>${deleteDialog.branch}</strong> 吗？<br><span class='warning-text'>此操作将永久删除该分支，且无法恢复</span>`"
    type="danger"
    confirm-text="删除"
    cancel-text="取消"
    confirm-button-type="danger"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  />

  <!-- 合并分支确认弹窗 -->
  <ConfirmDialog
    :visible="mergeDialog.visible"
    title="合并分支"
    :message="`确定要将分支 <strong>${mergeDialog.branch}</strong> 合并到当前分支 <strong>${currentBranch}</strong> 吗？<br><span class='warning-text'>请确保已经保存并提交所有更改</span>`"
    type="info"
    confirm-text="合并"
    cancel-text="取消"
    confirm-button-type="primary"
    @confirm="confirmMerge"
    @cancel="cancelMerge"
  />
</template>

<style scoped>
.git-branch {
  position: relative;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d30;
  background: #212121;
}

.branch-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.branch-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid #2d2d30;
  border-radius: 4px;
  background: #181818;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.branch-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #464647;
}

.branch-icon {
  width: 14px;
  height: 14px;
}

.branch-name {
  font-weight: 600;
}

.dropdown-icon {
  width: 12px;
  height: 12px;
  margin-left: 4px;
}

.branch-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.status-ahead {
  color: #73c991;
}

.status-behind {
  color: #f14c4c;
}

.remote-branch {
  color: #969696;
}

.branch-dropdown {
  position: absolute;
  top: 100%;
  left: 12px;
  right: 12px;
  margin-top: 4px;
  background: #252526;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #3e3e42;
  font-size: 13px;
  font-weight: 600;
  color: #cccccc;
}

.close-button {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.close-button svg {
  width: 14px;
  height: 14px;
}

.dropdown-actions {
  padding: 8px;
  border-bottom: 1px solid #3e3e42;
}

.action-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.action-button svg {
  width: 14px;
  height: 14px;
}

.create-branch {
  padding: 8px;
  border-bottom: 1px solid #3e3e42;
}

.branch-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  background: #1e1e1e;
  color: #cccccc;
  font-size: 13px;
  outline: none;
}

.branch-input:focus {
  border-color: #007acc;
}

.create-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.btn-create,
.btn-cancel {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create {
  background: #007acc;
  color: white;
  border-color: #007acc;
}

.btn-create:hover:not(:disabled) {
  background: #005a9e;
}

.btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #2d2d30;
  color: #cccccc;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.05);
}

.branch-list {
  max-height: 300px;
  overflow-y: auto;
}

.branch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.branch-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.branch-item.current {
  background: rgba(255, 255, 255, 0.04);
  cursor: default;
}

.branch-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.check-icon {
  width: 14px;
  height: 14px;
  color: #73c991;
}

.branch-item-name {
  font-weight: 500;
}

.branch-remote {
  color: #969696;
  font-size: 11px;
}

.branch-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.branch-item:hover .branch-actions {
  opacity: 1;
}

.branch-action {
  background: transparent;
  border: none;
  color: #969696;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
}

.branch-action:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cccccc;
}

.branch-action svg {
  width: 14px;
  height: 14px;
}

</style>