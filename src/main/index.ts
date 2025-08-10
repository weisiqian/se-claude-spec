import { app, shell, BrowserWindow, ipcMain, session, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs'
import * as path from 'path'
import icon from '../../resources/icon.png?asset'
import { TerminalManager } from './terminal-pty'
import { 
  initializeWorkspace, 
  setCurrentWorkspace, 
  getCurrentWorkspace, 
  getRecentDirectories,
  cleanupRecentDirectories 
} from './workspaceManager'

let terminalManager: TerminalManager
let mainWindow: BrowserWindow | null = null

/**
 * 创建主窗口，并设置为默认最大化显示。
 * @returns {void}
 */
function createWindow(): void {
  // 创建主窗口，使用Windows Terminal标准尺寸
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 740,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  // 当窗口准备好显示时，显示窗口（不默认最大化）
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    
    // 初始化终端管理器并设置主窗口
    if (terminalManager && mainWindow) {
      terminalManager.setMainWindow(mainWindow)
    }
  })

  // 监听窗口最大化/还原事件，通知渲染进程更新状态
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false)
  })

  // 拦截新窗口打开请求，使用外部浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境下加载远程URL，生产环境加载本地HTML文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * 应用初始化完成后执行的主流程。
 * 包括设置应用ID、注册窗口快捷键、IPC事件、窗口控制等。
 */
app.whenReady().then(() => {
  // 设置 Windows 平台的应用模型ID
  electronApp.setAppUserModelId('com.electron')

  // 设置 Content Security Policy
  // 在开发环境中，我们需要 unsafe-eval 来支持热重载和 Monaco Editor
  // 在生产环境中应该使用更严格的策略
  if (is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' ws: wss:;"
          ]
        }
      })
    })
  }

  // 监听新建窗口事件，注册开发/生产环境下的快捷键
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 初始化终端管理器
  terminalManager = new TerminalManager()
  
  // 清理不存在的目录
  cleanupRecentDirectories()
  
  // 初始化工作空间
  const initialWorkspace = initializeWorkspace()

  // 测试IPC通信
  ipcMain.on('ping', () => console.log('pong'))

  // 注册窗口最小化事件
  ipcMain.on('window-minimize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.minimize()
  })

  // 注册窗口最大化/还原事件
  ipcMain.on('window-maximize', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      } else {
        window.maximize()
      }
    }
  })

  // 注册窗口关闭事件
  ipcMain.on('window-close', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) window.close()
  })

  // 获取窗口是否最大化状态
  ipcMain.handle('window-is-maximized', () => {
    const window = BrowserWindow.getFocusedWindow()
    return window ? window.isMaximized() : false
  })

  // 打开目录选择对话框
  ipcMain.handle('dialog:open-directory', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { canceled: true, filePaths: [] }
    
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: '选择项目目录'
    })
    
    // 如果选择了目录，保存并设置为当前工作空间
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      setCurrentWorkspace(selectedPath)
      mainWindow?.webContents.send('workspace-changed', selectedPath)
    }
    
    return result
  })
  
  // 获取当前工作空间
  ipcMain.handle('get-current-workspace', () => {
    return getCurrentWorkspace()
  })
  
  // 获取最近打开的目录
  ipcMain.handle('get-recent-directories', () => {
    return getRecentDirectories()
  })
  
  // 切换工作空间
  ipcMain.handle('switch-workspace', (_, dirPath: string) => {
    setCurrentWorkspace(dirPath)
    mainWindow?.webContents.send('workspace-changed', dirPath)
    return dirPath
  })
  
  // 保存需求
  ipcMain.handle('save-requirement', async (_, data: {
    iterationId: string
    userRequirement: string
    prompt: string
    jsonSchema: string
    createdAt: string
  }) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未设置工作空间' }
      }
      
      // 创建 .se-claude 目录
      const seClaudeDir = path.join(workspace, '.se-claude')
      if (!fs.existsSync(seClaudeDir)) {
        fs.mkdirSync(seClaudeDir, { recursive: true })
      }
      
      // 创建 .claude/commands/迭代ID 目录
      const claudeDir = path.join(workspace, '.claude')
      const commandsDir = path.join(claudeDir, 'commands')
      const iterationDir = path.join(commandsDir, data.iterationId)
      
      if (!fs.existsSync(iterationDir)) {
        fs.mkdirSync(iterationDir, { recursive: true })
      }
      
      // 保存表单数据到 .se-claude 目录
      const formDataPath = path.join(seClaudeDir, `${data.iterationId}.json`)
      fs.writeFileSync(formDataPath, JSON.stringify(data, null, 2), 'utf-8')
      
      // 生成最终的提示词内容
      let finalPrompt = data.prompt
      
      // 替换占位符
      finalPrompt = finalPrompt.replace(/{{USER_REQUIREMENT}}/g, data.userRequirement)
      finalPrompt = finalPrompt.replace(/{{JSON_SCHEMA}}/g, data.jsonSchema || '')
      
      // 保存提示词到 .claude/commands/迭代ID/requirement.md
      const promptPath = path.join(iterationDir, 'requirement.md')
      fs.writeFileSync(promptPath, finalPrompt, 'utf-8')
      
      return { 
        success: true, 
        commandName: data.iterationId,
        formDataPath,
        promptPath
      }
    } catch (error) {
      console.error('保存需求失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '保存失败' 
      }
    }
  })

  // 创建主窗口（默认最大化）
  createWindow()
  
  // 如果有初始工作空间，通知渲染进程
  if (initialWorkspace && mainWindow) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('workspace-changed', initialWorkspace)
    })
  }

  // macOS平台下点击Dock图标时无窗口则重新创建
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/**
 * 所有窗口关闭时退出应用（macOS除外，遵循平台习惯）。
 */
app.on('window-all-closed', () => {
  // 清理终端
  if (terminalManager) {
    terminalManager.destroyAll()
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 你可以在此文件中包含应用主进程的其他代码，
// 也可以将其放在单独的文件中并在此处引入。
