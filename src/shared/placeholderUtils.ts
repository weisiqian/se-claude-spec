/**
 * 占位符工具
 * 共享的占位符替换逻辑，可在主进程和渲染进程中使用
 * 仅支持大写字母和下划线格式的占位符
 */

export interface PlaceholderData {
  userRequirement?: string
  userDesignRequest?: string
  jsonSchema?: string
  iterationId?: string
  [key: string]: any
}

/**
 * 替换文本中的占位符
 * 仅支持大写字母和下划线格式：{{USER_REQUIREMENT}}, {{JSON_SCHEMA}}, {{ITERATION_ID}}
 * @param text 原始文本
 * @param data 占位符数据
 * @returns 替换后的文本
 */
export function replacePlaceholders(text: string, data: PlaceholderData): string {
  let result = text
  
  // 替换用户需求 - 仅支持大写格式
  if (data.userRequirement !== undefined) {
    result = result.replace(/\{\{USER_REQUIREMENT\}\}/g, data.userRequirement)
  }
  
  // 替换用户设计要求 - 仅支持大写格式
  if (data.userDesignRequest !== undefined) {
    result = result.replace(/\{\{USER_DESIGN_REQUEST\}\}/g, data.userDesignRequest || '')
  }
  
  // 替换 JSON Schema - 仅支持大写格式
  if (data.jsonSchema !== undefined) {
    result = result.replace(/\{\{JSON_SCHEMA\}\}/g, data.jsonSchema || '')
  }
  
  // 替换迭代ID - 仅支持大写格式
  if (data.iterationId !== undefined) {
    result = result.replace(/\{\{ITERATION_ID\}\}/g, data.iterationId)
  }
  
  return result
}

/**
 * 获取文本中的所有占位符
 * @param text 文本
 * @returns 占位符列表
 */
export function extractPlaceholders(text: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g
  const placeholders: string[] = []
  let match
  
  while ((match = placeholderRegex.exec(text)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1])
    }
  }
  
  return placeholders
}

/**
 * 验证是否所有占位符都有对应的数据
 * @param text 文本
 * @param data 占位符数据
 * @returns 缺失的占位符列表
 */
export function validatePlaceholders(text: string, data: PlaceholderData): string[] {
  const placeholders = extractPlaceholders(text)
  const missingPlaceholders: string[] = []
  
  placeholders.forEach(placeholder => {
    // 只检查大写格式的占位符
    if (placeholder === 'USER_REQUIREMENT' && data.userRequirement === undefined) {
      missingPlaceholders.push(placeholder)
    } else if (placeholder === 'USER_DESIGN_REQUEST' && data.userDesignRequest === undefined) {
      missingPlaceholders.push(placeholder)
    } else if (placeholder === 'JSON_SCHEMA' && data.jsonSchema === undefined) {
      missingPlaceholders.push(placeholder)
    } else if (placeholder === 'ITERATION_ID' && data.iterationId === undefined) {
      missingPlaceholders.push(placeholder)
    } else if (!['USER_REQUIREMENT', 'USER_DESIGN_REQUEST', 'JSON_SCHEMA', 'ITERATION_ID'].includes(placeholder)) {
      // 不是预定义的占位符，视为缺失
      missingPlaceholders.push(placeholder)
    }
  })
  
  return missingPlaceholders
}

/**
 * 支持的占位符列表
 */
export const SUPPORTED_PLACEHOLDERS = {
  USER_REQUIREMENT: '用户需求',
  USER_DESIGN_REQUEST: '设计要求',
  JSON_SCHEMA: 'JSON Schema',
  ITERATION_ID: '迭代ID'
} as const

/**
 * 获取占位符的描述
 * @param placeholder 占位符名称
 * @returns 占位符描述
 */
export function getPlaceholderDescription(placeholder: keyof typeof SUPPORTED_PLACEHOLDERS): string {
  return SUPPORTED_PLACEHOLDERS[placeholder] || placeholder
}