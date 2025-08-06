import { ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import os from 'os'

export class SimpleTerminalManager {
  private terminals: Map<string, ChildProcess> = new Map()
  private mainWindow: Electron.BrowserWindow | null = null

  constructor() {
    this.setupIPC()
  }

  setMainWindow(window: Electron.BrowserWindow) {
    this.mainWindow = window
  }

  private setupIPC() {
    ipcMain.handle('terminal:create', (_, id: string) => {
      return this.createTerminal(id)
    })

    ipcMain.handle('terminal:write', (_, id: string, data: string) => {
      const terminal = this.terminals.get(id)
      if (terminal && terminal.stdin) {
        terminal.stdin.write(data)
      }
    })

    ipcMain.handle('terminal:destroy', (_, id: string) => {
      this.destroyTerminal(id)
    })
  }

  private createTerminal(id: string): boolean {
    if (this.terminals.has(id)) {
      return false
    }

    const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/bash'
    const terminal = spawn(shell, [], {
      cwd: process.cwd(),
      env: process.env,
      shell: false
    })

    if (terminal.stdout) {
      terminal.stdout.on('data', (data) => {
        if (this.mainWindow) {
          this.mainWindow.webContents.send(`terminal:data:${id}`, data.toString())
        }
      })
    }

    if (terminal.stderr) {
      terminal.stderr.on('data', (data) => {
        if (this.mainWindow) {
          this.mainWindow.webContents.send(`terminal:data:${id}`, data.toString())
        }
      })
    }

    terminal.on('exit', () => {
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