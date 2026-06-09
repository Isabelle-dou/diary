import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

export interface AiAnalysisResult {
  grammarErrors: GrammarError[]
  vocabularySuggestions: VocabularySuggestion[]
  collocationSuggestions: CollocationSuggestion[]
  overallScore: number
  strengths: string[]
  improvements: string[]
}

export async function analyzeDiary(
  content: string,
  userLevel: string
): Promise<AiAnalysisResult> {
  const prompt = `
你是一位专业的英语老师，擅长帮助学生提高英语写作能力。请分析以下英文日记内容，提供语法检查、词汇替换建议和搭配优化建议。

用户英语水平：${userLevel === 'beginner' ? '初级' : userLevel === 'intermediate' ? '中级' : '高级'}（初级/中级/高级）

请按照以下格式输出 JSON：
{
  "grammarErrors": [...],
  "vocabularySuggestions": [...],
  "collocationSuggestions": [...],
  "overallScore": 数字(0-100),
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进点1", "改进点2"]
}

输出格式要求：
1. grammarErrors 中的每个错误需要包含：id, type, typeName, originalText, startIndex, endIndex, suggestion, explanation
2. vocabularySuggestions 中的每个建议需要包含：id, originalWord, startIndex, endIndex, suggestions（包含 word, level, levelName, definition, example）
3. collocationSuggestions 中的每个建议需要包含：id, originalText, startIndex, endIndex, suggestion, explanation, example
4. startIndex 和 endIndex 是在原始文本中的字符索引位置
5. vocabularySuggestions 的 level 只能是：beginner（初级）、intermediate（中级）、advanced（高级）
6. vocabularySuggestions 的 levelName 只能是：初级、中级、高级
7. grammarErrors 的 typeName 只能是：时态错误、主谓不一致、冠词错误、介词错误、拼写错误、名词单复数、动词形式错误、其他
8. 词汇建议应根据用户水平提供合适难度的替换词
9. 输出必须是有效的 JSON 格式，不要包含其他内容

日记内容：
${content}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  })

  const result = completion.choices[0]?.message?.content

  if (!result) {
    throw new Error('Failed to get AI analysis result')
  }

  try {
    return JSON.parse(result)
  } catch {
    throw new Error('Invalid JSON response from AI')
  }
}
