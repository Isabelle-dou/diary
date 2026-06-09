/**
 * 页面加载失败诊断脚本
 * 运行方式: node diagnose-page-load.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('页面加载失败诊断工具');
console.log('========================================\n');

const checks = [
  {
    name: '检查 Prisma Client',
    check: () => {
      const clientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
      if (fs.existsSync(clientPath)) {
        const files = fs.readdirSync(clientPath);
        const hasEngine = files.some(f => f.includes('query_engine'));
        if (hasEngine) {
          return { status: 'PASS', message: 'Prisma Client 已生成，包含查询引擎' };
        }
        return { status: 'WARN', message: 'Prisma Client 目录存在，但可能不完整' };
      }
      return { status: 'FAIL', message: 'Prisma Client 未生成！请运行: npx prisma generate' };
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
      return { status: 'FAIL', message: '数据库文件不存在！' };
    }
  },
  {
    name: '检查 NextAuth 配置',
    check: () => {
      const authPath = path.join(__dirname, 'lib', 'auth.ts');
      if (fs.existsSync(authPath)) {
        const content = fs.readFileSync(authPath, 'utf8');
        if (content.includes('prisma') && content.includes('CredentialsProvider')) {
          return { status: 'PASS', message: 'NextAuth 配置文件存在且正确' };
        }
        return { status: 'WARN', message: 'NextAuth 配置可能不完整' };
      }
      return { status: 'FAIL', message: 'NextAuth 配置文件不存在' };
    }
  },
  {
    name: '检查 API 路由',
    check: () => {
      const apiRoutes = [
        'app/api/auth/[...nextauth]/route.ts',
        'app/api/diaries/route.ts',
        'app/api/user/profile/route.ts'
      ];
      const missing = apiRoutes.filter(route => !fs.existsSync(path.join(__dirname, route)));
      if (missing.length === 0) {
        return { status: 'PASS', message: '所有关键 API 路由存在' };
      }
      return { status: 'FAIL', message: `缺少 API 路由: ${missing.join(', ')}` };
    }
  },
  {
    name: '检查 Session Provider',
    check: () => {
      const providerPath = path.join(__dirname, 'components', 'providers', 'session-provider.tsx');
      if (fs.existsSync(providerPath)) {
        const content = fs.readFileSync(providerPath, 'utf8');
        if (content.includes('SessionProvider')) {
          return { status: 'PASS', message: 'Session Provider 组件存在' };
        }
        return { status: 'WARN', message: 'Session Provider 内容可能不正确' };
      }
      return { status: 'FAIL', message: 'Session Provider 组件不存在' };
    }
  },
  {
    name: '检查布局文件',
    check: () => {
      const layoutPath = path.join(__dirname, 'app', 'layout.tsx');
      if (fs.existsSync(layoutPath)) {
        const content = fs.readFileSync(layoutPath, 'utf8');
        if (content.includes('SessionProvider') && content.includes('ToastProvider')) {
          return { status: 'PASS', message: '布局文件包含必要的 Provider' };
        }
        return { status: 'WARN', message: '布局文件可能缺少 Provider' };
      }
      return { status: 'FAIL', message: '布局文件不存在' };
    }
  },
  {
    name: '检查构建缓存',
    check: () => {
      const nextDir = path.join(__dirname, '.next');
      if (fs.existsSync(nextDir)) {
        return { status: 'WARN', message: '构建缓存存在，可能需要清理' };
      }
      return { status: 'PASS', message: '构建缓存已清理' };
    }
  },
  {
    name: '检查环境变量',
    check: () => {
      const envPath = path.join(__dirname, '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const checks = ['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET'];
        const missing = checks.filter(c => !content.includes(c));
        if (missing.length === 0) {
          return { status: 'PASS', message: '所有必要环境变量已配置' };
        }
        return { status: 'WARN', message: `缺少环境变量: ${missing.join(', ')}` };
      }
      return { status: 'FAIL', message: '.env.local 文件不存在' };
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
  console.log('3. 运行: rm -rf .next');
  console.log('4. 运行: npm run dev');
  console.log();
  console.log('或双击运行: fix-prisma-once-and-for-all.bat');
  process.exit(1);
} else {
  console.log('所有检查通过！');
  console.log();
  console.log('如果页面仍然加载失败，请检查：');
  console.log('1. 浏览器控制台错误 (F12)');
  console.log('2. 网络请求状态 (F12 → Network)');
  console.log('3. 服务器端日志');
  process.exit(0);
}
