'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts'
import BottomNav from '@/components/BottomNav'

interface ReportData {
  totalWordCount: number
  totalDiaries: number
  avgScore: number
  avgWordCount: number
  totalCollocations: number
  period: string
  startDate: string
  endDate: string
  scoreTrend: Array<{ date: string; score: number | null }>
  errorTypeDistribution: Record<string, number>
  vocabularyGrowth: Record<string, number>
}

export default function ReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 页面能加载到这里说明 middleware 已经认证通过
    // 直接加载数据，不需要检查 cookie（httpOnly cookie 对 JS 不可见）
    fetchReportData()
  }, [period, customStartDate, customEndDate])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      let url = `/api/stats/report?period=${period}`
      if (customStartDate) {
        url += `&startDate=${customStartDate}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('获取报告数据失败:', error)
    }
    setLoading(false)
  }

  const handleCustomRange = () => {
    if (customStartDate) {
      fetchReportData()
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">学习报告</h1>
              <p className="text-sm text-gray-500 mt-1">追踪你的英语写作进步</p>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium">返回首页</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 时间范围选择 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">时间范围:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setPeriod('week')
                    setCustomStartDate('')
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    period === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  本周
                </button>
                <button
                  onClick={() => {
                    setPeriod('month')
                    setCustomStartDate('')
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    period === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  本月
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-gray-400">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={handleCustomRange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                查询
              </button>
            </div>
          </div>
          
          {data && (
            <div className="mt-4 text-sm text-gray-500">
              显示: {data.startDate} 至 {data.endDate}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : data ? (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-sm opacity-90">总字数</span>
                </div>
                <div className="text-3xl font-bold">{data.totalWordCount.toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm opacity-90">总篇数</span>
                </div>
                <div className="text-3xl font-bold">{data.totalDiaries}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-sm opacity-90">平均评分</span>
                </div>
                <div className="text-3xl font-bold">{data.avgScore}</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm opacity-90">平均字数</span>
                </div>
                <div className="text-3xl font-bold">{data.avgWordCount}</div>
              </div>
            </div>

            {/* 评分趋势图 */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">评分趋势</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.scoreTrend.filter(d => d.score !== null)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: '评分', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}分`, '评分']}
                      contentStyle={{ borderRadius: '8px', border: 'none' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#3B82F6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 错误类型分布和词汇增长 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 错误类型分布 */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">错误类型分布</h3>
                {Object.keys(data.errorTypeDistribution).length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(data.errorTypeDistribution).map(([name, value], index) => ({
                            name,
                            value,
                            color: COLORS[index % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {Object.entries(data.errorTypeDistribution).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value}次`, '错误数量']}
                          contentStyle={{ borderRadius: '8px', border: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <p>暂无错误数据</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 词汇增长 */}
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">词汇建议增长</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(data.vocabularyGrowth).map(([date, count]) => ({
                      date,
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        label={{ value: '词汇数', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value) => [`${value}个`, '词汇建议']}
                        contentStyle={{ borderRadius: '8px', border: 'none' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#10B981" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 搭配建议统计 */}
            <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">搭配学习统计</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 rounded-xl p-6 text-center min-w-[150px]">
                    <div className="text-3xl font-bold text-purple-600">{data.totalCollocations}</div>
                    <div className="text-sm text-gray-600 mt-1">学习搭配数</div>
                  </div>
                </div>
                <div className="text-gray-500 text-sm">
                  搭配建议帮助你学习更地道的英语表达
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无报告数据</h3>
            <p className="text-gray-500">开始写日记，追踪你的学习进度</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
