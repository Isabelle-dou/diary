'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 px-4 py-2">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
            isActive('/dashboard') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">日记</span>
        </button>
        <button
          onClick={() => router.push('/collection')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
            isActive('/collection') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-xs font-medium">生词本</span>
        </button>
        <button
          onClick={() => router.push('/write')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
            isActive('/write') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs font-medium">写日记</span>
        </button>
      </div>
    </nav>
  )
}