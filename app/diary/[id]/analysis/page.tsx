'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'
import { 
  GrammarError, 
  VocabularySuggestion, 
  VocabularySuggestionItem,
  CollocationSuggestion, 
  UpgradeSuggestion,
  UpgradeSuggestionItem,
  AiAnalysisResult 
} from '@/lib/ai-analyzer'

interface DiaryData {
  id: string
  title: string
  content: string
  date: string
  wordCount: number
}

interface HighlightInfo {
  startIndex: number
  endIndex: number
  type: 'grammar' | 'vocabulary' | 'collocation'
  data: GrammarError | VocabularySuggestion | CollocationSuggestion
}

export default function DiaryAnalysisPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [diary, setDiary] = useState<DiaryData | null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [modifiedContent, setModifiedContent] = useState('')
  const [showModified, setShowModified] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<HighlightInfo | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [collectionItem, setCollectionItem] = useState<{
    type: 'word' | 'phrase' | 'collocation'
    content: string
    suggestion: string
    definition?: string
    example?: string
  } | null>(null)
  const [collectionDefinition, setCollectionDefinition] = useState('')
  const [isCollecting, setIsCollecting] = useState(false)
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set()) // 已收藏的项目ID集合

  // 检查是否已收藏
  const isCollected = (type: string, content: string, suggestion: string): boolean => {
    const key = `${type}-${content}-${suggestion}`
    return collectedIds.has(key)
  }

  // 添加到已收藏
  const addCollected = (type: string, content: string, suggestion: string) => {
    const key = `${type}-${content}-${suggestion}`
    setCollectedIds(prev => new Set(prev).add(key))
  }

  useEffect(() => {
    // 检查是否有 user-id cookie
    const userIdCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('user-id='))
    
    // 只要有 user-id cookie 就加载数据，不依赖 NextAuth status
    if (userIdCookie) {
      fetchDiary()
    }
    // 如果没有 cookie，middleware 会处理重定向
  }, [])

  const fetchDiary = async () => {
    try {
      console.log(`[Frontend] Fetching diary: ${params.id}`)
      const response = await fetch(`/api/diaries/${params.id}`, {
        credentials: 'include',
      })
      
      // 检查响应状态
      if (!response.ok) {
        let errorMessage = '获取日记失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // 如果响应不是 JSON，使用默认错误消息
        }
        console.error(`[Frontend] Diary fetch failed: ${errorMessage}`)
        showToast(errorMessage, 'error')
        setIsLoading(false)
        return
      }

      // 解析 JSON，处理可能的解析失败
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('[Frontend] Failed to parse diary JSON:', parseError)
        showToast('服务器返回的数据格式错误', 'error')
        setIsLoading(false)
        return
      }

      // 检查数据是否包含 diary 字段
      if (!data.diary) {
        console.error('[Frontend] Diary data is missing:', data)
        showToast('获取日记失败', 'error')
        setIsLoading(false)
        return
      }

      console.log(`[Frontend] Diary fetched successfully, has analysis: ${!!data.diary.aiAnalysis}`)
      setDiary(data.diary)

      if (data.diary.aiAnalysis) {
        setAnalysis(data.diary.aiAnalysis)
        setIsLoading(false)
      } else {
        analyzeDiary(data.diary.content)
      }
    } catch (error) {
      console.error('[Frontend] Error fetching diary:', error)
      showToast('网络请求失败，请检查网络连接', 'error')
      setIsLoading(false)
    }
  }

  const analyzeDiary = async (content: string) => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    console.log(`[Frontend] Starting AI analysis for diary: ${params.id}`)

    try {
      // 设置请求超时（65秒，比后端超时多5秒）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('[Frontend] AI analysis request timed out')
        controller.abort()
      }, 65000)

      const response = await fetch(`/api/diaries/${params.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 检查响应状态
      if (!response.ok) {
        let errorMessage = 'AI 分析失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // 如果响应不是 JSON，使用默认错误消息
        }
        console.error(`[Frontend] AI analysis failed: ${errorMessage}`)
        setAnalysisError(errorMessage)
        setIsAnalyzing(false)
        setIsLoading(false)
        return
      }

      // 解析 JSON，处理可能的解析失败
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('[Frontend] Failed to parse analysis JSON:', parseError)
        setAnalysisError('AI 分析返回的数据格式错误')
        setIsAnalyzing(false)
        setIsLoading(false)
        return
      }

      // 检查分析数据是否存在
      if (!data.analysis) {
        console.error('[Frontend] Analysis data is missing:', data)
        setAnalysisError('AI 分析结果为空')
        setIsAnalyzing(false)
        setIsLoading(false)
        return
      }

      console.log('[Frontend] AI analysis completed successfully')
      
      // Debug: Log all highlights with their indices
      console.log('[Frontend] ==================== HIGHLIGHT DEBUG INFO ====================')
      console.log('[Frontend] Original content:', diary?.content || 'N/A')
      console.log('[Frontend] Content length:', (diary?.content || '').length)
      
      const analysisData = data.analysis
      
      console.log('[Frontend] Grammar Errors:', analysisData.grammarErrors.length)
      analysisData.grammarErrors.forEach((error: GrammarError, index: number) => {
        const actualText = diary?.content?.substring(error.startIndex, error.endIndex) || 'N/A'
        console.log(`[Frontend] Grammar Error ${index}:`)
        console.log(`  - originalText: "${error.originalText}"`)
        console.log(`  - actualText: "${actualText}"`)
        console.log(`  - startIndex: ${error.startIndex}, endIndex: ${error.endIndex}`)
        console.log(`  - Match: ${error.originalText === actualText ? '✓' : '✗'}`)
      })
      
      console.log('[Frontend] Vocabulary Suggestions:', analysisData.vocabularySuggestions.length)
      analysisData.vocabularySuggestions.forEach((suggestion: VocabularySuggestion, index: number) => {
        const actualWord = diary?.content?.substring(suggestion.startIndex, suggestion.endIndex) || 'N/A'
        console.log(`[Frontend] Vocabulary Suggestion ${index}:`)
        console.log(`  - originalWord: "${suggestion.originalWord}"`)
        console.log(`  - actualWord: "${actualWord}"`)
        console.log(`  - startIndex: ${suggestion.startIndex}, endIndex: ${suggestion.endIndex}`)
        console.log(`  - Match: ${suggestion.originalWord === actualWord ? '✓' : '✗'}`)
      })
      
      console.log('[Frontend] Collocation Suggestions:', analysisData.collocationSuggestions.length)
      analysisData.collocationSuggestions.forEach((suggestion: CollocationSuggestion, index: number) => {
        const actualText = diary?.content?.substring(suggestion.startIndex, suggestion.endIndex) || 'N/A'
        console.log(`[Frontend] Collocation Suggestion ${index}:`)
        console.log(`  - originalText: "${suggestion.originalText}"`)
        console.log(`  - actualText: "${actualText}"`)
        console.log(`  - startIndex: ${suggestion.startIndex}, endIndex: ${suggestion.endIndex}`)
        console.log(`  - Match: ${suggestion.originalText === actualText ? '✓' : '✗'}`)
      })
      
      console.log('[Frontend] ==================== DEBUG INFO END ====================')
      
      setAnalysis(analysisData)
      setIsAnalyzing(false)
      setIsLoading(false)
    } catch (error) {
      console.error('[Frontend] Error during AI analysis:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        setAnalysisError('请求超时，请重试')
      } else {
        setAnalysisError('AI 分析服务暂时不可用，请稍后重试')
      }
      setIsAnalyzing(false)
      setIsLoading(false)
    }
  }

  const retryAnalysis = () => {
    if (diary) {
      analyzeDiary(diary.content)
    }
  }

  const applyCorrections = () => {
    if (!diary || !analysis) return

    let result = diary.content
    const allHighlights: HighlightInfo[] = []

    // 安全获取各字段，兼容旧数据格式
    const grammarErrors = analysis.grammarErrors || []
    const vocabularySuggestions = analysis.vocabularySuggestions || []
    const collocationSuggestions = analysis.collocationSuggestions || []
    const upgradeSuggestions = analysis.upgradeSuggestions || []

    grammarErrors.forEach((error: GrammarError) => {
      allHighlights.push({
        startIndex: error.startIndex,
        endIndex: error.endIndex,
        type: 'grammar',
        data: error
      })
    })

    vocabularySuggestions.forEach((suggestion: VocabularySuggestion) => {
      allHighlights.push({
        startIndex: suggestion.startIndex,
        endIndex: suggestion.endIndex,
        type: 'vocabulary',
        data: suggestion
      })
    })

    collocationSuggestions.forEach((suggestion: CollocationSuggestion) => {
      allHighlights.push({
        startIndex: suggestion.startIndex,
        endIndex: suggestion.endIndex,
        type: 'collocation',
        data: suggestion
      })
    })

    allHighlights.sort((a, b) => b.startIndex - a.endIndex)

    allHighlights.forEach((highlight: HighlightInfo) => {
      if (highlight.type === 'grammar') {
        const grammarError = highlight.data as GrammarError
        result = result.substring(0, highlight.startIndex) + 
                 grammarError.suggestion + 
                 result.substring(highlight.endIndex)
      } else if (highlight.type === 'vocabulary') {
        const vocabSuggestion = highlight.data as VocabularySuggestion
        if (vocabSuggestion.suggestions.length > 0) {
          result = result.substring(0, highlight.startIndex) + 
                   vocabSuggestion.suggestions[0].word + 
                   result.substring(highlight.endIndex)
        }
      } else if (highlight.type === 'collocation') {
        const collocationSuggestion = highlight.data as CollocationSuggestion
        result = result.substring(0, highlight.startIndex) + 
                 collocationSuggestion.suggestion + 
                 result.substring(highlight.endIndex)
      }
    })

    setModifiedContent(result)
    setShowModified(true)
  }

  const saveModified = async () => {
    if (!diary || !modifiedContent) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/diaries/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: modifiedContent }),
      })

      if (!response.ok) {
        const data = await response.json()
        showToast(data.error || '保存失败', 'error')
        setIsSaving(false)
        return
      }

      setDiary(prev => prev ? { ...prev, content: modifiedContent } : null)
      setShowModified(false)
      showToast('保存成功', 'success')
      setIsSaving(false)
    } catch {
      showToast('保存发生错误', 'error')
      setIsSaving(false)
    }
  }

  /**
   * 打开收藏弹窗
   */
  const openCollectionModal = (item: typeof collectionItem) => {
    if (!item) return
    setCollectionItem(item)
    setCollectionDefinition(item.definition || '')
    setShowCollectionModal(true)
  }

  /**
   * 收藏单词/短语/搭配
   */
  const handleCollection = async () => {
    if (!collectionItem) return

    setIsCollecting(true)
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: collectionItem.type,
          content: collectionItem.content,
          suggestion: collectionItem.suggestion,
          definition: collectionDefinition || collectionItem.definition || null,
          example: collectionItem.example || null,
          sourceDiaryId: params.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        showToast(data.error || '收藏失败', 'error')
        setIsCollecting(false)
        return
      }

      showToast('已添加到生词本', 'success')
      // 标记为已收藏，避免重复收藏
      addCollected(collectionItem.type, collectionItem.content, collectionItem.suggestion)
      setShowCollectionModal(false)
      setCollectionItem(null)
      setCollectionDefinition('')
    } catch {
      showToast('收藏发生错误', 'error')
    } finally {
      setIsCollecting(false)
    }
  }

  /**
   * 修正索引，确保高亮的是完整的词或句子
   * @param startIndex - 原始开始索引
   * @param endIndex - 原始结束索引
   * @param expectedText - 期望的文本
   * @param content - 完整内容
   * @returns 修正后的索引
   */
  const correctHighlightIndex = (
    startIndex: number, 
    endIndex: number, 
    expectedText: string, 
    content: string
  ): { startIndex: number; endIndex: number } => {
    const contentLength = content.length
    
    // 确保索引在有效范围内
    let correctedStart = Math.max(0, Math.min(startIndex, contentLength - 1))
    let correctedEnd = Math.max(correctedStart + 1, Math.min(endIndex, contentLength))
    
    // 获取实际截取的文本
    const actualText = content.substring(correctedStart, correctedEnd)
    
    // 如果期望文本与实际文本不匹配，尝试在内容中查找正确位置
    if (expectedText && actualText !== expectedText) {
      const foundIndex = content.indexOf(expectedText)
      if (foundIndex !== -1) {
        correctedStart = foundIndex
        correctedEnd = foundIndex + expectedText.length
      } else {
        // 如果找不到期望文本，尝试扩展到完整的词边界
        correctedStart = expandToWordBoundary(content, correctedStart, 'left')
        correctedEnd = expandToWordBoundary(content, correctedEnd, 'right')
      }
    } else {
      // 尝试扩展到完整的词边界
      correctedStart = expandToWordBoundary(content, correctedStart, 'left')
      correctedEnd = expandToWordBoundary(content, correctedEnd, 'right')
    }
    
    return { startIndex: correctedStart, endIndex: correctedEnd }
  }
  
  /**
   * 扩展索引到完整的词边界
   * @param content - 内容
   * @param index - 当前索引
   * @param direction - 扩展方向 'left' 或 'right'
   * @returns 扩展后的索引
   */
  const expandToWordBoundary = (content: string, index: number, direction: 'left' | 'right'): number => {
    const wordChars = /[a-zA-Z0-9\u4e00-\u9fa5]/
    
    if (direction === 'left') {
      // 向左扩展到词的开始
      while (index > 0 && wordChars.test(content[index - 1])) {
        index--
      }
    } else {
      // 向右扩展到词的结束
      while (index < content.length && wordChars.test(content[index])) {
        index++
      }
    }
    
    return index
  }

  const renderHighlightedContent = () => {
    if (!diary || !analysis) return null

    const content = diary.content
    const allHighlights: HighlightInfo[] = []

    // 安全获取各字段，兼容旧数据格式
    const grammarErrors = analysis.grammarErrors || []
    const vocabularySuggestions = analysis.vocabularySuggestions || []
    const collocationSuggestions = analysis.collocationSuggestions || []
    const upgradeSuggestions = analysis.upgradeSuggestions || []

    grammarErrors.forEach((error: GrammarError) => {
      const corrected = correctHighlightIndex(error.startIndex, error.endIndex, error.originalText, content)
      allHighlights.push({
        startIndex: corrected.startIndex,
        endIndex: corrected.endIndex,
        type: 'grammar',
        data: { ...error, startIndex: corrected.startIndex, endIndex: corrected.endIndex }
      })
    })

    vocabularySuggestions.forEach((suggestion: VocabularySuggestion) => {
      const corrected = correctHighlightIndex(suggestion.startIndex, suggestion.endIndex, suggestion.originalWord, content)
      allHighlights.push({
        startIndex: corrected.startIndex,
        endIndex: corrected.endIndex,
        type: 'vocabulary',
        data: { ...suggestion, startIndex: corrected.startIndex, endIndex: corrected.endIndex }
      })
    })

    collocationSuggestions.forEach((suggestion: CollocationSuggestion) => {
      const corrected = correctHighlightIndex(suggestion.startIndex, suggestion.endIndex, suggestion.originalText, content)
      allHighlights.push({
        startIndex: corrected.startIndex,
        endIndex: corrected.endIndex,
        type: 'collocation',
        data: { ...suggestion, startIndex: corrected.startIndex, endIndex: corrected.endIndex }
      })
    })

    allHighlights.sort((a, b) => a.startIndex - b.startIndex)

    const parts: JSX.Element[] = []
    let lastIndex = 0
    let keyCounter = 0

    allHighlights.forEach((highlight: HighlightInfo) => {
      if (highlight.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${keyCounter++}`}>
            {content.substring(lastIndex, highlight.startIndex)}
          </span>
        )
      }

      const highlightText = content.substring(highlight.startIndex, highlight.endIndex)
      const isActive = activeHighlight?.startIndex === highlight.startIndex && 
                       activeHighlight?.type === highlight.type

      parts.push(
        <span
          key={`highlight-${keyCounter++}`}
          className={`relative cursor-pointer transition-all duration-200 ${
            highlight.type === 'grammar' 
              ? 'bg-red-100 border-b-2 border-red-500 hover:bg-red-200' 
              : highlight.type === 'vocabulary'
              ? 'bg-blue-100 border-b-2 border-blue-500 hover:bg-blue-200'
              : 'bg-purple-100 border-b-2 border-purple-500 hover:bg-purple-200'
          } ${isActive ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
          onMouseEnter={() => setActiveHighlight(highlight)}
          onMouseLeave={() => setActiveHighlight(null)}
          onClick={() => setActiveHighlight(isActive ? null : highlight)}
        >
          {highlightText}
          {isActive && (
            <div className="absolute z-50 left-0 top-full mt-2 w-72 max-h-80 overflow-auto bg-white rounded-lg shadow-xl border border-gray-200 p-3">
              {highlight.type === 'grammar' && (
                <GrammarErrorCard error={highlight.data as GrammarError} />
              )}
              {highlight.type === 'vocabulary' && (
                <VocabularyCard suggestion={highlight.data as VocabularySuggestion} />
              )}
              {highlight.type === 'collocation' && (
                <CollocationCard suggestion={highlight.data as CollocationSuggestion} />
              )}
            </div>
          )}
        </span>
      )

      lastIndex = highlight.endIndex
    })

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {content.substring(lastIndex)}
        </span>
      )
    }

    return <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{parts}</p>
  }

  const GrammarErrorCard = ({ error }: { error: GrammarError }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
          {error.typeName}
        </span>
      </div>
      <div className="mb-2">
        <span className="text-gray-500 text-sm">原文：</span>
        <span className="text-red-600 font-medium">{error.originalText}</span>
      </div>
      <div className="mb-2">
        <span className="text-gray-500 text-sm">修正：</span>
        <span className="text-green-600 font-medium">{error.suggestion}</span>
      </div>
      <p className="text-gray-600 text-sm">{error.explanation}</p>
    </div>
  )

  const VocabularyCard = ({ suggestion }: { suggestion: VocabularySuggestion }) => (
    <div>
      <div className="mb-2">
        <span className="text-gray-500 text-sm">原文：</span>
        <span className="text-blue-600 font-medium">{suggestion.originalWord}</span>
      </div>
      <div className="space-y-2">
        {suggestion.suggestions.map((item, index) => (
          <div key={index} className="p-2 bg-gray-50 rounded">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-800">{item.word}</span>
            </div>
            <p className="text-gray-600 text-xs mb-1">{item.definition}</p>
            <p className="text-gray-500 text-xs italic">例：{item.example}</p>
            {/* 水平等级标签 */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {item.difficultyTags?.map((tag, tagIndex) => (
                <span key={tagIndex} className="text-xs text-gray-500">
                  {tagIndex > 0 && ' | '}
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const CollocationCard = ({ suggestion }: { suggestion: CollocationSuggestion }) => (
    <div>
      <div className="mb-2">
        <div className="mb-1">
          <span className="text-gray-500 text-sm">原搭配：</span>
          <span className="text-purple-600 font-medium">{suggestion.originalText}</span>
        </div>
        <div>
          <span className="text-gray-500 text-sm">建议：</span>
          <span className="text-purple-700 font-medium">{suggestion.suggestion}</span>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-2">{suggestion.explanation}</p>
      <p className="text-gray-500 text-sm italic">例：{suggestion.example}</p>
    </div>
  )

  const SkeletonLoader = () => (
    <div className="min-h-screen bg-white pb-20">
      {/* 顶部导航栏骨架 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-20 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-16 h-5 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 日记信息和评分骨架 */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="w-32 h-6 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-16 h-12 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-200 rounded mt-1 animate-pulse"></div>
            </div>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-gray-200 animate-pulse"></div>
          </div>
        </div>

        {/* 标签骨架 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <div className="w-12 h-6 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-14 h-6 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="w-18 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* 原文展示骨架 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
            <div className="space-y-3">
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-1/2 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* 应用修正按钮骨架 */}
        <div className="mb-8">
          <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>

        {/* 详细建议列表骨架 */}
        <div className="space-y-8">
          {/* 语法错误列表骨架 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="w-16 h-4 bg-gray-200 rounded-full mb-3 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="w-16 h-4 bg-gray-200 rounded-full mb-3 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 词汇建议列表骨架 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-24 h-4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                <div className="p-3 bg-white rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-12 h-5 bg-gray-200 rounded animate-pulse"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-1 animate-pulse"></div>
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 搭配建议列表骨架 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded mt-2 mb-2 animate-pulse"></div>
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏骨架 */}
        <div className="mt-12 pt-6 border-t border-gray-100">
          <div className="flex gap-4">
            <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* AI 分析提示 */}
        {isAnalyzing && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">AI 正在分析你的日记...</span>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )

  if (isLoading || isAnalyzing) {
    return <SkeletonLoader />
  }

  // 如果数据获取失败，显示错误页面
  if (!diary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            无法获取日记数据
          </h1>
          <p className="text-gray-600 mb-6">
            抱歉，我们无法找到这篇日记或您没有权限访问。
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回日记列表
            </button>
            <button
              onClick={() => router.push('/write')}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              写新日记
            </button>
          </div>
        </div>
      </div>
    )
  }

  // AI 分析失败时显示降级页面（显示日记原文和错误信息）
  if (analysisError) {
    return (
      <div className="min-h-screen bg-white pb-20">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>返回</span>
              </button>
              <h1 className="text-lg font-medium text-gray-800">分析结果</h1>
              <Link href="/write" className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] flex items-center">
                写新日记
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* 日记信息 */}
          <div className="mb-8 p-6 bg-gray-50 rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{diary.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{new Date(diary.date).toLocaleDateString('zh-CN')}</span>
                  <span>{diary.wordCount} words</span>
                </div>
              </div>
            </div>
          </div>

          {/* 错误提示卡片 */}
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800 mb-2">AI 分析暂时不可用</h3>
                <p className="text-red-600 mb-4">{analysisError}</p>
                <div className="flex gap-3">
                  <button
                    onClick={retryAnalysis}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        分析中...
                      </>
                    ) : (
                      '重新分析'
                    )}
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    返回列表
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 日记原文展示 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">日记原文</h3>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{diary.content}</p>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                返回列表
              </button>
              <button
                onClick={() => router.push('/write')}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-200 min-h-[44px]"
              >
                写新日记
              </button>
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回</span>
            </button>
            <h1 className="text-lg font-medium text-gray-800">分析结果</h1>
            <Link href="/write" className="text-blue-600 hover:text-blue-700 text-sm font-medium min-h-[44px] flex items-center">
              写新日记
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 日记信息和总体评分 */}
        {diary && analysis && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{diary.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{new Date(diary.date).toLocaleDateString('zh-CN')}</span>
                  <span>{diary.wordCount} words</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-blue-600">{analysis.overallScore}</div>
                <div className="text-sm text-gray-500">总体评分</div>
              </div>
            </div>
            
            {/* 进度条 */}
            <div className="w-full h-3 bg-white rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                style={{ width: `${analysis.overallScore}%` }}
              />
            </div>
          </div>
        )}

        {/* 优点和改进建议标签 */}
        {analysis && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 mb-6">
              <h3 className="text-sm font-medium text-gray-500">标签：</h3>
              {analysis.strengths.map((strength, index) => (
                <span
                  key={`strength-${index}`}
                  className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {strength}
                </span>
              ))}
              {analysis.improvements.map((improvement, index) => (
                <span
                  key={`improvement-${index}`}
                  className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1H6z" clipRule="evenodd" />
                  </svg>
                  {improvement}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 原文展示区域 */}
        {diary && analysis && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">原文分析</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-red-500"></span>
                  <span className="text-gray-500">语法错误</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500"></span>
                  <span className="text-gray-500">词汇建议</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-purple-500"></span>
                  <span className="text-gray-500">搭配建议</span>
                </span>
              </div>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
              {renderHighlightedContent()}
            </div>
          </div>
        )}

        {/* 应用修正按钮 */}
        {diary && analysis && !showModified && (
          <div className="mb-8">
            <button
              onClick={applyCorrections}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-200 min-h-[44px]"
            >
              应用所有修正
            </button>
          </div>
        )}

        {/* 修改后的文本 */}
        {showModified && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">修改后的文本</h3>
              <button
                onClick={() => setShowModified(false)}
                className="text-sm text-gray-500 hover:text-gray-700 min-h-[44px] flex items-center"
              >
                返回原文
              </button>
            </div>
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{modifiedContent}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={saveModified}
                disabled={isSaving}
                className="flex-1 py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    保存中...
                  </>
                ) : (
                  '保存修改'
                )}
              </button>
              <button
                onClick={applyCorrections}
                className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors min-h-[44px]"
              >
                重新应用修正
              </button>
            </div>
          </div>
        )}

        {/* 详细建议列表 */}
        <div className="space-y-8">
          {/* 语法错误列表 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                语法错误 ({analysis?.grammarErrors?.length || 0})
              </span>
            </h3>
            {analysis?.grammarErrors && analysis.grammarErrors.length > 0 ? (
              <div className="space-y-3">
                {analysis.grammarErrors.map((error: GrammarError) => {
                  const collected = isCollected('phrase', error.originalText, error.suggestion)
                  
                  const handleCollect = async () => {
                    if (collected) {
                      showToast('已在生词本中', 'info')
                      return
                    }
                    setIsCollecting(true)
                    try {
                      const response = await fetch('/api/collections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'phrase',
                          content: error.originalText,
                          suggestion: error.suggestion,
                          definition: error.explanation,
                          sourceDiaryId: params.id,
                        }),
                      })
                      if (!response.ok) {
                        const data = await response.json()
                        showToast(data.error || '收藏失败', 'error')
                        return
                      }
                      showToast('已添加到生词本', 'success')
                      addCollected('phrase', error.originalText, error.suggestion)
                    } catch {
                      showToast('收藏发生错误', 'error')
                    } finally {
                      setIsCollecting(false)
                    }
                  }
                  
                  return (
                    <div key={error.id} className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          {error.typeName}
                        </span>
                        <button
                          onClick={handleCollect}
                          disabled={collected || isCollecting}
                          className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                            collected 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          }`}
                          title={collected ? '已收藏' : '收藏到生词本'}
                        >
                          {collected ? '★ 已收藏' : '☆ 收藏'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">原文：</span>
                          <span className="text-red-600 font-medium">{error.originalText}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">修正：</span>
                          <span className="text-green-600 font-medium">{error.suggestion}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">解释：</span>
                          <span className="text-gray-600">{error.explanation}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-500">
                暂无建议
              </div>
            )}
          </div>

          {/* 词汇建议列表 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                词汇建议 ({analysis?.vocabularySuggestions?.length || 0})
              </span>
            </h3>
            {analysis?.vocabularySuggestions && analysis.vocabularySuggestions.length > 0 ? (
              <div className="space-y-3">
                {analysis.vocabularySuggestions.map((suggestion: VocabularySuggestion) => {
                  // 检查是否有任何一个替换建议已收藏
                  const hasCollected = suggestion.suggestions.some(item => 
                    isCollected('word', suggestion.originalWord, item.word)
                  )
                  
                  const handleCollect = async () => {
                    if (hasCollected) {
                      showToast('已在生词本中', 'info')
                      return
                    }
                    setIsCollecting(true)
                    try {
                      // 收藏第一个替换建议作为代表
                      const firstItem = suggestion.suggestions[0]
                      const response = await fetch('/api/collections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'word',
                          content: suggestion.originalWord,
                          suggestion: firstItem.word,
                          definition: firstItem.definition,
                          example: firstItem.example,
                          sourceDiaryId: params.id,
                        }),
                      })
                      if (!response.ok) {
                        const data = await response.json()
                        showToast(data.error || '收藏失败', 'error')
                        return
                      }
                      showToast('已添加到生词本', 'success')
                      addCollected('word', suggestion.originalWord, firstItem.word)
                    } catch {
                      showToast('收藏发生错误', 'error')
                    } finally {
                      setIsCollecting(false)
                    }
                  }
                  
                  return (
                    <div key={suggestion.id} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-gray-500">原文词汇：</span>
                          <span className="text-blue-600 font-medium">{suggestion.originalWord}</span>
                        </div>
                        <button
                          onClick={handleCollect}
                          disabled={hasCollected || isCollecting}
                          className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                            hasCollected 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          }`}
                          title={hasCollected ? '已收藏' : '收藏到生词本'}
                        >
                          {hasCollected ? '★ 已收藏' : '☆ 收藏'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {suggestion.suggestions.map((item: VocabularySuggestionItem, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-lg font-semibold text-gray-800">{item.word}</span>
                            </div>
                            {<p className="text-gray-600 text-sm mb-1">{item.definition}</p>
                            <p className="text-gray-500 text-sm italic">例：{item.example}</p>
                            {/* 水平等级标签 */}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {item.difficultyTags?.map((tag, tagIndex) => (
                                <span key={tagIndex} className="text-xs text-gray-500">
                                  {tagIndex > 0 && ' | '}
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-500">
                暂无建议
              </div>
            )}
          </div>

          {/* 搭配建议列表 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                搭配建议 ({analysis?.collocationSuggestions?.length || 0})
              </span>
            </h3>
            {analysis?.collocationSuggestions && analysis.collocationSuggestions.length > 0 ? (
              <div className="space-y-3">
                {analysis.collocationSuggestions.map((suggestion: CollocationSuggestion) => {
                  const collected = isCollected('collocation', suggestion.originalText, suggestion.suggestion)
                  
                  const handleCollect = async () => {
                    if (collected) {
                      showToast('已在生词本中', 'info')
                      return
                    }
                    setIsCollecting(true)
                    try {
                      const response = await fetch('/api/collections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'collocation',
                          content: suggestion.originalText,
                          suggestion: suggestion.suggestion,
                          definition: suggestion.explanation,
                          example: suggestion.example,
                          sourceDiaryId: params.id,
                        }),
                      })
                      if (!response.ok) {
                        const data = await response.json()
                        showToast(data.error || '收藏失败', 'error')
                        return
                      }
                      showToast('已添加到生词本', 'success')
                      addCollected('collocation', suggestion.originalText, suggestion.suggestion)
                    } catch {
                      showToast('收藏发生错误', 'error')
                    } finally {
                      setIsCollecting(false)
                    }
                  }
                  
                  return (
                    <div key={suggestion.id} className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-start justify-between mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">原搭配：</span>
                            <span className="text-purple-600 font-medium">{suggestion.originalText}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">建议：</span>
                            <span className="text-purple-700 font-medium">{suggestion.suggestion}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleCollect}
                          disabled={collected || isCollecting}
                          className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                            collected 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          }`}
                          title={collected ? '已收藏' : '收藏到生词本'}
                        >
                          {collected ? '★ 已收藏' : '☆ 收藏'}
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mt-2 mb-2">{suggestion.explanation}</p>
                      <p className="text-gray-500 text-sm italic">例：{suggestion.example}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-500">
                暂无建议
              </div>
            )}
          </div>

          {/* 升级建议列表 */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                升级建议 ({analysis?.upgradeSuggestions?.length || 0})
              </span>
            </h3>
            {analysis?.upgradeSuggestions && analysis.upgradeSuggestions.length > 0 ? (
              <div className="space-y-3">
                {analysis.upgradeSuggestions.map((suggestion: UpgradeSuggestion) => (
                  <div key={suggestion.id} className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-gray-500">原文表达：</span>
                        <span className="text-green-600 font-medium">{suggestion.originalText}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{suggestion.explanation}</p>
                    <div className="space-y-2">
                      {suggestion.suggestions.map((item: UpgradeSuggestionItem, index: number) => {
                        const collected = isCollected('word', suggestion.originalText, item.word)
                        
                        const handleCollect = async () => {
                          if (collected) {
                            showToast('已在生词本中', 'info')
                            return
                          }
                          setIsCollecting(true)
                          try {
                            const response = await fetch('/api/collections', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                type: 'word',
                                content: suggestion.originalText,
                                suggestion: item.word,
                                definition: item.definition,
                                example: item.example,
                                sourceDiaryId: params.id,
                              }),
                            })
                            if (!response.ok) {
                              const data = await response.json()
                              showToast(data.error || '收藏失败', 'error')
                              return
                            }
                            showToast('已添加到生词本', 'success')
                            addCollected('word', suggestion.originalText, item.word)
                          } catch {
                            showToast('收藏发生错误', 'error')
                          } finally {
                            setIsCollecting(false)
                          }
                        }
                        
                        return (
                          <div key={index} className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-lg font-semibold text-gray-800">{item.word}</span>
                              <button
                                onClick={handleCollect}
                                disabled={collected || isCollecting}
                                className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                                  collected 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                }`}
                                title={collected ? '已收藏' : '收藏到生词本'}
                              >
                                {collected ? '★ 已收藏' : '☆ 收藏'}
                              </button>
                            </div>
                            {<p className="text-gray-600 text-sm mb-1">{item.definition}</p>
                            <p className="text-gray-500 text-sm italic">例：{item.example}</p>
                            {/* 水平等级标签 */}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {item.difficultyTags?.map((tag, tagIndex) => (
                                <span key={tagIndex} className="text-xs text-gray-500">
                                  {tagIndex > 0 && ' | '}
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center text-gray-500">
                暂无建议
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-12 pt-6 border-t border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
            >
              返回列表
            </button>
            <button
              onClick={() => router.push('/write')}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-200 min-h-[44px]"
            >
              写新日记
            </button>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* 收藏弹窗 */}
      {showCollectionModal && collectionItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">收藏到生词本</h3>
            
            {/* 类型标签 */}
            <div className="mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                collectionItem.type === 'word' ? 'bg-blue-100 text-blue-700' :
                collectionItem.type === 'collocation' ? 'bg-purple-100 text-purple-700' :
                'bg-green-100 text-green-700'
              }`}>
                {collectionItem.type === 'word' ? '生词' :
                 collectionItem.type === 'collocation' ? '搭配' : '短语'}
              </span>
            </div>

            {/* 内容预览 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="mb-2">
                <span className="text-gray-500 text-sm">原文：</span>
                <span className="text-gray-800 font-medium">{collectionItem.content}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm">建议：</span>
                <span className="text-green-600 font-medium">{collectionItem.suggestion}</span>
              </div>
              {collectionItem.example && (
                <div className="mt-2">
                  <span className="text-gray-500 text-sm">例句：</span>
                  <span className="text-gray-600 text-sm italic">{collectionItem.example}</span>
                </div>
              )}
            </div>

            {/* 释义输入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                添加释义（可选）
              </label>
              <textarea
                value={collectionDefinition}
                onChange={(e) => setCollectionDefinition(e.target.value)}
                placeholder={collectionItem.definition || '输入你的释义...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCollectionModal(false)
                  setCollectionItem(null)
                  setCollectionDefinition('')
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                取消
              </button>
              <button
                onClick={handleCollection}
                disabled={isCollecting}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isCollecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    收藏中...
                  </>
                ) : (
                  '确认收藏'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}