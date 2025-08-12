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
  executeTasks: (tasks: Array<{ iterationId: string; taskId: string; command?: string }>) => ipcRenderer.invoke('execute-tasks', tasks),
  
  // 文件系统相关 API
  getDirectoryTree: (dirPath: string) => ipcRenderer.invoke('get-directory-tree', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('show-item-in-folder', filePath),
  createFile: (parentPath: string, fileName: string) => ipcRenderer.invoke('create-file', parentPath, fileName),
  createDirectory: (parentPath: string, folderName: string) => ipcRenderer.invoke('create-directory', parentPath, folderName),
  renameItem: (oldPath: string, newName: string) => ipcRenderer.invoke('rename-item', oldPath, newName),
  deleteItem: (itemPath: string) => ipcRenderer.invoke('delete-item', itemPath),
  copyPath: (filePath: string) => ipcRenderer.invoke('copy-path', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  
  // Git相关 API
  git: {
    initialize: (workspace: string) => ipcRenderer.invoke('git:initialize', workspace),
    getStatus: () => ipcRenderer.invoke('git:getStatus'),
    stage: (files: string[]) => ipcRenderer.invoke('git:stage', files),
    unstage: (files: string[]) => ipcRenderer.invoke('git:unstage', files),
    stageAll: () => ipcRenderer.invoke('git:stageAll'),
    unstageAll: () => ipcRenderer.invoke('git:unstageAll'),
    commit: (message: string) => ipcRenderer.invoke('git:commit', message),
    push: (remote?: string, branch?: string) => ipcRenderer.invoke('git:push', remote, branch),
    pull: (remote?: string, branch?: string) => ipcRenderer.invoke('git:pull', remote, branch),
    fetch: (remote?: string) => ipcRenderer.invoke('git:fetch', remote),
    getBranches: () => ipcRenderer.invoke('git:getBranches'),
    createBranch: (name: string) => ipcRenderer.invoke('git:createBranch', name),
    switchBranch: (name: string) => ipcRenderer.invoke('git:switchBranch', name),
    deleteBranch: (name: string, force?: boolean) => ipcRenderer.invoke('git:deleteBranch', name, force),
    merge: (branch: string) => ipcRenderer.invoke('git:merge', branch),
    getLog: (limit?: number) => ipcRenderer.invoke('git:getLog', limit),
    getLogWithGraph: (limit?: number) => ipcRenderer.invoke('git:getLogWithGraph', limit),
    getAllBranches: () => ipcRenderer.invoke('git:getAllBranches'),
    getFileHistory: (file: string, limit?: number) => ipcRenderer.invoke('git:getFileHistory', file, limit),
    getCommitFiles: (hash: string) => ipcRenderer.invoke('git:getCommitFiles', hash),
    getCommitDiff: (hash: string, filePath?: string) => ipcRenderer.invoke('git:getCommitDiff', hash, filePath),
    getDiff: (file?: string) => ipcRenderer.invoke('git:getDiff', file),
    getStagedDiff: (file?: string) => ipcRenderer.invoke('git:getStagedDiff', file),
    getRemotes: () => ipcRenderer.invoke('git:getRemotes'),
    addRemote: (name: string, url: string) => ipcRenderer.invoke('git:addRemote', name, url),
    removeRemote: (name: string) => ipcRenderer.invoke('git:removeRemote', name),
    discardChanges: (files: string[]) => ipcRenderer.invoke('git:discardChanges', files),
    discardAllChanges: () => ipcRenderer.invoke('git:discardAllChanges'),
    stash: (message?: string) => ipcRenderer.invoke('git:stash', message),
    stashPop: () => ipcRenderer.invoke('git:stashPop'),
    getStashList: () => ipcRenderer.invoke('git:getStashList'),
    clone: (url: string, directory: string) => ipcRenderer.invoke('git:clone', url, directory),
    init: (directory: string) => ipcRenderer.invoke('git:init', directory),
    getWorkspace: () => ipcRenderer.invoke('git:getWorkspace'),
    onStatusChanged: (callback: (status: any) => void) => {
      ipcRenderer.on('git-status-changed', (_, status) => callback(status))
    }
  }
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
