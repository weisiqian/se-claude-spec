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
import { replacePlaceholders } from './placeholderReplacer'
import { gitService } from './services/gitService'

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
    
    // 初始化Git服务并设置主窗口
    if (gitService && mainWindow) {
      gitService.setMainWindow(mainWindow)
      // 如果有当前工作空间，初始化Git
      const workspace = getCurrentWorkspace()
      if (workspace) {
        gitService.initialize(workspace)
      }
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
  ipcMain.handle('switch-workspace', async (_, dirPath: string) => {
    setCurrentWorkspace(dirPath)
    mainWindow?.webContents.send('workspace-changed', dirPath)
    
    // 重新初始化Git服务
    if (gitService) {
      await gitService.initialize(dirPath)
    }
    
    return dirPath
  })
  
  // 检查需求执行状态
  ipcMain.handle('check-requirement-status', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { executed: false }
      }
      
      // 检查 .design/iterationId/specs/requirements.md 是否存在
      const designPath = path.join(workspace, '.design', iterationId, 'specs', 'requirements.md')
      
      if (fs.existsSync(designPath)) {
        // 读取文件内容
        const content = fs.readFileSync(designPath, 'utf-8')
        return {
          executed: true,
          content: content,
          filePath: designPath
        }
      } else {
        return {
          executed: false,
          filePath: designPath
        }
      }
    } catch (error) {
      console.error('检查需求状态失败:', error)
      return { executed: false, error: error instanceof Error ? error.message : '检查失败' }
    }
  })
  
  // 获取需求列表
  ipcMain.handle('get-requirements', async () => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return []
      }
      
      const seClaudeDir = path.join(workspace, '.se-claude')
      if (!fs.existsSync(seClaudeDir)) {
        return []
      }
      
      const requirements: any[] = []
      
      // 读取所有迭代目录
      const dirs = fs.readdirSync(seClaudeDir)
      for (const dir of dirs) {
        const dirPath = path.join(seClaudeDir, dir)
        // 检查是否是目录
        if (fs.statSync(dirPath).isDirectory()) {
          const requirementPath = path.join(dirPath, 'specs', 'requirement.json')
          // 检查 requirement.json 是否存在
          if (fs.existsSync(requirementPath)) {
            try {
              const content = fs.readFileSync(requirementPath, 'utf-8')
              const data = JSON.parse(content)
              requirements.push({
                ...data,
                id: data.iterationId || dir,
                status: 'created'
              })
            } catch (err) {
              console.error(`读取需求文件失败: ${requirementPath}`, err)
            }
          }
        }
      }
      
      // 按创建时间倒序排序
      requirements.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      return requirements
    } catch (error) {
      console.error('获取需求列表失败:', error)
      return []
    }
  })
  
  // 更新需求
  ipcMain.handle('update-requirement', async (_, data) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const requirementDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      const jsonPath = path.join(requirementDir, 'requirement.json')
      
      // 检查文件是否存在
      if (!fs.existsSync(jsonPath)) {
        return { success: false, error: '需求文件不存在' }
      }
      
      // 更新 JSON 数据
      const updatedData = {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString()
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(updatedData, null, 2))
      
      return { success: true }
    } catch (error) {
      console.error('更新需求失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '更新失败' 
      }
    }
  })
  
  // 删除需求
  ipcMain.handle('delete-requirement', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const deletedFiles: string[] = []
      
      // 1. 删除 .se-claude/{iterationId} 目录
      const seClaudeIterationDir = path.join(workspace, '.se-claude', iterationId)
      
      if (fs.existsSync(seClaudeIterationDir)) {
        // 递归删除目录
        fs.rmSync(seClaudeIterationDir, { recursive: true, force: true })
        deletedFiles.push(seClaudeIterationDir)
        console.log(`删除目录: ${seClaudeIterationDir}`)
      }
      
      // 2. 删除 .claude/commands/{iterationId} 目录
      const claudeDir = path.join(workspace, '.claude')
      const commandsDir = path.join(claudeDir, 'commands')
      const claudeIterationDir = path.join(commandsDir, iterationId)
      
      if (fs.existsSync(claudeIterationDir)) {
        // 递归删除目录
        fs.rmSync(claudeIterationDir, { recursive: true, force: true })
        deletedFiles.push(claudeIterationDir)
        console.log(`删除目录: ${claudeIterationDir}`)
      }
      
      // 3. 删除 .design/{iterationId} 目录
      const designDir = path.join(workspace, '.design')
      const designIterationDir = path.join(designDir, iterationId)
      
      if (fs.existsSync(designIterationDir)) {
        // 递归删除目录
        fs.rmSync(designIterationDir, { recursive: true, force: true })
        deletedFiles.push(designIterationDir)
        console.log(`删除目录: ${designIterationDir}`)
      }
      
      console.log(`删除需求 ${iterationId} 成功，共删除 ${deletedFiles.length} 个文件/目录`)
      
      return { 
        success: true,
        deletedFiles
      }
    } catch (error) {
      console.error('删除需求失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '删除失败' 
      }
    }
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
      
      // 创建 .se-claude/{iterationId}/specs 目录
      const requirementDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      if (!fs.existsSync(requirementDir)) {
        fs.mkdirSync(requirementDir, { recursive: true })
      }
      
      // 创建 .claude/commands/{iterationId} 目录
      const claudeDir = path.join(workspace, '.claude')
      const commandsDir = path.join(claudeDir, 'commands')
      const iterationDir = path.join(commandsDir, data.iterationId)
      
      if (!fs.existsSync(iterationDir)) {
        fs.mkdirSync(iterationDir, { recursive: true })
      }
      
      // 保存表单数据到 .se-claude/{iterationId}/specs/requirement.json
      const formDataPath = path.join(requirementDir, 'requirement.json')
      fs.writeFileSync(formDataPath, JSON.stringify(data, null, 2), 'utf-8')
      
      // 使用全局占位符替换函数生成最终的提示词内容
      const finalPrompt = replacePlaceholders(data.prompt, {
        userRequirement: data.userRequirement,
        jsonSchema: data.jsonSchema,
        iterationId: data.iterationId
      })
      
      // 保存替换后的提示词到 .claude/commands/{iterationId}/requirement.md
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

  // 保存设计
  ipcMain.handle('save-design', async (_, data: {
    iterationId: string
    userDesignRequest: string
    prompt: string
    jsonSchema?: string
    requirementIterationId?: string
    createdAt: string
    updatedAt?: string
  }) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未设置工作空间' }
      }
      
      // 创建 .se-claude/{iterationId}/specs 目录
      const designDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      if (!fs.existsSync(designDir)) {
        fs.mkdirSync(designDir, { recursive: true })
      }
      
      // 保存设计JSON数据到 .se-claude/{iterationId}/specs/design.json
      const jsonPath = path.join(designDir, 'design.json')
      const jsonData = {
        ...data,
        id: data.iterationId,
        updatedAt: data.updatedAt || new Date().toISOString()
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
      
      // 创建 .claude/commands/{iterationId} 目录
      const claudeDir = path.join(workspace, '.claude')
      const commandsDir = path.join(claudeDir, 'commands')
      const iterationDir = path.join(commandsDir, data.iterationId)
      
      if (!fs.existsSync(iterationDir)) {
        fs.mkdirSync(iterationDir, { recursive: true })
      }
      
      // 读取关联需求的内容（如果有）
      let userRequirement = ''
      if (data.requirementIterationId) {
        const requirementPath = path.join(workspace, '.se-claude', data.requirementIterationId, 'specs', 'requirement.json')
        if (fs.existsSync(requirementPath)) {
          try {
            const requirementData = JSON.parse(fs.readFileSync(requirementPath, 'utf-8'))
            userRequirement = requirementData.userRequirement || ''
          } catch (err) {
            console.error('读取需求文件失败:', err)
          }
        }
      }
      
      // 使用占位符替换函数生成最终的提示词内容
      const finalPrompt = replacePlaceholders(data.prompt, {
        userDesignRequest: data.userDesignRequest || '',
        userRequirement: userRequirement,
        jsonSchema: data.jsonSchema || '',
        iterationId: data.iterationId
      })
      
      // 保存替换后的提示词到 .claude/commands/{iterationId}/design.md
      const promptPath = path.join(iterationDir, 'design.md')
      fs.writeFileSync(promptPath, finalPrompt, 'utf-8')
      
      return {
        success: true,
        jsonPath,
        promptPath
      }
    } catch (error) {
      console.error('保存设计失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })
  
  // 获取设计列表
  ipcMain.handle('get-designs', async () => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return []
      }
      
      const seClaudeDir = path.join(workspace, '.se-claude')
      if (!fs.existsSync(seClaudeDir)) {
        return []
      }
      
      const designs: any[] = []
      
      // 读取所有迭代目录
      const dirs = fs.readdirSync(seClaudeDir)
      for (const dir of dirs) {
        const dirPath = path.join(seClaudeDir, dir)
        // 检查是否是目录
        if (fs.statSync(dirPath).isDirectory()) {
          const designJsonPath = path.join(dirPath, 'specs', 'design.json')
          // 检查 design.json 是否存在
          if (fs.existsSync(designJsonPath)) {
            try {
              const content = fs.readFileSync(designJsonPath, 'utf-8')
              const design = JSON.parse(content)
              
              // 使用与 check-design-status 相同的逻辑检查执行状态
              const designOutputPath = path.join(workspace, '.design', design.iterationId || dir, 'specs', 'design.md')
              const isExecuted = fs.existsSync(designOutputPath)
              
              designs.push({
                ...design,
                executionStatus: isExecuted ? 'executed' : 'not_executed'
              })
            } catch (err) {
              console.error(`读取设计文件失败: ${designJsonPath}`, err)
            }
          }
        }
      }
      
      // 按创建时间排序（最新的在前）
      designs.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      return designs
    } catch (error) {
      console.error('获取设计列表失败:', error)
      return []
    }
  })
  
  // 更新设计
  ipcMain.handle('update-design', async (_, data) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const designDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      const jsonPath = path.join(designDir, 'design.json')
      
      // 检查文件是否存在
      if (!fs.existsSync(jsonPath)) {
        // 如果不存在，调用保存方法创建新文件
        return ipcMain.emit('save-design', _, data)
      }
      
      // 更新 JSON 数据
      const jsonData = {
        ...data,
        updatedAt: new Date().toISOString()
      }
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
      
      // 读取关联需求的内容（如果有）
      let userRequirement = ''
      if (data.requirementIterationId) {
        const requirementPath = path.join(workspace, '.se-claude', data.requirementIterationId, 'specs', 'requirement.json')
        if (fs.existsSync(requirementPath)) {
          try {
            const requirementData = JSON.parse(fs.readFileSync(requirementPath, 'utf-8'))
            userRequirement = requirementData.userRequirement || ''
          } catch (err) {
            console.error('读取需求文件失败:', err)
          }
        }
      }
      
      // 更新提示词文件
      const commandsDir = path.join(workspace, '.claude', 'commands', data.iterationId)
      if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true })
      }
      
      const finalPrompt = replacePlaceholders(data.prompt, {
        userDesignRequest: data.userDesignRequest || '',
        userRequirement: userRequirement,
        jsonSchema: data.jsonSchema || '',
        iterationId: data.iterationId
      })
      
      const promptPath = path.join(commandsDir, 'design.md')
      fs.writeFileSync(promptPath, finalPrompt, 'utf-8')
      
      return {
        success: true,
        jsonPath,
        promptPath
      }
    } catch (error) {
      console.error('更新设计失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })
  
  // 检查设计执行状态
  ipcMain.handle('check-design-status', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { executed: false }
      }
      
      // 检查 .design/iterationId/specs/design.md 是否存在
      const designPath = path.join(workspace, '.design', iterationId, 'specs', 'design.md')
      
      if (fs.existsSync(designPath)) {
        // 读取文件内容
        const content = fs.readFileSync(designPath, 'utf-8')
        return {
          executed: true,
          content: content,
          filePath: designPath
        }
      } else {
        return {
          executed: false,
          filePath: designPath
        }
      }
    } catch (error) {
      console.error('检查设计状态失败:', error)
      return { executed: false, error: error instanceof Error ? error.message : '检查失败' }
    }
  })
  
  // 删除设计
  ipcMain.handle('delete-design', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const deletedFiles: string[] = []
      
      // 1. 删除 .se-claude/{iterationId}/specs/design.json 文件
      const designJsonPath = path.join(workspace, '.se-claude', iterationId, 'specs', 'design.json')
      
      if (fs.existsSync(designJsonPath)) {
        fs.unlinkSync(designJsonPath)
        deletedFiles.push(designJsonPath)
        console.log(`删除文件: ${designJsonPath}`)
      }
      
      // 2. 删除 .claude/commands/{iterationId}/design.md 文件
      const designMdPath = path.join(workspace, '.claude', 'commands', iterationId, 'design.md')
      
      if (fs.existsSync(designMdPath)) {
        fs.unlinkSync(designMdPath)
        deletedFiles.push(designMdPath)
        console.log(`删除文件: ${designMdPath}`)
      }
      
      // 3. 删除 .design/{iterationId}/specs/design.md 文件（如果存在设计输出）
      const designOutputPath = path.join(workspace, '.design', iterationId, 'specs', 'design.md')
      
      if (fs.existsSync(designOutputPath)) {
        fs.unlinkSync(designOutputPath)
        deletedFiles.push(designOutputPath)
        console.log(`删除文件: ${designOutputPath}`)
      }
      
      // 不删除目录本身，因为可能还有需求相关的文件
      
      console.log(`成功删除设计 ${iterationId}，共删除 ${deletedFiles.length} 个文件`)
      
      return {
        success: true,
        deletedFiles
      }
    } catch (error) {
      console.error('删除设计失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 任务管理 API
  // 保存任务
  ipcMain.handle('save-task', async (_, data: {
    iterationId: string
    userTaskRequest: string
    prompt: string
    jsonSchema?: string
    requirementIterationId?: string
    designIterationId?: string
    createdAt: string
    updatedAt?: string
  }) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未设置工作空间' }
      }
      
      // 创建 .se-claude/{iterationId}/specs 目录
      const taskDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      if (!fs.existsSync(taskDir)) {
        fs.mkdirSync(taskDir, { recursive: true })
      }
      
      // 保存任务JSON数据到 .se-claude/{iterationId}/specs/task.json
      const jsonPath = path.join(taskDir, 'task.json')
      const jsonData = {
        ...data,
        id: data.iterationId,
        updatedAt: data.updatedAt || new Date().toISOString()
      }
      
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
      
      // 创建 .claude/commands/{iterationId} 目录
      const claudeDir = path.join(workspace, '.claude')
      const commandsDir = path.join(claudeDir, 'commands')
      const iterationDir = path.join(commandsDir, data.iterationId)
      
      if (!fs.existsSync(iterationDir)) {
        fs.mkdirSync(iterationDir, { recursive: true })
      }
      
      // 读取关联的需求和设计内容
      let userRequirement = ''
      let userDesignRequest = ''
      
      if (data.requirementIterationId) {
        const requirementPath = path.join(workspace, '.se-claude', data.requirementIterationId, 'specs', 'requirement.json')
        if (fs.existsSync(requirementPath)) {
          try {
            const requirementData = JSON.parse(fs.readFileSync(requirementPath, 'utf-8'))
            userRequirement = requirementData.userRequirement || ''
          } catch (err) {
            console.error('读取需求文件失败:', err)
          }
        }
      }
      
      if (data.designIterationId) {
        const designPath = path.join(workspace, '.se-claude', data.designIterationId, 'specs', 'design.json')
        if (fs.existsSync(designPath)) {
          try {
            const designData = JSON.parse(fs.readFileSync(designPath, 'utf-8'))
            userDesignRequest = designData.userDesignRequest || ''
          } catch (err) {
            console.error('读取设计文件失败:', err)
          }
        }
      }
      
      // 使用占位符替换函数生成最终的提示词内容
      const finalPrompt = replacePlaceholders(data.prompt, {
        userTaskRequest: data.userTaskRequest || '',
        userRequirement: userRequirement,
        userDesignRequest: userDesignRequest,
        jsonSchema: data.jsonSchema || '',
        iterationId: data.iterationId
      })
      
      // 保存替换后的提示词到 .claude/commands/{iterationId}/task.md
      const promptPath = path.join(iterationDir, 'task.md')
      fs.writeFileSync(promptPath, finalPrompt, 'utf-8')
      
      return {
        success: true,
        jsonPath,
        promptPath
      }
    } catch (error) {
      console.error('保存任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })
  
  // 获取任务列表
  ipcMain.handle('get-tasks', async () => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return []
      }
      
      const seClaudeDir = path.join(workspace, '.se-claude')
      if (!fs.existsSync(seClaudeDir)) {
        return []
      }
      
      const tasks: any[] = []
      
      // 读取所有迭代目录
      const dirs = fs.readdirSync(seClaudeDir)
      for (const dir of dirs) {
        const dirPath = path.join(seClaudeDir, dir)
        // 检查是否是目录
        if (fs.statSync(dirPath).isDirectory()) {
          const taskJsonPath = path.join(dirPath, 'specs', 'task.json')
          // 检查 task.json 是否存在
          if (fs.existsSync(taskJsonPath)) {
            try {
              const content = fs.readFileSync(taskJsonPath, 'utf-8')
              const task = JSON.parse(content)
              
              // 检查任务执行状态（是否有输出文件）
              const taskOutputPath = path.join(workspace, '.design', task.iterationId || dir, 'specs', 'tasks.md')
              const isExecuted = fs.existsSync(taskOutputPath)
              
              tasks.push({
                ...task,
                executionStatus: isExecuted ? 'executed' : 'not_executed'
              })
            } catch (err) {
              console.error(`读取任务文件失败: ${taskJsonPath}`, err)
            }
          }
        }
      }
      
      // 按创建时间排序（最新的在前）
      tasks.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })
      
      return tasks
    } catch (error) {
      console.error('获取任务列表失败:', error)
      return []
    }
  })
  
  // 更新任务
  ipcMain.handle('update-task', async (_, data) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const taskDir = path.join(workspace, '.se-claude', data.iterationId, 'specs')
      const jsonPath = path.join(taskDir, 'task.json')
      
      // 检查文件是否存在
      if (!fs.existsSync(jsonPath)) {
        return { success: false, error: '任务文件不存在' }
      }
      
      // 更新 JSON 数据
      const jsonData = {
        ...data,
        updatedAt: new Date().toISOString()
      }
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8')
      
      return { success: true }
    } catch (error) {
      console.error('更新任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新失败'
      }
    }
  })
  
  // 删除任务
  ipcMain.handle('delete-task', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { success: false, error: '未找到工作空间' }
      }
      
      const deletedFiles: string[] = []
      
      // 1. 删除 .se-claude/{iterationId}/specs/task.json 文件
      const taskJsonPath = path.join(workspace, '.se-claude', iterationId, 'specs', 'task.json')
      
      if (fs.existsSync(taskJsonPath)) {
        fs.unlinkSync(taskJsonPath)
        deletedFiles.push(taskJsonPath)
        console.log(`删除文件: ${taskJsonPath}`)
      }
      
      // 2. 删除 .claude/commands/{iterationId}/task.md 文件
      const taskMdPath = path.join(workspace, '.claude', 'commands', iterationId, 'task.md')
      
      if (fs.existsSync(taskMdPath)) {
        fs.unlinkSync(taskMdPath)
        deletedFiles.push(taskMdPath)
        console.log(`删除文件: ${taskMdPath}`)
      }
      
      // 3. 删除 .design/{iterationId}/specs/tasks.md 文件（如果存在）
      const taskOutputPath = path.join(workspace, '.design', iterationId, 'specs', 'tasks.md')
      
      if (fs.existsSync(taskOutputPath)) {
        fs.unlinkSync(taskOutputPath)
        deletedFiles.push(taskOutputPath)
        console.log(`删除文件: ${taskOutputPath}`)
      }
      
      console.log(`删除任务 ${iterationId} 成功，共删除 ${deletedFiles.length} 个文件/目录`)
      
      return {
        success: true,
        deletedFiles
      }
    } catch (error) {
      console.error('删除任务失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除失败'
      }
    }
  })
  
  // 检查任务状态
  ipcMain.handle('check-task-status', async (_, iterationId: string) => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return { executed: false, error: '未找到工作空间' }
      }
      
      // 检查 .design/{iterationId}/specs/tasks.md 是否存在
      const taskOutputPath = path.join(workspace, '.design', iterationId, 'specs', 'tasks.md')
      
      if (fs.existsSync(taskOutputPath)) {
        // 读取文件内容
        const content = fs.readFileSync(taskOutputPath, 'utf-8')
        return {
          executed: true,
          content: content,
          filePath: taskOutputPath
        }
      } else {
        return {
          executed: false,
          filePath: taskOutputPath
        }
      }
    } catch (error) {
      console.error('检查任务状态失败:', error)
      return { executed: false, error: error instanceof Error ? error.message : '检查失败' }
    }
  })

  // 获取执行树结构
  ipcMain.handle('get-execution-tree', async () => {
    try {
      const workspace = getCurrentWorkspace()
      if (!workspace) {
        return []
      }
      
      const executionTree: any[] = []
      const seClaudeDir = path.join(workspace, '.se-claude')
      const designDir = path.join(workspace, '.design')
      
      if (!fs.existsSync(seClaudeDir)) {
        return []
      }
      
      // 读取所有迭代目录
      const dirs = fs.readdirSync(seClaudeDir)
      
      for (const dir of dirs) {
        const iterationPath = path.join(seClaudeDir, dir)
        const stat = fs.statSync(iterationPath)
        
        if (stat.isDirectory()) {
          const treeItem: any = {
            iterationId: dir,
            iterationName: dir,
            requirement: null,
            design: null,
            tasks: []
          }
          
          // 检查需求文档
          const requirementJsonPath = path.join(iterationPath, 'specs', 'requirement.json')
          const requirementMdPath = path.join(designDir, dir, 'specs', 'requirements.md')
          if (fs.existsSync(requirementJsonPath)) {
            try {
              const requirementData = JSON.parse(fs.readFileSync(requirementJsonPath, 'utf-8'))
              treeItem.requirement = {
                id: dir,
                title: requirementData.userRequirement?.substring(0, 50) || '需求文档',
                executed: fs.existsSync(requirementMdPath)
              }
            } catch (e) {
              console.error('读取需求文档失败:', e)
            }
          }
          
          // 检查设计文档
          const designJsonPath = path.join(iterationPath, 'specs', 'design.json')
          const designMdPath = path.join(designDir, dir, 'specs', 'design.md')
          if (fs.existsSync(designJsonPath)) {
            try {
              const designData = JSON.parse(fs.readFileSync(designJsonPath, 'utf-8'))
              treeItem.design = {
                id: dir,
                title: designData.userDesignRequest?.substring(0, 50) || '设计文档',
                executed: fs.existsSync(designMdPath)
              }
            } catch (e) {
              console.error('读取设计文档失败:', e)
            }
          }
          
          // 检查任务文档
          const taskJsonPath = path.join(iterationPath, 'specs', 'task.json')
          const tasksMdPath = path.join(designDir, dir, 'specs', 'tasks.md')
          
          if (fs.existsSync(tasksMdPath)) {
            // 如果tasks.md存在，解析任务列表
            const tasksContent = fs.readFileSync(tasksMdPath, 'utf-8')
            const parsedTasks = await parseTasks(tasksContent)
            treeItem.tasks = parsedTasks
          } else if (fs.existsSync(taskJsonPath)) {
            // 如果只有task.json，创建单个任务项
            try {
              const taskData = JSON.parse(fs.readFileSync(taskJsonPath, 'utf-8'))
              treeItem.tasks = [{
                id: '1',
                title: taskData.userTaskRequest?.substring(0, 50) || '任务',
                description: taskData.userTaskRequest || '',
                command: `claude "/${dir}:task"`,
                status: 'pending'
              }]
            } catch (e) {
              console.error('读取任务文档失败:', e)
            }
          }
          
          executionTree.push(treeItem)
        }
      }
      
      // 按创建时间排序
      executionTree.sort((a, b) => a.iterationId.localeCompare(b.iterationId))
      
      return executionTree
    } catch (error) {
      console.error('获取执行树失败:', error)
      return []
    }
  })

  // 获取目录树结构
  ipcMain.handle('get-directory-tree', async (_, dirPath: string) => {
    try {
      const getDirectoryTree = (currentPath: string, level = 0): any => {
        // 限制递归深度，避免性能问题
        if (level > 10) return null
        
        const stats = fs.statSync(currentPath)
        const name = path.basename(currentPath)
        
        // 只忽略一些大目录以提高性能
        if (name === 'node_modules' || name === 'dist' || name === 'out' || name === '.git/objects') {
          return null
        }
        
        const node: any = {
          name,
          path: currentPath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString()
        }
        
        if (stats.isDirectory()) {
          try {
            const children = fs.readdirSync(currentPath)
              .map(child => getDirectoryTree(path.join(currentPath, child), level + 1))
              .filter(child => child !== null)
              .sort((a, b) => {
                // 文件夹排在前面
                if (a.type === 'directory' && b.type === 'file') return -1
                if (a.type === 'file' && b.type === 'directory') return 1
                // 同类型按名称排序
                return a.name.localeCompare(b.name)
              })
            
            node.children = children
          } catch (error) {
            console.error(`无法读取目录 ${currentPath}:`, error)
            node.children = []
          }
        }
        
        return node
      }
      
      return getDirectoryTree(dirPath)
    } catch (error) {
      console.error('获取目录树失败:', error)
      throw error
    }
  })
  
  // 读取文件内容
  ipcMain.handle('read-file', async (_, filePath: string) => {
    try {
      // 检查文件大小
      const stats = fs.statSync(filePath)
      
      // 如果文件太大（> 10MB），返回提示
      if (stats.size > 10 * 1024 * 1024) {
        return `文件太大 (${(stats.size / 1024 / 1024).toFixed(2)} MB)，无法在编辑器中显示`
      }
      
      // 尝试读取为文本
      const content = fs.readFileSync(filePath, 'utf-8')
      return content
    } catch (error: any) {
      // 如果不是文本文件，返回错误信息
      if (error.code === 'EISDIR') {
        throw new Error('这是一个目录，不是文件')
      } else if (error.toString().includes('Invalid')) {
        return '这是一个二进制文件，无法显示文本内容'
      }
      throw error
    }
  })
  
  // 写入文件内容
  ipcMain.handle('write-file', async (_, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (error: any) {
      console.error('写入文件失败:', error)
      return {
        success: false,
        error: error.message || '写入文件失败'
      }
    }
  })
  
  // 在文件管理器中显示文件
  ipcMain.handle('show-item-in-folder', async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
  
  // 创建文件
  ipcMain.handle('create-file', async (_, parentPath: string, fileName: string) => {
    try {
      const filePath = path.join(parentPath, fileName)
      
      // 检查文件是否已存在
      if (fs.existsSync(filePath)) {
        throw new Error(`文件 "${fileName}" 已存在`)
      }
      
      // 创建空文件
      fs.writeFileSync(filePath, '', 'utf-8')
      return { success: true, path: filePath }
    } catch (error: any) {
      console.error('创建文件失败:', error)
      throw new Error(error.message || '创建文件失败')
    }
  })
  
  // 创建文件夹
  ipcMain.handle('create-directory', async (_, parentPath: string, folderName: string) => {
    try {
      const folderPath = path.join(parentPath, folderName)
      
      // 检查文件夹是否已存在
      if (fs.existsSync(folderPath)) {
        throw new Error(`文件夹 "${folderName}" 已存在`)
      }
      
      // 创建文件夹
      fs.mkdirSync(folderPath, { recursive: true })
      return { success: true, path: folderPath }
    } catch (error: any) {
      console.error('创建文件夹失败:', error)
      throw new Error(error.message || '创建文件夹失败')
    }
  })
  
  // 重命名文件或文件夹
  ipcMain.handle('rename-item', async (_, oldPath: string, newName: string) => {
    try {
      const dir = path.dirname(oldPath)
      const newPath = path.join(dir, newName)
      
      // 检查新名称是否已存在
      if (fs.existsSync(newPath)) {
        throw new Error(`"${newName}" 已存在`)
      }
      
      // 执行重命名
      fs.renameSync(oldPath, newPath)
      return { success: true, path: newPath }
    } catch (error: any) {
      console.error('重命名失败:', error)
      throw new Error(error.message || '重命名失败')
    }
  })
  
  // 删除文件或文件夹
  ipcMain.handle('delete-item', async (_, itemPath: string) => {
    try {
      const stats = fs.statSync(itemPath)
      
      if (stats.isDirectory()) {
        // 递归删除文件夹
        fs.rmSync(itemPath, { recursive: true, force: true })
      } else {
        // 删除文件
        fs.unlinkSync(itemPath)
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('删除失败:', error)
      throw new Error(error.message || '删除失败')
    }
  })
  
  // 复制文件路径到剪贴板
  ipcMain.handle('copy-path', async (_, filePath: string) => {
    const { clipboard } = require('electron')
    clipboard.writeText(filePath)
    return { success: true }
  })

  // 解析tasks.md文件内容
  async function parseTasks(content: string) {
    const tasks: any[] = []
    const lines = content.split('\n')
    let currentTask: any = null
    let taskId = 1
    
    for (const line of lines) {
      // 匹配任务标题 (## 1. 任务名称)
      const titleMatch = line.match(/^##\s+(\d+)\.\s+(.+)/)
      if (titleMatch) {
        if (currentTask) {
          tasks.push(currentTask)
        }
        currentTask = {
          id: titleMatch[1],
          title: titleMatch[2].trim(),
          description: '',
          command: '',
          status: 'pending'
        }
        taskId = parseInt(titleMatch[1]) + 1
      }
      // 匹配有序列表任务 (1. 任务名称)
      else if (line.match(/^\d+\.\s+/)) {
        const match = line.match(/^(\d+)\.\s+(.+)/)
        if (match) {
          if (currentTask) {
            tasks.push(currentTask)
          }
          currentTask = {
            id: match[1],
            title: match[2].trim(),
            description: '',
            command: '',
            status: 'pending'
          }
        }
      }
      // 匹配无序列表任务 (- 任务名称 或 * 任务名称)
      else if (line.match(/^[-*]\s+/)) {
        const match = line.match(/^[-*]\s+(.+)/)
        if (match) {
          if (currentTask) {
            tasks.push(currentTask)
          }
          currentTask = {
            id: taskId.toString(),
            title: match[1].trim(),
            description: '',
            command: '',
            status: 'pending'
          }
          taskId++
        }
      }
      // 匹配命令行 (`claude ...` 或 ```...```)
      else if (currentTask && line.includes('`')) {
        const commandMatch = line.match(/`([^`]+)`/)
        if (commandMatch) {
          currentTask.command = commandMatch[1]
        }
      }
      // 其他行作为描述
      else if (currentTask && line.trim() && !line.startsWith('#')) {
        if (currentTask.description) {
          currentTask.description += '\n' + line.trim()
        } else {
          currentTask.description = line.trim()
        }
      }
    }
    
    if (currentTask) {
      tasks.push(currentTask)
    }
    
    return tasks
  }

  // 批量执行任务 - 已弃用，改为使用任务终端
  ipcMain.handle('execute-tasks', async (_, tasks: Array<{ iterationId: string; taskId: string; taskTitle?: string; command?: string }>) => {
    const results: any[] = []
    
    // 注意：现在任务执行通过任务终端完成，这个API保留用于兼容
    // 实际执行逻辑已移至前端通过task-terminal:create来创建独立终端
    for (const task of tasks) {
      results.push({
        iterationId: task.iterationId,
        taskId: task.taskId,
        success: true,
        message: '任务已通过独立终端执行'
      })
    }
    
    return results
  })

  // Git相关IPC处理程序
  ipcMain.handle('git:initialize', async (_, workspace: string) => {
    return await gitService.initialize(workspace)
  })

  ipcMain.handle('git:getStatus', async () => {
    return await gitService.getStatus()
  })

  ipcMain.handle('git:stage', async (_, files: string[]) => {
    return await gitService.stage(files)
  })

  ipcMain.handle('git:unstage', async (_, files: string[]) => {
    return await gitService.unstage(files)
  })

  ipcMain.handle('git:stageAll', async () => {
    return await gitService.stageAll()
  })

  ipcMain.handle('git:unstageAll', async () => {
    return await gitService.unstageAll()
  })

  ipcMain.handle('git:commit', async (_, message: string) => {
    return await gitService.commit(message)
  })

  ipcMain.handle('git:push', async (_, remote?: string, branch?: string) => {
    return await gitService.push(remote, branch)
  })

  ipcMain.handle('git:pull', async (_, remote?: string, branch?: string) => {
    return await gitService.pull(remote, branch)
  })

  ipcMain.handle('git:fetch', async (_, remote?: string) => {
    return await gitService.fetch(remote)
  })

  ipcMain.handle('git:getBranches', async () => {
    return await gitService.getBranches()
  })

  ipcMain.handle('git:createBranch', async (_, name: string) => {
    return await gitService.createBranch(name)
  })

  ipcMain.handle('git:switchBranch', async (_, name: string) => {
    return await gitService.switchBranch(name)
  })

  ipcMain.handle('git:deleteBranch', async (_, name: string, force?: boolean) => {
    return await gitService.deleteBranch(name, force)
  })

  ipcMain.handle('git:merge', async (_, branch: string) => {
    return await gitService.merge(branch)
  })

  ipcMain.handle('git:getLog', async (_, limit?: number) => {
    return await gitService.getLog(limit)
  })

  ipcMain.handle('git:getLogWithGraph', async (_, limit?: number) => {
    return await gitService.getLogWithGraph(limit)
  })

  ipcMain.handle('git:getAllBranches', async () => {
    return await gitService.getAllBranches()
  })

  ipcMain.handle('git:getFileHistory', async (_, file: string, limit?: number) => {
    return await gitService.getFileHistory(file, limit)
  })
  ipcMain.handle('git:getCommitFiles', async (_, hash: string) => {
    return await gitService.getCommitFiles(hash)
  })

  ipcMain.handle('git:getCommitDiff', async (_, hash: string, filePath?: string) => {
    return await gitService.getCommitDiff(hash, filePath)
  })

  ipcMain.handle('git:getDiff', async (_, file?: string) => {
    return await gitService.getDiff(file)
  })

  ipcMain.handle('git:getStagedDiff', async (_, file?: string) => {
    return await gitService.getStagedDiff(file)
  })

  ipcMain.handle('git:getRemotes', async () => {
    return await gitService.getRemotes()
  })

  ipcMain.handle('git:addRemote', async (_, name: string, url: string) => {
    return await gitService.addRemote(name, url)
  })

  ipcMain.handle('git:removeRemote', async (_, name: string) => {
    return await gitService.removeRemote(name)
  })

  ipcMain.handle('git:discardChanges', async (_, files: string[]) => {
    return await gitService.discardChanges(files)
  })

  ipcMain.handle('git:discardAllChanges', async () => {
    return await gitService.discardAllChanges()
  })

  ipcMain.handle('git:stash', async (_, message?: string) => {
    return await gitService.stash(message)
  })

  ipcMain.handle('git:stashPop', async () => {
    return await gitService.stashPop()
  })

  ipcMain.handle('git:getStashList', async () => {
    return await gitService.getStashList()
  })

  ipcMain.handle('git:clone', async (_, url: string, directory: string) => {
    return await gitService.clone(url, directory)
  })

  ipcMain.handle('git:init', async (_, directory: string) => {
    return await gitService.init(directory)
  })

  ipcMain.handle('git:getWorkspace', async () => {
    return getCurrentWorkspace()
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
