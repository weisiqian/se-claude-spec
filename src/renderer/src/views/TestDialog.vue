<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'

const showWarning = ref(false)
const showDanger = ref(false)
const showInfo = ref(false)
</script>

<template>
  <div class="test-dialog-page">
    <h2>弹窗样式预览</h2>
    
    <div class="button-group">
      <button @click="showWarning = true" class="test-btn warning">
        警告弹窗（放弃更改）
      </button>
      
      <button @click="showDanger = true" class="test-btn danger">
        危险弹窗（删除分支）
      </button>
      
      <button @click="showInfo = true" class="test-btn info">
        信息弹窗（合并分支）
      </button>
    </div>

    <!-- 警告弹窗示例 -->
    <ConfirmDialog
      :visible="showWarning"
      title="放弃更改"
      :message="`确定要放弃 <strong>src/main.ts</strong> 的更改吗？<br><span class='warning-text'>此操作将撤销该文件的所有修改，且无法恢复</span>`"
      type="warning"
      confirm-text="放弃更改"
      cancel-text="取消"
      confirm-button-type="danger"
      @confirm="showWarning = false"
      @cancel="showWarning = false"
    />

    <!-- 危险弹窗示例 -->
    <ConfirmDialog
      :visible="showDanger"
      title="删除分支"
      :message="`确定要删除分支 <strong>feature/test</strong> 吗？<br><span class='warning-text'>此操作将永久删除该分支，且无法恢复</span>`"
      type="danger"
      confirm-text="删除"
      cancel-text="取消"
      confirm-button-type="danger"
      @confirm="showDanger = false"
      @cancel="showDanger = false"
    />

    <!-- 信息弹窗示例 -->
    <ConfirmDialog
      :visible="showInfo"
      title="合并分支"
      :message="`确定要将分支 <strong>feature/test</strong> 合并到当前分支 <strong>main</strong> 吗？<br><span class='warning-text'>请确保已经保存并提交所有更改</span>`"
      type="info"
      confirm-text="合并"
      cancel-text="取消"
      confirm-button-type="primary"
      @confirm="showInfo = false"
      @cancel="showInfo = false"
    />
  </div>
</template>

<style scoped>
.test-dialog-page {
  padding: 40px;
  background: #1e1e1e;
  min-height: 100vh;
  color: #cccccc;
}

h2 {
  margin-bottom: 30px;
  color: #cccccc;
}

.button-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.test-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
}

.test-btn.warning {
  background: #f9c74f;
  color: #1e1e1e;
}

.test-btn.warning:hover {
  background: #f8b918;
}

.test-btn.danger {
  background: #f44336;
}

.test-btn.danger:hover {
  background: #da190b;
}

.test-btn.info {
  background: #007acc;
}

.test-btn.info:hover {
  background: #005a9e;
}
</style>