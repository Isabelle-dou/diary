import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Await params if it's a Promise (Next.js 14+)
  const { id } = 'then' in params ? await params : params
  console.log(`[API GET /api/diaries/${id}] Request received`)
  
  try {
    console.log(`[API GET /api/diaries/${id}] Step 1: Getting session`)
    const session = await getServerSession(authOptions)
    console.log(`[API GET /api/diaries/${id}] Session:`, session ? 'Authenticated' : 'Not authenticated')

    if (!session?.user?.id) {
      console.log(`[API GET /api/diaries/${id}] Error: Unauthorized`)
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    console.log(`[API GET /api/diaries/${id}] Step 2: Querying database for diary`)
    const diary = await prisma.diary.findUnique({
      where: { id: id },
      include: {
        aiAnalysis: true,
        user: true,
      },
    })
    console.log(`[API GET /api/diaries/${id}] Diary found:`, !!diary)
    console.log(`[API GET /api/diaries/${id}] Has aiAnalysis:`, !!diary?.aiAnalysis)

    if (!diary) {
      console.log(`[API GET /api/diaries/${id}] Error: Diary not found`)
      return NextResponse.json(
        { error: '日记不存在' },
        { status: 404 }
      )
    }

    if (diary.userId !== session.user.id) {
      console.log(`[API GET /api/diaries/${id}] Error: Forbidden - user mismatch`)
      return NextResponse.json(
        { error: '无权访问此日记' },
        { status: 403 }
      )
    }

    console.log(`[API GET /api/diaries/${id}] Step 3: Serializing aiAnalysis data`)
    // Deserialize aiAnalysis JSON string fields
    let serializedDiary = { ...diary }
    
    if (diary.aiAnalysis) {
      try {
        serializedDiary.aiAnalysis = {
          ...diary.aiAnalysis,
          grammarErrors: JSON.parse(diary.aiAnalysis.grammarErrors),
          vocabularySuggestions: JSON.parse(diary.aiAnalysis.vocabularySuggestions),
          collocationSuggestions: JSON.parse(diary.aiAnalysis.collocationSuggestions),
          strengths: JSON.parse(diary.aiAnalysis.strengths),
          improvements: JSON.parse(diary.aiAnalysis.improvements),
        }
      } catch (parseError) {
        console.error(`[API GET /api/diaries/${id}] JSON parse error:`, parseError)
        throw new Error('解析分析数据失败')
      }
    } else {
      serializedDiary.aiAnalysis = null
    }

    console.log(`[API GET /api/diaries/${id}] Step 4: Returning response`)
    console.log(`[API GET /api/diaries/${id}] Success!`)
    return NextResponse.json({ diary: serializedDiary }, { status: 200 })
  } catch (error: unknown) {
    console.error(`[API GET /api/diaries/${id}] Error:`, error)
    const errorMessage = error instanceof Error ? error.message : '获取日记失败'
    console.error(`[API GET /api/diaries/${id}] Error message: ${errorMessage}`)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = 'then' in params ? await params : params
  console.log(`[API PUT /api/diaries/${id}] Request received`)
  
  try {
    console.log(`[API PUT /api/diaries/${id}] Step 1: Getting session`)
    const session = await getServerSession(authOptions)
    console.log(`[API PUT /api/diaries/${id}] Session:`, session ? 'Authenticated' : 'Not authenticated')

    if (!session?.user?.id) {
      console.log(`[API PUT /api/diaries/${id}] Error: Unauthorized`)
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    console.log(`[API PUT /api/diaries/${id}] Step 2: Parsing request body`)
    const body = await request.json()
    const { title, content, date } = body

    if (!content || typeof content !== 'string') {
      console.log(`[API PUT /api/diaries/${id}] Error: Content is required`)
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
      )
    }

    console.log(`[API PUT /api/diaries/${id}] Step 3: Checking diary existence`)
    const diary = await prisma.diary.findUnique({
      where: { id: id },
    })

    if (!diary) {
      console.log(`[API PUT /api/diaries/${id}] Error: Diary not found`)
      return NextResponse.json(
        { error: '日记不存在' },
        { status: 404 }
      )
    }

    if (diary.userId !== session.user.id) {
      console.log(`[API PUT /api/diaries/${id}] Error: Forbidden - user mismatch`)
      return NextResponse.json(
        { error: '无权修改此日记' },
        { status: 403 }
      )
    }

    console.log(`[API PUT /api/diaries/${id}] Step 4: Calculating word count`)
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length

    console.log(`[API PUT /api/diaries/${id}] Step 5: Updating diary`)
    const updatedDiary = await prisma.diary.update({
      where: { id: id },
      data: {
        title: title || '无标题',
        content,
        date: date || diary.date,
        wordCount,
        aiAnalyzed: false,
        updatedAt: new Date(),
      },
    })

    // 删除原有的分析结果，因为内容已更改
    console.log(`[API PUT /api/diaries/${id}] Step 6: Deleting old AI analysis`)
    await prisma.aiAnalysis.deleteMany({
      where: { diaryId: id },
    })

    console.log(`[API PUT /api/diaries/${id}] Step 7: Returning response`)
    console.log(`[API PUT /api/diaries/${id}] Success!`)
    return NextResponse.json({ diary: updatedDiary }, { status: 200 })
  } catch (error: unknown) {
    console.error(`[API PUT /api/diaries/${id}] Error:`, error)
    const errorMessage = error instanceof Error ? error.message : '更新日记失败'
    console.error(`[API PUT /api/diaries/${id}] Error message: ${errorMessage}`)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    const diary = await prisma.diary.findUnique({
      where: { id: params.id },
    })

    if (!diary) {
      return NextResponse.json(
        { error: '日记不存在' },
        { status: 404 }
      )
    }

    if (diary.userId !== session.user.id) {
      return NextResponse.json(
        { error: '无权删除此日记' },
        { status: 403 }
      )
    }

    await prisma.aiAnalysis.deleteMany({
      where: { diaryId: params.id },
    })

    await prisma.diary.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '删除成功' }, { status: 200 })
  } catch (error: unknown) {
    console.error('Delete diary error:', error)
    const errorMessage = error instanceof Error ? error.message : '删除日记失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}