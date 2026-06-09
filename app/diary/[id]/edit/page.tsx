'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import BottomNav from '@/components/BottomNav'

interface DiaryData {
  id: string
  title: string
  content: string
  date: string
}

export default function EditDiaryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * 加载日记数据
   */
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

      if (data.diary) {
        setTitle(data.diary.title)
        setContent(data.diary.content)
        setDate(data.diary.date)
      }
      setIsLoading(false)
    } catch {
      showToast('发生错误，请重试', 'error')
      setIsLoading(false)
    }
  }

  /**
   * 提交修改
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!content.trim()) {
      showToast('请输入日记内容', 'error')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/diaries/${params.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '无标题',
          content,
          date,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || '更新失败，请重试', 'error')
        setIsSubmitting(false)
        return
      }

      showToast('日记更新成功', 'success')
      // 跳转到分析结果页，重新触发 AI 分析
      router.push(`/diary/${params.id}/analysis`)
    } catch {
      showToast('发生错误，请重试', 'error')
      setIsSubmitting(false)
    }
  }, [title, content, date, params.id, router, showToast])

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  /**
   * 返回上一页
   */
  const handleBack = () => {
    router.push(`/diary/${params.id}`)
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

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回</span>
            </button>
            <h1 className="text-lg font-medium text-gray-800">编辑日记</h1>
            <div className="w-16"></div>
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
              className="w-full px-0 py-3 border-0 border-b border-gray-200 focus:border-blue-400 focus:ring-0 outline-none text-gray-700 bg-transparent transition-colors min-h-[44px]"
            />
          </div>

          {/* 标题输入框 */}
          <div>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-0 py-3 border-0 text-xl font-medium placeholder-gray-300 focus:ring-0 outline-none bg-transparent text-gray-800 min-h-[44px]"
              placeholder="今天的标题..."
            />
          </div>

          {/* 正文 textarea */}
          <div className="relative">
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-0 py-4 border-0 border-gray-100 focus:border-0 focus:ring-0 outline-none resize-none text-gray-700 leading-relaxed bg-transparent min-h-[320px]"
              placeholder="Start writing your diary in English..."
              rows={12}
            />
            {/* 实时字数统计 */}
            <div className="absolute bottom-2 right-0 text-sm text-gray-400">
              {wordCount} words
            </div>
          </div>

          {/* 操作提示 */}
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700">
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              保存后将重新进行 AI 分析，请耐心等待
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="pt-6 pb-8 flex gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-4 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium min-h-[44px]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex-1 bg-blue-600 text-white py-4 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
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
          </div>
        </form>
      </main>

      {/* 移动端底部导航 */}
      <BottomNav />
    </div>
  )
}