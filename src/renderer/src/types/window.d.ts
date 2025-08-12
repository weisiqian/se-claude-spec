/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      windowControls: {
        minimize: () => void
        maximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        onMaximizedChange: (callback: (isMaximized: boolean) => void) => void
        removeMaximizedListener: () => void
      }
      dialog: {
        openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
      getCurrentWorkspace: () => Promise<string | null>
      getRecentDirectories: () => Promise<string[]>
      switchWorkspace: (dirPath: string) => Promise<string>
      onWorkspaceChanged: (callback: (workspace: string) => void) => void
      saveRequirement: (data: any) => Promise<any>
      getRequirements: () => Promise<any[]>
      checkRequirementStatus: (iterationId: string) => Promise<any>
      updateRequirement: (data: any) => Promise<any>
      deleteRequirement: (iterationId: string) => Promise<any>
      saveDesign: (data: any) => Promise<any>
      getDesigns: () => Promise<any[]>
      updateDesign: (data: any) => Promise<any>
      deleteDesign: (iterationId: string) => Promise<any>
      checkDesignStatus: (iterationId: string) => Promise<any>
      saveTask: (data: any) => Promise<any>
      getTasks: () => Promise<any[]>
      updateTask: (data: any) => Promise<any>
      deleteTask: (iterationId: string) => Promise<any>
      checkTaskStatus: (iterationId: string) => Promise<any>
      getExecutionTree: () => Promise<any>
      executeTasks: (tasks: any[]) => Promise<any>
      getDirectoryTree: (dirPath: string) => Promise<any>
      readFile: (filePath: string) => Promise<string>
      showItemInFolder: (filePath: string) => Promise<void>
      createFile: (parentPath: string, fileName: string) => Promise<any>
      createDirectory: (parentPath: string, folderName: string) => Promise<any>
      renameItem: (oldPath: string, newName: string) => Promise<any>
      deleteItem: (itemPath: string) => Promise<any>
      copyPath: (filePath: string) => Promise<void>
      writeFile: (filePath: string, content: string) => Promise<any>
      git: {
        initialize: (workspace: string) => Promise<boolean>
        getStatus: () => Promise<any>
        stage: (files: string[]) => Promise<void>
        unstage: (files: string[]) => Promise<void>
        stageAll: () => Promise<void>
        unstageAll: () => Promise<void>
        commit: (message: string) => Promise<void>
        push: (remote?: string, branch?: string) => Promise<void>
        pull: (remote?: string, branch?: string) => Promise<void>
        fetch: (remote?: string) => Promise<void>
        getBranches: () => Promise<any[]>
        createBranch: (name: string) => Promise<void>
        switchBranch: (name: string) => Promise<void>
        deleteBranch: (name: string, force?: boolean) => Promise<void>
        merge: (branch: string) => Promise<void>
        getLog: (limit?: number) => Promise<any[]>
        getFileHistory: (file: string, limit?: number) => Promise<any[]>
        getDiff: (file?: string) => Promise<string>
        getStagedDiff: (file?: string) => Promise<string>
        getRemotes: () => Promise<any[]>
        addRemote: (name: string, url: string) => Promise<void>
        removeRemote: (name: string) => Promise<void>
        discardChanges: (files: string[]) => Promise<void>
        discardAllChanges: () => Promise<void>
        stash: (message?: string) => Promise<void>
        stashPop: () => Promise<void>
        getStashList: () => Promise<string[]>
        clone: (url: string, directory: string) => Promise<void>
        init: (directory: string) => Promise<void>
        getWorkspace: () => Promise<string | null>
        onStatusChanged: (callback: (status: any) => void) => void
      }
    }
    electron: any
  }
}

export {}