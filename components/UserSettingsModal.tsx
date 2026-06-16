'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

// 预设头像配置 - 可爱表情风格（30个）
const PRESET_AVATARS = [
  { id: '1', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy&backgroundColor=b6e3f4' },
  { id: '2', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smile&backgroundColor=ffd5dc' },
  { id: '3', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Laugh&backgroundColor=ffdfbf' },
  { id: '4', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love&backgroundColor=c0aede' },
  { id: '5', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Heart&backgroundColor=d1d4f9' },
  { id: '6', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Kiss&backgroundColor=f8f8ff' },
  { id: '7', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink&backgroundColor=b6e3f4' },
  { id: '8', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Blush&backgroundColor=ffd5dc' },
  { id: '9', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Shy&backgroundColor=ffdfbf' },
  { id: '10', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Surprise&backgroundColor=c0aede' },
  { id: '11', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wow&backgroundColor=d1d4f9' },
  { id: '12', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sad&backgroundColor=f8f8ff' },
  { id: '13', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cry&backgroundColor=b6e3f4' },
  { id: '14', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Angry&backgroundColor=ffd5dc' },
  { id: '15', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Mad&backgroundColor=ffdfbf' },
  { id: '16', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Tired&backgroundColor=c0aede' },
  { id: '17', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sleep&backgroundColor=d1d4f9' },
  { id: '18', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool&backgroundColor=f8f8ff' },
  { id: '19', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Smart&backgroundColor=b6e3f4' },
  { id: '20', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Silly&backgroundColor=ffd5dc' },
  { id: '21', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Playful&backgroundColor=ffdfbf' },
  { id: '22', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cheeky&backgroundColor=c0aede' },
  { id: '23', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Tongue&backgroundColor=d1d4f9' },
  { id: '24', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star&backgroundColor=f8f8ff' },
  { id: '25', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Sparkle&backgroundColor=b6e3f4' },
  { id: '26', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Dreamy&backgroundColor=ffd5dc' },
  { id: '27', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Peace&backgroundColor=ffdfbf' },
  { id: '28', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Victory&backgroundColor=c0aede' },
  { id: '29', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=ThumbsUp&backgroundColor=d1d4f9' },
  { id: '30', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Rock&backgroundColor=f8f8ff' },
];

interface AvatarHistoryItem {
  url: string;
  isCurrent: boolean;
}

export default function UserSettingsModal({ isOpen, onClose, onLogout }: UserSettingsModalProps) {
  const { data: session, update } = useSession()
  const [displayName, setDisplayName] = useState(session?.user?.displayName || '')
  const [avatar, setAvatar] = useState(session?.user?.avatar || '')
  const [englishLevel, setEnglishLevel] = useState(session?.user?.englishLevel || 'beginner')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'level'>('profile')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImage, setCropImage] = useState('')
  const [avatarHistory, setAvatarHistory] = useState<AvatarHistoryItem[]>([])
  const [activeAvatarSection, setActiveAvatarSection] = useState<'preset' | 'upload' | 'history'>('preset')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取头像历史记录
  const fetchAvatarHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/user/avatar/upload', {
        credentials: 'include',
      })
      const result = await response.json()
      if (result.success) {
        setAvatarHistory(result.history)
      }
    } catch (error) {
      console.error('获取头像历史失败:', error)
    }
  }, [])

  useEffect(() => {
    if (isOpen && activeTab === 'avatar') {
      fetchAvatarHistory()
    }
  }, [isOpen, activeTab, fetchAvatarHistory])

  const handleSave = useCallback(async () => {
    setIsLoading(true)
    setMessage('')

    try {
      console.log('=== User Settings Save Start ===')
      console.log('Sending update:', { displayName, avatar })
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          avatar: avatar || null,
          englishLevel: englishLevel,
        }),
      })

      console.log('API response status:', response.status)
      const result = await response.json()
      console.log('API response data:', result)

      if (!response.ok) {
        console.error('Save failed:', result.error || 'Unknown error')
        setMessage(result.error || '保存失败')
        setIsLoading(false)
        return
      }

      // 调用refresh API刷新session，确保JWT token被更新
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json()
        console.log('Session refreshed successfully:', refreshResult)
        
        // 如果session存在，使用NextAuth的update方法更新session
        if (session) {
          await update({
            ...session,
            user: {
              ...session.user,
              displayName: refreshResult.user.displayName,
              avatar: refreshResult.user.avatar,
              englishLevel: refreshResult.user.englishLevel,
            },
          })
        }
        // 如果session不存在，不强制刷新页面
        // 因为强制刷新会导致数据丢失（NextAuth session仍然为null）
        // 用户信息已经保存到数据库，下次页面刷新时会从数据库读取
      } else {
        console.warn('Failed to refresh session')
        // 如果刷新失败且session存在，至少更新本地状态
        if (session) {
          await update({
            ...session,
            user: {
              ...session.user,
              displayName: result.user.displayName,
              avatar: result.user.avatar,
            },
          })
        }
      }

      setMessage('保存成功！')
      setTimeout(() => {
        setMessage('')
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Save error:', error)
      setMessage('保存发生错误')
    }

    setIsLoading(false)
  }, [displayName, avatar, session, onClose])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage('不支持的文件格式，支持 JPG、PNG、WEBP 格式')
      return
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setMessage(`文件大小超过限制，最大支持 ${maxSize / 1024 / 1024}MB`)
      return
    }

    // 保存选中的文件
    setSelectedFile(file)
    
    // 读取文件进行预览
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setCropImage(base64)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleCropConfirm = useCallback(async () => {
    // 检查是否有选中的文件
    if (!selectedFile) {
      setMessage('未选择文件')
      setShowCropModal(false)
      return
    }

    setIsLoading(true)
    setUploadProgress(0)
    setShowCropModal(false)

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // 创建 FormData - 使用原始文件
      const formData = new FormData()
      formData.append('file', selectedFile, selectedFile.name)

      const uploadResponse = await fetch('/api/user/avatar/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await uploadResponse.json()

      if (!uploadResponse.ok) {
        setMessage(result.error || '上传失败')
        setIsLoading(false)
        return
      }

      // 更新头像
      setAvatar(result.avatarUrl)
      setMessage('头像上传成功！')
      
      // 刷新历史记录
      fetchAvatarHistory()
      
      // 清空选中的文件
      setSelectedFile(null)
    } catch (error) {
      console.error('上传错误:', error)
      setMessage('上传发生错误：' + (error instanceof Error ? error.message : '未知错误'))
    }

    setIsLoading(false)
    setUploadProgress(0)
  }, [selectedFile, fetchAvatarHistory])

  const handleSelectFromHistory = useCallback((url: string) => {
    setAvatar(url)
    setMessage('')
  }, [])

  const handleDeleteFromHistory = useCallback(async (url: string) => {
    try {
      const response = await fetch('/api/user/avatar/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const result = await response.json()
      
      if (response.ok) {
        setAvatarHistory(prev => prev.filter(item => item.url !== url))
        setMessage('删除成功')
      } else {
        setMessage(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除错误:', error)
      setMessage('删除发生错误')
    }
  }, [])

  const handlePresetSelect = useCallback((url: string) => {
    setAvatar(url)
    setMessage('')
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-800">个人设置</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-100 sticky top-16 bg-white z-10">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            基本信息
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'avatar'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            头像设置
          </button>
          <button
            onClick={() => setActiveTab('level')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'level'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            英语水平
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {activeTab === 'profile' ? (
            <div className="space-y-4">
              {/* 当前头像预览 */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {session?.user?.displayName || '未设置昵称'}
                  </p>
                  <p className="text-xs text-gray-500">{session?.user?.email}</p>
                </div>
              </div>

              {/* 昵称输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="输入你的昵称"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">{displayName.length}/50</p>
              </div>
            </div>
          ) : activeTab === 'level' ? (
            <div className="space-y-6">
              {/* 标题区域 */}
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-800">选择你的英语水平</h4>
                <p className="text-sm text-gray-500 mt-1">我们将根据你的水平提供个性化的学习建议</p>
              </div>

              {/* 水平选择区域 */}
              <div className="space-y-3">
                {/* 初级 */}
                <button
                  onClick={() => setEnglishLevel('beginner')}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                    englishLevel === 'beginner'
                      ? 'border-green-500 bg-green-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      englishLevel === 'beginner' ? 'bg-green-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${englishLevel === 'beginner' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className={`font-semibold ${englishLevel === 'beginner' ? 'text-green-700' : 'text-gray-800'}`}>初级</h5>
                        {englishLevel === 'beginner' && (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">词汇量 1,000 - 3,000</p>
                      <p className="text-xs text-gray-400 mt-2">适合英语初学者，学习基础词汇和简单句型</p>
                    </div>
                  </div>
                </button>

                {/* 中级 */}
                <button
                  onClick={() => setEnglishLevel('intermediate')}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                    englishLevel === 'intermediate'
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      englishLevel === 'intermediate' ? 'bg-blue-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${englishLevel === 'intermediate' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className={`font-semibold ${englishLevel === 'intermediate' ? 'text-blue-700' : 'text-gray-800'}`}>中级</h5>
                        {englishLevel === 'intermediate' && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">词汇量 3,000 - 6,000</p>
                      <p className="text-xs text-gray-400 mt-2">适合有一定基础的学习者，提升阅读理解和表达能力</p>
                    </div>
                  </div>
                </button>

                {/* 高级 */}
                <button
                  onClick={() => setEnglishLevel('advanced')}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                    englishLevel === 'advanced'
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      englishLevel === 'advanced' ? 'bg-purple-500' : 'bg-gray-100'
                    }`}>
                      <svg className={`w-5 h-5 ${englishLevel === 'advanced' ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className={`font-semibold ${englishLevel === 'advanced' ? 'text-purple-700' : 'text-gray-800'}`}>高级</h5>
                        {englishLevel === 'advanced' && (
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">词汇量 {'&gt;'} 6,000</p>
                      <p className="text-xs text-gray-400 mt-2">适合英语水平较高的学习者，专注于流利表达和深度理解</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* 当前水平提示 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>当前选择：{englishLevel === 'beginner' ? '初级' : englishLevel === 'intermediate' ? '中级' : '高级'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 头像设置子标签 */}
              <div className="flex gap-2 border-b border-gray-100 pb-2">
                <button
                  onClick={() => setActiveAvatarSection('preset')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeAvatarSection === 'preset'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  预设头像
                </button>
                <button
                  onClick={() => setActiveAvatarSection('upload')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeAvatarSection === 'upload'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  上传头像
                </button>
                <button
                  onClick={() => setActiveAvatarSection('history')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeAvatarSection === 'history'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  历史记录
                </button>
              </div>

              {/* 预设头像 */}
              {activeAvatarSection === 'preset' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">✨ 30种可爱表情风格，多种情绪表达</p>
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_AVATARS.map((avatarItem) => (
                      <button
                        key={avatarItem.id}
                        onClick={() => handlePresetSelect(avatarItem.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          avatar === avatarItem.url
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={avatarItem.url}
                          alt="预设头像"
                          className="w-full h-full object-cover"
                        />
                        {avatar === avatarItem.url && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 上传头像 */}
              {activeAvatarSection === 'upload' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    上传自定义头像
                  </label>
                  
                  {/* 上传进度 */}
                  {uploadProgress > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>上传中...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="text-sm">点击上传图片</div>
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    支持 JPG、PNG、WEBP 格式，最大 5MB
                  </p>
                </div>
              )}

              {/* 头像历史 */}
              {activeAvatarSection === 'history' && (
                <div>
                  {avatarHistory.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3">
                      {avatarHistory.map((item, index) => (
                        <div key={`${item.url}-${index}`} className="relative">
                          <button
                            onClick={() => handleSelectFromHistory(item.url)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              avatar === item.url
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <img
                              src={item.url}
                              alt="历史头像"
                              className="w-full h-full object-cover"
                            />
                            {avatar === item.url && (
                              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {item.isCurrent && (
                              <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                当前
                              </div>
                            )}
                          </button>
                          {!item.isCurrent && (
                            <button
                              onClick={() => handleDeleteFromHistory(item.url)}
                              className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>暂无上传记录</p>
                    </div>
                  )}
                </div>
              )}

              {/* 当前头像预览 */}
              {avatar && (
                <div className="flex flex-col items-center mt-4">
                  <p className="text-xs text-gray-500 mb-2">当前头像预览</p>
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100">
                    <img src={avatar} alt="当前头像" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm text-center ${
                message.includes('成功')
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {message}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            退出登录
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 裁剪弹窗 */}
      {showCropModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCropModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">裁剪头像</h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {cropImage && (
                  <img
                    src={cropImage}
                    alt="裁剪预览"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                图片将按原始比例显示
              </p>
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <button
                onClick={() => setShowCropModal(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                确认上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
