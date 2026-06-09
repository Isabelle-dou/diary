import { prisma } from './prisma'

/**
 * 获取用户的写作连续天数数据
 * 如果没有 streak 记录，自动根据已有日记计算并创建
 */
export async function getStreakData(userId: string) {
  const streak = await prisma.writingStreak.findUnique({
    where: { userId }
  })
  
  // 如果没有 streak 记录，根据已有日记自动计算
  if (!streak) {
    const diaries = await prisma.diary.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true }
    })
    
    if (diaries.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastWritingDate: null
      }
    }
    
    // 计算连续天数
    const calculatedStreak = calculateStreakFromDiaries(diaries.map(d => d.date))
    
    // 创建 streak 记录
    await prisma.writingStreak.create({
      data: {
        userId,
        currentStreak: calculatedStreak.currentStreak,
        longestStreak: calculatedStreak.longestStreak,
        lastWritingDate: calculatedStreak.lastWritingDate
      }
    })
    
    return calculatedStreak
  }
  
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastWritingDate: streak.lastWritingDate
  }
}

/**
 * 根据日记日期列表计算连续天数
 */
function calculateStreakFromDiaries(diaryDates: Date[]): { currentStreak: number; longestStreak: number; lastWritingDate: Date } {
  if (diaryDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastWritingDate: new Date() }
  }
  
  // 将日期标准化为 YYYY-MM-DD 格式，去除时间部分
  const normalizedDates = diaryDates.map(date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  })
  
  // 去重并排序（从最新到最旧）
  const uniqueDates = [...new Set(normalizedDates.map(d => d.getTime()))]
    .sort((a, b) => b - a)
    .map(t => new Date(t))
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const lastWritingDate = uniqueDates[0]
  
  // 计算当前连续天数（从今天或昨天开始往前数）
  let currentStreak = 0
  const diffFromToday = Math.floor((today.getTime() - lastWritingDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // 如果最后写作日期是今天或昨天，才开始计算连续天数
  if (diffFromToday <= 1) {
    currentStreak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = Math.floor((uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }
  
  // 计算最长连续天数
  let longestStreak = 1
  let tempStreak = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = Math.floor((uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      tempStreak++
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
      }
    } else {
      tempStreak = 1
    }
  }
  
  // 如果当前连续天数大于最长，更新最长
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }
  
  return { currentStreak, longestStreak, lastWritingDate }
}

/**
 * 更新用户的写作连续天数
 */
export async function updateStreak(userId: string, writingDate: Date = new Date()) {
  const streak = await prisma.writingStreak.findUnique({
    where: { userId }
  })
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const writingDay = new Date(writingDate)
  writingDay.setHours(0, 0, 0, 0)
  
  // 如果没有记录，创建新记录
  if (!streak) {
    await prisma.writingStreak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastWritingDate: writingDay
      }
    })
    return { currentStreak: 1, longestStreak: 1 }
  }
  
  const lastDay = new Date(streak.lastWritingDate)
  lastDay.setHours(0, 0, 0, 0)
  
  // 计算天数差
  const diffTime = writingDay.getTime() - lastDay.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  let newCurrentStreak = streak.currentStreak
  let newLongestStreak = streak.longestStreak
  
  if (diffDays === 0) {
    // 同一天，不改变
    return { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak }
  } else if (diffDays === 1) {
    // 连续，天数+1
    newCurrentStreak = streak.currentStreak + 1
    if (newCurrentStreak > streak.longestStreak) {
      newLongestStreak = newCurrentStreak
    }
  } else {
    // 断了，重置为1
    newCurrentStreak = 1
  }
  
  await prisma.writingStreak.update({
    where: { userId },
    data: {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastWritingDate: writingDay
    }
  })
  
  return { currentStreak: newCurrentStreak, longestStreak: newLongestStreak }
}

/**
 * 获取某月的写作日历数据
 */
export async function getCalendarData(userId: string, year: number, month: number) {
  // 获取该月第一天和最后一天
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // 获取该月所有日记
  const diaries = await prisma.diary.findMany({
    where: {
      userId,
      date: {
        gte: firstDay,
        lte: lastDay
      }
    },
    select: {
      date: true,
      wordCount: true,
      id: true,
      title: true
    }
  })
  
  // 构建日历数据
  const calendarData: Record<string, { wordCount: number; diaries: Array<{ id: string; title: string; wordCount: number }> }> = {}
  
  diaries.forEach(diary => {
    const dateKey = formatDateKey(diary.date)
    if (!calendarData[dateKey]) {
      calendarData[dateKey] = { wordCount: 0, diaries: [] }
    }
    calendarData[dateKey].wordCount += diary.wordCount
    calendarData[dateKey].diaries.push({
      id: diary.id,
      title: diary.title,
      wordCount: diary.wordCount
    })
  })
  
  return calendarData
}

/**
 * 格式化日期为 key（YYYY-MM-DD）
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取用户的写作统计数据
 */
export async function getWritingStats(userId: string) {
  const [totalDiaries, totalWords, streak] = await Promise.all([
    prisma.diary.count({ where: { userId } }),
    prisma.diary.aggregate({
      where: { userId },
      _sum: { wordCount: true }
    }),
    getStreakData(userId)
  ])
  
  return {
    totalDiaries,
    totalWords: totalWords._sum.wordCount || 0,
    ...streak
  }
}