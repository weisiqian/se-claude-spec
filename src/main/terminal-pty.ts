import { ipcMain } from 'electron'
import { spawn, IPty } from 'node-pty'
import os from 'os'

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
    ipcMain.handle('terminal:create', (_, id: string) => {
      return this.createTerminal(id)
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
  }

  private createTerminal(id: string): boolean {
    if (this.terminals.has(id)) {
      return false
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash'
    const terminal = spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
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