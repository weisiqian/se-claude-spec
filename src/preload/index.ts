import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized))
    },
    removeMaximizedListener: () => {
      ipcRenderer.removeAllListeners('window-maximized')
    }
  },
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:open-directory')
  },
  getCurrentWorkspace: () => ipcRenderer.invoke('get-current-workspace'),
  getRecentDirectories: () => ipcRenderer.invoke('get-recent-directories'),
  switchWorkspace: (dirPath: string) => ipcRenderer.invoke('switch-workspace', dirPath),
  onWorkspaceChanged: (callback: (workspace: string) => void) => {
    ipcRenderer.on('workspace-changed', (_, workspace) => callback(workspace))
  },
  saveRequirement: (data: {
    iterationId: string
    userRequirement: string
    prompt: string
    jsonSchema: string
    createdAt: string
  }) => ipcRenderer.invoke('save-requirement', data),
  getRequirements: () => ipcRenderer.invoke('get-requirements'),
  checkRequirementStatus: (iterationId: string) => ipcRenderer.invoke('check-requirement-status', iterationId),
  updateRequirement: (data: {
    id: string
    iterationId: string
    userRequirement: string
    prompt: string
    jsonSchema: string
    createdAt: string
    updatedAt?: string
  }) => ipcRenderer.invoke('update-requirement', data),
  deleteRequirement: (iterationId: string) => ipcRenderer.invoke('delete-requirement', iterationId),
  
  // 设计相关 API
  saveDesign: (data: {
    iterationId: string
    userDesignRequest: string
    prompt: string
    jsonSchema?: string
    requirementIterationId?: string
    createdAt: string
    updatedAt?: string
  }) => ipcRenderer.invoke('save-design', data),
  getDesigns: () => ipcRenderer.invoke('get-designs'),
  updateDesign: (data: any) => ipcRenderer.invoke('update-design', data),
  deleteDesign: (iterationId: string) => ipcRenderer.invoke('delete-design', iterationId),
  checkDesignStatus: (iterationId: string) => ipcRenderer.invoke('check-design-status', iterationId),
  
  // 任务相关 API
  saveTask: (data: {
    iterationId: string
    userTaskRequest: string
    prompt: string
    jsonSchema?: string
    requirementIterationId?: string
    designIterationId?: string
    createdAt: string
    updatedAt?: string
  }) => ipcRenderer.invoke('save-task', data),
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  updateTask: (data: any) => ipcRenderer.invoke('update-task', data),
  deleteTask: (iterationId: string) => ipcRenderer.invoke('delete-task', iterationId),
  checkTaskStatus: (iterationId: string) => ipcRenderer.invoke('check-task-status', iterationId),
  getExecutionTree: () => ipcRenderer.invoke('get-execution-tree'),
  executeTasks: (tasks: Array<{ iterationId: string; taskId: string; command?: string }>) => ipcRenderer.invoke('execute-tasks', tasks)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
