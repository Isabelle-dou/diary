/**
 * 头像上传功能诊断脚本
 * 运行方式: node diagnose-avatar-upload.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('头像上传功能诊断工具');
console.log('========================================\n');

const checks = [
  {
    name: '检查 Prisma Schema',
    check: () => {
      const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
      if (fs.existsSync(schemaPath)) {
        const content = fs.readFileSync(schemaPath, 'utf8');
        if (content.includes('avatarHistory')) {
          return { status: 'PASS', message: 'avatarHistory 字段已在 schema 中定义' };
        } else {
          return { status: 'FAIL', message: 'avatarHistory 字段未在 schema 中定义' };
        }
      }
      return { status: 'FAIL', message: 'schema.prisma 文件不存在' };
    }
  },
  {
    name: '检查 Prisma Client',
    check: () => {
      const clientPath = path.join(__dirname, 'node_modules', '.prisma');
      if (fs.existsSync(clientPath)) {
        return { status: 'PASS', message: 'Prisma Client 已生成' };
      }
      return { status: 'FAIL', message: 'Prisma Client 未生成，请运行 npx prisma generate' };
    }
  },
  {
    name: '检查数据库文件',
    check: () => {
      const dbPath = path.join(__dirname, 'prisma', 'dev.db');
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        return { status: 'PASS', message: `数据库文件存在 (${(stats.size / 1024).toFixed(2)} KB)` };
      }
      return { status: 'FAIL', message: '数据库文件不存在' };
    }
  },
  {
    name: '检查上传目录',
    check: () => {
      const uploadPath = path.join(__dirname, 'public', 'uploads', 'avatars');
      if (fs.existsSync(uploadPath)) {
        return { status: 'PASS', message: '上传目录存在' };
      }
      return { status: 'WARN', message: '上传目录不存在，将在首次上传时自动创建' };
    }
  },
  {
    name: '检查环境变量',
    check: () => {
      const envPath = path.join(__dirname, '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('DATABASE_URL')) {
          return { status: 'PASS', message: 'DATABASE_URL 环境变量已配置' };
        }
        return { status: 'FAIL', message: 'DATABASE_URL 环境变量未配置' };
      }
      return { status: 'FAIL', message: '.env.local 文件不存在' };
    }
  },
  {
    name: '检查 API 路由',
    check: () => {
      const apiPath = path.join(__dirname, 'app', 'api', 'user', 'avatar', 'upload', 'route.ts');
      if (fs.existsSync(apiPath)) {
        return { status: 'PASS', message: '头像上传 API 路由存在' };
      }
      return { status: 'FAIL', message: '头像上传 API 路由不存在' };
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
console.log(`诊断结果: ${passed} 通过, ${failed} 失败, ${warned} 警告`);
console.log('========================================\n');

if (failed > 0) {
  console.log('建议修复步骤:');
  console.log('1. 运行: npx prisma db push --force-reset');
  console.log('2. 运行: npx prisma generate');
  console.log('3. 运行: npm run dev');
  console.log();
  console.log('或双击运行: force-prisma-regenerate.bat');
  process.exit(1);
} else {
  console.log('所有检查通过！头像上传功能应该可以正常工作。');
  process.exit(0);
}
