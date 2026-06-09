'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'

/**
 * 写日记页面 - 支持自动保存草稿功能
 * - 每30秒自动保存到 localStorage
 * - 使用 debounce 避免频繁保存（输入停止3秒后保存）
 * - 页面加载时检测并恢复草稿
 * - 成功提交后清除草稿
 */
const AUTO_SAVE_INTERVAL = 30000 // 30秒自动保存
const DEBOUNCE_DELAY = 3000 // 3秒 debounce

export default function WriteDiaryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'typing' | 'saving' | 'saved'>('idle')
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  
  // Refs for debounce and auto-save
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveRef = useRef<{ title: string; content: string; date: string } | null>(null)

  /**
   * 获取当前用户的草稿 key
   */
  const getDraftKey = useCallback(() => {
    if (!session?.user?.id) return null
    return `diary_draft_${session.user.id}`
  }, [session?.user?.id])

  /**
   * 保存草稿到 localStorage
   */
  const saveDraft = useCallback(() => {
    const draftKey = getDraftKey()
    if (!draftKey) return
    
    // 只有内容有变化才保存
    const currentData = { title, content, date, updatedAt: new Date().toISOString() }
    if (
      lastSaveRef.current &&
      lastSaveRef.current.title === title &&
      lastSaveRef.current.content === content &&
      lastSaveRef.current.date === date
    ) {
      return // 内容没变化，不保存
    }
    
    setSaveStatus('saving')
    localStorage.setItem(draftKey, JSON.stringify(currentData))
    lastSaveRef.current = { title, content, date }
    
    setTimeout(() => {
      setSaveStatus('saved')
      // 3秒后恢复 idle 状态
      setTimeout(() => setSaveStatus('idle'), 3000)
    }, 500)
  }, [getDraftKey, title, content, date])

  /**
   * 清除草稿
   */
  const clearDraft = useCallback(() => {
    const draftKey = getDraftKey()
    if (draftKey) {
      localStorage.removeItem(draftKey)
      lastSaveRef.current = null
      setHasDraft(false)
    }
  }, [getDraftKey])

  /**
   * 检查是否有未提交的草稿
   */
  const checkDraft = useCallback(() => {
    const draftKey = getDraftKey()
    if (!draftKey) return null
    
    const draft = localStorage.getItem(draftKey)
    if (!draft) return null
    
    try {
      const parsed = JSON.parse(draft)
      return parsed
    } catch {
      localStorage.removeItem(draftKey)
      return null
    }
  }, [getDraftKey])

  /**
   * 页面加载时检查草稿
   */
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const draft = checkDraft()
      if (draft && (draft.title || draft.content)) {
        setHasDraft(true)
        setShowDraftPrompt(true)
      }
    }
  }, [status, session?.user?.id, checkDraft])

  /**
   * 恢复草稿
   */
  const handleRestoreDraft = useCallback(() => {
    const draft = checkDraft()
    if (draft) {
      setTitle(draft.title || '')
      setContent(draft.content || '')
      setDate(draft.date || new Date().toISOString().split('T')[0])
      showToast('草稿已恢复', 'success')
      lastSaveRef.current = { title: draft.title, content: draft.content, date: draft.date }
    }
    setShowDraftPrompt(false)
  }, [checkDraft, showToast])

  /**
   * 放弃草稿
   */
  const handleDiscardDraft = useCallback(() => {
    clearDraft()
    setShowDraftPrompt(false)
    showToast('草稿已清除', 'info')
  }, [clearDraft, showToast])

  /**
   * Debounce 保存：输入停止3秒后保存
   */
  useEffect(() => {
    if (!content.trim() && !title.trim()) return
    
    setSaveStatus('typing')
    
    // 清除之前的 debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // 设置新的 debounce timer
    debounceTimerRef.current = setTimeout(() => {
      saveDraft()
    }, DEBOUNCE_DELAY)
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [title, content, date, saveDraft])

  /**
   * 定时自动保存：每30秒保存一次
   */
  useEffect(() => {
    if (!content.trim() && !title.trim()) return
    
    autoSaveTimerRef.current = setInterval(() => {
      saveDraft()
    }, AUTO_SAVE_INTERVAL)
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [title, content, date, saveDraft])

  /**
   * 页面卸载前保存草稿
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content.trim() || title.trim()) {
        saveDraft()
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [content, title, saveDraft])

  /**
   * 认证状态检查
   */
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  /**
   * 提交日记
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!content.trim()) {
      showToast('请输入日记内容', 'error')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title || '无标题',
          content,
          date,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || '保存失败，请重试', 'error')
        setIsLoading(false)
        return
      }

      // 成功保存后清除草稿
      clearDraft()
      showToast('日记保存成功', 'success')
      router.push(`/diary/${data.diaryId}/analysis`)
    } catch {
      showToast('发生错误，请重试', 'error')
      setIsLoading(false)
    }
  }, [title, content, date, router, showToast, clearDraft])

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  /**
   * 渲染保存状态
   */
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'typing':
        return (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            正在输入...
          </span>
        )
      case 'saving':
        return (
          <span className="text-xs text-blue-500 flex items-center gap-1">
            <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存草稿中...
          </span>
        )
      case 'saved':
        return (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            草稿已保存
          </span>
        )
      default:
        return null
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* 草稿恢复提示 */}
      {showDraftPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-800">检测到未提交的草稿</h3>
            </div>
            <p className="text-gray-600 mb-6">
              您有一篇未完成的日记草稿，是否恢复？
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardDraft}
                className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                放弃草稿
              </button>
              <button
                onClick={handleRestoreDraft}
                className="flex-1 py-3 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors min-h-[44px]"
              >
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (content.trim() || title.trim()) {
                  saveDraft()
                }
                router.push('/dashboard')
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回</span>
            </button>
            <h1 className="text-lg font-medium text-gray-800">写日记</h1>
            <div className="w-24 flex items-center justify-end">
              {renderSaveStatus()}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 日期选择器 */}
          <div>
            <label htmlFor="date" className="block text-sm text-gray-500 mb-2">
              日期
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-700 transition-colors min-h-[44px]"
            />
          </div>

          {/* 标题输入框 */}
          <div>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-medium placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 min-h-[44px]"
              placeholder="今天的标题..."
            />
          </div>

          {/* 正文 textarea */}
          <div className="relative">
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-gray-700 leading-relaxed min-h-[320px]"
              placeholder="Start writing your diary in English..."
              rows={12}
            />
            {/* 实时字数统计 */}
            <div className="absolute bottom-2 right-0 text-sm text-gray-400">
              {wordCount} words
            </div>
          </div>

          {/* 草稿状态提示 */}
          {hasDraft && !showDraftPrompt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>当前内容为草稿</span>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="pt-6 pb-8 flex gap-4">
            <button
              type="button"
              onClick={() => {
                if (content.trim() || title.trim()) {
                  saveDraft()
                }
                router.push('/dashboard')
              }}
              className="flex-1 py-4 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium min-h-[44px]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !content.trim()}
              className="flex-1 bg-blue-600 text-white py-4 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </>
              ) : (
                '保存日记'
              )}
            </button>
          </div>
        </form>
      </main>

      {/* 移动端底部导航 */}
      <BottomNav />
    </div>
  )
}