/**
 * 词汇等级查询工具
 * 根据词汇查询对应的考试等级标签
 */

import vocabularyData from '../data/vocabulary-levels.json'

// 定义词汇等级类型
export type WordLevel = '初中' | '高中' | 'CET4' | 'CET6' | '考研' | 'IELTS' | 'TOEFL' | 'SAT' | 'GRE' | 'GMAT'

// 定义词汇条目类型
interface VocabularyEntry {
  word: string
  levels: WordLevel[]
}

// 构建词汇等级映射（用于快速查询）
const vocabularyMap: Map<string, WordLevel[]> = new Map()

// 初始化词汇映射
for (const entry of vocabularyData as VocabularyEntry[]) {
  vocabularyMap.set(entry.word.toLowerCase(), entry.levels)
}

/**
 * 查询单词对应的考试等级
 * @param word - 要查询的单词
 * @returns 考试等级数组，如果未找到则返回空数组
 */
export function getWordLevels(word: string): WordLevel[] {
  // 转换为小写并去除空格
  const normalizedWord = word.toLowerCase().trim()
  
  // 直接查询
  const levels = vocabularyMap.get(normalizedWord)
  
  if (levels) {
    return levels
  }
  
  // 尝试查询词根形式（去除常见后缀）
  const rootWord = getRootWord(normalizedWord)
  const rootLevels = vocabularyMap.get(rootWord)
  
  if (rootLevels) {
    return rootLevels
  }
  
  // 尝试查询复数形式
  const singularWord = getSingularForm(normalizedWord)
  const singularLevels = vocabularyMap.get(singularWord)
  
  if (singularLevels) {
    return singularLevels
  }
  
  return []
}

/**
 * 获取单词的词根形式（去除常见后缀）
 */
function getRootWord(word: string): string {
  // 常见后缀列表
  const suffixes = [
    'ing', 'ed', 'ly', 'er', 'est', 's', 'es', 
    'ment', 'ness', 'tion', 'sion', 'able', 'ible',
    'ful', 'less', 'ous', 'ive', 'al', 'ial'
  ]
  
  for (const suffix of suffixes) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      const root = word.slice(0, -suffix.length)
      // 检查词根是否存在于词库中
      if (vocabularyMap.has(root)) {
        return root
      }
      // 检查加e的形式
      if (vocabularyMap.has(root + 'e')) {
        return root + 'e'
      }
      // 检查去e的形式
      if (root.endsWith('e') && vocabularyMap.has(root.slice(0, -1))) {
        return root.slice(0, -1)
      }
    }
  }
  
  return word
}

/**
 * 获取单词的单数形式
 */
function getSingularForm(word: string): string {
  // 处理复数形式
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y'
  }
  if (word.endsWith('es')) {
    const singular = word.slice(0, -2)
    if (vocabularyMap.has(singular)) {
      return singular
    }
    return word.slice(0, -1)
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1)
  }
  
  return word
}

/**
 * 获取词汇的主要等级（用于显示）
 * 按照难度从低到高排序
 */
export function getPrimaryLevels(levels: WordLevel[]): WordLevel[] {
  // 定义等级优先级（从低到高）
  const levelPriority: WordLevel[] = [
    '初中', '高中', 'CET4', 'CET6', '考研', 
    'IELTS', 'TOEFL', 'SAT', 'GRE', 'GMAT'
  ]
  
  // 按优先级排序
  return levels.sort((a, b) => {
    return levelPriority.indexOf(a) - levelPriority.indexOf(b)
  })
}

/**
 * 获取词汇的等级标签文本
 * 用于前端显示
 */
export function getLevelLabels(word: string): string[] {
  const levels = getWordLevels(word)
  const sortedLevels = getPrimaryLevels(levels)
  
  // 如果没有找到等级，返回空数组
  if (sortedLevels.length === 0) {
    return []
  }
  
  // 返回等级标签
  return sortedLevels
}

/**
 * 检查词汇是否属于指定等级
 */
export function isWordInLevel(word: string, level: WordLevel): boolean {
  const levels = getWordLevels(word)
  return levels.includes(level)
}

/**
 * 获取词汇等级统计信息
 */
export function getVocabularyStats(): {
  totalWords: number
  levelCounts: Record<WordLevel, number>
} {
  const levelCounts: Record<WordLevel, number> = {
    '初中': 0,
    '高中': 0,
    'CET4': 0,
    'CET6': 0,
    '考研': 0,
    'IELTS': 0,
    'TOEFL': 0,
    'SAT': 0,
    'GRE': 0,
    'GMAT': 0,
  }
  
  for (const entry of vocabularyData as VocabularyEntry[]) {
    for (const level of entry.levels) {
      levelCounts[level]++
    }
  }
  
  return {
    totalWords: vocabularyData.length,
    levelCounts
  }
}