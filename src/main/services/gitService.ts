import simpleGit, { SimpleGit, BranchSummary } from 'simple-git'
import { BrowserWindow } from 'electron'

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

export interface CommitFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldPath?: string
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

export class GitService {
  private git: SimpleGit | null = null
  private mainWindow: BrowserWindow | null = null
  private watchInterval: NodeJS.Timeout | null = null

  constructor() {}

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  async initialize(workspacePath: string): Promise<boolean> {
    try {
      this.git = simpleGit(workspacePath)
      
      // 检查是否是Git仓库
      const isRepo = await this.git.checkIsRepo()
      if (!isRepo) {
        // 如果不是Git仓库，返回false
        return false
      }

      // 开始监听文件变化
      this.startWatching()
      
      return true
    } catch (error) {
      console.error('Git initialization error:', error)
      return false
    }
  }

  private startWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval)
    }

    // 每2秒检查一次状态变化
    this.watchInterval = setInterval(async () => {
      if (this.git && this.mainWindow) {
        const status = await this.getStatus()
        this.mainWindow.webContents.send('git-status-changed', status)
      }
    }, 2000)
  }

  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval)
      this.watchInterval = null
    }
  }

  async getStatus(): Promise<GitStatus | null> {
    if (!this.git) return null

    try {
      const status = await this.git.status()
      
      return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        renamed: status.renamed.map(r => ({ from: r.from, to: r.to })),
        conflicted: status.conflicted,
        staged: status.staged,
        untracked: status.not_added || [],
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean()
      }
    } catch (error) {
      console.error('Get status error:', error)
      return null
    }
  }

  async stage(files: string[]): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.add(files)
  }

  async unstage(files: string[]): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.reset(['HEAD', ...files])
  }

  async stageAll(): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.add('.')
  }

  async unstageAll(): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.reset(['HEAD'])
  }

  async commit(message: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.commit(message)
  }

  async push(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    if (branch) {
      await this.git.push(remote, branch)
    } else {
      await this.git.push()
    }
  }

  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    if (branch) {
      await this.git.pull(remote, branch)
    } else {
      await this.git.pull()
    }
  }

  async fetch(remote: string = 'origin'): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.fetch(remote)
  }

  async getBranches(): Promise<GitBranch[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    const summary: BranchSummary = await this.git.branchLocal()
    const branches: GitBranch[] = []
    
    for (const [name, branch] of Object.entries(summary.branches)) {
      branches.push({
        name,
        current: branch.current,
        commit: branch.commit,
        remote: (branch as any).tracking || undefined
      })
    }
    
    return branches
  }

  async createBranch(name: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.checkoutLocalBranch(name)
  }

  async switchBranch(name: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.checkout(name)
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    if (force) {
      await this.git.deleteLocalBranch(name, true)
    } else {
      await this.git.deleteLocalBranch(name)
    }
  }

  async merge(branch: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.merge([branch])
  }

  async getLog(limit: number = 50): Promise<GitCommit[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    const log = await this.git.log({ maxCount: limit })
    
    return log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email
    }))
  }

  async getLogWithGraph(limit: number = 50): Promise<GitCommitWithGraph[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    try {
      // 使用git log --graph获取带图形的日志
      const format = '%H|%P|%d|%an|%ae|%at|%s'
      const result = await this.git.raw([
        'log',
        '--graph',
        '--all',
        '--format=' + format,
        '-n',
        limit.toString()
      ])
      
      const lines = result.split('\n').filter(line => line.trim())
      const commits: GitCommitWithGraph[] = []
      
      for (const line of lines) {
        // 分离图形部分和数据部分
        const match = line.match(/^([*|\\/\\ ]+)(.+)$/)
        if (!match) continue
        
        const graphLine = match[1]
        const dataParts = match[2].split('|')
        
        if (dataParts.length < 7) continue
        
        const [hash, parents, refs, author, email, timestamp, ...messageParts] = dataParts
        const message = messageParts.join('|')
        
        // 解析refs（分支和标签）
        const refList: string[] = []
        if (refs && refs.trim()) {
          const refMatch = refs.match(/\(([^)]+)\)/)
          if (refMatch) {
            refList.push(...refMatch[1].split(', ').map(r => r.trim()))
          }
        }
        
        // 解析parents
        const parentList = parents ? parents.trim().split(' ').filter(p => p) : []
        
        commits.push({
          hash: hash.trim(),
          date: new Date(parseInt(timestamp) * 1000).toISOString(),
          message: message.trim(),
          author: author.trim(),
          email: email.trim(),
          parents: parentList,
          refs: refList,
          graphLine: graphLine
        })
      }
      
      return commits
    } catch (error) {
      console.error('获取图形化日志失败:', error)
      // 降级到普通日志
      const log = await this.getLog(limit)
      return log.map(commit => ({
        ...commit,
        parents: [],
        refs: [],
        graphLine: '*'
      }))
    }
  }

  async getAllBranches(): Promise<{ local: string[], remote: string[] }> {
    if (!this.git) throw new Error('Git not initialized')
    
    try {
      const localBranches = await this.git.branchLocal()
      const remoteBranches = await this.git.branch(['-r'])
      
      return {
        local: Object.keys(localBranches.branches),
        remote: Object.keys(remoteBranches.branches).map(b => b.replace('origin/', ''))
      }
    } catch (error) {
      console.error('获取分支列表失败:', error)
      return { local: [], remote: [] }
    }
  }

  async getFileHistory(filePath: string, limit: number = 50): Promise<GitCommit[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    const log = await this.git.log({
      file: filePath,
      maxCount: limit
    })
    
    return log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email
    }))
  }

  async getCommitFiles(hash: string): Promise<CommitFile[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    try {
      // 获取提交的文件统计信息
      const result = await this.git.raw([
        'show',
        '--stat',
        '--format=',
        '--name-status',
        hash
      ])
      
      const files: CommitFile[] = []
      const lines = result.trim().split('\n').filter(line => line.trim())
      
      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length >= 2) {
          const status = parts[0]
          const path = parts[1]
          const oldPath = parts[2] // 用于重命名的情况
          
          let fileStatus: 'added' | 'modified' | 'deleted' | 'renamed' = 'modified'
          
          switch (status) {
            case 'A':
              fileStatus = 'added'
              break
            case 'M':
              fileStatus = 'modified'
              break
            case 'D':
              fileStatus = 'deleted'
              break
            case 'R':
              fileStatus = 'renamed'
              break
          }
          
          // 获取文件的变更行数
          let additions = 0
          let deletions = 0
          
          try {
            // 对于非删除文件，获取详细的变更统计
            if (fileStatus !== 'deleted') {
              const diffStat = await this.git.raw([
                'diff',
                '--numstat',
                `${hash}^`,
                hash,
                '--',
                path
              ])
              
              const statLine = diffStat.trim().split('\n')[0]
              if (statLine) {
                const statParts = statLine.split('\t')
                additions = parseInt(statParts[0]) || 0
                deletions = parseInt(statParts[1]) || 0
              }
            }
          } catch (error) {
            // 如果是第一次提交，没有父提交，使用简化的方式
            try {
              const diffStat = await this.git.raw([
                'show',
                '--numstat',
                '--format=',
                hash,
                '--',
                path
              ])
              
              const statLine = diffStat.trim().split('\n')[0]
              if (statLine) {
                const statParts = statLine.split('\t')
                additions = parseInt(statParts[0]) || 0
                deletions = parseInt(statParts[1]) || 0
              }
            } catch {
              // 忽略错误，使用默认值
            }
          }
          
          files.push({
            path,
            status: fileStatus,
            additions,
            deletions,
            ...(oldPath && { oldPath })
          })
        }
      }
      
      return files
    } catch (error) {
      console.error('获取提交文件失败:', error)
      return []
    }
  }

  async getCommitDiff(hash: string, filePath?: string): Promise<string> {
    if (!this.git) throw new Error('Git not initialized')
    
    try {
      if (filePath) {
        // 获取特定文件的diff
        return await this.git.raw([
          'show',
          hash,
          '--',
          filePath
        ])
      } else {
        // 获取整个提交的diff
        return await this.git.raw([
          'show',
          hash
        ])
      }
    } catch (error) {
      console.error('获取提交diff失败:', error)
      return ''
    }
  }

  async getDiff(file?: string): Promise<string> {
    if (!this.git) throw new Error('Git not initialized')
    
    if (file) {
      return await this.git.diff([file])
    } else {
      return await this.git.diff()
    }
  }

  async getStagedDiff(file?: string): Promise<string> {
    if (!this.git) throw new Error('Git not initialized')
    
    if (file) {
      return await this.git.diff(['--cached', file])
    } else {
      return await this.git.diff(['--cached'])
    }
  }

  async getRemotes(): Promise<GitRemote[]> {
    if (!this.git) throw new Error('Git not initialized')
    
    const remotes = await this.git.getRemotes(true)
    
    return remotes.map(remote => ({
      name: remote.name,
      url: remote.refs.fetch || remote.refs.push || ''
    }))
  }

  async addRemote(name: string, url: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.addRemote(name, url)
  }

  async removeRemote(name: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.removeRemote(name)
  }

  async discardChanges(files: string[]): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.checkout(files)
  }

  async discardAllChanges(): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.checkout('.')
  }

  async stash(message?: string): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    if (message) {
      await this.git.stash(['push', '-m', message])
    } else {
      await this.git.stash()
    }
  }

  async stashPop(): Promise<void> {
    if (!this.git) throw new Error('Git not initialized')
    await this.git.stash(['pop'])
  }

  async getStashList(): Promise<string[]> {
    if (!this.git) throw new Error('Git not initialized')
    const result = await this.git.stashList()
    return result.all.map(stash => stash.message)
  }

  async clone(url: string, directory: string): Promise<void> {
    const git = simpleGit()
    await git.clone(url, directory)
  }

  async init(directory: string): Promise<void> {
    const git = simpleGit(directory)
    await git.init()
  }

  dispose() {
    this.stopWatching()
    this.git = null
  }
}

// 单例模式
export const gitService = new GitService()