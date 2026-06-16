import OpenAI from 'openai'
import { getLevelLabels } from './vocabulary-levels'

// Initialize DeepSeek client (API compatible with OpenAI format)
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
})

// Model name from environment variable, fallback to deepseek-chat
const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

// Timeout for AI API call (60 seconds)
const AI_TIMEOUT = 60000

// Type definitions for analysis result
export interface GrammarError {
  id: string
  type: string
  typeName: string
  originalText: string
  startIndex: number
  endIndex: number
  suggestion: string
  explanation: string
}

export interface VocabularySuggestionItem {
  word: string
  level: string
  levelName: string
  difficultyTags: string[] // 难度标签，如 ['初中', '高中', 'CET4', 'CET6', '考研']
  definition: string
  example: string
}

export interface VocabularySuggestion {
  id: string
  originalWord: string
  startIndex: number
  endIndex: number
  suggestions: VocabularySuggestionItem[]
}

export interface CollocationSuggestion {
  id: string
  originalText: string
  startIndex: number
  endIndex: number
  suggestion: string
  explanation: string
  example: string
}

export interface UpgradeSuggestionItem {
  word: string
  level: string
  levelName: string
  difficultyTags: string[] // 难度标签，如 ['初中', '高中', 'CET4', 'CET6', '考研']
  definition: string
  example: string
}

export interface UpgradeSuggestion {
  id: string
  originalText: string
  startIndex: number
  endIndex: number
  suggestions: UpgradeSuggestionItem[]
  explanation: string
}

export interface AiAnalysisResult {
  grammarErrors: GrammarError[]
  vocabularySuggestions: VocabularySuggestion[]
  collocationSuggestions: CollocationSuggestion[]
  upgradeSuggestions: UpgradeSuggestion[]
  overallScore: number
  strengths: string[]
  improvements: string[]
}

// Convert English level to Chinese display name
function getLevelDisplayName(level: string): string {
  const levelMap: Record<string, string> = {
    primary: '小学阶段',
    junior: '初中阶段',
    senior: '高中阶段',
    cet4: '大学英语四级',
    cet6: '大学英语六级',
    ielts: '雅思',
    toefl: '托福',
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
  }
  return levelMap[level] || '小学阶段'
}

// Get level tier for adaptive evaluation
function getLevelTier(level: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const tierMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
    primary: 1,   // 小学
    junior: 2,    // 初中
    senior: 3,    // 高中
    cet4: 4,      // 四级
    cet6: 5,      // 六级
    ielts: 6,     // 雅思
    toefl: 7,     // 托福
    beginner: 2,   // 旧版初级映射到初中
    intermediate: 4, // 旧版中级映射到四级
    advanced: 6,   // 旧版高级映射到雅思
  }
  return tierMap[level] || 1
}

// Get evaluation criteria based on user level
function getEvaluationCriteria(level: string): {
  grammarStrictness: 'lenient' | 'normal' | 'strict'
  vocabularyDepth: 'basic' | 'intermediate' | 'advanced'
  collocationComplexity: 'simple' | 'moderate' | 'complex'
  upgradeIntensity: 'minimal' | 'moderate' | 'aggressive'
  scoreBias: number
} {
  const tier = getLevelTier(level)
  
  // Tier 1-2: 小学、初中 - 宽松标准
  if (tier <= 2) {
    return {
      grammarStrictness: 'lenient',
      vocabularyDepth: 'basic',
      collocationComplexity: 'simple',
      upgradeIntensity: 'minimal',
      scoreBias: 15 // 加分偏置，鼓励初学者
    }
  }
  // Tier 3-4: 高中、四级 - 正常标准
  else if (tier <= 4) {
    return {
      grammarStrictness: 'normal',
      vocabularyDepth: 'intermediate',
      collocationComplexity: 'moderate',
      upgradeIntensity: 'moderate',
      scoreBias: 5
    }
  }
  // Tier 5-7: 六级、雅思、托福 - 严格标准
  else {
    return {
      grammarStrictness: 'strict',
      vocabularyDepth: 'advanced',
      collocationComplexity: 'complex',
      upgradeIntensity: 'aggressive',
      scoreBias: -5 // 减分偏置，要求更高
    }
  }
}

/**
 * Validate and supplement suggestions to ensure minimum requirements are met
 */
function validateAndSupplementSuggestions(result: AiAnalysisResult): AiAnalysisResult {
  // Ensure arrays are initialized
  result.grammarErrors = result.grammarErrors || []
  result.vocabularySuggestions = result.vocabularySuggestions || []
  result.collocationSuggestions = result.collocationSuggestions || []
  result.upgradeSuggestions = result.upgradeSuggestions || []
  
  // Helper function to get difficulty tags based on level
  const getDifficultyTags = (level: string): string[] => {
    switch (level) {
      case 'beginner':
        return ['初中']
      case 'intermediate':
        return ['高中', 'CET4']
      case 'advanced':
        return ['CET6', '考研']
      default:
        return ['初中']
    }
  }
  
  // Add difficulty tags to vocabulary suggestions from AI using vocabulary levels database
  result.vocabularySuggestions.forEach(vocab => {
    vocab.suggestions.forEach(suggestion => {
      if (!suggestion.difficultyTags || suggestion.difficultyTags.length === 0) {
        // 使用词汇等级库查询真实等级
        const realLevels = getLevelLabels(suggestion.word)
        if (realLevels.length > 0) {
          suggestion.difficultyTags = realLevels
        } else {
          // 如果词库中没有，使用默认映射
          suggestion.difficultyTags = getDifficultyTags(suggestion.level)
        }
      }
    })
  })
  
  // Add difficulty tags to upgrade suggestions from AI using vocabulary levels database
  result.upgradeSuggestions.forEach(upgrade => {
    upgrade.suggestions.forEach(suggestion => {
      if (!suggestion.difficultyTags || suggestion.difficultyTags.length === 0) {
        // 使用词汇等级库查询真实等级
        const realLevels = getLevelLabels(suggestion.word)
        if (realLevels.length > 0) {
          suggestion.difficultyTags = realLevels
        } else {
          // 如果词库中没有，使用默认映射
          suggestion.difficultyTags = getDifficultyTags(suggestion.level)
        }
      }
    })
  })
  
  // Vocabulary suggestions: at least 3
  if (result.vocabularySuggestions.length < 3) {
    console.log('[AI Analyzer] Supplementing vocabulary suggestions...')
    const baseVocabulary = [
      { word: 'good', suggestions: [
        { word: 'excellent', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '优秀的', example: 'She did an excellent job.' },
        { word: 'outstanding', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '杰出的', example: 'He made an outstanding contribution.' }
      ]},
      { word: 'happy', suggestions: [
        { word: 'delighted', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '高兴的', example: 'I was delighted to meet you.' },
        { word: 'overjoyed', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '欣喜若狂的', example: 'She was overjoyed at the news.' }
      ]},
      { word: 'think', suggestions: [
        { word: 'believe', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '相信', example: 'I believe you are right.' },
        { word: 'convinced', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '确信的', example: 'I am convinced of his innocence.' }
      ]},
      { word: 'get', suggestions: [
        { word: 'obtain', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '获得', example: 'He obtained a degree.' },
        { word: 'acquire', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '获取', example: 'She acquired new skills.' }
      ]},
      { word: 'help', suggestions: [
        { word: 'assist', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '协助', example: 'I will assist you.' },
        { word: 'facilitate', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '促进', example: 'The tool facilitates learning.' }
      ]}
    ]
    
    const existingWords = new Set(result.vocabularySuggestions.map(v => v.originalWord.toLowerCase()))
    let idCounter = Date.now()
    
    for (const vocab of baseVocabulary) {
      if (result.vocabularySuggestions.length >= 3) break
      if (!existingWords.has(vocab.word)) {
        result.vocabularySuggestions.push({
          id: `vocab_${idCounter++}`,
          originalWord: vocab.word,
          startIndex: -1,
          endIndex: -1,
          suggestions: vocab.suggestions
        })
      }
    }
  }
  
  // Collocation suggestions: at least 2
  if (result.collocationSuggestions.length < 2) {
    console.log('[AI Analyzer] Supplementing collocation suggestions...')
    const baseCollocations = [
      { text: 'make progress', suggestion: 'make headway', explanation: '"make headway" 更地道，表示取得进展', example: 'We are making headway on the project.' },
      { text: 'a lot of', suggestion: 'numerous', explanation: '"numerous" 更正式，表示许多', example: 'There are numerous reasons to learn English.' },
      { text: 'very happy', suggestion: 'delighted', explanation: '使用更精确的形容词替代 "very + 形容词" 结构', example: 'She was delighted with the result.' },
      { text: 'help me', suggestion: 'assist me', explanation: '"assist" 更正式，表示帮助', example: 'Could you assist me with this?' }
    ]
    
    const existingTexts = new Set(result.collocationSuggestions.map(c => c.originalText.toLowerCase()))
    let idCounter = Date.now()
    
    for (const collocation of baseCollocations) {
      if (result.collocationSuggestions.length >= 2) break
      if (!existingTexts.has(collocation.text)) {
        result.collocationSuggestions.push({
          id: `colloc_${idCounter++}`,
          originalText: collocation.text,
          startIndex: -1,
          endIndex: -1,
          suggestion: collocation.suggestion,
          explanation: collocation.explanation,
          example: collocation.example
        })
      }
    }
  }
  
  // Upgrade suggestions: at least 2
  if (result.upgradeSuggestions.length < 2) {
    console.log('[AI Analyzer] Supplementing upgrade suggestions...')
    const baseUpgrades = [
      { text: 'I think', suggestions: [
        { word: 'I believe', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '我相信', example: 'I believe this is the right choice.' },
        { word: 'I am convinced', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '我确信', example: 'I am convinced of its importance.' }
      ], explanation: '使用更正式、更有说服力的表达' },
      { text: 'a lot of', suggestions: [
        { word: 'numerous', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '许多的', example: 'Numerous people attended the event.' },
        { word: 'a plethora of', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '大量的', example: 'There is a plethora of options.' }
      ], explanation: '使用更正式的书面表达替代口语化短语' },
      { text: 'very happy', suggestions: [
        { word: 'delighted', level: 'intermediate', levelName: '中级', difficultyTags: ['高中', 'CET4'], definition: '高兴的', example: 'I was delighted to hear the news.' },
        { word: 'elated', level: 'advanced', levelName: '高级', difficultyTags: ['CET6', '考研'], definition: '兴高采烈的', example: 'The team was elated after winning.' }
      ], explanation: '使用更精确的形容词替代 "very + 形容词" 结构' }
    ]
    
    const existingTexts = new Set(result.upgradeSuggestions.map(u => u.originalText.toLowerCase()))
    let idCounter = Date.now()
    
    for (const upgrade of baseUpgrades) {
      if (result.upgradeSuggestions.length >= 2) break
      if (!existingTexts.has(upgrade.text)) {
        result.upgradeSuggestions.push({
          id: `upgrade_${idCounter++}`,
          originalText: upgrade.text,
          startIndex: -1,
          endIndex: -1,
          suggestions: upgrade.suggestions,
          explanation: upgrade.explanation
        })
      }
    }
  }
  
  return result
}

/**
 * Extract JSON from AI response (handles markdown code blocks and extra text)
 * @param text - Raw AI response text
 * @returns Parsed JSON object
 */
function extractJsonFromResponse(text: string): AiAnalysisResult {
  console.log('[AI Analyzer] ==================== JSON EXTRACTION START ====================')
  console.log('[AI Analyzer] Raw response length:', text.length, 'characters')
  
  // Log full response for debugging
  console.log('[AI Analyzer] Full raw response:')
  console.log(text)
  console.log('[AI Analyzer] ==================== RAW RESPONSE END ====================')

  // Step 1: Try direct JSON parse (most common case)
  console.log('[AI Analyzer] Step 1: Direct JSON.parse attempt...')
  try {
    let result = JSON.parse(text) as AiAnalysisResult
    console.log('[AI Analyzer] ✓ SUCCESS: Direct JSON.parse worked!')
    
    // Validate and supplement missing suggestions
    result = validateAndSupplementSuggestions(result)
    
    console.log('[AI Analyzer] Parsed result summary:', {
      grammarErrors: result.grammarErrors?.length || 0,
      vocabularySuggestions: result.vocabularySuggestions?.length || 0,
      collocationSuggestions: result.collocationSuggestions?.length || 0,
      upgradeSuggestions: result.upgradeSuggestions?.length || 0,
      overallScore: result.overallScore,
      strengths: result.strengths?.length || 0,
      improvements: result.improvements?.length || 0
    })
    return result
  } catch (e) {
    const errorMsg = (e as Error).message
    console.log('[AI Analyzer] ✗ Direct parse failed:', errorMsg)
    
    // Log error position if available
    const posMatch = errorMsg.match(/position\s+(\d+)/i)
    if (posMatch) {
      const pos = parseInt(posMatch[1])
      console.log('[AI Analyzer] Error at position:', pos)
      console.log('[AI Analyzer] Context around error:')
      console.log(text.slice(Math.max(0, pos - 30), Math.min(text.length, pos + 30)))
    }
  }

  // Step 2: Extract from markdown code block
  console.log('[AI Analyzer] Step 2: Looking for markdown code block...')
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    console.log('[AI Analyzer] Found code block, content length:', codeBlockMatch[1].length)
    try {
      const result = JSON.parse(codeBlockMatch[1].trim()) as AiAnalysisResult
      console.log('[AI Analyzer] ✓ SUCCESS: Parsed from markdown code block!')
      return result
    } catch (e) {
      console.log('[AI Analyzer] ✗ Code block parse failed:', (e as Error).message)
    }
  }

  // Step 3: Extract JSON between first { and last }
  console.log('[AI Analyzer] Step 3: Extracting JSON between braces...')
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = text.slice(firstBrace, lastBrace + 1)
    console.log('[AI Analyzer] Extracted JSON length:', jsonStr.length)
    try {
      const result = JSON.parse(jsonStr) as AiAnalysisResult
      console.log('[AI Analyzer] ✓ SUCCESS: Parsed extracted JSON!')
      return result
    } catch (e) {
      console.log('[AI Analyzer] ✗ Extracted JSON parse failed:', (e as Error).message)
      
      // Try to fix common issues
      console.log('[AI Analyzer] Step 3b: Attempting to fix JSON...')
      let fixedJson = jsonStr
        // Fix trailing commas before ] or }
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}')
        // Fix missing quotes on keys
        .replace(/(\w+)(?=\s*:)/g, '"$1"')
        // Remove any control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
      
      try {
        const result = JSON.parse(fixedJson) as AiAnalysisResult
        console.log('[AI Analyzer] ✓ SUCCESS: Parsed fixed JSON!')
        return result
      } catch (e2) {
        console.log('[AI Analyzer] ✗ Fixed JSON still failed:', (e2 as Error).message)
      }
    }
  }

  // Step 4: Try to find and parse grammarErrors section specifically
  console.log('[AI Analyzer] Step 4: Looking for grammarErrors pattern...')
  const grammarMatch = text.match(/"grammarErrors"\s*:\s*\[[\s\S]*?\]/)
  if (grammarMatch) {
    console.log('[AI Analyzer] Found grammarErrors array')
    // Try to reconstruct minimal valid JSON
    try {
      // Extract all arrays using more flexible regex
      const extractArray = (key: string): any[] => {
        const match = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`))
        if (match) {
          try {
            return JSON.parse(`[${match[1]}]`)
          } catch {
            return []
          }
        }
        return []
      }
      
      const scoreMatch = text.match(/"overallScore"\s*:\s*(\d+)/)
      
      const result: AiAnalysisResult = {
        grammarErrors: extractArray('grammarErrors'),
        vocabularySuggestions: extractArray('vocabularySuggestions'),
        collocationSuggestions: extractArray('collocationSuggestions'),
        upgradeSuggestions: extractArray('upgradeSuggestions'),
        overallScore: scoreMatch ? parseInt(scoreMatch[1]) : 75,
        strengths: extractArray('strengths'),
        improvements: extractArray('improvements')
      }
      
      console.log('[AI Analyzer] ✓ SUCCESS: Reconstructed JSON from parts!')
      return result
    } catch (e) {
      console.log('[AI Analyzer] ✗ Reconstruction failed:', (e as Error).message)
    }
  }

  // All attempts failed
  console.error('[AI Analyzer] ==================== ALL PARSE ATTEMPTS FAILED ====================')
  console.error('[AI Analyzer] This indicates the AI response format is unexpected')
  console.error('[AI Analyzer] Please check the raw response above for issues')
  
  // Return a fallback result instead of throwing
  console.log('[AI Analyzer] Returning fallback analysis result...')
  const fallbackResult: AiAnalysisResult = {
    grammarErrors: [],
    vocabularySuggestions: [],
    collocationSuggestions: [],
    upgradeSuggestions: [],
    overallScore: 50,
    strengths: ['AI 分析结果无法解析，请查看原始内容'],
    improvements: ['请尝试重新分析或检查 AI 服务配置']
  }
  
  return fallbackResult
}

/**
 * Build the prompt for AI analysis with level-based evaluation
 * @param content - Diary content text
 * @param levelDisplayName - User's English level in Chinese
 * @param userLevel - User's English level code
 * @returns Complete prompt string
 */
function buildAnalysisPrompt(content: string, levelDisplayName: string, userLevel: string): string {
  const tier = getLevelTier(userLevel)
  const criteria = getEvaluationCriteria(userLevel)
  
  // Build level-specific instructions
  let levelInstructions = ''
  let grammarFocus = ''
  let vocabularyFocus = ''
  let collocationFocus = ''
  let upgradeFocus = ''
  
  if (tier <= 2) {
    // 小学、初中 - 宽松标准
    levelInstructions = `
【水平适配说明 - ${levelDisplayName}】
- 语法检查：重点关注明显的时态错误、主谓不一致、基础拼写错误
- 词汇建议：推荐常用、实用的替换词，避免过于生僻的词汇
- 评价标准：以鼓励为主，对基础语法错误宽容，重视学习积极性
- 评分倾向：适当加分，鼓励初学者建立信心
    `.trim()
    
    grammarFocus = '重点检查明显的语法错误（时态、主谓一致、基础拼写），小的语法瑕疵可以宽容对待'
    vocabularyFocus = '推荐常用、高频词汇，避免过于生僻的单词'
    collocationFocus = '识别常见搭配错误，提供简单实用的替换'
    upgradeFocus = '仅建议最明显的升级机会，避免让初学者感到压力'
  } else if (tier <= 4) {
    // 高中、四级 - 正常标准
    levelInstructions = `
【水平适配说明 - ${levelDisplayName}】
- 语法检查：全面检查各类语法错误，包括时态、主谓一致、冠词、介词等
- 词汇建议：提供中级难度的替换词，逐步提升词汇多样性
- 评价标准：平衡鼓励与严格要求，帮助学生巩固基础并提升能力
- 评分倾向：标准评分，既肯定优点也指出改进空间
    `.trim()
    
    grammarFocus = '全面检查语法错误，包括时态、主谓一致、冠词、介词使用'
    vocabularyFocus = '提供中级难度的词汇替换，丰富表达多样性'
    collocationFocus = '识别搭配不当或不够地道的表达，提供自然的替换'
    upgradeFocus = '建议合理的升级机会，帮助提升表达质量'
  } else {
    // 六级、雅思、托福 - 严格标准
    levelInstructions = `
【水平适配说明 - ${levelDisplayName}】
- 语法检查：严格检查所有语法细节，包括复杂句结构、时态一致性、从句使用等
- 词汇建议：提供高级词汇替换，注重精确表达和风格多样性
- 评价标准：高标准严要求，关注表达的准确性、地道性和专业性
- 评分倾向：适当减分，要求更高的语言质量
    `.trim()
    
    grammarFocus = '严格检查所有语法细节，包括复杂句结构、时态一致性、从句使用等'
    vocabularyFocus = '提供高级词汇替换，注重精确表达和风格多样性'
    collocationFocus = '识别不够地道的搭配，提供更专业、更自然的表达'
    upgradeFocus = '积极建议升级机会，提升表达的专业性和地道性'
  }

  return `你是一位专业的英语老师，擅长根据学生的英语水平提供个性化的写作指导。请全面分析以下英文日记内容，务必同时提供以下四类分析结果：

1. 语法错误检查：找出所有语法错误（时态、主谓一致、冠词、介词、拼写等）
2. 词汇替换建议：识别可以用更精确词汇替换的常用词，提供不同难度的替换选项
3. 搭配优化建议：识别用词搭配不当或可以优化的短语，提供更地道的表达
4. 升级建议：识别"正确但平庸"的表达，提供更高级、更地道的替换

${levelInstructions}

【强制性要求】
- grammarErrors（语法错误）：${grammarFocus}，至少返回所有明显错误
- vocabularySuggestions（词汇建议）：${vocabularyFocus}，至少3个。如果文中没有明显的"错误词汇"，请主动识别以下基础词汇并提供替换：good, bad, nice, big, small, happy, sad, get, make, do, have, help, think, say, go, come, very + 任何形容词, but, and, so, because。这些词即使使用正确，也必须提供同义替换建议。
- collocationSuggestions（搭配建议）：${collocationFocus}，至少2个。请主动检查以下常见搭配：make + 名词（make progress, make a decision等）、get + 形容词/名词、very + 形容词、a lot of + 名词、help + 人、任何动词 + 介词组合。即使搭配没有错误，也可以提供更地道的替代表达。
- upgradeSuggestions（升级建议）：${upgradeFocus}，至少2个。识别文中"正确但平庸"的短语：I think / I believe、a lot of / lots of、very + 形容词、in my opinion、because / so。

请严格遵守以上要求，确保每类建议都满足最低数量要求。

用户英语水平：${levelDisplayName}

=== 重要索引规则 ===
1. startIndex 和 endIndex 必须是原始文本中的精确字符位置（从0开始计数）
2. originalText（或 originalWord）必须是原始文本中从 startIndex 到 endIndex 的精确子串
3. 确保标出的是完整的词、短语或句子片段，不要只标出单词的一部分
4. 如果发现 "I go to school yesterday" 中的 "go" 应该是 "went"，那么：
   - originalText = "go"
   - startIndex = 2（"I " 之后的位置）
   - endIndex = 5（"go" 结束后的位置）
5. 对于多词短语，如 "very happy"，确保索引包含完整短语
6. 验证方法：content.substring(startIndex, endIndex) 必须等于 originalText

=== 输出格式要求 ===
请按照以下格式输出 JSON：
{
  "grammarErrors": [...],
  "vocabularySuggestions": [...],
  "collocationSuggestions": [...],
  "upgradeSuggestions": [...],
  "overallScore": 数字(0-100),
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进点1", "改进点2"]
}

1. grammarErrors 中的每个错误需要包含：id, type, typeName, originalText, startIndex, endIndex, suggestion, explanation
2. vocabularySuggestions 中的每个建议需要包含：id, originalWord, startIndex, endIndex, suggestions（包含 word, level, levelName, definition, example）
3. collocationSuggestions 中的每个建议需要包含：id, originalText, startIndex, endIndex, suggestion, explanation, example
4. upgradeSuggestions 中的每个建议需要包含：id, originalText, startIndex, endIndex, suggestions（包含 word, level, levelName, definition, example）, explanation
5. startIndex 和 endIndex 是在原始文本中的字符索引位置（从0开始）
6. vocabularySuggestions 和 upgradeSuggestions 的 level 只能是：beginner（初级）、intermediate（中级）、advanced（高级）
7. vocabularySuggestions 和 upgradeSuggestions 的 levelName 只能是：初级、中级、高级
8. grammarErrors 的 typeName 只能是：时态错误、主谓不一致、冠词错误、介词错误、拼写错误、名词单复数、动词形式错误、其他
9. 词汇建议应根据用户水平提供合适难度的替换词：
   - 小学/初中水平：优先推荐初级和中级词汇
   - 高中/四级水平：均衡推荐各难度词汇
   - 六级/雅思/托福水平：优先推荐中级和高级词汇
10. 输出必须是有效的 JSON 格式，不要包含 markdown 代码块，不要包含其他内容

=== 词汇建议说明 ===
vocabularySuggestions（词汇建议）是识别文中"正确但基础"的词汇，提供同义替换：

**重点识别以下类型的词汇：**
- 高频基础词：good, bad, nice, big, small, happy, sad, get, make, do, help, think, say, go, come
- very + 形容词 结构：very happy, very good, very big → 替换为更精确的形容词
- 模糊动词：get, make, do, have → 替换为更具体动词
- 简单连接词：but, and, so → 替换为更高级连接词

**每个词汇建议必须包含：**
- originalWord: 原文中的词汇（完整单词或短语）
- startIndex/endIndex: 在原文中的精确字符位置
- suggestions: 2-3个替换选项，按难度分级（初级/中级/高级）

**具体示例：**
- "good" → "excellent"(中级), "outstanding"(高级)
- "very happy" → "delighted"(中级), "overjoyed"(高级)
- "get" → "obtain"(中级), "acquire"(高级)
- "help" → "assist"(中级), "facilitate"(高级)
- "big" → "substantial"(中级), "significant"(高级)
- "but" → "however"(中级), "nevertheless"(高级)

**要求：** 每篇日记至少提供3-5个词汇建议，确保覆盖不同类型的基础词汇

=== 搭配建议说明 ===
collocationSuggestions（搭配建议）是识别用词搭配不当或可以优化的短语：
- 识别不正确的搭配，如 "make a homework" 应改为 "do homework"
- 识别可以优化的常见搭配，如 "very happy" 可优化为更地道的表达
- 提供正确的搭配建议、解释和例句
- 示例："make progress" → "forge ahead" 或 "make headway"

=== 升级建议说明 ===
upgradeSuggestions（升级建议）是识别文中"正确但平庸"的短语和表达，提供更高级、更地道的替换：

**重点识别以下模式：**
- very + 形容词 → 替换为更精确的形容词（如 very happy → delighted/overjoyed）
- I think / I believe → 更正式的表达观点短语（如 I am convinced / From my perspective）
- a lot of / lots of → 更正式的量化表达（如 numerous / a plethora of）
- because / so → 更正式的连接表达（如 therefore / consequently）
- get / make / do + 名词 → 更具体的动词（如 get help → obtain assistance）
- help + 人 → 更正式的表达（如 assist / lend a hand）
- good / bad + 名词 → 更具体的评价（如 good result → favorable outcome）
- in my opinion → 更正式的表达（如 personally / from my perspective）

**每个升级建议必须包含：**
- originalText: 原文中的短语（完整短语）
- startIndex/endIndex: 在原文中的精确字符位置
- suggestions: 2-3个替换选项，按难度分级（初级/中级/高级）
- explanation: 说明为什么这个替换更好（语法说明或表达效果）

**具体示例：**
- "very happy" → "delighted"(中级), "overjoyed"(高级)，理由：使用更精确的形容词使表达更简洁有力
- "I think" → "I believe"(中级), "I am convinced"(高级)，理由：更正式、更有说服力
- "a lot of" → "numerous"(中级), "a plethora of"(高级)，理由：更正式的书面表达
- "because" → "since"(中级), "due to the fact that"(高级)，理由：更正式的连接词

**要求：** 每篇日记最多5-8个升级建议，避免过度建议

=== 评分标准（根据用户水平动态调整）===
- ${levelDisplayName}水平评分原则：
  - 基础语法正确：+20分
  - 词汇使用恰当：+20分  
  - 句子结构多样：+20分
  - 表达流畅自然：+20分
  - 内容丰富有深度：+20分
  - 语法错误扣分：根据错误严重程度扣1-5分/处
  - 词汇单调扣分：过度使用基础词汇扣1-3分/词

=== 示例输出格式 ===
{
  "grammarErrors": [
    {"id": "ge1", "type": "tense", "typeName": "时态错误", "originalText": "go", "startIndex": 9, "endIndex": 11, "suggestion": "went", "explanation": "描述过去事件应使用过去式"}
  ],
  "vocabularySuggestions": [
    {"id": "vs1", "originalWord": "good", "startIndex": 31, "endIndex": 35, "suggestions": [{"word": "excellent", "level": "intermediate", "levelName": "中级", "definition": "极好的", "example": "The weather was excellent."}]}
  ],
  "collocationSuggestions": [
    {"id": "cs1", "originalText": "very good", "startIndex": 27, "endIndex": 36, "suggestion": "excellent", "explanation": "更简洁的表达", "example": "The weather was excellent."}
  ],
  "upgradeSuggestions": [
    {"id": "us1", "originalText": "very happy", "startIndex": 45, "endIndex": 55, "suggestions": [{"word": "delighted", "level": "intermediate", "levelName": "中级", "definition": "高兴的，欣喜的", "example": "I was delighted to receive the invitation."}, {"word": "overjoyed", "level": "advanced", "levelName": "高级", "definition": "欣喜若狂的", "example": "She was overjoyed at the news."}], "explanation": "使用更精确的形容词替代 'very + 形容词' 结构，使表达更简洁有力"}
  ],
  "overallScore": 75,
  "strengths": ["句子结构基本正确", "使用了恰当的时间状语"],
  "improvements": ["注意过去式的使用", "尝试使用更多样化的词汇"]
}

=== 验证检查 ===
输出前请自行验证：
1. 所有 startIndex >= 0
2. 所有 endIndex <= 原文长度
3. 所有 startIndex < endIndex
4. content.substring(startIndex, endIndex) === originalText（或 originalWord）

日记内容：
${content}`
}

/**
 * Analyze diary content using OpenAI API
 * @param content - Diary content text
 * @param userLevel - User's English level (beginner/intermediate/advanced)
 * @returns AI analysis result
 */
export async function analyzeDiary(
  content: string,
  userLevel: string
): Promise<AiAnalysisResult> {
  const levelDisplayName = getLevelDisplayName(userLevel)
  const prompt = buildAnalysisPrompt(content, levelDisplayName, userLevel)

  // Validate DeepSeek API Key
  const apiKey = process.env.DEEPSEEK_API_KEY
  console.log(`[AI Analyzer] DeepSeek API Key configured: ${apiKey ? `Yes (length: ${apiKey.length})` : 'No'}`)
  
  // Check if API key is valid (not placeholder)
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'your-deepseek-api-key-here') {
    console.error('[AI Analyzer] Error: DEEPSEEK_API_KEY is not properly configured')
    console.error('[AI Analyzer] Please set a valid DeepSeek API Key in .env.local')
    throw new Error('AI 服务未配置，请联系管理员设置有效的 DeepSeek API Key')
  }

  // Log partial API key for debugging (hide most of it for security)
  const maskedKey = apiKey.startsWith('sk-') ? `sk-${'*'.repeat(apiKey.length - 4)}${apiKey.slice(-4)}` : apiKey
  console.log(`[AI Analyzer] Masked API Key: ${maskedKey}`)

  console.log(`[AI Analyzer] 使用 DeepSeek API 进行 AI 分析...`)
  console.log(`[AI Analyzer] Starting analysis for content (${content.length} chars), user level: ${userLevel}`)
  console.log(`[AI Analyzer] User level display name: ${levelDisplayName}`)
  console.log(`[AI Analyzer] Using model: ${AI_MODEL}`)
  console.log(`[AI Analyzer] Base URL: https://api.deepseek.com/v1`)
  console.log(`[AI Analyzer] Timeout: ${AI_TIMEOUT}ms`)

  try {
    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      console.error('[AI Analyzer] Timeout: AI analysis took longer than 60 seconds')
      abortController.abort()
    }, AI_TIMEOUT)

    console.log('[AI Analyzer] Calling DeepSeek API...')
    console.log('[AI Analyzer] Prompt preview:', prompt.slice(0, 100), '...')
    
    const completion = await deepseek.chat.completions.create(
      {
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000,
      },
      {
        signal: abortController.signal,
      }
    )

    clearTimeout(timeoutId)

    const result = completion.choices[0]?.message?.content

    console.log(`[AI Analyzer] DeepSeek API call successful`)
    console.log(`[AI Analyzer] Result length: ${result?.length || 0} characters`)
    console.log(`[AI Analyzer] Raw response (first 500 chars):`, result?.slice(0, 500) || 'Empty')

    if (!result) {
      console.error('[AI Analyzer] Error: AI returned empty content')
      throw new Error('AI 未返回任何内容')
    }

    console.log('[AI Analyzer] Attempting to parse JSON...')
    const parsedResult = extractJsonFromResponse(result)
    console.log('[AI Analyzer] JSON extraction successful')
    console.log('[AI Analyzer] Analysis result:', JSON.stringify({
      grammarErrors: parsedResult.grammarErrors.length,
      vocabularySuggestions: parsedResult.vocabularySuggestions.length,
      collocationSuggestions: parsedResult.collocationSuggestions.length,
      overallScore: parsedResult.overallScore,
      strengths: parsedResult.strengths.length,
      improvements: parsedResult.improvements.length
    }))
    
    // Validate and correct indices
    console.log('[AI Analyzer] Validating and correcting indices...')
    const validatedResult = validateAndCorrectAnalysisResult(parsedResult, content)
    
    console.log('[AI Analyzer] DeepSeek AI 分析完成！')
    return validatedResult
  } catch (error: unknown) {
    // Handle timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[AI Analyzer] Error: AI analysis timed out after 60 seconds')
      throw new Error('分析超时，请重试')
    }

    // Handle DeepSeek API errors
    if (error instanceof Error) {
      console.error('[AI Analyzer] DeepSeek API error:', error.message)
      console.error('[AI Analyzer] Error stack:', error.stack)

      if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
        throw new Error('API 密钥无效，请联系管理员检查配置')
      }

      if (error.message.includes('rate limit') || error.message.includes('RateLimitError')) {
        throw new Error('请求过于频繁，请稍后再试')
      }

      if (error.message.includes('model') || error.message.includes('NotFoundError')) {
        throw new Error('模型配置错误，请联系管理员')
      }

      if (error.message.includes('insufficient_quota') || error.message.includes('quota')) {
        throw new Error('API 余额不足，请联系管理员充值')
      }

      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ECONN') || error.message.includes('getaddrinfo')) {
        throw new Error('网络连接失败，请检查网络或稍后重试')
      }

      // Handle authentication errors
      if (error.message.includes('authentication') || error.message.includes('Unauthorized')) {
        throw new Error('身份验证失败，请检查 API 密钥配置')
      }
    }

    // Re-throw known errors
    if (error instanceof Error) {
      throw error
    }

    // Generic error
    console.error('[AI Analyzer] Unknown error:', error)
    throw new Error('分析服务暂时不可用，请稍后重试')
  }
}

/**
 * Validate and correct analysis result structure and indices
 * @param result - Analysis result to validate
 * @param content - Original diary content for index validation
 * @returns Validated analysis result
 */
export function validateAndCorrectAnalysisResult(result: AiAnalysisResult, content: string): AiAnalysisResult {
  console.log('[AI Analyzer] ==================== INDEX VALIDATION START ====================')
  console.log('[AI Analyzer] Original content length:', content.length)
  console.log('[AI Analyzer] Original content (first 500 chars):', content.slice(0, 500))

  // Validate and correct grammar errors
  result.grammarErrors = result.grammarErrors.map((error, index) => {
    const validated = validateAndCorrectIndex(
      error.startIndex, 
      error.endIndex, 
      error.originalText, 
      content,
      `grammarErrors[${index}]`
    )
    
    // Update originalText to match the actual substring
    const actualText = content.substring(validated.startIndex, validated.endIndex)
    
    console.log(`[AI Analyzer] Grammar Error ${index}:`)
    console.log(`  - Original: "${error.originalText}" (${error.startIndex}-${error.endIndex})`)
    console.log(`  - Corrected: "${actualText}" (${validated.startIndex}-${validated.endIndex})`)
    console.log(`  - Match: ${error.originalText === actualText ? '✓' : '✗'}`)
    
    return {
      ...error,
      ...validated,
      originalText: actualText
    }
  })

  // Validate and correct vocabulary suggestions
  result.vocabularySuggestions = result.vocabularySuggestions.map((suggestion, index) => {
    const validated = validateAndCorrectIndex(
      suggestion.startIndex, 
      suggestion.endIndex, 
      suggestion.originalWord, 
      content,
      `vocabularySuggestions[${index}]`
    )
    
    // Update originalWord to match the actual substring
    const actualWord = content.substring(validated.startIndex, validated.endIndex)
    
    console.log(`[AI Analyzer] Vocabulary Suggestion ${index}:`)
    console.log(`  - Original: "${suggestion.originalWord}" (${suggestion.startIndex}-${suggestion.endIndex})`)
    console.log(`  - Corrected: "${actualWord}" (${validated.startIndex}-${validated.endIndex})`)
    console.log(`  - Match: ${suggestion.originalWord === actualWord ? '✓' : '✗'}`)
    
    return {
      ...suggestion,
      ...validated,
      originalWord: actualWord
    }
  })

  // Validate and correct collocation suggestions
  result.collocationSuggestions = result.collocationSuggestions.map((suggestion, index) => {
    const validated = validateAndCorrectIndex(
      suggestion.startIndex, 
      suggestion.endIndex, 
      suggestion.originalText, 
      content,
      `collocationSuggestions[${index}]`
    )
    
    // Update originalText to match the actual substring
    const actualText = content.substring(validated.startIndex, validated.endIndex)
    
    console.log(`[AI Analyzer] Collocation Suggestion ${index}:`)
    console.log(`  - Original: "${suggestion.originalText}" (${suggestion.startIndex}-${suggestion.endIndex})`)
    console.log(`  - Corrected: "${actualText}" (${validated.startIndex}-${validated.endIndex})`)
    console.log(`  - Match: ${suggestion.originalText === actualText ? '✓' : '✗'}`)
    
    return {
      ...suggestion,
      ...validated,
      originalText: actualText
    }
  })

  console.log('[AI Analyzer] ==================== INDEX VALIDATION END ====================')
  return result
}

/**
 * Validate and correct index range
 * @param startIndex - Original start index
 * @param endIndex - Original end index
 * @param originalText - Expected text
 * @param content - Full content
 * @param label - Debug label
 * @returns Corrected indices
 */
function validateAndCorrectIndex(
  startIndex: number, 
  endIndex: number, 
  originalText: string, 
  content: string,
  label: string
): { startIndex: number; endIndex: number } {
  const contentLength = content.length
  
  // Ensure startIndex is within bounds
  let correctedStart = Math.max(0, Math.min(startIndex, contentLength - 1))
  
  // Ensure endIndex is within bounds and greater than startIndex
  let correctedEnd = Math.max(correctedStart + 1, Math.min(endIndex, contentLength))
  
  // If originalText doesn't match, try to find it in the content
  const actualText = content.substring(correctedStart, correctedEnd)
  if (actualText !== originalText && originalText) {
    console.log(`[AI Analyzer] Index mismatch detected in ${label}`)
    console.log(`  - Expected: "${originalText}"`)
    console.log(`  - Actual: "${actualText}"`)
    
    // Try to find the actual position of originalText in content
    const actualPosition = content.indexOf(originalText)
    if (actualPosition !== -1) {
      console.log(`  - Found "${originalText}" at position ${actualPosition}`)
      correctedStart = actualPosition
      correctedEnd = actualPosition + originalText.length
    } else {
      // Fallback: use the actual text at the given position
      console.log(`  - Could not find "${originalText}" in content, using actual text`)
    }
  }
  
  return { startIndex: correctedStart, endIndex: correctedEnd }
}

/**
 * Validate analysis result structure
 * @param result - Analysis result to validate
 * @returns True if valid, throws error if invalid
 */
export function validateAnalysisResult(result: AiAnalysisResult): boolean {
  // Check required fields
  if (typeof result.overallScore !== 'number' || result.overallScore < 0 || result.overallScore > 100) {
    throw new Error('评分格式不正确')
  }

  if (!Array.isArray(result.strengths) || !Array.isArray(result.improvements)) {
    throw new Error('优点或改进建议格式不正确')
  }

  if (!Array.isArray(result.grammarErrors)) {
    throw new Error('语法错误列表格式不正确')
  }

  if (!Array.isArray(result.vocabularySuggestions)) {
    throw new Error('词汇建议列表格式不正确')
  }

  if (!Array.isArray(result.collocationSuggestions)) {
    throw new Error('搭配建议列表格式不正确')
  }

  return true
}