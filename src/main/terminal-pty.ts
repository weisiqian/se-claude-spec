import { ipcMain, Menu, MenuItem } from 'electron'
import { spawn, IPty } from 'node-pty'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getCurrentWorkspace } from './workspaceManager'

const execAsync = promisify(exec)

export class TerminalManager {
  private terminals: Map<string, IPty> = new Map()
  private mainWindow: Electron.BrowserWindow | null = null

  constructor() {
    this.setupIPC()
  }

  setMainWindow(window: Electron.BrowserWindow) {
    this.mainWindow = window
  }

  private setupIPC() {
    ipcMain.handle('terminal:create', (_, id: string, cwd?: string, shellType?: string) => {
      return this.createTerminal(id, cwd, shellType)
    })
    
    ipcMain.handle('terminal:get-username', async () => {
      try {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync('echo %USERNAME%')
          return stdout.trim()
        } else {
          return os.userInfo().username
        }
      } catch (error) {
        console.error('Failed to get username:', error)
        return 'user'
      }
    })

    ipcMain.handle('terminal:write', (_, id: string, data: string) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.write(data)
      }
    })

    ipcMain.handle('terminal:resize', (_, id: string, cols: number, rows: number) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.resize(cols, rows)
      }
    })

    ipcMain.handle('terminal:destroy', (_, id: string) => {
      this.destroyTerminal(id)
    })

    ipcMain.handle('terminal:show-context-menu', (_, menuItems: any[]) => {
      const menu = new Menu()
      
      menuItems.forEach((item) => {
        if (item.type === 'separator') {
          menu.append(new MenuItem({ type: 'separator' }))
        } else {
          const menuItem: Electron.MenuItemConstructorOptions = {
            label: item.label,
            enabled: item.enabled !== false,
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.webContents.send('terminal:context-menu-click', item.action || item.label)
              }
            }
          }
          
          // 添加快捷键显示
          if (item.accelerator) {
            menuItem.accelerator = item.accelerator
          }
          
          // 添加图标（如果支持）
          if (item.icon) {
            // Electron 支持的图标类型
            menuItem.role = item.icon as any
          }
          
          menu.append(new MenuItem(menuItem))
        }
      })
      
      if (this.mainWindow) {
        menu.popup({ window: this.mainWindow })
      }
    })
  }

  private createTerminal(id: string, cwd?: string, shellType: string = 'bash'): boolean {
    if (this.terminals.has(id)) {
      return false
    }
    
    // 使用当前工作空间作为默认目录
    const workspace = getCurrentWorkspace()
    const workingDir = cwd || workspace || os.homedir()

    // 根据 shellType 选择不同的 shell
    let shell: string
    if (process.platform === 'win32') {
      switch (shellType) {
        case 'powershell':
          shell = 'powershell.exe'
          break
        case 'cmd':
          shell = 'cmd.exe'
          break
        case 'bash':
          // Windows 上可能有 Git Bash 或 WSL
          shell = 'bash.exe'
          break
        default:
          shell = 'powershell.exe'
      }
    } else {
      switch (shellType) {
        case 'zsh':
          shell = '/bin/zsh'
          break
        case 'bash':
          shell = '/bin/bash'
          break
        case 'sh':
          shell = '/bin/sh'
          break
        default:
          shell = process.env.SHELL || '/bin/bash'
      }
    }
    const terminal = spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: workingDir,
      env: process.env as any
    })

    terminal.onData((data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send(`terminal:data:${id}`, data)
      }
    })

    terminal.onExit(() => {
      this.destroyTerminal(id)
      if (this.mainWindow) {
        this.mainWindow.webContents.send(`terminal:exit:${id}`)
      }
    })

    this.terminals.set(id, terminal)
    return true
  }

  private destroyTerminal(id: string) {
    const terminal = this.terminals.get(id)
    if (terminal) {
      terminal.kill()
      this.terminals.delete(id)
    }
  }

  destroyAll() {
    this.terminals.forEach((terminal) => {
      terminal.kill()
    })
    this.terminals.clear()
  }
}