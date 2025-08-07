import { onMounted, onUnmounted } from 'vue'

interface ShortcutHandlers {
  selectDirectory?: () => void
  createRequirement?: () => void
  updateRequirement?: () => void
  createDesign?: () => void
  updateDesign?: () => void
  createTask?: () => void
  updateTask?: () => void
  executeTask?: () => void
  toggleTheme?: () => void
  showAbout?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyboard = (event: KeyboardEvent) => {
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const key = event.key.toLowerCase()
    
    if (ctrl && !shift && key === 'o') {
      event.preventDefault()
      handlers.selectDirectory?.()
    } else if (ctrl && !shift && key === 'n') {
      event.preventDefault()
      handlers.createRequirement?.()
    } else if (ctrl && !shift && key === 'u') {
      event.preventDefault()
      handlers.updateRequirement?.()
    } else if (ctrl && shift && key === 'n') {
      event.preventDefault()
      handlers.createDesign?.()
    } else if (ctrl && shift && key === 'u') {
      event.preventDefault()
      handlers.updateDesign?.()
    } else if (ctrl && !shift && key === 't') {
      event.preventDefault()
      handlers.createTask?.()
    } else if (ctrl && shift && key === 't') {
      event.preventDefault()
      handlers.updateTask?.()
    } else if (ctrl && !shift && key === 'e') {
      event.preventDefault()
      handlers.executeTask?.()
    } else if (ctrl && shift && key === 'd') {
      event.preventDefault()
      handlers.toggleTheme?.()
    } else if (key === 'f1') {
      event.preventDefault()
      handlers.showAbout?.()
    }
  }
  
  onMounted(() => {
    document.addEventListener('keydown', handleKeyboard)
  })
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyboard)
  })
  
  return {
    handleKeyboard
  }
}