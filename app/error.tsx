'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">😢</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          页面出错了
        </h1>
        <p className="text-gray-600 mb-6">
          {error.message || '发生了未知错误'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}