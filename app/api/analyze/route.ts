import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeDiary, validateAnalysisResult } from '@/lib/ai-analyzer'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { diaryId, content, userLevel } = body

    if (!diaryId || !content) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const diary = await prisma.diary.findUnique({
      where: { id: diaryId },
    })

    if (!diary || diary.userId !== session.user.id) {
      return NextResponse.json(
        { error: '日记不存在' },
        { status: 404 }
      )
    }

    // Call AI analyzer with error handling
    let analysisResult
    try {
      analysisResult = await analyzeDiary(content, userLevel)
      validateAnalysisResult(analysisResult)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '分析失败'
      console.error('AI analysis error:', error)
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    const aiAnalysis = await prisma.aiAnalysis.create({
      data: {
        diaryId,
        grammarErrors: JSON.stringify(analysisResult.grammarErrors),
        vocabularySuggestions: JSON.stringify(analysisResult.vocabularySuggestions),
        collocationSuggestions: JSON.stringify(analysisResult.collocationSuggestions),
        overallScore: analysisResult.overallScore,
        strengths: JSON.stringify(analysisResult.strengths),
        improvements: JSON.stringify(analysisResult.improvements),
      },
    })

    await prisma.diary.update({
      where: { id: diaryId },
      data: { aiAnalyzed: true },
    })

    // Deserialize JSON string fields
    const serializedAnalysis = {
      ...aiAnalysis,
      grammarErrors: JSON.parse(aiAnalysis.grammarErrors),
      vocabularySuggestions: JSON.parse(aiAnalysis.vocabularySuggestions),
      collocationSuggestions: JSON.parse(aiAnalysis.collocationSuggestions),
      strengths: JSON.parse(aiAnalysis.strengths),
      improvements: JSON.parse(aiAnalysis.improvements),
    }

    return NextResponse.json(
      { analysis: serializedAnalysis },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('AI 分析错误:', error)
    const errorMessage = error instanceof Error ? error.message : '分析服务暂时不可用'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}