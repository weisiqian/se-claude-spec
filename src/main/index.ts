import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { TerminalManager } from './terminal-pty'

let terminalManager: TerminalManager

/**
 * 创建主窗口，并设置为默认最大化显示。
 * @returns {void}
 */
function createWindow(): void {
  // 创建主窗口，初始为隐藏，frame: false 以自定义窗口控制
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    show: false,
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 当窗口准备好显示时，显示窗口并设置为最大化
  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize() // 最大化窗口
    mainWindow.show()
    
    // 初始化终端管理器并设置主窗口
    if (terminalManager) {
      terminalManager.setMainWindow(mainWindow)
    }
  })

  // 监听窗口最大化/还原事件，通知渲染进程更新状态
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false)
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

  // 创建主窗口（默认最大化）
  createWindow()

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
