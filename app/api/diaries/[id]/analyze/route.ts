import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeDiary, validateAnalysisResult } from '@/lib/ai-analyzer'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Await params if it's a Promise (Next.js 14+)
  const { id } = 'then' in params ? await params : params
  console.log(`[API POST /api/diaries/${id}/analyze] Request received`)
  
  try {
    // Verify user authentication
    console.log(`[API POST /api/diaries/${id}/analyze] Step 1: Getting session or cookie`)
    const session = await getServerSession(authOptions)
    
    // 首先尝试从 NextAuth session 获取用户 ID
    // 如果没有 NextAuth session，尝试从自定义的 user-id cookie 获取
    let userId = session?.user?.id
    if (!userId) {
      const userIdCookie = request.cookies.get('user-id')
      if (userIdCookie?.value) {
        userId = userIdCookie.value
        console.log(`[API POST /api/diaries/${id}/analyze] Using user-id cookie: ${userId}`)
      }
    }

    console.log(`[API POST /api/diaries/${id}/analyze] Session/Cookie:`, userId ? 'Authenticated' : 'Not authenticated')

    if (!userId) {
      console.log(`[API POST /api/diaries/${id}/analyze] Error: Unauthorized`)
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    // Get diary and verify ownership
    console.log(`[API POST /api/diaries/${id}/analyze] Step 2: Querying database for diary`)
    const diary = await prisma.diary.findUnique({
      where: { id: id },
      include: { user: true },
    })

    if (!diary) {
      console.log(`[API POST /api/diaries/${id}/analyze] Error: Diary not found`)
      return NextResponse.json(
        { error: '日记不存在' },
        { status: 404 }
      )
    }

    if (diary.userId !== userId) {
      console.log(`[API POST /api/diaries/${id}/analyze] Error: Forbidden - user mismatch`)
      return NextResponse.json(
        { error: '无权访问此日记' },
        { status: 403 }
      )
    }

    // Check if already analyzed
    if (diary.aiAnalyzed) {
      console.log(`[API POST /api/diaries/${id}/analyze] Diary already analyzed`)
      const existingAnalysis = await prisma.aiAnalysis.findUnique({
        where: { diaryId: id },
      })

      if (existingAnalysis) {
        const serializedAnalysis = {
          ...existingAnalysis,
          grammarErrors: JSON.parse(existingAnalysis.grammarErrors),
          vocabularySuggestions: JSON.parse(existingAnalysis.vocabularySuggestions),
          collocationSuggestions: JSON.parse(existingAnalysis.collocationSuggestions),
          strengths: JSON.parse(existingAnalysis.strengths),
          improvements: JSON.parse(existingAnalysis.improvements),
        }
        return NextResponse.json(
          {
            message: '日记已分析过',
            analysis: serializedAnalysis,
          },
          { status: 200 }
        )
      }
    }

    // Get user's English level
    const userLevel = diary.user.englishLevel || 'beginner'
    console.log(`[API POST /api/diaries/${id}/analyze] User level: ${userLevel}`)

    // Call AI analyzer
    let analysisResult
    try {
      console.log(`[API POST /api/diaries/${id}/analyze] Step 3: Calling AI analyzer...`)
      console.log(`[API POST /api/diaries/${id}/analyze] Content length: ${diary.content.length} characters`)
      analysisResult = await analyzeDiary(diary.content, userLevel)
      validateAnalysisResult(analysisResult)
      console.log(`[API POST /api/diaries/${id}/analyze] AI analysis completed successfully`)
      console.log(`[API POST /api/diaries/${id}/analyze] Grammar errors: ${analysisResult.grammarErrors.length}`)
      console.log(`[API POST /api/diaries/${id}/analyze] Vocabulary suggestions: ${analysisResult.vocabularySuggestions.length}`)
      console.log(`[API POST /api/diaries/${id}/analyze] Collocation suggestions: ${analysisResult.collocationSuggestions.length}`)
      console.log(`[API POST /api/diaries/${id}/analyze] Overall score: ${analysisResult.overallScore}`)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '分析失败'
      console.error(`[API POST /api/diaries/${id}/analyze] AI analysis error:`, error)
      
      // Determine appropriate status code
      let statusCode = 500
      if (errorMessage.includes('超时')) {
        statusCode = 504 // Gateway Timeout
      } else if (errorMessage.includes('API 密钥') || errorMessage.includes('未配置')) {
        statusCode = 503 // Service Unavailable
      } else if (errorMessage.includes('余额不足')) {
        statusCode = 402 // Payment Required
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
    }

    // Save analysis result to database using upsert to avoid unique constraint errors
    console.log(`[API POST /api/diaries/${id}/analyze] Step 4: Saving analysis to database (using upsert)...`)
    const aiAnalysis = await prisma.aiAnalysis.upsert({
      where: { diaryId: id },
      update: {
        grammarErrors: JSON.stringify(analysisResult.grammarErrors),
        vocabularySuggestions: JSON.stringify(analysisResult.vocabularySuggestions),
        collocationSuggestions: JSON.stringify(analysisResult.collocationSuggestions),
        overallScore: analysisResult.overallScore,
        strengths: JSON.stringify(analysisResult.strengths),
        improvements: JSON.stringify(analysisResult.improvements),
        updatedAt: new Date(),
      },
      create: {
        diaryId: id,
        grammarErrors: JSON.stringify(analysisResult.grammarErrors),
        vocabularySuggestions: JSON.stringify(analysisResult.vocabularySuggestions),
        collocationSuggestions: JSON.stringify(analysisResult.collocationSuggestions),
        overallScore: analysisResult.overallScore,
        strengths: JSON.stringify(analysisResult.strengths),
        improvements: JSON.stringify(analysisResult.improvements),
      },
    })

    // Update diary status
    await prisma.diary.update({
      where: { id: id },
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

    console.log(`[API POST /api/diaries/${id}/analyze] Step 5: Analysis completed successfully!`)
    return NextResponse.json(
      {
        message: '分析完成',
        analysis: serializedAnalysis,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error(`[API POST /api/diaries/${id}/analyze] Error:`, error)
    const errorMessage = error instanceof Error ? error.message : '分析服务暂时不可用'
    console.error(`[API POST /api/diaries/${id}/analyze] Error message: ${errorMessage}`)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}