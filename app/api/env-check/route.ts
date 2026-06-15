/**
 * 环境变量检查 API
 * GET /api/env-check
 * 
 * 用于验证环境变量是否正确配置
 */
export async function GET() {
  // 检查关键环境变量
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN
  const vercel = process.env.VERCEL
  const vercelEnv = process.env.VERCEL_ENV
  const nodeEnv = process.env.NODE_ENV

  // 判断是否在Vercel生产环境
  const isVercelProduction = !!vercel && nodeEnv === 'production'
  
  // 判断是否配置了Blob
  const blobConfigured = !!blobToken

  // 检查令牌格式（Vercel Blob令牌通常较长）
  const tokenValid = blobToken && blobToken.length > 30

  // 准备响应
  const response = {
    success: true,
    environment: {
      vercel: !!vercel,
      vercelEnv,
      nodeEnv,
      isVercelProduction
    },
    blob: {
      configured: blobConfigured,
      tokenLength: blobToken ? blobToken.length : 0,
      tokenValid,
      canUseBlob: blobConfigured && tokenValid
    },
    recommendations: [] as string[]
  }

  // 添加建议
  if (isVercelProduction && !blobConfigured) {
    response.recommendations.push('需要在Vercel配置BLOB_READ_WRITE_TOKEN环境变量')
  }

  if (blobConfigured && !tokenValid) {
    response.recommendations.push('BLOB_READ_WRITE_TOKEN格式可能不正确，请重新获取')
  }

  if (!isVercelProduction && !blobConfigured) {
    response.recommendations.push('开发环境未配置Blob，将使用本地文件存储')
  }

  return Response.json(response)
}