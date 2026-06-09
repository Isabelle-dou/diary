'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DayData {
  wordCount: number
  diaries: Array<{ id: string; title: string; wordCount: number }>
}

interface CalendarProps {
  initialYear?: number
  initialMonth?: number
  onDayClick?: (date: Date, data: DayData | null) => void
}

interface CalendarDay {
  day: number
  date: Date
  data: DayData | null
  isCurrentMonth: boolean
  isToday: boolean
}

export default function Calendar({ initialYear, initialMonth, onDayClick }: CalendarProps) {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(initialYear || today.getFullYear())
  const [month, setMonth] = useState(initialMonth || today.getMonth() + 1)
  const [calendarData, setCalendarData] = useState<Record<string, DayData>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [showModal, setShowModal] = useState(false)

  // 获取日历数据
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/stats/calendar?year=${year}&month=${month}`, {
          credentials: 'include',
        })
        if (response.ok) {
          const result = await response.json()
          setCalendarData(result.data || {})
        }
      } catch (error) {
        console.error('获取日历数据失败:', error)
      }
      setLoading(false)
    }

    fetchCalendarData()
  }, [year, month])

  // 计算某月的日历数据
  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = []
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const startDay = firstDay.getDay()
    const totalDays = lastDay.getDate()

    // 上个月的日期
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const date = new Date(year, month - 2, day)
      days.push({
        day,
        date,
        data: null,
        isCurrentMonth: false,
        isToday: false
      })
    }

    // 当前月的日期
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month - 1, i)
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const isToday = date.toDateString() === today.toDateString()
      
      days.push({
        day: i,
        date,
        data: calendarData[dateKey] || null,
        isCurrentMonth: true,
        isToday
      })
    }

    // 下个月的日期
    const remainingDays = 42 - days.length // 6行 * 7列 = 42
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month, i)
      days.push({
        day: i,
        date,
        data: null,
        isCurrentMonth: false,
        isToday: false
      })
    }

    return days
  }

  // 获取颜色深浅（根据字数）
  const getColorClass = (wordCount: number): string => {
    if (wordCount === 0) return 'bg-gray-100'
    if (wordCount < 50) return 'bg-green-100'
    if (wordCount < 100) return 'bg-green-200'
    if (wordCount < 200) return 'bg-green-300'
    if (wordCount < 300) return 'bg-green-400'
    return 'bg-green-500'
  }

  // 处理日期点击
  const handleDayClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return
    
    setSelectedDay(day)
    setShowModal(true)
    
    if (onDayClick) {
      onDayClick(day.date, day.data)
    }
  }

  // 上一个月
  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  // 下一个月
  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  // 跳转到今天
  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  const days = generateCalendarDays()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="上一个月"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {monthNames[month - 1]} {year}
          </h3>
          <button
            onClick={goToToday}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            今天
          </button>
        </div>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="下一个月"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 日历网格 */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  disabled={!day.isCurrentMonth}
                  className={`
                    relative p-2 rounded-lg text-center text-sm transition-all
                    ${day.isCurrentMonth ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-default opacity-30'}
                    ${day.isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}
                    ${day.data ? getColorClass(day.data.wordCount) : 'bg-gray-50'}
                    ${day.data ? 'text-gray-800 font-medium' : 'text-gray-400'}
                  `}
                >
                  <span>{day.day}</span>
                  {day.data && day.data.wordCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="mt-6 flex items-center justify-end gap-2 text-sm text-gray-500">
        <span>少</span>
        <div className="flex gap-1">
          {['bg-gray-100', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500'].map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded ${color}`}></div>
          ))}
        </div>
        <span>多</span>
      </div>

      {/* 日记列表弹窗 */}
      {showModal && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800">
                {selectedDay.date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedDay.data && selectedDay.data.diaries.length > 0 ? (
              <div className="space-y-3">
                {selectedDay.data.diaries.map((diary) => (
                  <div
                    key={diary.id}
                    className="cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      router.push(`/diary/${diary.id}/analysis`)
                      setShowModal(false)
                    }}
                  >
                    <h5 className="font-medium text-blue-600 hover:underline mb-1">
                      {diary.title}
                    </h5>
                    <p className="text-sm text-gray-500">{diary.wordCount} words</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>当天没有日记</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}