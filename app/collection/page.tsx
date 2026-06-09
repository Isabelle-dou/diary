'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'

/**
 * CollectionItem - 收藏项接口
 */
interface CollectionItem {
  id: string
  type: 'word' | 'phrase' | 'collocation'
  content: string
  suggestion: string
  definition: string | null
  example: string | null
  sourceDiaryId: string | null
  createdAt: string
}

/**
 * CollectionStats - 收藏统计接口
 */
interface CollectionStats {
  total: number
  word: number
  phrase: number
  collocation: number
}

export default function CollectionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()

  // 状态
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [stats, setStats] = useState<CollectionStats>({ total: 0, word: 0, phrase: 0, collocation: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'word' | 'phrase' | 'collocation'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 加载收藏列表
  const fetchCollections = useCallback(async () => {
    setIsLoading(true)
    try {
      const typeParam = activeTab !== 'all' ? `?type=${activeTab}` : ''
      const response = await fetch(`/api/collections${typeParam}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('获取收藏列表失败')
      }

      const data = await response.json()
      setCollections(data.collections)
      setStats(data.stats)
    } catch (error) {
      console.error('获取收藏列表失败:', error)
      showToast('获取收藏列表失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, showToast])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchCollections()
    }
  }, [status, router, fetchCollections])

  // 删除收藏
  const handleDelete = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/collections/${deletingId}`, {
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

      showToast('删除成功', 'success')
      setShowDeleteConfirm(false)
      setDeletingId(null)
      // 刷新列表
      fetchCollections()
    } catch {
      showToast('删除发生错误', 'error')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // 搜索过滤
  const filteredCollections = collections.filter(item => {
    const query = searchQuery.toLowerCase()
    return (
      item.content.toLowerCase().includes(query) ||
      item.suggestion.toLowerCase().includes(query) ||
      (item.definition && item.definition.toLowerCase().includes(query)) ||
      (item.example && item.example.toLowerCase().includes(query))
    )
  })

  // 获取类型标签样式
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'word':
        return 'bg-blue-100 text-blue-700'
      case 'collocation':
        return 'bg-purple-100 text-purple-700'
      case 'phrase':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // 获取类型名称
  const getTypeName = (type: string) => {
    switch (type) {
      case 'word':
        return '生词'
      case 'collocation':
        return '搭配'
      case 'phrase':
        return '短语'
      default:
        return '其他'
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
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
              返回
            </button>
            <h1 className="text-lg font-semibold text-gray-800">生词本</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className={`text-xs ${activeTab === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>全部</div>
          </button>
          <button
            onClick={() => setActiveTab('word')}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === 'word'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold">{stats.word}</div>
            <div className={`text-xs ${activeTab === 'word' ? 'text-blue-100' : 'text-gray-500'}`}>生词</div>
          </button>
          <button
            onClick={() => setActiveTab('collocation')}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === 'collocation'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold">{stats.collocation}</div>
            <div className={`text-xs ${activeTab === 'collocation' ? 'text-blue-100' : 'text-gray-500'}`}>搭配</div>
          </button>
          <button
            onClick={() => setActiveTab('phrase')}
            className={`p-4 rounded-xl text-center transition-all ${
              activeTab === 'phrase'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold">{stats.phrase}</div>
            <div className={`text-xs ${activeTab === 'phrase' ? 'text-blue-100' : 'text-gray-500'}`}>短语</div>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索收藏内容..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 收藏列表 */}
        {filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-gray-500 mb-4">
              {searchQuery ? '没有找到匹配的收藏' : '暂无收藏内容'}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              去写日记
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCollections.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* 头部：类型标签和删除按钮 */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeBadge(item.type)}`}>
                    {getTypeName(item.type)}
                  </span>
                  <button
                    onClick={() => {
                      setDeletingId(item.id)
                      setShowDeleteConfirm(true)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* 内容 */}
                <div className="mb-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 text-sm min-w-[50px]">原文：</span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-700 rounded font-medium">
                      {item.content}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-600 text-sm min-w-[50px]">建议：</span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 rounded font-medium">
                      {item.suggestion}
                    </span>
                  </div>
                  {item.definition && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 text-sm min-w-[50px]">释义：</span>
                      <span className="text-gray-700">{item.definition}</span>
                    </div>
                  )}
                  {item.example && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-600 text-sm min-w-[50px]">例句：</span>
                      <span className="text-gray-500 italic text-sm bg-gray-50 px-2 py-1 rounded">
                        {item.example}
                      </span>
                    </div>
                  )}
                </div>

                {/* 底部：来源和日期 */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                  {item.sourceDiaryId ? (
                    <Link
                      href={`/diary/${item.sourceDiaryId}/analysis`}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      查看来源日记
                    </Link>
                  ) : (
                    <span></span>
                  )}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除这条收藏吗？</p>
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
    </div>
  )
}
