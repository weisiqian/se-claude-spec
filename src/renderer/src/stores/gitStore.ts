import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface GitStatus {
  modified: string[]
  added: string[]
  deleted: string[]
  renamed: { from: string; to: string }[]
  conflicted: string[]
  staged: string[]
  current: string | null
  tracking: string | null
  ahead: number
  behind: number
  isClean: boolean
}

export interface GitCommit {
  hash: string
  date: string
  message: string
  author: string
  email: string
}

export interface GitCommitWithGraph extends GitCommit {
  branch?: string
  parents: string[]
  refs: string[]
  graphLine: string
}

export interface GitBranch {
  name: string
  current: boolean
  commit: string
  remote?: string
}

export interface GitRemote {
  name: string
  url: string
}

export interface CommitFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldPath?: string
}

export const useGitStore = defineStore('git', () => {
  // 状态
  const isInitialized = ref(false)
  const status = ref<GitStatus | null>(null)
  const branches = ref<GitBranch[]>([])
  const commits = ref<GitCommit[]>([])
  const commitsWithGraph = ref<GitCommitWithGraph[]>([])
  const remotes = ref<GitRemote[]>([])
  const currentWorkspace = ref<string>('')

  // 初始化
  const initialize = async () => {
    try {
      const workspace = await window.api.git.getWorkspace()
      if (workspace) {
        currentWorkspace.value = workspace
        const initialized = await window.api.git.initialize(workspace)
        isInitialized.value = initialized
        
        if (initialized) {
          await refresh()
        }
      }
    } catch (error) {
      console.error('Git store initialization error:', error)
    }
  }

  // 刷新状态
  const refresh = async () => {
    if (!isInitialized.value) return

    try {
      const [gitStatus, gitBranches] = await Promise.all([
        window.api.git.getStatus(),
        window.api.git.getBranches()
      ])
      
      status.value = gitStatus
      branches.value = gitBranches
    } catch (error) {
      console.error('Git refresh error:', error)
    }
  }

  // 初始化仓库
  const initRepo = async () => {
    try {
      await window.api.git.init(currentWorkspace.value)
      isInitialized.value = true
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 暂存文件
  const stageFiles = async (files: string[]) => {
    try {
      await window.api.git.stage(files)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 取消暂存文件
  const unstageFiles = async (files: string[]) => {
    try {
      await window.api.git.unstage(files)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 暂存所有文件
  const stageAll = async () => {
    try {
      await window.api.git.stageAll()
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 取消暂存所有文件
  const unstageAll = async () => {
    try {
      await window.api.git.unstageAll()
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 提交
  const commit = async (message: string) => {
    try {
      await window.api.git.commit(message)
      await refresh()
      await loadHistory()
    } catch (error) {
      throw error
    }
  }

  // 推送
  const push = async (remote: string = 'origin', branch?: string) => {
    try {
      await window.api.git.push(remote, branch)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 拉取
  const pull = async (remote: string = 'origin', branch?: string) => {
    try {
      await window.api.git.pull(remote, branch)
      await refresh()
      await loadHistory()
    } catch (error) {
      throw error
    }
  }

  // 同步（拉取并推送）
  const sync = async () => {
    try {
      await pull()
      await push()
    } catch (error) {
      throw error
    }
  }

  // 获取
  const fetch = async (remote: string = 'origin') => {
    try {
      await window.api.git.fetch(remote)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 切换分支
  const switchBranch = async (branch: string) => {
    try {
      await window.api.git.switchBranch(branch)
      await refresh()
      await loadHistory()
    } catch (error) {
      throw error
    }
  }

  // 创建分支
  const createBranch = async (name: string) => {
    try {
      await window.api.git.createBranch(name)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 删除分支
  const deleteBranch = async (name: string, force: boolean = false) => {
    try {
      await window.api.git.deleteBranch(name, force)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 合并分支
  const merge = async (branch: string) => {
    try {
      await window.api.git.merge(branch)
      await refresh()
      await loadHistory()
    } catch (error) {
      throw error
    }
  }

  // 加载历史记录
  const loadHistory = async (limit: number = 50) => {
    try {
      const history = await window.api.git.getLog(limit)
      commits.value = history
    } catch (error) {
      throw error
    }
  }

  // 加载带图形的历史记录
  const loadHistoryWithGraph = async (limit: number = 50) => {
    try {
      const history = await window.api.git.getLogWithGraph(limit)
      commitsWithGraph.value = history
      // 同时更新普通commits以保持兼容
      commits.value = history.map(({ hash, date, message, author, email }) => ({
        hash, date, message, author, email
      }))
    } catch (error) {
      throw error
    }
  }

  // 获取所有分支
  const getAllBranches = async () => {
    try {
      return await window.api.git.getAllBranches()
    } catch (error) {
      throw error
    }
  }

  // 获取文件历史
  const getFileHistory = async (file: string, limit: number = 50) => {
    try {
      return await window.api.git.getFileHistory(file, limit)
    } catch (error) {
      throw error
    }
  }

  // 获取提交的文件列表
  const getCommitFiles = async (hash: string): Promise<CommitFile[]> => {
    try {
      return await window.api.git.getCommitFiles(hash)
    } catch (error) {
      throw error
    }
  }

  // 获取提交的diff
  const getCommitDiff = async (hash: string, filePath?: string): Promise<string> => {
    try {
      return await window.api.git.getCommitDiff(hash, filePath)
    } catch (error) {
      throw error
    }
  }

  // 获取差异
  const getDiff = async (file?: string) => {
    try {
      return await window.api.git.getDiff(file)
    } catch (error) {
      throw error
    }
  }

  // 获取暂存差异
  const getStagedDiff = async (file?: string) => {
    try {
      return await window.api.git.getStagedDiff(file)
    } catch (error) {
      throw error
    }
  }

  // 放弃更改
  const discardChanges = async (files: string[]) => {
    try {
      await window.api.git.discardChanges(files)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 放弃所有更改
  const discardAllChanges = async () => {
    try {
      await window.api.git.discardAllChanges()
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 储藏
  const stash = async (message?: string) => {
    try {
      await window.api.git.stash(message)
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 恢复储藏
  const stashPop = async () => {
    try {
      await window.api.git.stashPop()
      await refresh()
    } catch (error) {
      throw error
    }
  }

  // 获取储藏列表
  const getStashList = async () => {
    try {
      return await window.api.git.getStashList()
    } catch (error) {
      throw error
    }
  }

  // 加载远程仓库
  const loadRemotes = async () => {
    try {
      const gitRemotes = await window.api.git.getRemotes()
      remotes.value = gitRemotes
    } catch (error) {
      throw error
    }
  }

  // 添加远程仓库
  const addRemote = async (name: string, url: string) => {
    try {
      await window.api.git.addRemote(name, url)
      await loadRemotes()
    } catch (error) {
      throw error
    }
  }

  // 删除远程仓库
  const removeRemote = async (name: string) => {
    try {
      await window.api.git.removeRemote(name)
      await loadRemotes()
    } catch (error) {
      throw error
    }
  }

  // 克隆仓库
  const clone = async (url: string, directory: string) => {
    try {
      await window.api.git.clone(url, directory)
    } catch (error) {
      throw error
    }
  }

  // 清理
  const dispose = () => {
    // 清理状态
    status.value = null
    branches.value = []
    commits.value = []
    remotes.value = []
  }

  // 监听Git状态变化
  if (window.api?.git?.onStatusChanged) {
    window.api.git.onStatusChanged((newStatus: GitStatus) => {
      status.value = newStatus
    })
  }

  return {
    // 状态
    isInitialized,
    status,
    branches,
    commits,
    commitsWithGraph,
    remotes,
    currentWorkspace,
    
    // 方法
    initialize,
    refresh,
    initRepo,
    stageFiles,
    unstageFiles,
    stageAll,
    unstageAll,
    commit,
    push,
    pull,
    sync,
    fetch,
    switchBranch,
    createBranch,
    deleteBranch,
    merge,
    loadHistory,
    loadHistoryWithGraph,
    getAllBranches,
    getFileHistory,
    getCommitFiles,
    getCommitDiff,
    getDiff,
    getStagedDiff,
    discardChanges,
    discardAllChanges,
    stash,
    stashPop,
    getStashList,
    loadRemotes,
    addRemote,
    removeRemote,
    clone,
    dispose
  }
})