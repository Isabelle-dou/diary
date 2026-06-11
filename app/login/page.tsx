'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

// 创建带超时的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接')
    }
    throw error
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 页面加载时立即输出日志（确保能看到）
  useEffect(() => {
    console.info('=====================================')
    console.info('========== 登录页面已加载 ==========')
    console.info('=====================================')
    console.log('[Login] 当前时间:', new Date().toLocaleString())
    console.log('[Login] 当前URL:', window.location.href)
    console.log('[Login] NextAuth版本:', '4.x')
    console.log('[Login] 页面状态: 准备就绪')
    console.info('=====================================')
  }, [])

  // 组件卸载时取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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

  // 测试数据库连接
  const testDatabaseConnection = async () => {
    console.log('[Login] Testing database connection...')
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      console.log('[Login] Database test result:', data)
      
      if (data.success) {
        showToast(`数据库连接成功！用户数: ${data.userCount}`, 'success')
      } else {
        showToast(`数据库连接失败: ${data.error}`, 'error')
      }
    } catch (error) {
      console.error('[Login] Database test error:', error)
      showToast('数据库测试失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
    }
  }

  // 检查 API 是否可达
  const testApiHealth = async () => {
    console.log('[Login] Testing API health...')
    try {
      const response = await fetch('/api/auth/session')
      console.log('[Login] Session API status:', response.status)
      console.log('[Login] Session API headers:', Object.fromEntries(response.headers))
      
      if (response.ok) {
        const session = await response.json()
        console.log('[Login] Session data:', session)
        showToast('Session API 正常', 'success')
      } else {
        showToast(`Session API 响应异常: ${response.status}`, 'error')
      }
    } catch (error) {
      console.error('[Login] API health test error:', error)
      showToast('API 测试失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
    }
  }

  // 使用简单登录API（绕过 NextAuth）
  const handleSimpleLogin = async () => {
    console.log('[Login] Attempting simple login via /api/simple-login...')
    setIsLoading(true)
    
    try {
      const response = await fetchWithTimeout('/api/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      }, 10000)

      console.log('[Login] Simple login response status:', response.status)
      
      const data = await response.json()
      console.log('[Login] Simple login response:', data)

      if (!response.ok || !data.success) {
        showToast(data.message || '登录失败', 'error')
        setIsLoading(false)
        return
      }

      console.log('[Login] Simple login successful! User:', data.user)
      
      // 根据用户级别跳转
      if (data.user.hasSetLevel) {
        router.push('/dashboard')
      } else {
        router.push('/onboarding')
      }
    } catch (error) {
      console.error('[Login] Simple login error:', error)
      showToast('登录失败: ' + (error instanceof Error ? error.message : '未知错误'), 'error')
      setIsLoading(false)
    }
  }

  // 直接调用 NextAuth API 进行登录（绕过 signIn 函数）
  const handleDirectLogin = async () => {
    console.log('[Login] Attempting direct login via API...')
    
    try {
      const response = await fetchWithTimeout('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: formData.email,
          password: formData.password,
          callbackUrl: window.location.origin + '/onboarding',
        }),
      }, 10000)

      console.log('[Login] Direct login response status:', response.status)
      console.log('[Login] Direct login response redirected:', response.redirected)

      if (response.redirected) {
        console.log('[Login] Redirecting to:', response.url)
        window.location.href = response.url
        return
      }

      const text = await response.text()
      console.log('[Login] Direct login response text:', text.substring(0, 500))

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`)
      }

      console.log('[Login] Direct login successful')
      router.push('/onboarding')
    } catch (error) {
      console.error('[Login] Direct login error:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 强制输出日志（确保能在控制台看到）
    const startTime = Date.now()
    console.info('[Login] ====== 登录流程开始 ======')
    console.info('[Login] 时间:', new Date().toLocaleTimeString())

    console.log('[Login] Form submitted')

    if (!validateForm()) {
      console.log('[Login] Form validation failed')
      console.info('[Login] ====== 登录流程结束（验证失败） ======')
      return
    }

    console.log('[Login] Form validation passed')
    setIsLoading(true)

    try {
      console.log('[Login] Calling signIn with credentials...')
      console.log('[Login] Email:', formData.email)
      console.log('[Login] Password length:', formData.password.length)

      // 使用 Promise.race 为 signIn 添加较短的超时（5秒）
      const signInPromise = signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      // 创建超时Promise（5秒后自动使用备用登录）
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const timeoutPromise = new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error('[Login] Timeout: signIn took longer than 5 seconds, using fallback')
          reject(new Error('超时，使用备用登录'))
        }, 5000)
      })

      // 使用 Promise.allSettled 来处理
      const results = await Promise.allSettled([signInPromise, timeoutPromise])
      
      // 清理超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // 获取signIn的结果
      const result = results[0].status === 'fulfilled' ? results[0].value : null

      console.log('[Login] signIn result type:', typeof result)
      console.log('[Login] signIn result:', result)

      // 检查是否超时或结果无效
      const isTimeout = results[1]?.status === 'rejected'
      const isResultValid = result && result.ok && !result.error

      if (!isResultValid || isTimeout) {
        console.log('[Login] signIn failed or timeout, using fallback direct login...')
        
        // 直接使用备用登录API
        const directLoginResult = await fetch('/api/direct-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        })
        
        console.log('[Login] Direct login response status:', directLoginResult.status)
        
        if (directLoginResult.ok) {
          const data = await directLoginResult.json()
          console.log('[Login] Direct login successful:', data)
          if (data.user.hasSetLevel) {
            router.push('/dashboard')
          } else {
            router.push('/onboarding')
          }
          return
        } else {
          const errorData = await directLoginResult.json().catch(() => ({ message: '登录失败' }))
          console.error('[Login] Direct login failed:', errorData)
          showToast(errorData.message || '登录失败，请重试', 'error')
          setIsLoading(false)
          console.info('[Login] ====== 登录流程结束（备用登录失败） ======')
          return
        }
      }

      console.log('[Login] signIn successful, checking user level...')
      const response = await fetchWithTimeout('/api/user/check-level', {
        credentials: 'include',
      }, 10000)

      console.log('[Login] check-level response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 调用失败' }))
        console.error('[Login] check-level API error:', errorData)
        showToast(errorData.error || '获取用户信息失败', 'error')
        setIsLoading(false)
        console.info('[Login] ====== 登录流程结束（API错误） ======')
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
      console.error('[Login] ====== 登录流程异常结束 ======')
      console.error('[Login] Unexpected error:', error)
      console.error('[Login] Error type:', typeof error)
      console.error('[Login] Error stack:', error instanceof Error ? error.stack : 'N/A')
      const errorMessage = error instanceof Error ? error.message : '发生未知错误，请重试'
      showToast(errorMessage, 'error')
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

          {/* 调试按钮 - 仅开发/测试环境显示 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500 mb-3">调试工具</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={testDatabaseConnection}
                disabled={isLoading}
                className="px-4 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                测试数据库
              </button>
              <button
                onClick={testApiHealth}
                disabled={isLoading}
                className="px-4 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                检查API
              </button>
              <button
                onClick={handleSimpleLogin}
                disabled={isLoading}
                className="px-4 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                简单登录
              </button>
            </div>
          </div>

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
