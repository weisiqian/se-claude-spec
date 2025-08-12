import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
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
        openDirectory: () => Promise<{
          canceled: boolean
          filePaths: string[]
        }>
      }
      getCurrentWorkspace: () => Promise<string | null>
      getRecentDirectories: () => Promise<string[]>
      switchWorkspace: (dirPath: string) => Promise<string>
      onWorkspaceChanged: (callback: (workspace: string) => void) => void
      saveRequirement: (data: {
        iterationId: string
        userRequirement: string
        prompt: string
        jsonSchema: string
        createdAt: string
      }) => Promise<{
        success: boolean
        error?: string
        commandName?: string
        formDataPath?: string
        promptPath?: string
      }>
      getRequirements: () => Promise<Array<{
        id: string
        iterationId: string
        userRequirement: string
        prompt: string
        jsonSchema: string
        createdAt: string
        status: string
      }>>
      checkRequirementStatus: (iterationId: string) => Promise<{
        executed: boolean
        content?: string
        filePath?: string
        error?: string
      }>
      updateRequirement: (data: {
        id: string
        iterationId: string
        userRequirement: string
        prompt: string
        jsonSchema: string
        createdAt: string
        updatedAt?: string
      }) => Promise<{
        success: boolean
        error?: string
      }>
      deleteRequirement: (iterationId: string) => Promise<{
        success: boolean
        error?: string
        deletedFiles?: string[]
      }>
      
      // 设计相关 API
      saveDesign: (data: {
        iterationId: string
        userDesignRequest: string
        prompt: string
        jsonSchema?: string
        requirementIterationId?: string
        createdAt: string
        updatedAt?: string
      }) => Promise<{
        success: boolean
        error?: string
        jsonPath?: string
        promptPath?: string
      }>
      
      getDesigns: () => Promise<any[]>
      
      updateDesign: (data: any) => Promise<{
        success: boolean
        error?: string
        jsonPath?: string
        promptPath?: string
      }>
      
      deleteDesign: (iterationId: string) => Promise<{
        success: boolean
        error?: string
        deletedFiles?: string[]
      }>
      
      checkDesignStatus: (iterationId: string) => Promise<{
        executed: boolean
        content?: string
        filePath?: string
        error?: string
      }>
      
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
      }) => Promise<{
        success: boolean
        error?: string
        jsonPath?: string
        promptPath?: string
      }>
      
      getTasks: () => Promise<any[]>
      
      updateTask: (data: any) => Promise<{
        success: boolean
        error?: string
      }>
      
      deleteTask: (iterationId: string) => Promise<{
        success: boolean
        error?: string
        deletedFiles?: string[]
      }>
      
      checkTaskStatus: (iterationId: string) => Promise<{
        executed: boolean
        content?: string
        filePath?: string
        error?: string
      }>
      
      getExecutionTree: () => Promise<Array<{
        iterationId: string
        iterationName: string
        requirement?: {
          id: string
          title: string
          executed: boolean
        }
        design?: {
          id: string
          title: string
          executed: boolean
        }
        tasks: Array<{
          id: string
          title: string
          description: string
          command?: string
          status: 'pending' | 'executing' | 'success' | 'failed'
        }>
      }>>
      
      executeTasks: (tasks: Array<{
        iterationId: string
        taskId: string
        command?: string
      }>) => Promise<Array<{
        iterationId: string
        taskId: string
        success: boolean
        output?: string
        error?: string
      }>>
      
      // 文件系统相关 API
      getDirectoryTree: (dirPath: string) => Promise<{
        name: string
        path: string
        type: 'file' | 'directory'
        children?: any[]
        size?: number
        modified?: string
      }>
      
      readFile: (filePath: string) => Promise<string>
      
      showItemInFolder: (filePath: string) => Promise<void>
      
      createFile: (parentPath: string, fileName: string) => Promise<{
        success: boolean
        path?: string
      }>
      
      createDirectory: (parentPath: string, folderName: string) => Promise<{
        success: boolean
        path?: string
      }>
      
      renameItem: (oldPath: string, newName: string) => Promise<{
        success: boolean
        path?: string
      }>
      
      deleteItem: (itemPath: string) => Promise<{
        success: boolean
      }>
      
      copyPath: (filePath: string) => Promise<{
        success: boolean
      }>
      
      writeFile: (filePath: string, content: string) => Promise<{
        success: boolean
        error?: string
      }>
    }
  }
}
