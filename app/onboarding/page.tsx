'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface LevelOption {
  value: string
  label: string
  description: string
  vocabRange: string
}

const levelOptions: LevelOption[] = [
  {
    value: 'beginner',
    label: '初级',
    description: '基础词汇，简单句型',
    vocabRange: '词汇量 1,000 - 3,000',
  },
  {
    value: 'intermediate',
    label: '中级',
    description: '常用词汇，复合句型',
    vocabRange: '词汇量 3,000 - 6,000',
  },
  {
    value: 'advanced',
    label: '高级',
    description: '高级词汇，地道表达',
    vocabRange: '词汇量 > 6,000',
  },
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 简化认证检查：信任 middleware 的认证
  // 页面能加载到这里说明用户已经通过认证
  useEffect(() => {
    // 检查 localStorage 中是否有级别信息，如果有且不是 beginner，直接跳转到 dashboard
    const storedLevel = localStorage.getItem('englishLevel')
    if (storedLevel && storedLevel !== 'beginner') {
      console.log('[Onboarding] 用户级别已设置，跳转到 dashboard')
      window.location.href = '/dashboard'
    }
  }, [router])

  const handleSubmit = async () => {
    if (!selectedLevel) {
      setError('请选择你的英语水平')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/user/level', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ englishLevel: selectedLevel }),
        credentials: 'include', // 确保发送认证 cookie
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '保存失败，请重试')
        setIsLoading(false)
        return
      }

      // 保存到 localStorage 以便下次快速跳转
      localStorage.setItem('englishLevel', selectedLevel)
      // 使用 window.location.href 确保页面完全刷新
      window.location.href = '/dashboard'
    } catch {
      setError('发生错误，请重试')
      setIsLoading(false)
    }
  }

  // 只根据 isLoading 状态显示加载中，不依赖 NextAuth status
  // 因为我们使用的是自定义 cookie 认证
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">D</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">欢迎使用 DiaryEnglish</h1>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              请选择你的英语水平，我们将为你提供个性化的学习建议
            </p>
          </div>

          <div className="mb-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {levelOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedLevel(option.value)
                    setError('')
                  }}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    selectedLevel === option.value
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLevel === option.value
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedLevel === option.value && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-semibold text-lg ${
                        selectedLevel === option.value ? 'text-blue-700' : 'text-gray-800'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      selectedLevel === option.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {option.vocabRange}
                    </span>
                  </div>
                  <p className={`text-sm ml-8 ${
                    selectedLevel === option.value ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !selectedLevel}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              '确认选择'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}