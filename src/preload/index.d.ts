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
        title: string
        description: string
        userRequirement: string
        prompt: string
        jsonSchema: string
        createdAt: string
        status: string
      }>>
    }
  }
}
