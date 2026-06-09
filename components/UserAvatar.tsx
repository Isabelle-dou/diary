'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import UserSettingsModal from './UserSettingsModal'

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

export default function UserAvatar({ size = 'md', showName = true }: UserAvatarProps) {
  const { data: session } = useSession()
  const [showSettings, setShowSettings] = useState(false)

  // 添加日志追踪 session
  console.log('UserAvatar session:', session)

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }

  const displayName = session?.user?.displayName || '用户'
  const avatar = session?.user?.avatar

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
        onClose={() => setShowSettings(false)}
        onLogout={() => signOut()}
      />
    </>
  )
}
