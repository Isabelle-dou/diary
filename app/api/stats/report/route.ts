import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // week 或 month
    const startDate = searchParams.get('startDate')

    // 计算时间范围
    let start: Date
    let end: Date = new Date()
    end.setHours(23, 59, 59, 999)

    if (startDate) {
      start = new Date(startDate)
    } else {
      start = new Date()
      if (period === 'week') {
        start.setDate(start.getDate() - 7)
      } else {
        start.setMonth(start.getMonth() - 1)
      }
    }
    start.setHours(0, 0, 0, 0)

    // 获取该时间段内的日记和分析数据
    const diaries = await prisma.diary.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        aiAnalysis: true
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 计算统计指标
    const totalWordCount = diaries.reduce((sum, d) => sum + d.wordCount, 0)
    const totalDiaries = diaries.length
    const analyzedDiaries = diaries.filter(d => d.aiAnalyzed && d.aiAnalysis)
    
    // 平均评分
    const avgScore = analyzedDiaries.length > 0
      ? Math.round(analyzedDiaries.reduce((sum, d) => sum + (d.aiAnalysis?.overallScore || 0), 0) / analyzedDiaries.length)
      : 0

    // 按日期分组的评分趋势数据
    const dailyScores: Record<string, { date: string; score: number; count: number }> = {}
    diaries.forEach(diary => {
      const dateKey = diary.date.toISOString().split('T')[0]
      if (!dailyScores[dateKey]) {
        dailyScores[dateKey] = { date: dateKey, score: 0, count: 0 }
      }
      if (diary.aiAnalyzed && diary.aiAnalysis) {
        dailyScores[dateKey].score += diary.aiAnalysis.overallScore
        dailyScores[dateKey].count++
      }
    })

    const scoreTrend = Object.values(dailyScores).map(item => ({
      date: item.date,
      score: item.count > 0 ? Math.round(item.score / item.count) : null
    }))

    // 错误类型分布（从 grammarErrors 中解析）
    const errorTypeDistribution: Record<string, number> = {}
    analyzedDiaries.forEach(diary => {
      if (diary.aiAnalysis?.grammarErrors) {
        try {
          const errors = JSON.parse(diary.aiAnalysis.grammarErrors)
          if (Array.isArray(errors)) {
            errors.forEach((error: any) => {
              const type = error.type || '其他'
              errorTypeDistribution[type] = (errorTypeDistribution[type] || 0) + 1
            })
          }
        } catch {
          // JSON 解析失败，跳过
        }
      }
    })

    // 词汇丰富度变化（从 vocabularySuggestions 中统计）
    const vocabularyGrowth: Record<string, number> = {}
    analyzedDiaries.forEach(diary => {
      if (diary.aiAnalysis?.vocabularySuggestions) {
        try {
          const suggestions = JSON.parse(diary.aiAnalysis.vocabularySuggestions)
          if (Array.isArray(suggestions)) {
            const dateKey = diary.date.toISOString().split('T')[0]
            vocabularyGrowth[dateKey] = (vocabularyGrowth[dateKey] || 0) + suggestions.length
          }
        } catch {
          // JSON 解析失败，跳过
        }
      }
    })

    // 搭配建议数量
    let totalCollocations = 0
    analyzedDiaries.forEach(diary => {
      if (diary.aiAnalysis?.collocationSuggestions) {
        try {
          const collocations = JSON.parse(diary.aiAnalysis.collocationSuggestions)
          if (Array.isArray(collocations)) {
            totalCollocations += collocations.length
          }
        } catch {
          // JSON 解析失败，跳过
        }
      }
    })

    // 计算平均字数
    const avgWordCount = totalDiaries > 0 ? Math.round(totalWordCount / totalDiaries) : 0

    return NextResponse.json({
      success: true,
      data: {
        // 基础统计
        totalWordCount,
        totalDiaries,
        avgScore,
        avgWordCount,
        totalCollocations,
        
        // 时间范围
        period,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        
        // 趋势数据
        scoreTrend,
        
        // 分布数据
        errorTypeDistribution,
        
        // 词汇增长
        vocabularyGrowth
      }
    }, { status: 200 })
  } catch (error: unknown) {
    console.error('获取报告数据错误:', error)
    const errorMessage = error instanceof Error ? error.message : '获取报告数据失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
