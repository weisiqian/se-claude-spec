/**
 * 占位符替换工具
 * 渲染进程使用的占位符替换功能
 * 重新导出共享模块的功能
 */

export {
  replacePlaceholders,
  extractPlaceholders,
  validatePlaceholders,
  SUPPORTED_PLACEHOLDERS,
  getPlaceholderDescription,
  type PlaceholderData
} from '../../../shared/placeholderUtils'