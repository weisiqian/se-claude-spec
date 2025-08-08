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
  { id: 'requirement', icon: 'requirement', label: '需求' },
  { id: 'design', icon: 'design', label: '设计' },
  { id: 'task', icon: 'task', label: '任务' }
])

const activeId = computed(() => props.activeId || internalActiveId.value)

const handleSelect = (id: string) => {
  internalActiveId.value = internalActiveId.value === id ? '' : id
  emit('select', internalActiveId.value)
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
          <!-- 需求图标 -->
          <svg v-if="activity.icon === 'requirement'" viewBox="0 0 24 24" fill="currentColor">
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