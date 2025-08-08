import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// 配置文件路径
const CONFIG_DIR = path.join(os.homedir(), '.se-claude')
const RECENT_DIRS_FILE = path.join(CONFIG_DIR, 'recent-directories.json')
const MAX_RECENT_DIRS = 5

// 当前工作空间
let currentWorkspace: string | null = null

// 确保配置目录存在
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

// 读取最近打开的目录
export function getRecentDirectories(): string[] {
  ensureConfigDir()
  
  if (!fs.existsSync(RECENT_DIRS_FILE)) {
    return []
  }
  
  try {
    const data = fs.readFileSync(RECENT_DIRS_FILE, 'utf-8')
    const dirs = JSON.parse(data)
    // 过滤掉不存在的目录
    return dirs.filter((dir: string) => fs.existsSync(dir))
  } catch (error) {
    console.error('Failed to read recent directories:', error)
    return []
  }
}

// 保存最近打开的目录
export function saveRecentDirectory(dirPath: string): void {
  ensureConfigDir()
  
  // 确保目录存在
  if (!fs.existsSync(dirPath)) {
    return
  }
  
  let dirs = getRecentDirectories()
  
  // 移除已存在的相同路径
  dirs = dirs.filter(d => d !== dirPath)
  
  // 添加到开头
  dirs.unshift(dirPath)
  
  // 限制数量
  if (dirs.length > MAX_RECENT_DIRS) {
    dirs = dirs.slice(0, MAX_RECENT_DIRS)
  }
  
  try {
    fs.writeFileSync(RECENT_DIRS_FILE, JSON.stringify(dirs, null, 2))
  } catch (error) {
    console.error('Failed to save recent directories:', error)
  }
}

// 获取最后打开的目录
export function getLastOpenedDirectory(): string | null {
  const dirs = getRecentDirectories()
  return dirs.length > 0 ? dirs[0] : null
}

// 设置当前工作空间
export function setCurrentWorkspace(dirPath: string | null): void {
  currentWorkspace = dirPath
  if (dirPath) {
    saveRecentDirectory(dirPath)
  }
}

// 获取当前工作空间
export function getCurrentWorkspace(): string | null {
  return currentWorkspace
}

// 清理不存在的目录
export function cleanupRecentDirectories(): void {
  const dirs = getRecentDirectories()
  const validDirs = dirs.filter(dir => fs.existsSync(dir))
  
  if (validDirs.length !== dirs.length) {
    try {
      fs.writeFileSync(RECENT_DIRS_FILE, JSON.stringify(validDirs, null, 2))
    } catch (error) {
      console.error('Failed to cleanup recent directories:', error)
    }
  }
}

// 初始化工作空间
export function initializeWorkspace(): string | null {
  const lastDir = getLastOpenedDirectory()
  if (lastDir && fs.existsSync(lastDir)) {
    setCurrentWorkspace(lastDir)
    return lastDir
  }
  return null
}