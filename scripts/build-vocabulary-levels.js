/**
 * 构建词汇等级库脚本 (简化版)
 * 从下载的词库文件中提取词汇并添加等级标签
 */

const fs = require('fs')
const path = require('path')

// 定义词库文件映射
const vocabularyFiles = [
  { file: 'json/1-初中-顺序.json', level: '初中' },
  { file: 'json/2-高中-顺序.json', level: '高中' },
  { file: 'json/3-CET4-顺序.json', level: 'CET4' },
  { file: 'json/4-CET6-顺序.json', level: 'CET6' },
  { file: 'json/5-考研-顺序.json', level: '考研' },
  { file: 'json/6-托福-顺序.json', level: 'TOEFL' },
  { file: 'json/7-SAT-顺序.json', level: 'SAT' },
]

// IELTS/GRE/GMAT 文件映射
const additionalFiles = [
  { file: 'json_original/json-simple/IELTS_2.json', level: 'IELTS' },
  { file: 'json_original/json-simple/IELTS_3.json', level: 'IELTS' },
  { file: 'json_original/json-simple/GRE_2.json', level: 'GRE' },
  { file: 'json_original/json-simple/GMAT_2.json', level: 'GMAT' },
]

/**
 * 从JSON文件中读取词汇列表
 */
function readVocabularyFile(filePath) {
  const fullPath = path.join(__dirname, '..', 'temp_vocab', filePath)
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`文件不存在: ${fullPath}`)
    return []
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8')
    const words = JSON.parse(content)
    
    // 提取单词列表
    return words.map(item => item.word.toLowerCase().trim())
  } catch (error) {
    console.error(`解析文件失败: ${filePath}`, error)
    return []
  }
}

/**
 * 构建词汇等级映射
 */
function buildVocabularyLevels() {
  const vocabularyMap = new Map()
  
  // 处理主要词库文件
  for (const { file, level } of vocabularyFiles) {
    const words = readVocabularyFile(file)
    console.log(`读取 ${level} 词库: ${words.length} 个单词`)
    
    for (const word of words) {
      if (!vocabularyMap.has(word)) {
        vocabularyMap.set(word, [])
      }
      const levels = vocabularyMap.get(word)
      if (!levels.includes(level)) {
        levels.push(level)
      }
    }
  }
  
  // 处理额外词库文件
  for (const { file, level } of additionalFiles) {
    const words = readVocabularyFile(file)
    console.log(`读取 ${level} 词库: ${words.length} 个单词`)
    
    for (const word of words) {
      if (!vocabularyMap.has(word)) {
        vocabularyMap.set(word, [])
      }
      const levels = vocabularyMap.get(word)
      if (!levels.includes(level)) {
        levels.push(level)
      }
    }
  }
  
  return vocabularyMap
}

/**
 * 将词汇等级映射转换为最终格式
 */
function convertToFinalFormat(vocabularyMap) {
  const result = []
  
  for (const [word, levels] of vocabularyMap) {
    result.push({ word, levels })
  }
  
  // 按字母顺序排序
  result.sort((a, b) => a.word.localeCompare(b.word))
  
  return result
}

/**
 * 主函数
 */
function main() {
  console.log('开始构建词汇等级库...')
  
  const vocabularyMap = buildVocabularyLevels()
  const vocabularyList = convertToFinalFormat(vocabularyMap)
  
  console.log(`总计词汇: ${vocabularyList.length} 个`)
  
  // 统计各等级词汇数量
  const levelCounts = {
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
  
  for (const entry of vocabularyList) {
    for (const level of entry.levels) {
      levelCounts[level]++
    }
  }
  
  console.log('各等级词汇统计:')
  for (const [level, count] of Object.entries(levelCounts)) {
    console.log(`  ${level}: ${count}`)
  }
  
  // 保存到文件
  const outputPath = path.join(__dirname, '..', 'data', 'vocabulary-levels.json')
  fs.writeFileSync(outputPath, JSON.stringify(vocabularyList, null, 2), 'utf-8')
  console.log(`词汇等级库已保存到: ${outputPath}`)
}

main()