'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '邮箱不能为空'
    }

    if (!formData.password) {
      newErrors.password = '密码不能为空'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('[Login] Form submitted')

    if (!validateForm()) {
      console.log('[Login] Form validation failed')
      return
    }

    console.log('[Login] Form validation passed')
    setIsLoading(true)

    try {
      console.log('[Login] Calling signIn with credentials')
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      console.log('[Login] signIn result:', result)

      if (result?.error) {
        console.error('[Login] signIn error:', result.error)
        showToast('邮箱或密码错误', 'error')
        setIsLoading(false)
        return
      }

      if (!result || !result.ok) {
        console.error('[Login] signIn returned invalid result:', result)
        showToast('登录失败，请重试', 'error')
        setIsLoading(false)
        return
      }

      console.log('[Login] signIn successful, checking level...')
      const response = await fetch('/api/user/check-level', {
        credentials: 'include',
      })

      console.log('[Login] check-level response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 调用失败' }))
        console.error('[Login] check-level API error:', errorData)
        showToast(errorData.error || '获取用户信息失败', 'error')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      console.log('[Login] check-level data:', data)

      if (data.hasSetLevel) {
        console.log('[Login] User has set level, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('[Login] User needs onboarding, redirecting to onboarding')
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('[Login] Unexpected error:', error)
      showToast('发生未知错误，请重试', 'error')
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">D</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">欢迎回来</h1>
            <p className="text-gray-500 mt-1">继续你的英语学习之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[44px] ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none min-h-[44px] ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="输入密码"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 px-4 rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            还没有账号？{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}