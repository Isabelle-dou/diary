/**
 * 头像上传功能测试脚本 - 双模式存储版本
 * 运行方式: node test-avatar-blob.js
 * 
 * 此脚本用于测试头像上传功能是否正确配置
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('头像上传功能测试 - 双模式存储版本');
console.log('========================================\n');

const checks = [
  {
    name: '检查 @vercel/blob 依赖',
    check: () => {
      const pkgPath = path.join(__dirname, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.dependencies['@vercel/blob']) {
          return { status: 'PASS', message: `@vercel/blob 已安装，版本: ${pkg.dependencies['@vercel/blob']}` };
        }
        return { status: 'WARN', message: '@vercel/blob 未安装（将使用本地文件存储）' };
      }
      return { status: 'FAIL', message: 'package.json 不存在' };
    }
  },
  {
    name: '检查 API 路由双模式存储配置',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        const hasBlobPut = content.includes('put(') && content.includes('@vercel/blob');
        const hasLocalSave = content.includes('saveAvatarToLocal');
        const hasFallback = content.includes('isBlobConfigured');
        
        if (hasBlobPut && hasLocalSave && hasFallback) {
          return { status: 'PASS', message: 'API 路由已配置双模式存储：Vercel Blob + 本地文件系统备选' };
        } else if (hasLocalSave) {
          return { status: 'WARN', message: 'API 路由仅配置了本地文件存储' };
        }
        return { status: 'FAIL', message: 'API 路由存储配置不完整' };
      }
      return { status: 'FAIL', message: 'API 路由文件不存在' };
    }
  },
  {
    name: '检查 next.config.js 图片域名配置',
    check: () => {
      const configPath = path.join(__dirname, 'next.config.js');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        if (content.includes('public.blob.vercel-storage.com')) {
          return { status: 'PASS', message: '已添加 Vercel Blob 图片域名白名单' };
        }
        return { status: 'WARN', message: 'next.config.js 未添加 Blob 域名（可能导致生产环境图片无法加载）' };
      }
      return { status: 'FAIL', message: 'next.config.js 不存在' };
    }
  },
  {
    name: '检查环境变量示例配置',
    check: () => {
      const envPath = path.join(__dirname, '.env.example');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('BLOB_READ_WRITE_TOKEN')) {
          return { status: 'PASS', message: '环境变量示例已包含 BLOB_READ_WRITE_TOKEN' };
        }
        return { status: 'WARN', message: '环境变量示例未包含 Blob 配置' };
      }
      return { status: 'FAIL', message: '.env.example 文件不存在' };
    }
  },
  {
    name: '检查本地环境变量文件',
    check: () => {
      const envLocalPath = path.join(__dirname, '.env.local');
      if (fs.existsSync(envLocalPath)) {
        return { status: 'PASS', message: '本地环境变量文件 .env.local 存在' };
      }
      return { status: 'WARN', message: '本地环境变量文件 .env.local 不存在，建议创建' };
    }
  },
  {
    name: '检查错误处理机制',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        const hasFriendlyError = content.includes('No blob credentials') && content.includes('头像存储服务未配置');
        const hasFallback = content.includes('Blob 存储失败，已回退到本地存储');
        
        if (hasFriendlyError && hasFallback) {
          return { status: 'PASS', message: '错误处理机制完善，提供友好的用户提示和故障回退' };
        }
        return { status: 'WARN', message: '错误处理机制可能不完善' };
      }
      return { status: 'FAIL', message: 'API 路由文件不存在' };
    }
  },
  {
    name: '检查上传目录是否存在',
    check: () => {
      const uploadPath = path.join(__dirname, 'public', 'uploads', 'avatars');
      if (fs.existsSync(uploadPath)) {
        return { status: 'PASS', message: '上传目录存在' };
      }
      return { status: 'INFO', message: '上传目录不存在，首次上传时将自动创建' };
    }
  }
];

let passed = 0;
let failed = 0;
let warned = 0;
let info = 0;

checks.forEach(check => {
  const result = check.check();
  let icon, color;
  switch (result.status) {
    case 'PASS':
      icon = '✓';
      color = '\x1b[32m';
      passed++;
      break;
    case 'FAIL':
      icon = '✗';
      color = '\x1b[31m';
      failed++;
      break;
    case 'WARN':
      icon = '!';
      color = '\x1b[33m';
      warned++;
      break;
    default:
      icon = 'i';
      color = '\x1b[36m';
      info++;
  }
  
  console.log(`${color}${icon} ${check.name}\x1b[0m`);
  console.log(`   ${result.message}`);
  console.log();
});

console.log('========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败, ${warned} 警告, ${info} 提示`);
console.log('========================================\n');

if (failed > 0) {
  console.log('需要修复的问题:');
  console.log('1. 检查 API 路由文件是否存在');
  console.log('2. 确保 package.json 配置正确');
  console.log();
  process.exit(1);
} else {
  console.log('所有测试通过！头像上传功能已配置完成。');
  console.log();
  console.log('部署指南:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ 开发环境（本地）:                                       │');
  console.log('│   - 无需配置 BLOB_READ_WRITE_TOKEN                     │');
  console.log('│   - 系统自动使用本地文件系统存储头像                     │');
  console.log('│   - 运行: npm run dev                                   │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log('│ 生产环境（Vercel）:                                     │');
  console.log('│   1. 在 Vercel 控制台创建 Blob 存储                     │');
  console.log('│   2. 获取 BLOB_READ_WRITE_TOKEN                        │');
  console.log('│   3. 在 Vercel 环境变量中设置该值                       │');
  console.log('│   4. 部署后自动使用 Blob 存储                           │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log();
  console.log('故障转移机制:');
  console.log('  如果 Blob 存储失败，系统会自动回退到本地存储（仅开发环境）');
  console.log();
  process.exit(0);
}