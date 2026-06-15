/**
 * Vercel构建日志分析脚本
 * 帮助检查环境变量是否在Vercel部署时正确加载
 * 
 * 使用方法：
 * 1. 在Vercel控制台下载构建日志（Deployments -> 点击部署记录 -> Build Logs -> Download）
 * 2. 将日志文件保存为 vercel-build.log
 * 3. 运行：node check-vercel-logs.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('Vercel构建日志分析脚本');
console.log('========================================\n');

const logFilePath = path.join(__dirname, 'vercel-build.log');

if (!fs.existsSync(logFilePath)) {
  console.log('\x1b[33m提示:\x1b[0m 请先从Vercel控制台下载构建日志');
  console.log('步骤:');
  console.log('  1. 登录 Vercel 控制台');
  console.log('  2. 进入项目 -> Deployments');
  console.log('  3. 点击最新的部署记录');
  console.log('  4. 切换到 Build Logs 标签');
  console.log('  5. 点击 Download 下载日志');
  console.log('  6. 将日志文件保存为 vercel-build.log');
  console.log('  7. 再次运行此脚本');
  console.log();
  process.exit(0);
}

console.log('正在分析构建日志...\n');

const logContent = fs.readFileSync(logFilePath, 'utf8');
const lines = logContent.split('\n');

// 检查项目配置
console.log('📋 项目配置检查:');

// 检查 next.config.js 是否被加载
const hasNextConfig = lines.some(line => line.includes('next.config.js'));
console.log(`   ${hasNextConfig ? '✅' : '❌'} next.config.js 配置文件已加载`);

// 检查图片域名配置
const hasBlobDomain = lines.some(line => line.includes('public.blob.vercel-storage.com'));
console.log(`   ${hasBlobDomain ? '✅' : '❌'} Vercel Blob 图片域名已配置`);

console.log();

// 检查环境变量
console.log('🔑 环境变量检查:');

// 检查 BLOB_READ_WRITE_TOKEN
const blobTokenLines = lines.filter(line => line.includes('BLOB_READ_WRITE_TOKEN'));
if (blobTokenLines.length > 0) {
  console.log(`   ✅ 发现 ${blobTokenLines.length} 条 BLOB_READ_WRITE_TOKEN 相关记录`);
  blobTokenLines.forEach((line, index) => {
    // 隐藏敏感信息
    const maskedLine = line.replace(/BLOB_READ_WRITE_TOKEN=["']?([^"']+)["']?/g, 'BLOB_READ_WRITE_TOKEN="[REDACTED]"');
    console.log(`      [${index + 1}] ${maskedLine.trim()}`);
  });
} else {
  console.log('   ❌ 未找到 BLOB_READ_WRITE_TOKEN 相关记录');
  console.log('   可能原因:');
  console.log('      - 环境变量未配置');
  console.log('      - 环境变量名称拼写错误（大小写敏感）');
  console.log('      - 仅在特定环境配置（Production/Preview/Development）');
}

console.log();

// 检查 VERCEL 环境变量
const vercelEnvLines = lines.filter(line => line.includes('VERCEL=') || line.includes('VERCEL_ENV='));
if (vercelEnvLines.length > 0) {
  console.log(`   ✅ 发现 ${vercelEnvLines.length} 条 VERCEL 环境变量记录`);
  vercelEnvLines.forEach(line => {
    console.log(`      ${line.trim()}`);
  });
} else {
  console.log('   ⚠️ 未找到 VERCEL 环境变量记录');
}

console.log();

// 检查 NODE_ENV
const nodeEnvLines = lines.filter(line => line.includes('NODE_ENV='));
if (nodeEnvLines.length > 0) {
  console.log(`   ✅ NODE_ENV: ${nodeEnvLines[0].split('=').pop()?.trim()}`);
} else {
  console.log('   ⚠️ 未找到 NODE_ENV 环境变量');
}

console.log();

// 检查构建错误
console.log('❌ 构建错误检查:');

const errorKeywords = ['error', 'Error', 'ERROR', 'failed', 'Failed', 'FAILED'];
const errorLines = lines.filter(line => 
  errorKeywords.some(keyword => line.includes(keyword)) && 
  !line.includes('vercel-build') &&
  !line.includes('npm ERR!')
);

if (errorLines.length > 0) {
  console.log(`   ❌ 发现 ${errorLines.length} 条错误记录:`);
  errorLines.slice(0, 5).forEach((line, index) => {
    console.log(`      [${index + 1}] ${line.trim()}`);
  });
  if (errorLines.length > 5) {
    console.log(`      ... 还有 ${errorLines.length - 5} 条错误`);
  }
} else {
  console.log('   ✅ 未发现明显的构建错误');
}

console.log();

// 检查 Blob 相关错误
console.log('🗄️ Blob 存储相关检查:');

const blobErrorLines = lines.filter(line => 
  line.includes('blob') || 
  line.includes('Blob') || 
  line.includes('storage') ||
  line.includes('Storage')
);

if (blobErrorLines.length > 0) {
  console.log(`   ✅ 发现 ${blobErrorLines.length} 条 Blob/存储相关记录:`);
  blobErrorLines.forEach(line => {
    console.log(`      ${line.trim()}`);
  });
} else {
  console.log('   ⚠️ 未找到 Blob/存储相关记录');
}

console.log();

// 检查 API 路由构建
console.log('🔌 API 路由检查:');

const avatarRouteLines = lines.filter(line => 
  line.includes('avatar') && 
  line.includes('route')
);

if (avatarRouteLines.length > 0) {
  console.log(`   ✅ 发现 ${avatarRouteLines.length} 条头像上传 API 路由记录:`);
  avatarRouteLines.forEach(line => {
    console.log(`      ${line.trim()}`);
  });
} else {
  console.log('   ⚠️ 未找到头像上传 API 路由记录');
}

console.log();

// 总结建议
console.log('========================================');
console.log('💡 排查建议:');
console.log('========================================');

if (!blobTokenLines.length) {
  console.log('1. 检查 Vercel 环境变量配置:');
  console.log('   - 进入项目 -> Settings -> Environment Variables');
  console.log('   - 确认 BLOB_READ_WRITE_TOKEN 已添加');
  console.log('   - 确认 Production 环境已勾选');
  console.log('   - 变量名称必须完全匹配（大小写敏感）');
  console.log();
}

console.log('2. 重新部署项目:');
console.log('   - 环境变量更新后需要重新部署才能生效');
console.log('   - 在部署页面点击 "Redeploy"');
console.log();

console.log('3. 检查实时日志:');
console.log('   - 部署完成后进入项目 -> Logs');
console.log('   - 启用 Real-time 模式');
console.log('   - 尝试上传头像并查看日志输出');
console.log();

console.log('4. 常见问题:');
console.log('   - "No blob credentials found": BLOB_READ_WRITE_TOKEN 未配置或无效');
console.log('   - "头像存储服务未配置": Vercel生产环境未配置Blob');
console.log('   - "read-only file system": 在Vercel尝试写入本地文件');
console.log();

console.log('如果问题仍然存在，请提供:');
console.log('   - Vercel构建日志文件');
console.log('   - Vercel环境变量配置截图');
console.log('   - 上传头像时的浏览器控制台截图');
