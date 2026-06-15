'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import UserSettingsModal from './UserSettingsModal'

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

interface UserInfo {
  displayName?: string
  avatar?: string
}

export default function UserAvatar({ size = 'md', showName = true }: UserAvatarProps) {
  const { data: session } = useSession()
  const [showSettings, setShowSettings] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (session) {
      // 如果有session，使用session中的数据
      setUserInfo({
        displayName: session.user?.displayName,
        avatar: session.user?.avatar,
      })
      return
    }

    // session为null时，从API获取用户信息
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.user) {
          setUserInfo({
            displayName: result.user.displayName,
            avatar: result.user.avatar,
          })
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  // 当session变化或需要刷新时获取用户信息
  useEffect(() => {
    fetchUserInfo()
  }, [session, refreshKey])

  // 设置弹窗关闭后刷新用户信息
  const handleSettingsClose = () => {
    setShowSettings(false)
    // 触发重新获取用户信息
    setRefreshKey(prev => prev + 1)
  }

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  // 优先使用userInfo，如果没有则使用session，如果都没有则使用默认值
  const displayName = userInfo?.displayName || session?.user?.displayName || '用户'
  const avatar = userInfo?.avatar || session?.user?.avatar

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors min-h-[44px]"
      >
        <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center overflow-hidden`}>
          {avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        {showName && (
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">
            {displayName}
          </span>
        )}
      </button>

      <UserSettingsModal
        isOpen={showSettings}
        onClose={handleSettingsClose}
        onLogout={() => signOut()}
      />
    </>
  )
}
