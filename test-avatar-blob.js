/**
 * 头像上传功能测试脚本 - Vercel Blob 版本
 * 运行方式: node test-avatar-blob.js
 * 
 * 此脚本用于测试头像上传功能是否正确使用 Vercel Blob 存储
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('头像上传功能测试 - Vercel Blob 版本');
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
        return { status: 'FAIL', message: '@vercel/blob 未安装' };
      }
      return { status: 'FAIL', message: 'package.json 不存在' };
    }
  },
  {
    name: '检查 API 路由使用 Blob',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        if (content.includes('@vercel/blob') && content.includes('put(') && content.includes('avatars/')) {
          return { status: 'PASS', message: 'API 路由已配置使用 Vercel Blob 存储' };
        }
        return { status: 'FAIL', message: 'API 路由未正确配置 Vercel Blob' };
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
        return { status: 'WARN', message: 'next.config.js 未添加 Blob 域名（可能导致图片无法加载）' };
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
    name: '检查旧版本地文件系统代码是否移除',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        // 检查是否存在旧版的 fs.writeFileSync 代码
        if (content.includes('fs.writeFileSync')) {
          return { status: 'FAIL', message: '仍存在旧版本地文件写入代码' };
        }
        if (content.includes('public/uploads/avatars')) {
          return { status: 'WARN', message: '仍引用旧版本地路径（可能是注释）' };
        }
        return { status: 'PASS', message: '旧版本地文件系统代码已移除' };
      }
      return { status: 'FAIL', message: 'API 路由文件不存在' };
    }
  },
  {
    name: '检查删除功能是否支持 Blob',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        const content = fs.readFileSync(apiPath, 'utf8');
        if (content.includes('del(') && content.includes('blob')) {
          return { status: 'PASS', message: '删除功能已配置使用 Blob del() 方法' };
        }
        return { status: 'WARN', message: '删除功能可能未正确配置 Blob 删除' };
      }
      return { status: 'FAIL', message: 'API 路由文件不存在' };
    }
  }
];

let passed = 0;
let failed = 0;
let warned = 0;

checks.forEach(check => {
  const result = check.check();
  const icon = result.status === 'PASS' ? '✓' : result.status === 'WARN' ? '!' : '✗';
  const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'WARN' ? '\x1b[33m' : '\x1b[31m';
  console.log(`${color}${icon} ${check.name}\x1b[0m`);
  console.log(`   ${result.message}`);
  console.log();
  
  if (result.status === 'PASS') passed++;
  else if (result.status === 'FAIL') failed++;
  else warned++;
});

console.log('========================================');
console.log(`测试结果: ${passed} 通过, ${failed} 失败, ${warned} 警告`);
console.log('========================================\n');

if (failed > 0) {
  console.log('需要修复的问题:');
  console.log('1. 确保已安装 @vercel/blob: npm install @vercel/blob');
  console.log('2. 确保 API 路由正确使用 Blob 存储');
  console.log('3. 检查 next.config.js 配置');
  console.log();
  process.exit(1);
} else {
  console.log('所有测试通过！头像上传功能已配置为使用 Vercel Blob 存储。');
  console.log();
  console.log('部署前需要完成的步骤:');
  console.log('1. 在 Vercel 控制台创建 Blob 存储');
  console.log('2. 获取 BLOB_READ_WRITE_TOKEN');
  console.log('3. 在 Vercel 环境变量中设置 BLOB_READ_WRITE_TOKEN');
  console.log();
  process.exit(0);
}