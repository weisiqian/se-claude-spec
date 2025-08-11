import { ipcMain, Menu, MenuItem } from 'electron'
import { spawn, IPty } from 'node-pty'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getCurrentWorkspace } from './workspaceManager'

const execAsync = promisify(exec)

interface TaskTerminalInfo {
  pty: IPty
  iterationId: string
  taskId: string
  taskTitle: string
  output: string[]
  status: 'running' | 'completed' | 'failed'
}

export class TerminalManager {
  private terminals: Map<string, IPty> = new Map()
  private taskTerminals: Map<string, TaskTerminalInfo> = new Map()
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
    
    // 任务终端相关的IPC处理
    ipcMain.handle('task-terminal:create', async (_, iterationId: string, taskId: string, taskTitle: string, command: string) => {
      return this.createTaskTerminal(iterationId, taskId, taskTitle, command)
    })
    
    ipcMain.handle('task-terminal:get-output', (_, terminalId: string) => {
      const taskTerminal = this.taskTerminals.get(terminalId)
      return taskTerminal ? taskTerminal.output.join('') : ''
    })
    
    ipcMain.handle('task-terminal:get-all', () => {
      const terminals: any[] = []
      this.taskTerminals.forEach((info, id) => {
        terminals.push({
          id,
          iterationId: info.iterationId,
          taskId: info.taskId,
          taskTitle: info.taskTitle,
          status: info.status
        })
      })
      return terminals
    })
    
    ipcMain.handle('task-terminal:clear', (_, terminalId: string) => {
      const taskTerminal = this.taskTerminals.get(terminalId)
      if (taskTerminal) {
        taskTerminal.output = []
        return true
      }
      return false
    })
    
    ipcMain.handle('task-terminal:destroy', (_, terminalId: string) => {
      return this.destroyTaskTerminal(terminalId)
    })
    
    ipcMain.handle('task-terminal:write', (_, terminalId: string, data: string) => {
      return this.writeToTaskTerminal(terminalId, data)
    })
    
    ipcMain.handle('task-terminal:resize', (_, terminalId: string, cols: number, rows: number) => {
      return this.resizeTaskTerminal(terminalId, cols, rows)
    })
  }
  
  // 创建任务专用终端
  private createTaskTerminal(iterationId: string, taskId: string, taskTitle: string, command: string): string {
    const terminalId = `task-${iterationId}-${taskId}`
    
    // 如果终端已存在，先销毁旧的
    if (this.taskTerminals.has(terminalId)) {
      this.destroyTaskTerminal(terminalId)
    }
    
    // 使用当前工作空间作为工作目录
    const workspace = getCurrentWorkspace()
    const workingDir = workspace || os.homedir()
    
    // 创建新的终端
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    const pty = spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: workingDir,
      env: process.env as any
    })
    
    // 创建任务终端信息
    const taskTerminalInfo: TaskTerminalInfo = {
      pty,
      iterationId,
      taskId,
      taskTitle,
      output: [],
      status: 'running'
    }
    
    // 监听终端输出
    pty.onData((data) => {
      taskTerminalInfo.output.push(data)
      // 发送输出到渲染进程
      if (this.mainWindow) {
        this.mainWindow.webContents.send(`task-terminal:data:${terminalId}`, data)
      }
    })
    
    // 监听终端退出
    pty.onExit(({ exitCode }) => {
      taskTerminalInfo.status = exitCode === 0 ? 'completed' : 'failed'
      if (this.mainWindow) {
        this.mainWindow.webContents.send(`task-terminal:exit:${terminalId}`, exitCode)
      }
    })
    
    // 保存终端信息
    this.taskTerminals.set(terminalId, taskTerminalInfo)
    
    // 执行命令
    if (command) {
      pty.write(`${command}\r`)
    }
    
    return terminalId
  }
  
  // 销毁任务终端
  private destroyTaskTerminal(terminalId: string): boolean {
    const taskTerminal = this.taskTerminals.get(terminalId)
    if (taskTerminal) {
      try {
        taskTerminal.pty.kill()
      } catch (error) {
        console.error(`Failed to kill task terminal ${terminalId}:`, error)
      }
      this.taskTerminals.delete(terminalId)
      return true
    }
    return false
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
    
    // 同时清理任务终端
    this.taskTerminals.forEach((taskTerminal) => {
      try {
        taskTerminal.pty.kill()
      } catch (error) {
        console.error('Failed to kill task terminal:', error)
      }
    })
    this.taskTerminals.clear()
  }
  
  // 向任务终端写入数据
  writeToTaskTerminal(terminalId: string, data: string): boolean {
    const taskTerminal = this.taskTerminals.get(terminalId)
    if (taskTerminal && taskTerminal.pty) {
      taskTerminal.pty.write(data)
      return true
    }
    return false
  }
  
  // 调整任务终端大小
  resizeTaskTerminal(terminalId: string, cols: number, rows: number): boolean {
    const taskTerminal = this.taskTerminals.get(terminalId)
    if (taskTerminal && taskTerminal.pty) {
      taskTerminal.pty.resize(cols, rows)
      return true
    }
    return false
  }
}