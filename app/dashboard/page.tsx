'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'
import Calendar from '@/components/Calendar'
import UserAvatar from '@/components/UserAvatar'

interface DiaryItem {
  id: string
  title: string
  content: string
  date: string
  wordCount: number
  aiAnalyzed: boolean
  overallScore: number | null
}

interface PaginationInfo {
  total: number
  page: number
  totalPages: number
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  lastWritingDate: string | null
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [diaries, setDiaries] = useState<DiaryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, totalPages: 1 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastWritingDate: null })
  const [streakLoading, setStreakLoading] = useState(true)

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
      setDeletingId(null)
      fetchDiaries(1)
    } catch {
      showToast('删除发生错误', 'error')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const fetchDiaries = useCallback(async (page: number = 1) => {
    try {
      const response = await fetch(`/api/diaries?page=${page}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || '获取日记列表失败', 'error')
        setIsLoading(false)
        return
      }

      if (page === 1) {
        setDiaries(data.diaries)
      } else {
        setDiaries(prev => [...prev, ...data.diaries])
      }
      setPagination({
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
      })
      setIsLoading(false)
    } catch (error) {
      showToast('获取日记列表发生错误', 'error')
      setIsLoading(false)
    }
  }, [showToast])

  const fetchStreak = useCallback(async () => {
    setStreakLoading(true)
    try {
      const response = await fetch('/api/stats/streak', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStreakData(data)
      }
    } catch (error) {
      console.error('获取 streak 数据失败:', error)
    }
    setStreakLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchDiaries()
      fetchStreak()
    }
  }, [status, router, fetchDiaries, fetchStreak])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdays[date.getDay()]
    return `${month}月${day}日 ${weekday}`
  }

  const truncateContent = (content: string, maxLength: number = 60) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const loadMore = () => {
    if (pagination.page < pagination.totalPages && !isLoading) {
      setIsLoading(true)
      fetchDiaries(pagination.page + 1)
    }
  }

  if (status === 'loading' || (isLoading && diaries.length === 0)) {
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
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-gray-800">DiaryEnglish</h1>
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/collection"
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="font-medium">生词本</span>
                </Link>
              </nav>
            </div>

            <UserAvatar />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            你好，{session?.user?.displayName || '朋友'}！今天写点什么？
          </h2>
          <button
            onClick={() => router.push('/write')}
            className="mt-4 w-full max-w-xs py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            写日记
          </button>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-sm font-medium opacity-90">当前连续</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{streakLoading ? '...' : streakData.currentStreak}</span>
                <span className="text-lg">天</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-sm font-medium opacity-90">最长记录</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{streakLoading ? '...' : streakData.longestStreak}</span>
                <span className="text-lg">天</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Calendar />
        </div>

        {diaries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              还没有日记
            </h3>
            <p className="text-gray-500 mb-6">
              写下你的第一篇英文日记吧！
            </p>
            <button
              onClick={() => router.push('/write')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
            >
              开始写作
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {diaries.map((diary) => (
                <div
                  key={diary.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
                >
                  <div className="flex items-center justify-end gap-2 mb-3">
                    <button
                      onClick={() => router.push(`/diary/${diary.id}/edit`)}
                      className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 min-h-[32px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-xs font-medium">编辑</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(diary.id)
                        setShowDeleteConfirm(true)
                      }}
                      className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 min-h-[32px]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-xs font-medium">删除</span>
                    </button>
                  </div>

                  <div
                    onClick={() => router.push(`/diary/${diary.id}/analysis`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-500">
                        {formatDate(diary.date)}
                      </span>
                      {diary.aiAnalyzed && diary.overallScore !== null ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getScoreColor(diary.overallScore)}`}>
                          {diary.overallScore}分
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                          待分析
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-gray-800 mb-2 hover:text-blue-600 transition-colors">
                      {diary.title}
                    </h3>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {truncateContent(diary.content)}
                    </p>

                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {diary.wordCount} words
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pagination.page < pagination.totalPages && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isLoading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </div>
        )}

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
      </main>

      <BottomNav />
    </div>
  )
}
