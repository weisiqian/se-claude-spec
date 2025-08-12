<script setup lang="ts">
import { ref, computed } from 'vue'

export interface ActivityItem {
  id: string
  icon: string
  label: string
  badge?: number
}

const props = defineProps<{
  isDark?: boolean
  activeId?: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const internalActiveId = ref<string>('')

const activities = computed<ActivityItem[]>(() => [
  { id: 'files', icon: 'files', label: '文件' },
  { id: 'git', icon: 'git', label: '源代码管理' },
  { id: 'requirement', icon: 'requirement', label: '需求' },
  { id: 'design', icon: 'design', label: '设计' },
  { id: 'task', icon: 'task', label: '任务' },
  { id: 'execution', icon: 'execution', label: '执行计划' }
])

const activeId = computed(() => props.activeId || internalActiveId.value)

const handleSelect = (id: string) => {
  // 如果点击的是当前已激活的项，保持激活状态不变
  if (internalActiveId.value !== id) {
    internalActiveId.value = id
    emit('select', internalActiveId.value)
  }
}
</script>

<template>
  <div class="activity-bar" :class="{ 'dark': isDark }">
    <div class="activities">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-item"
        :class="{ active: activeId === activity.id }"
        @click="handleSelect(activity.id)"
        :title="activity.label"
      >
        <div class="activity-icon">
          <!-- 文件图标 -->
          <svg v-if="activity.icon === 'files'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
          </svg>
          <!-- Git图标 - 经典的分支图标 -->
          <svg v-else-if="activity.icon === 'git'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 3a3 3 0 0 0-3 3c0 1.28.81 2.38 1.94 2.81-.06.46-.09.93-.09 1.4v5.58c0 .46.03.93.09 1.4A3.002 3.002 0 0 0 6 23a3 3 0 0 0 1.06-5.81c.06-.47.09-.94.09-1.4V10c0-1.11.89-2 2-2h6a4 4 0 0 1 4 4v3.79c0 .46.03.93.09 1.4A3.002 3.002 0 0 0 18 23a3 3 0 0 0 0-6c-.46 0-.93.03-1.4.09.06-.47.09-.94.09-1.4V12a6 6 0 0 0-6-6H9c-.46 0-.93-.03-1.4-.09A3.002 3.002 0 0 0 6 3zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0 14a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm12 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <!-- 需求图标 -->
          <svg v-else-if="activity.icon === 'requirement'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM5 7V5h14v2H5zm2 4h10v2H7zm0 4h7v2H7z"/>
          </svg>
          <!-- 设计图标 -->
          <svg v-else-if="activity.icon === 'design'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/>
          </svg>
          <!-- 任务图标 -->
          <svg v-else-if="activity.icon === 'task'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <!-- 执行计划图标 -->
          <svg v-else-if="activity.icon === 'execution'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
            <path d="M3 3v18h3V3zm18 0v18h-3V3z" opacity="0.5"/>
          </svg>
        </div>
        <span v-if="activity.badge" class="activity-badge">{{ activity.badge }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-bar {
  width: 100%;
  height: 100%;
  background: #2d2d30;
  display: flex;
  flex-direction: column;
  user-select: none;
}

.activities {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.activity-item {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 2px solid transparent;
}

.activity-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.activity-item.active {
  background: rgba(255, 255, 255, 0.08);
  border-left-color: #007acc;
}

.activity-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cccccc;
}

.activity-item:hover .activity-icon {
  color: #e1e1e1;
}

.activity-item.active .activity-icon {
  color: #ffffff;
}

.activity-icon svg {
  width: 100%;
  height: 100%;
}

.activity-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  background: #007acc;
  color: white;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .activity-bar {
  background: #252526;
}

.dark .activity-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.dark .activity-item.active {
  background: rgba(255, 255, 255, 0.08);
  border-left-color: #007acc;
}
</style>