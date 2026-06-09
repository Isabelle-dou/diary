'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'

interface DiaryData {
  id: string
  title: string
  content: string
  date: string
  wordCount: number
  aiAnalyzed: boolean
  aiAnalysis?: {
    grammarErrors: Array<{ id: string }>
    vocabularySuggestions: Array<{ id: string }>
    collocationSuggestions: Array<{ id: string }>
    overallScore: number
    strengths: string[]
    improvements: string[]
  } | null
}

export default function DiaryDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [diary, setDiary] = useState<DiaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchDiary()
    }
  }, [status, router])

  const fetchDiary = async () => {
    try {
      const response = await fetch(`/api/diaries/${params.id}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || '获取日记失败', 'error')
        setIsLoading(false)
        return
      }

      setDiary(data.diary)
      setIsLoading(false)
    } catch {
      showToast('发生错误，请重试', 'error')
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/diaries/${params.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const data = await response.json()
        showToast(data.error || '删除失败', 'error')
        setIsDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      showToast('日记已删除', 'success')
      router.push('/dashboard')
    } catch {
      showToast('删除发生错误', 'error')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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

  if (!diary) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">日记不存在</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:underline min-h-[44px] px-6 py-2"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回
            </button>
            <h1 className="text-lg font-medium text-gray-800">日记详情</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/diary/${params.id}/edit`)}
                className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 min-h-[44px]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 日记标题和日期 */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{diary.title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatDate(diary.date)}</span>
            <span>{diary.wordCount} words</span>
          </div>
        </div>

        {/* 日记正文 */}
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">{diary.content}</p>
        </div>

        {/* AI 分析摘要 */}
        {diary.aiAnalyzed && diary.aiAnalysis && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
            <h3 className="text-lg font-medium text-gray-800 mb-4">AI 分析摘要</h3>
            
            {/* 评分 */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-600">总体评分</span>
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full ${getScoreColor(diary.aiAnalysis.overallScore)} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{diary.aiAnalysis.overallScore}</span>
                </div>
              </div>
            </div>

            {/* 优点 */}
            {diary.aiAnalysis.strengths.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">优点</h4>
                <div className="flex flex-wrap gap-2">
                  {diary.aiAnalysis.strengths.map((strength, index) => (
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
                </div>
              </div>
            )}

            {/* 改进建议 */}
            {diary.aiAnalysis.improvements.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-2">改进建议</h4>
                <div className="flex flex-wrap gap-2">
                  {diary.aiAnalysis.improvements.map((improvement, index) => (
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

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-red-500">{diary.aiAnalysis.grammarErrors.length}</div>
                <div className="text-xs text-gray-500">语法错误</div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-blue-500">{diary.aiAnalysis.vocabularySuggestions.length}</div>
                <div className="text-xs text-gray-500">词汇建议</div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-lg font-bold text-purple-500">{diary.aiAnalysis.collocationSuggestions.length}</div>
                <div className="text-xs text-gray-500">搭配建议</div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/diary/${params.id}/analysis`)}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-200"
          >
            {diary.aiAnalyzed ? '查看完整分析' : 'AI 分析'}
          </button>
          <button
            onClick={() => router.push('/write')}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            写新日记
          </button>
        </div>
      </main>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这篇日记吗？此操作不可撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}