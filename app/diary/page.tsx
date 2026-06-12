'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'

interface DiaryWithAnalysis {
  id: string
  title: string
  content: string
  date: string
  wordCount: number
  aiAnalyzed: boolean
  aiAnalysis: {
    overallScore: number
  } | null
}

export default function DiaryListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [diaries, setDiaries] = useState<DiaryWithAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // 检查是否有 user-id cookie
    const userIdCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('user-id='))
    
    // 只要有 user-id cookie 就加载数据，不依赖 NextAuth status
    if (userIdCookie) {
      fetchDiaries()
    }
    // 如果没有 cookie，middleware 会处理重定向
  }, [])

  const fetchDiaries = async () => {
    try {
      const response = await fetch('/api/diaries', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || '获取日记列表失败', 'error')
        setIsLoading(false)
        return
      }

      setDiaries(data.diaries || [])
      setIsLoading(false)
    } catch {
      showToast('发生错误，请重试', 'error')
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/diaries/${deletingId}`, {
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
      setShowDeleteConfirm(false)
      setActiveMenu(null)
      setDeletingId(null)
      // 刷新列表
      fetchDiaries()
    } catch {
      showToast('删除发生错误', 'error')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Diaries</h1>
              <p className="text-gray-600 mt-1">Track your English learning journey</p>
            </div>
            <button
              onClick={() => router.push('/write')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
            >
              Write New Diary
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {diaries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Start Writing Your First Diary</h2>
            <p className="text-gray-500 mb-6">Improve your English by writing daily diaries with AI feedback.</p>
            <button
              onClick={() => router.push('/write')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium min-h-[44px]"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map((diary) => (
              <div
                key={diary.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => router.push(`/diary/${diary.id}`)}>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{diary.title}</h3>
                      {diary.aiAnalyzed && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          Analyzed
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{diary.content}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(diary.date)}</span>
                      <span>{diary.wordCount} words</span>
                      {diary.aiAnalysis && (
                        <span className={getScoreColor(diary.aiAnalysis.overallScore)}>
                          Score: {diary.aiAnalysis.overallScore}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 操作菜单按钮 */}
                  <div className="relative ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenu(activeMenu === diary.id ? null : diary.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>

                    {/* 下拉菜单 */}
                    {activeMenu === diary.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(null)
                            router.push(`/diary/${diary.id}/edit`)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 min-h-[44px]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(null)
                            setDeletingId(diary.id)
                            setShowDeleteConfirm(true)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 min-h-[44px]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这篇日记吗？删除后不可恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingId(null)
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors min-h-[44px]"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
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

      {/* 移动端底部导航 */}
      <BottomNav />
    </div>
  )
}
